use git2::{Repository, RepositoryState, build::CheckoutBuilder};
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use std::process::Command;
use std::path::Path;

#[tauri::command]
pub fn open_file(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        Command::new("cmd")
            .args(["/c", "start", "", &path])
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "linux")]
    {
        Command::new("xdg-open")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn reveal_file(path: String) -> Result<(), String> {
    let p = Path::new(&path);
    if !p.exists() {
        return Err(format!("Path does not exist: {}", path));
    }

    #[cfg(target_os = "windows")]
    {
        // explorer.exe /select expects backslashes and no extra quotes inside the arg
        let windows_path = path.replace("/", "\\");
        Command::new("explorer.exe")
            .arg(format!("/select,{}", windows_path))
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .args(["-R", &path])
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "linux")]
    {
        // Try dbus-send for Nautilus/others, fallback to xdg-open on parent
        let dbus_res = Command::new("dbus-send")
            .args([
                "--session",
                "--dest=org.freedesktop.FileManager1",
                "--type=method_call",
                "/org/freedesktop/FileManager1",
                "org.freedesktop.FileManager1.ShowItems",
                &format!("array:string:\"file://{}\"", path),
                "string:\"\"",
            ])
            .spawn();
        
        if dbus_res.is_err() {
            if let Some(parent) = Path::new(&path).parent() {
                Command::new("xdg-open")
                    .arg(parent.to_string_lossy().to_string())
                    .spawn()
                    .map_err(|e| e.to_string())?;
            }
        }
    }
    Ok(())
}

#[tauri::command]
pub fn discard_file_changes(repo_path: String, file_path: String) -> Result<(), String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    let path = Path::new(&file_path);

    // Check if file is tracked
    let statuses = repo.statuses(None).map_err(|e| e.to_string())?;
    let entry = statuses.iter().find(|e| e.path() == Some(&file_path));
    
    let is_untracked = entry.map(|e| e.status().contains(git2::Status::WT_NEW)).unwrap_or(false);

    if is_untracked {
        let full_path = Path::new(&repo_path).join(path);
        if full_path.exists() {
            if full_path.is_dir() {
                std::fs::remove_dir_all(full_path).map_err(|e| e.to_string())?;
            } else {
                std::fs::remove_file(full_path).map_err(|e| e.to_string())?;
            }
        }
    } else {
        // Tracked file: revert to HEAD
        let head = repo.head().map_err(|e| e.to_string())?;
        let commit = head.peel_to_commit().map_err(|e| e.to_string())?;
        
        // 1. Unstage if staged
        let _ = repo.reset_default(Some(commit.as_object()), &[file_path.as_str()]);

        // 2. Checkout from HEAD to workdir
        let mut checkout_builder = CheckoutBuilder::new();
        checkout_builder.path(path).force();
        repo.checkout_head(Some(&mut checkout_builder))
            .map_err(|e| format!("Failed to checkout: {}", e))?;
    }

    Ok(())
}

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
    let (target_name, target_type) = resolve_checkout_target(&repo, &branch_name);

    match target_type {
        git2::BranchType::Local => {
            let branch = repo.find_branch(&target_name, git2::BranchType::Local)
                .map_err(|_| CheckoutError::NotFound { branch: target_name.clone() })?;
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
            Ok(())
        },
        git2::BranchType::Remote => {
            let remote_branch = repo.find_branch(&target_name, git2::BranchType::Remote)
                .map_err(|_| CheckoutError::NotFound { branch: target_name.clone() })?;
            let remote_commit = remote_branch.get().peel_to_commit().map_err(|e| CheckoutError::Generic { message: e.to_string() })?;
            
            let local_name = derive_local_name(&target_name);
            
            // 1. Locate or create local branch
            let local_branch = match repo.find_branch(&local_name, git2::BranchType::Local) {
                Ok(b) => b,
                Err(_) => {
                    let mut b = repo.branch(&local_name, &remote_commit, false)
                        .map_err(|e| CheckoutError::Generic { message: format!("Failed to create local branch '{}': {}", local_name, e) })?;
                    // Set upstream tracking for new branch
                    b.set_upstream(Some(&target_name))
                        .map_err(|e| CheckoutError::Generic { message: format!("Failed to set upstream: {}", e) })?;
                    b
                }
            };
            
            // 2. Perform checkout (tree of the LOCAL branch tip)
            let local_commit = local_branch.get().peel_to_commit().map_err(|e| CheckoutError::Generic { message: e.to_string() })?;
            let checkout_result = {
                let mut checkout_builder = build_checkout(&options, &conflict_files);
                repo.checkout_tree(local_commit.as_object(), Some(&mut checkout_builder))
            };
            
            if let Err(e) = checkout_result {
                let conflicts = extract_conflicts(&conflict_files);
                if !conflicts.is_empty() {
                    return Err(CheckoutError::Conflict { files: conflicts });
                }
                return Err(CheckoutError::Generic { message: e.to_string() });
            }
            
            // 3. Move HEAD
            repo.set_head(local_branch.get().name().unwrap()).map_err(|e| CheckoutError::Generic { message: e.to_string() })?;
            Ok(())
        }
    }
}

