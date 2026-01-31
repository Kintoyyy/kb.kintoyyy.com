---
sidebar_position: 2
---

# 🔄 User Sync

This guide shows how to keep LibreQoS `ShapedDevices.csv` synchronized with MikroTik PPP secrets and active hotspot users using an automated Python service. It runs continuously via systemd, calculates rate limits from profiles or comments, and preserves static CSV entries.

:::info
This setup is ideal for ISPs using MikroTik PPPoE/Hotspot with LibreQoS and needing hands‑off CSV updates every 10 minutes.
:::

## Prerequisites

- ✅ LibreQoS installed and running
- ✅ MikroTik RouterOS API access enabled
- ✅ Python 3.7+ on the LibreQoS host
- ✅ `routeros_api` Python package available
- ✅ Access to create systemd services

:::warning
If your CSV contains manually curated devices, mark them with `static` in the comment column to prevent overwrites.
:::

## Configuration Steps

### Option A: Terminal (Recommended)

1. **Prepare the system**
   ```bash
   sudo apt update
   sudo apt upgrade -y
   sudo apt install -y git python3 python3-pip python3-venv jq
   ```

2. **Clone the integration repo**
   ```bash
   git clone https://github.com/Kintoyyy/MikroTik-LibreQos-Integration
   cd MikroTik-LibreQos-Integration
   ```

3. **Install and enable the service**
   ```bash
   chmod +x install_updatecsv.sh
   sudo ./install_updatecsv.sh
   ```

4. **Edit configuration**
   ```bash
   sudo nano /opt/libreqos/src/config.json
   ```

5. **Restart the service**
   ```bash
   sudo systemctl restart updatecsv.service
   sudo systemctl status updatecsv.service
   ```

### Option B: Manual Service Setup

1. **Install Python dependencies**
   ```bash
   /opt/libreqos/venv/bin/pip install routeros_api
   ```

2. **Place the script and config** in `/opt/libreqos/src/` and create a systemd unit.

3. **Enable service**
   ```bash
   sudo systemctl enable updatecsv.service
   sudo systemctl start updatecsv.service
   ```

## Configuration (config.json)

### Basic Structure

```json
{
  "flat_network": false,
  "no_parent": false,
  "preserve_network_config": false,
  "routers": [
    {
      "name": "MikroTik-XYZ",
      "address": "192.168.88.1",
      "port": 8728,
      "username": "admin",
      "password": "password",
      "dhcp": {
        "enabled": true,
        "download_limit_mbps": 1000,
        "upload_limit_mbps": 1000,
        "dhcp_server": ["dhcp1", "dhcp2"]
      },
      "hotspot": {
        "enabled": true,
        "include_mac": true,
        "download_limit_mbps": 10,
        "upload_limit_mbps": 10
      },
      "pppoe": {
        "enabled": true,
        "per_plan_node": true
      }
    }
  ]
}
```

### Global Options

| Setting | Purpose | Example |
|---|---|---|
| `flat_network` | All devices under one flat node | `true` |
| `no_parent` | Disable parent nodes for all routers | `true` |
| `preserve_network_config` | Keep existing network.json unless not static | `false` |

### PPP Rate Limits in Profile Comments

You can define PPP limits in the **profile comment** as `download/upload`, e.g.:

```
100M/50M
```

The script calculates:
- **Min rates** = 50% of max
- **Max rates** = 115% of the profile limit

## How It Works

1. **Connects to RouterOS API** using `routeros_api`.
2. **Fetches PPP secrets** and **active hotspot users**.
3. **Normalizes data** (names, IPs, MACs, profile comments).
4. **Calculates rates** using profile comments or defaults.
5. **Preserves static entries** with `static` in the CSV comment column.
6. **Writes ShapedDevices.csv** on each 10‑minute cycle.

## MikroTik API Hardening

Create a read‑only API group and user:

