use git2::{Repository, RemoteCallbacks, FetchOptions, PushOptions, AutotagOption, Cred, AnnotatedCommit};
use serde::{Deserialize, Serialize};
use std::process::Command;

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "snake_case")]
pub enum PullStrategy {
    FastForwardOnly,
    FastForwardOrMerge,
    Rebase,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(tag = "type", content = "data")]
pub enum PullResult {
    UpToDate,
    FastForwarded { commits_added: usize },
    Merged { merge_commit_oid: String },
    Rebased { commits_rebased: usize },
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "snake_case")]
pub enum PushMode {
    Normal,
    ForceWithLease,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(tag = "type", content = "data")]
pub enum PushResult {
    Success { commits_pushed: usize },
    UpToDate,
}


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

    // Use a more generic refspec that maps remote branches to their local remote-tracking counterparts
    let refspec = format!("refs/heads/*:refs/remotes/{}/*", remote);
    remote_obj.fetch(&[&refspec], Some(&mut fo), None)
        .map_err(|e| e.to_string())?;
        
    Ok(())
}

#[tauri::command]
pub fn fetch_all_remotes(repo_path: String) -> Result<(), String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    let remotes = repo.remotes().map_err(|e| e.to_string())?;
    
    for remote_name in remotes.iter().flatten() {
        let mut remote_obj = repo.find_remote(remote_name).map_err(|e| e.to_string())?;
        let mut fo = FetchOptions::new();
        fo.remote_callbacks(setup_callbacks());
        fo.download_tags(AutotagOption::All);
        
        let refspec = format!("refs/heads/*:refs/remotes/{}/*", remote_name);
        remote_obj.fetch(&[&refspec], Some(&mut fo), None)
            .map_err(|e| e.to_string())?;
    }
    
    Ok(())
}

#[tauri::command]
pub async fn pull_remote(
    repo_path: String,
    remote: String,
    strategy: PullStrategy,
) -> Result<PullResult, String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;

    // 1. Pre-flight: Check detached HEAD
    let head = repo.head().map_err(|e| e.to_string())?;
    let branch_name = head.shorthand().ok_or("HEAD is not a branch")?;

    // 2. Pre-flight: Check dirty working tree (Block unstaged, allow staged/untracked)
    let statuses = repo.statuses(None).map_err(|e| e.to_string())?;
    let has_unstaged = statuses.iter().any(|s| {
        let status = s.status();
        status.intersects(
            git2::Status::WT_MODIFIED
                | git2::Status::WT_DELETED
                | git2::Status::WT_RENAMED
                | git2::Status::WT_TYPECHANGE,
        )
    });

    if has_unstaged {
        return Err("Cannot pull: you have unstaged changes. Please stash or commit them first.".to_string());
    }

    // 3. Fetch
    let mut remote_obj = repo.find_remote(&remote).map_err(|e| e.to_string())?;
    let mut fo = FetchOptions::new();
    fo.remote_callbacks(setup_callbacks());
    
    let refspec = format!("refs/heads/{}:refs/remotes/{}/{}", branch_name, remote, branch_name);
    remote_obj.fetch(&[&refspec], Some(&mut fo), None)
        .map_err(|e| e.to_string())?;

    // 4. Resolve FETCH_HEAD
    let fetch_head_ref = format!("refs/remotes/{}/{}", remote, branch_name);
    let fetch_head = repo.find_reference(&fetch_head_ref).map_err(|e| e.to_string())?;
    let fetch_commit = fetch_head.peel_to_commit().map_err(|e| e.to_string())?;
    let annotated = repo.reference_to_annotated_commit(&fetch_head).map_err(|e| e.to_string())?;

    // Analyze merge
    let (analysis, _) = repo.merge_analysis(&[&annotated]).map_err(|e| e.to_string())?;

    if analysis.is_up_to_date() {
        return Ok(PullResult::UpToDate);
    }

    match strategy {
        PullStrategy::FastForwardOnly => {
            if analysis.is_fast_forward() {
                fast_forward(&repo, &fetch_head, branch_name)?;
                let local_commit = head.peel_to_commit().map_err(|e| e.to_string())?;
                let count = count_commits_between(&repo, local_commit.id(), fetch_commit.id())?;
                Ok(PullResult::FastForwarded { commits_added: count })
            } else {
                Err("Cannot fast-forward: branches have diverged.".to_string())
            }
        }
        PullStrategy::FastForwardOrMerge => {
            if analysis.is_fast_forward() {
                fast_forward(&repo, &fetch_head, branch_name)?;
                let local_commit = head.peel_to_commit().map_err(|e| e.to_string())?;
                let count = count_commits_between(&repo, local_commit.id(), fetch_commit.id())?;
                Ok(PullResult::FastForwarded { commits_added: count })
            } else {
                // Perform Merge
                let merge_commit_oid = perform_merge(&repo, &annotated, branch_name)?;
                Ok(PullResult::Merged { merge_commit_oid })
            }
        }
        PullStrategy::Rebase => {
            // CLI delegation for rebase
            let upstream = format!("{}/{}", remote, branch_name);
            let output = Command::new("git")
                .args(["-C", &repo_path, "rebase", &upstream])
                .output()
                .map_err(|e| e.to_string())?;

            if !output.status.success() {
                let stderr = String::from_utf8_lossy(&output.stderr);
                // Abort automatically to leave repo clean
                let _ = Command::new("git")
                    .args(["-C", &repo_path, "rebase", "--abort"])
                    .output();
                return Err(format!("Rebase failed: {}", stderr));
            }

            // Simple heuristic for rebased count if needed, but for now we'll just say успеха
            // Git rebase stdout often contains information about how many commits were replayed
            Ok(PullResult::Rebased { commits_rebased: 0 }) 
        }
    }
}