fn build_checkout<'a>(options: &CheckoutOptions, conflict_files: &Arc<Mutex<Vec<String>>>) -> CheckoutBuilder<'a> {
    let mut checkout_builder = CheckoutBuilder::new();
    if options.force {
        checkout_builder.force();
    } else {
        checkout_builder.safe();
    }
    
    let cf = Arc::clone(conflict_files);
    checkout_builder.notify_on(git2::CheckoutNotificationType::CONFLICT);
    checkout_builder.notify(move |_notif, path, _baseline, _target, _workdir| {
        if let Some(p) = path {
            if let Ok(mut files) = cf.lock() {
                files.push(p.to_string_lossy().to_string());
            }
        }
        true
    });
    checkout_builder
}

fn extract_conflicts(conflict_files: &Arc<Mutex<Vec<String>>>) -> Vec<String> {
    let mut files = conflict_files.lock().unwrap_or_else(|e| e.into_inner()).clone();
    files.sort();
    files.dedup();
    files
}

/// Resolves a branch name to its effective checkout target.
/// If it's a remote branch (e.g., origin/foo), it returns the local name (foo) 
/// and indicates it's a remote source.
fn resolve_checkout_target(repo: &Repository, name: &str) -> (String, git2::BranchType) {
    if repo.find_branch(name, git2::BranchType::Local).is_ok() {
        return (name.to_string(), git2::BranchType::Local);
    }
    
    if repo.find_branch(name, git2::BranchType::Remote).is_ok() {
        return (name.to_string(), git2::BranchType::Remote);
    }

    // Default to local (handles new branch names or raw OIDs via revparse later)
    (name.to_string(), git2::BranchType::Local)
}

