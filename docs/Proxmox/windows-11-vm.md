---
sidebar_position: 4
---

# 🪟 INstall Windows 11

This guide explains how to create a Windows 11 VM on Proxmox VE 8.2.2. It’s based on a working setup and may require adjustments for different hardware or environments.

:::info
This is a practical walkthrough, not an official best‑practice guide. Use it as a baseline and validate with your own requirements.
:::

## Prerequisites

- ✅ Proxmox VE 8.2.2 already installed
- ✅ Windows 11 ISO downloaded
- ✅ VirtIO driver ISO downloaded
- ✅ Sufficient CPU/RAM/storage for Windows 11

:::warning
Windows 11 requires UEFI + TPM 2.0. Make sure those options are enabled during VM creation.
:::

## Download the ISOs

### Windows 11 ISO

1. Go to the Windows 11 download page.
2. Under **Download Windows 11 Disk Image (ISO)** choose **Windows 11 (multi‑edition ISO for x64)**.
3. Select language → **Confirm** → **64‑bit Download**.

### VirtIO Drivers ISO

1. Open the **virtio-win** GitHub releases page.
2. Under **Variant 1**, download **virtio-win.iso**.

## Upload ISOs to Proxmox

1. In Proxmox, select **local (pve)**.
2. Go to **ISO Images → Upload**.
3. Upload the Windows 11 ISO, then the VirtIO ISO.

## Create the VM

Click **Create VM** and follow these settings:

### General
- **Name:** choose a VM name
- Leave **Node**, **VM ID**, **Resource Pool** as default

### OS
- Select the **Windows 11 ISO**
- Check **Add additional drive for VirtIO drivers**
- Select **virtio-win.iso**

### System
Set these options:

- **Graphics:** Default
- **Machine:** q35
- **BIOS:** OVMF (UEFI)
- **Add EFI Disk:** checked
- **EFI Storage:** local-lvm
- **Pre-Enroll keys:** checked
- **SCSI Controller:** VirtIO SCSI single
- **Qemu Agent:** checked
- **Add TPM:** checked
- **TPM Storage:** local-lvm
- **TPM Version:** v2.0

### Disk
- **Disk size:** at least 64GiB
- Leave other defaults

### CPU
- **Cores:** as needed
- **Type:** host

### Memory
- Assign RAM based on your workload

### Network
- Leave defaults

### Confirm
- Uncheck **Start after created**
- Click **Finish**

## Install Windows 11

1. Start the VM → open **Console**.
2. Boot from the ISO when prompted.
3. Choose **Windows 11 Pro** if you plan to use Remote Desktop.

### Load VirtIO Storage Driver

At the **Install Location** screen, disks may be missing. Load the VirtIO driver:

1. Click **Load Driver** → **Browse**
2. Open `\amd64\w11` on the VirtIO ISO
3. Select **Red Hat VirtIO SCSI pass-through controller** → **Install**

Disks should appear. Continue installation.

## Install Full VirtIO Drivers

After Windows finishes installing and reaches the **network setup** step:

1. Press **Shift + F10** to open Terminal
2. Run:
   ```
   D:\virtio-win-guest-tools.exe
   ```
3. Install using defaults
4. Close Terminal and continue setup

Network should now work.

## Post‑Install

Optional next steps:

- **Enable RDP** for remote access
- **Verify Qemu Agent** actions (Shutdown/Restart from Proxmox)

## Completion

✅ **Windows 11 VM is ready!**

**Next steps:**
- Install updates and drivers
- Create a snapshot
- Configure backups
