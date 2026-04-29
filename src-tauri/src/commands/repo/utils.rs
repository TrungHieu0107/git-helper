use git2::Repository;
use std::fs;

pub fn resolve_head_branch(repo: &Repository) -> String {
    let state = repo.state();
    let git_dir = repo.path(); // This is the .git folder path

    // 1. Check for Rebase Interactive / Merge
    if state == git2::RepositoryState::RebaseInteractive || state == git2::RepositoryState::RebaseMerge {
        let head_name_path = git_dir.join("rebase-merge").join("head-name");
        if let Ok(content) = fs::read_to_string(head_name_path) {
            let branch = content.trim().to_string();
            return branch.strip_prefix("refs/heads/").unwrap_or(&branch).to_string();
        }
    }

    // 2. Check for Standard Rebase
    if state == git2::RepositoryState::Rebase || state == git2::RepositoryState::ApplyMailboxOrRebase {
        let head_name_path = git_dir.join("rebase-apply").join("head-name");
        if let Ok(content) = fs::read_to_string(head_name_path) {
            let branch = content.trim().to_string();
            return branch.strip_prefix("refs/heads/").unwrap_or(&branch).to_string();
        }
    }

    // 3. Fallback to standard HEAD resolution
    if let Ok(head) = repo.head() {
        if let Some(name) = head.shorthand() {
            return name.to_string();
        }
    }

    "HEAD".to_string()
}