fn derive_local_name(remote_name: &str) -> String {
    let parts: Vec<&str> = remote_name.splitn(2, '/').collect();
    if parts.len() > 1 { parts[1].to_string() } else { remote_name.to_string() }
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

    let (target_name, target_type) = resolve_checkout_target(&repo, &branch_name);
    let effective_local_name = if target_type == git2::BranchType::Remote {
        derive_local_name(&target_name)
    } else {
        target_name.clone()
    };
    
    if let Ok(head) = repo.head() {
        if let Some(current) = head.shorthand() {
            if current == effective_local_name {
                return Ok(SafeCheckoutResult::AlreadyOnBranch);
            }
        }
    }
    
    let target_oid = if target_type == git2::BranchType::Remote {
        let local_name = derive_local_name(&target_name);
        match repo.find_branch(&local_name, git2::BranchType::Local) {
            Ok(b) => b.get().target().ok_or("Local branch has no target")?,
            Err(_) => {
                let rb = repo.find_branch(&target_name, git2::BranchType::Remote).map_err(|e| e.to_string())?;
                rb.get().target().ok_or("Remote branch has no target")?
            }
        }
    } else if let Ok(branch) = repo.find_branch(&target_name, git2::BranchType::Local) {
        branch.get().target().ok_or("Branch has no target")?
    } else if let Ok(obj) = repo.revparse_single(&target_name) {
        obj.id()
    } else {
        return Ok(SafeCheckoutResult::NotFound { branch: target_name });
    };

    let commit = repo.find_commit(target_oid).map_err(|e| e.to_string())?;
    
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
pub fn undo_last_commit(repo_path: String, mode: ResetMode) -> Result<(), String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    
    // Check repository state
    if repo.state() != git2::RepositoryState::Clean {
        return Err("Cannot undo commit: repository is in a busy state (merge/rebase/etc).".to_string());
    }

    let head = repo.head().map_err(|e| e.to_string())?;
    let commit = head.peel_to_commit().map_err(|e| e.to_string())?;
    
    // Use revparse_single to find HEAD~1 reliably
    let parent = match repo.revparse_single("HEAD~1") {
        Ok(obj) => obj,
        Err(_) => return Err("Cannot undo: This is the first commit of the repository.".to_string()),
    };
    
    let reset_type = match mode {
        ResetMode::Soft => git2::ResetType::Soft,
        ResetMode::Mixed => git2::ResetType::Mixed,
        ResetMode::Hard => git2::ResetType::Hard,
    };

    repo.reset(&parent, reset_type, None).map_err(|e| e.to_string())?;
    
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
#[derive(Serialize, Deserialize, Clone)]
#[serde(tag = "type", content = "data")]
pub enum ForceCheckoutResult {
    Clean,
    NeedsStash,
    StashAndDone { stash_restored: bool },
    StashConflict { files: Vec<String> },
    NoRemoteRef,
    NotOnBranch,
    Generic { message: String },
}

#[tauri::command]
pub fn force_checkout_from_origin(repo_path: String, branch_name: String) -> Result<ForceCheckoutResult, String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    
    // 1. Validate repo is not in detached HEAD state
    if repo.head_detached().unwrap_or(false) {
        return Ok(ForceCheckoutResult::NotOnBranch);
    }

    // 2. Resolve origin/{branch_name} and local name
    let (remote_ref_name, local_branch_name) = if branch_name.starts_with("origin/") {
        (branch_name.clone(), branch_name.strip_prefix("origin/").unwrap().to_string())
    } else {
        (format!("origin/{}", branch_name), branch_name.clone())
    };

    let remote_branch = match repo.find_branch(&remote_ref_name, git2::BranchType::Remote) {
        Ok(b) => b,
        Err(_) => return Ok(ForceCheckoutResult::NoRemoteRef),
    };
    let remote_oid = remote_branch.get().target().ok_or("Remote branch has no target")?;
    let remote_obj = repo.find_object(remote_oid, None).map_err(|e| e.to_string())?;

    // 3. Check working tree for local changes
    let check = check_working_tree(repo_path.clone())?;
    if check.has_staged || check.has_unstaged {
        return Ok(ForceCheckoutResult::NeedsStash);
    }

    // 4. Determine if we are force-resetting the current branch
    let head = repo.head().map_err(|e| e.to_string())?;
    let is_current = head.shorthand() == Some(&local_branch_name);
    if is_current {
        // Force reset current branch (updates ref + workdir)
        repo.reset(&remote_obj, git2::ResetType::Hard, None).map_err(|e| e.to_string())?;
    } else {
        // Move a different branch ref to the remote's OID (force=true to avoid "already exists")
        let remote_commit = remote_obj.as_commit()
            .ok_or("Remote object is not a commit")?;
        repo.branch(&local_branch_name, remote_commit, true).map_err(|e| e.to_string())?;
    }
    
    Ok(ForceCheckoutResult::Clean)
}

