use serde::Serialize;

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
pub fn list_branches(_repo_path: String) -> Result<Vec<BranchInfo>, String> {
    Ok(Vec::new())
}

use git2::Repository;

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
