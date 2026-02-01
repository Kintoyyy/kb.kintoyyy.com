---
sidebar_position: 2
---

# 🐳 Pi-hole Container

Deploy Pi-hole as a Docker container on MikroTik RouterOS v7+ for network-wide ad blocking, DNS filtering, and DHCP management. This guide covers container setup, veth networking, persistent storage, and NAT port forwarding for web interface access.

:::info Key Concepts
- **Container** - Docker container running on RouterOS with persistent storage
- **Veth** - Virtual Ethernet interface connecting containers to host
- **Bridge** - Network bridge for container communication
- **Mounts** - Persistent volumes for Pi-hole configuration and DNS data
- **Environment Variables** - Container configuration (timezone, password, etc.)
- **DST-NAT** - Port forwarding to access Pi-hole web interface from WAN
:::

---

## Prerequisites

Before deploying Pi-hole container, ensure you have:

- ✅ MikroTik RouterOS v7.6+ with container support
- ✅ External storage (USB/NVMe) mounted as `disk1`
- ✅ Internet connectivity for Docker image pull
- ✅ At least 1 GB free disk space on `disk1`
- ✅ Understanding of Docker containers and networking
- ✅ Backup of current MikroTik configuration

---

:::warning Important Considerations
- **Storage Required:** Pi-hole needs persistent storage for blocklists and config (~500 MB)
- **DNS Port 53:** Pi-hole uses UDP/TCP port 53; ensure no conflicts with RouterOS DNS cache
- **CPU Usage:** Container mode consumes more CPU than native MikroTik features
- **Web Access:** Default port 80 for web interface; use NAT to expose externally
- **Registry Rate Limits:** Docker Hub limits pulls; cache images if re-deploying frequently
- **Root Privileges:** DNSMASQ_USER=root required for Pi-hole to bind to port 53
:::

---

## Understanding Pi-hole Container Architecture

### Network Topology

```
[Internet] ──── [MikroTik Router] ──── [Containers Bridge] ──── [veth-pihole] ──── [Pi-hole]
                 (10.15.0.165)          (172.17.0.1/24)        (172.17.0.2/24)      (port 80)
                      │                                                                  │
                      │                                                       DNS: UDP/TCP 53
                      │                                                       Web: HTTP 80
                      └──── NAT Port Forwarding ──────────────────────────────────────┘
                             10.15.0.165:80 → 172.17.0.2:80
```

### Container Network Design

| Component | IP Address | Interface | Purpose |
|-----------|------------|-----------|---------|
| MikroTik Host | 10.15.0.165 | ether1 (WAN) | Router management and external access |
| Container Bridge | 172.17.0.1/24 | containers | Gateway for all containers |
| Pi-hole Container | 172.17.0.2/24 | veth-pihole | DNS filtering and ad blocking |
| Future Container | 172.17.0.3/24 | veth-app2 | Reserved for additional services |

### Storage Structure

```
/disk1/
├── images/
│   └── pihole/              # Container image and layers
├── volumes/
│   └── pihole/
│       ├── pihole/          # Pi-hole config, blocklists, DB
│       │   ├── gravity.db   # DNS blocklist database
│       │   ├── pihole-FTL.conf
│       │   └── setupVars.conf
│       └── dnsmasq.d/       # Custom DNS records and DHCP
│           └── 01-pihole.conf
└── tmp/                     # Temporary files for container operations
```

---

## Configuration

### Step 1: Prepare Storage Directories

```routeros
# Create directory structure on disk1
/file
print detail where name~"disk1"

# Verify disk1 is mounted (should show "Available" type)

# Create persistent volumes for Pi-hole
/file
add name=disk1/volumes/pihole/pihole type=directory
add name=disk1/volumes/pihole/dnsmasq.d type=directory
add name=disk1/images/pihole type=directory
add name=disk1/tmp type=directory
```

### Step 2: Create Container Mounts

