---
sidebar_position: 6
---

# 🧩 PCIe Fix

When a VM fails with **“QEMU exited with code 1”** during PCIe passthrough, it is often tied to **RMRR/DMAR restrictions**, legacy BIOS boot mode, or missing kernel flags. This guide provides a structured path to resolve passthrough failures on Proxmox VE using supported kernel settings and (when necessary) the relaxable‑RMRR kernel workflow.

:::info
Modern Proxmox kernels already include the relaxable‑RMRR patch (6.2.16-13-pve and newer). You still must enable the kernel option to activate it.
:::

## Prerequisites

- ✅ Proxmox VE 7.4+ (Debian 12 / 11)
- ✅ BIOS/UEFI access (prefer UEFI over Legacy)
- ✅ VT-d (Intel) or AMD‑Vi enabled
- ✅ PCIe device that supports passthrough
- ✅ Root shell access on the node

:::warning
Legacy BIOS and poorly isolated IOMMU groups can block PCIe passthrough. Always plan downtime and validate changes after each step.
:::

## Configuration Steps

### Option A: Terminal (Recommended)

#### 1) Confirm firmware mode

If possible, switch the host to **UEFI**. Legacy BIOS often complicates passthrough behavior.

#### 2) Verify IOMMU is active

```bash
dmesg | grep -e DMAR -e IOMMU
```

Expected examples:
- `DMAR: IOMMU enabled`
- `AMD-Vi: Interrupt remapping enabled`

#### 3) Enable relaxable‑RMRR (Intel only)

Edit GRUB:

```bash
nano /etc/default/grub
```

Update the kernel line:

```bash
GRUB_CMDLINE_LINUX_DEFAULT="quiet intel_iommu=on,relax_rmrr iommu=pt intremap=no_x2apic_optout"
```

Apply and reboot:

```bash
update-grub
reboot
```

Verify the option is active:

```bash
dmesg | grep 'Intel-IOMMU'
```

Expected output similar to:

```
DMAR: Intel-IOMMU: assuming all RMRRs are relaxable
```

#### 4) (Proxmox 7.4 / Kernel 5.15 only) Use patched kernel

If you are on kernel **5.15** and need relaxable‑RMRR, install a patched kernel release and reboot into it.

General steps:

1. Download the appropriate kernel `.deb` packages from the releases page.
2. Install them with:
   ```bash
   dpkg -i *.deb
   ```
3. Reboot and confirm your kernel ends with `pve-relaxablermrr`:
   ```bash
   uname -r
   ```
4. Enable `relax_rmrr` in GRUB as shown above.

#### 5) Confirm PCI devices and IOMMU groups

```bash
pvesh get /nodes/<your-node>/hardware/pci --pci-class-blacklist ""
```

#### 6) Retry VM passthrough

After the above changes, attach the PCIe device to the VM and boot again.

### Option B: Proxmox Web UI

1. Enable VT‑d/AMD‑Vi and UEFI in BIOS/UEFI.
2. Reboot the host.
3. Use **Node → System → PCI Devices** to confirm the device appears.
4. Add PCI device to VM hardware and boot.
5. If it still fails, return to Option A and enable `relax_rmrr` for Intel.

## Understanding the Configuration

**Flow Diagram**

```
[UEFI + VT-d/AMD-Vi]
      ↓
[IOMMU Enabled in Kernel]
      ↓
[relax_rmrr (Intel only)]
      ↓
[Clean IOMMU Groups]
      ↓
[VM PCIe Passthrough]
```

**Components Table**

| Component | Purpose | Notes |
|---|---|---|
| UEFI Boot | Stable firmware path | Preferred over Legacy BIOS |
| IOMMU | Enables device isolation | Required for passthrough |
| relax_rmrr | Allows restricted PCI devices | Intel platforms only |
| Patched kernel | Needed for 5.15 series | Not required on 6.2.16+ |
| IOMMU groups | Isolation boundary | Better split = safer |

## Verification

1. **Kernel flags active**
   ```bash
   cat /proc/cmdline
   ```
2. **IOMMU enabled**
   ```bash
   dmesg | grep -e DMAR -e IOMMU
   ```
3. **Relaxable RMRR active (Intel)**
   ```bash
   dmesg | grep 'Intel-IOMMU'
   ```
4. **VM boots with PCI device attached**

## Troubleshooting

| Issue | Cause | Solution |
|---|---|---|
| QEMU exited with code 1 | RMRR restriction | Enable `relax_rmrr` or use patched kernel on 5.15 |
| Device invisible in VM | IOMMU off | Enable VT‑d/AMD‑Vi and GRUB args |
| Passthrough fails on Legacy BIOS | Firmware mismatch | Switch host to UEFI |
| Device in shared IOMMU group | Poor isolation | Enable ACS or change hardware |
| No `Intel-IOMMU` message | Flag missing | Recheck GRUB + `update-grub` |
| Kernel doesn’t include patch | Old kernel | Upgrade Proxmox kernel or use patched 5.15 |
| VM boots but device not functional | Driver issues | Install guest drivers for the device |
| Host uses device driver | Not unbound | Blacklist driver and rebuild initramfs |
| ACS override ignored | Kernel args not applied | Reboot after `update-grub` |
| Passthrough unstable | Platform limitation | Use supported hardware/NICs |
| VM won’t start after changes | GRUB typo | Fix `/etc/default/grub` and re-run `update-grub` |
| IOMMU groups unchanged | BIOS limits | Toggle ACS in BIOS or adjust hardware |

## Advanced Options

1. Enable **ACS override** only if you understand the risk
2. Pin vCPUs to reduce latency jitter
3. Use **iommu=pt** for performance
4. Isolate host devices from passthrough NICs
5. Use separate management NICs
6. Keep kernel and firmware updated
7. Test with a small VM before production
8. Document IOMMU groups after every change
9. Use `vfio-pci.ids` to bind by device ID
10. Maintain rollback kernel in GRUB

## Related Guides

- [PCI Passthrough](./pci-passthrough-setup)
- [Post-Install Configuration](./post-install-configuration)
- [Install MikroTik CHR](./install-mikrotik-chr)
- [OpenWRT LXC Auto Creation](./openwrt-lxc-auto-creation)

## References

- Proxmox forum discussion: https://forum.proxmox.com/threads/qemu-exited-with-code-1-pcie-passthrough-not-working.146297/
- Proxmox VE Kernel Builder: https://github.com/brunokc/pve-kernel-builder

## Completion

✅ **PCIe passthrough failure resolved!**

**Next steps:**
- Attach PCI devices and validate in the guest OS
- Monitor stability after changes
- Document kernel versions and boot args
