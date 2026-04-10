use serde::{Deserialize, Serialize};
use git2::{Repository, Oid};
use std::path::Path;

#[derive(Serialize, Deserialize, Clone)]
#[serde(tag = "type")]
pub enum CherryPickResult {
    Success,
    Conflict { 
        conflicted_oid: String, 
        conflicted_files: Vec<String>,
        remaining_oids: Vec<String> 
    },
    Empty { 
        skip_oid: String,
        remaining_oids: Vec<String>
    },
}

#[derive(Serialize, Deserialize, Clone)]
pub struct CherryPickInProgress {
    pub is_in_progress: bool,
    pub conflicted_oid: Option<String>,
    pub conflicted_files: Vec<String>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct ConflictVersions {
    pub path: String,
    pub ours: Option<String>,
    pub base: Option<String>,
    pub theirs: Option<String>,
    pub raw: Option<String>,
    pub encoding: String,
}


#[tauri::command]
pub fn get_cherry_pick_state(repo_path: String) -> Result<CherryPickInProgress, String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.message().to_string())?;
    let cp_path = repo.path().join("CHERRY_PICK_HEAD");
    
    if !cp_path.exists() {
        return Ok(CherryPickInProgress {
            is_in_progress: false,
            conflicted_oid: None,
            conflicted_files: vec![],
        });
    }
    
    let mut conflicted_files = Vec::new();
    if let Ok(index) = repo.index() {
        if index.has_conflicts() {
            if let Ok(conflicts) = index.conflicts() {
                for conflict in conflicts {
                    if let Ok(c) = conflict {
                        if let Some(entry) = c.our.or(c.their).or(c.ancestor) {
                            let path = String::from_utf8_lossy(&entry.path).into_owned();
                            if !conflicted_files.contains(&path) {
                                conflicted_files.push(path);
                            }
                        }
                    }
                }
            }
        }
    }
    
    let head_oid_bytes = std::fs::read_to_string(&cp_path).unwrap_or_default();
    let conflicted_oid = head_oid_bytes.trim().to_string();
    
    Ok(CherryPickInProgress {
        is_in_progress: true,
        conflicted_oid: if conflicted_oid.is_empty() { None } else { Some(conflicted_oid) },
        conflicted_files,
    })
}

#[tauri::command]
pub fn cherry_pick_abort(repo_path: String) -> Result<(), String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.message().to_string())?;
    
    if !repo.path().join("CHERRY_PICK_HEAD").exists() {
        return Err("No cherry-pick in progress to abort.".to_string());
    }
    
    let head = repo.head()
        .map_err(|e| e.message().to_string())?
        .peel_to_commit()
        .map_err(|e| e.message().to_string())?;
        
    repo.cleanup_state().map_err(|e| e.message().to_string())?;
    
    if let Ok(head_tree) = head.tree() {
        if let Ok(mut index) = repo.index() {
            let _ = index.read_tree(&head_tree);
            let _ = index.write();
        }
    }
    
    repo.reset(head.as_object(), git2::ResetType::Hard, None)
        .map_err(|e| e.message().to_string())?;
        
    Ok(())
}

fn do_commit(repo: &Repository, author: &git2::Signature, message: &str, tree_oid: Oid) -> Result<(), String> {
    let tree = repo.find_tree(tree_oid).map_err(|e| e.message().to_string())?;
    let head = repo.head().map_err(|e| e.message().to_string())?;
    let parent_commit = head.peel_to_commit().map_err(|e| e.message().to_string())?;
    let sig = repo.signature()
        .or_else(|_| git2::Signature::now("GitKit User", "user@gitkit.app"))
        .map_err(|e| e.message().to_string())?;
    
    repo.commit(
        Some("HEAD"),
        author,
        &sig,
        message,
        &tree,
        &[&parent_commit]
    ).map_err(|e| e.message().to_string())?;
    Ok(())
}

#[tauri::command]
pub fn cherry_pick_commit(
    repo_path: String, 
    oids: Vec<String>, 
    mainline: u32
) -> Result<CherryPickResult, String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.message().to_string())?;
    
    if repo.head().is_err() {
        return Err("Cannot cherry-pick onto an empty repository. Make a first commit.".to_string());
    }
    
    if repo.path().join("CHERRY_PICK_HEAD").exists() {
        return Err("A cherry-pick is already in progress. Abort or continue first.".to_string());
    }
    
    let mut opts = git2::StatusOptions::new();
    opts.include_untracked(true).include_ignored(false);
    if let Ok(statuses) = repo.statuses(Some(&mut opts)) {
        if !statuses.is_empty() {
            return Err("Working tree is dirty. Please commit or stash your changes before cherry-picking.".to_string());
        }
    }
    
    let mut i = 0;
    while i < oids.len() {
        let oid_str = &oids[i];
        let oid = Oid::from_str(oid_str).map_err(|e| format!("Invalid OID '{}': {}", oid_str, e.message()))?;
        let commit = repo.find_commit(oid).map_err(|e| {
            if e.code() == git2::ErrorCode::NotFound {
                format!("Commit {} not found. If this is a shallow clone, try fetching full history.", oid_str)
            } else {
                e.message().to_string()
            }
        })?;
        
        let parent_count = commit.parent_count();
        let mut cherry_opts = git2::CherrypickOptions::new();
        if parent_count > 1 {
            cherry_opts.mainline(mainline);
        }
        
        repo.cherrypick(&commit, if parent_count > 1 { Some(&mut cherry_opts) } else { None })
            .map_err(|e| format!("Cherry-pick error: {}", e.message()))?;
        
        let mut index = repo.index().map_err(|e| e.message().to_string())?;
        
        if index.has_conflicts() {
            let mut conflicted_files = Vec::new();
            if let Ok(conflicts) = index.conflicts() {
                for conflict in conflicts {
                    if let Ok(c) = conflict {
                        if let Some(entry) = c.our.or(c.their).or(c.ancestor) {
                            let path = String::from_utf8_lossy(&entry.path).into_owned();
                            if !conflicted_files.contains(&path) {
                                conflicted_files.push(path);
                            }
                        }
                    }
                }
            }
            let remaining = oids[i+1..].to_vec();
            return Ok(CherryPickResult::Conflict { 
                conflicted_oid: oid_str.clone(), 
                conflicted_files, 
                remaining_oids: remaining 
            });
        }
        
        // No conflicts -> commit the change
        let tree_oid = index.write_tree().map_err(|e| e.message().to_string())?;
        
        let head = repo.head().map_err(|e| e.message().to_string())?;
        let parent_commit = head.peel_to_commit().map_err(|e| e.message().to_string())?;
        
        if tree_oid == parent_commit.tree_id() {
            // Empty commit
            repo.cleanup_state().map_err(|e| e.message().to_string())?;
            let remaining = oids[i+1..].to_vec();
            return Ok(CherryPickResult::Empty { 
                skip_oid: oid_str.clone(), 
                remaining_oids: remaining 
            });
        }
        
        do_commit(&repo, &commit.author(), commit.message().unwrap_or("Cherry-picked commit"), tree_oid)?;
        repo.cleanup_state().map_err(|e| e.message().to_string())?;
        
        i += 1;
    }
    
    Ok(CherryPickResult::Success)
}

