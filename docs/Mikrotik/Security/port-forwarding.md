---
sidebar_position: 5
---

# 🔓 Port Forwarding

Port forwarding (Destination NAT) redirects incoming traffic from the internet to internal servers or devices, enabling external access to services like web servers, remote desktop, security cameras, and gaming servers while maintaining network security through controlled access.

:::info Key Concepts
- **Port Forwarding** - Redirects external traffic to internal IP:port
- **Destination NAT (dst-nat)** - Changes packet destination address/port
- **Source NAT (src-nat)** - Masquerades internal IPs for outbound traffic
- **Hairpin NAT** - Allows internal clients to access forwarded services using public IP
- **Port Translation** - Maps external port to different internal port
- **Public IP** - Internet-facing IP address (WAN interface)
- **Private IP** - Internal network address (LAN devices)
:::

---

## Prerequisites

Before configuring port forwarding, ensure you have:

- ✅ Static or dynamic public IP address from ISP
- ✅ Internal server/device with static IP assignment
- ✅ Service running on target device (web server, RDP, etc.)
- ✅ Firewall configured to allow forwarded traffic
- ✅ Understanding of ports used by your service
- ✅ Basic NAT masquerade configured for outbound traffic

---

:::warning Security Considerations
- **Expose Only Required Ports:** Never forward all ports or enable DMZ
- **Use Non-Standard Ports:** Change default ports (SSH 22→2222, RDP 3389→3390)
- **IP Whitelisting:** Restrict access to specific source IPs when possible
- **Strong Authentication:** Use complex passwords and MFA on forwarded services
- **Regular Updates:** Keep forwarded services patched and secure
- **Monitor Logs:** Check for unauthorized access attempts
- **VPN Alternative:** Consider VPN instead of port forwarding for sensitive services
:::

---

## Understanding Port Forwarding

### How Port Forwarding Works

```
Internet User                    Router (MikroTik)              Internal Server
203.0.113.50     ──────────>    203.0.113.1 (WAN)             192.168.1.100
Destination:                     ▼ dst-nat rule                Web Server:80
203.0.113.1:8080                Changes to:
                                192.168.1.100:80
                                        │
                                        └──────────>           192.168.1.100:80
                                                               Receives request
```

**Traffic Flow:**
1. External user requests `http://203.0.113.1:8080`
2. Router dst-nat rule rewrites destination to `192.168.1.100:80`
3. Firewall rule allows forwarded traffic
4. Web server receives request and responds
5. Router rewrites source back to `203.0.113.1:8080`
6. User receives response

---

## Common Port Forwarding Scenarios

### Scenario 1: Web Server (HTTP/HTTPS)

**Network:** Host website from internal server

| Component | Value | Description |
|-----------|-------|-------------|
| Public IP | 203.0.113.1 | WAN interface IP |
| Internal Server | 192.168.1.100 | Web server IP |
| External Port | 80, 443 | Standard HTTP/HTTPS |
| Internal Port | 80, 443 | Apache/Nginx listening ports |
| Protocol | TCP | Web traffic protocol |

**Port Mapping:**

| Service | External | Internal | Protocol | Device | Notes |
|---------|----------|----------|----------|--------|-------|
| HTTP | 203.0.113.1:80 | 192.168.1.100:80 | TCP | Web Server | Standard web |
| HTTPS | 203.0.113.1:443 | 192.168.1.100:443 | TCP | Web Server | SSL/TLS |

---

### Scenario 2: Remote Desktop Access

**Network:** Access office PC from home

| Component | Value | Description |
|-----------|-------|-------------|
| Public IP | 198.51.100.1 | Dynamic IP (DDNS) |
| Internal PC | 192.168.1.50 | Windows workstation |
| External Port | 3390 | Non-standard RDP port |
| Internal Port | 3389 | Default Windows RDP |
| Protocol | TCP | Remote Desktop Protocol |

**Security Enhancement:** External port changed from 3389 to 3390 to reduce brute-force attacks

---

### Scenario 3: Security Camera System

**Network:** Multiple cameras with single DVR/NVR