#[tauri::command]
pub fn force_checkout_confirm_with_stash(repo_path: String, branch_name: String) -> Result<ForceCheckoutResult, String> {
    let mut repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    
    // 1. Create stash
    let sig = repo.signature().map_err(|e| e.to_string())?;
    let stash_msg = format!("Auto-stash before force checkout {}", branch_name);
    
    let _stash_oid = repo.stash_save(&sig, &stash_msg, None).map_err(|e| e.to_string())?;
    
    // 2. Resolve origin/{branch_name} and reset
    {
        let (remote_ref_name, local_branch_name) = if branch_name.starts_with("origin/") {
            (branch_name.clone(), branch_name.strip_prefix("origin/").unwrap().to_string())
        } else {
            (format!("origin/{}", branch_name), branch_name.clone())
        };

        let remote_branch = match repo.find_branch(&remote_ref_name, git2::BranchType::Remote) {
            Ok(b) => b,
            Err(_) => return Ok(ForceCheckoutResult::NoRemoteRef),
        };
        let remote_oid = remote_branch.get().target().ok_or("Remote branch has no target")?;
        let remote_obj = repo.find_object(remote_oid, None).map_err(|e| e.to_string())?;
        
        let head = repo.head().map_err(|e| e.to_string())?;
        let is_current = head.shorthand() == Some(&local_branch_name);
        if is_current {
            repo.reset(&remote_obj, git2::ResetType::Hard, None).map_err(|e| e.to_string())?;
        } else {
            let remote_commit = remote_obj.as_commit()
                .ok_or("Remote object is not a commit")?;
            repo.branch(&local_branch_name, remote_commit, true).map_err(|e| e.to_string())?;
        }
    }
    // remote_branch and remote_obj are dropped here, releasing the borrow on repo

    // 3. Attempt pop stash
    match repo.stash_apply(0, None) {
        Ok(_) => {
            // Check for conflicts after apply
            let index = repo.index().map_err(|e| e.to_string())?;
            if index.has_conflicts() {
                let mut conflicted_files = Vec::new();
                for entry in index.iter() {
                    if (entry.flags & 0x3000) >> 12 != 0 {
                        conflicted_files.push(String::from_utf8_lossy(&entry.path).to_string());
                    }
                }
                conflicted_files.sort();
                conflicted_files.dedup();
                return Ok(ForceCheckoutResult::StashConflict { files: conflicted_files });
            }
            
            // Clean apply, drop the stash
            let _ = repo.stash_drop(0); 
            Ok(ForceCheckoutResult::StashAndDone { stash_restored: true })
        },
        Err(e) => {
            Err(format!("Failed to apply stash: {}", e))
        }
    }
}

