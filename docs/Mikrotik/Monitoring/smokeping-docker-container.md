---
sidebar_position: 3
---

# 🐳 Smokeping Container

Deploy Smokeping network latency monitoring tool as a Docker container on MikroTik RouterOS. Smokeping continuously pings multiple targets and generates visual graphs showing network latency patterns, packet loss, and jitter over time. Running Smokeping in a container isolates the monitoring service while providing web-based access to historical performance data. Useful for ISPs tracking uptime, diagnosing network issues, monitoring SLA compliance, and identifying intermittent connectivity problems.

:::info
**What this does:**
- Installs Smokeping as a Docker container on RouterOS
- Creates isolated veth network interface for container
- Mounts persistent storage for config and data
- Configures timezone and user permissions
- Exposes Smokeping web UI via NAT (port 80)
- Enables continuous network latency monitoring
:::

## Prerequisites

- ✅ MikroTik RouterOS v7.4+ with container support
- ✅ Extra storage (USB, additional disk) for container images
- ✅ Internet access to pull Docker images from registry
- ✅ At least 512MB RAM available for container
- ✅ Understanding of Docker containers basics
- ✅ Router IP address for accessing web UI
- ✅ RouterOS container package installed

:::warning
**Docker container considerations:**
- Containers require RouterOS v7.4+ (not available on older hardware)
- Container storage must be on separate disk/partition (not router's main storage)
- Pulling images requires internet and takes several minutes
- Smokeping data grows over time—allocate 1-5GB storage
- Web UI exposed on port 80 (adjust if port conflict)
- Container restart required after configuration changes
- NAT rules depend on your WAN interface name
:::

## Configuration Steps

### Option A: Terminal Configuration

1. **Access the router terminal:**
   ```bash
   ssh admin@router-ip
   ```

2. **Create mount points for Smokeping data:**
   ```routeros
   /container mounts
   add dst="/config" name=MOUNT_SMOKE_CONFIG src="/smokeping/config"
   add dst="/data" name=MOUNT_SMOKE_DATA src="/smokeping/data"
   ```

   :::tip
   Mount paths use `/smokeping/config` and `/smokeping/data` on your router's disk. Adjust if needed.
   :::

3. **Create bridge for container networking:**
   ```routeros
   /interface bridge
   add name=containers
   ```

4. **Create veth interface for Smokeping:**
   ```routeros
   /interface veth
   add address=172.17.0.3/24 gateway=172.17.0.1 name=veth-smokeping
   ```

5. **Create environment variable list:**
   ```routeros
   /container envs
   add key=TZ name=ENV_SMOKE value=Asia/Manila
   add key=PUID name=ENV_SMOKE value=1000
   add key=PGID name=ENV_SMOKE value=1000
   add key=CACHE_DIR name=ENV_SMOKE value="/tmp"
   ```

   :::tip
   Change `TZ=Asia/Manila` to your timezone. Find valid timezones [here](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones).
   :::

6. **Configure container registry:**
   ```routeros
   /container config
   set registry-url="https://registry-1.docker.io" tmpdir="disk1/tmp"
   ```

7. **Create Smokeping container:**
   ```routeros
   /container
   add envlist=ENV_SMOKE interface=veth-smokeping logging=yes \
       mounts=MOUNT_SMOKE_CONFIG,MOUNT_SMOKE_DATA \
       name="smokeping:latest" \
       root-dir="disk1/images/smokeping" \
       workdir="/"
   ```

   :::tip
   Replace `disk1` with your actual disk/partition name. Check with `/disk print`.
   :::

8. **Add veth to bridge:**
   ```routeros
   /interface bridge port
   add bridge=containers interface=veth-smokeping
   ```

9. **Assign IP to bridge:**
   ```routeros
   /ip address
   add address=172.17.0.1/24 interface=containers network=172.17.0.0
   ```

10. **Configure NAT for internet access:**
    ```routeros
    /ip firewall nat
    add action=masquerade chain=srcnat out-interface=ether1-UPLINK
    add action=masquerade chain=srcnat src-address=172.17.0.0/24
    ```

    :::tip
    Replace `ether1-UPLINK` with your actual WAN/uplink interface name.
    :::

11. **Add port forwarding to access Smokeping web UI:**
    ```routeros
    /ip firewall nat
    add action=dst-nat chain=dstnat dst-address=10.15.0.165 \
        dst-port=80 protocol=tcp to-addresses=172.17.0.3 to-ports=80
    ```

    :::tip
    Replace `10.15.0.165` with your router's IP address. Access Smokeping at `http://10.15.0.165`.
    :::

12. **Start the container:**
    ```routeros
    /container start [find name="smokeping:latest"]
    ```

13. **Verify container status:**
    ```routeros
    /container print
    /container shell [find name="smokeping:latest"]
    ```

### Option B: Winbox Configuration

1. **Create mounts:**
   - Navigate to Container > Mounts
   - Click **+**
   - Name: `MOUNT_SMOKE_CONFIG`
   - Source: `/smokeping/config`
   - Destination: `/config`
   - Click **OK**
   - Repeat for `MOUNT_SMOKE_DATA` (src: `/smokeping/data`, dst: `/data`)

2. **Create bridge:**
   - Navigate to Interface > Bridge
   - Click **+**
   - Name: `containers`
   - Click **OK**

3. **Create veth interface:**
   - Navigate to Interface > Veth
   - Click **+**
   - Name: `veth-smokeping`
   - Address: `172.17.0.3/24`
   - Gateway: `172.17.0.1`
   - Click **OK**

4. **Configure environment variables:**
   - Navigate to Container > Envs
   - Add four variables:
     - Name: `ENV_SMOKE`, Key: `TZ`, Value: `Asia/Manila`
     - Name: `ENV_SMOKE`, Key: `PUID`, Value: `1000`
     - Name: `ENV_SMOKE`, Key: `PGID`, Value: `1000`
     - Name: `ENV_SMOKE`, Key: `CACHE_DIR`, Value: `/tmp`

5. **Configure container registry:**
   - Navigate to Container > Config
   - Registry URL: `https://registry-1.docker.io`
   - Temp Dir: `disk1/tmp`
   - Click **Apply**

6. **Create container:**
   - Navigate to Container
   - Click **+**
   - Name: `smokeping:latest`
   - Root Dir: `disk1/images/smokeping`
   - Interface: `veth-smokeping`
   - Envlist: `ENV_SMOKE`
   - Mounts: `MOUNT_SMOKE_CONFIG,MOUNT_SMOKE_DATA`
   - Logging: ✓
   - Click **OK**

7. **Add bridge port:**
   - Navigate to Interface > Bridge > Ports
   - Click **+**
   - Bridge: `containers`
   - Interface: `veth-smokeping`
   - Click **OK**

8. **Assign IP to bridge:**
   - Navigate to IP > Addresses
   - Click **+**
   - Address: `172.17.0.1/24`
   - Interface: `containers`
   - Click **OK**

9. **Configure NAT:**
   - Navigate to IP > Firewall > NAT
   - Add three rules:
     - Chain: `srcnat`, Out Interface: `ether1-UPLINK`, Action: `masquerade`
     - Chain: `srcnat`, Src Address: `172.17.0.0/24`, Action: `masquerade`
     - Chain: `dstnat`, Dst Address: `10.15.0.165`, Dst Port: `80`, Protocol: `tcp`, Action: `dst-nat`, To Addresses: `172.17.0.3`, To Ports: `80`

10. **Start container:**
    - Navigate to Container
    - Select `smokeping:latest`
    - Click **Start**

## Understanding the Configuration

### Container Architecture

```
Router (10.15.0.165)
     ↓
┌──────────────────────────────────────────┐
│  Bridge: containers (172.17.0.1/24)      │
│                                          │
│   ┌──────────────────────────────────┐  │
│   │ veth-smokeping (172.17.0.3/24)   │  │
│   │                                  │  │
│   │  ┌────────────────────────────┐ │  │
│   │  │ Smokeping Container        │ │  │
│   │  │ - Monitors network targets │ │  │
│   │  │ - Web UI on port 80        │ │  │
│   │  │ - Persistent storage:      │ │  │
│   │  │   /config (settings)       │ │  │
│   │  │   /data (graphs)           │ │  │
│   │  └────────────────────────────┘ │  │
│   └──────────────────────────────────┘  │
└──────────────────────────────────────────┘
     ↓ NAT Port Forwarding
External access: http://10.15.0.165
```

### Traffic Flow

```
User accesses http://10.15.0.165:80
     ↓
Router receives on WAN interface
     ↓
DST-NAT rule: 10.15.0.165:80 → 172.17.0.3:80
     ↓
Packet forwarded to veth-smokeping
     ↓
Smokeping container responds with web page
     ↓
Response sent back through bridge → router → user
```

### Component Relationships

| Component | Purpose |
|-----------|---------|
| Container Mounts | Persistent storage for Smokeping config and data |
| Bridge (containers) | Network segment for all containers |
| Veth Interface | Virtual ethernet connecting container to bridge |
| Environment Variables | Container settings (timezone, user IDs, cache) |
| Registry Config | Docker Hub URL for pulling images |
| NAT Masquerade | Allows container internet access |
| NAT DST-NAT | Port forwarding for web UI access |

## Configuring Monitoring Targets

After container deployment, configure Smokeping targets to monitor network latency.

### Step 1: Create Targets Configuration File

On your router, create the Smokeping targets file:

```bash
sudo tee /config/Targets > /dev/null <<'EOF'
*** Targets ***
probe = FPing
menu = Top
title = Network Latency Grapher
remark = Script by github.com/Kintoyyy.

+ Local
menu = Local
title = Local Network (ICMP)
++ LocalMachine
menu = Local Machine
title = This host
host = localhost

+ DNS
menu = DNS latency
title = DNS latency (ICMP)
++ Google1
title = Google DNS 8.8.8.8
host = 8.8.8.8
++ Google2
title = Google DNS 8.8.4.4
host = 8.8.4.4
++ Cloudflare1
title = Cloudflare DNS 1.1.1.1
host = 1.1.1.1
++ Cloudflare2
title = Cloudflare DNS 1.0.0.1
host = 1.0.0.1
++ Quad9
title = Quad9 DNS
host = 9.9.9.9
++ OpenDNS
title = OpenDNS
host = 208.67.222.222

+ HTTP
menu = HTTP latency
title = HTTP latency (ICMP)
++ Facebook
host = facebook.com
++ Youtube
host = youtube.com
++ TikTok
host = tiktok.com
++ Instagram
host = instagram.com
++ Gcash
host = m.gcash.com
++ Discord
host = discord.com
++ Google
host = google.com
++ Cloudflare
host = cloudflare.com
++ Amazon
host = amazon.com
++ Netflix
host = www.netflix.com

+ CDN
menu = CDN Providers
title = Major CDN Providers
++ CloudflareSpeed
host = speed.cloudflare.com
++ FacebookCDN
host = static.xx.fbcdn.net
++ FacebookMobileCDN
host = z-m-static.xx.fbcdn.net
++ Fastly
host = global.ssl.fastly.net
++ Highwinds
host = hwcdn.net
++ CDN77
host = cdn77.com
++ SteamCDN
host = steamcdn-a.akamaihd.net

+ Cloud
menu = Cloud Services
title = Major Cloud Providers
++ AWSS3
host = s3.amazonaws.com
++ AWSEC2
host = ec2.amazonaws.com
++ GCPCompute
host = compute.googleapis.com
++ DigitalOcean
host = digitaloceanspaces.com
++ Linode
host = linode.com
EOF
```

### Step 2: Reload Smokeping Configuration

Access the container shell and reload configuration:

```routeros
/container shell number=1
```

Inside the container:

```bash
smokeping --reload
```

Or use the shorter command:

```bash
smokeping -reload
```

Exit the shell:

```bash
exit
```

### Target Categories Explained

| Category | Purpose | Targets |
|----------|---------|---------|
| **Local** | Router itself | localhost |
| **DNS** | DNS resolver latency | Google, Cloudflare, Quad9, OpenDNS |
| **HTTP** | Popular websites | Facebook, YouTube, TikTok, Instagram, GCash, Discord |
| **CDN** | Content delivery networks | Cloudflare, Facebook CDN, Fastly, Steam |
| **Cloud** | Cloud service providers | AWS, GCP, DigitalOcean, Linode |

### Customizing Targets

Edit the Targets file to add your own monitoring targets:

```bash
# On router, edit the file
/file edit /smokeping/config/Targets
```

**Add custom target syntax:**
```
++ CustomTarget
menu = My Custom Target
title = Description of target
host = your-ip-or-hostname.com
```

**Remove a target:** Delete or comment out (add `#`) the target section.

**Change ping frequency:** Edit probe settings in main Smokeping config.

After any changes, always reload:
```routeros
/container shell number=1
smokeping --reload
```

## Verification

1. **Check container is running:**
   ```routeros
   /container print
   ```
   Should show: `smokeping:latest` with status `running`

2. **Verify mounts exist:**
   ```routeros
   /container mounts print
   ```

3. **Check veth interface:**
   ```routeros
   /interface veth print
   /ip address print where interface=veth-smokeping
   ```

4. **Test container shell access:**
   ```routeros
   /container shell [find name="smokeping:latest"]
   ```

5. **Check container logs:**
   ```routeros
   /log print where topics~"container"
   ```

6. **Verify bridge connectivity:**
   ```bash
   ping 172.17.0.3
   ```

7. **Test web UI access:**
   - Open browser: `http://10.15.0.165` (or your router IP)
   - Should show Smokeping dashboard with graphs
   - Check categories: Local, DNS, HTTP, CDN, Cloud

8. **Verify targets are being monitored:**
   - In web UI, click on target categories
   - Graphs should show latency data (wait 5-10 minutes for initial data)

8. **Check NAT rules active:**
   ```routeros
   /ip firewall nat print stats
   ```

9. **Verify container can access internet:**
   ```routeros
   /container shell [find name="smokeping:latest"]
   # Inside container:
   ping 8.8.8.8
   ```

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Container won't start | Insufficient RouterOS version | Upgrade to RouterOS v7.4+: `/system package update check-for-updates` |
| Image pull fails | No internet or registry unreachable | Check internet: `/ping 8.8.8.8` and verify registry URL |
| Disk full error | Container storage on main disk | Use separate disk: `/disk print` and adjust `root-dir=` path |
| Container starts then stops | Mount directories don't exist | Create manually: `/file print` and mkdir on disk |
| Can't access web UI | Port forwarding misconfigured | Verify NAT rule destination matches router IP |
| Web UI shows 404 | Container still starting | Wait 2-3 minutes, check: `/container print` for stor remove unused targets |
| Image won't download | Registry URL wrong | Set correctly: `/container config set registry-url="https://registry-1.docker.io"` |
| No graphs showing | Targets file missing or wrong format | Verify: `/file print` shows Targets file, check syntax |
| Smokeping won't reload | Container shell not accessible | Restart container: `/container stop [find name="smokeping:latest"]` then start
| Container has no internet | NAT masquerade missing | Add: `/ip firewall nat add action=masquerade chain=srcnat src-address=172.17.0.0/24` |
| Timezone wrong in graphs | TZ environment variable incorrect | Update: `/container envs set [find key=TZ] value=Your/Timezone` |
| Data not persisting | Mounts not attached to container | Verify mounts in container config: `/container print detail` |
| Container CPU high | Too many targets configured | Edit Smokeping config, reduce ping frequency |
| Image won't download | Registry URL wrong | Set correctly: `/container config set registry-url="https://registry-1.docker.io"` |

## Advanced Options

### Add more containers on same bridge:
```routeros
/interface veth add address=172.17.0.4/24 gateway=172.17.0.1 name=veth-container2
/interface bridge port add bridge=containers interface=veth-container2
```

### Change Smokeping web UI port to 8080:
```routeros
/ip firewall nat remove [find dst-port=80 to-ports=80]
/ip firewall nat add action=dst-nat chain=dstnat dst-address=10.15.0.165 \
    dst-port=8080 protocol=tcp to-addresses=172.17.0.3 to-ports=80
```

### Enable HTTPS access (if Smokeping configured):
``Add custom target to existing Targets file
/container shell number=1
# Inside container:
echo "++ MyISP" >> /config/Targets
echo "title = My ISP Gateway" >> /config/Targets
echo "host = your-gateway-ip" >> /config/Targets
smokeping --reload
exit
```

### Reload Smokeping after configuration changes:
```routeros
/container shell number=1
smokeping --reload
exit
# Edit config on router's disk
/file edit /smokeping/config/Targets
# Add targets like:
# + target1
# menu = Target 1
# title = Ping to 8.8.8.8
# host = 8.8.8.8
```

### Backup Smokeping data:
```routeros
/file print
/tool fetch url="http://172.17.0.3/smokeping/data.tar.gz" dst-path="/backup/smokeping-data.tar.gz"
```

### Set container resource limits:
```routeros
/container set [find name="smokeping:latest"] cpu=1 memory-limit=256M
```

### Auto-start container on boot:
```routeros
/container set [find name="smokeping:latest"] start-on-boot=yes
```

### Mount additional targets file:
```routeros
/container mounts add dst="/config/Targets.custom" name=MOUNT_TARGETS src="/smokeping/targets-custom"
/container set [find name="smokeping:latest"] mounts=MOUNT_SMOKE_CONFIG,MOUNT_SMOKE_DATA,MOUNT_TARGETS
```

### Monitor container stats:
```routeros
/container print stats
```

### Update Smokeping image:
```routeros
/container stop [find name="smokeping:latest"]
/container remove [find name="smokeping:latest"]
# Re-add container (pulls latest image)
/container add envlist=ENV_SMOK(see "Configuring Monitoring Targets" section)
- Wait 10-15 minutes for initial graph data
- Add custom targets for your ISP, servers, or critical servicesveth-smokeping ...
```

## Related Guides

- [NetWatch Telegram Alerts](./netwatch-telegram-alerts) - Monitoring and alerts
- [Beeper Alert Internet Down](./beeper-alert-internet-down) - Audio monitoring
- [Send Logs to Email](../Email/send-logs-to-email) - Log collection

## Completion

✅ **Smokeping Docker container deployed!**

**Next steps:**
- Access web UI: `http://your-router-ip`
- Configure monitoring targets in Smokeping
- Set alert thresholds for latency spikes
- Monitor graphs for network performance patterns
- Schedule regular backups of Smokeping data
- Integrate with alerting systems (Telegram, email)
- Back up configuration: `/system backup save`
