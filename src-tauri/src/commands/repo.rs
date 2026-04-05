use git2::{Repository, StatusOptions};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};

#[derive(Serialize, Deserialize, Clone)]
pub struct RepoInfo {
    pub path: String,
    pub name: String,
    pub head_branch: String,
    pub head_oid: String,
    pub is_bare: bool,
    pub remotes: Vec<String>,
    pub state: String,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct RecentRepo {
    pub path: String,
    pub name: String,
    pub last_opened: i64,
}

fn get_recent_repos_file(app: &AppHandle) -> Result<PathBuf, String> {
    let mut path = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    fs::create_dir_all(&path).unwrap_or_default();
    path.push("recent_repos.json");
    Ok(path)
}

#[tauri::command]
pub fn get_recent_repos(app: tauri::AppHandle) -> Result<Vec<RecentRepo>, String> {
    let file_path = get_recent_repos_file(&app)?;
    if !file_path.exists() {
        return Ok(Vec::new());
    }
    let content = fs::read_to_string(file_path).map_err(|e| e.to_string())?;
    let mut repos: Vec<RecentRepo> = serde_json::from_str(&content).unwrap_or_default();
    repos.sort_by(|a, b| b.last_opened.cmp(&a.last_opened));
    repos.truncate(10);
    Ok(repos)
}

fn add_recent_repo(app: &AppHandle, path: &str, name: &str) -> Result<(), String> {
    let mut repos = get_recent_repos(app.clone()).unwrap_or_default();
    repos.retain(|r| r.path != path);
    repos.insert(
        0,
        RecentRepo {
            path: path.to_string(),
            name: name.to_string(),
            last_opened: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs() as i64,
        },
    );
    repos.truncate(10);
    
    let file_path = get_recent_repos_file(app)?;
    let content = serde_json::to_string_pretty(&repos).map_err(|e| e.to_string())?;
    fs::write(file_path, content).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn remove_recent_repo(app: tauri::AppHandle, path: String) -> Result<(), String> {
    let mut repos = get_recent_repos(app.clone()).unwrap_or_default();
    repos.retain(|r| r.path != path);
    let file_path = get_recent_repos_file(&app)?;
    let content = serde_json::to_string_pretty(&repos).map_err(|e| e.to_string())?;
    fs::write(file_path, content).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn open_repo(app: tauri::AppHandle, path: String) -> Result<RepoInfo, String> {
    let repo = match Repository::discover(&path) {
        Ok(r) => r,
        Err(_) => return Err("Not a git repository".to_string()),
    };

    let workdir = repo.workdir().map(|p| p.to_string_lossy().to_string()).unwrap_or(path.clone());
    let name = Path::new(&workdir)
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| "Unknown".to_string());
    
    let is_bare = repo.is_bare();
    
    let mut head_branch = "main".to_string();
    let mut head_oid = "".to_string();
    
    if let Ok(head) = repo.head() {
        if let Some(name) = head.shorthand() {
            head_branch = name.to_string();
        }
        if let Some(target) = head.target() {
            head_oid = target.to_string();
        }
    }
    
    let state = match repo.state() {
        git2::RepositoryState::ApplyMailbox => "am".to_string(),
        git2::RepositoryState::ApplyMailboxOrRebase => "am/rebase".to_string(),
        git2::RepositoryState::Bisect => "bisect".to_string(),
        git2::RepositoryState::CherryPick => "cherry-pick".to_string(),
        git2::RepositoryState::CherryPickSequence => "cherry-pick-seq".to_string(),
        git2::RepositoryState::Clean => "clean".to_string(),
        git2::RepositoryState::Merge => "merge".to_string(),
        git2::RepositoryState::Rebase => "rebase".to_string(),
        git2::RepositoryState::RebaseInteractive => "rebase-interactive".to_string(),
        git2::RepositoryState::RebaseMerge => "rebase-merge".to_string(),
        git2::RepositoryState::Revert => "revert".to_string(),
        git2::RepositoryState::RevertSequence => "revert-seq".to_string(),
    };
    
    let remotes = repo
        .remotes()
        .map(|r| r.iter().filter_map(|s| s.map(|s| s.to_string())).collect())
        .unwrap_or_default();
        
    let info = RepoInfo {
        path: workdir.clone(),
        name: name.clone(),
        head_branch,
        head_oid,
        is_bare,
        remotes,
        state,
    };
    
    let _ = add_recent_repo(&app, &workdir, &name);
    
    Ok(info)
}
