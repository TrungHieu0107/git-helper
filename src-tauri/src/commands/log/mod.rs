use git2::{Repository, Sort, Oid};
use serde::Serialize;
use std::collections::HashMap;
use rayon::prelude::*;

#[derive(Serialize)]
pub struct EdgeInfo {
    pub to_lane: usize,
    pub color_idx: usize,
}

#[derive(Serialize)]
pub struct CommitNode {
    pub oid: String,
    pub short_oid: String,
    pub parents: Vec<String>,
    pub author: String,
    pub email: String,
    pub timestamp: i64,
    pub message: String,
    pub refs: Vec<String>,
    pub lane: usize,
    pub color_idx: usize,
    pub edges: Vec<EdgeInfo>,
    pub node_type: String, // "commit" or "stash"
    pub base_oid: Option<String>, // only for stashes
    pub stash_index: Option<usize>, // only for stashes
}

#[derive(Serialize)]
pub struct LogResponse {
    pub nodes: Vec<CommitNode>,
    pub has_more: bool,
    pub commit_count: usize,  // actual commit count (excluding stashes) for pagination offset
}

#[derive(Serialize)]
pub struct FileCommit {
    pub oid: String,
    pub short_oid: String,
    pub message: String,
    pub author_name: String,
    pub author_email: String,
    pub timestamp: i64,
}

#[derive(Serialize)]
pub struct FileLogResponse {
    pub commits: Vec<FileCommit>,
    pub has_more: bool,
}

#[tauri::command]
pub fn get_file_log(
    repo_path: String, 
    file_path: String, 
    page: Option<usize>, 
    page_size: Option<usize>
) -> Result<FileLogResponse, String> {
    let page = page.unwrap_or(0);
    let page_size = page_size.unwrap_or(100);
    let skip = page * page_size;

    let repo = Repository::open(&repo_path)
        .map_err(|e| format!("Failed to open repository: {}", e))?;
    
    let mut revwalk = repo.revwalk()
        .map_err(|e| format!("Failed to create revwalk: {}", e))?;
    
    revwalk.set_sorting(Sort::TIME)
        .map_err(|e| format!("Failed to set sorting: {}", e))?;
    
    let _ = revwalk.push_head();

    let mut commits = Vec::new();
    let mut found_count = 0;
    let mut has_more = false;

    // Initial commit (empty tree) to compare against for root commits
    let empty_tree = {
        let builder = repo.treebuilder(None).map_err(|e| e.to_string())?;
        let empty_oid = builder.write().map_err(|e| e.to_string())?;
        repo.find_tree(empty_oid).map_err(|e| e.to_string())?
    };

    for oid_res in revwalk {
        let oid = oid_res.map_err(|e| e.to_string())?;
        let commit = repo.find_commit(oid).map_err(|e| e.to_string())?;
        
        let mut changed = false;
        let mut diff_opts = git2::DiffOptions::new();
        diff_opts.pathspec(&file_path);

        if commit.parent_count() == 0 {
            let diff = repo.diff_tree_to_tree(Some(&empty_tree), Some(&commit.tree().map_err(|e| e.to_string())?), Some(&mut diff_opts))
                .map_err(|e| e.to_string())?;
            if diff.deltas().len() > 0 {
                changed = true;
            }
        } else {
            let parent = commit.parent(0).map_err(|e| e.to_string())?;
            let diff = repo.diff_tree_to_tree(Some(&parent.tree().map_err(|e| e.to_string())?), Some(&commit.tree().map_err(|e| e.to_string())?), Some(&mut diff_opts))
                .map_err(|e| e.to_string())?;
            if diff.deltas().len() > 0 {
                changed = true;
            }
        }

        if changed {
            if found_count >= skip {
                if commits.len() < page_size {
                    let author = commit.author();
                    commits.push(FileCommit {
                        oid: oid.to_string(),
                        short_oid: oid.to_string()[0..7].to_string(),
                        message: commit.summary().unwrap_or("").to_string(),
                        author_name: author.name().unwrap_or("Unknown").to_string(),
                        author_email: author.email().unwrap_or("").to_string(),
                        timestamp: commit.time().seconds(),
                    });
                } else {
                    has_more = true;
                    break;
                }
            }
            found_count += 1;
        }
    }

    Ok(FileLogResponse {
        commits,
        has_more,
    })
}

