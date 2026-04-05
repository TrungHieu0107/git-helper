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

#[tauri::command]
pub fn list_stashes(_repo_path: String) -> Result<Vec<StashEntry>, String> {
    Ok(Vec::new())
}
