use git2::{Repository, Oid, Signature};

#[tauri::command]
pub fn get_diff(repo_path: String, path: String, staged: bool) -> Result<String, String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.message().to_string())?;
    
    let mut opts = git2::DiffOptions::new();
    opts.pathspec(path);

    let diff = if staged {
        let tree = match repo.head() {
            Ok(head) => Some(head.peel_to_tree().map_err(|e| e.message().to_string())?),
            Err(_) => None, // empty repo
        };
        let index = repo.index().map_err(|e| e.message().to_string())?;
        repo.diff_tree_to_index(tree.as_ref(), Some(&index), Some(&mut opts)).map_err(|e| e.message().to_string())?
    } else {
        // Unstaged diff
        repo.diff_index_to_workdir(None, Some(&mut opts)).map_err(|e| e.message().to_string())?
    };

    let mut result = String::new();
    diff.print(git2::DiffFormat::Patch, |_delta, _hunk, line| {
        let origin = line.origin();
        if origin == '+' || origin == '-' || origin == ' ' {
            result.push(origin);
        }
        if let Ok(content) = std::str::from_utf8(line.content()) {
            result.push_str(content);
        }
        true
    }).map_err(|e| e.message().to_string())?;
    
    Ok(result)
}

#[tauri::command]
pub fn create_commit(repo_path: String, message: String, amend: bool) -> Result<String, String> {
    if amend {
        return Err("Amend not implemented yet".to_string());
    }

    let repo = Repository::open(&repo_path).map_err(|e| e.message().to_string())?;
    
    let mut index = repo.index().map_err(|e| e.message().to_string())?;
    let oid = index.write_tree().map_err(|e| e.message().to_string())?;
    let tree = repo.find_tree(oid).map_err(|e| e.message().to_string())?;

    let signature = repo.signature().or_else(|_| Signature::now("GitKit User", "user@gitkit.app")).map_err(|e| e.message().to_string())?;

    let parent_commit = match repo.head() {
        Ok(head) => Some(head.peel_to_commit().map_err(|e| e.message().to_string())?),
        Err(_) => None,
    };

    let parents: Vec<&git2::Commit> = match &parent_commit {
        Some(commit) => vec![commit],
        None => vec![],
    };

    let commit_oid = repo.commit(Some("HEAD"), &signature, &signature, &message, &tree, &parents).map_err(|e| e.message().to_string())?;
    
    Ok(commit_oid.to_string())
}
