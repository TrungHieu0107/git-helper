use git2::Repository;

pub fn open_repository(path: &str) -> Result<Repository, String> {
    Repository::open(path).map_err(|e| format!("Failed to open repository: {}", e))
}
