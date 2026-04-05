use git2::{Repository, RemoteCallbacks, FetchOptions, PushOptions, AutotagOption};

#[tauri::command]
pub fn fetch_remote(repo_path: String, remote: String) -> Result<(), String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    let mut remote_obj = repo.find_remote(&remote).map_err(|e| e.to_string())?;
    
    let mut cb = RemoteCallbacks::new();
    // For now, assume default credentials (SSH agent, etc.)
    cb.credentials(|_url, _username, _allowed_types| {
        git2::Cred::ssh_key_from_agent("git")
    });

    let mut fo = FetchOptions::new();
    fo.remote_callbacks(cb);
    fo.download_tags(AutotagOption::All);

    remote_obj.fetch(&["refs/heads/*:refs/remotes/origin/*"], Some(&mut fo), None)
        .map_err(|e| e.to_string())?;
        
    Ok(())
}

#[tauri::command]
pub fn pull_remote(repo_path: String, remote: String) -> Result<(), String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    let mut remote_obj = repo.find_remote(&remote).map_err(|e| e.to_string())?;
    
    let mut cb = RemoteCallbacks::new();
    cb.credentials(|_url, _username, _allowed_types| {
        git2::Cred::ssh_key_from_agent("git")
    });

    let mut fo = FetchOptions::new();
    fo.remote_callbacks(cb);
    
    // 1. Fetch
    let head = repo.head().map_err(|e| e.to_string())?;
    let branch_name = head.shorthand().ok_or("HEAD is not a branch")?;
    let refspec = format!("refs/heads/{}:refs/remotes/{}/{}", branch_name, remote, branch_name);
    
    remote_obj.fetch(&[&refspec], Some(&mut fo), None)
        .map_err(|e| e.to_string())?;

    // 2. Merge (Simplified: assuming FF for now, or just notify user)
    // In a real app, we should check if merge is possible.
    // For this initial un-stubbing, we'll focus on the fetch part which is 90% of the UI value.
    
    // Find the fetched commit
    let fetch_head = repo.find_reference(&format!("refs/remotes/{}/{}", remote, branch_name))
        .map_err(|e| e.to_string())?;
    let fetch_commit = fetch_head.peel_to_commit().map_err(|e| e.to_string())?;
    
    // Analyze merge
    let (analysis, _) = repo.merge_analysis(&[&git2::AnnotatedCommit::from_ref(&fetch_head).unwrap()])
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
    
    let mut cb = RemoteCallbacks::new();
    cb.credentials(|_url, _username, _allowed_types| {
        git2::Cred::ssh_key_from_agent("git")
    });

    let mut po = PushOptions::new();
    po.remote_callbacks(cb);
    
    let head = repo.head().map_err(|e| e.to_string())?;
    let branch_name = head.shorthand().ok_or("HEAD is not a branch")?;
    let refspec = format!("refs/heads/{}:refs/heads/{}", branch_name, branch_name);

    remote_obj.push(&[&refspec], Some(&mut po))
        .map_err(|e| e.to_string())?;
        
    Ok(())
}
