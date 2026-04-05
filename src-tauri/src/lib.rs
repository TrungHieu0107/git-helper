pub mod commands;
pub mod git;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            commands::repo::open_repo_action,
            commands::status::get_status,
            commands::status::stage_file,
            commands::status::unstage_file,
            commands::status::stage_all,
            commands::diff::get_diff,
            commands::diff::create_commit
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
