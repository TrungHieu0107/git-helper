use git2::{Repository, StatusOptions};
use serde::Serialize;

#[derive(Serialize)]
pub struct FileStatus {
    pub path: String,
    pub status: String,
    pub old_path: Option<String>,
}

#[derive(Serialize, Debug, Clone, Copy)]
pub enum ConflictMode {
    CherryPick,
    Merge,
    Rebase,
    Standalone,
}

#[derive(Serialize)]
pub struct ConflictedFile {
    pub path: String,
    pub status: String, // UU, AA, DD, etc.
}

#[derive(Serialize)]
pub struct ConflictContext {
    pub source: ConflictMode,
    pub files: Vec<ConflictedFile>,
}

#[tauri::command]
pub fn get_status(repo_path: String) -> Result<Vec<FileStatus>, String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.message().to_string())?;
    let mut opts = StatusOptions::new();
    opts.include_untracked(true)
        .recurse_untracked_dirs(true)
        .include_ignored(false)
        .renames_head_to_index(true)
        .renames_index_to_workdir(true);

    let statuses = repo.statuses(Some(&mut opts)).map_err(|e| e.message().to_string())?;
    let mut result = Vec::new();

    for entry in statuses.iter() {
        let status = entry.status();
        let path = entry.path().unwrap_or("").to_string();
        
        // Find old_path for renames
        let old_path = if status.intersects(git2::Status::INDEX_RENAMED | git2::Status::WT_RENAMED) {
            entry.head_to_index().and_then(|diff| diff.old_file().path().map(|p| p.to_string_lossy().to_string()))
                .or_else(|| entry.index_to_workdir().and_then(|diff| diff.old_file().path().map(|p| p.to_string_lossy().to_string())))
        } else {
            None
        };

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

        result.push(FileStatus {
            path,
            status: string_status.to_string(),
            old_path,
        });
    }

    Ok(result)
}

#[tauri::command]
pub fn get_conflict_context(repo_path: String) -> Result<ConflictContext, String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    
    // 1. Detect Source
    let dot_git = repo.path();
    let source = if dot_git.join("CHERRY_PICK_HEAD").exists() {
        ConflictMode::CherryPick
    } else if dot_git.join("MERGE_HEAD").exists() {
        ConflictMode::Merge
    } else if dot_git.join("rebase-merge").exists() || dot_git.join("rebase-apply").exists() {
        ConflictMode::Rebase
    } else {
        ConflictMode::Standalone
    };

    // 2. Identify Conflicted Files
    // Using index to determine the exact conflict type (ours/theirs/ancestor)
    let index = repo.index().map_err(|e| e.to_string())?;
    let mut files = Vec::new();
    
    // We iterate over the index to find entries with non-zero stages
    // Stages: 0=normal, 1=ancestor, 2=ours, 3=theirs
    let mut conflicted_paths = std::collections::HashSet::new();
    for entry in index.iter() {
        let stage = entry.flags >> 12 & 3;
        if stage > 0 {
            conflicted_paths.insert(String::from_utf8_lossy(&entry.path).to_string());
        }
    }

    for path in conflicted_paths {
        let p = std::path::Path::new(&path);
        let stage1 = index.get_path(p, 1).is_some();
        let stage2 = index.get_path(p, 2).is_some();
        let stage3 = index.get_path(p, 3).is_some();

        let status_code = match (stage1, stage2, stage3) {
            (true, true, true) => "UU", // Both modified
            (false, true, true) => "AA", // Both added
            (true, false, false) => "DD", // Both deleted
            (true, true, false) => "UD", // Deleted by them
            (false, true, false) => "AU", // Added by us
            (true, false, true) => "DU", // Deleted by us
            (false, false, true) => "UA", // Added by them
            _ => "UU", // Fallback
        };

        files.push(ConflictedFile { path, status: status_code.to_string() });
    }

    Ok(ConflictContext { source, files })
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
    pub branch_name: String,
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

    let branch_name = super::repo::utils::resolve_head_branch(&repo);
    
    Ok(RepoStatus {
        staged_count: staged,
        unstaged_count: unstaged,
        untracked_count: untracked,
        conflict_count: conflicted,
        ahead,
        behind,
        branch_name,
    })
}

#[tauri::command]
pub fn unstage_all(repo_path: String) -> Result<(), String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    let head = match repo.head() {
        Ok(h) => h,
        Err(_) => {
            let mut index = repo.index().map_err(|e| e.to_string())?;
            index.clear().map_err(|e| e.to_string())?;
            index.write().map_err(|e| e.to_string())?;
            return Ok(());
        }
    };
    let commit = head.peel_to_commit().map_err(|e| e.to_string())?;
    repo.reset(commit.as_object(), git2::ResetType::Mixed, None).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn discard_all(repo_path: String) -> Result<(), String> {
    let reset_output = std::process::Command::new("git")
        .args(["-C", &repo_path, "reset", "--hard"])
        .output()
        .map_err(|e| e.to_string())?;
        
    if !reset_output.status.success() {
        return Err(String::from_utf8_lossy(&reset_output.stderr).to_string());
    }
        
    let clean_output = std::process::Command::new("git")
        .args(["-C", &repo_path, "clean", "-fd"])
        .output()
        .map_err(|e| e.to_string())?;
        
    if !clean_output.status.success() {
        return Err(String::from_utf8_lossy(&clean_output.stderr).to_string());
    }

    Ok(())
}
