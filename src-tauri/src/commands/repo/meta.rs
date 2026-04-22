use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};
use git2::Repository;

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

#[derive(Serialize, Deserialize, Clone)]
pub struct OpenTabData {
    pub path: String,
    pub name: String,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct AppStateData {
    pub tabs: Vec<OpenTabData>,
    pub active_tab: Option<String>,
    pub stash_mode: Option<String>,
    pub include_untracked: Option<bool>,
    #[serde(default = "default_pull_strategy")]
    pub pull_strategy: String,
    pub font_size: Option<i32>,
}

fn default_pull_strategy() -> String {
    "fast_forward_only".to_string()
}


fn get_app_state_file(app: &AppHandle) -> Result<PathBuf, String> {
    let mut path = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    fs::create_dir_all(&path).unwrap_or_default();
    path.push("app_state.json");
    Ok(path)
}

#[tauri::command]
pub fn get_app_state(app: tauri::AppHandle) -> Result<AppStateData, String> {
    let file_path = get_app_state_file(&app)?;
    if !file_path.exists() {
        return Ok(AppStateData {
            tabs: Vec::new(),
            active_tab: None,
            stash_mode: Some("all".to_string()),
            include_untracked: Some(false),
            pull_strategy: default_pull_strategy(),
            font_size: Some(13),
        });

    }
    let content = fs::read_to_string(file_path).map_err(|e| e.to_string())?;
    let state: AppStateData = serde_json::from_str(&content).unwrap_or(AppStateData {
        tabs: Vec::new(),
        active_tab: None,
        stash_mode: Some("all".to_string()),
        include_untracked: Some(false),
        pull_strategy: default_pull_strategy(),
        font_size: Some(13),
    });

    Ok(state)
}

#[tauri::command]
pub fn save_app_state(app: tauri::AppHandle, state: AppStateData) -> Result<(), String> {
    let file_path = get_app_state_file(&app)?;
    let content = serde_json::to_string_pretty(&state).map_err(|e| e.to_string())?;
    fs::write(file_path, content).map_err(|e| e.to_string())?;
    Ok(())
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

pub fn add_recent_repo(app: &AppHandle, path: &str, name: &str) -> Result<(), String> {
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
#[derive(Serialize)]
pub struct HeadCommitInfo {
    pub oid: String,
    pub message: String,
    pub author_name: String,
    pub author_email: String,
    pub author_timestamp: i64,
    pub is_pushed: bool,
}

#[tauri::command]
pub async fn get_head_commit_info(repo_path: String) -> Result<HeadCommitInfo, String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    
    // Guard for empty repository
    if repo.is_empty().map_err(|e| e.to_string())? {
        return Err("Cannot amend: no previous commit exists.".to_string());
    }

    let head = repo.head().map_err(|e| e.to_string())?;
    let commit = head.peel_to_commit().map_err(|e| e.to_string())?;
    
    let is_pushed = is_head_pushed(&repo, &head);
    let author = commit.author();

    Ok(HeadCommitInfo {
        oid: commit.id().to_string(),
        message: commit.message().unwrap_or("").to_string(),
        author_name: author.name().unwrap_or("").to_string(),
        author_email: author.email().unwrap_or("").to_string(),
        author_timestamp: author.when().seconds(),
        is_pushed,
    })
}

fn is_head_pushed(repo: &Repository, head: &git2::Reference) -> bool {
    if !head.is_branch() {
        return false;
    }

    let branch_name = match head.shorthand() {
        Some(name) => name,
        None => return false,
    };

    let branch = match repo.find_branch(branch_name, git2::BranchType::Local) {
        Ok(b) => b,
        Err(_) => return false,
    };

    let upstream = match branch.upstream() {
        Ok(u) => u,
        Err(_) => return false,
    };

    let local_oid = match head.target() {
        Some(oid) => oid,
        None => return false,
    };

    let upstream_oid = match upstream.get().target() {
        Some(oid) => oid,
        None => return false,
    };

    if let Ok((ahead, _)) = repo.graph_ahead_behind(local_oid, upstream_oid) {
        return ahead == 0;
    }

    false
}
