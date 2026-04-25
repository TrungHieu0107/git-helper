use std::sync::Mutex;
use std::collections::HashMap;
use git2::Oid;

pub mod commands;
pub mod git;

pub struct RefCache {
    pub repo_path: String,
    pub refs: HashMap<Oid, Vec<String>>,
}

#[derive(Default)]
pub struct GraphState {
    pub active_lanes: Vec<Option<Oid>>,
    pub color_assignments: HashMap<usize, usize>,
    pub next_color_idx: usize,
}

pub struct AppState {
    pub ref_cache: Mutex<Option<RefCache>>,
    pub graph_states: Mutex<HashMap<String, GraphState>>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState {
            ref_cache: Mutex::new(None),
            graph_states: Mutex::new(HashMap::new()),
        })
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            commands::repo::open_repo,
            commands::repo::get_recent_repos,
            commands::repo::remove_recent_repo,
            commands::repo::get_app_state,
            commands::repo::save_app_state,
            commands::repo::get_head_commit_info,
            commands::repo::checkout_branch,
            commands::repo::safe_checkout,
            commands::repo::create_branch,
            commands::repo::validate_branch_name,
            commands::repo::check_working_tree,
            commands::repo::undo_last_commit,
            commands::repo::open_terminal,
            commands::repo::open_file,
            commands::repo::reveal_file,
            commands::repo::discard_file_changes,
            commands::repo::force_checkout_from_origin,
            commands::repo::force_checkout_confirm_with_stash,
            commands::repo::restore_file_from_commit,
            commands::repo::reset_to_commit,
            commands::repo::merge_branch,
            commands::repo::merge_abort,
            commands::repo::merge_continue,
            commands::repo::get_repo_state,
            commands::repo::rebase_abort,
            commands::repo::rebase_continue,
            commands::status::get_status,
            commands::status::get_repo_status,
            commands::status::get_conflict_context,
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
            commands::remote::list_remotes,
            commands::remote::fetch_remote,
            commands::remote::fetch_all_remotes,
            commands::remote::pull_remote,
            commands::remote::push_remote,
            commands::remote::push_current_branch,
            commands::remote::push_branch_to_remote,
            commands::remote::list_remote_branches,
            commands::log::get_log,
            commands::log::get_file_log,
            commands::cherry_pick::get_cherry_pick_state,
            commands::cherry_pick::cherry_pick_abort,
            commands::cherry_pick::cherry_pick_commit,
            commands::cherry_pick::cherry_pick_continue,
            commands::cherry_pick::get_conflict_diff,
            commands::cherry_pick::resolve_conflict_file,
            commands::config::save_config_value,
            commands::config::get_config_value,
            commands::config::reset_config,
            commands::config::init_config_defaults,
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
