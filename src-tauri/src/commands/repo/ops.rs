use git2::{Repository, RepositoryState, build::CheckoutBuilder};
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};

#[derive(Serialize, Deserialize, Clone)]
pub struct CheckoutOptions {
    pub force: bool,
    pub merge: bool,
    pub create: bool,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(tag = "type", content = "data")]
pub enum CheckoutError {
    Conflict { files: Vec<String> },
    DirtyState { state: String },
    NotFound { branch: String },
    DetachedHead { oid: String },
    Generic { message: String },
}

#[tauri::command]
pub fn checkout_branch(repo_path: String, branch_name: String, options: CheckoutOptions) -> Result<(), CheckoutError> {
    let repo = Repository::open(&repo_path).map_err(|e| CheckoutError::Generic { message: e.to_string() })?;
    
    let state = repo.state();
    if state != RepositoryState::Clean && !options.force {
        return Err(CheckoutError::DirtyState { 
            state: format!("{:?}", state).to_lowercase() 
        });
    }

    let conflict_files = Arc::new(Mutex::new(Vec::<String>::new()));

    if let Ok(branch) = repo.find_branch(&branch_name, git2::BranchType::Local) {
        let commit = branch.get().peel_to_commit().map_err(|e| CheckoutError::Generic { message: e.to_string() })?;
        
        let checkout_result = {
            let mut checkout_builder = build_checkout(&options, &conflict_files);
            repo.checkout_tree(commit.as_object(), Some(&mut checkout_builder))
        };
        
        if let Err(e) = checkout_result {
            let conflicts = extract_conflicts(&conflict_files);
            if !conflicts.is_empty() {
                return Err(CheckoutError::Conflict { files: conflicts });
            }
            return Err(CheckoutError::Generic { message: e.to_string() });
        }
        
        repo.set_head(branch.get().name().unwrap()).map_err(|e| CheckoutError::Generic { message: e.to_string() })?;
        return Ok(());
    }

    if let Ok(remote_branch) = repo.find_branch(&branch_name, git2::BranchType::Remote) {
        let reference = remote_branch.get();
        let commit = reference.peel_to_commit().map_err(|e| CheckoutError::Generic { message: e.to_string() })?;
        
        let parts: Vec<&str> = branch_name.splitn(2, '/').collect();
        let local_name = if parts.len() > 1 { parts[1] } else { &branch_name };
        
        let local_branch = repo.branch(local_name, &commit, false).map_err(|e| CheckoutError::Generic { message: e.to_string() })?;
        
        let checkout_result = {
            let mut checkout_builder = build_checkout(&options, &conflict_files);
            repo.checkout_tree(commit.as_object(), Some(&mut checkout_builder))
        };
        
        if let Err(e) = checkout_result {
            let conflicts = extract_conflicts(&conflict_files);
            if !conflicts.is_empty() {
                return Err(CheckoutError::Conflict { files: conflicts });
            }
            return Err(CheckoutError::Generic { message: e.to_string() });
        }
        
        repo.set_head(local_branch.get().name().unwrap()).map_err(|e| CheckoutError::Generic { message: e.to_string() })?;
        return Ok(());
    }

    if let Ok(obj) = repo.revparse_single(&branch_name) {
        if let Some(commit) = obj.as_commit() {
            let commit_id = commit.id();
            
            let checkout_result = {
                let mut checkout_builder = build_checkout(&options, &conflict_files);
                repo.checkout_tree(&obj, Some(&mut checkout_builder))
            };
            
            if let Err(e) = checkout_result {
                let conflicts = extract_conflicts(&conflict_files);
                if !conflicts.is_empty() {
                    return Err(CheckoutError::Conflict { files: conflicts });
                }
                return Err(CheckoutError::Generic { message: e.to_string() });
            }
            repo.set_head_detached(commit_id).map_err(|e| CheckoutError::Generic { message: e.to_string() })?;
            return Err(CheckoutError::DetachedHead { oid: commit_id.to_string() });
        }
    }

    Err(CheckoutError::NotFound { branch: branch_name })
}

fn extract_conflicts(conflict_files: &Arc<Mutex<Vec<String>>>) -> Vec<String> {
    conflict_files.lock().unwrap_or_else(|e| e.into_inner()).clone()
}

