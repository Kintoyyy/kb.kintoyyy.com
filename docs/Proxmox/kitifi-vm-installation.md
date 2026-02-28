---
sidebar_position: 6
---

# 🖥️ Install Kitifi Controller

This guide walks through downloading, decompressing, and deploying KiTifi v2.0 as a virtual machine on Proxmox, with full network and storage configuration using UEFI boot and virtio-scsi disks.

:::info
**What you're doing:** Provisioning a complete KiTifi VM with 4 vCPU cores, 4GB RAM, UEFI firmware, and a 128GB disk on Proxmox VE using command-line tools.

- Download KiTifi UEFI image (x86_64)
- Decompress XZ-compressed image
- Create Proxmox VM with ID 103
- Configure virtio network and storage
- Set UEFI boot with OVMF firmware
- Resize disk to 128GB production size
:::

:::warning
**Important Caveats:**
- Ensure `local-lvm` storage is available on your Proxmox node before importing
- The download is approximately 500MB (xz compressed); decompressed size is ~2GB
- UEFI firmware requires OVMF package installed on Proxmox (`apt install ovmf` if missing)
- VM ID 103 must not already exist; change if needed
- This procedure requires command-line access to Proxmox node
:::

---

## Prerequisites

✅ Proxmox VE 7.x or 8.x installed and operational  
✅ `local-lvm` storage configured with sufficient space (150GB+ available)  
✅ Internet connectivity to download from `files.kitifi.com`  
✅ OVMF firmware installed (`dpkg -l | grep ovmf` to verify)  
✅ SSH access to Proxmox node as root or sudoer  
✅ `wget` and `xz-utils` installed (`apt install wget xz-utils` if missing)  

---

## Configuration Steps

### Step 1: Download KiTifi Image

Connect to your Proxmox node and download the KiTifi v2.0 UEFI image:

```bash
cd /tmp
wget "https://files.kitifi.com/MT-Based/v2.0/Main/KiTifi-v2.0-uefi-x86.img.xz"
```

**Expected output:**
```
--2026-02-28 10:15:30--  https://files.kitifi.com/MT-Based/v2.0/Main/KiTifi-v2.0-uefi-x86.img.xz
Resolving files.kitifi.com... [IP]
Connecting to files.kitifi.com... connected.
HTTP request sent, awaiting response... 200 OK
Length: 543456789 bytes
100%[=====>] 543456789  5.2MB/s    in 104s
```

### Step 2: Decompress Image

Extract the XZ-compressed image (keep original with `-k` flag):

```bash
xz -dk KiTifi-v2.0-uefi-x86.img.xz
```

**What happens:**
- `-d` = decompress
- `-k` = keep original .xz file
- Creates `KiTifi-v2.0-uefi-x86.img` (~2GB uncompressed)

Verify decompression:
```bash
ls -lh KiTifi-v2.0-uefi-x86.img*
```

### Step 3: Create Proxmox VM Container

Create the VM with ID 103 and hostname "kitifi":

```bash
qm create 103 --name "kitifi" --ostype l26
```

**Parameters explained:**
- `103` = unique VM ID (change if conflicts; `qm list` to check)
- `--ostype l26` = Linux kernel 2.6+ (Proxmox autodetects for VM)

### Step 4: Configure Network Interface

Attach to virtual bridge (standard Proxmox setup):

```bash
qm set 103 --net0 virtio,bridge=vmbr0
```

**Network configuration:**
- `virtio` = high-performance paravirtualized NIC driver
- `bridge=vmbr0` = attach to management/LAN bridge (adjust if using custom bridge)

### Step 5: Set CPU and Memory

Allocate processing resources:

```bash
qm set 103 --memory 4096 --cores 2 --cpu host
```

**Resource allocation:**
- `--memory 4096` = 4GB RAM
- `--cores 2` = 2 vCPU cores (can be increased to `4` or higher)
- `--cpu host` = pass-through host CPU flags for performance

### Step 6: Import Disk Image

Import the decompressed image as SCSI disk with optimization:

```bash
qm set 103 --scsi0 local-lvm:0,import-from="$(pwd)/KiTifi-v2.0-uefi-x86.img",discard=on
```

**Disk parameters:**
- `scsi0` = first SCSI disk controller (virtio-scsi)
- `local-lvm:0` = LVM storage with bus number 0
- `import-from="$(pwd)/KiTifi-v2.0-uefi-x86.img"` = absolute path to image (must be decompressed)
- `discard=on` = enable TRIM/discard for efficient storage

:::tip
If import fails with "file not found", verify the image path: `ls -la KiTifi-v2.0-uefi-x86.img`
:::

### Step 7: Configure UEFI Boot