```routeros
/container mounts
add dst="/etc/pihole" name=MOUNT_PIHOLE_PIHOLE src="/disk1/volumes/pihole/pihole"
add dst="/etc/dnsmasq.d" name=MOUNT_PIHOLE_DNSMASQD src="/disk1/volumes/pihole/dnsmasq.d"
```

### Step 3: Create Container Network (Bridge + Veth)

```routeros
# Create bridge for containers
/interface bridge
add name=containers

# Create virtual ethernet interface for Pi-hole
/interface veth
add address=172.17.0.2/24 gateway=172.17.0.1 name=veth-pihole

# Add veth to bridge
/interface bridge port
add bridge=containers interface=veth-pihole

# Configure bridge IP (container gateway)
/ip address
add address=172.17.0.1/24 interface=containers network=172.17.0.0
```

### Step 4: Configure Container Registry and Environment

```routeros
# Set Docker registry URL and temp directory
/container config
set registry-url="https://registry-1.docker.io" tmpdir=disk1/tmp

# Create environment variables for Pi-hole
/container envs
add key=TZ name=ENV_PIHOLE value=Asia/Manila
add key=FTLCONF_webserver_api_password name=ENV_PIHOLE value=mysecurepassword
add key=DNSMASQ_USER name=ENV_PIHOLE value=root
```

### Step 5: Create Pi-hole Container

```routeros
/container
add envlist=ENV_PIHOLE \
    interface=veth-pihole \
    mounts="MOUNT_PIHOLE_PIHOLE,MOUNT_PIHOLE_DNSMASQD" \
    name=pihole \
    root-dir="disk1/images/pihole" \
    workdir="/"
```

### Step 6: Pull and Start Pi-hole Image

```routeros
# Pull latest Pi-hole image (this may take 5-10 minutes)
/container
add remote-image=pihole/pihole:latest \
    interface=veth-pihole \
    envlist=ENV_PIHOLE \
    mounts="MOUNT_PIHOLE_PIHOLE,MOUNT_PIHOLE_DNSMASQD" \
    root-dir="disk1/images/pihole"

# Wait for image download
/container
print detail where name=pihole

# Start container
/container
start pihole
```

### Step 7: Configure NAT for External Access

```routeros
# Masquerade outbound traffic from containers
/ip firewall nat
add action=masquerade chain=srcnat src-address=172.17.0.0/24 comment="Container NAT"

# Forward port 80 (HTTP) to Pi-hole web interface
add action=dst-nat \
    chain=dstnat \
    dst-address=10.15.0.165 \
    dst-port=80 \
    protocol=tcp \
    to-addresses=172.17.0.2 \
    to-ports=80 \
    comment="Pi-hole Web Access"

# Optional: Forward alternate port 8080 to another container
add action=dst-nat \
    chain=dstnat \
    dst-address=10.15.0.165 \
    dst-port=8080 \
    protocol=tcp \
    to-addresses=172.17.0.3 \
    to-ports=80 \
    comment="Future App Port 8080"
```

### Step 8: Configure DNS Settings (Optional)

```routeros
# Point MikroTik to use Pi-hole as DNS server
/ip dns
set servers=172.17.0.2
set allow-remote-requests=yes

# Disable MikroTik DNS cache to avoid conflicts
set cache-size=0
```

---

## Understanding Container Components

### Environment Variables

| Variable | Value | Purpose |
|----------|-------|---------|
| `TZ` | Asia/Manila | Container timezone (adjust for your region) |
| `FTLCONF_webserver_api_password` | mysecurepassword | Pi-hole admin password (change this!) |
| `DNSMASQ_USER` | root | Run DNSMASQ as root (required for port 53) |

### Mount Points

| Host Path | Container Path | Purpose |
|-----------|----------------|---------|
| `/disk1/volumes/pihole/pihole` | `/etc/pihole` | Pi-hole config and gravity database |
| `/disk1/volumes/pihole/dnsmasq.d` | `/etc/dnsmasq.d` | Custom DNS records and DHCP config |

### Container Image

- **Image:** `pihole/pihole:latest` from Docker Hub
- **Size:** ~300 MB compressed, ~700 MB extracted
- **Architecture:** ARM64 or AMD64 (auto-detected by RouterOS)
- **Ports:** 53/UDP, 53/TCP (DNS), 80/TCP (Web), 443/TCP (HTTPS optional)

