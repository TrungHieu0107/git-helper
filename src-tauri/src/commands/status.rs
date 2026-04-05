use git2::{Repository, StatusOptions};
use serde::Serialize;

#[derive(Serialize)]
pub struct FileStatus {
    pub path: String,
    pub status: String,
    pub old_path: Option<String>,
}

#[tauri::command]
pub fn get_status(repo_path: String) -> Result<Vec<FileStatus>, String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.message().to_string())?;
    let mut opts = StatusOptions::new();
    opts.include_untracked(true).recurse_untracked_dirs(true).include_ignored(false);

    let statuses = repo.statuses(Some(&mut opts)).map_err(|e| e.message().to_string())?;
    let mut result = Vec::new();

    for entry in statuses.iter() {
        let status = entry.status();
        let path = entry.path().unwrap_or("").to_string();
        
        let mut string_status = "unstaged";
        if status.intersects(git2::Status::WT_NEW | git2::Status::INDEX_NEW) && !status.intersects(git2::Status::WT_MODIFIED | git2::Status::INDEX_MODIFIED) {
             string_status = if status.contains(git2::Status::INDEX_NEW) { "staged" } else { "untracked" };
        } else if status.intersects(git2::Status::INDEX_MODIFIED | git2::Status::INDEX_DELETED | git2::Status::INDEX_RENAMED | git2::Status::INDEX_TYPECHANGE) {
             string_status = "staged";
        } else if status.intersects(git2::Status::WT_MODIFIED | git2::Status::WT_DELETED | git2::Status::WT_RENAMED | git2::Status::WT_TYPECHANGE) {
             string_status = "unstaged";
        } else if status.contains(git2::Status::CONFLICTED) {
             string_status = "conflicted";
        }

        // Just mapping standard to either staged, unstaged, untracked, conflicted
        result.push(FileStatus {
            path,
            status: string_status.to_string(),
            old_path: None, // Simplified for now
        });
    }

    Ok(result)
}

#[tauri::command]
pub fn stage_file(repo_path: String, path: String) -> Result<(), String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.message().to_string())?;
    let mut index = repo.index().map_err(|e| e.message().to_string())?;
    index.add_path(std::path::Path::new(&path)).map_err(|e| e.message().to_string())?;
    index.write().map_err(|e| e.message().to_string())?;
    Ok(())
}

#[tauri::command]
pub fn unstage_file(repo_path: String, path: String) -> Result<(), String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.message().to_string())?;
    let head = repo.head().map_err(|e| e.message().to_string())?;
    let commit = head.peel_to_commit().map_err(|e| e.message().to_string())?;
    repo.reset_default(Some(commit.as_object()), std::path::Path::new(&path)).map_err(|e| e.message().to_string())?;
    Ok(())
}

#[tauri::command]
pub fn stage_all(repo_path: String) -> Result<(), String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.message().to_string())?;
    let mut index = repo.index().map_err(|e| e.message().to_string())?;
    index.add_all(["*"].iter(), git2::IndexAddOption::DEFAULT, None).map_err(|e| e.message().to_string())?;
    index.write().map_err(|e| e.message().to_string())?;
    Ok(())
}

#[derive(Serialize)]
pub struct RepoStatus {
    pub staged_count: usize,
    pub unstaged_count: usize,
    pub untracked_count: usize,
    pub conflict_count: usize,
    pub ahead: usize,
    pub behind: usize,
}

#[tauri::command]
pub fn get_repo_status(path: String) -> Result<RepoStatus, String> {
    let repo = Repository::open(&path).map_err(|e| e.message().to_string())?;
    let mut opts = StatusOptions::new();
    opts.include_untracked(true).recurse_untracked_dirs(true).include_ignored(false);

    let statuses = repo.statuses(Some(&mut opts)).map_err(|e| e.message().to_string())?;
    
    let mut staged = 0;
    let mut unstaged = 0;
    let mut untracked = 0;
    let mut conflicted = 0;

    for entry in statuses.iter() {
        let status = entry.status();
        if status.contains(git2::Status::CONFLICTED) {
            conflicted += 1;
        } else if status.intersects(git2::Status::WT_NEW | git2::Status::INDEX_NEW) && !status.intersects(git2::Status::WT_MODIFIED | git2::Status::INDEX_MODIFIED) {
            if status.contains(git2::Status::INDEX_NEW) {
                staged += 1;
            } else {
                untracked += 1;
            }
        } else {
            if status.intersects(git2::Status::INDEX_MODIFIED | git2::Status::INDEX_DELETED | git2::Status::INDEX_RENAMED | git2::Status::INDEX_TYPECHANGE) {
                staged += 1;
            }
            if status.intersects(git2::Status::WT_MODIFIED | git2::Status::WT_DELETED | git2::Status::WT_RENAMED | git2::Status::WT_TYPECHANGE) {
                unstaged += 1;
            }
        }
    }

    let mut ahead = 0;
    let mut behind = 0;
    if let Ok(head) = repo.head() {
        if head.is_branch() {
            if let Some(branch_name) = head.shorthand() {
                if let Ok(branch) = repo.find_branch(branch_name, git2::BranchType::Local) {
                    if let Ok(upstream) = branch.upstream() {
                        if let (Some(local_oid), Some(upstream_oid)) = (branch.get().target(), upstream.get().target()) {
                            if let Ok((a, b)) = repo.graph_ahead_behind(local_oid, upstream_oid) {
                                ahead = a;
                                behind = b;
                            }
                        }
                    }
                }
            }
        }
    }

    Ok(RepoStatus {
        staged_count: staged,
        unstaged_count: unstaged,
        untracked_count: untracked,
        conflict_count: conflicted,
        ahead,
        behind,
    })
}
