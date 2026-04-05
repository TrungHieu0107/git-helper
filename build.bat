@echo off
setlocal enabledelayedexpansion

echo ============================================
echo   Git Helper - Build Script (Windows x64)
echo ============================================
echo.

:: ── Step 1: Check Prerequisites ──
echo [1/4] Checking prerequisites...

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found. Install from https://nodejs.org
    exit /b 1
)
for /f "tokens=*" %%i in ('node -v') do echo       Node.js: %%i

where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] npm not found.
    exit /b 1
)
for /f "tokens=*" %%i in ('npm -v') do echo       npm:     %%i

where rustc >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Rust not found. Install from https://rustup.rs
    exit /b 1
)
for /f "tokens=*" %%i in ('rustc --version') do echo       Rust:    %%i

where cargo >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Cargo not found.
    exit /b 1
)

echo       All prerequisites OK.
echo.

:: ── Step 2: Install npm dependencies ──
echo [2/4] Installing npm dependencies...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] npm install failed.
    exit /b 1
)
echo       npm dependencies installed.
echo.

:: ── Step 3: Build with Tauri ──
echo [3/4] Building Tauri application (Release)...
echo       This may take a few minutes on first build...
echo.
call npx tauri build
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Tauri build failed. Check errors above.
    exit /b 1
)
echo.

:: ── Step 4: Show output ──
echo [4/4] Build complete!
echo.
echo ============================================
echo   Output files:
echo ============================================

set "BUNDLE_DIR=src-tauri\target\release\bundle"

if exist "%BUNDLE_DIR%\nsis\*.exe" (
    echo   [NSIS Installer]
    for %%f in (%BUNDLE_DIR%\nsis\*.exe) do echo     %%f
)

if exist "%BUNDLE_DIR%\msi\*.msi" (
    echo   [MSI Installer]
    for %%f in (%BUNDLE_DIR%\msi\*.msi) do echo     %%f
)

if exist "src-tauri\target\release\*.exe" (
    echo   [Standalone EXE]
    for %%f in (src-tauri\target\release\tauri-app.exe) do (
        if exist "%%f" echo     %%f
    )
)

echo.
echo ============================================
echo   Build finished successfully!
echo ============================================

endlocal