---

## Verification

### Step 1: Check Container Status

```routeros
# View all containers
/container
print detail

# Expected output:
# name=pihole status=running
```

### Step 2: Check Container Logs

```routeros
# View Pi-hole startup logs
/container
print detail where name=pihole

# Check for errors
/log
print where topics~"container"
```

### Step 3: Test DNS Resolution

```routeros
# Test DNS query through Pi-hole
/tool fetch url="http://172.17.0.2" mode=http

# Test DNS resolution
:resolve dns-name=google.com server=172.17.0.2

# Expected: IP address returned
```

### Step 4: Access Pi-hole Web Interface

```bash
# From local network, open browser:
http://10.15.0.165

# Login with password: mysecurepassword
```

### Step 5: Check NAT Rules

```routeros
# Verify NAT rules active
/ip firewall nat
print where comment~"Pi-hole"

# Expected: dst-nat rule with to-addresses=172.17.0.2
```

### Step 6: Test Ad Blocking

```bash
# From client device using Pi-hole DNS (172.17.0.2):
nslookup ads.example.com 172.17.0.2

# Expected: Blocked domain returns 0.0.0.0
```

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Container won't start | Disk1 not mounted or full | Verify `/file print` shows disk1 with free space |
| "Image not found" error | Registry pull failed | Check internet connectivity; retry `/container add remote-image=pihole/pihole:latest` |
| DNS not resolving | Port 53 conflict with RouterOS | Disable MikroTik DNS cache: `/ip dns set cache-size=0` |
| Web interface unreachable | NAT rule missing or incorrect | Verify `/ip firewall nat print` shows dst-nat rule for port 80 |
| Container crashes on startup | DNSMASQ_USER not set to root | Add environment variable: `DNSMASQ_USER=root` |
| "Permission denied" errors | Mount paths don't exist | Create `/disk1/volumes/pihole/pihole` and `dnsmasq.d` directories |
| High CPU usage | Container image incompatible | Check RouterOS architecture (ARM vs x86) matches image |
| Container stuck in "extracting" | Disk I/O slow or corrupted | Use faster USB 3.0/NVMe storage; reformat disk1 |
| DNS queries not logged | FTL database locked | Restart container: `/container stop pihole` then `start pihole` |
| Password doesn't work | FTLCONF variable incorrect | Update `/container envs` and restart container |

---

## Advanced Configuration Options

### 1. Enable HTTPS (Port 443)

```routeros
# Forward HTTPS to Pi-hole (requires SSL cert in container)
/ip firewall nat
add action=dst-nat chain=dstnat dst-address=10.15.0.165 dst-port=443 protocol=tcp to-addresses=172.17.0.2 to-ports=443 comment="Pi-hole HTTPS"
```

### 2. Add Custom DNS Records

```routeros
# Access container shell (requires SSH to MikroTik)
/container shell pihole

# Inside container, create custom DNS record
echo "192.168.1.100 myserver.local" >> /etc/pihole/custom.list
pihole restartdns
```

### 3. Whitelist/Blacklist Domains via CLI

```routeros
# Whitelist domain
/container shell pihole
pihole -w example.com

# Blacklist domain
pihole -b badsite.com
```

### 4. Enable Conditional Forwarding (Local DNS)

Add to `/disk1/volumes/pihole/dnsmasq.d/02-conditional.conf`:
```
server=/local/192.168.1.1
```

### 5. Configure DHCP Server in Pi-hole

```routeros
# Disable MikroTik DHCP server
/ip dhcp-server
set [find] disabled=yes

# Configure DHCP in Pi-hole web interface:
# Settings → DHCP → Enable DHCP server
# Range: 192.168.1.100 - 192.168.1.200
# Gateway: 192.168.1.1
```

### 6. Backup Pi-hole Configuration

