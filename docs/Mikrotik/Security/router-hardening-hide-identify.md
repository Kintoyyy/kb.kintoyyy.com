---
sidebar_position: 8
---

# 🔒 Security Hardening

This guide explains how to harden your MikroTik router against scanning, reconnaissance, and unauthorized access attempts. It covers blocking common discovery protocols, management ports, and vulnerable services to prevent your router from being fingerprinted or exploited.

:::warning
**Critical:** These rules are **firewall-only defenses**. They will NOT protect against physical access, default credentials, or weak passwords. Always set a strong admin password first: `/user set admin password="complex_password_here"`.
:::

---

## Prerequisites

✅ MikroTik RouterOS v6.45+  
✅ SSH or Winbox access to router  
✅ At least one WAN interface (ether1 or equivalent)  
✅ At least one LAN interface (ether2 or equivalent)  
✅ Firewall enabled (default on most RouterOS builds)  
✅ Internet connectivity to test blocking effectiveness  

---

## Security Threats Overview

### What Attackers Try to Discover

```
┌─────────────────────────────────────────────────────────────┐
│ RECONNAISSANCE PHASE (Attacker perspective)                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ 1. Port Scan                                                │
│    Probe ports: 21(FTP), 22(SSH), 23(Telnet), 80(HTTP),   │
│                 443(HTTPS), 8291(Winbox), 8728-8729(API)   │
│    ↓ Find open ports = router discovered                   │
│                                                              │
│ 2. Neighbor Discovery (CDP/LLDP)                            │
│    Broadcast query on port 5678                             │
│    ↓ Learn router model, firmware, MAC address             │
│                                                              │
│ 3. MAC Address Discovery (MAC-Winbox)                       │
│    Layer 2 broadcast on port 20561                          │
│    ↓ Identify MikroTik devices on network                  │
│                                                              │
│ 4. Traceroute Probes                                        │
│    Send packets to ports 33434-33534                        │
│    ↓ Map network topology                                  │
│                                                              │
│ 5. Vulnerability Scanning                                   │
│    Check for open SNMP (161/162), DNS (53), RoMON, etc.    │
│    ↓ Identify exploitable services                         │
│                                                              │
│ 6. Service Fingerprinting                                   │
│    Query banner/response from each open port               │
│    ↓ Determine exact RouterOS version & patch level       │
│                                                              │
│ ✅ GOAL: Block all of the above!                            │
└─────────────────────────────────────────────────────────────┘
```

---

## Architecture: Defense-in-Depth

```
INCOMING TRAFFIC (from WAN/Internet)
        │
        ▼
┌──────────────────────────────────┐
│ Firewall Filter Rules (INPUT)   │
├──────────────────────────────────┤
│ 1. Drop port scans (21-8729)     │
│ 2. Drop neighbor discovery (5678)│
│ 3. Drop MAC discovery (20561)    │
│ 4. Drop traceroute (33434-33534) │
│ 5. Drop SNMP (161/162)           │
│ 6. Drop DNS/PROXY/RoMON/etc      │
└────┬─────────────────────────────┘
     │ Only whitelisted services pass
     │ (e.g., ISP-required ports)
     ▼
┌──────────────────────────────────┐
│ Disabled Services                │
├──────────────────────────────────┤
│ • IP Proxy (disabled)            │
│ • Bandwidth Server (disabled)    │
│ • SNMP (disabled)                │
│ • IP Cloud DDNS (disabled)       │
│ • MAC-Winbox (no interfaces)     │
│ • RoMON (forbidden on WAN)       │
└────┬─────────────────────────────┘
     │ Router invisible to scans
     │ No services to exploit
     ▼
┌──────────────────────────────────┐
│ Obfuscation                      │
├──────────────────────────────────┤
│ • System identity: "PC"          │
│ • MAC address: random            │
│ • Appears as generic device      │
└──────────────────────────────────┘
```

---

## Configuration: Step-by-Step

### Step 1: Create WAN Interface List

**Option A: Terminal**
```routeros
/interface list add name=WAN comment="Hidden MikroTik"
/interface list member add interface="ether1" list=WAN comment="Hidden MikroTik"
```