Set OVMF UEFI firmware and boot device:

```bash
qm set 103 --bios ovmf
qm set 103 --efidisk0 local-lvm:0,format=raw
qm set 103 --boot order=scsi0 --scsihw virtio-scsi-single
```

**UEFI configuration:**
- `--bios ovmf` = UEFI firmware (required for modern OSes)
- `--efidisk0 local-lvm:0,format=raw` = EFI boot partition on LVM
- `--boot order=scsi0` = boot from SCSI disk
- `--scsihw virtio-scsi-single` = single-queue SCSI hardware (optimized for VMs)

### Step 8: Resize Disk to Production Size

Expand the disk from default 2GB to 128GB:

```bash
qm disk resize 103 scsi0 128G
```

**Verify resize:**
```bash
qm config 103 | grep scsi0
```

Expected output: `scsi0: local-lvm:vm-103-disk-0,format=raw,size=128G`

---

## Understanding KiTifi VM Configuration

### Architecture Diagram

```
┌─────────────────────────────────────┐
│     Proxmox Node (Barenode)        │
│                                     │
│  ┌──────────────────────────────┐  │
│  │   KiTifi VM (ID: 103)        │  │
│  │   ✓ UEFI/OVMF Boot          │  │
│  │   ✓ 2 vCPU cores            │  │
│  │   ✓ 4GB RAM                 │  │
│  │   ✓ 128GB virtio-scsi disk  │  │
│  │   ✓ Virtio NIC (vmbr0)      │  │
│  └──────────────────────────────┘  │
│         │                            │
│         └──────→ vmbr0 (Bridge)     │
│              │                       │
│         (eth0 / primary NIC)        │
│                                     │
└─────────────────────────────────────┘
```

### Component Reference

| Component | Setting | Reason |
|-----------|---------|--------|
| **BIOS** | OVMF (UEFI) | Required for KiTifi UEFI image |
| **Boot** | SCSI disk | Fast boot, optimized for SSD/LVM |
| **Storage** | virtio-scsi-single | Low-latency, single-threaded SCSI |
| **Network** | Virtio TAP | High-performance paravirtualized NIC |
| **CPU** | Host passthrough | Native instruction set, no emulation |
| **Memory** | 4GB + 2 cores | Sufficient for KiTifi base load |

### Disk Import Process

When you run `qm set 103 --scsi0 ... import-from=`, Proxmox:
1. Reads the raw `.img` file from `/tmp` or current working directory
2. Creates a new LVM logical volume on `local-lvm` storage
3. Copies image data directly to LVM disk
4. Registers disk as VM device
5. Deletes original `.img` file (if import succeeds)

---

## Verification Steps

### 1. Check VM Configuration

Verify all settings were applied:

```bash
qm config 103
```

Expected output includes:
```
bios: ovmf
boot: order=scsi0
cores: 2
cpu: host
efidisk0: local-lvm:vm-103-disk-0,size=128G
memory: 4096
name: kitifi
net0: virtio=XX:XX:XX:xx:xx:xx,bridge=vmbr0
ostype: l26
scsihw: virtio-scsi-single
scsi0: local-lvm:vm-103-disk-0,format=raw,size=128G
```

### 2. Verify Storage

Check that disk was created successfully in LVM:

```bash
lvs | grep vm-103
```

Expected: `vm-103-disk-0 pve -wi-ao----  128.00g`

### 3. Start VM

Boot the KiTifi VM:

```bash
qm start 103
```

### 4. Check Console

Monitor boot progress (especially UEFI initialization):

```bash
qm terminal 103
```

Or via Proxmox web UI: **Datacenter → 103 (kitifi) → Console**

### 5. Wait for Network

Once booted, verify KiTifi acquired IP address:

```bash
qm guest cmd 103 network-get-interfaces 2>/dev/null | grep -A2 '"name"'
```