| Camera/DVR | Internal IP | Port | External Port | Protocol | Purpose |
|------------|-------------|------|---------------|----------|---------|
| DVR Web Interface | 192.168.1.200 | 80 | 8080 | TCP | Camera management |
| DVR HTTPS | 192.168.1.200 | 443 | 8443 | TCP | Secure access |
| RTSP Stream | 192.168.1.200 | 554 | 8554 | TCP | Live video |
| Camera 1 | 192.168.1.201 | 80 | 8081 | TCP | Direct camera 1 |
| Camera 2 | 192.168.1.202 | 80 | 8082 | TCP | Direct camera 2 |

---

### Scenario 4: Gaming Server

**Network:** Host game server for friends

| Game | Internal IP | Ports | External Ports | Protocol | Players |
|------|-------------|-------|----------------|----------|---------|
| Minecraft | 192.168.1.150 | 25565 | 25565 | TCP | 20 |
| CS:GO | 192.168.1.151 | 27015 | 27015 | UDP | 32 |
| Terraria | 192.168.1.152 | 7777 | 7777 | TCP | 8 |
| ARK | 192.168.1.153 | 7777-7778 | 7777-7778 | UDP | 70 |

---

### Scenario 5: Multiple Services on One Server

**Network:** Single server hosting multiple services

| Service | Internal IP | Internal Port | External Port | Protocol | Notes |
|---------|-------------|---------------|---------------|----------|-------|
| Web (HTTP) | 192.168.1.100 | 80 | 80 | TCP | Public website |
| Web (HTTPS) | 192.168.1.100 | 443 | 443 | TCP | SSL certificate |
| SSH | 192.168.1.100 | 22 | 2222 | TCP | Server management |
| FTP | 192.168.1.100 | 21 | 2121 | TCP | File transfers |
| MySQL | 192.168.1.100 | 3306 | 3306 | TCP | Database (restricted) |

---

## Configuration in MikroTik RouterOS

### Option A: Terminal (NAT Configuration)

#### Basic Web Server Port Forward
```routeros
# Forward HTTP (port 80) to internal web server
/ip firewall nat add chain=dstnat dst-address=203.0.113.1 protocol=tcp \
  dst-port=80 action=dst-nat to-addresses=192.168.1.100 to-ports=80 \
  comment="HTTP to Web Server"

# Forward HTTPS (port 443)
/ip firewall nat add chain=dstnat dst-address=203.0.113.1 protocol=tcp \
  dst-port=443 action=dst-nat to-addresses=192.168.1.100 to-ports=443 \
  comment="HTTPS to Web Server"

# Allow forwarded traffic through firewall
/ip firewall filter add chain=forward protocol=tcp dst-address=192.168.1.100 \
  dst-port=80,443 connection-state=new action=accept \
  comment="Allow HTTP/HTTPS to Web Server"
```

#### Remote Desktop with Port Translation
```routeros
# Forward external port 3390 to internal RDP port 3389
/ip firewall nat add chain=dstnat dst-address=198.51.100.1 protocol=tcp \
  dst-port=3390 action=dst-nat to-addresses=192.168.1.50 to-ports=3389 \
  comment="RDP to Office PC"

# Firewall rule with source IP restriction
/ip firewall filter add chain=forward protocol=tcp dst-address=192.168.1.50 \
  dst-port=3389 src-address=203.0.113.0/24 connection-state=new action=accept \
  comment="Allow RDP from specific subnet"
```

#### Multiple Cameras/Services
```routeros
# DVR Web Interface
/ip firewall nat add chain=dstnat dst-address=203.0.113.1 protocol=tcp \
  dst-port=8080 action=dst-nat to-addresses=192.168.1.200 to-ports=80 \
  comment="DVR Web Interface"

# Camera 1 Direct Access
/ip firewall nat add chain=dstnat dst-address=203.0.113.1 protocol=tcp \
  dst-port=8081 action=dst-nat to-addresses=192.168.1.201 to-ports=80 \
  comment="Camera 1"

# Camera 2 Direct Access
/ip firewall nat add chain=dstnat dst-address=203.0.113.1 protocol=tcp \
  dst-port=8082 action=dst-nat to-addresses=192.168.1.202 to-ports=80 \
  comment="Camera 2"

# RTSP Streaming
/ip firewall nat add chain=dstnat dst-address=203.0.113.1 protocol=tcp \
  dst-port=8554 action=dst-nat to-addresses=192.168.1.200 to-ports=554 \
  comment="RTSP Stream"

# Allow forwarded traffic
/ip firewall filter add chain=forward dst-address=192.168.1.200-192.168.1.202 \
  protocol=tcp dst-port=80,554 connection-state=new action=accept \
  comment="Allow Camera Access"
```

