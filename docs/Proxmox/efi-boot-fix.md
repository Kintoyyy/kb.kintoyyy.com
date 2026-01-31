---
sidebar_position: 7
---

# 🚀 EFI Boot Fix

EFI boot issues on Proxmox can prevent kernel updates and break boot tooling. This guide walks you through replacing legacy GRUB packages, mounting the EFI partition, and re‑initializing the Proxmox boot tool so your system boots cleanly in UEFI mode.

:::info
These steps are safe for most Proxmox VE 7/8 installs, but always verify disk and partition paths before running commands.
:::

## Prerequisites

- ✅ Proxmox VE host with root shell access
- ✅ UEFI‑capable motherboard and BIOS/UEFI access
- ✅ Access to a maintenance window (reboot required)
- ✅ Basic Linux CLI familiarity

:::warning
Mounting the wrong partition or editing the wrong GRUB settings can prevent boot. Double‑check device paths before applying changes.
:::

## Configuration Steps

### Option A: Terminal (Recommended)

1. **Install correct GRUB package** (replaces legacy `grub-pc`):
   ```bash
   apt-get install grub-efi-amd64
   ```

2. **Confirm EFI mode is active:**
   ```bash
   ls /sys/firmware/efi
   ```

3. **Identify the EFI partition:**
   ```bash
   lsblk
   fdisk -l /dev/nvme0n1
   ```
   Look for a ~1GB partition marked **EFI System** (commonly `/dev/nvme0n1p2` or `/dev/sda2`).

4. **Mount the EFI partition:**
   ```bash
   mount /dev/nvme0n1p2 /boot/efi
   ```

5. **Initialize the Proxmox boot tool** (if UUIDs are missing):
   ```bash
   proxmox-boot-tool status
   umount /boot/efi
   proxmox-boot-tool init /dev/nvme0n1p2
   ```

6. **Verify status:**
   ```bash
   proxmox-boot-tool status
   ```

7. **Reboot:**
   ```bash
   reboot
   ```

### Option B: Proxmox Web UI

1. **Reboot into BIOS/UEFI** and set **UEFI Only** (disable Legacy/CSM).
2. **Verify boot mode** in Proxmox: Node → System → System Information.
3. **Confirm EFI partition** under Node → Disks.
4. **Apply terminal steps** from Option A for GRUB and boot tool initialization.
5. **Reboot** and verify the node returns without EFI warnings.

## Understanding the Configuration

**Flow Diagram**

```
[Install grub-efi-amd64] -> [Mount EFI] -> [proxmox-boot-tool init] -> [Sync kernels] -> [UEFI boot]
```

**Components Table**

| Component | Purpose | Notes |
|---|---|---|
| grub-efi-amd64 | Correct GRUB for UEFI | Replaces grub-pc |
| EFI System Partition | Stores UEFI boot files | Typically 1GB FAT32 |
| proxmox-boot-tool | Syncs kernels to EFI | Generates boot entries |
| /etc/kernel/proxmox-boot-uuids | Tracks EFI UUIDs | Auto-created by boot tool |

## Verification

1. **UEFI mode present:**
   ```bash
   ls /sys/firmware/efi
   ```
2. **Boot tool status clean:**
   ```bash
   proxmox-boot-tool status
   ```
3. **No missing UUID errors:** confirm `proxmox-boot-tool status` does not report missing UUIDs.
4. **Reboot test:** node returns without EFI warnings in update output.

## Troubleshooting

| Issue | Cause | Solution |
|---|---|---|
| EFI warning on updates | `grub-pc` installed | Install `grub-efi-amd64` |
| EFI partition not found | Wrong disk selected | Use `lsblk`/`fdisk -l` to locate EFI |
| `/etc/kernel/proxmox-boot-uuids` missing | Boot tool not initialized | Run `proxmox-boot-tool init /dev/…` |
| `proxmox-boot-tool` fails to mount | EFI already mounted | `umount /boot/efi` then retry |
| EFI mount fails | Wrong filesystem | Ensure EFI is FAT32 (vfat) |
| System still boots legacy | BIOS set to Legacy/CSM | Switch BIOS to UEFI Only |
| Update-grub errors | Missing EFI mount | Mount EFI before running tools |
| Node won’t reboot | Pending package locks | Finish `apt` operations and retry |
| Multiple EFI disks | Conflicting boot entries | Initialize each ESP intentionally |
| Boot entries missing | ESP not synced | Re-run `proxmox-boot-tool init` |
| Wrong UUID synced | Incorrect device path | Re-initialize with correct partition |
| Updates still warn | Cached GRUB config | Reinstall `grub-efi-amd64` and reboot |

## Advanced Options

1. Initialize multiple EFI partitions for redundancy
2. Pin a preferred boot entry in BIOS
3. Use `efibootmgr -v` to verify entries
4. Add a dedicated `/boot/efi` entry in `/etc/fstab`
5. Keep a rescue USB for recovery
6. Use ZFS boot with `pve-efiboot-tool refresh`
7. Enable secure boot only after confirming boot chain
8. Back up `/etc/kernel/cmdline` and GRUB config
9. Use a separate boot disk to reduce risk
10. Document EFI UUIDs for disaster recovery

## Related Guides

- [Post-Install Configuration](./post-install-configuration)
- [PCI Passthrough](./pci-passthrough-setup)
- [PCIe Fix](./pcie-passthrough-fix)
- [Install MikroTik CHR](./install-mikrotik-chr)

## Completion

🎉 **EFI boot issues resolved!**

**Next steps:**
- Confirm updates run without EFI warnings
- Back up boot configs and UUIDs
- Document firmware mode and boot order
