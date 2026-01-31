---
sidebar_position: 5
---

# ⚙️ PCI Passthrough

Set up a clean Proxmox host for PCIe passthrough with stable IOMMU groups and reliable NIC assignment. This guide focuses on BIOS/UEFI tuning, host configuration, and verification steps to ensure devices are ready for VM passthrough.

:::info
This guide is optimized for Proxmox VE 8.x on Debian 12 and supports both Intel VT-d and AMD-Vi platforms.
:::

## Prerequisites

- ✅ Proxmox VE installed and reachable via SSH
- ✅ BIOS/UEFI access to the host system
- ✅ Root shell access on the Proxmox node
- ✅ Hardware with VT-d (Intel) or AMD-Vi (AMD)
- ✅ Target device(s) you plan to passthrough

:::warning
Changing IOMMU/ACS settings affects device grouping. Plan maintenance windows and validate before assigning devices to production VMs.
:::

## Configuration Steps

### Option A: Terminal (Recommended)

#### 1) BIOS / UEFI tuning

- **Enable virtualization extensions**
  - Intel: VT-d
  - AMD: AMD‑Vi
- **Set UEFI boot priority**
- **Disable CSM** if required
- **Optional:** enable ACS support for better IOMMU isolation

#### 2) Identify NICs and hardware

```bash
ls /sys/class/net
lspci | grep -E -i --color 'network|ethernet'
```

Install helper tools:

```bash
apt update && apt upgrade -y
apt install lshw inxi hwinfo -y
```

Quick inspections:

```bash
inxi -N
lshw -c network -short
hwinfo --short --netcard
lspci -k | grep -A 3 "Ethernet"
```

#### 3) Enable IOMMU in GRUB

Edit GRUB:

```bash
nano /etc/default/grub
```

Set the kernel line:

- **Intel**
  ```bash
  GRUB_CMDLINE_LINUX_DEFAULT="quiet intel_iommu=on iommu=pt"
  ```
- **AMD**
  ```bash
  GRUB_CMDLINE_LINUX_DEFAULT="quiet amd_iommu=on iommu=pt"
  ```

Apply:

```bash
update-grub
```

#### 4) ZFS boot only (optional)

```bash
nano /etc/kernel/cmdline
```

Examples:

```bash
root=ZFS=rpool/ROOT/pve-1 boot=zfs quiet intel_iommu=on iommu=pt
```

```bash
root=ZFS=rpool/ROOT/pve-1 boot=zfs quiet amd_iommu=on iommu=pt
```

Apply:

```bash
pve-efiboot-tool refresh
```

#### 5) Load VFIO modules

```bash
echo -e "vfio\nvfio_iommu_type1\nvfio_pci\nvfio_virqfd" >> /etc/modules
cat /etc/modules
update-initramfs -u -k all
```

#### 6) Reboot

```bash
reboot
```

#### 7) Verify IOMMU status

```bash
dmesg | grep -e DMAR -e IOMMU
```

Expected:

- `DMAR: IOMMU enabled`
- `AMD-Vi: Interrupt remapping enabled` or `DMAR-IR: Enabled IRQ remapping`

#### 8) Inspect PCI devices and IOMMU groups

```bash
pvesh get /nodes/<your-node-name>/hardware/pci --pci-class-blacklist ""
```

Example:

```bash
pvesh get /nodes/pve/hardware/pci --pci-class-blacklist ""
```

#### 9) (Optional) Enable ACS override

Use only if devices are grouped too tightly:

```bash
sed -i 's/\(GRUB_CMDLINE_LINUX_DEFAULT\)="[^"]*"/\1="quiet intel_iommu=on iommu=pt pcie_acs_override=downstream,multifunction"/' /etc/default/grub
update-grub
reboot
```

#### 10) (Optional) Blacklist NIC driver for passthrough

Identify the driver:

```bash
lspci -k | grep -A 3 "Ethernet"
```

Blacklist (example):

```bash
echo "blacklist ixgbe" >> /etc/modprobe.d/blacklist.conf
update-initramfs -u
reboot
```

After reboot, you should **not** see a driver in use for the passthrough NIC.