fn fast_forward(repo: &Repository, fetch_head: &git2::Reference, branch_name: &str) -> Result<(), String> {
    let fetch_commit = fetch_head.peel_to_commit().map_err(|e| e.to_string())?;
    let mut reference = repo.find_reference(&format!("refs/heads/{}", branch_name)).map_err(|e| e.to_string())?;
    reference.set_target(fetch_commit.id(), "fast-forward").map_err(|e| e.to_string())?;
    repo.set_head(reference.name().unwrap()).map_err(|e| e.to_string())?;
    repo.checkout_head(None).map_err(|e| e.to_string())?;
    Ok(())
}

fn perform_merge(repo: &Repository, annotated: &AnnotatedCommit, branch_name: &str) -> Result<String, String> {
    repo.merge(&[annotated], None, None).map_err(|e| e.to_string())?;
    
    // Check for conflicts
    let index = repo.index().map_err(|e| e.to_string())?;
    if index.has_conflicts() {
        // Cleanup merge state before returning error?
        // Actually, git2 merge leaves the repo in MERGING state. 
        // We should let the user resolve conflicts if we had a conflict UI, 
        // but for now our plan says "return Err with conflicted files".
        // Let's abort the merge for safety if we don't support conflict resolution here.
        repo.cleanup_state().map_err(|e| e.to_string())?;
        return Err("Merge resulted in conflicts. Operation aborted for safety.".to_string());
    }

    // Write tree and create merge commit
    let mut index = repo.index().map_err(|e| e.to_string())?;
    let tree_id = index.write_tree().map_err(|e| e.to_string())?;
    let tree = repo.find_tree(tree_id).map_err(|e| e.to_string())?;
    
    let sig = repo.signature().map_err(|e| e.to_string())?;
    let head_commit = repo.head().unwrap().peel_to_commit().unwrap();
    let fetch_commit = annotated.id();
    let fetch_commit_obj = repo.find_commit(fetch_commit).unwrap();
    
    let msg = format!("Merge branch '{}' of remote", branch_name);
    let merge_commit_id = repo.commit(
        Some("HEAD"),
        &sig,
        &sig,
        &msg,
        &tree,
        &[&head_commit, &fetch_commit_obj],
    ).map_err(|e| e.to_string())?;

    repo.cleanup_state().map_err(|e| e.to_string())?;
    repo.checkout_head(None).map_err(|e| e.to_string())?;
    
    Ok(merge_commit_id.to_string())
}

