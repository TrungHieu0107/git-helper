use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ConfigEntry {
    pub key: String,
    pub current_value: String,
    pub default_value: String,
}

pub struct ConfigManager {
    db_path: PathBuf,
}

impl ConfigManager {
    pub fn new(app: &AppHandle) -> Result<Self, String> {
        let mut path = app
            .path()
            .app_data_dir()
            .map_err(|e| format!("Failed to get app data dir: {}", e))?;
        std::fs::create_dir_all(&path).unwrap_or_default();
        path.push("user_config.db");
        
        let manager = Self { db_path: path };
        manager.initialize()?;
        Ok(manager)
    }

    fn initialize(&self) -> Result<(), String> {
        let conn = Connection::open(&self.db_path).map_err(|e| e.to_string())?;
        conn.execute(
            "CREATE TABLE IF NOT EXISTS user_config (
                key TEXT PRIMARY KEY,
                current_value TEXT,
                default_value TEXT
            )",
            [],
        ).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn set_default(&self, key: &str, value: &str) -> Result<(), String> {
        let conn = Connection::open(&self.db_path).map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT INTO user_config (key, current_value, default_value) 
             VALUES (?1, ?2, ?2) 
             ON CONFLICT(key) DO UPDATE SET default_value = ?2",
            params![key, value],
        ).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn save_current(&self, key: &str, value: &str) -> Result<(), String> {
        let conn = Connection::open(&self.db_path).map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT INTO user_config (key, current_value, default_value) 
             VALUES (?1, ?2, ?2) 
             ON CONFLICT(key) DO UPDATE SET current_value = ?2",
            params![key, value],
        ).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn get_entry(&self, key: &str) -> Result<Option<ConfigEntry>, String> {
        let conn = Connection::open(&self.db_path).map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare("SELECT key, current_value, default_value FROM user_config WHERE key = ?1")
            .map_err(|e| e.to_string())?;
        
        let mut rows = stmt.query(params![key]).map_err(|e| e.to_string())?;
        if let Some(row) = rows.next().map_err(|e| e.to_string())? {
            Ok(Some(ConfigEntry {
                key: row.get(0).map_err(|e| e.to_string())?,
                current_value: row.get(1).map_err(|e| e.to_string())?,
                default_value: row.get(2).map_err(|e| e.to_string())?,
            }))
        } else {
            Ok(None)
        }
    }

    pub fn reset_to_default(&self, key: &str) -> Result<(), String> {
        let conn = Connection::open(&self.db_path).map_err(|e| e.to_string())?;
        conn.execute(
            "UPDATE user_config SET current_value = default_value WHERE key = ?1",
            params![key],
        ).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn reset_all(&self) -> Result<(), String> {
        let conn = Connection::open(&self.db_path).map_err(|e| e.to_string())?;
        conn.execute(
            "UPDATE user_config SET current_value = default_value",
            [],
        ).map_err(|e| e.to_string())?;
        Ok(())
    }
}

#[tauri::command]
pub async fn save_config_value(app: AppHandle, key: String, value: String) -> Result<(), String> {
    let manager = ConfigManager::new(&app)?;
    manager.save_current(&key, &value)
}

#[tauri::command]
pub async fn get_config_value(app: AppHandle, key: String) -> Result<Option<String>, String> {
    let manager = ConfigManager::new(&app)?;
    let entry = manager.get_entry(&key)?;
    Ok(entry.map(|e| e.current_value))
}

#[tauri::command]
pub async fn reset_config(app: AppHandle, key: Option<String>) -> Result<(), String> {
    let manager = ConfigManager::new(&app)?;
    if let Some(k) = key {
        manager.reset_to_default(&k)
    } else {
        manager.reset_all()
    }
}

#[tauri::command]
pub async fn init_config_defaults(app: AppHandle, defaults: std::collections::HashMap<String, String>) -> Result<(), String> {
    let manager = ConfigManager::new(&app)?;
    for (key, value) in defaults {
        manager.set_default(&key, &value)?;
    }
    Ok(())
}
