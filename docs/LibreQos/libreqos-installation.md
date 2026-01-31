---
sidebar_position: 1
---

# 🚦 LibreQoS Setup

LibreQoS is a high‑performance traffic shaping platform for ISPs. This guide condenses the official documentation into a practical install and configuration checklist so you can deploy a shaper box quickly and safely.

:::info
This guide summarizes the official LibreQoS documentation. Always validate against the latest upstream release notes and requirements.
:::

## Prerequisites

- ✅ Ubuntu Server 20.04 / 22.04 / 24.04
- ✅ Dedicated NICs for shaping (2+ interfaces)
- ✅ Docker & Docker Compose (if using container tooling)
- ✅ `openssl` available for secret generation
- ✅ Physical access to BIOS/UEFI (or out‑of‑band access)

:::warning
Performance and stability depend on BIOS settings and proper NIC selection. Do not skip BIOS tuning.
:::

## BIOS / Host Preparation

### Disable Hyper‑Threading / SMT

Disable Hyper‑Threading (Intel) or SMT (AMD) in BIOS/UEFI. This improves XDP cpumap performance and reduces latency.

- **AMD path (typical):** Advanced → AMD CBS → CPU Common Options → Thread Enablement → SMT Control → Disabled
- **Intel path (typical):** Processor Options → Intel Hyper‑Threading → Disabled

Save changes and reboot.

### Disable SR‑IOV

Disable SR‑IOV for NICs used by LibreQoS to keep XDP in driver mode (higher performance and stability).

## Hypervisor Notes

### Proxmox

- Use **PCI passthrough** for NICs to exceed ~10Gbps.
- Enable **Multiqueue** and set it equal to the VM’s vCPU count.

### Hyper‑V

If bridging vNICs inside a VM, enable MAC spoofing on the host:

```powershell
Set-VMNetworkAdapter -VMName "YourLinuxVM" -MacAddressSpoofing On
```

## Configure the Shaping Bridge

Choose one of the two bridge options:

**Option A — Linux Bridge (Recommended)**
- Safer: continues passing traffic if `lqosd` fails.
- Best for Mellanox/ConnectX‑5 or virtual NICs.

**Option B — Bifrost XDP Bridge**
- Recommended for high‑speed Intel NICs with strong XDP support (40G‑100G).

### Netplan: Linux Bridge

Create a dedicated Netplan file so updates don’t overwrite your config:

```bash
sudo nano /etc/netplan/libreqos.yaml
```

Example (replace `ens19`/`ens20`):

```yaml
network:
  ethernets:
    ens19:
      dhcp4: no
      dhcp6: no
    ens20:
      dhcp4: no
      dhcp6: no
  bridges:
    br0:
      interfaces:
        - ens19
        - ens20
  version: 2
```

Apply:

```bash
sudo chmod 600 /etc/netplan/libreqos.yaml
sudo netplan apply
```

### Netplan: Bifrost XDP Bridge

Use the same Netplan file structure as above, then enable XDP bridge in `lqos.conf` later:

```bash
sudo chmod 600 /etc/netplan/libreqos.yaml
sudo netplan apply
```

## Install LibreQoS (v1.5+)

### Recommended: .deb Package

```bash
cd ~
sudo apt-get update
sudo apt-get upgrade
wget https://download.libreqos.com/libreqos_1.5-RC3.202512062019-1_amd64.deb
sudo apt install ./libreqos_1.5-RC3.202512062019-1_amd64.deb
```

### Developer Install (Not Recommended)

Use the Git install path only for development or custom builds.

## Initial Configuration (Setup Tool)

Run the interactive setup tool:

```bash
setup_tool
```

Notes:
- Use **arrow keys** + **Enter** to navigate.
- Press **Q** to quit without saving.
- If the tool closes unexpectedly, reinstall the package and re‑run the tool.

Configure these sections:

- **bridge_mode** — Linux Bridge (default) or XDP Bridge
- **interfaces** — `to_internet` and `to_network`
- **bandwidth** — upload/download in Mbps
- **ip_ranges** — all customer subnets (static and dynamic)
- **web_users** — admin/read‑only roles

## Post‑Install Validation

- WebUI: `http://your_shaper_ip:9123`
- Restart services after config changes:

```bash
sudo systemctl restart lqosd lqos_scheduler
```

## Manual Configuration (CLI)

Edit the main config file:

```bash
sudo nano /etc/lqos.conf
```

Key settings:
- `to_internet` and `to_network` must match physical interfaces
- `use_xdp_bridge = true` if you selected Bifrost XDP
- `uplink_bandwidth_mbps` and `downlink_bandwidth_mbps`

If shaping doesn’t work, swap interface order and restart services.

