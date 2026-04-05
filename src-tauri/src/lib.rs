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
            commands::repo::checkout_branch,
            commands::repo::create_branch,
            commands::repo::undo_last_commit,
            commands::repo::open_terminal,
            commands::status::get_status,
            commands::status::get_repo_status,
            commands::status::stage_file,
            commands::status::unstage_file,
            commands::status::stage_all,
            commands::status::unstage_all,
            commands::status::discard_all,
            commands::diff::get_diff,
            commands::diff::create_commit,
            commands::diff::get_commit_detail,
            commands::diff::get_file_contents,
            commands::stubs::list_branches,
            commands::stubs::list_stashes,
            commands::stubs::create_stash,
            commands::stubs::pop_stash,
            commands::stubs::drop_stash,
            commands::remote::fetch_remote,
            commands::remote::pull_remote,
            commands::remote::push_remote,
            commands::log::get_log,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
