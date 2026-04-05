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
| `get_diff` | `repo_path: String, path: String, staged: bool` | `Result<String, String>` | Implemented |
| `create_commit` | `repo_path: String, message: String, amend: bool` | `Result<String, String>` | Implemented |
