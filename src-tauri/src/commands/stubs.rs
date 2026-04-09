use serde::Serialize;
use git2::{Repository, BranchType};

#[derive(Serialize)]
pub struct BranchInfo {
    pub name: String,
    pub branch_type: String,
    pub is_head: bool,
    pub upstream: Option<String>,
    pub ahead: usize,
    pub behind: usize,
    pub last_commit_oid: String,
    pub last_commit_message: String,
    pub last_commit_timestamp: i64,
}

#[derive(Serialize)]
pub struct StashEntry {
    pub index: usize,
    pub message: String,
    pub oid: String,
    pub parent_oid: String,
    pub timestamp: i64,
}

#[tauri::command]
pub fn list_branches(repo_path: String) -> Result<Vec<BranchInfo>, String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    let mut branches = Vec::new();

    // Iterate over both local and remote branches
    if let Ok(branch_iter) = repo.branches(None) {
        for branch_res in branch_iter {
            if let Ok((branch, b_type)) = branch_res {
                let name = branch.name().ok().flatten().unwrap_or("unknown").to_string();
                let is_head = branch.is_head();
                let b_type_str = match b_type {
                    BranchType::Local => "local",
                    BranchType::Remote => "remote",
                }.to_string();

                let mut ahead = 0;
                let mut behind = 0;
                let mut upstream_name = None;

                // For local branches, check tracking status
                if b_type == BranchType::Local {
                    if let Ok(upstream) = branch.upstream() {
                        upstream_name = upstream.name().ok().flatten().map(|s| s.to_string());
                        
                        if let (Some(local_oid), Some(upstream_oid)) = (branch.get().target(), upstream.get().target()) {
                            if let Ok((a, b)) = repo.graph_ahead_behind(local_oid, upstream_oid) {
                                ahead = a;
                                behind = b;
                            }
                        }
                    }
                }

                let mut last_commit_oid = String::new();
                let mut last_commit_message = String::new();
                let mut last_commit_timestamp = 0;

                if let Ok(commit) = branch.get().peel_to_commit() {
                    last_commit_oid = commit.id().to_string();
                    last_commit_message = commit.summary().unwrap_or("").to_string();
                    last_commit_timestamp = commit.time().seconds();
                }

                branches.push(BranchInfo {
                    name,
                    branch_type: b_type_str,
                    is_head,
                    upstream: upstream_name,
                    ahead,
                    behind,
                    last_commit_oid,
                    last_commit_message,
                    last_commit_timestamp,
                });
            }
        }
    }

    Ok(branches)
}

#[derive(Serialize)]
#[serde(tag = "type", content = "data")]
pub enum StashApplyResult {
    Success,
    Conflict { files: Vec<String> },
}

#[derive(Serialize)]
pub enum RepoState {
    Clean,
    Merging,
    Rebasing,
    CherryPicking,
    HasConflicts,
}

#[tauri::command]
pub fn check_stash_preconditions(repo_path: String) -> Result<RepoState, String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    
    let state = repo.state();
    match state {
        git2::RepositoryState::Merge => return Ok(RepoState::Merging),
        git2::RepositoryState::Rebase | git2::RepositoryState::RebaseInteractive | git2::RepositoryState::RebaseMerge => return Ok(RepoState::Rebasing),
        git2::RepositoryState::CherryPick | git2::RepositoryState::CherryPickSequence => return Ok(RepoState::CherryPicking),
        _ => {}
    }

    let index = repo.index().map_err(|e| e.to_string())?;
    if index.has_conflicts() {
        return Ok(RepoState::HasConflicts);
    }

    Ok(RepoState::Clean)
}

#[tauri::command]
pub fn list_stashes(repo_path: String) -> Result<Vec<StashEntry>, String> {
    let mut repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    
    let mut stash_data = Vec::new();
    let _ = repo.stash_foreach(|index, message, oid| {
        stash_data.push((index, message.to_string(), *oid));
        true
    });
    
    let mut stashes = Vec::new();
    for (index, message, oid) in stash_data {
        let mut timestamp = 0;
        let mut parent_oid = String::new();
        
        if let Ok(commit) = repo.find_commit(oid) {
            timestamp = commit.time().seconds();
            if let Ok(parent) = commit.parent(0) {
                parent_oid = parent.id().to_string();
            }
        }
        
        stashes.push(StashEntry {
            index,
            message,
            oid: oid.to_string(),
            parent_oid,
            timestamp,
        });
    }
    
    Ok(stashes)
}

#[tauri::command]
pub fn create_stash(repo_path: String, message: Option<String>) -> Result<(), String> {
    let mut repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    let sig = repo.signature().map_err(|e| e.to_string())?;
    
    repo.stash_save(&sig, message.as_deref().unwrap_or("Stashed by Git Helper"), None)
        .map_err(|e| e.to_string())?;
        
    Ok(())
}

fn get_conflicts(repo: &Repository) -> Result<Vec<String>, String> {
    let index = repo.index().map_err(|e| e.to_string())?;
    let conflicted_files: Vec<String> = index
        .iter()
        .filter(|entry| (entry.flags & 0x3000) >> 12 != 0)
        .map(|entry| String::from_utf8_lossy(&entry.path).to_string())
        .collect();
    
    // De-duplicate paths (conflicts have multiple entries per path)
    let mut unique_conflicts = conflicted_files;
    unique_conflicts.sort();
    unique_conflicts.dedup();
    
    Ok(unique_conflicts)
}

#[tauri::command]
pub fn apply_stash(repo_path: String, index: usize) -> Result<StashApplyResult, String> {
    let mut repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    
    // Perform apply
    repo.stash_apply(index, None).map_err(|e| e.to_string())?;
    
    // Check for conflicts manually as libgit2 returns Ok(()) even with conflicts
    let conflicted_files = get_conflicts(&repo)?;
    
    if conflicted_files.is_empty() {
        Ok(StashApplyResult::Success)
    } else {
        Ok(StashApplyResult::Conflict { files: conflicted_files })
    }
}

#[tauri::command]
pub fn pop_stash(repo_path: String, index: usize) -> Result<StashApplyResult, String> {
    let mut repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    
    // libgit2 stash_pop is NOT what we want if we want to check conflicts before dropping.
    // However, stash_pop in libgit2 returns Ok(()) and automatically drops if successful?
    // Actually, libgit2's stash_pop will drop the stash even if there are merge conflicts.
    // TO BE SAFE: We apply first, check conflicts, and only THEN drop.
    
    repo.stash_apply(index, None).map_err(|e| e.to_string())?;
    
    let conflicted_files = get_conflicts(&repo)?;
    
    if conflicted_files.is_empty() {
        // No conflicts -> Drop the stash
        repo.stash_drop(index).map_err(|e| e.to_string())?;
        Ok(StashApplyResult::Success)
    } else {
        // Conflicts exist -> Do NOT drop the stash (it's safe for the user to try again after resolving)
        Ok(StashApplyResult::Conflict { files: conflicted_files })
    }
}

#[tauri::command]
pub fn drop_stash(repo_path: String, index: usize) -> Result<(), String> {
    let mut repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    repo.stash_drop(index).map_err(|e| e.to_string())?;
    Ok(())
}
