---
sidebar_position: 6
---

# 🎯 WFH VPNs PBR

This guide explains how to configure Policy-Based Routing (PBR) to intelligently route home call center traffic (RDP, VPN protocols, MS Teams) through a dedicated VPN gateway while keeping other traffic on your main ISP. This prevents VPN congestion, ensures low-latency calls, and isolates business traffic from residential usage.

:::info
**Key Takeaway:** PBR lets you route specific traffic types to specific gateways based on source IP, destination IP, port, or protocol—rather than just using the default routing table for everything.
:::

---

## Prerequisites

✅ MikroTik RouterOS v6.45+  
✅ Two internet connections: Primary ISP + VPN gateway (or dedicated VPN tunnel)  
✅ LAN subnet configured (e.g., 192.168.88.0/24)  
✅ Call center server/endpoint IPs or address-list already defined  
✅ Understanding of routing tables and firewall mangle rules  
✅ SSH or Winbox access to router  

---

## Why PBR for Call Center VPNs?

### Problem Without PBR

```
All LAN Traffic
    │
    ├─ Web browsing → ISP (fast)
    ├─ Video streaming → ISP (fast, bandwidth consumed)
    ├─ RDP/VoIP → ISP (OK, but competes with streaming)
    └─ VPN tunnels → ISP (all through one connection)

RESULT:
❌ Video = bandwidth starvation for VoIP
❌ Buffering calls during downloads
❌ No traffic prioritization
```

### Solution With PBR

```
LAN Traffic with PBR Rules
    │
    ├─ Call Center traffic (RDP, specific VPN ports) → VPN Gateway (dedicated)
    │  └─ Low latency, guaranteed bandwidth
    ├─ MS Teams (port 3478-3481) → VPN Gateway (dedicated)
    │  └─ Crystal clear voice/video
    └─ Everything else (web, video, general traffic) → ISP (main connection)
       └─ Separate path, no VoIP interference

RESULT:
✅ Calls isolated from general traffic
✅ VPN tunnel only carries business traffic
✅ ISP connection remains available for bulk transfers
✅ Call quality stable and predictable
```

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│ LAN Client (192.168.88.100)                                  │
│ Initiating RDP connection to call center (10.0.0.50:3389)   │
└──────────────┬───────────────────────────────────────────────┘
               │
               ▼
        ┌──────────────────┐
        │ Firewall Mangle  │
        │ (Mark Matching)  │
        └────┬──────────┬──┘
             │ Step 1   │
             │ Prerouting
             │ Analyze packet:
             │ • Source: 192.168.88.100 ✓ (in LAN)
             │ • Destination: 10.0.0.50 ✓ (in pbr_cc_vpn list)
             │ • Port: 3389 ✓ (in CC ports)
             │ • State: NEW connection ✓
             │
             ▼
        ┌──────────────────────┐
        │ Mark Connection      │
        │ cc_conn             │
        └────────┬─────────────┘
             Step 2
             Create connection-mark
             (All future packets in this
              connection use same mark)
             │
             ▼
        ┌──────────────────────────┐
        │ Mark Routing             │
        │ to-pbr_cc_vpn           │
        └────────┬─────────────────┘
             Step 3
             Assign routing-mark
             (Use alternate routing table)
             │
             ▼
        ┌──────────────────────────┐
        │ Routing Table Lookup     │
        │ Table: to-pbr_cc_vpn     │
        │ (Not main table)         │
        └────────┬─────────────────┘
             Step 4
             Query dedicated routing table
             Default route: VPN Gateway
             (e.g., 10.2.2.1 via tunnel)
             │
             ▼
        ┌──────────────────────────┐
        │ Send via VPN Gateway     │
        │ Isolation from ISP traffic│
        │ Low-latency VoIP channel  │
        └──────────────────────────┘
```

---

## Configuration: Step-by-Step

### Step 1: Create Custom Routing Table

**Option A: Terminal**
```routeros
/routing table
add disabled=no fib name=to-pbr_cc_vpn
```

**Option B: Winbox**
1. Go to: **IP → Routing → Routing Tables**
2. Click **+**:
   - **Name:** to-pbr_cc_vpn
   - **Disabled:** unchecked
   - **FIB:** checked ← Enables forwarding information base

**Why?** Creating a custom routing table isolates VPN traffic from the main routing table. All routes in this table can be different from the default route.

---

### Step 2: Create Address Lists (Traffic Classification)

Before writing mangle rules, define which traffic is "call center":

**Option A: Terminal**
```routeros
# Define call center VPN servers
/ip firewall address-list
add address=10.0.0.50 list=pbr_cc_vpn comment="Call Center Server 1"
add address=10.0.0.51 list=pbr_cc_vpn comment="Call Center Server 2"
add address=203.0.113.100/30 list=pbr_cc_vpn comment="VPN Gateway subnet"