#[tauri::command]
pub fn get_log(
    state: tauri::State<crate::AppState>,
    repo_path: String, 
    limit: usize, 
    offset: usize,
    refresh: Option<bool>
) -> Result<LogResponse, String> {
    let mut repo = Repository::open(&repo_path)
        .map_err(|e| format!("Failed to open repository: {}", e))?;

    // 1. Fetch stashes first (collect OIDs first to avoid nested borrow)
    let mut stash_metadata = Vec::new();
    let _ = repo.stash_foreach(|index, message, id| {
        stash_metadata.push((*id, message.to_string(), index));
        true
    });

    let mut stashes_by_base: HashMap<Oid, Vec<(Oid, String, i64, usize)>> = HashMap::new();
    for (id, message, index) in stash_metadata {
        if let Ok(stash_commit) = repo.find_commit(id) {
            if stash_commit.parent_count() > 0 {
                let base_oid = stash_commit.parent_id(0).unwrap();
                let timestamp = stash_commit.time().seconds();
                stashes_by_base.entry(base_oid).or_default().push((id, message, timestamp, index));
            }
        }
    }

    let mut revwalk = repo.revwalk()
        .map_err(|e| format!("Failed to create revwalk: {}", e))?;

    revwalk.set_sorting(Sort::TOPOLOGICAL | Sort::TIME)
        .map_err(|e| format!("Failed to set sorting: {}", e))?;

    // ── Optimized Ref Caching ──────────────────────────────────────────
    // Use the global state to cache the OID -> Labels mapping.
    let refs_map = {
        let mut cache_lock = state.ref_cache.lock().unwrap();
        let should_refresh = refresh.unwrap_or(false);
        
        // Check if we can use the cache
        let use_cache = if should_refresh {
            false
        } else if let Some(cache) = cache_lock.as_ref() {
            cache.repo_path == repo_path
        } else {
            false
        };

        if use_cache {
            cache_lock.as_ref().unwrap().refs.clone()
        } else {
            // Rebuild cache
            let new_map = rebuild_refs_map(&repo)?;
            *cache_lock = Some(crate::RefCache {
                repo_path: repo_path.clone(),
                refs: new_map.clone(),
            });
            new_map
        }
    };

    // Push starting points
    for oid in refs_map.keys() {
        let _ = revwalk.push(*oid);
    }
    let _ = revwalk.push_head();

    // ── Optimized Batch Detail Extraction ─────────────────────────────
    // Collect OIDs first so we can process them in parallel
    let oids: Vec<Oid> = revwalk.skip(offset).take(limit).filter_map(|r| r.ok()).collect();
    let commit_count = oids.len();
    let has_more = commit_count == limit;

    // Map OIDs to metadata in parallel
    let commit_metadata: HashMap<Oid, (Vec<Oid>, String, String, i64, String, String)> = oids.par_iter().map(|&oid| {
        let repo_thread = Repository::open(&repo_path).ok();
        if let Some(r) = repo_thread {
            if let Ok(c) = r.find_commit(oid) {
                let parents: Vec<Oid> = c.parent_ids().collect();
                let author = c.author();
                let author_name = author.name().unwrap_or("Unknown").to_string();
                let author_email = author.email().unwrap_or("").to_string();
                let timestamp = c.time().seconds();
                let message = c.summary().unwrap_or("").to_string();
                let short_oid = c.as_object().short_id()
                    .map(|b| String::from_utf8_lossy(&b).into_owned())
                    .unwrap_or_else(|_| oid.to_string()[0..7].to_string());
                
                return Some((oid, (parents, author_name, author_email, timestamp, message, short_oid)));
            }
        }
        None
    }).flatten().collect();

    let mut result_nodes = Vec::new();
    let mut active_lanes: Vec<Option<Oid>> = Vec::new();
    let mut color_assignments: HashMap<usize, usize> = HashMap::new();
    let mut next_color_idx = 0;

    for oid in oids {
        let (parents_oids, author_name, author_email, timestamp, message, short_oid) = match commit_metadata.get(&oid) {
            Some(m) => m,
            None => continue,
        };

        // Find lane for this commit
        let mut my_lane_idx = None;
        for (i, active_oid) in active_lanes.iter_mut().enumerate() {
            if let Some(id) = active_oid {
                if *id == oid {
                    if my_lane_idx.is_none() {
                        my_lane_idx = Some(i);
                    }
                    *active_oid = None;
                }
            }
        }

        let lane_idx = my_lane_idx.unwrap_or_else(|| {
            for (i, active_oid) in active_lanes.iter().enumerate() {
                if active_oid.is_none() {
                    return i;
                }
            }
            active_lanes.push(None);
            active_lanes.len() - 1
        });

        let color_idx = *color_assignments.entry(lane_idx).or_insert_with(|| {
            let c = next_color_idx % 8;
            next_color_idx += 1;
            c
        });

        // INJECT STASHES HERE (before the commit)
        if let Some(mut stashes) = stashes_by_base.remove(&oid) {
            // Track lanes occupied at this specific row range
            // (all currently active branch lines + the commit's own lane)
            let mut row_occupied: std::collections::HashSet<usize> = active_lanes.iter().enumerate()
                .filter(|(_, p)| p.is_some())
                .map(|(i, _)| i)
                .collect();
            row_occupied.insert(lane_idx);

            // Sort stashes by index descending (stash@{0} is newest)
            stashes.sort_by(|a, b| b.3.cmp(&a.3));

            for (s_oid, s_msg, s_time, s_idx) in stashes {
                // Find first free lane to the right of ALL active branch lines
                let mut s_lane = active_lanes.len().max(lane_idx + 1);
                while row_occupied.contains(&s_lane) {
                    s_lane += 1;
                }
                row_occupied.insert(s_lane); // Claim it for this stash row

                result_nodes.push(CommitNode {
                    oid: s_oid.to_string(),
                    short_oid: format!("stash@{{{}}}", s_idx),
                    parents: vec![oid.to_string()],
                    author: author_name.clone(),
                    email: author_email.clone(),
                    timestamp: s_time,
                    message: s_msg,
                    refs: vec![],
                    lane: s_lane,
                    color_idx, // Use base commit's color for group identity
                    edges: vec![], 
                    node_type: "stash".to_string(),
                    base_oid: Some(oid.to_string()),
                    stash_index: Some(s_idx),
                });
            }
        }

        let mut parents = Vec::new();
        let mut edges = Vec::new();

        let parent_count = parents_oids.len();
        if parent_count > 0 {
            let p0 = parents_oids[0];
            let mut existing_p0_lane = None;
            for (i, active_oid) in active_lanes.iter().enumerate() {
                if let Some(id) = active_oid {
                    if *id == p0 {
                        existing_p0_lane = Some(i);
                        break;
                    }
                }
            }
            
            let final_to_lane;
            if let Some(p0_lane) = existing_p0_lane {
                final_to_lane = p0_lane;
            } else {
                let mut next_lane = lane_idx;
                for i in 0..=lane_idx {
                    if active_lanes[i].is_none() {
                        next_lane = i;
                        break;
                    }
                }
                active_lanes[next_lane] = Some(p0);
                final_to_lane = next_lane;
            }
            
            parents.push(p0.to_string());
            edges.push(EdgeInfo { to_lane: final_to_lane, color_idx });

            for i in 1..parent_count {
                let p = parents_oids[i];
                parents.push(p.to_string());
                let mut parent_lane = None;
                for (li, a_oid) in active_lanes.iter().enumerate() {
                    if let Some(id) = a_oid {
                        if *id == p {
                            parent_lane = Some(li);
                            break;
                        }
                    }
                }
                let p_lane = parent_lane.unwrap_or_else(|| {
                    for (li, a_oid) in active_lanes.iter().enumerate() {
                        if a_oid.is_none() {
                            active_lanes[li] = Some(p);
                            return li;
                        }
                    }
                    active_lanes.push(Some(p));
                    active_lanes.len() - 1
                });
                let p_color = *color_assignments.entry(p_lane).or_insert_with(|| {
                    let c = next_color_idx % 8;
                    next_color_idx += 1;
                    c
                });
                edges.push(EdgeInfo { to_lane: p_lane, color_idx: p_color });
            }
        }

        result_nodes.push(CommitNode {
            oid: oid.to_string(),
            short_oid: short_oid.clone(),
            parents,
            author: author_name.clone(),
            email: author_email.clone(),
            timestamp: *timestamp,
            message: message.clone(),
            refs: refs_map.get(&oid).cloned().unwrap_or_default(),
            lane: lane_idx,
            color_idx,
            edges,
            node_type: "commit".to_string(),
            base_oid: None,
            stash_index: None,
        });
    }

    Ok(LogResponse {
        nodes: result_nodes,
        has_more,
        commit_count,
    })
}

fn rebuild_refs_map(repo: &Repository) -> Result<HashMap<Oid, Vec<String>>, String> {
    let mut refs_map: HashMap<Oid, Vec<String>> = HashMap::new();
    
    if let Ok(branches) = repo.branches(None) {
        for (branch, _) in branches.flatten() {
            if let (Ok(Some(name)), Some(oid)) = (branch.name(), branch.get().target()) {
                refs_map.entry(oid).or_default().push(name.to_string());
            }
        }
    }
    
    if let Ok(tags) = repo.tag_names(None) {
        for tag_name in tags.iter().flatten() {
            if let Ok(obj) = repo.revparse_single(tag_name) {
                let id = if let Some(tag) = obj.as_tag() {
                    tag.target_id()
                } else {
                    obj.id()
                };
                refs_map.entry(id).or_default().push(tag_name.to_string());
            }
        }
    }
    
    if let Ok(head) = repo.head() {
        if let Some(oid) = head.target() {
            let refs = refs_map.entry(oid).or_default();
            if !refs.contains(&"HEAD".to_string()) {
                refs.insert(0, "HEAD".to_string());
            }
        }
    }
    
    Ok(refs_map)
}