fn build_checkout<'a>(options: &CheckoutOptions, conflict_files: &'a Arc<Mutex<Vec<String>>>) -> CheckoutBuilder<'a> {
    let mut checkout_builder = CheckoutBuilder::new();
    if options.force {
        checkout_builder.force();
    } else if options.merge {
        checkout_builder.conflict_style_merge(true);
    } else {
        checkout_builder.safe();
    }

    let cf = Arc::clone(conflict_files);
    checkout_builder.notify(move |_checkout_notif, path, _baseline, _target, _workdir| {
        if let Some(p) = path {
            if let Ok(mut files) = cf.lock() {
                files.push(p.to_string_lossy().to_string());
            }
        }
        true
    });

    checkout_builder
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(tag = "action")]
pub enum SafeCheckoutResult {
    AlreadyOnBranch,
    Clean,
    DirtyNoConflict,
    DirtyWithConflict { files: Vec<String> },
    DirtyState { state: String },
    NotFound { branch: String },
}

#[tauri::command]
pub fn safe_checkout(repo_path: String, branch_name: String) -> Result<SafeCheckoutResult, String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    
    let state = repo.state();
    if state != RepositoryState::Clean {
        return Ok(SafeCheckoutResult::DirtyState {
            state: format!("{:?}", state).to_lowercase(),
        });
    }
    
    if let Ok(head) = repo.head() {
        if let Some(current) = head.shorthand() {
            if current == branch_name {
                return Ok(SafeCheckoutResult::AlreadyOnBranch);
            }
        }
    }
    
    let target_commit = if let Ok(branch) = repo.find_branch(&branch_name, git2::BranchType::Local) {
        Some(branch.get().peel_to_commit().map_err(|e| e.to_string())?)
    } else if let Ok(branch) = repo.find_branch(&branch_name, git2::BranchType::Remote) {
        Some(branch.get().peel_to_commit().map_err(|e| e.to_string())?)
    } else if let Ok(obj) = repo.revparse_single(&branch_name) {
        obj.as_commit().cloned()
    } else {
        return Ok(SafeCheckoutResult::NotFound { branch: branch_name });
    };
    
    let commit = match target_commit {
        Some(c) => c,
        None => return Ok(SafeCheckoutResult::NotFound { branch: branch_name }),
    };
    
    let mut opts = git2::StatusOptions::new();
    opts.include_untracked(true).recurse_untracked_dirs(true).include_ignored(false);
    let statuses = repo.statuses(Some(&mut opts)).map_err(|e| e.to_string())?;
    
    let has_changes = statuses.iter().any(|entry| {
        let s = entry.status();
        !s.is_empty() && s != git2::Status::WT_NEW
    });
    
    if !has_changes {
        return Ok(SafeCheckoutResult::Clean);
    }
    
    let conflict_files = Arc::new(Mutex::new(Vec::<String>::new()));
    {
        let cf = Arc::clone(&conflict_files);
        let mut checkout_builder = CheckoutBuilder::new();
        checkout_builder.dry_run();
        checkout_builder.safe();
        checkout_builder.notify_on(git2::CheckoutNotificationType::CONFLICT);
        checkout_builder.notify(move |_notif, path, _baseline, _target, _workdir| {
            if let Some(p) = path {
                if let Ok(mut files) = cf.lock() {
                    files.push(p.to_string_lossy().to_string());
                }
            }
            true
        });
        
        let _ = repo.checkout_tree(commit.as_object(), Some(&mut checkout_builder));
    }
    
    let conflicts = conflict_files.lock().unwrap_or_else(|e| e.into_inner()).clone();
    
    if conflicts.is_empty() {
        Ok(SafeCheckoutResult::DirtyNoConflict)
    } else {
        Ok(SafeCheckoutResult::DirtyWithConflict { files: conflicts })
    }
}

#[derive(Serialize, Deserialize, Clone)]
pub struct BranchValidation {
    pub valid: bool,
    pub error: Option<String>,
    pub suggestion: Option<String>,
}

fn validate_name(name: &str) -> BranchValidation {
    let name = name.trim();
    if name.is_empty() {
        return BranchValidation { valid: false, error: Some("Branch name cannot be empty".into()), suggestion: None };
    }
    if name.chars().any(|c| matches!(c, ' ' | '~' | '^' | ':' | '?' | '*' | '[' | '\\') || c.is_control()) {
        return BranchValidation { valid: false, error: Some("Branch name contains invalid characters".into()), suggestion: None };
    }
    if name.starts_with('/') || name.starts_with('.') {
        return BranchValidation { valid: false, error: Some("Branch name cannot start with / or .".into()), suggestion: None };
    }
    if name.ends_with('/') || name.ends_with(".lock") || name.ends_with('.') {
        return BranchValidation { valid: false, error: Some("Invalid branch name".into()), suggestion: None };
    }
    if name.contains("..") || name.contains("//") {
        return BranchValidation { valid: false, error: Some("Invalid branch name".into()), suggestion: None };
    }
    if name.contains('@') && name.contains('{') {
        return BranchValidation { valid: false, error: Some("Branch name cannot contain @{".into()), suggestion: None };
    }
    BranchValidation { valid: true, error: None, suggestion: None }
}

