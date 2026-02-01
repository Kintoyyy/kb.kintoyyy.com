---
sidebar_position: 7
---

# 💰 GCash PBR

This guide explains how to route GCash (and similar mobile payment applications) through a dedicated gateway or ISP connection. Useful for separating payment traffic from general browsing, prioritizing financial transactions, or routing through a more reliable connection with better geographic reach for payment processing.

:::info
**Key Takeaway:** PBR can inspect encrypted traffic using TLS SNI (Server Name Indication) and content patterns to identify and route payment apps through optimal paths, ensuring transaction reliability and low latency.
:::

---

## Prerequisites

✅ MikroTik RouterOS v6.45+  
✅ Two internet connections (Primary ISP + Premium/Backup ISP recommended)  
✅ LAN subnet configured (e.g., 192.168.88.0/24)  
✅ Understanding of mangle rules and routing tables  
✅ L7 (Layer 7) detection enabled on router (CPU overhead)  
✅ SSH or Winbox access to router  

:::warning
**CPU Impact:** Content inspection (L7) and TLS SNI matching consume more CPU than simple port-based rules. Monitor router CPU usage after enabling these rules on high-traffic connections.
:::

---

## Why PBR for GCash?

### Problem Without PBR

```
All LAN Traffic
├─ Web browsing → ISP-1 (fast, but congested)
├─ Video streaming → ISP-1 (bandwidth heavy)
├─ GCash transactions → ISP-1 (competes for bandwidth)
│  └─ ❌ Slow payment processing
│  └─ ❌ Transaction timeout risk
└─ Downloads → ISP-1 (saturated)

Result:
❌ GCash app slow to load
❌ Payment confirmations delayed
❌ Inconsistent transaction success rates
```

### Solution With PBR

```
LAN Traffic with GCash PBR
├─ GCash traffic → ISP-2 (Premium/Reliable connection)
│  └─ ✅ Dedicated bandwidth for payments
│  └─ ✅ Better geographic routing to payment processors
│  └─ ✅ Lower latency for transaction confirmation
├─ Web browsing → ISP-1 (general)
├─ Video streaming → ISP-1 (bulk)
└─ Downloads → ISP-1

Result:
✅ Fast transaction processing
✅ High success rate (no timeouts)
✅ Consistent payment experience
```

---

## GCash Detection Methods

This guide uses three complementary detection methods:

### Method 1: Content Inspection (Layer 7)

**What it does:** Deep Packet Inspection (DPI) searches packet payload for the string "gcash"

**Pros:**
- Catches embedded GCash traffic in encrypted connections
- Works on any port (not limited to HTTP/HTTPS default ports)

**Cons:**
- High CPU usage (inspects every packet)
- May have false positives if string appears in other traffic

**When used:** As fallback or supplementary rule

```
Packet Data: "...gcash-api-response..."
                     ↓
            String "gcash" found?
                     ↓
                    YES
                     ↓
            Mark connection: gcash-conn
```

---

### Method 2: TLS SNI Matching

**What it does:** Inspects TLS (HTTPS) handshake to extract server name (without decrypting)

