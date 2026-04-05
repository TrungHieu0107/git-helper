pub mod commands;
pub mod git;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            commands::repo::open_repo,
            commands::repo::get_recent_repos,
            commands::repo::remove_recent_repo,
            commands::status::get_status,
            commands::status::get_repo_status,
            commands::status::stage_file,
            commands::status::unstage_file,
            commands::status::stage_all,
            commands::diff::get_diff,
            commands::diff::create_commit,
            commands::stubs::list_branches,
            commands::stubs::list_stashes,
            commands::log::get_log,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
