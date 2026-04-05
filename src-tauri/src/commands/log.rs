use git2::{Repository, Sort, Oid};
use serde::Serialize;
use std::collections::HashMap;

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
}

#[tauri::command]
pub fn get_log(repo_path: String, limit: usize) -> Result<Vec<CommitNode>, String> {
    let repo = Repository::open(&repo_path)
        .map_err(|e| format!("Failed to open repository: {}", e))?;

    let mut revwalk = repo.revwalk()
        .map_err(|e| format!("Failed to create revwalk: {}", e))?;

    // Sort topologically and sequentially
    revwalk.set_sorting(Sort::TOPOLOGICAL | Sort::TIME)
        .map_err(|e| format!("Failed to set sorting: {}", e))?;

    // Map all references (branches, tags, HEAD) to OIDs
    let mut refs_map: HashMap<Oid, Vec<String>> = HashMap::new();
    
    // Add all branches
    if let Ok(branches) = repo.branches(None) {
        for branch_result in branches {
            if let Ok((branch, _)) = branch_result {
                if let (Ok(Some(name)), Some(oid)) = (branch.name(), branch.get().target()) {
                    refs_map.entry(oid).or_default().push(name.to_string());
                }
            }
        }
    }
    
    // Add all tags (lightweight and annotated)
    if let Ok(tags) = repo.tag_names(None) {
        for tag_name in tags.iter().filter_map(|s| s) {
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
    
    // Add HEAD
    if let Ok(head) = repo.head() {
        if let Some(oid) = head.target() {
            let mut refs = refs_map.entry(oid).or_default();
            if !refs.contains(&"HEAD".to_string()) {
                refs.insert(0, "HEAD".to_string()); // Put HEAD at the front
            }
        }
    }

    // Push all reference OIDs to revwalk to cover the whole graph
    for oid in refs_map.keys() {
        let _ = revwalk.push(*oid);
    }
    // Also push HEAD explicitly if repo has no branches yet
    let _ = revwalk.push_head();

    let mut commits = Vec::new();
    let mut active_lanes: Vec<Option<Oid>> = Vec::new();
    let mut color_assignments: HashMap<usize, usize> = HashMap::new();
    let mut next_color_idx = 0;

    for oid_result in revwalk.take(limit) {
        let oid = match oid_result {
            Ok(id) => id,
            Err(_) => continue,
        };

        let commit = match repo.find_commit(oid) {
            Ok(c) => c,
            Err(_) => continue,
        };

        // Find lane for this commit or create a new one
        let mut my_lane_idx = None;
        for (i, active_oid) in active_lanes.iter().enumerate() {
            if let Some(id) = active_oid {
                if *id == oid {
                    my_lane_idx = Some(i);
                    break;
                }
            }
        }

        let lane_idx = my_lane_idx.unwrap_or_else(|| {
            // Find a free lane
            for (i, active_oid) in active_lanes.iter().enumerate() {
                if active_oid.is_none() {
                    return i;
                }
            }
            // Or push a new one
            active_lanes.push(None);
            active_lanes.len() - 1
        });

        // Assign core color to lane if uninitialized
        let color_idx = *color_assignments.entry(lane_idx).or_insert_with(|| {
            let c = next_color_idx % 8;
            next_color_idx += 1;
            c
        });

        active_lanes[lane_idx] = Some(oid);

        let mut parents = Vec::new();
        let mut edges = Vec::new();

        let parent_count = commit.parent_count();
        if parent_count > 0 {
            let p0 = commit.parent_id(0).unwrap();
            active_lanes[lane_idx] = Some(p0);
            parents.push(p0.to_string());
            
            edges.push(EdgeInfo {
                to_lane: lane_idx,
                color_idx, // main edge gets lane color
            });

            // Handle multi-parents (merges)
            for i in 1..parent_count {
                let p = commit.parent_id(i).unwrap();
                parents.push(p.to_string());

                // Does this parent already exist in active_lanes?
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
                    // Start a new free lane for this sub-parent
                    for (li, a_oid) in active_lanes.iter().enumerate() {
                        if a_oid.is_none() {
                            active_lanes[li] = Some(p);
                            return li;
                        }
                    }
                    active_lanes.push(Some(p));
                    let li = active_lanes.len() - 1;
                    li
                });

                // Assign a color for the sub-path if it didn't have one
                let parent_color = *color_assignments.entry(p_lane).or_insert_with(|| {
                    let c = next_color_idx % 8;
                    next_color_idx += 1;
                    c
                });
                
                edges.push(EdgeInfo {
                    to_lane: p_lane,
                    color_idx: parent_color,
                });
            }
        } else {
            // Root commit
            active_lanes[lane_idx] = None; 
        }

        let author = commit.author();
        let name = author.name().unwrap_or("Unknown").to_string();
        let email = author.email().unwrap_or("unknown@example.com").to_string();
        let message = commit.summary().unwrap_or("").to_string();
        let timestamp = commit.time().seconds();
        let short_oid = commit.as_object().short_id()
             .map(|b| String::from_utf8_lossy(&b).into_owned())
             .unwrap_or_else(|_| oid.to_string()[0..7].to_string());

        let node_refs = refs_map.get(&oid).cloned().unwrap_or_else(Vec::new);

        commits.push(CommitNode {
            oid: oid.to_string(),
            short_oid,
            parents,
            author: name,
            email,
            timestamp,
            message,
            refs: node_refs,
            lane: lane_idx,
            color_idx,
            edges,
        });
    }

    Ok(commits)
}