**Option B: Winbox**
1. Go to: **Interfaces → Interface List** → Click **+**
   - **Name:** WAN
   - **Comment:** Hidden MikroTik
2. Go to: **Interfaces → Interface List** → Click on `WAN` to open it
3. Click **+** under Members:
   - **Interface:** ether1
   - **Comment:** Hidden MikroTik

**Why?** Groups all WAN interfaces for centralized firewall rules. If you add a second WAN link later, just add it to this list.

---

### Step 2: Block Winbox Scan (Service Ports)

**Option A: Terminal**
```routeros
/ip firewall filter add action=drop chain=input dst-port=21,22,23,80,443,8728,8729 \
    comment="Block Winbox Scan" in-interface-list=WAN protocol=tcp
/ip firewall filter add action=drop chain=input dst-port=21,22,23,80,443,8728,8729 \
    in-interface-list=WAN protocol=udp
```

**Option B: Winbox**
1. Go to: **IP → Firewall → Filter Rules**
2. Click **+** (TCP rule):
   - **Chain:** input
   - **Protocol:** tcp
   - **Dst. Port:** 21,22,23,80,443,8728,8729
   - **In. Interface List:** WAN
   - **Action:** drop
   - **Comment:** Block Winbox Scan
3. Click **+** (UDP rule) — same as above but **Protocol:** udp

