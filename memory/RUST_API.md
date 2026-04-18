# Tauri Rust API

| Command | Params | Return Type | Status |
|---|---|---|---|
| `open_repo` | `path: String` | `Result<RepoInfo, String>` | Implemented |
| `get_recent_repos` | - | `Result<Vec<RecentRepo>, String>` | Implemented |
| `remove_recent_repo` | `path: String` | `Result<(), String>` | Implemented |
| `get_status` | `repo_path: String` | `Result<Vec<FileStatus>, String>` | Implemented |
| `get_repo_status` | `path: String` | `Result<RepoStatus, String>` | Implemented |
| `stage_file` | `repo_path: String, path: String` | `Result<(), String>` | Implemented |
| `unstage_file` | `repo_path: String, path: String` | `Result<(), String>` | Implemented |
| `stage_all` | `repo_path: String` | `Result<(), String>` | Implemented |
| `get_diff` | `repo_path, path, staged` | `Result<DiffResult, String>` | Planned Upgrade |
| `get_file_contents` | `repoPath, path, commitOid, forceEncoding` | `Result<DecodedDiff, String>` | Planned Upgrade |
| `create_commit` | `repo_path: String, message: String, amend: bool` | `Result<String, String>` | Implemented |
| `create_branch` | `repoPath: String, name: String, startPoint: Option<String>` | `Result<CreateBranchResult, String>` | Upgraded |
| `validate_branch_name`| `repoPath: String, name: String` | `Result<BranchValidation, String>` | Implemented |
| `check_working_tree` | `repoPath: String` | `Result<WorkingTreeCheck, String>` | Implemented |
| `push_branch_to_remote`| `repoPath, branchName, remote, setUpstream` | `Result<(), String>` | Implemented |
| `list_remote_branches`| `repoPath: String` | `Result<Vec<RemoteBranchInfo>, String>` | Implemented |
| `create_stash` | `repoPath: String, message: Option<String>` | `Result<(), String>` | Implemented |
| `pull_remote` | `repoPath, remote, strategy: PullStrategy` | `Result<PullResult, String>` | Upgraded |
| `save_app_state` | `state: AppStateData` | `Result<(), String>` | Implemented |
| `get_app_state` | - | `Result<AppStateData, String>` | Implemented |
| `reset_to_commit` | `repoPath: String, commitOid: String, mode: ResetMode` | `Result<ResetResult, String>` | Implemented |

