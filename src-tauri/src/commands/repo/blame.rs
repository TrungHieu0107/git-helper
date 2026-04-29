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
                let msg = format!("{}", e);
                let _ = window.emit("blame-event", BlameEvent::Error { message: msg });
                return;
            }
        };

        let stdout = child.stdout.take().expect("Failed to open stdout");
        let mut reader = BufReader::new(stdout).lines();
        
        let mut current_chunk: Vec<BlameLine> = Vec::new();
        let chunk_size = 500;

        // Blame incremental format parsing state
        let mut current_hash = String::new();
        let mut current_author = String::new();
        let mut current_mail = String::new();
        let mut current_time: i64 = 0;
        let mut current_summary = String::new();

        while let Ok(Some(line)) = reader.next_line().await {
            let line_string: String = line;
            let parts: Vec<&str> = line_string.splitn(2, ' ').collect::<Vec<&str>>();
            if parts.is_empty() { continue; }

            match parts[0] {
                "author" => current_author = parts.get(1).unwrap_or(&"").to_string(),
                "author-mail" => current_mail = parts.get(1).unwrap_or(&"").to_string(),
                "author-time" => current_time = parts.get(1).unwrap_or(&"0").parse::<i64>().unwrap_or(0),
                "summary" => current_summary = parts.get(1).unwrap_or(&"").to_string(),
                "filename" => {
                    // End of block
                }
                _ => {
                    let sub_parts: Vec<&str> = line_string.split_whitespace().collect::<Vec<&str>>();
                    if sub_parts.len() == 4 && sub_parts[0].len() == 40 {
                        current_hash = sub_parts[0].to_string();
                        let final_line: usize = sub_parts[2].parse().unwrap_or(0);
                        let count: usize = sub_parts[3].parse().unwrap_or(0);

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
                                let send_data = std::mem::take(&mut current_chunk);
                                let _ = window.emit("blame-event", BlameEvent::Chunk { 
                                    lines: send_data
                                });
                            }
                        }
                    }
                }
            }
        }

        if !current_chunk.is_empty() {
            let _ = window.emit("blame-event", BlameEvent::Chunk { lines: current_chunk });
        }

        let _ = window.emit("blame-event", BlameEvent::Complete);
    });

    Ok(())
}
