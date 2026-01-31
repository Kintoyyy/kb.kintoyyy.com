---
sidebar_position: 1
---

# ✅ Post-Install Configuration

Run the community-maintained post-installation script immediately after a fresh Proxmox VE install to configure best practices, enable enterprise repository alternatives, remove unnecessary packages, and apply security hardening. This one-command script eliminates manual configuration steps and ensures a production-ready Proxmox environment. Useful for rapid deployments, lab environments, and standardizing Proxmox setups across multiple nodes.

:::info
**What this does:**
- Removes subscription-required repository prompts
- Enables free community repositories
- Updates system packages to latest
- Disables unnecessary services
- Removes bloat packages
- Applies security hardening
- Configures sensible defaults
- Completes in 5-10 minutes
:::

## Prerequisites

- ✅ Fresh Proxmox VE installation (just completed setup)
- ✅ SSH access to Proxmox node (root login)
- ✅ Internet connectivity from Proxmox node
- ✅ curl or wget available on system
- ✅ At least 5GB free disk space
- ✅ No VMs/containers running (not required but safer)
- ✅ Proxmox VE 7.x or later

:::warning
**Post-install script considerations:**
- Script makes permanent repository changes
- Removes some packages (can reinstall if needed)
- Best run on fresh installs (not production systems)
- Requires ~5-10 minutes and one reboot
- Review script source before running if security-critical
- Backup configuration before running if customized
:::

## Configuration Steps

### Option A: Automated Script (Recommended)

1. **Connect to Proxmox node:**
   ```bash
   ssh root@proxmox-ip
   ```

2. **Run the post-install script:**
   ```bash
   var_version=12 bash -c "$(curl -fsSL https://raw.githubusercontent.com/community-scripts/ProxmoxVE/main/tools/pve/post-pve-install.sh)"
   ```

   :::tip
   The script runs interactively and shows progress. Press Enter to continue or 'y' to confirm prompts.
   :::

3. **Wait for completion:**
   - Script will show status for each step
   - May prompt for confirmation on package removals
   - Should complete in 5-10 minutes

4. **Reboot if prompted:**
   ```bash
   reboot
   ```

5. **Verify post-install completed:**
   ```bash
   cat /etc/apt/sources.list
   # Should NOT show "pam.proxmox.com" subscription repo
   ```

### Option B: Manual Review Before Running

1. **Download script to review first:**
   ```bash
   curl -fsSL https://raw.githubusercontent.com/community-scripts/ProxmoxVE/main/tools/pve/post-pve-install.sh > /tmp/post-pve-install.sh
   ```

2. **Review script contents:**
   ```bash
   less /tmp/post-pve-install.sh
   ```

3. **Run reviewed script:**
   ```bash
   bash /tmp/post-pve-install.sh
   ```

### Option C: Wget Alternative (if curl unavailable)

```bash
var_version=12 bash -c "$(wget -qO- https://raw.githubusercontent.com/community-scripts/ProxmoxVE/main/tools/pve/post-pve-install.sh)"
```

## Understanding the Configuration

### What the Script Changes

```
Fresh Proxmox Install
     ↓
Remove subscription repo prompts
     ↓
Enable community-enterprise repository
     ↓
Update all packages to latest
     ↓
Remove bloat packages (unused services)
     ↓
Apply security hardening (fail2ban, etc)
     ↓
Disable unnecessary background services
     ↓
Configure default settings
     ↓
Production-Ready Proxmox ✓
```

### Key Changes Made

| Change | Purpose |
|--------|---------|
| Remove `pam.proxmox.com` subscription repo | Eliminate error messages for free users |
| Add `pve-no-subscription` repository | Access free updates and packages |
| `apt update && apt full-upgrade` | Install latest security patches |
| Remove unnecessary packages | Reduce attack surface, free disk space |
| Configure firewall defaults | Basic security rules |
| Disable unused services | Reduce resource usage |
| Set sensible network settings | Optimize for lab/production |

## Verification

1. **Check repositories configured:**
   ```bash
   cat /etc/apt/sources.list
   ```
   Should show:
   ```
   deb http://ftp.debian.org/debian bookworm main contrib non-free
   deb http://security.debian.org/debian-security bookworm-security main
   ```

