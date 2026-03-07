---
sidebar_position: 3
---

# 📡 Firmware Upgrade via TFTP

This guide walks through uploading and upgrading VSOL OLT firmware using TFTP (Trivial File Transfer Protocol), a lightweight method for transferring firmware images from a management station to the OLT device.

:::info
**What you're doing:** Preparing a TFTP server, hosting firmware on it, and remotely upgrading VSOL OLT firmware via CLI command without factory reset.

- Set up TFTP server on management workstation
- Configure OLT to download firmware image from TFTP
- Verify firmware upgrade process
- Reboot OLT to apply new firmware
- Validate successful upgrade
:::

:::warning
**Important Caveats:**
- TFTP is an unencrypted legacy protocol; use only on isolated management networks
- Firmware upgrade will temporarily disconnect all ONUs during reboot (plan maintenance window)
- Ensure sufficient free storage on OLT (minimum 500MB for typical firmware)
- Backup current firmware before upgrade using TFTP in reverse direction
- Network connectivity must remain stable during entire upgrade process
- Do NOT power off OLT during upgrade—will cause boot failures requiring serial recovery
- TFTP server must be reachable from OLT's management IP address
:::

---

## Prerequisites

✅ VSOL OLT accessible via SSH or serial console  
✅ Firmware image file in `.UBI` or `.bin` format (filename example: `firmware.UBI`)  
✅ Windows management workstation with tftpd64 TFTP server ([download here](https://pjo2.github.io/tftpd64/))  
✅ Management network connectivity between workstation and OLT's management interface  
✅ OLT's management IP address (typically `192.168.8.1` or static IP)  
✅ Terminal/SSH access with admin credentials for VSOL OLT  
✅ Firmware file downloaded and verified (checksum if provided)  

---

## Configuration Steps

### Step 1: Download Firmware Image

Obtain the appropriate VSOL firmware for your OLT model from the VSOL support portal or distributor:

**Firmware naming conventions:**
- `firmware.UBI` = Standard EPON/GPON firmware
- `firmware-gpon-v2.5.bin` = GPON-specific variant
- `firmware-epon-v1.8.UBI` = EPON-specific variant
- Check OLT model and current version before downloading

Verify file integrity (if checksum provided via PowerShell):
```powershell
# Windows SHA256 verification
Get-FileHash -Path "C:\Downloads\firmware.UBI" -Algorithm SHA256
# Compare output against checksum from VSOL documentation
```

If checksum matches expected value, proceed with setup.

### Step 2: Set Up TFTP Server (Windows)

1. Download [tftpd64](https://pjo2.github.io/tftpd64/) portable executable (no installation required)
2. Create TFTP directory on your workstation: `C:\tftp\` or similar
3. Copy firmware image into TFTP directory:
   ```
   C:\tftp\firmware.UBI
   ```
4. Run tftpd64.exe:
   - **Base Directory:** `C:\tftp\`
   - **Server interfaces:** Select your management NIC (network adapter connected to OLT—not loopback/127.0.0.1)
   - **Listen on port:** 69 (UDP default, do not change)
   - Check **"Show in system tray"** for easier access
   - Click **"Start"** button (green button becomes red "Stop" when running)

**Verify server is listening:**
```powershell
Get-NetUDPEndpoint -LocalPort 69
# Should show state "Listen" with address 0.0.0.0:69
```

If you see output, tftpd64 is correctly listening and ready for OLT to connect.

### Step 3: Get OLT Management IP Address

Access the VSOL OLT via SSH or serial console and find management interface IP:

```bash
# SSH access
ssh admin@192.168.8.1
# Or via serial console (115200 baud, 8N1)
# Then enter credentials

# Once connected, check management IP
show version
show interface | grep mgmt
```

Expected output:
```
Management IP: 192.168.8.1
Firmware Version: v2.4
System Uptime: 12 days 5 hours
```

**Note the management IP** for next step (e.g., `192.168.8.1`)

### Step 4: Verify Network Connectivity

From OLT, test connectivity to TFTP server:

```
Epon-Olt# ping 192.168.8.111
PING 192.168.8.111 56 data bytes
64 bytes from 192.168.8.111: icmp_seq=1. time=2 ms
```

If ping fails:
- Verify TFTP server IP address (correct subnetting)
- Check firewall rules (allow UDP:69 from OLT)
- Ensure cables are connected (check switch/router)

:::tip
If you can't ping, use the TFTP server's correct network interface IP. Run `ipconfig` in PowerShell to find correct IP of NIC connected to OLT network.
:::

### Step 5: Download Firmware via TFTP (CLI)

Connect to VSOL OLT and execute firmware download command:

```
Epon-Olt(config)# download tftp image firmware.UBI 192.168.8.111
```

**Parameters:**
- `download tftp image` = TFTP file transfer for firmware image
- `firmware.UBI` = Exact filename in TFTP server's directory
- `192.168.8.111` = IP address of TFTP server

Expected output during download:
```
gpon-olt(config)# download tftp image V1600GS_UPGRADE_V1.1.0_20240409_ANY_H.tar 192.168.8.23
Trying to download V1600GS_UPGRADE_V1.1.0_20240409_ANY_H.tar from server 192.168.8.23, please wait...

1970/01/01 09:56:15   Download File Success           download V1600GS_UPGRADE_V1.1.0_20240409_ANY_H.tar success

1970/01/01 09:56:32   Upgrade File Success            upgrade V1600GS_UPGRADE_V1.1.0_20240409_ANY_H.tar success

gpon-olt(config)#
```

Download typically takes 5-15 minutes depending on image size and network speed.

### Step 6: Reboot OLT After Upgrade

Once "upgrade complete" message appears, reboot with the `reboot` command:

```
gpon-olt(config)# reboot
Are you sure want to reboot system? [Y/N]
Y
gpon-olt(config)#
gpon-olt(config)# Connection to 192.168.8.200 closed by remote host.
Connection to 192.168.8.200 closed.
PS C:\Users\User>
```

**DO NOT POWER OFF during reboot.** OLT will:
1. Apply firmware to boot partition
2. Perform integrity checks
3. Restart services
4. Reconnect ONUs (takes ~30-60 seconds)

Expected reboot time: **3-5 minutes**

### Step 7: Verify Firmware Upgrade Success

After reboot, reconnect and verify:

```bash
ssh admin@192.168.8.1

Epon-Olt# show version
System Information:
  Firmware Version: v2.5          # ← Confirm new version
  Build Date: 2024-12-15
  System Uptime: 1 min 23 sec
```

Check ONU status returned to normal:

```
Epon-Olt# show interface pon-port all
PON Port  State   ONUs Online  ONUs Total
1/1       UP      45/48
1/2       UP      32/35
1/3       UP      51/52
1/4       UP      28/30
```

If all ONUs are back online, upgrade **successful** ✅

---

## Understanding OLT Firmware Upgrade Process

### Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│      Management Workstation (192.168.8.111)        │
│                                                     │
│  ┌──────────────────────────────────────────┐      │
│  │   TFTP Server (Port 69/UDP)              │      │
│  │   ├─ firmware.UBI (234MB)                │      │
│  │   └─ Listen on 192.168.8.111:69          │      │
│  └──────────────────────────────────────────┘      │
│              │                                      │
│              │ TFTP Transfer (UDP:69)              │
│              ↓                                      │
└─────────────────────────────────────────────────────┘
                      │
            ┌─────────┴──────────┐
            │  Network (vlan mgmt│
            │   192.168.8.0/24)  │
            └────────┬───────────┘
                     │
┌────────────────────▼───────────────────────────┐
│    VSOL OLT (192.168.8.1)                     │
│                                                │
│  ┌──────────────────────────────────────────┐ │
│  │  CPU with Firmware Partition             │ │
│  │  ├─ Boot Partition  (active)             │ │
│  │  ├─ Backup Partition   ← New firmware   │ │
│  │  └─ Data Partition                       │ │
│  └──────────────────────────────────────────┘ │
│                                                │
│  ┌──────────────────────────────────────────┐ │
│  │  4x PON Ports (downstream to ~200 ONUs)  │ │
│  └──────────────────────────────────────────┘ │
└────────────────────────────────────────────────┘
```

### Firmware Update Sequence

| Step | Duration | Action | Status |
|------|----------|--------|--------|
| 1 | 1 min | TFTP server receives download request | Connecting |
| 2 | 5-15 min | Firmware image transferred to OLT RAM | Downloading (progress bar) |
| 3 | 2 min | Image integrity verification (CRC/MD5) | Verifying |
| 4 | 5-10 min | Write firmware to flash storage | Writing to flash |
| 5 | 1 min | Finalize partition swap | Finalizing |
| 6 | 0.5 min | Signal reboot required | Completed |
| 7 | 0.5 min | OLT restarts (user initiates `reload`) | Rebooting |
| 8 | 2-3 min | Load new firmware, initialize services | Starting services |
| 9 | 1-2 min | Reconnect and re-authenticate ONUs | ONUs coming online |

**Total estimated time: 20-40 minutes** (download + verification + reboot)

### TFTP Protocol Overview

TFTP is simple but has limitations:
- **Port:** UDP 69 (connectionless, no TCP handshake)
- **Features:** Read/write files, binary transfer, no authentication
- **Advantages:** Minimal overhead, fast for small-medium files, no complex setup
- **Disadvantages:** No encryption, no resume (restart transfers whole file), unidirectional per command

---

## Verification Steps

### 1. After Successful Download (Before Reboot)

Verify firmware was written to flash:

```
Epon-Olt# show flash-info
Flash Information:
  Total Size: 512MB
  Used Space: 248MB (firmware + config)
  Free Space: 264MB
  Partitions:
    Boot: active, version 2.5
    Backup: inactive, version 2.4
    Config: 4MB
```

### 2. After Reboot - Check Version

```
Epon-Olt# show version | include "Firmware Version"
Firmware Version: v2.5
```

### 3. Check System Logs for Upgrade Status

```
Epon-Olt# show system log | include upgrade
2026-02-28 10:15:23 [INFO] Firmware upgrade started
2026-02-28 10:22:45 [INFO] Image verification: PASS
2026-02-28 10:28:12 [INFO] Flash write complete
2026-02-28 10:32:18 [INFO] Upgrade completed successfully
```

### 4. Validate ONU Connectivity Restored

```
Epon-Olt# show onu detailed | include "ONU State"
ONU 32/1: State = WORKING, Distance = 18km
ONU 32/2: State = WORKING, Distance = 21km
ONU 32/3: State = WORKING, Distance = 19km
```

If all ONUs show `WORKING` status, upgrade is **successful**.

### 5. Test Network Traffic Through OLT

From customer premises equipment (CPE) behind OLT:
```bash
ping 8.8.8.8
traceroute 8.8.8.8
iperf -c <upstream-server> # Test throughput
```

Should perform same or better than pre-upgrade.

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| **"Connection timeout" during download** | TFTP server unreachable | Verify TFTP server IP; test `ping` from OLT to server; check firewall rules UDP:69 |
| **"File not found" error** | Firmware filename mismatch (case-sensitive) | Verify exact filename in `C:\tftp\` matches command; use File Explorer to check filename |
| **Download stalls at 50%** | Network packet loss / UDP timeout | Restart tftpd64; move Windows workstation closer to OLT; reduce network congestion; disable Windows Firewall temporarily to test |
| **"Upgrade failed: CRC error"** | Corrupted firmware file | Re-download firmware; verify checksum with `Get-FileHash`; re-copy to `C:\tftp\` directory |
| **OLT reboots but firmware version unchanged** | Reboot before upgrade completed | Wait for "upgrade complete" message; check system logs for errors; may need manual rollback |
| **Cannot connect to OLT after reboot** | Upgrade broke boot partition; network config lost | Connect via serial console; use `boot backup` command to revert to previous version; contact VSOL support |
| **ONUs not coming back online after upgrade** | OLT services not fully started / ONU version mismatch | Wait 5 more minutes for ONU auto-negotiation; check if ONUs require firmware upgrade too; restart PON services |
| **"Out of space" during upgrade** | Insufficient flash storage on OLT | Delete old configuration backups: `delete backup-config old`; check with VSOL for space requirements |
| **tftpd64 shows "Cannot bind to port 69"** | Another application using UDP:69 | Check with `Get-NetUDPEndpoint -LocalPort 69`; close conflicting app (some VPNs use this port); use alternate TFTP server or different port |
| **OLT stuck in "Writing to flash" state** | Update process hung / storage timeout | Wait 15+ minutes; if persists, hard-reboot via serial; check tftpd64 logs for errors |
| **Firmware download very slow (1MB/s)** | Network congestion / large image | Check Windows Task Manager for network usage; try during low-traffic window; move workstation to wired connection if using Wi-Fi |
| **Windows Firewall blocking TFTP** | Firewall UDP:69 rules blocking connection | Temporarily disable Windows Defender Firewall (Settings → Firewall) to test; re-enable after upgrade and add tftpd64.exe exception |

---

## Advanced Options

### Option A: Download Firmware to Backup Partition (No Reboot Required)

Some VSOL OLTs support writing to backup partition while running active operations:

```
Epon-Olt(config)# download tftp image firmware.UBI 192.168.8.111 backup-only
Downloading to backup partition...
[Completed]
Epon-Olt(config)# show flash-info
Backup: version 2.5 (ready to activate on next reboot)
```

Reboot at convenient time:
```
Epon-Olt(config)# reload at 02:00
Scheduled reload at 02:00 UTC
ONUs will be disconnected then
```

### Option B: Backup Current Firmware Before Upgrade

Reverse TFTP to create backup:

```
Epon-Olt(config)# upload tftp firmware 192.168.8.111 firmware-backup-v2.4.UBI
Uploading current firmware...
######### 100%
Backup saved to TFTP server: firmware-backup-v2.4.UBI
```

On TFTP server, verify backup received:
```powershell
Get-ChildItem C:\tftp\firmware-backup-v2.4.UBI
# Should show the backup file with correct size
```

### Option C: Set Boot Partition Manually (Recovery)

If OLT boots with wrong partition:

```
Epon-Olt(config)# system boot-partition primary
Next boot will use primary (v2.5)
Reload to apply: reload

Epon-Olt(config)# system boot-partition secondary
Next boot will use backup (v2.4) - rollback
Reload to apply: reload
```

### Option D: Schedule Firmware Upgrade for Maintenance Window

```
Epon-Olt(config)# download tftp image firmware.UBI 192.168.8.111 schedule 02:00
Scheduled firmware download at 02:00 UTC
When complete, reload will be required
```

Useful for non-business hours upgrades.

### Option E: Upgrade with Configuration Preservation

By default, upgrade preserves VLAN/port configs. Verify:

```
Epon-Olt(config)# show config-backup-on-upgrade
Config preservation: ENABLED
```

Disable if you want fresh defaults:
```
Epon-Olt(config)# no config-backup-on-upgrade
```

### Option F: Monitor ONU Upgrade Progress per Port

Some ONUs support firmware upgrade too. Check:

```
Epon-Olt# show onu software-version all
ONU ID   Model       Current Version   Available Version
32/1     VSOL B600   v1.2              v1.3 (update available)
32/2     VSOL B600   v1.2              v1.3
```

Upgrade ONUs per port:
```
Epon-Olt# onu upgrade pon-port 1/1
Upgrading ONUs on PON 1/1... (takes ~30 min)
```

### Option G: Rollback to Previous Version (If Issues Occur)

If new firmware causes problems:

```
Epon-Olt(config)# system boot-partition secondary
Next boot: v2.4 (previous stable version)

Epon-Olt(config)# reload
Rebooting with previous firmware...
```

Takes 3-5 minutes. Usually resolves issues.

### Option H: Verify Firmware Signature (Security)

Some VSOL models support firmware signature verification:

```
Epon-Olt(config)# download tftp image firmware.UBI 192.168.8.111 verify-signature
Checking firmware signature...
Public key verification: PASS
Firmware authenticity: VERIFIED
Safe to proceed with upgrade
```

Ensures firmware is from official VSOL, not tampered.

### Option I: Upload System Logs to TFTP After Upgrade

For diagnostics, send logs to TFTP server:

```
Epon-Olt# upload tftp logs 192.168.8.111 olt-logs-post-upgrade.tar.gz
Compressing and uploading system logs...
Upload complete
```

On Windows TFTP server, verify logs received:
```powershell
Get-ChildItem C:\tftp\olt-logs-post-upgrade.tar.gz
# If present, upload was successful
```

### Option J: Upgrade Multiple OLTs Sequentially

If upgrading multiple VSOL OLTs, run tftpd64 and execute upgrade commands on each OLT one after another:

1. Open SSH session to first OLT: `download tftp image firmware.UBI 192.168.8.111`
2. Monitor progress and wait for reboot to complete (~5-10 minutes)
3. Open SSH session to second OLT and repeat
4. Open SSH session to third OLT and repeat

Sequential upgrades ensure stable TFTP server and network resources. Single tftpd64 instance can handle multiple concurrent transfers, but safe practice is sequential.

### Option K: Use SFTP Instead of TFTP (If Supported)

More secure alternative requiring Windows SFTP server (e.g., FileZilla Server):

```
Epon-Olt(config)# download sftp image firmware.UBI 192.168.8.111 user:admin pass:password
Downloading via SFTP with encryption...
Connected securely to 192.168.8.111
[################################] 100%
Download complete
```

Requires SFTP server running on Windows workstation instead of TFTP (encrypted SSH-based transfer). Check VSOL OLT support before using SFTP.

---

## Related Guides

- [GPON VLAN Configuration](./gpon-vlan-configuration) – Network setup for GPON OLTs
- [EPON VLAN Configuration](./epon-vlan-configuration) – EPON port and VLAN management
- [Network VLAN Configuration](../../Network/vlan-configuration) – Fundamental VLAN concepts
- [BSCom OLT VLAN Configuration](../bscom-vlan-configuration) – Alternative OLT vendor firmware upgrade patterns

---

✅ **VSOL OLT firmware upgrade complete!** Your OLT is now running the latest firmware with all ONUs reconnected and operational. Monitor system performance over the next 24 hours for stability.
