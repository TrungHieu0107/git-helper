use git2::{Repository, RebaseOptions, Oid};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone)]
#[serde(tag = "type")]
pub enum RebaseResult {
    Success,
    ConflictDetected { files: Vec<String> },
    AlreadyUpToDate,
}

#[tauri::command]
pub fn start_rebase(repo_path: String, target_oid: String) -> Result<RebaseResult, String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    
    // 0. Guard: Check repository state
    if repo.state() != git2::RepositoryState::Clean {
        return Err(format!("Cannot start rebase: repository is in state '{:?}'. Please finish or abort the current operation first.", repo.state()));
    }

    // 1. Initial checks: Working tree must be clean
    let mut status_opts = git2::StatusOptions::new();
    status_opts.include_untracked(false).include_ignored(false);
    if let Ok(statuses) = repo.statuses(Some(&mut status_opts)) {
        if statuses.iter().any(|e| !e.status().is_empty()) {
            return Err("Working tree has uncommitted changes. Please commit or stash before rebasing.".to_string());
        }
    }

    let target_oid = Oid::from_str(&target_oid).map_err(|e| e.to_string())?;
    let target_annotated = repo.find_annotated_commit(target_oid).map_err(|e| e.to_string())?;
    
    // 2. Resolve upstream (the target commit)
    let upstream = Some(&target_annotated);
    
    // 3. Start rebase
    let mut rebase_opts = RebaseOptions::new();
    let mut rebase = repo.rebase(None, upstream, None, Some(&mut rebase_opts))
        .map_err(|e| e.to_string())?;

    let sig = repo.signature().map_err(|e| e.to_string())?;

    // 4. Iterate through rebase operations
    while let Some(op_res) = rebase.next() {
        let _op = match op_res {
            Ok(o) => o,
            Err(e) => {
                // If the error code is Applied (-18), it means the patch was already applied
                // and we can safely skip this commit.
                if e.code() == git2::ErrorCode::Applied {
                    continue;
                }

                // If next() fails for other reasons, it's likely a conflict or apply error
                // Check for conflicts in the index
                let index = repo.index().map_err(|e| e.to_string())?;
                if index.has_conflicts() {
                    let mut conflicted_files = Vec::new();
                    for entry in index.iter() {
                        let stage = (entry.flags >> 12) & 3;
                        if stage > 0 {
                            let path = String::from_utf8_lossy(&entry.path).to_string();
                            conflicted_files.push(path);
                        }
                    }
                    conflicted_files.sort();
                    conflicted_files.dedup();
                    return Ok(RebaseResult::ConflictDetected { files: conflicted_files });
                }
                return Err(format!("Rebase failed at next(): {}", e));
            }
        };

        // Check conflicts again just in case next() succeeded but index is conflicted
        let index = repo.index().map_err(|e| e.to_string())?;
        if index.has_conflicts() {
            let mut conflicted_files = Vec::new();
            for entry in index.iter() {
                let stage = (entry.flags >> 12) & 3;
                if stage > 0 {
                    let path = String::from_utf8_lossy(&entry.path).to_string();
                    conflicted_files.push(path);
                }
            }
            conflicted_files.sort();
            conflicted_files.dedup();
            return Ok(RebaseResult::ConflictDetected { files: conflicted_files });
        }

        // Commit the successful operation
        rebase.commit(None, &sig, None).map_err(|e| e.to_string())?;
    }

    // 5. Finish rebase
    rebase.finish(None).map_err(|e| e.to_string())?;
    
    Ok(RebaseResult::Success)
}
