---
name: windows-build
description: >
  Windows build prerequisites, build script, and troubleshooting for Tauri 2 apps.
  Use this skill for any task involving: building a .exe for Windows, writing or
  fixing build.bat, checking Rust/Node/MSVC/WebView2 prerequisites, understanding
  build output locations, or diagnosing common Tauri build errors on Windows.
triggers:
  - build
  - build.bat
  - windows build
  - exe
  - nsis
  - msi
  - msvc
  - webview2
  - rust target
  - linker error
  - tauri build
  - prerequisites
  - one click build
---

# SKILL: Windows Build Prerequisites for Tauri 2

## Overview
Before `npm run tauri build` can produce a `.exe`, the Windows machine must have
all prerequisites installed. This skill covers how to check and install each one,
and how to write a `build.bat` that verifies prerequisites before building.

---

## Required Prerequisites

| Tool | Required Version | Purpose |
|---|---|---|
| Rust toolchain | stable (latest) | Compile Rust backend |
| Node.js | >= 18 | Build frontend + Tauri CLI |
| MSVC Build Tools | VS 2019 or later | C++ linker for Rust on Windows |
| WebView2 Runtime | Any | Renders frontend (usually pre-installed Win10/11) |

---

## 1. Rust Toolchain

### Check
```bat
rustc --version
cargo --version
```

### Install
Download and run: https://rustup.rs
```bat
# Or via winget
winget install Rustlang.Rustup
```

After install, add Windows MSVC target:
```bat
rustup target add x86_64-pc-windows-msvc
```

Default toolchain should be `stable-x86_64-pc-windows-msvc`:
```bat
rustup default stable-x86_64-pc-windows-msvc
```

---

## 2. Node.js

### Check
```bat
node --version
npm --version
```

### Install
Download from https://nodejs.org (LTS version)
```bat
# Or via winget
winget install OpenJS.NodeJS.LTS
```

---

## 3. MSVC Build Tools (C++ compiler)

This is the most common missing piece that causes build failures.

### Check
```bat
# Check if cl.exe is available
where cl
```

### Install
Option A — Visual Studio Build Tools (lighter):
1. Download: https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio
2. In installer, select: **"Desktop development with C++"**
3. This includes: MSVC compiler, Windows SDK, CMake

Option B — Full Visual Studio Community (if already installing VS):
1. Download: https://visualstudio.microsoft.com/vs/community/
2. Workload: **"Desktop development with C++"**

---

## 4. WebView2 Runtime

Usually pre-installed on Windows 10 (1803+) and Windows 11.

### Check
```bat
# Check registry for WebView2
reg query "HKLM\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}" /v pv 2>nul
```

### Install if missing
Download: https://developer.microsoft.com/en-us/microsoft-edge/webview2/
Use "Evergreen Bootstrapper" — small installer that downloads latest.

---

## Bulletproof `build.bat`

```bat
@echo off
setlocal enabledelayedexpansion
echo ========================================
echo  Log Reader - One Click Build
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
echo OK: Node.js found.

REM ── Check npm ───────────────────────────
npm --version >nul 2>&1
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
echo   src-tauri\target\release\           (.exe standalone)
echo.

REM Open output folder
start "" "src-tauri\target\release\bundle\nsis\"

pause
```

---

## Troubleshooting Common Build Errors

| Error message | Cause | Fix |
|---|---|---|
| `error: linker 'link.exe' not found` | MSVC not installed | Install VS Build Tools with C++ workload |
| `error: failed to run custom build command for openssl-sys` | OpenSSL missing | Use `features = ["vendored"]` on openssl crate, or avoid it |
| `Cannot find module '@tauri-apps/cli'` | npm install not run | Run `npm install` first |
| `WebView2 is not installed` | WebView2 runtime missing | Install from Microsoft link above |
| `dylib not found` | Wrong Rust target | Run `rustup target add x86_64-pc-windows-msvc` |
| Build succeeds but `.exe` crashes on startup | Debug build assets missing | Always use `tauri build` not `tauri dev` for `.exe` |

---

## Output File Locations

After successful `npm run tauri build`:

```
src-tauri/
└── target/
    └── release/
        ├── log-reader.exe              ← standalone portable exe
        └── bundle/
            ├── nsis/
            │   └── log-reader_1.0.0_x64-setup.exe   ← NSIS installer
            └── msi/
                └── log-reader_1.0.0_x64_en-US.msi   ← MSI installer
```

Distribute the `nsis` installer for end users.
Distribute the standalone `.exe` for portable use (no install needed).