### Option B: Proxmox Web UI

1. **Reboot into BIOS/UEFI** and enable VT‑d/AMD‑Vi, disable CSM, and optionally enable ACS.
2. **Confirm hardware** in Proxmox: Node → System → PCI Devices.
3. **Check kernel command line** under Node → System → Kernel.
4. **Reboot** the node after changes and verify in the UI that devices show IOMMU grouping.

## Understanding the Configuration

**Flow Diagram**

```
[BIOS/UEFI] -> [Kernel IOMMU Params] -> [VFIO Modules] -> [IOMMU Groups] -> [VM Passthrough]
```

**Components Table**

| Component | Purpose | Notes |
|---|---|---|
| VT‑d / AMD‑Vi | Enables hardware virtualization for PCIe | Must be enabled in BIOS |
| IOMMU kernel args | Activates IOMMU in Linux | `intel_iommu=on` or `amd_iommu=on` |
| VFIO modules | Enables passthrough | Required for PCIe devices |
| IOMMU groups | Device isolation boundary | Better isolation = safer passthrough |
| ACS override | Attempts to split groups | Use only if required |

## Verification

1. **Check IOMMU enabled**
   ```bash
   dmesg | grep -e DMAR -e IOMMU
   ```
2. **Verify PCI list**
   ```bash
   pvesh get /nodes/<your-node-name>/hardware/pci --pci-class-blacklist ""
   ```
3. **Confirm driver unbound** (if blacklisted)
   ```bash
   lspci -k | grep -A 3 "Ethernet"
   ```
4. **Attach device to VM** and boot to confirm detection in guest OS

## Troubleshooting

| Issue | Cause | Solution |
|---|---|---|
| IOMMU not enabled | BIOS flag off or kernel args missing | Enable VT‑d/AMD‑Vi and set GRUB args |
| Devices not isolated | IOMMU groups too broad | Enable ACS in BIOS or use ACS override |
| NIC still bound to host | Driver not blacklisted | Add to `/etc/modprobe.d/blacklist.conf` and rebuild initramfs |
| VM won’t start with passthrough | Device already in use | Ensure host driver is unbound |
| Poor throughput | No passthrough or multiqueue off | Use PCI passthrough and enable multiqueue |
| Proxmox UI missing devices | IOMMU inactive | Verify dmesg and kernel args |
| Network drops on bridge | Wrong interface mapping | Recheck `to_internet`/`to_network` equivalents |
| ACS override ignored | Kernel line not updated | Re-run `update-grub` and reboot |
| ZFS boot ignoring args | `/etc/kernel/cmdline` not updated | Edit cmdline and run `pve-efiboot-tool refresh` |
| IOMMU groups still large | Platform limitation | Consider alternate motherboard or NICs |
| VM doesn’t see device | Incorrect PCI assignment | Re-check PCI ID and VM hardware config |
| Host hangs on boot | Invalid GRUB syntax | Restore `/etc/default/grub` and re-run `update-grub` |

## Advanced Options

1. **Enable hugepages** for performance tuning
2. **Use PCIe ACS override** only for lab/low‑risk environments
3. **Pin vCPUs** to isolate CPU resources
4. **Separate management NIC** from passthrough NICs
5. **Use SR‑IOV VFs** for multiple VMs (if supported)
6. **Bind devices by PCI ID** using `vfio-pci.ids`
7. **Use `iommu=pt`** for better performance on some hosts
8. **Create a passthrough template VM** to speed deployment
9. **Use Proxmox hookscripts** for PCI reset logic
10. **Document PCI IDs** and IOMMU groups for maintenance

## Related Guides

- [Post-Install Configuration](./post-install-configuration)
- [Install MikroTik CHR](./install-mikrotik-chr)
- [OpenWRT LXC Auto Creation](./openwrt-lxc-auto-creation)
- [GenieACS Auto Installer](./genieacs-auto-installer)

## Completion

🎉 **PCI passthrough readiness complete!**

**Next steps:**
- Assign PCI devices to VMs
- Validate throughput and latency
- Back up Proxmox host configuration
- Document IOMMU groups for future maintenance
