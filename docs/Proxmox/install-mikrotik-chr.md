---
sidebar_position: 1
---

# 🖥️ Install MikroTik CHR

## Overview

Install MikroTik Cloud Hosted Router (CHR) as a Proxmox virtual machine. CHR is a lightweight RouterOS that runs on x86 hardware, perfect for testing MikroTik configurations in labs, creating virtual network appliances, or running isolated routers inside Proxmox clusters. CHR uses minimal resources (4GB RAM, 2 vCPU) while providing full RouterOS functionality.

:::info
**What this does:**
- Downloads MikroTik CHR image (Cloud Hosted Router)
- Creates Proxmox VM with optimized settings
- Imports CHR disk and resizes storage
- Creates a reusable template for rapid deployments
:::

## Prerequisites

- ✅ Proxmox VE installed and accessible via SSH/console
- ✅ Local storage pool available (local-lvm or similar)
- ✅ Internet access from Proxmox node to download CHR image
- ✅ Minimum 10GB free storage for VM disk
- ✅ VMID available (example uses 103)
- ✅ Network bridge configured (vmbr0)

:::warning
**MikroTik CHR considerations:**
- CHR requires valid license after trial period
- Disk resize operations cannot be undone easily
- Template creation is permanent (recommended for templates only)
- Changes to template won't affect existing clones
- Always backup configuration before major upgrades
:::

## Configuration Steps

### Option A: Terminal Configuration

1. **Connect to Proxmox node:**
   ```bash
   ssh root@proxmox-ip
   ```