#### Gaming Server with UDP
```routeros
# Minecraft Server (TCP)
/ip firewall nat add chain=dstnat dst-address=203.0.113.1 protocol=tcp \
  dst-port=25565 action=dst-nat to-addresses=192.168.1.150 \
  comment="Minecraft Server"

# CS:GO Server (UDP)
/ip firewall nat add chain=dstnat dst-address=203.0.113.1 protocol=udp \
  dst-port=27015 action=dst-nat to-addresses=192.168.1.151 \
  comment="CS:GO Server"

# Firewall rules for gaming
/ip firewall filter add chain=forward dst-address=192.168.1.150 protocol=tcp \
  dst-port=25565 connection-state=new action=accept comment="Allow Minecraft"

/ip firewall filter add chain=forward dst-address=192.168.1.151 protocol=udp \
  dst-port=27015 action=accept comment="Allow CS:GO"
```

#### Hairpin NAT (Internal Access to Public IP)
```routeros
# Allow internal users to access forwarded services using public IP
/ip firewall nat add chain=srcnat src-address=192.168.1.0/24 \
  dst-address=192.168.1.0/24 action=masquerade \
  comment="Hairpin NAT for internal access"

# Alternative: dst-nat for specific service
/ip firewall nat add chain=dstnat src-address=192.168.1.0/24 \
  dst-address=203.0.113.1 protocol=tcp dst-port=80 \
  action=dst-nat to-addresses=192.168.1.100 to-ports=80 \
  comment="Internal access to web server via public IP"
```

#### Port Range Forwarding
```routeros
# Forward port range (FTP passive mode 50000-50010)
/ip firewall nat add chain=dstnat dst-address=203.0.113.1 protocol=tcp \
  dst-port=50000-50010 action=dst-nat to-addresses=192.168.1.100 \
  comment="FTP Passive Ports"

# Firewall rule for port range
/ip firewall filter add chain=forward dst-address=192.168.1.100 protocol=tcp \
  dst-port=50000-50010 connection-state=new action=accept \
  comment="Allow FTP Passive Range"
```

### Option B: Winbox

#### Basic Port Forward Setup

1. **Create DST-NAT Rule:**
   - IP → Firewall → NAT → [+]
   - **General Tab:**
     - Chain: `dstnat`
     - Protocol: `6 (tcp)` or `17 (udp)`
     - Dst. Address: `203.0.113.1` (your public IP)
     - Dst. Port: `80` (external port)
     - Comment: `HTTP to Web Server`
   - **Action Tab:**
     - Action: `dst-nat`
     - To Addresses: `192.168.1.100` (internal server)
     - To Ports: `80` (internal port)
   - Click OK

2. **Add Firewall Filter Rule:**
   - IP → Firewall → Filter Rules → [+]
   - **General Tab:**
     - Chain: `forward`
     - Protocol: `6 (tcp)`
     - Dst. Address: `192.168.1.100`
     - Dst. Port: `80`
   - **Advanced Tab:**
     - Connection State: ✅ `new`
   - **Action Tab:**
     - Action: `accept`
     - Comment: `Allow HTTP to Web Server`
   - Click OK

#### Port Translation (Different External/Internal Ports)

3. **Remote Desktop Example:**
   - IP → Firewall → NAT → [+]
   - **General:**
     - Chain: `dstnat`
     - Protocol: `6 (tcp)`
     - Dst. Port: `3390` (external)
   - **Action:**
     - Action: `dst-nat`
     - To Addresses: `192.168.1.50`
     - To Ports: `3389` (internal RDP port)

#### Source IP Restriction

4. **Restrict Access to Specific IP:**
   - In NAT rule or Firewall rule:
   - **General Tab:**
     - Src. Address: `203.0.113.0/24` (allowed network)
   - Only this subnet can access forwarded service

---

## Understanding NAT Components

### NAT Rule Components

| Field | Purpose | Example | Notes |
|-------|---------|---------|-------|
| **Chain** | NAT processing stage | `dstnat` | Always use dstnat for port forwarding |
| **Dst. Address** | Public IP (WAN) | 203.0.113.1 | Traffic must match this destination |
| **Dst. Port** | External port | 8080 | Port users connect to |
| **Protocol** | Transport protocol | tcp/udp | Match service protocol |
| **Action** | NAT operation | dst-nat | Destination address translation |
| **To Addresses** | Internal IP | 192.168.1.100 | Target server/device |
| **To Ports** | Internal port | 80 | Service port on target |