```routeros
/user group add name=API_READ policy="read,sensitive,api,!policy,!local,!telnet,!ssh,!ftp,!reboot,!write,!test,!winbox,!password,!web,!sniff,!romon"
/user add name="libreqos_api" group=API_READ password="<StrongPassword>" address="<LibreQoS IP>" disabled=no
```

## CSV Output Format

Required columns:

```
Circuit ID, Circuit Name, Device ID, Device Name, Parent Node, MAC, IPv4, IPv6, Download Min Mbps, Upload Min Mbps, Download Max Mbps, Upload Max Mbps, Comment
```

Example entry:

```
STATIC123,StaticDevice,STATIC456,StaticDevice,,00:1A:2B:3C:4D:5E,192.168.1.100,,10,10,20,20,static
```

## Understanding the Configuration

**Flow Diagram**

```
[MikroTik API] -> [PPP/Hotspot Data] -> [Rate Calculation] -> [ShapedDevices.csv] -> [LibreQoS]
```

**Components Table**

| Component | Purpose | Notes |
|---|---|---|
| `routeros_api` | Reads RouterOS data | PPP + Hotspot sources |
| `config.json` | Central config | Multi‑router support |
| `ShapedDevices.csv` | LibreQoS input | Updated every 10 minutes |
| systemd service | Reliability | Auto‑start + restart |

## Verification

1. **Check service status**
   ```bash
   systemctl status updatecsv.service
   ```
2. **View logs**
   ```bash
   journalctl -u updatecsv.service --no-pager --since "1 hour ago"
   ```
3. **Confirm CSV updates**
   ```bash
   ls -lah /opt/libreqos/src/ShapedDevices.csv
   ```
4. **Validate JSON**
   ```bash
   jq . /opt/libreqos/src/config.json
   ```
5. **Confirm last update time**
   ```bash
   ls -l --time-style=long-iso /opt/libreqos/src/ShapedDevices.csv
   ```

## Troubleshooting

| Issue | Cause | Solution |
|---|---|---|
| Service not running | systemd unit disabled | `systemctl enable --now updatecsv.service` |
| CSV not updating | API credentials invalid | Recheck user/password/IP/port |
| Missing users | PPP/Hotspot disabled in config | Set `enabled: true` |
| Wrong speeds | Profile comment format invalid | Use `download/upload` format |
| Static entry overwritten | Missing `static` comment | Add `static` to CSV comment |
| API timeout | Firewall blocks API | Allow TCP 8728 to LibreQoS host |
| JSON parse error | Invalid config syntax | Validate with `jq .` |
| Duplicate devices | Multiple routers share IPs | Use unique IP ranges |
| No parent nodes | `no_parent` set true | Disable `no_parent` |
| Logs too noisy | Frequent updates | Increase interval in script |
| CSV permissions | Ownership incorrect | `chown -R root:root /opt/libreqos/src` |
| Hotspot MAC missing | `include_mac` false | Enable in hotspot config |
| Router unreachable | Firewall or routing | Allow TCP 8728 and verify routes |
| Missing PPP rates | Profile comment empty | Add `download/upload` in profile comment |
| CSV empty | No matching services | Enable DHCP/Hotspot/PPPoE sections |

## Advanced Options

1. Add multiple routers with unique names
2. Use `flat_network` for simple topologies
3. Enable per‑plan parent nodes with `per_plan_node`
4. Reserve static entries for critical devices
5. Increase sync interval for low‑change networks
6. Export logs to syslog or email
7. Use a separate API user with read‑only policy
8. Store credentials in a secure vault and template config
9. Validate CSV output with a CI check
10. Mirror CSV to a backup path after updates

## Related Guides

- [LibreQoS Setup](./libreqos-installation)
- [PCI Passthrough](../Proxmox/pci-passthrough-setup)
- [EFI Boot Fix](../Proxmox/efi-boot-fix)

## Completion

🎉 **LibreQoS user synchronization is active!**

**Next steps:**
- Confirm shaping results in LibreQoS WebUI
- Add static devices for critical infrastructure
- Document PPP profile naming and rate formats