**Pros:**
- Works on encrypted traffic (doesn't decrypt)
- Pattern matching: `*gcash.com` catches all GCash subdomains
- Lower CPU than full content inspection
- Accurate (server announces its name in clear)

**Cons:**
- Only works on TLS 1.2+ (older connections might not include SNI)
- Requires TLS enabled on server

**When used:** Primary detection method for HTTPS GCash traffic

```
TLS ClientHello (Unencrypted)
│
├─ Server Name: api.gcash.com
├─ Server Name: m.gcash.com
├─ Server Name: checkout.gcash.com
│
└─ Pattern: *gcash.com matches!
             ↓
        Mark connection: gcash-conn
```

---

### Method 3: Exact Domain Matching

**What it does:** Matches specific known GCash domains

**Pros:**
- Most precise detection
- Works on any protocol
- No CPU overhead compared to wildcard

**Cons:**
- Must maintain list of known domains
- May miss new/updated GCash endpoints

**When used:** For specific high-traffic GCash domains (e.g., m.gcash.com)

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│ LAN Client (192.168.88.100)                                  │
│ Opens GCash app → connects to api.gcash.com                  │
└──────────────────┬───────────────────────────────────────────┘
                   │
                   ▼ HTTPS/TLS Connection
          ┌────────────────────────┐
          │ Firewall Mangle Rules  │
          │ (Prerouting Chain)     │
          └────┬──────┬──────┬─────┘
               │      │      │
       Rule 1  │      │      │ Rule 3
       Content │      │      │ Exact Domain
       Inspect │      │      │ (m.gcash.com)
               │      │      │
               │   Rule 2    │
               │   TLS SNI   │
               │   (*gcash.com)
               │      │      │
               └──────┼──────┘
                      │
                      ▼
          ┌────────────────────────┐
          │ Does ANY rule match?   │
          └────┬──────────────────┘
               │
         ┌─────┴─────┐
         │           │
        YES          NO
         │           │
         ▼           ▼
    Mark:      Not marked
    gcash-conn (uses main table)
         │
         ▼
    ┌────────────────────────┐
    │ Apply Routing Mark     │
    │ to-gcash               │
    └────────┬───────────────┘
             │
             ▼
    ┌────────────────────────┐
    │ Route Lookup           │
    │ Table: to-gcash        │
    │ (Not main)             │
    └────────┬───────────────┘
             │
             ▼
    ┌────────────────────────┐
    │ Send via Premium ISP   │
    │ (e.g., 10.2.2.1)       │
    │                        │
    │ ✅ Dedicated path      │
    │ ✅ Low latency         │
    │ ✅ Better processors   │
    └────────────────────────┘
```

---

## Configuration: Step-by-Step

### Step 1: Create Custom Routing Table for GCash

**Option A: Terminal**
```routeros
/routing table
add disabled=no fib name=to-gcash
```

**Option B: Winbox**
1. Go to: **IP → Routing → Routing Tables**
2. Click **+**:
   - **Name:** to-gcash
   - **Disabled:** unchecked
   - **FIB:** checked

---

### Step 2: Create Address Lists

**Option A: Terminal**
```routeros
/ip firewall address-list
# Define local LAN
add address=192.168.88.0/24 list=local comment="LAN subnet"

# Optional: GCash-specific IP ranges (if known)
add address=203.0.113.0/24 list=gcash-ips comment="GCash servers (example)"
```

**Option B: Winbox**
1. Go to: **IP → Firewall → Address Lists**
2. Click **+**:
   - **Address:** 192.168.88.0/24 | **List:** local | **Comment:** LAN subnet

---

### Step 3: Create Mangle Rules (Content & TLS Matching)

**Option A: Terminal**
```routeros
/ip firewall mangle

# Rule 1: Content inspection for "gcash" string in any protocol
add action=mark-connection chain=prerouting \
    comment="GCASH PBR - Content Inspect" \
    content=gcash \
    dst-address-list=!local \
    new-connection-mark=gcash-conn \
    protocol=tcp

# Rule 2: TLS SNI matching for *.gcash.com (HTTPS)
add action=mark-connection chain=prerouting \
    dst-address-list=!local \
    new-connection-mark=gcash-conn \
    protocol=tcp \
    tls-host="*gcash.com"

# Rule 3: Exact domain matching for m.gcash.com
add action=mark-connection chain=prerouting \
    content="m.gcash.com" \
    dst-address-list=!local \
    new-connection-mark=gcash-conn

# Rule 4: Apply routing mark to marked connections
add action=mark-routing chain=prerouting \
    connection-mark=gcash-conn \
    new-routing-mark=to-gcash \
    passthrough=no
```

**Option B: Winbox**
1. Go to: **IP → Firewall → Mangle**
2. Click **+** for Rule 1:
   - **Chain:** prerouting
   - **Protocol:** tcp
   - **Content:** gcash
   - **Dst. Address List:** !local
   - **Action:** mark-connection
   - **New Connection Mark:** gcash-conn
   - **Comment:** GCASH PBR - Content Inspect

3. Click **+** for Rule 2:
   - **Chain:** prerouting
   - **Protocol:** tcp
   - **TLS Host:** *gcash.com
   - **Dst. Address List:** !local
   - **Action:** mark-connection
   - **New Connection Mark:** gcash-conn
   - **Comment:** GCASH PBR - TLS SNI

4. Click **+** for Rule 3:
   - **Chain:** prerouting
   - **Content:** m.gcash.com
   - **Dst. Address List:** !local
   - **Action:** mark-connection
   - **New Connection Mark:** gcash-conn
   - **Comment:** GCASH PBR - Exact Domain

5. Click **+** for Rule 4:
   - **Chain:** prerouting
   - **Connection Mark:** gcash-conn
   - **Action:** mark-routing
   - **New Routing Mark:** to-gcash
   - **Passthrough:** no

---

### Step 4: Create Route Rules

**Option A: Terminal**
```routeros
/ip route rule
add action=lookup routing-mark=to-gcash table=to-gcash \
    comment="Route GCash to dedicated table"
```

**Option B: Winbox**
1. Go to: **IP → Route Rules**
2. Click **+**:
   - **Routing Mark:** to-gcash
   - **Action:** lookup
   - **Table:** to-gcash
   - **Comment:** Route GCash to dedicated table

---

### Step 5: Create Routes in Custom Table

**Option A: Terminal**
```routeros
/ip route

# Primary route for GCash traffic through Premium ISP
add dst-address="0.0.0.0/0" gateway="10.2.2.1" \
    routing-table=to-gcash \
    comment="GCash via Premium ISP" \
    distance=1

# Optional: Backup route if primary fails
add dst-address="0.0.0.0/0" gateway="10.2.2.2" \
    routing-table=to-gcash \
    comment="GCash backup route" \
    distance=2

# Main ISP route (default table) - existing, do not change
# add dst-address="0.0.0.0/0" gateway="192.168.1.1" ...
```

**Option B: Winbox**
1. Go to: **IP → Routes**
2. Click **+**:
   - **Dst. Address:** 0.0.0.0/0
   - **Gateway:** 10.2.2.1 *(Premium ISP gateway)*
   - **Routing Table:** to-gcash
   - **Comment:** GCash via Premium ISP

---

## Mangle Rules Explained

| Rule # | Condition | Detection | Purpose |
|--------|-----------|-----------|---------|
| 1 | `content=gcash` | Deep packet inspection | Catches embedded GCash strings anywhere in traffic |
| 2 | `tls-host="*gcash.com"` | TLS SNI (unencrypted handshake) | Matches all GCash subdomains (api, m, checkout, etc.) |
| 3 | `content="m.gcash.com"` | Domain string matching | Specific catch for mobile GCash (m.gcash.com) |
| 4 | `connection-mark=gcash-conn` | Routing mark application | Routes all marked GCash connections to custom table |

### Why Three Rules?

**Redundancy & Catch-All:**
- Rule 2 (TLS SNI) is fastest/most accurate
- Rule 1 (Content) catches non-standard ports
- Rule 3 (Exact) is failsafe for known high-volume endpoint

If any one fails, the others compensate.

---

## Complete Configuration Example

**Scenario:**
- LAN: 192.168.88.0/24
- Premium ISP (for GCash): 10.2.2.1
- Standard ISP (for general traffic): 192.168.1.1

**Option A: Terminal (Paste All)**
```routeros
# Create custom routing table
/routing table
add disabled=no fib name=to-gcash

# Define address lists
/ip firewall address-list
add address=192.168.88.0/24 list=local comment="LAN"

# Create mangle rules
/ip firewall mangle
add action=mark-connection chain=prerouting comment="GCASH PBR" \
    content=gcash dst-address-list=!local new-connection-mark=gcash-conn protocol=tcp

add action=mark-connection chain=prerouting dst-address-list=!local \
    new-connection-mark=gcash-conn protocol=tcp tls-host="*gcash.com"

add action=mark-connection chain=prerouting content="m.gcash.com" \
    dst-address-list=!local new-connection-mark=gcash-conn

add action=mark-routing chain=prerouting connection-mark=gcash-conn \
    new-routing-mark=to-gcash passthrough=no

# Create route rule
/ip route rule
add action=lookup routing-mark=to-gcash table=to-gcash

# Create routes in custom table
/ip route
add dst-address="0.0.0.0/0" gateway="10.2.2.1" routing-table=to-gcash \
    comment="GCash via Premium ISP" distance=1

# Main ISP route (if not already present)
add dst-address="0.0.0.0/0" gateway="192.168.1.1" routing-table=main \
    comment="Default ISP" distance=1
```

---

## Verification Steps

### 1. Check Routing Table

```routeros
/routing table print
# Should show: to-gcash (with F flag for FIB)
```

### 2. Verify Mangle Rules

```routeros
/ip firewall mangle print
# Should show 4 rules with gcash-conn mark and to-gcash routing-mark
```

### 3. Check Route Rules

```routeros
/ip route rule print
# Should show: routing-mark=to-gcash table=to-gcash
```

### 4. Verify Routes in Custom Table

```routeros
/ip route print where routing-table=to-gcash
# Should show: 0.0.0.0/0 via 10.2.2.1
```

### 5. Test Live GCash Traffic

**On LAN Client:**
```bash
# Open GCash app and perform transaction
# OR from terminal:
curl https://api.gcash.com
curl https://m.gcash.com

# On MikroTik, check connection marks:
```

**On Router:**
```routeros
/ip firewall connection tracking print where mark=gcash-conn
# Should show active GCash connections with mark=gcash-conn
```

### 6. Verify Path with Traceroute

```bash
# On LAN client:
tracert api.gcash.com
# First hop should be through 10.2.2.1 (Premium ISP)

tracert google.com
# First hop should be through 192.168.1.1 (Standard ISP)
```

### 7. Monitor Mangle Rule Hit Counts

```routeros
/ip firewall mangle print stats
# Show which rules are matching GCash traffic
# Rule 2 (TLS SNI) should have highest hit count
```

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| GCash traffic still uses main ISP | Mangle rule not matching, or routing-mark not applied | Check rule hit count: `/ip firewall mangle print stats`. Verify destination is not in local list: `/ip firewall address-list print`. Test manually: `/ip firewall mangle add ... match-count show`. |
| Rule 2 (TLS SNI) not working | TLS 1.2 not enabled, or GCash uses custom port | Enable L7 debug: `/ip firewall mangle set X debug=yes`. Check if traffic uses port 443. Verify tls-host syntax: should be `"*gcash.com"` not `*.gcash.com`. |
| High CPU usage | Content inspection (Rule 1) enabled on all traffic | Disable Rule 1 if Rule 2 catches all: `/ip firewall mangle disable [find content=gcash]`. Monitor: `/system resource print`. |
| GCash app still slow | Route gateway unreachable or overloaded | Test gateway: `/ping 10.2.2.1`. Check gateway bandwidth: `/interface print stats`. Verify route exists: `/ip route print where routing-table=to-gcash`. |
| Routing rule not evaluating | Rule disabled, or routing-mark doesn't match | Check rule status: `/ip route rule print`. Verify routing-mark name matches exactly: `to-gcash`. Ensure rule order is before default rules. |
| Some GCash requests fail | TLS version mismatch or older app version | Check app version (requires TLS 1.2+). Try adding Rule 3 only: `/ip firewall mangle disable X Y` disable Rules 1&2, keep Rule 3. |
| Passthrough=no breaks other rules | Passthrough affects all downstream rules | Set `passthrough=yes` in Rule 4 if other mangle rules needed. Ensure Rule 4 is last in prerouting chain. |

---

## Advanced Options

### 1. **Add More GCash Endpoints**

As GCash updates their domains, add new rules:

```routeros
/ip firewall mangle
add action=mark-connection chain=prerouting \
    tls-host="*gcash*.com" \
    dst-address-list=!local \
    new-connection-mark=gcash-conn protocol=tcp \
    comment="GCash wildcard domain"

add action=mark-connection chain=prerouting \
    content="checkout.gcash.com" \
    new-connection-mark=gcash-conn \
    comment="GCash checkout domain"
```

---

### 2. **Per-User GCash Routing**

Route different users to different premium ISPs:

```routeros
/ip firewall address-list
add address=192.168.88.100 list=user_alice comment="Alice"
add address=192.168.88.101 list=user_bob comment="Bob"

/ip firewall mangle
add chain=prerouting src-address-list=user_alice \
    tls-host="*gcash.com" protocol=tcp \
    action=mark-routing new-routing-mark=gcash-alice

add chain=prerouting src-address-list=user_bob \
    tls-host="*gcash.com" protocol=tcp \
    action=mark-routing new-routing-mark=gcash-bob

/ip route
add dst-address=0.0.0.0/0 gateway=10.2.2.1 routing-table=gcash-alice
add dst-address=0.0.0.0/0 gateway=10.2.2.2 routing-table=gcash-bob
```

---

### 3. **GCash with QoS Priority**

Ensure GCash transactions get priority during congestion:

```routeros
/queue simple
add target=10.2.2.1 max-limit=10M/10M priority=1 \
    name="gcash-priority" comment="GCash queue priority"

add target=192.168.1.1 max-limit=50M/50M priority=8 \
    name="general-queue" comment="General traffic"
```

---

### 4. **Logging GCash Transactions**

Debug by logging all GCash connections:

```routeros
/ip firewall mangle
add chain=prerouting connection-mark=gcash-conn \
    action=log log-prefix="GCASH:" comment="Log GCash"

# View logs:
/log print where message~"GCASH"
```

---

### 5. **Conditional Routing (Time-Based)**

Route GCash through Premium ISP only during peak hours:

```routeros
/ip firewall mangle
add chain=prerouting tls-host="*gcash.com" protocol=tcp \
    time=09:00-17:00,Mon-Fri \
    action=mark-routing new-routing-mark=to-gcash \
    comment="GCash peak hours only"

# Off-peak: uses default main table
```

---

### 6. **Backup: Failover to Main ISP**

If Premium ISP goes down, fall back to main:

```routeros
/ip route
add dst-address="0.0.0.0/0" gateway="10.2.2.1" \
    routing-table=to-gcash comment="GCash primary" distance=1

add dst-address="0.0.0.0/0" gateway="192.168.1.1" \
    routing-table=to-gcash comment="GCash fallback" distance=2
```

Distance 2 (backup) kicks in if distance 1 gateway is unreachable.

---

## Performance Considerations

### CPU Impact by Rule Type

| Rule Type | CPU Cost | Recommendation |
|-----------|----------|-----------------|
| TLS SNI (`tls-host`) | 🟢 Low (1-2%) | ✅ Enable always |
| Content Inspect (`content`) | 🟡 Medium (5-10%) | ⚠️ Use sparingly, only for fallback |
| Simple Port-based | 🟢 Very Low (\<1%) | ✅ Preferred |

### Optimization Tips

1. **Disable high-CPU rules if not needed:**
   ```routeros
   /ip firewall mangle disable [find content=gcash]
   ```

2. **Use TLS SNI as primary (lowest CPU):**
   ```routeros
   # Keep only Rule 2 enabled, disable Rules 1 & 3
   ```

3. **Monitor router CPU:**
   ```routeros
   /system resource print
   # cpu should stay <70% under normal load
   ```

---

## Related Guides

- [Policy-Based Routing (PBR) for Call Center VPNs](./pbr-call-center-vpn)
- [MikroTik Failover Methods](./failover-methods-comparison)
- [Quality of Service (QoS) Setup](../Bandwidth/guest-bandwidth-dhcp-on-up)
- [Firewall Mangle Rules Deep Dive](../Security/firewall-mangle-advanced)

---

✅ **GCash PBR Configuration Complete!** Your payment transactions now route through the dedicated Premium ISP connection, ensuring fast, reliable processing. Monitor connection marks and verify transaction latency improvements.