#[tauri::command]
pub fn cherry_pick_continue(repo_path: String) -> Result<CherryPickResult, String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.message().to_string())?;
    
    let cp_path = repo.path().join("CHERRY_PICK_HEAD");
    if !cp_path.exists() {
        return Err("No cherry-pick in progress to continue.".to_string());
    }
    
    let mut index = repo.index().map_err(|e| e.message().to_string())?;
    let head_oid_bytes = std::fs::read_to_string(&cp_path)
        .map_err(|_| "Failed to read CHERRY_PICK_HEAD".to_string())?;
    
    if index.has_conflicts() {
        let mut conflicted_files = Vec::new();
        if let Ok(conflicts) = index.conflicts() {
            for conflict in conflicts {
                if let Ok(c) = conflict {
                    if let Some(entry) = c.our.or(c.their).or(c.ancestor) {
                        let path = String::from_utf8_lossy(&entry.path).into_owned();
                        if !conflicted_files.contains(&path) {
                            conflicted_files.push(path);
                        }
                    }
                }
            }
        }
        return Ok(CherryPickResult::Conflict {
            conflicted_oid: head_oid_bytes.trim().to_string(),
            conflicted_files,
            remaining_oids: vec![],
        });
    }
    
    let orig_oid = Oid::from_str(head_oid_bytes.trim()).map_err(|e| e.message().to_string())?;
    let orig_commit = repo.find_commit(orig_oid).map_err(|e| e.message().to_string())?;
    
    let tree_oid = index.write_tree().map_err(|e| e.message().to_string())?;
    let head = repo.head().map_err(|e| e.message().to_string())?;
    let parent_commit = head.peel_to_commit().map_err(|e| e.message().to_string())?;
    
    if tree_oid != parent_commit.tree_id() {
        do_commit(&repo, &orig_commit.author(), orig_commit.message().unwrap_or("Cherry-picked commit"), tree_oid)?;
    }
    
    repo.cleanup_state().map_err(|e| e.message().to_string())?;
    Ok(CherryPickResult::Success)
}

fn is_binary(bytes: &[u8]) -> bool {
    bytes.contains(&0)
}

fn decode_bytes(bytes: &[u8], encoding_name: &str) -> Option<String> {
    if is_binary(bytes) {
        return None;
    }
    let enc = encoding_rs::Encoding::for_label(encoding_name.as_bytes())
        .unwrap_or(encoding_rs::UTF_8);
    let (decoded, _, _) = enc.decode(bytes);
    Some(decoded.to_string())
}

#[tauri::command]
pub fn get_conflict_diff(repo_path: String, path: String, encoding: String) -> Result<ConflictVersions, String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.message().to_string())?;
    let index = repo.index().map_err(|e| e.message().to_string())?;
    
    let path_obj = Path::new(&path);
    
    let get_content = |stage: i32| -> Option<String> {
        if let Some(entry) = index.get_path(path_obj, stage) {
            if let Ok(blob) = repo.find_blob(entry.id) {
                return decode_bytes(blob.content(), &encoding);
            }
        }
        None
    };

    let full_path = std::path::Path::new(&repo_path).join(&path);
    let raw_content = std::fs::read(&full_path).ok()
        .and_then(|bytes| decode_bytes(&bytes, &encoding));

    let base_content = get_content(1);
    let ours_content = get_content(2);
    let theirs_content = get_content(3);

    Ok(ConflictVersions {
        path,
        base: base_content,
        ours: ours_content,
        theirs: theirs_content,
        raw: raw_content,
        encoding,
    })
}

#[tauri::command]
pub fn resolve_conflict_file(repo_path: String, path: String, resolved_content: String) -> Result<(), String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.message().to_string())?;
    
    let full_path = Path::new(&repo_path).join(&path);
    std::fs::write(&full_path, resolved_content)
        .map_err(|e| format!("Failed to write resolved file: {}", e))?;
        
    let mut index = repo.index().map_err(|e| e.message().to_string())?;
    index.add_path(Path::new(&path)).map_err(|e| e.message().to_string())?;
    index.write().map_err(|e| e.message().to_string())?;
    
    Ok(())
}