#[tauri::command]
pub fn restore_file_from_commit(repo_path: String, commit_oid: String, file_path: String) -> Result<(), String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    let oid = git2::Oid::from_str(&commit_oid).map_err(|e| e.to_string())?;
    let commit = repo.find_commit(oid).map_err(|e| e.to_string())?;
    let tree = commit.tree().map_err(|e| e.to_string())?;
    
    // Check if file exists in the commit's tree
    let entry = tree.get_path(Path::new(&file_path)).map_err(|_| {
        format!("File '{}' does not exist at commit {}", file_path, &commit_oid[..7])
    })?;
    
    let obj = entry.to_object(&repo).map_err(|e| e.to_string())?;
    let blob = obj.as_blob().ok_or("Object is not a blob")?;
    
    let full_path = Path::new(&repo_path).join(&file_path);
    
    // Ensure parent directories exist
    if let Some(parent) = full_path.parent() {
        if !parent.exists() {
            std::fs::create_dir_all(parent).map_err(|e| format!("Failed to create directories: {}", e))?;
        }
    }
    
    let mut content = blob.content().to_vec();
    
    // CRLF conversion for Windows if core.autocrlf is enabled
    #[cfg(target_os = "windows")]
    {
        let autocrlf = repo.config()
            .and_then(|c| c.get_bool("core.autocrlf"))
            .unwrap_or(false);
            
        // Basic heuristic: check if it's text (no null bytes in first 8KB)
        let is_binary = content.iter().take(8192).any(|&b| b == 0);
            
        if autocrlf && !is_binary {
            let mut new_content = Vec::with_capacity(content.len());
            let mut last_was_cr = false;
            for &b in &content {
                if b == b'\n' && !last_was_cr {
                    new_content.push(b'\r');
                }
                new_content.push(b);
                last_was_cr = b == b'\r';
            }
            content = new_content;
        }
    }
    
    std::fs::write(&full_path, content).map_err(|e| {
        if e.kind() == std::io::ErrorKind::PermissionDenied {
            "Cannot write file: it may be open in another application or locked.".to_string()
        } else {
            format!("Failed to write file: {}", e)
        }
    })?;
    
    Ok(())
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub enum ResetMode {
    Soft,
    Mixed,
    Hard,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct ResetResult {
    pub commits_rewound: usize,
}

#[tauri::command]
pub fn reset_to_commit(repo_path: String, commit_oid: String, mode: ResetMode) -> Result<ResetResult, String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    
    // 1. Initial checks
    if repo.state() != RepositoryState::Clean {
        return Err("Cannot reset: repository is in a busy state (merge/cherry-pick/rebase).".to_string());
    }
    
    if repo.head_detached().unwrap_or(false) {
        return Err("Cannot reset branch in detached HEAD state.".to_string());
    }

    let target_oid = git2::Oid::from_str(&commit_oid).map_err(|e| e.to_string())?;
    let target_obj = repo.find_object(target_oid, None).map_err(|e| e.to_string())?;
    
    // 2. Single-pass Reachability & Distance Check
    let head = repo.head().map_err(|e| e.to_string())?.peel_to_commit().map_err(|e| e.to_string())?;
    let mut revwalk = repo.revwalk().map_err(|e| e.to_string())?;
    revwalk.push(head.id()).map_err(|e| e.to_string())?;
    
    let mut reachable = false;
    let mut commits_rewound = 0;
    
    for oid_res in revwalk {
        let oid = oid_res.map_err(|e| e.to_string())?;
        if oid == target_oid {
            reachable = true;
            break;
        }
        commits_rewound += 1;
    }
    
    if !reachable {
        // If not reachable from HEAD, we can't easily count "rewind" distance.
        // But we should still allow the reset.
        commits_rewound = 0;
    }

    // 3. Execute reset
    let reset_type = match mode {
        ResetMode::Soft => git2::ResetType::Soft,
        ResetMode::Mixed => git2::ResetType::Mixed,
        ResetMode::Hard => git2::ResetType::Hard,
    };

    repo.reset(&target_obj, reset_type, None).map_err(|e| e.to_string())?;

    Ok(ResetResult { commits_rewound })
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(tag = "type")]
pub enum MergeResult {
    AlreadyUpToDate,
    FastForward { new_oid: String },
    MergeCommit { merge_oid: String },
    Conflict { conflicted_files: Vec<String> },
}

#[tauri::command]
pub fn merge_branch(repo_path: String, branch_name: String) -> Result<MergeResult, String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    
    // 1. Validate repo state
    let state = repo.state();
    if state != RepositoryState::Clean {
        return Err(format!("Cannot merge: repository is in a busy state ({:?}).", state));
    }

    // 2. Validate working tree is clean
    let mut opts = git2::StatusOptions::new();
    opts.include_untracked(false).include_ignored(false);
    if let Ok(statuses) = repo.statuses(Some(&mut opts)) {
        let has_changes = statuses.iter().any(|e| !e.status().is_empty());
        if has_changes {
            return Err("Working tree has uncommitted changes. Please commit or stash before merging.".to_string());
        }
    }

    // 3. Resolve target branch OID
    let target_oid = if let Ok(branch) = repo.find_branch(&branch_name, git2::BranchType::Local) {
        branch.get().target().ok_or("Branch has no target")?
    } else if let Ok(branch) = repo.find_branch(&branch_name, git2::BranchType::Remote) {
        branch.get().target().ok_or("Remote branch has no target")?
    } else if let Ok(obj) = repo.revparse_single(&branch_name) {
        obj.id()
    } else {
        return Err(format!("Branch '{}' not found.", branch_name));
    };

    // 4. Get HEAD
    let head = repo.head().map_err(|e| e.to_string())?;
    let head_oid = head.target().ok_or("HEAD has no target")?;

    // 5. Already up-to-date check
    if head_oid == target_oid {
        return Ok(MergeResult::AlreadyUpToDate);
    }

    let merge_base = repo.merge_base(head_oid, target_oid).map_err(|e| e.to_string())?;
    if merge_base == target_oid {
        return Ok(MergeResult::AlreadyUpToDate);
    }

    // 6. Execute merge via CLI (safer for merge commit creation)
    let output = Command::new("git")
        .args(["-C", &repo_path, "merge", &branch_name, "--no-edit"])
        .output()
        .map_err(|e| format!("Failed to execute git merge: {}", e))?;

    if output.status.success() {
        // Determine if it was a fast-forward or merge commit
        let new_head = repo.head()
            .ok()
            .and_then(|h| h.target())
            .map(|o| o.to_string())
            .unwrap_or_default();

        if merge_base == head_oid {
            // Was fast-forward
            Ok(MergeResult::FastForward { new_oid: new_head })
        } else {
            Ok(MergeResult::MergeCommit { merge_oid: new_head })
        }
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        
        // Check if it's a conflict
        if stderr.contains("CONFLICT") || stderr.contains("Automatic merge failed") {
            let index = repo.index().map_err(|e| e.to_string())?;
            let mut conflicted_files = Vec::new();
            
            let mut seen = std::collections::HashSet::new();
            for entry in index.iter() {
                let stage = entry.flags >> 12 & 3;
                if stage > 0 {
                    let path = String::from_utf8_lossy(&entry.path).to_string();
                    if seen.insert(path.clone()) {
                        conflicted_files.push(path);
                    }
                }
            }

            Ok(MergeResult::Conflict { conflicted_files })
        } else {
            Err(format!("Merge failed: {}", stderr.trim()))
        }
    }
}

