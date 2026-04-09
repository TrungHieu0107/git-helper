use serde::Serialize;
use git2::{Repository, BranchType};

#[derive(Serialize)]
pub struct BranchInfo {
    pub name: String,
    pub branch_type: String,
    pub is_head: bool,
    pub upstream: Option<String>,
    pub ahead: usize,
    pub behind: usize,
    pub last_commit_oid: String,
    pub last_commit_message: String,
    pub last_commit_timestamp: i64,
}

#[tauri::command]
pub fn list_branches(repo_path: String) -> Result<Vec<BranchInfo>, String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    let mut branches = Vec::new();

    if let Ok(branch_iter) = repo.branches(None) {
        for branch_res in branch_iter {
            if let Ok((branch, b_type)) = branch_res {
                let name = branch.name().ok().flatten().unwrap_or("unknown").to_string();
                let is_head = branch.is_head();
                let b_type_str = match b_type {
                    BranchType::Local => "local",
                    BranchType::Remote => "remote",
                }.to_string();

                let mut ahead = 0;
                let mut behind = 0;
                let mut upstream_name = None;

                if b_type == BranchType::Local {
                    if let Ok(upstream) = branch.upstream() {
                        upstream_name = upstream.name().ok().flatten().map(|s| s.to_string());
                        
                        if let (Some(local_oid), Some(upstream_oid)) = (branch.get().target(), upstream.get().target()) {
                            if let Ok((a, b)) = repo.graph_ahead_behind(local_oid, upstream_oid) {
                                ahead = a;
                                behind = b;
                            }
                        }
                    }
                }

                let mut last_commit_oid = String::new();
                let mut last_commit_message = String::new();
                let mut last_commit_timestamp = 0;

                if let Ok(commit) = branch.get().peel_to_commit() {
                    last_commit_oid = commit.id().to_string();
                    last_commit_message = commit.summary().unwrap_or("").to_string();
                    last_commit_timestamp = commit.time().seconds();
                }

                branches.push(BranchInfo {
                    name,
                    branch_type: b_type_str,
                    is_head,
                    upstream: upstream_name,
                    ahead,
                    behind,
                    last_commit_oid,
                    last_commit_message,
                    last_commit_timestamp,
                });
            }
        }
    }

    Ok(branches)
}