2. **Verify subscription repo removed:**
   ```bash
   ls /etc/apt/sources.list.d/
   ```
   Should NOT show `pve-enterprise.list`

3. **Check system is up to date:**
   ```bash
   apt list --upgradable
   ```
   Should show no upgradable packages

4. **Verify Proxmox UI accessible:**
   - Open browser: `https://proxmox-ip:8006`
   - Login with root credentials
   - No error messages about subscription

5. **Check firewall rules applied:**
   ```bash
   ufw status
   ```

6. **Verify services running:**
   ```bash
   systemctl status pve-cluster
   systemctl status pmgproxy
   ```

7. **Test package installation:**
   ```bash
   apt update
   apt install curl -y  # Should work without errors
   ```

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Script not found (404 error) | URL changed or GitHub down | Check [community-scripts](https://community-scripts.github.io/ProxmoxVE/) for current URL |
| Permission denied | Not running as root | Use `sudo` or login as root first |
| curl: command not found | curl not installed on system | Use wget instead: `bash -c "$(wget -qO- ...)"` |
| Script hangs during package removal | Package manager lock held | Wait 5 min or kill: `ps aux \| grep apt` |
| Post-install incomplete | Network interruption | Re-run script, it's idempotent (safe to run twice) |
| Still seeing subscription errors | Repository not properly updated | Run: `apt clean && apt update` |
| Proxmox UI won't start after script | Package conflict during upgrade | Reboot and check: `journalctl -u pve-cluster -n 50` |
| Script removed needed package | Over-aggressive pruning | Reinstall: `apt install package-name` |
| Cannot access Proxmox after script | Firewall blocking port 8006 | Check: `ufw allow 8006/tcp` |
| Broken package dependencies | Conflicting versions after upgrade | Run: `apt --fix-broken install` |
| Script timeout on slow connections | Network latency high | Run script again during off-peak hours |

## Advanced Options

### Run script with custom version:
```bash
var_version=13 bash -c "$(curl -fsSL https://raw.githubusercontent.com/community-scripts/ProxmoxVE/main/tools/pve/post-pve-install.sh)"
```

### Run script non-interactively (auto-confirm):
```bash
export SKIP_PROMPTS=1
bash -c "$(curl -fsSL https://raw.githubusercontent.com/community-scripts/ProxmoxVE/main/tools/pve/post-pve-install.sh)"
```

### Download script to local repo for offline installs:
```bash
# On Proxmox node with internet:
curl -o /var/www/html/post-pve-install.sh https://raw.githubusercontent.com/community-scripts/ProxmoxVE/main/tools/pve/post-pve-install.sh

# On offline Proxmox:
bash http://repo-server/post-pve-install.sh
```

### Add additional repositories after script:
```bash
# Add pve-testing repository (unstable, for testing only):
echo "deb http://download.proxmox.com/debian/pve bookworm pve-testing" | \
  tee /etc/apt/sources.list.d/pve-testing.list
apt update
```

### Configure high-availability after post-install:
```bash
pvecm create mycluster  # Initialize cluster
pvecm add proxmox-node-2-ip  # Add second node
```

### Enable automatic security updates:
```bash
apt install unattended-upgrades -y
dpkg-reconfigure -plow unattended-upgrades
```

### Create post-install backup snapshot:
```bash
# After successful post-install, backup config:
tar -czf /root/proxmox-post-install-backup.tar.gz /etc
```

### Monitor script execution in real-time (if backgrounded):
```bash
tail -f /var/log/apt/history.log
```

## Related Guides

- [Install MikroTik CHR](./install-mikrotik-chr) - Next step after post-install
- [OpenWRT LXC Auto Creation](./openwrt-lxc-auto-creation) - Next steps for container workloads

## Completion

✅ **Proxmox post-install configured!**

**Next steps:**
- Access Proxmox UI without subscription errors
- Create first VM or container
- Configure storage pools
- Set up backup schedules
- Customize hardware settings per workload
- Document your cluster configuration
