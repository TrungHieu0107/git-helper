use serde::Serialize;
use git2::{Repository, Signature};
use crate::git::encoding::{detect_and_decode, DetectionResult};

const MAX_FILE_SIZE: u64 = 5 * 1024 * 1024; // 5 MB

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

    let mut result_bytes = Vec::new();
    diff.print(git2::DiffFormat::Patch, |_delta, _hunk, line| {
        let origin = line.origin();
        if origin == '+' || origin == '-' || origin == ' ' {
            result_bytes.push(origin as u8);
        }
        result_bytes.extend_from_slice(line.content());
        true
    }).map_err(|e| e.message().to_string())?;
    
    let decoded = crate::git::encoding::detect_and_decode(&result_bytes, None);
    Ok(decoded.content)
}

#[derive(Serialize)]
pub struct CommitResult {
    pub oid: String,
    pub amended: bool,
}

#[tauri::command]
pub fn create_commit(repo_path: String, message: String, amend: bool) -> Result<CommitResult, String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.message().to_string())?;
    
    // Guard for detached HEAD
    if repo.head_detached().map_err(|e: git2::Error| e.to_string())? && amend {
        return Err("Cannot amend: HEAD is detached. Checkout a branch first.".to_string());
    }

    let mut index = repo.index().map_err(|e| e.message().to_string())?;
    let oid = index.write_tree().map_err(|e| e.message().to_string())?;
    let tree = repo.find_tree(oid).map_err(|e| e.message().to_string())?;

    let signature = repo.signature().or_else(|_| Signature::now("GitKit User", "user@gitkit.app")).map_err(|e| e.message().to_string())?;

    if amend {
        let head = repo.head().map_err(|_| "No commit to amend".to_string())?;
        let commit = head.peel_to_commit().map_err(|e| e.to_string())?;
        
        // Use commit.amend to preserve original author (author=None)
        let commit_oid = commit.amend(
            Some("HEAD"),
            None, // Preserve author
            Some(&signature), // Update committer
            None,
            Some(&message),
            Some(&tree),
        ).map_err(|e| e.message().to_string())?;

        return Ok(CommitResult {
            oid: commit_oid.to_string(),
            amended: true,
        });
    }

    let head = repo.head().ok();
    let parent_commit = head.as_ref().and_then(|h| h.peel_to_commit().ok());

    let parents: Vec<&git2::Commit> = match &parent_commit {
        Some(commit) => vec![commit],
        None => vec![],
    };

    let commit_oid = repo.commit(Some("HEAD"), &signature, &signature, &message, &tree, &parents).map_err(|e| e.message().to_string())?;
    
    Ok(CommitResult {
        oid: commit_oid.to_string(),
        amended: false,
    })
}

#[derive(Serialize)]
pub struct DecodedDiff {
    pub old_content: Option<String>,
    pub new_content: Option<String>,
    pub encoding: String,
    pub confidence: f32,
    pub had_bom: bool,
    pub is_binary: bool,
}

// Helpers removed in favor of crate::git::encoding

fn get_blob_bytes<'a>(repo: &'a Repository, tree: &git2::Tree<'a>, path: &str) -> Result<Option<Vec<u8>>, String> {
    let entry = match tree.get_path(std::path::Path::new(path)) {
        Ok(e) => e,
        Err(_) => return Ok(None),
    };
    let obj = entry.to_object(repo).map_err(|e| e.to_string())?;
    let blob = obj.as_blob().ok_or("Not a blob")?;
    
    if blob.size() as u64 > MAX_FILE_SIZE {
        return Err("FILE_TOO_LARGE".to_string());
    }
    
    Ok(Some(blob.content().to_vec()))
}

#[tauri::command]
pub fn get_file_contents(
    repo_path: String,
    path: String,
    commit_oid: Option<String>,
    staged: bool,
    force_encoding: Option<String>
) -> Result<DecodedDiff, String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.message().to_string())?;

    let mut old_bytes = None;
    let mut new_bytes = None;

    if let Some(oid_str) = commit_oid {
        let obj = repo.revparse_single(&oid_str).map_err(|e| e.message().to_string())?;
        let commit = obj.peel_to_commit().map_err(|e| e.message().to_string())?;
        let tree = commit.tree().map_err(|e| e.message().to_string())?;
        new_bytes = get_blob_bytes(&repo, &tree, &path)?;
        if let Ok(parent) = commit.parent(0) {
            if let Ok(parent_tree) = parent.tree() {
                old_bytes = get_blob_bytes(&repo, &parent_tree, &path)?;
            }
        }
    } else {
        let head_tree = repo.head().ok().and_then(|h| h.peel_to_tree().ok());
        let index = repo.index().map_err(|e| e.message().to_string())?;
        if staged {
            if let Some(tree) = head_tree {
                old_bytes = get_blob_bytes(&repo, &tree, &path)?;
            }
            if let Some(entry) = index.get_path(std::path::Path::new(&path), 0) {
                if let Ok(blob) = repo.find_blob(entry.id) {
                    if blob.size() as u64 > MAX_FILE_SIZE {
                        return Err("FILE_TOO_LARGE".to_string());
                    }
                    new_bytes = Some(blob.content().to_vec());
                }
            }
        } else {
            if let Some(entry) = index.get_path(std::path::Path::new(&path), 0) {
                if let Ok(blob) = repo.find_blob(entry.id) {
                    if blob.size() as u64 > MAX_FILE_SIZE {
                        return Err("FILE_TOO_LARGE".to_string());
                    }
                    old_bytes = Some(blob.content().to_vec());
                }
            }
            let full_file_path = std::path::Path::new(&repo_path).join(&path);
            let metadata = std::fs::metadata(&full_file_path).map_err(|e| e.to_string())?;
            if metadata.len() > MAX_FILE_SIZE {
                return Err("FILE_TOO_LARGE".to_string());
            }
            if let Ok(bytes) = std::fs::read(&full_file_path) {
                new_bytes = Some(bytes);
            }
        }
    }

    // Detect using the NEWest version (or old if new is missing)
    let detection_bytes = new_bytes.as_ref().or(old_bytes.as_ref());
    
    let result = if let Some(bytes) = detection_bytes {
        detect_and_decode(bytes, force_encoding.as_deref())
    } else {
        DetectionResult {
            content: String::new(),
            encoding: "UTF-8".to_string(),
            confidence: 1.0,
            had_bom: false,
            is_binary: false,
        }
    };

    // Use same encoding for other side
    let final_encoding = result.encoding.clone();
    
    let old_content = if result.is_binary { None } else {
        old_bytes.map(|b| detect_and_decode(&b, Some(&final_encoding)).content)
    };
    
    let new_content = if result.is_binary { None } else {
        new_bytes.map(|b| detect_and_decode(&b, Some(&final_encoding)).content)
    };

    Ok(DecodedDiff {
        old_content,
        new_content,
        encoding: result.encoding,
        confidence: result.confidence,
        had_bom: result.had_bom,
        is_binary: result.is_binary,
    })
}