Or in Proxmox UI: **103 → Summary → Network devices**

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| **"file not found" during import** | Image not decompressed or wrong path | Run `xz -dk` in correct directory; use absolute path `/tmp/KiTifi-...` |
| **"ChunkLoadError" in Proxmox after creation** | Proxmox web console not refreshed | Hard refresh browser: `Ctrl+Shift+R` or clear cache |
| **VM won't boot (black screen)** | OVMF not installed on node | `apt install ovmf` on Proxmox node; `qm set 103 --bios seabios` as temporary fallback |
| **"local-lvm:0 not found" error** | Storage pool misconfigured | Check: `pvesm status` and ensure `local-lvm` shows "active" |
| **Disk resize fails** | Disk already in use / locked | Stop VM first: `qm stop 103`; then retry `qm disk resize` |
| **No network on KiTifi** | Bridge name mismatch | Verify bridge name: `ip a` on Proxmox node; adjust `--net0 virtio,bridge=vmbr1` if needed |
| **Slow disk performance** | SCSI hardware setting wrong | Ensure `--scsihw virtio-scsi-single` (not `virtio-scsi-pci`) |
| **"terminal: guest agent not running"** | QEMU Guest Agent not installed in KiTifi | guest-agent not required but recommended; can add later |
| **Import appears stuck (long duration)** | Large image being copied | Normal for 2GB+ images; monitor with `lvs` or `watch free -h` |
| **VM ID 103 conflicts** | Another VM using same ID | List used IDs: `qm list`; create with different ID and update all commands |
| **Out of storage space on local-lvm** | Insufficient capacity for 128GB disk | Check available: `pvesm status`; delete unused VMs or add storage |
| **UEFI boot timeout** | OVMF firmware issue / corrupt image | Verify image checksum (if provided by KiTifi); try `--bios seabios` temporarily |

---

## Advanced Options

### Option A: Increase CPU Cores for Performance

If running CPU-intensive workloads:

```bash
qm set 103 --cores 4 --sockets 1
```

Cores allocation (up to physical CPU count):
- `--cores 4` = 4 vCPU cores per socket
- `--sockets 1` = 1 socket (vs. multi-socket for NUMA)
- Max recommended: 8 cores per VM on dual-CPU systems

### Option B: Increase Memory

For heavier workloads (default is 4GB):

```bash
qm set 103 --memory 8192
```

Increases to 8GB RAM. Restart VM to apply: `qm reboot 103`

### Option C: Add Second NIC for Management

Separate management network from production:

```bash
qm set 103 --net1 virtio,bridge=vmbr1
```

Requires second bridge `vmbr1` configured on Proxmox node.

### Option D: Enable Balloon Memory (Dynamic Resizing)

Allow Proxmox to reclaim unused RAM:

```bash
qm set 103 --balloon 2048
```

Sets minimum guaranteed memory to 2GB; allows up to 4GB allocated. Requires `qemu-guest-agent` on guest.

### Option E: Add USB Passthrough (optional)

If KiTifi uses USB hardware:

```bash
lsusb  # List connected USB devices
qm set 103 --usb0 host=1234:5678  # Replace with actual vendor:product IDs
```

### Option F: Enable Nested Virtualization

If KiTifi will run VMs itself:

```bash
qm set 103 --cpu host,flags=+vmx
```

Adds Intel VMX (or AMD SVM) CPU flags. Requires compatible host CPU.

### Option G: Custom Boot Delay

Add BIOS delay if boot is too fast:

```bash
qm set 103 --boot delay=3
```

Gives UEFI firmware 3 seconds to initialize.

### Option H: Enable CPU Hotplug

Allow adding cores without reboot:

```bash
qm set 103 --cores 2 --vcpus 4
```

Allocates 4 total vCPUs but enables 2; can hotplug 2 more via Proxmox UI.

### Option I: Attach ISO for Installation Media

If you need to boot installer:

```bash
qm set 103 --ide2 local:iso/ubuntu-20.04-live-server-amd64.iso,media=cdrom
qm set 103 --boot order=ide2,scsi0  # Boot from ISO first
```

### Option J: Enable VNC Remote Console

Alternative to web console:

```bash
qm set 103 --vga std -smp 4
```

Access via VNC client on `<proxmox-ip>:600X` (X varies by VM ID).

### Option K: Configure QoS (Bandwidth Limit)

Limit disk I/O to prevent host overload:

```bash
qm set 103 --scsi0 local-lvm:vm-103-disk-0,bps_max=100M
```

Limits to 100MB/s for safety on shared storage.

### Option L: Snapshot Before First Boot

Create recovery point:

```bash
qm snapshot 103 pre-boot-snapshot
```

Restore with: `qm snapshot 103 pre-boot-snapshot --restore`

---

## Related Guides

- [Windows 11 VM Installation](./windows-11-vm) – Similar Proxmox VM setup with UEFI
- [PCI Passthrough Setup](./pci-passthrough-setup) – GPU/hardware device assignment
- [PCIe Passthrough Fix](./pcie-passthrough-fix) – IOMMU configuration for advanced hardware
- [EFI Boot Fix](./efi-boot-fix) – Troubleshoot UEFI/OVMF issues
- [Post-Install Configuration](./post-install-configuration) – Network and storage tuning after VM creation
- [Network VLAN Configuration](../Network/vlan-configuration) – Advanced networking for KiTifi

---

✅ **KiTifi VM deployment complete!** Your VM is now running on Proxmox with full UEFI support, virtio-scsi storage optimization, and 128GB disk capacity.