# Define local LAN addresses (sources)
add address=192.168.88.0/24 list=local comment="LAN subnet"

# Define non-local addresses (internet)
add address=0.0.0.0/0 list=!local comment="Not local (internet)"
```

**Option B: Winbox**
1. Go to: **IP → Firewall → Address Lists**
2. Click **+** for each:
   - **Address:** 10.0.0.50 | **List:** pbr_cc_vpn | **Comment:** Call Center Server 1
   - **Address:** 192.168.88.0/24 | **List:** local | **Comment:** LAN subnet

---

### Step 3: Create Firewall Mangle Rules (Connection Marking)

**Option A: Terminal**
```routeros
/ip firewall mangle

# Rule 1: Mark RDP + VPN protocol traffic destined to CC servers
add action=mark-connection chain=prerouting \
    comment="PBR Call Center VPNs" \
    connection-mark=no-mark connection-state=new \
    dst-address-list=pbr_cc_vpn \
    in-interface-list=LAN \
    new-connection-mark=cc_conn \
    src-address-list=local

# Rule 2: Mark specific VPN/RDP ports to non-CC servers (backup route)
add action=mark-connection chain=prerouting \
    connection-mark=no-mark connection-state=new \
    dst-address-list=!local \
    dst-port=3389,4433,10000,500,4500,60004,1701 \
    in-interface-list=LAN \
    new-connection-mark=cc_conn \
    protocol=udp \
    src-address-list=local

# Rule 3: Mark TCP versions of same ports
add action=mark-connection chain=prerouting \
    connection-mark=no-mark connection-state=new \
    dst-address-list=!local \
    dst-port=3389,4433,10000,60004 \
    in-interface-list=LAN \
    new-connection-mark=cc_conn \
    protocol=tcp \
    src-address-list=local

# Rule 4: Mark MS Teams ports (UDP)
add action=mark-connection chain=prerouting \
    comment="MS TEAMS PORTS" \
    connection-mark=no-mark connection-state=new \
    dst-address-list=!local \
    dst-port=3478,3479,3480,3481 \
    in-interface-list=LAN \
    new-connection-mark=cc_conn \
    protocol=udp \
    src-address-list=local

# Rule 5: Apply routing mark to marked connections
add action=mark-routing chain=prerouting \
    connection-mark=cc_conn \
    in-interface-list=LAN \
    new-routing-mark=to-pbr_cc_vpn
```

**Option B: Winbox**
1. Go to: **IP → Firewall → Mangle**
2. Click **+** for each rule above:
   - **Chain:** prerouting
   - **Protocol:** tcp/udp (as specified)
   - **Src. Address List:** local
   - **Dst. Address List:** pbr_cc_vpn (or !local for Rule 2-4)
   - **Dst. Port:** (see each rule)
   - **In. Interface List:** LAN
   - **Connection State:** new
   - **Connection Mark:** no-mark
   - **Action:** mark-connection
   - **New Connection Mark:** cc_conn (then cc_routing in Rule 5)

---

### Step 4: Create Routing Rules (Route Marked Traffic)

**Option A: Terminal**
```routeros
/ip route rule
add action=lookup routing-mark=to-pbr_cc_vpn table=to-pbr_cc_vpn \
    comment="Route CC VPN traffic to custom table"
```

**Option B: Winbox**
1. Go to: **IP → Route Rules**
2. Click **+**:
   - **Routing Mark:** to-pbr_cc_vpn
   - **Action:** lookup
   - **Table:** to-pbr_cc_vpn
   - **Comment:** Route CC VPN traffic to custom table

---

### Step 5: Create Routes in Custom Table

**Option A: Terminal**
```routeros
/ip route
# Add default route in custom table pointing to VPN gateway
add dst-address="0.0.0.0/0" gateway="10.2.2.1" \
    routing-table=to-pbr_cc_vpn \
    comment="VPN default route for CC traffic" distance=1