2. **Navigate to working directory and download CHR image:**
   ```bash
   cd /tmp
   wget "https://download.mikrotik.com/routeros/7.11.2/chr-7.11.2.img.zip"
   ```

   :::tip
   Check [MikroTik download page](https://mikrotik.com/download) for latest CHR version. Adjust version number as needed.
   :::

3. **Extract the image:**
   ```bash
   unzip chr-7.11.2.img.zip
   ```

4. **Create the VM:**
   ```bash
   qm create 103 --name "mikrotik" --ostype l26
   ```

5. **Configure network interface:**
   ```bash
   qm set 103 --net0 virtio,bridge=vmbr0
   ```

6. **Add serial console (for headless access):**
   ```bash
   qm set 103 --serial0 socket --vga serial0
   ```

7. **Set CPU, cores, and RAM:**
   ```bash
   qm set 103 --memory 4096 --cores 2 --cpu host
   ```

8. **Import CHR disk:**
   ```bash
   qm set 103 --scsi0 local-lvm:0,import-from="$(pwd)/chr-7.11.2.img",discard=on
   ```

9. **Configure boot order:**
   ```bash
   qm set 103 --boot order=scsi0 --scsihw virtio-scsi-single
   ```

10. **Resize disk to 8GB:**
    ```bash
    qm disk resize 103 scsi0 8G
    ```

11. **Convert to template** (optional but recommended):
    ```bash
    qm template 103
    ```

12. **Verify configuration:**
    ```bash
    qm config 103
    ```

### Option B: Proxmox WebUI Configuration

1. **Download CHR image to Proxmox node** (via SSH as above)

2. **Create VM via WebUI:**
   - Click **Create VM**
   - VM ID: `103`
   - Name: `mikrotik`
   - OS: `Linux 6.x - 2.6 Kernel`
   - Click **Next**

3. **Configure Hardware:**
   - CPU Cores: `2`
   - Memory: `4096 MB`
   - Network: Bridge `vmbr0`, Model `VirtIO`
   - Serial Port: Add (for console access)
   - Click **Next**

4. **Do not create disk yet** - click **Finish**

5. **Import disk via SSH:**
   ```bash
   qm set 103 --scsi0 local-lvm:0,import-from="/tmp/chr-7.11.2.img",discard=on
   qm set 103 --boot order=scsi0 --scsihw virtio-scsi-single
   ```

6. **Resize disk in WebUI:**
   - Select VM 103
   - Hardware → scsi0
   - Click **Resize disk**
   - Size: `8G` → **Resize**

7. **Convert to template (optional):**
   - Right-click VM 103
   - Select **Convert to Template**

## Understanding the Configuration

### Installation Flow

```
Download CHR image → Extract → Create VM container
     ↓
Configure networking (VirtIO bridge) + Serial console
     ↓
Set hardware (CPU, RAM, storage type)
     ↓
Import disk image from file
     ↓
Set boot order (SCSI0 primary)
     ↓
Resize disk to desired size
     ↓
Optional: Convert to template for cloning
```

### Configuration Components

| Component | Purpose | Value |
|-----------|---------|-------|
| VMID | Proxmox VM identifier | 103 |
| OS Type | Guest OS classification | l26 (Linux 2.6+) |
| Network | Bridge connection | vmbr0 (VirtIO) |
| Serial Port | Console access | Socket (headless) |
| CPU | Processor count | 2 cores |
| Memory | RAM allocation | 4096 MB (4GB) |
| Disk | Storage type & size | SCSI, 8GB, discard on |
| Boot | Primary boot device | scsi0 |

### Why These Settings?

- **l26 OS type:** Optimized for Linux kernel 2.6+
- **VirtIO network:** Better performance than e1000
- **Serial console:** Access router without VNC
- **4GB RAM:** Minimum for stable RouterOS operation
- **2 vCPU:** Sufficient for testing; scale up as needed
- **SCSI disk:** Better performance than IDE
- **Discard enabled:** Supports thin provisioning

## Verification

1. **Check VM exists:**
   ```bash
   qm list | grep 103
   ```
   Should show: `103 mikrotik running`

2. **Review VM configuration:**
   ```bash
   qm config 103
   ```

3. **Start VM if not running:**
   ```bash
   qm start 103
   ```

4. **Connect via serial console:**
   ```bash
   qm terminal 103
   ```

5. **Log in to MikroTik:**
   - Username: `admin`
   - Password: (blank, just press Enter)

6. **Verify RouterOS:**
   ```routeros
   /system resource print
   /interface print
   ```

7. **If template created, test clone:**
   ```bash
   qm clone 103 104 --name "mikrotik-clone"
   ```

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Download fails | Network issue or invalid URL | Check URL on MikroTik site, retry with `--retry 3` flag |
| `qm create` fails with VMID exists | VM ID 103 already in use | Choose different VMID: `qm list \| grep vmid` |
| Import fails: "import-from not found" | Incorrect path to CHR image | Use absolute path or check `$(pwd)/chr-*.img` exists |
| VM starts but no network | Bridge vmbr0 doesn't exist | Verify: `ip addr show vmbr0` or use different bridge |
| Serial console shows garbage | Serial port misconfigured | Add serial port via: `qm set 103 --serial0 socket` |
| VM won't start | Insufficient resources | Check free RAM: `free -h`; reduce cores or memory |
| Disk resize fails: partition full | Disk too small before resize | Grow partition in RouterOS: `/file print` check usage |
| Can't access RouterOS webUI | Firewall blocking port 80/443 | Check: `/ip firewall filter print`; Add allow rules |
| Template not cloning properly | Linked clone mode incompatible | Use full clone: `qm clone 103 104 --full` |
| SCSI controller missing | Hardware config incomplete | Verify: `qm config 103 \| grep scsihw` |
| VM restarts constantly | Insufficient memory | Increase to 8GB: `qm set 103 --memory 8192` |

## Advanced Options

### Create with custom VMID and larger disk:
```bash
qm create 200 --name "mikrotik-prod" --ostype l26
qm set 200 --net0 virtio,bridge=vmbr0
qm set 200 --memory 8192 --cores 4 --cpu host
qm set 200 --scsi0 local-lvm:0,import-from="$(pwd)/chr-7.11.2.img"
qm disk resize 200 scsi0 20G
```

### Add second network interface:
```bash
qm set 103 --net1 virtio,bridge=vmbr1
```

### Enable nested virtualization (for labs):
```bash
qm set 103 --cpu host,+vmx
```

### Configure disk caching:
```bash
qm set 103 --scsi0 local-lvm:0,cache=writeback
```

### Add cloud-init for automation:
```bash
qm set 103 --citype nocloud
qm set 103 --cicustom "user=local:snippets/init.yaml"
```

### Create multiple CHR instances:
```bash
for id in 110 111 112; do
  qm clone 103 $id --name "mikrotik-$id" --full
done
```

### Set memory hotplug for dynamic scaling:
```bash
qm set 103 --sockets 1 --numa 1
qm set 103 --memory 4096 --balloon 2048
```

### Add TPM device (for security features):
```bash
qm set 103 --tpmstate0 local-lvm
```

### Configure automatic snapshots:
```bash
qm set 103 --snapshots 1
qm snapshot 103 "initial-install" -description "Fresh CHR 7.11.2 install"
```

## Completion

✅ **MikroTik CHR installed in Proxmox!**

**Next steps:**
- Access RouterOS CLI via serial console
- Configure network interfaces and bridges
- Set up management IP address
- Create backup/snapshot of template
- Deploy cloned instances for testing
- Access WebUI at `http://<vm-ip>`