### Firewall Rule Order

```
Chain: forward
Position  Rule
────────────────────────────────────────────────────
1         drop invalid connections
2         accept established,related
3         accept new forwarded services (PORT FORWARDS)
4         drop all other forward traffic
```

**Critical:** Port forward filter rules must be ABOVE default drop rules

---

## Verification

### Step 1: Verify NAT Rule

```routeros
# Check NAT rules
/ip firewall nat print

# Expected output:
# 0  chain=dstnat dst-address=203.0.113.1 protocol=tcp dst-port=80 
#    action=dst-nat to-addresses=192.168.1.100 to-ports=80

# Check rule is active (not disabled)
/ip firewall nat print detail
```

### Step 2: Verify Firewall Rules

```routeros
# Check forward chain rules
/ip firewall filter print chain=forward

# Ensure port forward rule exists BEFORE drop-all rule
# Should see: action=accept for dst-address=192.168.1.100 dst-port=80
```

### Step 3: Test Internal Server

```routeros
# From router, ping internal server
/ping 192.168.1.100 count=5

# Test service locally
/tool fetch url="http://192.168.1.100" dst-path=test.html

# Expected: Success (confirms server is running)
```

### Step 4: Test from External IP (Outside Network)

```bash
# From internet device (phone 4G, remote PC)
telnet 203.0.113.1 80

# Expected: Connected to 203.0.113.1

# Test with curl
curl -I http://203.0.113.1

# Expected: HTTP response headers
```

### Step 5: Check Connection Tracking

```routeros
# Monitor active connections
/ip firewall connection print where dst-address~"192.168.1.100"

# Expected output shows:
# tcp dst-nat:203.0.113.1:80->192.168.1.100:80
```

### Step 6: Test Hairpin NAT

```bash
# From internal device (192.168.1.50)
curl http://203.0.113.1

# Expected: Connects to 192.168.1.100 via hairpin NAT
```

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Port forward not working from internet | NAT rule missing or incorrect | Verify `/ip firewall nat print` shows correct rule |
| Can't access from inside network | Hairpin NAT not configured | Add srcnat masquerade for internal subnet accessing internal IPs |
| Firewall blocking traffic | Forward rule missing or wrong position | Add accept rule in forward chain BEFORE drop rules |
| Service unreachable | Internal server not running | Check service status: `telnet 192.168.1.100 80` |
| Wrong internal IP targeted | Static IP not assigned | Set DHCP reservation or static IP on server |
| Intermittent connectivity | Dynamic public IP changed | Use DDNS service (Cloud, No-IP, DuckDNS) |
| Port conflict | Multiple services on same external port | Use port translation (external 8080 → internal 80) |
| Connection timeout | ISP blocking port | Test with different port or contact ISP |
| NAT rule not matching | Dst-address doesn't match WAN IP | Use `in-interface=ether1-wan` instead of dst-address |
| UDP service fails | Protocol set to TCP | Change protocol to UDP in NAT and firewall rules |
| Firewall logs show drops | Rule order incorrect | Move accept rule above drop rules: `/ip firewall filter move` |
| Hairpin fails with multiple subnets | Src-address too specific | Use broader src-address in hairpin NAT rule |

---

## Advanced Port Forwarding Options

### 1. Interface-Based Port Forwarding

Forward based on incoming interface instead of IP:

```routeros
# Useful for dynamic IP or PPPoE
/ip firewall nat add chain=dstnat in-interface=ether1-wan protocol=tcp \
  dst-port=80 action=dst-nat to-addresses=192.168.1.100 to-ports=80 \
  comment="HTTP (interface-based)"
```

### 2. Port Forwarding with Address List

Dynamic source IP whitelisting:

```routeros
# Create address list of allowed IPs
/ip firewall address-list add list=rdp-allowed address=203.0.113.0/24 \
  comment="Office subnet"
/ip firewall address-list add list=rdp-allowed address=198.51.100.50 \
  comment="Admin home"

# NAT rule
/ip firewall nat add chain=dstnat protocol=tcp dst-port=3390 \
  src-address-list=rdp-allowed action=dst-nat to-addresses=192.168.1.50 \
  to-ports=3389 comment="RDP with IP whitelist"
```