```routeros
# Backup gravity database and config
/file
print where name~"disk1/volumes/pihole"

# Create backup via SCP/FTP
/tool fetch url="ftp://192.168.1.100/backup/pihole-gravity.db" upload=yes src-path=disk1/volumes/pihole/pihole/gravity.db
```

### 7. Update Pi-hole Container

```routeros
# Stop current container
/container
stop pihole

# Remove old container
remove pihole

# Pull latest image
add remote-image=pihole/pihole:latest \
    interface=veth-pihole \
    envlist=ENV_PIHOLE \
    mounts="MOUNT_PIHOLE_PIHOLE,MOUNT_PIHOLE_DNSMASQD" \
    root-dir="disk1/images/pihole"

# Start updated container
start pihole
```

### 8. Monitor Container Resource Usage

```routeros
# Check CPU usage
/system resource
print

# Check disk usage
/disk
print detail

# Check container memory
/container
print detail where name=pihole
```

### 9. Add Multiple Upstream DNS Servers

Edit `/disk1/volumes/pihole/pihole/setupVars.conf`:
```
PIHOLE_DNS_1=1.1.1.1
PIHOLE_DNS_2=8.8.8.8
PIHOLE_DNS_3=208.67.222.222
```

Then restart:
```routeros
/container
stop pihole
start pihole
```

### 10. Enable Query Logging to External Syslog

```routeros
# Forward Pi-hole logs to MikroTik syslog
/container shell pihole

# Inside container:
apt update && apt install rsyslog
echo "*.* @10.15.0.165:514" >> /etc/rsyslog.conf
service rsyslog restart
```

---

## Integration with MikroTik DHCP

### Option 1: Use Pi-hole DNS with MikroTik DHCP

```routeros
# Keep MikroTik DHCP server, point clients to Pi-hole DNS
/ip dhcp-server network
set [find] dns-server=172.17.0.2
```

### Option 2: Full Pi-hole DHCP (Disable MikroTik DHCP)

```routeros
# Disable MikroTik DHCP server
/ip dhcp-server
set [find] disabled=yes

# Configure DHCP in Pi-hole web interface:
# Settings → DHCP → Enable DHCP server on interface eth0
# Router IP: 172.17.0.1
```

---

## Monitoring and Maintenance

### Daily Health Checks

```routeros
# Check container status
/container
print where name=pihole

# Expected: status=running

# Check DNS queries
# Access web interface: http://10.15.0.165
# Dashboard shows queries blocked today

# Check disk space
/file
print where name~"disk1" detail
```

### Weekly Maintenance

```routeros
# Update blocklists (automatic via Pi-hole cron)
# Verify via web interface: Tools → Update Gravity

# Backup configuration
/export file=pihole-backup

# Check container logs for errors
/log
print where topics~"container" and message~"error"
```

### Restart Container

```routeros
# Restart Pi-hole container
/container
stop pihole
:delay 5s
start pihole
```

---

## Security Best Practices

1. **Change Default Password:** Update `FTLCONF_webserver_api_password` immediately
2. **Restrict Web Access:** Use firewall rules to limit port 80 access:
   ```routeros
   /ip firewall filter
   add action=accept chain=input src-address=192.168.1.0/24 dst-port=80 protocol=tcp comment="Allow Pi-hole Web from LAN"
   add action=drop chain=input dst-port=80 protocol=tcp comment="Block Pi-hole Web from Internet"
   ```
3. **Enable HTTPS:** Configure SSL certificate in Pi-hole for encrypted web access
4. **Regular Updates:** Pull latest Pi-hole image monthly for security patches
5. **Backup Regularly:** Export `/disk1/volumes/pihole/` weekly to external storage

---

## Related Guides

- [Smokeping Docker Container](./smokeping-docker-container) - Another container deployment example
- [RADIUS Server Integration](../ISP/radius-server-integration) - PPPoE authentication setup
- [Port Forwarding](../Security/port-forwarding) - MikroTik NAT configuration

---

✅ **Pi-hole container is now running on MikroTik with DNS filtering and web interface accessible at http://10.15.0.165!** Monitor ad blocking stats via the web dashboard.
