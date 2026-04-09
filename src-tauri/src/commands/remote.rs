use git2::{Repository, RemoteCallbacks, FetchOptions, PushOptions, AutotagOption, Cred};

fn setup_callbacks() -> RemoteCallbacks<'static> {
    let mut cb = RemoteCallbacks::new();
    cb.credentials(|url, username_from_url, allowed_types| {
        if allowed_types.contains(git2::CredentialType::SSH_KEY) {
            let user = username_from_url.unwrap_or("git");
            Cred::ssh_key_from_agent(user)
        } else if allowed_types.contains(git2::CredentialType::USER_PASS_PLAINTEXT) {
            let config = git2::Config::open_default().unwrap_or_else(|_| git2::Config::new().unwrap());
            Cred::credential_helper(&config, url, username_from_url)
        } else if allowed_types.contains(git2::CredentialType::DEFAULT) {
            Cred::default()
        } else {
            Err(git2::Error::from_str("no valid authentication available"))
        }
    });
    cb
}

#[tauri::command]
pub fn fetch_remote(repo_path: String, remote: String) -> Result<(), String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    let mut remote_obj = repo.find_remote(&remote).map_err(|e| e.to_string())?;
    
    let mut fo = FetchOptions::new();
    fo.remote_callbacks(setup_callbacks());
    fo.download_tags(AutotagOption::All);

    remote_obj.fetch(&["refs/heads/*:refs/remotes/origin/*"], Some(&mut fo), None)
        .map_err(|e| e.to_string())?;
        
    Ok(())
}

#[tauri::command]
pub fn pull_remote(repo_path: String, remote: String) -> Result<(), String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    let mut remote_obj = repo.find_remote(&remote).map_err(|e| e.to_string())?;
    
    let mut fo = FetchOptions::new();
    fo.remote_callbacks(setup_callbacks());
    
    // 1. Fetch
    let head = repo.head().map_err(|e| e.to_string())?;
    let branch_name = head.shorthand().ok_or("HEAD is not a branch")?;
    let refspec = format!("refs/heads/{}:refs/remotes/{}/{}", branch_name, remote, branch_name);
    
    remote_obj.fetch(&[&refspec], Some(&mut fo), None)
        .map_err(|e| e.to_string())?;

    // 2. Merge (Simplified: assuming FF for now, or just notify user)
    // Find the fetched commit
    let fetch_head = repo.find_reference(&format!("refs/remotes/{}/{}", remote, branch_name))
        .map_err(|e| e.to_string())?;
    let fetch_commit = fetch_head.peel_to_commit().map_err(|e| e.to_string())?;
    
    // Analyze merge
    let annotated = repo.reference_to_annotated_commit(&fetch_head)
        .map_err(|e| e.to_string())?;
    let (analysis, _) = repo.merge_analysis(&[&annotated])
        .map_err(|e| e.to_string())?;
        
    if analysis.is_fast_forward() {
        let mut reference = repo.find_reference(&format!("refs/heads/{}", branch_name)).map_err(|e| e.to_string())?;
        reference.set_target(fetch_commit.id(), "fast-forward").map_err(|e| e.to_string())?;
        repo.set_head(reference.name().unwrap()).map_err(|e| e.to_string())?;
        repo.checkout_head(None).map_err(|e| e.to_string())?;
    } else if analysis.is_up_to_date() {
        // Nothing to do
    } else {
        return Err("Merge is not fast-forward. Please handle manually in terminal for now.".to_string());
    }

    Ok(())
}

#[tauri::command]
pub fn push_remote(repo_path: String, remote: String) -> Result<(), String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    let mut remote_obj = repo.find_remote(&remote).map_err(|e| e.to_string())?;
    
    let mut po = PushOptions::new();
    po.remote_callbacks(setup_callbacks());
    
    let head = repo.head().map_err(|e| e.to_string())?;
    let branch_name = head.shorthand().ok_or("HEAD is not a branch")?;
    let refspec = format!("refs/heads/{}:refs/heads/{}", branch_name, branch_name);

    remote_obj.push(&[&refspec], Some(&mut po))
        .map_err(|e| e.to_string())?;
        
    Ok(())
}

// ── Push Specific Branch ─────────────────────────────────────────────────────

#[tauri::command]
pub fn push_branch_to_remote(
    repo_path: String,
    branch_name: String,
    remote: String,
    set_upstream: bool,
) -> Result<(), String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    let mut remote_obj = repo.find_remote(&remote).map_err(|e| e.to_string())?;

    let mut po = PushOptions::new();
    po.remote_callbacks(setup_callbacks());

    let refspec = format!("refs/heads/{}:refs/heads/{}", branch_name, branch_name);
    remote_obj.push(&[&refspec], Some(&mut po))
        .map_err(|e| e.to_string())?;

    // Set upstream tracking if requested
    if set_upstream {
        let mut branch = repo
            .find_branch(&branch_name, git2::BranchType::Local)
            .map_err(|e| e.to_string())?;
        let upstream_ref = format!("{}/{}", remote, branch_name);
        branch
            .set_upstream(Some(&upstream_ref))
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}

// ── List Remote Branches ─────────────────────────────────────────────────────

#[derive(serde::Serialize)]
pub struct RemoteBranchInfo {
    pub name: String,
    pub remote: String,
    pub oid: String,
}

#[tauri::command]
pub fn list_remote_branches(repo_path: String) -> Result<Vec<RemoteBranchInfo>, String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    let mut branches = Vec::new();

    if let Ok(iter) = repo.branches(Some(git2::BranchType::Remote)) {
        for branch_result in iter {
            if let Ok((branch, _)) = branch_result {
                let full_name = branch.name().ok().flatten().unwrap_or("").to_string();
                // Skip HEAD refs
                if full_name.ends_with("/HEAD") {
                    continue;
                }
                // Extract remote name and branch name (e.g. "origin/main" -> remote="origin", name="main")
                let parts: Vec<&str> = full_name.splitn(2, '/').collect();
                let (remote_name, branch_name) = if parts.len() == 2 {
                    (parts[0].to_string(), parts[1].to_string())
                } else {
                    ("origin".to_string(), full_name.clone())
                };

                let oid = branch
                    .get()
                    .target()
                    .map(|o| o.to_string())
                    .unwrap_or_default();

                branches.push(RemoteBranchInfo {
                    name: branch_name,
                    remote: remote_name,
                    oid,
                });
            }
        }
    }

    Ok(branches)
}
