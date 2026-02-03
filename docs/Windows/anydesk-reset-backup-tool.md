---
sidebar_position: 1
---

# 🛠 AnyDesk Reset

A safe utility to **reset ɅnyDesk**, manage **backups of `user.conf`**, and **restore** them when needed.
Includes an **interactive menu** (colorized in PowerShell, plain in BAT).

---

## ⚡ Quick Start

**One-liner to download and run:**
```powershell
iwr -useb https://raw.githubusercontent.com/Kintoyyy/Adesk-Tool/main/reset-adesk-oneliner.ps1 | iex
```

:::warning
**Important:** Run PowerShell as Administrator first, otherwise the reset/backup will fail.
:::

---

## 📌 Features

* ✅ Reset ɅnyDesk **without touching your `user.conf`**
* ✅ Clean reset (**auto-backup**, then remove `user.conf`)
* ✅ Backup `user.conf` with timestamp → `%AppData%\AnyDesk\Backups`
* ✅ Restore from **any saved backup** (choose which file to restore)
* ⚠️ Resetting will **regenerate a new AnyDesk ID**
* ⚠️ Saved devices will need to **re-enter the password after reset**

---

## 📂 Backup Location

All backups are stored in:

```
%USERPROFILE%\Documents\Adesk
```

Backups include:
- **user.conf** - Your AnyDesk configuration file
- **thumbnails** - Remote desktop thumbnails

Files are timestamped:

```
user.conf.YYYYMMDD-HHMMSS.bak
thumbnails.YYYYMMDD-HHMMSS.bak
```

Example:

```
user.conf.20251001-143025.bak
thumbnails.20251001-143025.bak
```

---

## 🚀 How to Run

### 🔹 PowerShell (recommended)

**Option 1: Run directly from web (fastest)**
```powershell
iwr -useb https://raw.githubusercontent.com/Kintoyyy/Adesk-Tool/main/reset-adesk-oneliner.ps1 | iex
```

**Option 2: Download & run locally**
```powershell
powershell -ExecutionPolicy Bypass -File ".\reset-adesk.ps1"
```

### 🔹 Batch Version (no colors)

If you prefer a **plain `.bat` tool** (simpler, no colors), run:

```bat
reset-adesk.bat
```

---

## 📜 Menu Options

When executed, you'll see:

```
==================================================
                                                                
     _       _           _      _____           _ 
    / \   __| | ___  ___| | __ |_   _|__   ___ | |
   / _ \ / _  |/ _ \/ __| |/ /   | |/ _ \ / _ \| |
  / ___ \ (_| |  __/\__ \   <    | | (_) | (_) | |
 /_/   \_\__,_|\___||___/_|\_\   |_|\___/ \___/|_|

          ɅnyDesk Reset / Backup Tool                
==================================================

 [1] Reset ɅnyDesk (keep user.conf)
 [2] Clean Reset ɅnyDesk (backup + remove user.conf)
 [3] Backup user.conf
 [4] Restore user.conf from backup
 [5] Exit
```

### Menu Actions

| Option | Description |
|--------|-------------|
| **[1]** | Resets AnyDesk without removing your configuration file |
| **[2]** | Creates a backup of your configuration, then performs a clean reset |
| **[3]** | Backs up your current `user.conf` with a timestamp |
| **[4]** | Restores a previously saved backup from the backup folder |
| **[5]** | Exits the tool |

---

## ⚙️ Prerequisites

- ✅ Windows 10 or later
- ✅ PowerShell 5.0 or later
- ✅ Administrator privileges (script auto-prompts)
- ✅ AnyDesk installed in default location: `%AppData%\AnyDesk`

---

## 🔍 Verification

After running the tool, verify the action completed:

1. **Check backup location:**
   ```powershell
   Get-ChildItem "$env:USERPROFILE\Documents\Adesk"
   ```

2. **Verify AnyDesk status:**
   - New ID will be generated after reset
   - Check in **AnyDesk Settings → This Desk** for the new ID

3. **Confirm backup files:**
   - Files should appear timestamped in `Documents\Adesk` folder

---

## 🐛 Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| **"Access Denied" error** | Not running as Administrator | Right-click PowerShell → "Run as Administrator" |
| **Backup folder not created** | First backup being created | Script auto-creates folder; run again if error persists |
| **AnyDesk still has old ID** | Cache not cleared | Restart AnyDesk application after reset |
| **Cannot restore backup** | Backup file corrupted | Verify backup files exist in `Documents\Adesk` folder |
| **Script won't execute** | ExecutionPolicy blocked | Run: `powershell -ExecutionPolicy Bypass -File "reset-adesk.ps1"` |

---

## 📋 Advanced Options

### Manual Backup (without script)

If you prefer to manually back up your configuration:

```powershell
$source = "$env:AppData\AnyDesk\user.conf"
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$destination = "$env:USERPROFILE\Documents\Adesk\user.conf.$timestamp.bak"

New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\Documents\Adesk" | Out-Null
Copy-Item -Path $source -Destination $destination
Write-Host "Backup saved: $destination"
```

### Manual Reset (without script)

To reset only (keeping `user.conf`):

```powershell
# Stop AnyDesk service
Stop-Service -Name "AnyDesk" -Force -ErrorAction SilentlyContinue

# Remove registry entries
Remove-Item -Path "HKCU:\Software\AnyDesk" -Recurse -Force -ErrorAction SilentlyContinue

# Start AnyDesk service
Start-Service -Name "AnyDesk"
```

### Batch File Execution

If using the `.bat` version, ensure it runs in Administrator mode:

```bat
@echo off
REM Run as Administrator
net session >nul 2>&1
if errorLevel 1 (
    echo Please run this script as Administrator
    pause
    exit /b 1
)

REM Your reset logic here
```

---

## ⚠️ Important Notes

* Works only on **Windows** with AnyDesk installed in the default path
* Always **run as Administrator** (script checks and auto-prompts if not elevated)
* A reset will **regenerate a new AnyDesk ID**
* After reset, **Unattended Access password must be re-set**
* All previously saved devices must **re-authenticate**
* Backups are preserved even after reset
* Safe to run multiple times—script won't overwrite existing backups

---

✅ **Completed!**