#[tauri::command]
pub fn merge_abort(repo_path: String) -> Result<(), String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    
    // git merge --abort is essentially cleanup + hard reset to HEAD
    repo.cleanup_state().map_err(|e| e.to_string())?;
    let head = repo.head().map_err(|e| e.to_string())?.peel(git2::ObjectType::Commit).map_err(|e| e.to_string())?;
    repo.reset(&head, git2::ResetType::Hard, None).map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
pub fn merge_continue(repo_path: String) -> Result<(), String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    
    // Read the merge message
    let merge_msg_path = repo.path().join("MERGE_MSG");
    let message = if merge_msg_path.exists() {
        std::fs::read_to_string(merge_msg_path).map_err(|e| e.to_string())?
    } else {
        "Merge branch".to_string()
    };

    // We can't easily use git2 for "merge --continue" because it requires specific index state.
    // However, since we've already resolved conflicts (in theory), we can just commit.
    // But using the CLI is safer to ensure all git merge state is cleaned up correctly.
    let output = Command::new("git")
        .args(["-C", &repo_path, "commit", "-m", &message, "--no-edit"])
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    Ok(())
}

#[tauri::command]
pub fn rebase_abort(repo_path: String) -> Result<(), String> {
    let output = Command::new("git")
        .args(["-C", &repo_path, "rebase", "--abort"])
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    Ok(())
}

#[tauri::command]
pub fn rebase_continue(repo_path: String) -> Result<(), String> {
    // Setting GIT_EDITOR=true ensures the CLI doesn't hang if it wants to prompt for a message
    let output = Command::new("git")
        .args(["-C", &repo_path, "rebase", "--continue"])
        .env("GIT_EDITOR", "true")
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        if stderr.contains("no changes added to commit") || stderr.contains("did you forget to 'git add'?") {
             // In some cases rebase --continue fails if there are no changes, 
             // but usually we want to --skip in that case. 
             // For now, return the error so the user knows.
             return Err(stderr);
        }
        return Err(stderr);
    }

    Ok(())
}

#[tauri::command]
pub fn get_repo_state(repo_path: String) -> Result<String, String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    let state = match repo.state() {
        RepositoryState::Clean => "clean",
        RepositoryState::Merge => "merge",
        RepositoryState::CherryPick | RepositoryState::CherryPickSequence => "cherry_pick",
        RepositoryState::Rebase | RepositoryState::RebaseInteractive | 
        RepositoryState::RebaseMerge => "rebase",
        _ => "other",
    };
    Ok(state.to_string())
}