### 3. Load Balancing Multiple Servers

Distribute connections across multiple servers:

```routeros
# Method 1: Nth rule (round-robin)
/ip firewall nat add chain=dstnat protocol=tcp dst-port=80 nth=2,1 \
  action=dst-nat to-addresses=192.168.1.101 comment="Web Server 1"

/ip firewall nat add chain=dstnat protocol=tcp dst-port=80 nth=2,2 \
  action=dst-nat to-addresses=192.168.1.102 comment="Web Server 2"
```

### 4. Port Knocking for Security

Hide service behind port knocking sequence:

```routeros
# Knock sequence: 7000, 8000, 9000 opens SSH
/ip firewall filter add chain=input protocol=tcp dst-port=7000 \
  src-address-list=!knock-stage1 action=add-src-to-address-list \
  address-list=knock-stage1 address-list-timeout=10s

/ip firewall filter add chain=input protocol=tcp dst-port=8000 \
  src-address-list=knock-stage1 action=add-src-to-address-list \
  address-list=knock-stage2 address-list-timeout=10s

/ip firewall filter add chain=input protocol=tcp dst-port=9000 \
  src-address-list=knock-stage2 action=add-src-to-address-list \
  address-list=ssh-allowed address-list-timeout=1h

# Allow SSH only after knock
/ip firewall filter add chain=forward dst-address=192.168.1.100 protocol=tcp \
  dst-port=22 src-address-list=ssh-allowed action=accept
```

### 5. Port Forward with Logging

Track access attempts:

```routeros
# Log successful connections
/ip firewall filter add chain=forward dst-address=192.168.1.100 protocol=tcp \
  dst-port=80 connection-state=new action=log log-prefix="WebAccess: "

/ip firewall filter add chain=forward dst-address=192.168.1.100 protocol=tcp \
  dst-port=80 connection-state=new action=accept
```

### 6. Conditional Port Forwarding (Time-Based)

Enable port forward only during business hours:

```routeros
# Create time schedule
/system schedule add name=enable-rdp on-event="/ip firewall nat enable [find comment=\"RDP Forward\"]" \
  start-time=08:00:00 interval=1d

/system schedule add name=disable-rdp on-event="/ip firewall nat disable [find comment=\"RDP Forward\"]" \
  start-time=18:00:00 interval=1d

# NAT rule with comment
/ip firewall nat add chain=dstnat protocol=tcp dst-port=3390 \
  action=dst-nat to-addresses=192.168.1.50 to-ports=3389 \
  comment="RDP Forward" disabled=yes
```

### 7. HTTPS with SNI Inspection

Forward based on domain name:

```routeros
# Requires RouterOS 7.x with SNI support
/ip firewall layer7-protocol add name=domain1 regexp="^.*(example.com).*\$"
/ip firewall layer7-protocol add name=domain2 regexp="^.*(test.com).*\$"

/ip firewall nat add chain=dstnat protocol=tcp dst-port=443 \
  layer7-protocol=domain1 action=dst-nat to-addresses=192.168.1.101

/ip firewall nat add chain=dstnat protocol=tcp dst-port=443 \
  layer7-protocol=domain2 action=dst-nat to-addresses=192.168.1.102
```

### 8. Port Forward with Rate Limiting

Prevent brute-force attacks:

```routeros
# Limit new connections per IP
/ip firewall filter add chain=forward dst-address=192.168.1.50 protocol=tcp \
  dst-port=3389 connection-state=new src-address-list=rdp-blacklist \
  action=drop comment="Drop blacklisted RDP attempts"

/ip firewall filter add chain=forward dst-address=192.168.1.50 protocol=tcp \
  dst-port=3389 connection-state=new connection-limit=3,32 \
  action=add-src-to-address-list address-list=rdp-blacklist \
  address-list-timeout=1h comment="Blacklist after 3 attempts"

/ip firewall filter add chain=forward dst-address=192.168.1.50 protocol=tcp \
  dst-port=3389 connection-state=new action=accept
```

### 9. Multiple Public IPs to Different Servers

ISP provides multiple public IPs:

```routeros
# Public IP 1 (203.0.113.1) → Web Server
/ip firewall nat add chain=dstnat dst-address=203.0.113.1 protocol=tcp \
  dst-port=80,443 action=dst-nat to-addresses=192.168.1.100

# Public IP 2 (203.0.113.2) → Mail Server
/ip firewall nat add chain=dstnat dst-address=203.0.113.2 protocol=tcp \
  dst-port=25,587,993 action=dst-nat to-addresses=192.168.1.101

# Assign multiple IPs to WAN interface
/ip address add address=203.0.113.1/30 interface=ether1-wan
/ip address add address=203.0.113.2/30 interface=ether1-wan
```

### 10. UPnP (Universal Plug and Play)

Automatic port forwarding for compatible devices:

```routeros
# Enable UPnP
/ip upnp set enabled=yes allow-disable-external-interface=no

# Add interfaces
/ip upnp interfaces add interface=ether1-wan type=external
/ip upnp interfaces add interface=bridge-lan type=internal

# View active UPnP mappings
/ip firewall nat print where dynamic=yes
```

### 11. Port Forward Failover

Backup server if primary fails:

```routeros
# Primary server
/ip firewall nat add chain=dstnat protocol=tcp dst-port=80 \
  action=dst-nat to-addresses=192.168.1.100 comment="Primary Web" disabled=no

# Backup server (initially disabled)
/ip firewall nat add chain=dstnat protocol=tcp dst-port=80 \
  action=dst-nat to-addresses=192.168.1.101 comment="Backup Web" disabled=yes

# Netwatch script to failover
/tool netwatch add host=192.168.1.100 interval=10s \
  down-script={
    /ip firewall nat disable [find comment="Primary Web"]
    /ip firewall nat enable [find comment="Backup Web"]
    :log error "Web server failed over to backup"
  } \
  up-script={
    /ip firewall nat enable [find comment="Primary Web"]
    /ip firewall nat disable [find comment="Backup Web"]
    :log info "Primary web server restored"
  }
```

### 12. Port Forward Documentation Script

Generate report of all port forwards:

```routeros
:put "=== Port Forward Configuration Report ==="
:foreach rule in=[/ip firewall nat find chain=dstnat action=dst-nat] do={
  :local dstport [/ip firewall nat get $rule dst-port]
  :local toaddr [/ip firewall nat get $rule to-addresses]
  :local toport [/ip firewall nat get $rule to-ports]
  :local proto [/ip firewall nat get $rule protocol]
  :local comment [/ip firewall nat get $rule comment]
  
  :put ("External Port: " . $dstport . " → Internal: " . $toaddr . ":" . $toport . " (" . $proto . ") - " . $comment)
}
```

---

## Security Best Practices

### 1. Change Default Ports
```routeros
# Bad: SSH on default port 22
/ip firewall nat add chain=dstnat dst-port=22 action=dst-nat to-addresses=192.168.1.100

# Good: SSH on non-standard port 2222
/ip firewall nat add chain=dstnat dst-port=2222 action=dst-nat to-addresses=192.168.1.100 to-ports=22
```

### 2. Implement Geo-IP Blocking
```routeros
# Block countries (example: block all except US)
/ip firewall address-list add list=allowed-countries address=us.geo
/ip firewall filter add chain=forward dst-address=192.168.1.0/24 \
  src-address-list=!allowed-countries action=drop comment="Geo-block"
```

### 3. Use VPN Instead
```routeros
# Instead of port forwarding RDP, use WireGuard VPN
/interface wireguard add name=wireguard1 listen-port=51820
# Clients connect via VPN, no port forwards needed
```

---

## Related Guides

- [Enforce DNS 8.8.8.8](./enforce-dns-8.8.8.8) - DNS redirection for security
- [Block Tethering TTL](./block-tethering-ttl) - Firewall security rules
- [Starlink Firewall Rules](./starlink-firewall-rules) - Comprehensive firewall setup
- [Routing Fundamentals](../../Network/routing-fundamentals) - Understanding traffic paths
- [VLAN Configuration](../../Network/vlan-configuration) - Network segmentation for services
- [Cloud DDNS Routing](../Routing/cloud-ddns-routing) - Dynamic DNS for changing IPs

---

🎉 **You now understand port forwarding, NAT configuration, security hardening, and advanced techniques!** Use port forwarding strategically to expose only necessary services while maintaining robust security through IP whitelisting, non-standard ports, and proper firewall rules.
