@echo off
setlocal enabledelayedexpansion
echo ========================================
echo  Git Helper - One Click Build
echo ========================================
echo.

REM ── Check Rust ──────────────────────────
echo [CHECK] Rust toolchain...
rustc --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Rust is not installed.
    echo Install from: https://rustup.rs
    echo Then re-run this script.
    pause
    exit /b 1
)
rustc --version
echo OK: Rust found.

REM ── Check Node.js ───────────────────────
echo [CHECK] Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed.
    echo Install from: https://nodejs.org
    pause
    exit /b 1
)
node --version
echo OK: Node.js found.

REM ── Check npm ───────────────────────────
call npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: npm not found. Reinstall Node.js.
    pause
    exit /b 1
)
echo OK: npm found.

echo.
echo ========================================
echo  Building...
echo ========================================
echo.

REM ── Install dependencies ────────────────
echo [1/3] Installing frontend dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ERROR: npm install failed.
    pause
    exit /b 1
)
echo OK: Dependencies installed.
echo.

REM ── Tauri Build ─────────────────────────
echo [2/3] Building Tauri app (this may take a few minutes)...
call npm run tauri build
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Tauri build failed.
    echo.
    echo Common causes:
    echo   - MSVC Build Tools not installed
    echo     Install from: https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio
    echo     Select workload: "Desktop development with C++"
    echo.
    echo   - WebView2 Runtime missing
    echo     Install from: https://developer.microsoft.com/en-us/microsoft-edge/webview2/
    echo.
    echo   - Rust target missing: run 'rustup target add x86_64-pc-windows-msvc'
    echo.
    pause
    exit /b 1
)

REM ── Done ────────────────────────────────
echo.
echo [3/3] Build complete!
echo.
echo Output:
echo   src-tauri\target\release\bundle\nsis\   (.exe installer)
echo   src-tauri\target\release\bundle\msi\    (.msi installer)
echo   src-tauri\target\release\               (.exe standalone)
echo.

REM Open output folder
start "" "src-tauri\target\release\bundle\nsis\"

pause
