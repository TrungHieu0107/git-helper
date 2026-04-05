# Tauri Rust API

| Command | Params | Return Type | Status |
|---|---|---|---|
| `open_repo_action` | `path: String` | `Result<String, String>` | Implemented |
| `get_status` | `repo_path: String` | `Result<Vec<FileStatus>, String>` | Implemented |
| `stage_file` | `repo_path: String, path: String` | `Result<(), String>` | Implemented |
| `unstage_file` | `repo_path: String, path: String` | `Result<(), String>` | Implemented |
| `stage_all` | `repo_path: String` | `Result<(), String>` | Implemented |
| `get_diff` | `repo_path: String, path: String, staged: bool` | `Result<String, String>` | Implemented |
| `create_commit` | `repo_path: String, message: String, amend: bool` | `Result<String, String>` | Implemented |