# Optional: Add specific routes in custom table
add dst-address="10.0.0.0/8" gateway="10.2.2.1" \
    routing-table=to-pbr_cc_vpn \
    comment="Private network via VPN" distance=1
```

**Option B: Winbox**
1. Go to: **IP → Routes**
2. Click **+**:
   - **Dst. Address:** 0.0.0.0/0
   - **Gateway:** 10.2.2.1 *(VPN tunnel interface or gateway)*
   - **Routing Table:** to-pbr_cc_vpn
   - **Comment:** VPN default route for CC traffic

---

## Port Reference Table

| Port(s) | Protocol | Service | Purpose |
|---------|----------|---------|---------|
| 3389 | TCP | Remote Desktop Protocol (RDP) | Windows remote desktop access |
| 4433 | TCP | HTTPS-ALT | Secure web/VPN management |
| 10000 | TCP | Webmin/VNC | Remote management panel |
| 500 | UDP | IPSec IKE | VPN key exchange |
| 4500 | UDP | IPSec NAT-T | IPSec over NAT traversal |
| 60004 | UDP | Custom VPN | Proprietary VPN protocol |
| 1701 | UDP | L2TP | Layer 2 Tunneling Protocol |
| 3478-3481 | UDP | MS Teams Media | Teams voice/video streams |

---

## Complete Configuration Example

**For a home call center with:**
- LAN: 192.168.88.0/24
- Call Center Server: 10.0.0.50
- VPN Gateway: 10.2.2.1
- Main ISP route: 0.0.0.0/0 via 192.168.1.1 (distance=1)

**Option A: Terminal (Paste All)**
```routeros
# Create routing table
/routing table
add disabled=no fib name=to-pbr_cc_vpn

# Define address lists
/ip firewall address-list
add address=192.168.88.0/24 list=local comment="LAN"
add address=10.0.0.50 list=pbr_cc_vpn comment="Call Center"
add address=203.0.113.0/24 list=pbr_cc_vpn comment="VPN Gateway"

# Mangle rules
/ip firewall mangle
add chain=prerouting comment="PBR Call Center VPNs" \
    connection-mark=no-mark connection-state=new \
    dst-address-list=pbr_cc_vpn in-interface-list=LAN \
    new-connection-mark=cc_conn src-address-list=local \
    action=mark-connection

add chain=prerouting connection-mark=no-mark connection-state=new \
    dst-address-list=!local dst-port=3389,4433,10000,500,4500,60004,1701 \
    in-interface-list=LAN new-connection-mark=cc_conn protocol=udp \
    src-address-list=local action=mark-connection

add chain=prerouting connection-mark=no-mark connection-state=new \
    dst-address-list=!local dst-port=3389,4433,10000,60004 \
    in-interface-list=LAN new-connection-mark=cc_conn protocol=tcp \
    src-address-list=local action=mark-connection

add chain=prerouting comment="MS TEAMS PORTS" \
    connection-mark=no-mark connection-state=new \
    dst-address-list=!local dst-port=3478,3479,3480,3481 \
    in-interface-list=LAN new-connection-mark=cc_conn protocol=udp \
    src-address-list=local action=mark-connection

add chain=prerouting connection-mark=cc_conn in-interface-list=LAN \
    new-routing-mark=to-pbr_cc_vpn action=mark-routing

# Route rules
/ip route rule
add action=lookup routing-mark=to-pbr_cc_vpn table=to-pbr_cc_vpn

# Routes in custom table
/ip route
add dst-address="0.0.0.0/0" gateway="10.2.2.1" \
    routing-table=to-pbr_cc_vpn comment="VPN for CC" distance=1

# Main ISP route (in default table)
add dst-address="0.0.0.0/0" gateway="192.168.1.1" \
    routing-table=main comment="ISP default" distance=1
```

---

## Verification Steps

### 1. Check Routing Table Exists

```routeros
/routing table print
# Should show: to-pbr_cc_vpn (flags: F for FIB)
```

### 2. Verify Mangle Rules Applied

```routeros
/ip firewall mangle print
# Should show 5 rules with:
# - connection-mark=cc_conn
# - routing-mark=to-pbr_cc_vpn
```

### 3. Verify Address Lists

```routeros
/ip firewall address-list print
# Should show local, pbr_cc_vpn lists with addresses
```

### 4. Check Route Rules

```routeros
/ip route rule print
# Should show rule with routing-mark=to-pbr_cc_vpn table=to-pbr_cc_vpn
```

### 5. Verify Routes in Custom Table

```routeros
/ip route print where routing-table=to-pbr_cc_vpn
# Should show: 0.0.0.0/0 via 10.2.2.1
```

### 6. Test Live Traffic (From LAN Client)

**Test 1: RDP to Call Center**
```bash
# On LAN client, RDP to call center server
mstsc /v:10.0.0.50