## Netflow (Optional)

Add a flows section in `/etc/lqos.conf`:

```ini
[flows]
flow_timeout_seconds = 30
netflow_enabled = true
netflow_port = 2055
netflow_ip = "100.100.100.100"
netflow_version = 5
do_not_track_subnets = ["192.168.0.0/16"]
```

## Network & Subscriber Data

LibreQoS shapes devices using two inputs:

- `network.json` — your network hierarchy (or `{}` for flat topology)
- `ShapedDevices.csv` — subscriber devices, plans, and parent nodes

If you use supported CRM/NMS integrations, these files are generated automatically. Otherwise, edit them manually and keep the **Circuit ID** unique per customer.

## Configuration Steps

### Option A: Terminal (Recommended)

1. **Confirm NIC roles**
  - Identify your **To Internet** and **To Network** interfaces.
  - Validate link status:
  ```bash
  ip link
  ethtool <iface>
  ```

2. **Apply bridge configuration**
  - Use the Netplan file created earlier.
  - Verify bridge state:
  ```bash
  networkctl status br0
  ```

3. **Install LibreQoS package**
  - Use the `.deb` method unless you are developing.
  - Confirm install:
  ```bash
  dpkg -l | grep libreqos
  ```

4. **Run the setup tool**
  - Set `bridge_mode`, `interfaces`, `bandwidth`, and `ip_ranges`.
  - Save and exit.

5. **Validate services**
  ```bash
  systemctl status lqosd
  systemctl status lqos_scheduler
  ```

### Option B: Web Interface

1. Open `http://your_shaper_ip:9123`
2. Complete **Configuration** → **General**
3. Validate **Interfaces**, **Bandwidth**, and **IP Ranges**
4. Save and restart services

## Understanding the Configuration

**Flow Diagram**

```
[BIOS Tuning] -> [Bridge Config] -> [LibreQoS Install] -> [lqos.conf] -> [ShapedDevices.csv]
```

**Components Table**

| Component | Purpose | Notes |
|---|---|---|
| Bridge | Pass-through shaping | Linux bridge or XDP | 
| `lqos.conf` | Main config | Interfaces + bandwidth | 
| `ShapedDevices.csv` | Subscriber shaping | Generated or manual | 
| `network.json` | Topology | Flat or hierarchical | 
| WebUI | Monitoring | Port 9123 | 

## Verification

1. **Bridge up**
  ```bash
  ip -br link show br0
  ```
2. **Services running**
  ```bash
  systemctl is-active lqosd lqos_scheduler
  ```
3. **WebUI reachable**
  - Open `http://your_shaper_ip:9123`
4. **Traffic shaping active**
  - Confirm bandwidth graphs update

## Troubleshooting

| Issue | Cause | Solution |
|---|---|---|
| No traffic flow | Bridge miswired | Swap `to_internet`/`to_network` |
| XDP not working | SR-IOV enabled | Disable SR-IOV in BIOS |
| Poor throughput | Hyperthreading on | Disable SMT/HT |
| WebUI not reachable | Service down | Restart `lqosd` |
| No shaping on clients | Missing CSV | Regenerate `ShapedDevices.csv` |
| High latency | Bridge type mismatch | Use Linux Bridge for stability |
| Netflow missing | Config incomplete | Add `[flows]` section |
| Interface down | Netplan error | Re-check YAML + `netplan apply` |
| CPU spikes | Too many queues | Right-size multiqueue and vCPU |
| Wrong speeds | Bandwidth set wrong | Update `uplink/downlink` in `lqos.conf` |
| Nodes not created | Integration disabled | Enable CRM/NMS integration |
| Devices missing | CSV format invalid | Validate CSV headers |

## Advanced Options

1. Use XDP bridge for high-speed Intel NICs
2. Separate management NIC from shaping NICs
3. Enable Netflow for analytics
4. Pin CPU cores for predictable latency
5. Use flat topology for small networks
6. Automate `ShapedDevices.csv` generation
7. Add backups for `/etc/lqos.conf`
8. Mirror configs to Git for change history
9. Add monitoring alerts for `lqosd`
10. Document interface mapping per node

## Related Guides

- [MikroTik PPP/Hotspot Sync](./mikrotik-ppp-hotspot-sync)
- [PCI Passthrough](../Proxmox/pci-passthrough-setup)
- [EFI Boot Fix](../Proxmox/efi-boot-fix)

## Completion

🎉 **LibreQoS is installed and ready for configuration!**

**Next steps:**
- Validate traffic flow across the bridge
- Confirm shaping via WebUI graphs
- Integrate CRM/NMS or generate `network.json` and `ShapedDevices.csv`
- Back up `/etc/lqos.conf` and documentation for the site
