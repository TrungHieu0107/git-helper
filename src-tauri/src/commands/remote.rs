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