| Port | Service | Why Block |
|------|---------|-----------|
| 21 | FTP | Legacy file access; should use SFTP (22) |
| 22 | SSH | Protects CLI access from brute-force |
| 23 | Telnet | Unencrypted; should never be exposed |
| 80 | HTTP | Unencrypted web interface |
| 443 | HTTPS | Winbox web alternative (still shouldn't expose) |
| 8728 | Winbox TCP | MikroTik GUI management port |
| 8729 | Winbox UDP | MikroTik API port |

---

### Step 3: Block Neighbor Discovery

**Option A: Terminal**
```routeros
/ip firewall filter add action=drop chain=input comment="Block Neighbor Discovery" \
    in-interface-list=WAN dst-port=5678 protocol=tcp
/ip firewall filter add action=drop chain=input in-interface-list=WAN dst-port=5678 \
    protocol=udp
/ip neighbor discovery-settings set discover-interface-list=!WAN
```

**Option B: Winbox**
1. **Firewall rule (TCP):**
   - **IP → Firewall → Filter Rules** → Click **+**
   - **Chain:** input | **Protocol:** tcp | **Dst. Port:** 5678 | **In. Interface List:** WAN
   - **Action:** drop | **Comment:** Block Neighbor Discovery

2. **Firewall rule (UDP):**
   - Same as above but **Protocol:** udp

3. **Disable neighbor discovery on WAN:**
   - **IP → Neighbor Discovery** → Click **Discovery Settings**
   - **Discover Interface List:** `!WAN` (exclude WAN)

**Why?** Neighbor Discovery Protocol (NDP) broadcasts router information (model, firmware, MAC). Attackers use this to fingerprint your device. Blocking port 5678 and disabling NDP on WAN makes your router invisible to CDP/LLDP scans.

---

### Step 4: Block MAC Address Discovery

**Option A: Terminal**
```routeros
/ip firewall filter add action=drop chain=input comment="Block MAC Address" \
    in-interface-list=WAN dst-port=20561 protocol=tcp
/ip firewall filter add action=drop chain=input in-interface-list=WAN dst-port=20561 \
    protocol=udp
/tool mac-server mac-winbox set allowed-interface-list=none
/tool mac-server set allowed-interface-list=none
/tool mac-server ping set enabled=no
```

**Option B: Winbox**
1. **Firewall rules (same pattern as Step 3, but port 20561)**
   - **Chain:** input | **Protocol:** tcp/udp | **Dst. Port:** 20561 | **Action:** drop

2. **Disable MAC-Winbox:**
   - **Tools → MAC Server → MAC-Winbox** → Set **Allowed Interface List:** none

3. **Disable MAC Server:**
   - **Tools → MAC Server** → Set **Allowed Interface List:** none

4. **Disable MAC Ping:**
   - **Tools → MAC Server → Ping** → Uncheck **Enabled**

**Why?** MAC-Winbox allows discovery of MikroTik devices via Layer 2 (no IP needed). Disabling this prevents Layer 2 attacks and MAC-based identification.

---

### Step 5: Block Traceroute Probes

**Option A: Terminal**
```routeros
/ip firewall filter add action=drop chain=input comment="Block Traceroute" \
    in-interface-list=WAN dst-port=33434-33534 protocol=tcp
/ip firewall filter add action=drop chain=input in-interface-list=WAN \
    dst-port=33434-33534 protocol=udp
```

**Option B: Winbox**
1. **IP → Firewall → Filter Rules** → Click **+**
   - **Chain:** input | **Protocol:** tcp | **Dst. Port:** 33434-33534 | **In. Interface List:** WAN
   - **Action:** drop | **Comment:** Block Traceroute

2. Repeat for UDP

**Why?** Traceroute uses high-numbered ports (33434-33534) to map network hops. Blocking these ports prevents attackers from probing your network topology.

---

### Step 6: Block RoMON (Remote Management)

**Option A: Terminal**
```routeros
/tool romon port add disabled=no forbid=yes comment="Block RoMON" interface="ether1"
```

**Option B: Winbox**
1. **Tools → RoMON → RoMON Ports** → Click **+**
   - **Interface:** ether1
   - **Disabled:** unchecked
   - **Forbid:** checked ← This blocks external access
   - **Comment:** Block RoMON

**Why?** RoMON allows MikroTik devices to connect to each other for remote management. Setting `forbid=yes` on WAN prevents unauthorized access to your router via RoMON tunnels.

---

### Step 7: Block DNS Poisoning (Open Recursive DNS)

**Option A: Terminal**
```routeros
/ip firewall filter add chain=input dst-port=53 in-interface-list=WAN \
    protocol=tcp action=drop comment="Block Open Recursive DNS"
/ip firewall filter add chain=input dst-port=53 in-interface-list=WAN \
    protocol=udp action=drop
```

**Option B: Winbox**
1. **IP → Firewall → Filter Rules** → Click **+**
   - **Chain:** input | **Protocol:** tcp/udp | **Dst. Port:** 53 | **In. Interface List:** WAN
   - **Action:** drop | **Comment:** Block Open Recursive DNS

**Why?** If your router runs a DNS server, blocking port 53 from WAN prevents:
- **DNS amplification attacks** (attacker uses your DNS to DDoS others)
- **DNS poisoning** (attacker spoofs DNS responses)
- **External DNS queries** (shouldn't expose internal DNS)

---

### Step 8: Block Open Proxy

**Option A: Terminal**
```routeros
/ip proxy set enabled=no
/ip firewall filter add action=drop chain=input dst-port=3128,8080 \
    in-interface-list=WAN protocol=tcp comment="Block Open PROXY"
/ip firewall filter add action=drop chain=input dst-port=3128,8080 \
    in-interface-list=WAN protocol=udp
```

**Option B: Winbox**
1. **IP → Web Proxy** → Uncheck **Enabled**
2. **IP → Firewall → Filter Rules** → Click **+** (same pattern as DNS, ports 3128 & 8080)

**Why?** An open proxy allows attackers to route traffic through your router, making it appear as if attacks come from your IP.

---

### Step 9: Block Bandwidth Test Server

**Option A: Terminal**
```routeros
/tool bandwidth-server set enabled=no authenticate=yes
/ip firewall filter add action=drop chain=input dst-port=2000 \
    in-interface-list=WAN protocol=tcp comment="Block BTest Server"
/ip firewall filter add action=drop chain=input dst-port=2000 \
    in-interface-list=WAN protocol=udp
```

**Option B: Winbox**
1. **Tools → Bandwidth Test → Bandwidth Test** → Uncheck **Enabled**, Check **Authenticate**
2. **IP → Firewall → Filter Rules** → Click **+** (same pattern, port 2000)

**Why?** Bandwidth Test Server can be used to:
- Consume your ISP bandwidth with fake tests
- Measure your router's performance (reveals specs)
- Launch resource exhaustion attacks

---

### Step 10: Block SNMP

**Option A: Terminal**
```routeros
/snmp set enabled=no
/ip firewall filter add action=drop chain=input dst-port=161,162 \
    in-interface-list=WAN protocol=tcp comment="Block SNMP"
/ip firewall filter add action=drop chain=input dst-port=161,162 \
    in-interface-list=WAN protocol=udp
```

**Option B: Winbox**
1. **IP → SNMP** → Uncheck **Enabled**
2. **IP → Firewall → Filter Rules** → Click **+** (ports 161/162)

**Why?** SNMP (Simple Network Management Protocol) can leak:
- System uptime, CPU/memory usage
- Network interface statistics
- Router model and firmware version
- Community strings (often default: "public")

---

### Step 11: Block The Dude

**Option A: Terminal**
```routeros
/ip firewall filter add action=drop chain=input dst-port=2210,2211 \
    in-interface-list=WAN protocol=tcp comment="Block The Dude"
/ip firewall filter add action=drop chain=input dst-port=2210,2211 \
    in-interface-list=WAN protocol=udp
```

**Option B: Winbox**
1. **IP → Firewall → Filter Rules** → Click **+** (ports 2210/2211)

**Why?** The Dude is MikroTik's network monitoring/mapping tool. Exposing it allows attackers to map your network topology and gain system information.

---

### Step 12: Block IP Cloud & DDNS

**Option A: Terminal**
```routeros
/ip cloud set ddns-enabled=no
/ip cloud advanced set use-local-address=no
/ip cloud set update-time=no
```

**Option B: Winbox**
1. **IP → Cloud** → Uncheck **DDNS Enabled**, **Update Time**
2. **IP → Cloud → Advanced** → Uncheck **Use Local Address**

**Why?** IP Cloud connects your router to MikroTik's cloud service:
- Reveals your public IP to MikroTik
- Can be used for remote access if compromised
- Adds unnecessary external dependencies

---

### Step 13: Obfuscate Router Identity

**Option A: Terminal**
```routeros
/system identity set name="PC"
/interface ethernet set "ether1" mac-address="1E:D5:BD:83:71:0D"
```

**Option B: Winbox**
1. **System → Identity** → Set **Name:** `PC` (or any generic name)
2. **Interfaces → Ethernet** → Select **ether1** → Set **MAC Address:** `1E:D5:BD:83:71:0D`

**Why?** Changing identity/MAC makes your router appear as a generic PC instead of a MikroTik device. Combine with above rules for true invisibility.

:::warning
**MAC Address Change:** Generate a **random unicast MAC** (first octet ends in even number: `1E`, `2C`, `4A`, etc.). Using Broadcast MACs will break networking.
:::

---

## Advanced Configuration: Complete Hardened Firewall

This is a production-ready firewall ruleset combining all blocking rules plus essential management access:

**Option A: Terminal**
```routeros
# Step 1: Create interface lists
/interface list add name=WAN
/interface list add name=LAN
/interface list member add interface="ether1" list=WAN
/interface list member add interface="ether2" list=LAN

# Step 2: Create admin access list (allow these IPs to manage router)
/ip firewall address-list
add address=192.168.88.0/24 list=AdminAccess comment="LAN subnet"
add address=203.0.113.50 list=AdminAccess comment="VPN client IP"

# Step 3: Firewall rules (in order of evaluation)
/ip firewall filter

# Accept established connections (CRITICAL - must be early)
add action=accept chain=input comment="Accept established,related,untracked" \
    connection-state=established,related,untracked

# Drop invalid traffic
add action=drop chain=input comment="Drop invalid" connection-state=invalid

# Allow ICMP (ping) for diagnostics
add action=accept chain=input protocol=icmp comment="Allow ICMP"

# Allow loopback
add action=accept chain=input dst-address=127.0.0.1 comment="Allow loopback"

# Allow admin access (SSH/Winbox from trusted IPs only)
add action=accept chain=input src-address-list=AdminAccess dst-port=22,8291 \
    protocol=tcp comment="Admin SSH/Winbox access"

# Allow LAN DNS queries
add action=accept chain=input in-interface-list=LAN dst-port=53 \
    protocol=tcp comment="LAN DNS-TCP"
add action=accept chain=input in-interface-list=LAN dst-port=53 \
    protocol=udp comment="LAN DNS-UDP"

# BLOCK ALL FROM WAN - Scanning & Reconnaissance
add action=drop chain=input in-interface-list=WAN dst-port=21,22,23,80,443,8728,8729 \
    protocol=tcp comment="Block service ports"
add action=drop chain=input in-interface-list=WAN dst-port=21,22,23,80,443,8728,8729 \
    protocol=udp comment="Block service ports UDP"

add action=drop chain=input in-interface-list=WAN dst-port=5678 \
    protocol=tcp comment="Block Neighbor Discovery"
add action=drop chain=input in-interface-list=WAN dst-port=5678 \
    protocol=udp comment="Block Neighbor Discovery UDP"

add action=drop chain=input in-interface-list=WAN dst-port=20561 \
    protocol=tcp comment="Block MAC-Winbox"
add action=drop chain=input in-interface-list=WAN dst-port=20561 \
    protocol=udp comment="Block MAC-Winbox UDP"

add action=drop chain=input in-interface-list=WAN dst-port=33434-33534 \
    protocol=tcp comment="Block Traceroute TCP"
add action=drop chain=input in-interface-list=WAN dst-port=33434-33534 \
    protocol=udp comment="Block Traceroute UDP"

add action=drop chain=input in-interface-list=WAN dst-port=53 \
    protocol=tcp comment="Block Open DNS"
add action=drop chain=input in-interface-list=WAN dst-port=53 \
    protocol=udp comment="Block Open DNS UDP"

add action=drop chain=input in-interface-list=WAN dst-port=161,162 \
    protocol=tcp comment="Block SNMP"
add action=drop chain=input in-interface-list=WAN dst-port=161,162 \
    protocol=udp comment="Block SNMP UDP"

add action=drop chain=input in-interface-list=WAN dst-port=2210,2211 \
    protocol=tcp comment="Block The Dude"
add action=drop chain=input in-interface-list=WAN dst-port=2210,2211 \
    protocol=udp comment="Block The Dude UDP"

add action=drop chain=input in-interface-list=WAN dst-port=3128,8080 \
    protocol=tcp comment="Block Proxy"
add action=drop chain=input in-interface-list=WAN dst-port=3128,8080 \
    protocol=udp comment="Block Proxy UDP"

add action=drop chain=input in-interface-list=WAN dst-port=2000 \
    protocol=tcp comment="Block Bandwidth Test"
add action=drop chain=input in-interface-list=WAN dst-port=2000 \
    protocol=udp comment="Block Bandwidth Test UDP"

# DROP ALL ELSE (default deny on input)
add action=drop chain=input comment="Drop all else"

# Forward chain (allow LAN to WAN traffic)
add action=fasttrack-connection chain=forward comment="FastTrack" \
    connection-state=established,related

add action=accept chain=forward connection-state=established,related,untracked \
    comment="Allow established forward"

add action=drop chain=forward connection-state=invalid comment="Drop invalid"

add action=accept chain=forward in-interface-list=LAN out-interface-list=WAN \
    comment="Allow LAN to WAN"

add action=drop chain=forward comment="Drop all forward"

# NAT (masquerade outgoing traffic)
/ip firewall nat
add action=masquerade chain=srcnat out-interface-list=WAN comment="Masquerade to WAN"

# Neighbor discovery
/ip neighbor discovery-settings set discover-interface-list=!WAN

# Disable vulnerable services
/tool mac-server mac-winbox set allowed-interface-list=none
/tool mac-server set allowed-interface-list=none
/tool mac-server ping set enabled=no
/ip proxy set enabled=no
/snmp set enabled=no
/tool bandwidth-server set enabled=no authenticate=yes
/tool romon port add interface=ether1 forbid=yes

# Obfuscate identity
/system identity set name="PC"
/interface ethernet set ether1 mac-address="1E:D5:BD:83:71:0D"

# IP Cloud
/ip cloud set ddns-enabled=no
/ip cloud advanced set use-local-address=no
/ip cloud set update-time=no
```

**Option B: Winbox** — Follow Steps 1-13 above in order, ensuring rules are added to `input` chain before any `accept` defaults.

---

## Verification Steps

### 1. Check Firewall Rules Are Applied

```routeros
/ip firewall filter print
# Should show 20+ rules in input chain, with service ports set to DROP
```

### 2. Verify Services Are Disabled

```routeros
/snmp print
# Should show "enabled: no"

/tool bandwidth-server print
# Should show "enabled: no"

/tool mac-server print
# Should show "allowed-interface-list: none"

/ip proxy print
# Should show "enabled: no"
```

### 3. Test from External Host (if possible)

```bash
# From an external network, try to reach common MikroTik ports
# (all should timeout or be rejected)

# Port scan attempt
nmap -p 22,23,80,443,8291,8728,8729 <your-router-WAN-IP>
# Expected: All ports filtered/closed

# Traceroute attempt
tracert <your-router-WAN-IP>
# Expected: Timeouts or max hops exceeded

# DNS query attempt
nslookup <router-hostname> <your-router-WAN-IP>
# Expected: Connection refused or timeout
```

### 4. Verify Admin Access Still Works

```routeros
# SSH from trusted IP should work
ssh admin@192.168.88.1

# Winbox from LAN should work
# (open Winbox, connect to 192.168.88.1)
```

### 5. Check Router Identity

```routeros
/system identity print
# Should show name="PC" (or your obfuscated name)

/interface ethernet print
# Should show custom MAC address
```

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Cannot SSH/Winbox from outside LAN | Port 22/8291 blocked by firewall | Add your external IP to `AdminAccess` address-list, or use VPN tunnel instead |
| Cannot access DNS from LAN clients | DNS rule blocks LAN | Verify rule has `in-interface-list=LAN`, not WAN. Run: `/ip firewall filter print` |
| Router still shows up in port scans | Firewall rules not applied | Check rule order: `/ip firewall filter print`. Ensure DROP rules are BEFORE any ACCEPT defaults. |
| Service still responds on blocked port | Service enabled in IP settings (not firewall) | Verify service is actually disabled: `/snmp print`, `/tool bandwidth-server print`, etc. |
| LAN clients cannot access internet | Forward chain rules incorrect | Verify: `in-interface-list=LAN` and `out-interface-list=WAN` with `action=accept` exists |
| Traceroute probe still gets response | Drop rule for port range 33434-33534 missing | Add both TCP and UDP rules for this port range |
| MAC-Winbox can still discover router | MAC Server not disabled | Run: `/tool mac-server set allowed-interface-list=none` and `/tool mac-server mac-winbox set allowed-interface-list=none` |

---

## Testing Firewall Effectiveness

### Scenario 1: Verify Port Blocks (From External Network)

**Test Tool:** `nmap`
```bash
nmap -sT -p 21,22,23,80,443,8728,8729 <router-WAN-IP>
```

**Expected Output:**
```
Nmap scan report for <router-WAN-IP>
Host is up.
PORT     STATE      SERVICE
21/tcp   filtered   ftp
22/tcp   filtered   ssh
23/tcp   filtered   telnet
80/tcp   filtered   http
443/tcp  filtered   https
8728/tcp filtered   unknown
8729/tcp filtered   unknown
```

**Result:** ✅ All ports are `filtered` (firewall is blocking probes)

---

### Scenario 2: Verify Neighbor Discovery Blocking

**Test Tool:** `tcpdump` on LAN + neighbor discovery probe
```bash
# On external switch/device on same LAN segment:
# Try to discover MikroTik via CDP/LLDP
# Using Cisco Discovery Protocol or Wireshark LLDP listener

# Expected: No response from router
```

---

### Scenario 3: Verify Traceroute Blocks

**Test Tool:** `tracert` (Windows) or `traceroute` (Linux)
```bash
tracert <router-WAN-IP>
# Expected: Hops timeout, no response from router IP
```

---

## Advanced Options

### 1. **Whitelist Specific Services**

If you need SSH or Winbox access from the internet (via VPN recommended):

```routeros
/ip firewall address-list
add address=203.0.113.100 list=AdminAccess comment="VPN tunnel IP"

# Add ACCEPT rule BEFORE the DROP rules:
/ip firewall filter
add action=accept chain=input src-address-list=AdminAccess dst-port=22,8291 \
    protocol=tcp comment="Allow admin from VPN" \
    place-before="Block service ports"
```

### 2. **Rate Limiting Brute-Force Attacks**

Even with ports blocked, someone might guess your address-list and try brute-force:

```routeros
/ip firewall filter
add chain=input protocol=tcp dst-port=22 src-address-list=AdminAccess \
    action=accept comment="Allow SSH from admin"

add chain=input protocol=tcp dst-port=22 \
    action=add-src-to-address-list address-list=brute-force \
    address-list-timeout=1h comment="Flag SSH attempts"

# After 5 failed attempts, block for 1 hour (requires fail2ban or script)
```

### 3. **Block by Country (GeoIP)**

```routeros
/ip firewall address-list
add address=203.0.113.0/24 list=BlockedCountry comment="Example blocklist"

/ip firewall filter
add chain=input src-address-list=BlockedCountry action=drop \
    comment="Block countries"
```

### 4. **Stealth Firewall + Null Routing**

Respond with nothing (not even ICMP unreachable):

```routeros
# Instead of DROP, use REJECT (sends ICMP message = fingerprint)
# Use DROP + null route to avoid ANY response:

/ip route
add dst-address=203.0.113.0/24 action=blackhole comment="Drop traffic completely"
```

### 5. **Port Knocking (Advanced Access Control)**

Require a sequence of port probes before allowing SSH:

```routeros
/ip firewall filter
add chain=input protocol=tcp dst-port=9001 action=add-src-to-address-list \
    address-list=knock1 address-list-timeout=10s

add chain=input protocol=tcp dst-port=9002 \
    src-address-list=knock1 action=add-src-to-address-list \
    address-list=knock2 address-list-timeout=10s

add chain=input protocol=tcp dst-port=9003 \
    src-address-list=knock2 action=add-src-to-address-list \
    address-list=knock3 address-list-timeout=60s

add chain=input protocol=tcp dst-port=22 \
    src-address-list=knock3 action=accept comment="Port knock unlocked SSH"

add chain=input protocol=tcp dst-port=22 action=drop
```

Client knocks: `9001 → 9002 → 9003` in sequence, then SSH port opens for 60s.

---

## Security Best Practices

1. **Always use strong passwords:** Even with firewall rules, weak passwords = compromised
   ```routeros
   /user set admin password="Tr0pic@l!Sunset#2025"
   ```

2. **Enable firewall FastTrack for performance:**
   ```routeros
   /ip firewall filter add chain=forward action=fasttrack-connection \
       connection-state=established,related comment="FastTrack"
   ```

3. **Backup firewall rules regularly:**
   ```routeros
   /export file=firewall-backup-$(date +%Y%m%d)
   ```

4. **Monitor failed login attempts:**
   ```routeros
   /log print where (message~"bad password" || message~"failed")
   ```

5. **Use firewall address-lists for maintenance:**
   ```routeros
   /ip firewall address-list add list=ToDelete address=10.0.0.0/8
   # Later: /ip firewall address-list remove [find list=ToDelete]
   ```

6. **Test firewall changes in "place-before" mode:**
   ```routeros
   # Insert test rule before critical ones to avoid breaking connectivity
   /ip firewall filter add ... place-before=<rule-number>
   ```

---

## Related Guides

- [MikroTik Failover Methods](../Routing/failover-methods-comparison)
- [Policy-Based Routing (PBR) for Call Center VPNs](../Routing/pbr-call-center-vpn)
- [Policy-Based Routing (PBR) for GCash](../Routing/pbr-gcash-mobile-wallet)
- [Quality of Service (QoS) Setup](../Bandwidth/guest-bandwidth-dhcp-on-up)

---

✅ **Security Hardening Complete!** Your MikroTik router is now invisible to port scans, neighbor discovery, and fingerprinting attempts. Monitor firewall logs regularly for suspicious patterns.

