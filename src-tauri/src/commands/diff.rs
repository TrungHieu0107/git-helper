use git2::{Repository, Signature};
use serde::Serialize;

#[derive(Serialize)]
pub struct CommitFileChange {
    pub path: String,
    pub old_path: Option<String>,
    pub status: String,  // "added", "modified", "deleted", "renamed"
}

#[derive(Serialize)]
pub struct CommitDetail {
    pub oid: String,
    pub short_oid: String,
    pub message: String,
    pub author: String,
    pub email: String,
    pub timestamp: i64,
    pub parent_oids: Vec<String>,
    pub parent_short_oids: Vec<String>,
    pub files: Vec<CommitFileChange>,
}

#[tauri::command]
pub fn get_commit_detail(repo_path: String, oid: String) -> Result<CommitDetail, String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.message().to_string())?;
    let obj = repo.revparse_single(&oid).map_err(|e| e.message().to_string())?;
    let commit = obj.peel_to_commit().map_err(|e| e.message().to_string())?;

    let tree = commit.tree().map_err(|e| e.message().to_string())?;

    // Get parent tree (if any) for diffing
    let parent_tree = commit.parent(0).ok().and_then(|p| p.tree().ok());

    let diff = repo.diff_tree_to_tree(parent_tree.as_ref(), Some(&tree), None)
        .map_err(|e| e.message().to_string())?;

    let mut files = Vec::new();
    for delta in diff.deltas() {
        let status = match delta.status() {
            git2::Delta::Added => "added",
            git2::Delta::Deleted => "deleted",
            git2::Delta::Modified => "modified",
            git2::Delta::Renamed => "renamed",
            git2::Delta::Copied => "copied",
            _ => "modified",
        };
        let path = delta.new_file().path()
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_default();
        let old_path = if delta.status() == git2::Delta::Renamed {
            delta.old_file().path().map(|p| p.to_string_lossy().to_string())
        } else {
            None
        };
        files.push(CommitFileChange { path, old_path, status: status.to_string() });
    }

    let parent_oids: Vec<String> = commit.parents().map(|p| p.id().to_string()).collect();
    let parent_short_oids: Vec<String> = commit.parents().map(|p| p.id().to_string()[..7].to_string()).collect();

    let author_sig = commit.author();
    let author_name = author_sig.name().unwrap_or("").to_string();
    let author_email = author_sig.email().unwrap_or("").to_string();

    Ok(CommitDetail {
        oid: commit.id().to_string(),
        short_oid: commit.id().to_string()[..7].to_string(),
        message: commit.message().unwrap_or("").to_string(),
        author: author_name,
        email: author_email,
        timestamp: commit.time().seconds(),
        parent_oids,
        parent_short_oids,
        files,
    })
}

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
    let repo = Repository::open(&repo_path).map_err(|e| e.message().to_string())?;
    
    let mut index = repo.index().map_err(|e| e.message().to_string())?;
    let oid = index.write_tree().map_err(|e| e.message().to_string())?;
    let tree = repo.find_tree(oid).map_err(|e| e.message().to_string())?;

    let signature = repo.signature().or_else(|_| Signature::now("GitKit User", "user@gitkit.app")).map_err(|e| e.message().to_string())?;

    let head = repo.head().ok();
    let parent_commit = head.as_ref().and_then(|h| h.peel_to_commit().ok());

    if amend {
        let parent = parent_commit.ok_or("No commit to amend")?;
        let parents = parent.parents().collect::<Vec<_>>();
        let commit_oid = repo.commit(Some("HEAD"), &signature, &signature, &message, &tree, &parents.iter().collect::<Vec<_>>()).map_err(|e| e.message().to_string())?;
        return Ok(commit_oid.to_string());
    }

    let parents: Vec<&git2::Commit> = match &parent_commit {
        Some(commit) => vec![commit],
        None => vec![],
    };

    let commit_oid = repo.commit(Some("HEAD"), &signature, &signature, &message, &tree, &parents).map_err(|e| e.message().to_string())?;
    
    Ok(commit_oid.to_string())
}