#[tauri::command]
pub fn validate_branch_name(repo_path: String, name: String) -> Result<BranchValidation, String> {
    let name = name.trim().to_string();
    let mut result = validate_name(&name);
    if !result.valid {
        return Ok(result);
    }

    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    if repo.find_branch(&name, git2::BranchType::Local).is_ok() {
        let mut suffix = 2;
        loop {
            let candidate = format!("{}-{}", name, suffix);
            if repo.find_branch(&candidate, git2::BranchType::Local).is_err() {
                result.valid = false;
                result.error = Some("Branch already exists".into());
                result.suggestion = Some(candidate);
                return Ok(result);
            }
            suffix += 1;
            if suffix > 100 { break; }
        }
        result.valid = false;
        result.error = Some("Branch already exists".into());
        return Ok(result);
    }
    Ok(result)
}

#[derive(Serialize, Deserialize, Clone)]
pub struct CreateBranchResult {
    pub name: String,
    pub oid: String,
    pub short_oid: String,
}

#[tauri::command]
pub fn create_branch(repo_path: String, name: String, start_point: Option<String>) -> Result<CreateBranchResult, String> {
    let name = name.trim().to_string();
    let validation = validate_name(&name);
    if !validation.valid {
        return Err(validation.error.unwrap_or_else(|| "Invalid branch name".into()));
    }
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    if repo.find_branch(&name, git2::BranchType::Local).is_ok() {
        return Err(format!("Branch '{}' already exists", name));
    }
    let target = match start_point {
        Some(s) => repo.revparse_single(&s).map_err(|e| e.to_string())?.peel_to_commit().map_err(|e| e.to_string())?,
        None => repo.head().map_err(|e| e.to_string())?.peel_to_commit().map_err(|e| e.to_string())?,
    };
    let oid = target.id().to_string();
    let short_oid = oid[..7.min(oid.len())].to_string();
    repo.branch(&name, &target, false).map_err(|e| e.to_string())?;
    Ok(CreateBranchResult { name, oid, short_oid })
}

#[derive(Serialize, Deserialize, Clone)]
pub struct WorkingTreeCheck {
    pub has_staged: bool,
    pub has_unstaged: bool,
    pub has_untracked: bool,
    pub is_detached: bool,
    pub head_branch: Option<String>,
    pub head_oid: String,
}

#[tauri::command]
pub fn check_working_tree(repo_path: String) -> Result<WorkingTreeCheck, String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    
    let mut opts = git2::StatusOptions::new();
    opts.include_untracked(true).recurse_untracked_dirs(true).include_ignored(false);
    let statuses = repo.statuses(Some(&mut opts)).map_err(|e| e.to_string())?;
    
    let mut has_staged = false;
    let mut has_unstaged = false;
    let mut has_untracked = false;
    
    for entry in statuses.iter() {
        let s = entry.status();
        if s.intersects(git2::Status::INDEX_NEW | git2::Status::INDEX_MODIFIED | git2::Status::INDEX_DELETED | git2::Status::INDEX_RENAMED | git2::Status::INDEX_TYPECHANGE) {
            has_staged = true;
        }
        if s.intersects(git2::Status::WT_MODIFIED | git2::Status::WT_DELETED | git2::Status::WT_TYPECHANGE | git2::Status::WT_RENAMED) {
            has_unstaged = true;
        }
        if s == git2::Status::WT_NEW {
            has_untracked = true;
        }
    }
    
    let is_detached = repo.head_detached().unwrap_or(false);
    let (head_branch, head_oid) = if let Ok(head) = repo.head() {
        let branch = head.shorthand().map(|s| s.to_string());
        let oid = head.target().map(|o| o.to_string()).unwrap_or_default();
        (if is_detached { None } else { branch }, oid)
    } else {
        (None, String::new())
    };
    
    Ok(WorkingTreeCheck {
        has_staged,
        has_unstaged,
        has_untracked,
        is_detached,
        head_branch,
        head_oid,
    })
}

#[tauri::command]
pub fn undo_last_commit(repo_path: String) -> Result<(), String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    let head = repo.head().map_err(|e| e.to_string())?;
    let commit = head.peel_to_commit().map_err(|e| e.to_string())?;
    let parent = commit.parent(0).map_err(|_| "No parent commit to undo to")?;
    repo.reset(parent.as_object(), git2::ResetType::Soft, None).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn open_terminal(path: String) -> Result<(), String> {
    std::process::Command::new("powershell")
        .arg("-NoExit")
        .arg("-Command")
        .arg(format!("cd '{}'", path))
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}
