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
            commands::repo::get_app_state,
            commands::repo::save_app_state,
            commands::repo::checkout_branch,
            commands::repo::safe_checkout,
            commands::repo::create_branch,
            commands::repo::validate_branch_name,
            commands::repo::check_working_tree,
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
            commands::branch::list_branches,
            commands::stash::list_stashes,
            commands::stash::create_stash,
            commands::stash::check_stash_preconditions,
            commands::stash::apply_stash,
            commands::stash::pop_stash,
            commands::stash::drop_stash,
            commands::stash::stash_save_advanced,
            commands::remote::fetch_remote,
            commands::remote::fetch_all_remotes,
            commands::remote::pull_remote,
            commands::remote::push_remote,
            commands::remote::push_branch_to_remote,
            commands::remote::list_remote_branches,
            commands::log::get_log,
            commands::cherry_pick::get_cherry_pick_state,
            commands::cherry_pick::cherry_pick_abort,
            commands::cherry_pick::cherry_pick_commit,
            commands::cherry_pick::cherry_pick_continue,
            commands::cherry_pick::get_conflict_diff,
            commands::cherry_pick::resolve_conflict_file,
        ])
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Focused(focused) = event {
                if *focused {
                    let _ = tauri::Emitter::emit(window, "focus-changed", ());
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