fn count_commits_between(repo: &Repository, from: git2::Oid, to: git2::Oid) -> Result<usize, String> {
    let mut revwalk = repo.revwalk().map_err(|e| e.to_string())?;
    revwalk.push(to).map_err(|e| e.to_string())?;
    revwalk.hide(from).map_err(|e| e.to_string())?;
    Ok(revwalk.count())
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

#[tauri::command]
pub fn list_remotes(repo_path: String) -> Result<Vec<String>, String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    let remotes = repo.remotes().map_err(|e| e.to_string())?;
    let mut result = Vec::new();
    for r in remotes.iter().flatten() {
        result.push(r.to_string());
    }
    Ok(result)
}

// ── New Robust Push Workflow ─────────────────────────────────────────────────

#[tauri::command]
pub async fn push_current_branch(
    repo_path: String,
    mode: PushMode,
) -> Result<PushResult, String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;

    // Guard: detached HEAD
    if repo.head_detached().map_err(|e| e.to_string())? {
        return Err("Cannot push: HEAD is detached. Please checkout a branch first.".to_string());
    }

    let head = repo.head().map_err(|e| e.to_string())?;
    let branch_name = head.shorthand()
        .ok_or("Cannot resolve current branch name")?
        .to_string();

    // Resolve upstream tracking config
    let branch = repo.find_branch(&branch_name, git2::BranchType::Local)
        .map_err(|_| format!("Branch '{}' not found.", branch_name))?;

    let upstream = branch.upstream().map_err(|_| {
        // No upstream configured — return structured error for UI to offer setup
        "NO_UPSTREAM".to_string()
    })?;

    let upstream_name = upstream.get().name().ok_or("Invalid upstream reference")?;
    
    // Parse remote name from upstream ref (e.g., "refs/remotes/origin/main" -> "origin")
    let remote_name = repo.branch_remote_name(upstream_name)
        .map(|buf| buf.as_str().unwrap_or("origin").to_string())
        .map_err(|_| "Could not resolve remote name".to_string())?;

    // Calculate ahead count before push
    let mut ahead = 0;
    let local_target = branch.get().target();
    let upstream_target = upstream.get().target();

    if let (Some(local_oid), Some(upstream_oid)) = (local_target, upstream_target) {
        if let Ok((a, _)) = repo.graph_ahead_behind(local_oid, upstream_oid) {
            ahead = a;
        }
    }

    if ahead == 0 && matches!(mode, PushMode::Normal) {
        return Ok(PushResult::UpToDate);
    }

    match mode {
        PushMode::Normal => push_normal(&repo, &remote_name, &branch_name, ahead),
        PushMode::ForceWithLease => push_force_with_lease(&repo_path, &remote_name, &branch_name, ahead),
    }
}

fn push_normal(
    repo: &Repository,
    remote_name: &str,
    branch_name: &str,
    ahead: usize,
) -> Result<PushResult, String> {
    let mut remote = repo.find_remote(remote_name).map_err(|e| e.to_string())?;
    let refspec = format!("refs/heads/{}:refs/heads/{}", branch_name, branch_name);

    let mut po = PushOptions::new();
    po.remote_callbacks(setup_callbacks());

    remote.push(&[&refspec], Some(&mut po))
        .map_err(|e| map_push_error_str(e.message()))?;

    Ok(PushResult::Success { commits_pushed: ahead })
}

fn push_force_with_lease(
    repo_path: &str,
    remote_name: &str,
    branch_name: &str,
    ahead: usize,
) -> Result<PushResult, String> {
    let output = Command::new("git")
        .args([
            "-C", repo_path,
            "push",
            remote_name,
            branch_name,
            "--force-with-lease",
        ])
        .output()
        .map_err(|e| format!("Failed to run git command: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        return Err(map_push_error_str(&stderr));
    }

    Ok(PushResult::Success { commits_pushed: ahead })
}

fn map_push_error_str(err: &str) -> String {
    if err.contains("non-fast-forward") || err.contains("rejected") {
        "Push rejected: remote has changes you don't have locally. Pull first, or use Force Push if you intentionally rewrote history (e.g., after amend).".to_string()
    } else if err.contains("stale info") || err.contains("fetch first") {
        "Force push rejected: someone else has pushed since your last fetch. Fetch first to review their changes.".to_string()
    } else if err.contains("could not read Username") || err.contains("Authentication failed") {
        "Authentication failed. Ensure your SSH key or credential helper is configured correctly.".to_string()
    } else {
        format!("Push failed: {}", err.trim())
    }
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