# Check path on MikroTik:
/tool traceroute 10.0.0.50
# Should route via 10.2.2.1 (VPN gateway), not ISP
```

**Test 2: Regular Internet**
```bash
# On LAN client, browse web
ping 8.8.8.8

# Check path on MikroTik:
/tool traceroute 8.8.8.8
# Should route via 192.168.1.1 (ISP), not VPN
```

### 7. Monitor Connection Marks

```routeros
/ip firewall connection tracking print
# Should show connections with mark=cc_conn (call center traffic)
```

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| RDP traffic still uses ISP instead of VPN | Mangle rule doesn't match, or routing-mark not applied | Run `/ip firewall mangle print stats` to see rule hit count. Verify dst-port 3389 is in rule. Check `/ip firewall connection tracking print` for mark=cc_conn. |
| VPN traffic fails completely (timeout) | Custom routing table missing, or route points to wrong gateway | Verify table exists: `/routing table print`. Verify route: `/ip route print where routing-table=to-pbr_cc_vpn`. Test gateway: `/ping 10.2.2.1`. |
| Some connections still use ISP | Rule condition not specific enough, or connection state != new | Verify rule matches exact ports/protocols. Check if traffic uses different port. Ensure `connection-state=new` in rule. |
| Address list not working | List syntax error, or addresses not added correctly | Verify address lists: `/ip firewall address-list print`. Check address format (single IP or CIDR). |
| Teams calls drop on failover | No secondary VPN route in custom table | Add backup route: `/ip route add dst-address=0.0.0.0/0 gateway=10.2.2.2 routing-table=to-pbr_cc_vpn distance=2` |
| Routing rule not evaluating | Rule disabled, or lower-priority rule matching first | Check rule order: `/ip route rule print`. Move CC rule before default rules. Verify `action=lookup`. |
| Performance: Latency to VPN high | VPN gateway overloaded, or QoS not configured | Check VPN tunnel stats: `/interface print stats`. Enable QoS on custom table routes. Monitor gateway CPU usage. |

---

## Advanced Options

### 1. **Add Secondary/Backup VPN Route**

```routeros
/ip route
add dst-address="0.0.0.0/0" gateway="10.2.2.2" \
    routing-table=to-pbr_cc_vpn comment="Backup VPN" distance=2
```

Failover to second VPN gateway if primary goes down.

---

### 2. **Add Specific Subnet Routes (Not Just Default)**

```routeros
/ip route
# Route internal company network via VPN
add dst-address="10.0.0.0/8" gateway="10.2.2.1" \
    routing-table=to-pbr_cc_vpn comment="Company private network"

# Route data center network via VPN
add dst-address="203.0.113.0/24" gateway="10.2.2.1" \
    routing-table=to-pbr_cc_vpn comment="Company data center"
```

More efficient than default 0.0.0.0/0 when routes are specific.

---

### 3. **Per-User VPN Routing**

Route different users to different VPN gateways:

```routeros
/ip firewall address-list
add address=192.168.88.100 list=user_alice comment="Alice"
add address=192.168.88.101 list=user_bob comment="Bob"

/ip firewall mangle
# Alice → VPN Gateway 1
add chain=prerouting src-address-list=user_alice \
    dst-port=3389,4433,10000 protocol=tcp \
    action=mark-routing new-routing-mark=vpn-alice

# Bob → VPN Gateway 2
add chain=prerouting src-address-list=user_bob \
    dst-port=3389,4433,10000 protocol=tcp \
    action=mark-routing new-routing-mark=vpn-bob

/ip route rule
add routing-mark=vpn-alice table=table-alice
add routing-mark=vpn-bob table=table-bob

/ip route
add dst-address=0.0.0.0/0 gateway=10.2.2.1 routing-table=table-alice
add dst-address=0.0.0.0/0 gateway=10.2.2.2 routing-table=table-bob
```

---

### 4. **QoS on VPN Table Routes**

Prevent VPN from saturating by limiting bandwidth:

```routeros
/queue simple
add name="cc-vpn-limit" target=10.2.2.1 max-limit=20M/20M \
    comment="Limit CC VPN to 20Mbps"
