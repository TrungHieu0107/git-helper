use serde::{Deserialize, Serialize};
use std::process::Stdio;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;
use tauri::{Window, Emitter};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct BlameLine {
    pub line_number: usize,
    pub commit_id: String,
    pub author: String,
    pub author_mail: String,
    pub timestamp: i64,
    pub summary: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(tag = "type")]
pub enum BlameEvent {
    Chunk { lines: Vec<BlameLine> },
    Complete,
    Error { message: String },
}

#[tauri::command]
pub async fn start_git_blame(
    window: Window,
    repo_path: String,
    file_path: String,
) -> Result<(), String> {
    tokio::spawn(async move {
        let mut child = match Command::new("git")
            .current_dir(&repo_path)
            .args(&["blame", "--incremental", &file_path])
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn() 
        {
            Ok(c) => c,
            Err(e) => {
                let _ = window.emit("blame-event", BlameEvent::Error { message: e.to_string() });
                return;
            }
        };

        let stdout = child.stdout.take().expect("Failed to open stdout");
        let mut reader = BufReader::new(stdout).lines();
        
        let mut current_chunk = Vec::new();
        let chunk_size = 500;

        // Blame incremental format parsing state
        let mut current_hash = String::new();
        let mut current_author = String::new();
        let mut current_mail = String::new();
        let mut current_time = 0;
        let mut current_summary = String::new();

        while let Ok(Some(line)) = reader.next_line().await {
            let parts: Vec<&str> = line.splitn(2, ' ').collect();
            if parts.is_empty() { continue; }

            match parts[0] {
                "author" => current_author = parts.get(1).unwrap_or(&"").to_string(),
                "author-mail" => current_mail = parts.get(1).unwrap_or(&"").to_string(),
                "author-time" => current_time = parts.get(1).unwrap_or(&"0").parse().unwrap_or(0),
                "summary" => current_summary = parts.get(1).unwrap_or(&"").to_string(),
                "filename" => {
                    // This signals the end of a block for a specific range of lines
                    // But in incremental format, the first line of a block has the hash and line counts
                }
                _ => {
                    // Check if it's the start of a new block: <hash> <orig_line> <final_line> <count>
                    let sub_parts: Vec<&str> = line.split_whitespace().collect();
                    if sub_parts.len() == 4 && sub_parts[0].len() == 40 {
                        current_hash = sub_parts[0].to_string();
                        let final_line: usize = sub_parts[2].parse().unwrap_or(0);
                        let count: usize = sub_parts[3].parse().unwrap_or(0);

                        // If we have line info, we can create the entries
                        // Note: incremental blame gives us details once per commit, then references it
                        // For simplicity in this demo, we'll push the lines when we see the header
                        // (Real implementation would need to cache commit details)
                        
                        for i in 0..count {
                            current_chunk.push(BlameLine {
                                line_number: final_line + i,
                                commit_id: current_hash.clone(),
                                author: current_author.clone(),
                                author_mail: current_mail.clone(),
                                timestamp: current_time,
                                summary: current_summary.clone(),
                            });

                            if current_chunk.len() >= chunk_size {
                                let _ = window.emit("blame-event", BlameEvent::Chunk { 
                                    lines: std::mem::take(&mut current_chunk) 
                                });
                            }
                        }
                    }
                }
            }
        }

        // Send remaining data
        if !current_chunk.is_empty() {
            let _ = window.emit("blame-event", BlameEvent::Chunk { lines: current_chunk });
        }

        let _ = window.emit("blame-event", BlameEvent::Complete);
    });

    Ok(())
}
