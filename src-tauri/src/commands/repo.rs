use git2::Repository;

#[tauri::command]
pub fn open_repo_action(path: String) -> Result<String, String> {
    match Repository::open(&path) {
        Ok(_) => Ok(path),
        Err(e) => Err(format!("Not a valid git repository: {}", e)),
    }
}