```

---

### 5. **Exclude Certain Traffic from PBR**

Route only VPN, but NOT Teams to avoid double-tunneling:

```routeros
/ip firewall mangle
add chain=prerouting dst-port=3478-3481 protocol=udp \
    action=mark-routing new-routing-mark=main
```

This bypasses PBR for Teams (uses main table instead).

---

### 6. **Log Matched Connections**

Debug PBR by logging marked connections:

```routeros
/ip firewall mangle
add chain=prerouting connection-mark=cc_conn \
    action=log log-prefix="CC_VPN_ROUTED:"
```

View logs: `/log print where message~"CC_VPN_ROUTED"`

---

## Performance Optimization

### Fasttrack for Non-VPN Traffic

Skip mangle processing for non-VPN traffic:

```routeros
/ip firewall filter
add chain=forward action=fasttrack-connection \
    connection-state=established,related \
    comment="FastTrack non-VPN"

add chain=forward connection-mark=!cc_conn \
    action=fasttrack-connection \
    comment="FastTrack LAN↔ISP"
```

---

### Reduce Mangle Rule Overhead

**Before (5 rules to evaluate every packet):**
```routeros
Rule 1: dst-address-list=pbr_cc_vpn
Rule 2: dst-port=3389,4433,... protocol=udp
Rule 3: dst-port=3389,4433,... protocol=tcp
Rule 4: dst-port=3478-3481 protocol=udp
Rule 5: mark-routing (apply)
```

**After (use single combined rule):**
```routeros
/ip firewall mangle
add chain=prerouting connection-mark=no-mark connection-state=new \
    in-interface-list=LAN src-address-list=local \
    action=mark-connection new-connection-mark=cc_conn \
    ((dst-address-list=pbr_cc_vpn) || \
     (dst-address-list=!local dst-port=3389,4433,10000,500,4500,60004,1701 protocol=udp) || \
     (dst-address-list=!local dst-port=3389,4433,10000,60004 protocol=tcp) || \
     (dst-address-list=!local dst-port=3478-3481 protocol=udp))
```

Fewer rules = less CPU per packet.

---

## Real-World Example: Multi-VPN Setup

**Scenario:**
- **VPN-1:** Call Center (10.2.2.1) — low-latency, dedicated
- **VPN-2:** Company General VPN (10.3.3.1) — shared
- **ISP:** Primary internet (192.168.1.1)

```routeros
# Create separate tables
/routing table
add name=to-vpn-cc
add name=to-vpn-company

# Create address lists
/ip firewall address-list
add address=192.168.88.0/24 list=local
add address=10.0.0.50 list=pbr_cc_vpn comment="Call center"
add address=10.0.0.100-10.0.0.200 list=pbr_company comment="Company IPs"

# Mangle: CC → VPN-1
/ip firewall mangle
add chain=prerouting dst-address-list=pbr_cc_vpn src-address-list=local \
    action=mark-routing new-routing-mark=cc-mark

# Mangle: Company → VPN-2
add chain=prerouting dst-address-list=pbr_company src-address-list=local \
    action=mark-routing new-routing-mark=company-mark

# Route rules
/ip route rule
add routing-mark=cc-mark table=to-vpn-cc
add routing-mark=company-mark table=to-vpn-company

# Routes
/ip route
add dst-address=0.0.0.0/0 gateway=10.2.2.1 routing-table=to-vpn-cc
add dst-address=0.0.0.0/0 gateway=10.3.3.1 routing-table=to-vpn-company
add dst-address=0.0.0.0/0 gateway=192.168.1.1 routing-table=main
```

---

## Related Guides

- [MikroTik Failover Methods](./failover-methods-comparison)
- [Policy-Based Routing (PBR) for GCash](./pbr-gcash-mobile-wallet)
- [Quality of Service (QoS) Setup](../Bandwidth/guest-bandwidth-dhcp-on-up)
- [MikroTik Security Hardening](../Security/router-hardening-hide-identify)

---

✅ **PBR Configuration Complete!** Your call center traffic now routes through the dedicated VPN tunnel, isolated from ISP traffic. Monitor connection marks and verify latency improvements on VoIP quality.

