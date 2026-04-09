use serde::Serialize;
use git2::Repository;

#[derive(Serialize)]
pub struct StashEntry {
    pub index: usize,
    pub message: String,
    pub oid: String,
    pub parent_oid: String,
    pub timestamp: i64,
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
    
    let mut unique_conflicts = conflicted_files;
    unique_conflicts.sort();
    unique_conflicts.dedup();
    
    Ok(unique_conflicts)
}

#[tauri::command]
pub fn apply_stash(repo_path: String, index: usize) -> Result<StashApplyResult, String> {
    let mut repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    repo.stash_apply(index, None).map_err(|e| e.to_string())?;
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
    repo.stash_apply(index, None).map_err(|e| e.to_string())?;
    let conflicted_files = get_conflicts(&repo)?;
    
    if conflicted_files.is_empty() {
        repo.stash_drop(index).map_err(|e| e.to_string())?;
        Ok(StashApplyResult::Success)
    } else {
        Ok(StashApplyResult::Conflict { files: conflicted_files })
    }
}

#[tauri::command]
pub fn drop_stash(repo_path: String, index: usize) -> Result<(), String> {
    let mut repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    repo.stash_drop(index).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn stash_save_advanced(
    repo_path: String,
    message: Option<String>,
    include_untracked: bool,
    keep_index: bool,
) -> Result<String, String> {
    let mut args = vec![
        "stash".to_string(), 
        "push".to_string(),
    ];

    if keep_index {
        args.push("--keep-index".to_string());
    }

    if include_untracked {
        args.push("--include-untracked".to_string());
    }

    if let Some(msg) = message {
        if !msg.trim().is_empty() {
            args.push("-m".to_string());
            args.push(msg);
        }
    }

    let output = std::process::Command::new("git")
        .args(&args)
        .current_dir(&repo_path)
        .output()
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).trim().to_string())
    }
}
