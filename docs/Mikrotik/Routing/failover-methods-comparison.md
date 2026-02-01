---
sidebar_position: 5
---

# 🌐 Failover Methods

This guide explains four distinct failover strategies in MikroTik for multi-ISP configurations, each with different mechanisms, latency profiles, and use cases. Understanding the flow and trade-offs helps you choose the right approach for your network topology.

:::info
**Key Takeaway:** Choose failover based on gateway complexity. Simple networks use **check-gateway**, multi-marked traffic uses **route rules**, recursive routes handle **advanced topologies**, and **netwatch** provides scripting flexibility for custom logic.
:::

---

## Prerequisites

✅ MikroTik RouterOS v6.45+ (all methods)  
✅ Two or more ISP gateways with known IPs (e.g., 192.168.1.1, 192.168.1.2)  
✅ Ability to SSH into router or access Winbox  
✅ Understanding of routing tables and gateway concepts  
✅ Test hosts accessible via each ISP (e.g., 1.1.1.1, 1.1.1.2)  

---

## Failover Detection Flow

All methods rely on **periodic health checks**. Here's the universal flow:

```
┌─────────────────┐
│  Traffic Sent   │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  Which Failover Method Active?          │
├─────────────────────────────────────────┤
│  ① check-gateway  → Built-in ping       │
│  ② route rules    → Built-in ping       │
│  ③ recursive      → Built-in ping       │
│  ④ netwatch       → External monitor    │
└────────┬────────────────────────────────┘
         │
         ▼
    ┌────────────────┐
    │  Health Check  │
    │  (Ping Probe)  │
    └────┬───────┬───┘
         │       │
    Response   No Response
    (OK)        (FAIL)
         │       │
         ▼       ▼
    ┌──────┐  ┌──────────────┐
    │ Use  │  │ Route Status │
    │ ISP  │  │ Update?      │
    └──────┘  └──────────────┘
              (depends on method)
```

---

## Method 1: Check-Gateway (Passive Built-In)

### How It Works

The router continuously pings a gateway IP and automatically disables the route if the gateway doesn't respond. When the gateway recovers, the route re-enables.

**Flow Diagram:**
```
┌───────────────────────────────────────────────┐
│ Primary Route (ISP-1, distance=1)             │
│ /ip route with check-gateway="ping"           │
│ Destination: 0.0.0.0/0                        │
│ Gateway: 192.168.1.1                          │
└────────┬────────────────────────────────────┬─┘
         │                                    │
   Every ~3s                              When Disabled
   Pings 192.168.1.1                        │
         │                                    │
         ├─ ICMP Response                     ▼
         │  Route Stays ACTIVE          ┌──────────────────┐
         │                              │ ISP-1 Unavailable│
         │                              └──────────────────┘
         │                                    │
         ├─ No Response (3 failed probes)    │
         │  Route Auto DISABLED         Secondary Route
         │                              (ISP-2, distance=2)
         │                              Takes Over
         │
         └─ Recovery: Response Received
            Route Re-enabled
```

### Configuration

**Option A: Terminal**
```routeros
/ip route
add dst-address="0.0.0.0/0" target-scope="10" distance="1" gateway="192.168.1.1" \
    comment="ISP-1" check-gateway="ping" scope="30" routing-table=main
add dst-address="0.0.0.0/0" target-scope="10" distance="2" gateway="192.168.1.2" \
    comment="ISP-2" check-gateway="ping" scope="30" routing-table=main
```

**Option B: Winbox**
1. Navigate to: **IP → Routes**
2. Click **+** to add first route:
   - **Dst. Address:** 0.0.0.0/0
   - **Gateway:** 192.168.1.1
   - **Distance:** 1
   - **Check Gateway:** ping
   - **Comment:** ISP-1
3. Click **+** to add second route:
   - **Dst. Address:** 0.0.0.0/0
   - **Gateway:** 192.168.1.2
   - **Distance:** 2
   - **Check Gateway:** ping
   - **Comment:** ISP-2

### Key Parameters Explained

| Parameter | Value | Meaning |
|-----------|-------|---------|
| `check-gateway` | `ping` | Use ICMP echo as health probe |
| `distance` | 1, 2, 3... | Route priority (lower = preferred) |
| `target-scope` | 10 | Scope flag for route categorization |
| `scope` | 30 | Route is managed by user/admin |

### Pros & Cons

| Pros | Cons |
|------|------|
| ✅ Simple—no scripting needed | ❌ Ping probe latency ~100-300ms |
| ✅ Built-in to RouterOS | ❌ Cannot distinguish between ISP failure vs. gateway failure |
| ✅ Minimal CPU overhead | ❌ No custom logic (always uses distance metric) |
| ✅ Works with any gateway | ❌ Probe target must be gateway IP itself |

### Use Case

**Best for:** Simple dual-ISP setups where each ISP provides a local gateway and both are directly reachable via ping.

---

## Method 2: Route Rules + Check-Gateway (Marked Traffic)

### How It Works

Combines `check-gateway` with policy-based routing. Traffic is **marked** with routing marks, then routed to specific ISPs via separate routing tables. If the ISP in the primary table fails, traffic fails over to the secondary.

**Flow Diagram:**
```
┌──────────────────────────────────────────────────────┐
│ Incoming Traffic                                     │
└────┬───────────────────────────────────────────┬─────┘
     │                                           │
     ▼                                           ▼
┌───────────────────────┐                ┌──────────────────┐
│ Has Routing Mark?     │                │ No Mark = Use    │
│ (via mangle/filter)   │                │ Default Table    │
└───┬───────────────────┘                │ (main)           │
    │                                    └──────────────────┘
    ├─ Mark=to-isp1                              │
    │  ▼                                         │
    │  /ip route rule lookup to-isp1 table      │
    │  ▼                                         │
    │  Query: to-isp1 Routing Table             │
    │  ISP-1 Primary (distance=1)               │
    │  Check-gateway status?                    │
    │  ├─ Active → Use ISP-1                    │
    │  └─ Down → No route found (packet drop)  │
    │                                           │
    ├─ Mark=to-isp2                             │
    │  ▼                                         │
    │  /ip route rule lookup to-isp2 table      │
    │  ▼                                         │
    │  Query: to-isp2 Routing Table             │
    │  ISP-2 Primary (distance=1)               │
    │  Check-gateway status?                    │
    │  ├─ Active → Use ISP-2                    │
    │  └─ Down → No route found (packet drop)  │
    │                                           │
    └─ No Mark                                  │
       ▼                                        │
       Uses default route (main table) ←───────┘
       ISP-1 Primary (distance=1)
       Check-gateway status?
       ├─ Active → Use ISP-1
       └─ Down → Fallback ISP-2 (distance=2)
```

### Configuration

**Option A: Terminal**
```routeros
# Step 1: Create routes in each ISP-specific table
/ip route
add dst-address="0.0.0.0/0" target-scope="10" distance="1" gateway="192.168.1.1" \
    comment="ISP-1" check-gateway="ping" scope="30" routing-table=to-isp1
add dst-address="0.0.0.0/0" target-scope="10" distance="1" gateway="192.168.1.2" \
    comment="ISP-2" check-gateway="ping" scope="30" routing-table=to-isp2

# Step 2: Create default routes in main table (fallback)
add dst-address="0.0.0.0/0" target-scope="10" distance="1" gateway="192.168.1.1" \
    comment="ISP-1-main" check-gateway="ping" scope="30" routing-table=main
add dst-address="0.0.0.0/0" target-scope="10" distance="2" gateway="192.168.1.2" \
    comment="ISP-2-main" check-gateway="ping" scope="30" routing-table=main

# Step 3: Create route rules to direct marked traffic
/ip route rule
add action=lookup disabled=no routing-mark=to-isp1 table=to-isp1
add action=lookup disabled=no routing-mark=to-isp2 table=to-isp2
add action=lookup-only-in-table disabled=no routing-mark=to-isp1 table=main
add action=lookup-only-in-table disabled=no routing-mark=to-isp2 table=main

# Step 4: Mark traffic with mangle rules (example: mark based on src-address)
/ip firewall mangle
add chain=prerouting src-address=192.168.100.0/24 action=mark-routing \
    new-routing-mark=to-isp1 passthrough=yes comment="Subnet-1 uses ISP-1"
add chain=prerouting src-address=192.168.101.0/24 action=mark-routing \
    new-routing-mark=to-isp2 passthrough=yes comment="Subnet-2 uses ISP-2"
```

**Option B: Winbox**
1. **Create ISP-specific routing tables:**
   - IP → Routes → Click **Routes** (empty list shows main table)
   - Right-click, **New** → Create route with **Routing Table:** `to-isp1` (repeat for `to-isp2`)

2. **Create route rules:**
   - IP → Route Rules → Click **+**
   - **Action:** lookup
   - **Routing Mark:** to-isp1
   - **Table:** to-isp1
   - Repeat for `to-isp2`

3. **Mark traffic with mangle:**
   - IP → Firewall → Mangle → Click **+**
   - **Chain:** prerouting
   - **Src. Address:** 192.168.100.0/24
   - **Action:** mark-routing
   - **New Routing Mark:** to-isp1
   - Repeat for other subnets

### Key Parameters Explained

| Parameter | Meaning |
|-----------|---------|
| `routing-table=to-isp1` | Define alternative routing table (not default main) |
| `routing-mark=to-isp1` | Lookup routes only in this table |
| `new-routing-mark=to-isp1` | Mark packets for specific ISP routing table |
| `action=lookup-only-in-table` | Restrict lookup to specified table only |

### Pros & Cons

| Pros | Cons |
|------|------|
| ✅ Per-subnet ISP assignment (A to ISP-1, B to ISP-2) | ❌ Complex configuration (multiple tables + rules + mangle) |
| ✅ Traffic isolation by routing table | ❌ Requires traffic marking rules |
| ✅ Works with check-gateway | ❌ Hard to debug (traffic must match mangle rules) |
| ✅ Predictable failover per route | ❌ Main table fallback still needed |

### Use Case

**Best for:** Enterprise networks with multiple subnets requiring different ISP assignments (e.g., VoIP via ISP-1, data via ISP-2).

---

## Method 3: Recursive Routing (Advanced)

### How It Works

Creates a **chain of dependencies** between routes. Primary routes use external IPs (1.1.1.1, 1.1.1.2) as gateways, which are themselves resolved via local gateway routes. If the external IP becomes unreachable, the primary route fails, triggering failover.

**Flow Diagram:**
```
┌────────────────────────────────────────┐
│ Packet to Destination (0.0.0.0/0)     │
└──────┬─────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────┐
│ Route Lookup: 0.0.0.0/0                  │
├──────────────────────────────────────────┤
│ Primary: 0.0.0.0/0 via 1.1.1.1           │
│ Distance: 1, check-gateway: ping         │
│ Secondary: 0.0.0.0/0 via 1.1.1.2         │
│ Distance: 2, check-gateway: ping         │
└──┬───────────────────────────────────────┘
   │
   ▼
┌──────────────────────────────────────────┐
│ Recursive Lookup: Where is 1.1.1.1?     │
├──────────────────────────────────────────┤
│ /ip route find dst-address=1.1.1.1       │
│ Result: 1.1.1.1/32 via 192.168.1.1       │
│ (check-gateway="ping" on this route)     │
└──┬───────────────────────────────────────┘
   │
   ├─ ICMP Reply to 1.1.1.1 ✓ (via 192.168.1.1)
   │  → Use primary route (0.0.0.0/0 via 1.1.1.1)
   │
   └─ No Reply to 1.1.1.1 ✗ (ISP-1 down)
      Recursive route 1.1.1.1/32 DISABLED
      → Cannot reach 1.1.1.1 gateway
      → Primary route becomes INVALID
      → Failover to secondary (0.0.0.0/0 via 1.1.1.2)
         ▼
         Recursive Lookup: Where is 1.1.1.2?
         Result: 1.1.1.2/32 via 192.168.1.2
         Ping 1.1.1.2 successful ✓ (via ISP-2)
         → Use secondary route
```

### Configuration

**Option A: Terminal**
```routeros
/ip route
# Step 1: Primary route using external IP 1.1.1.1 as gateway
add dst-address="0.0.0.0/0" target-scope="30" distance="1" gateway="1.1.1.1" \
    comment="ISP-1" check-gateway="ping" scope="30" routing-table=main

# Step 2: Secondary route using external IP 1.1.1.2 as gateway
add dst-address="0.0.0.0/0" target-scope="30" distance="2" gateway="1.1.1.2" \
    comment="ISP-2" check-gateway="ping" scope="30" routing-table=main

# Step 3: Recursive routes defining how to reach the external gateways
add dst-address="1.1.1.1" target-scope="10" distance="1" gateway="192.168.1.1" \
    comment="ISP-1-Check" check-gateway="ping" scope="30" routing-table=to-isp1

add dst-address="1.1.1.2" target-scope="10" distance="1" gateway="192.168.1.2" \
    comment="ISP-2-Check" check-gateway="ping" scope="30" routing-table=to-isp2
```

**Option B: Winbox**
1. IP → Routes → Click **+**
   - **Dst. Address:** 0.0.0.0/0
   - **Gateway:** 1.1.1.1 *(external DNS/public IP)*
   - **Distance:** 1
   - **Check Gateway:** ping
   - **Comment:** ISP-1

2. IP → Routes → Click **+** (second route)
   - **Dst. Address:** 0.0.0.0/0
   - **Gateway:** 1.1.1.2
   - **Distance:** 2
   - **Check Gateway:** ping
   - **Comment:** ISP-2

3. IP → Routes → Click **+** (recursive route 1)
   - **Dst. Address:** 1.1.1.1/32
   - **Gateway:** 192.168.1.1
   - **Check Gateway:** ping
   - **Comment:** ISP-1-Check

4. IP → Routes → Click **+** (recursive route 2)
   - **Dst. Address:** 1.1.1.2/32
   - **Gateway:** 192.168.1.2
   - **Check Gateway:** ping
   - **Comment:** ISP-2-Check

### Key Concept

**Recursive routes create a dependency chain:**
- Route A (0.0.0.0/0 via 1.1.1.1) depends on Route B (1.1.1.1/32 via 192.168.1.1)
- If Route B fails health check → Route B disabled
- Route A cannot find gateway 1.1.1.1 → Route A fails
- Failover to Route C (0.0.0.0/0 via 1.1.1.2) automatically

### Pros & Cons

| Pros | Cons |
|------|------|
| ✅ Natural failover chain (no extra rules needed) | ❌ Requires external IPs as probes (e.g., DNS: 1.1.1.1) |
| ✅ Handles complex topologies with multiple hops | ❌ Probe target must be reachable via primary ISP |
| ✅ Automatic dependency resolution | ❌ Latency depends on recursive lookup depth |
| ✅ Good for ISPs that block direct pings to gateway | ❌ Difficult to debug (need traceroute to understand) |

### Use Case

**Best for:** Complex ISP setups where gateway IP doesn't respond to ping, so you use public DNS IPs (1.1.1.1) or other public services as probe targets.

---

## Method 4: Netwatch (Manual Scripting)

### How It Works

An **external monitoring tool** periodically checks a host, then **runs custom scripts** if the host goes down or recovers. Gives you complete control over failover logic—disable/enable routes, trigger alerts, execute any RouterOS command.

**Flow Diagram:**
```
┌────────────────────────────────────────┐
│ Netwatch Monitoring Loop (every 5s)   │
└──────┬─────────────────────────────────┘
       │
       ▼
┌────────────────────────────────────────┐
│ Ping Target: 1.1.1.1 (ISP-1 probe)    │
└──────┬──────────────────┬──────────────┘
       │                  │
   ICMP OK            No Response
       │                  │
       ▼                  ▼
┌─────────────┐    ┌────────────────────┐
│ Host UP     │    │ Host DOWN (3 fails)│
└─────────────┘    └────┬───────────────┘
   │                    │
   ▼                    ▼
Execute:           Execute:
up-script          down-script
   │                    │
   │                    ├─ /ip route disable [find comment="ISP-1"]
   │                    │  └─ All ISP-1 routes now DISABLED
   │                    │
   │                    ├─ Optional: Log to file
   │                    │  └─ /log warning "ISP-1 Down"
   │                    │
   │                    └─ Optional: Send email alert
   │                       └─ /tool send-email ...
   │
   └─ /ip route enable [find comment="ISP-1"]
      └─ All ISP-1 routes now RE-ENABLED
         (Router immediately tries ISP-1 routes)

┌────────────────────────────────────────┐
│ Result: Failover or Failback           │
├────────────────────────────────────────┤
│ ISP-1 Down (no route)                  │
│ → Traffic uses ISP-2 (distance=2)     │
│                                        │
│ ISP-1 Recovers (route re-enabled)     │
│ → Traffic back to ISP-1 (distance=1)  │
└────────────────────────────────────────┘
```

### Configuration

**Option A: Terminal**
```routeros
# Step 1: Create default routes (ISP-1 primary, ISP-2 secondary)
/ip route
add dst-address="0.0.0.0/0" target-scope="10" distance="1" gateway="192.168.1.1" \
    comment="ISP-1" check-gateway="none" scope="30" routing-table=main
add dst-address="0.0.0.0/0" target-scope="10" distance="2" gateway="192.168.1.2" \
    comment="ISP-2" check-gateway="none" scope="30" routing-table=main

# Step 2: Create recursive routes for netwatch probes
add dst-address="1.1.1.1" target-scope="10" distance="1" gateway="192.168.1.1" \
    comment="ISP-1-probe" scope="30" routing-table=to-isp1
add dst-address="1.1.1.2" target-scope="10" distance="1" gateway="192.168.1.2" \
    comment="ISP-2-probe" scope="30" routing-table=to-isp2

# Step 3: Create netwatch monitors with down/up scripts
/tool netwatch
add host="1.1.1.1" interval="5s" timeout="3s" \
    down-script="/ip route disable [find comment=\"ISP-1\"]" \
    up-script="/ip route enable [find comment=\"ISP-1\"]" \
    comment="ISP-1"

add host="1.1.1.2" interval="5s" timeout="3s" \
    down-script="/ip route disable [find comment=\"ISP-2\"]" \
    up-script="/ip route enable [find comment=\"ISP-2\"]" \
    comment="ISP-2"
```

**Option B: Winbox**
1. **Create routes (WITHOUT check-gateway):**
   - IP → Routes → Click **+**
   - **Dst. Address:** 0.0.0.0/0
   - **Gateway:** 192.168.1.1
   - **Distance:** 1
   - **Comment:** ISP-1
   - **Check Gateway:** none *(important: let netwatch handle it)*

2. **Create netwatch monitors:**
   - Tools → Netwatch → Click **+**
   - **Host:** 1.1.1.1 *(external IP to probe)*
   - **Interval:** 5s
   - **Down Script:**
     ```routeros
     /ip route disable [find comment="ISP-1"]
     ```
   - **Up Script:**
     ```routeros
     /ip route enable [find comment="ISP-1"]
     ```
   - **Comment:** ISP-1
   - Click **+** (add second netwatch for ISP-2)

### Key Parameters Explained

| Parameter | Meaning |
|-----------|---------|
| `host` | External IP to ping (e.g., public DNS 1.1.1.1) |
| `interval` | Probe frequency (default 60s, shown as 5s for fast failover) |
| `timeout` | Fail after N seconds of no response |
| `down-script` | RouterOS commands executed when host unreachable |
| `up-script` | RouterOS commands executed when host recovers |
| `check-gateway="none"` | Disable built-in checks; let netwatch manage routes |

### Advanced Script Example

**With Logging & Email Alert:**
```routeros
/tool netwatch
add host="1.1.1.1" interval="5s" timeout="3s" \
    down-script="/log warning \"ISP-1 Down\"; \
                 /ip route disable [find comment=\"ISP-1\"]; \
                 /tool send-email to=\"admin@example.com\" subject=\"ISP-1 Failover\" body=\"ISP-1 is down, using ISP-2\"" \
    up-script="/log info \"ISP-1 Up\"; \
               /ip route enable [find comment=\"ISP-1\"]; \
               /tool send-email to=\"admin@example.com\" subject=\"ISP-1 Recovered\" body=\"ISP-1 is back online\"" \
    comment="ISP-1"
```

### Pros & Cons

| Pros | Cons |
|------|------|
| ✅ Complete control over failover logic | ❌ Requires explicit scripting (not automatic) |
| ✅ Can execute any RouterOS command on failure | ❌ More CPU overhead (external monitoring process) |
| ✅ Can send alerts/notifications | ❌ Requires netwatch service running |
| ✅ Flexible probe targets (any external IP) | ❌ Failover delay = netwatch interval + timeout |
| ✅ Easy to debug (scripts visible in GUI) | ❌ Misconfigured scripts can break routing |

### Use Case

**Best for:** Networks needing custom alerting, logging, or complex failover actions (e.g., disable VPN route on ISP-1 failure, reset firewall nat rules, trigger backup systems).

---

## Comparison Table

| Feature | Check-Gateway | Route Rules | Recursive | Netwatch |
|---------|---------------|-------------|-----------|----------|
| **Setup Complexity** | ⭐ Very Simple | ⭐⭐⭐ Complex | ⭐⭐ Moderate | ⭐⭐ Moderate |
| **Failover Latency** | ~100-300ms | ~100-300ms | ~100-300ms | ~5-15s (configurable) |
| **CPU Usage** | 💚 Very Low | 💚 Very Low | 💚 Very Low | 🟡 Moderate |
| **Scripting Support** | ❌ No | ❌ No | ❌ No | ✅ Full |
| **Per-Subnet ISP Control** | ❌ No | ✅ Yes | ❌ No | ❌ No |
| **Dependency Chains** | ❌ No | ❌ No | ✅ Yes | ❌ No |
| **Custom Logic** | ❌ No | ❌ No | ❌ No | ✅ Yes |
| **Alerting/Logging** | ❌ No | ❌ No | ❌ No | ✅ Yes |
| **Best For** | Simple dual-ISP | Multi-subnet per-ISP | Complex topologies | Custom failover actions |

---

## Verification Steps

### For All Methods:

```routeros
# 1. Check active routes
/ip route print where dst-address="0.0.0.0/0"

# 2. Verify route status (ACTIVE = enabled, X = disabled)
/ip route print where dst-address="0.0.0.0/0" detail

# 3. Test failover by simulating ISP-1 down (temporarily disable)
/ip route disable [find comment="ISP-1"]

# 4. Verify traffic now routes via ISP-2
/ip route print

# 5. Re-enable ISP-1 (failback)
/ip route enable [find comment="ISP-1"]

# 6. Check routing mark for marked traffic (Method 2 only)
/ip route rule print

# 7. For netwatch, view monitoring status
/tool netwatch print
```

### Test Packet Path:

```routeros
# Trace route through active ISP
/ip route print where dst-address="0.0.0.0/0"
# Note the first active route (lowest distance)

# Ping external host to verify ISP connectivity
/ping 8.8.8.8 count=5

# For recursive routes, check if probe target is reachable
/ip route print where dst-address="1.1.1.1"
```

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Route remains DISABLED after ISP recovers | Check-gateway still sees host down, or netwatch is disabled | Manually enable: `/ip route enable [find comment="ISP-1"]`, check probe target (1.1.1.1 reachable?), verify gateway IP (192.168.1.1 responds to ping?) |
| Both routes show ACTIVE but traffic still fails | Distance metric incorrect or both gateways down | Verify distance values (lower = preferred). Ping both gateways: `/ping 192.168.1.1` and `/ping 192.168.1.2`. Check if gateway IPs are correct. |
| Failover takes too long (>30 seconds) | Check-gateway interval too long, or netwatch timeout too high | Reduce `check-gateway` ping interval in route (default ~3s), reduce netwatch `interval` (e.g., 5s instead of 60s), reduce `timeout` (e.g., 3s). |
| Route rules not directing traffic to ISP-2 | Mangle rule not matching traffic, or route-rule action incorrect | Verify mangle rule matches source address: `/ip firewall mangle print`, check routing-mark is applied: `/ip firewall mangle print stats`. Verify route rule has `action=lookup`: `/ip route rule print`. |
| Netwatch scripts not executing | Netwatch disabled, or script syntax error | Enable netwatch: `/tool netwatch enable [find comment="ISP-1"]`, test script manually: copy `down-script` content and run, check RouterOS logs for errors: `/log print`. |
| Recursive route not working (gateway unreachable) | Recursive probe target (1.1.1.1) not responding, or recursive route misconfigured | Verify recursive route exists: `/ip route print where dst-address="1.1.1.1"`, ping probe target directly: `/ping 1.1.1.1`, check if recursive route via ISP is active. |
| Traffic uses wrong ISP (not preferred) | Distance value too high on primary, or secondary route has lower distance | Verify primary distance = 1, secondary = 2: `/ip route print`. Disable secondary route, test traffic, re-enable. |

---

## Advanced Options

### 1. **Combined Approach: Check-Gateway + Netwatch**

Use built-in check-gateway for automatic failover, and netwatch for alerting:

```routeros
# Routes use check-gateway (fast failover)
/ip route
add dst-address="0.0.0.0/0" distance="1" gateway="192.168.1.1" \
    check-gateway="ping" comment="ISP-1"
add dst-address="0.0.0.0/0" distance="2" gateway="192.168.1.2" \
    check-gateway="ping" comment="ISP-2"

# Netwatch adds logging & alerts (no disable/enable script)
/tool netwatch
add host="1.1.1.1" interval="10s" \
    down-script="/log warning \"ISP-1 health check failed\"; \
                 /tool send-email to=\"admin@example.com\" subject=\"ISP-1 Degraded\"" \
    comment="ISP-1-Alert-Only"
```

### 2. **Multi-Tier Failover (3+ ISPs)**

```routeros
/ip route
add dst-address="0.0.0.0/0" distance="1" gateway="192.168.1.1" \
    check-gateway="ping" comment="ISP-1"
add dst-address="0.0.0.0/0" distance="2" gateway="192.168.1.2" \
    check-gateway="ping" comment="ISP-2"
add dst-address="0.0.0.0/0" distance="3" gateway="192.168.1.3" \
    check-gateway="ping" comment="ISP-3"
```

Distance values create a failover chain: ISP-1 → ISP-2 → ISP-3.

### 3. **Conditional Failover Based on Packet Type**

Use mangle rules to mark different traffic types, then route each to preferred ISP:

```routeros
/ip firewall mangle
# VoIP traffic prefers ISP-1 (lower latency)
add chain=prerouting protocol=udp dst-port=5060,5061 \
    action=mark-routing new-routing-mark=to-isp1 passthrough=yes comment="VoIP→ISP-1"

# Video streaming prefers ISP-2 (higher bandwidth)
add chain=prerouting dst-port=443 \
    action=mark-routing new-routing-mark=to-isp2 passthrough=yes comment="HTTPS→ISP-2"

# Create separate routing tables (Method 2)
/ip route
add dst-address="0.0.0.0/0" distance="1" gateway="192.168.1.1" \
    check-gateway="ping" routing-table=to-isp1 comment="ISP-1-VoIP"
add dst-address="0.0.0.0/0" distance="1" gateway="192.168.1.2" \
    check-gateway="ping" routing-table=to-isp2 comment="ISP-2-Video"
```

### 4. **Active-Active Load Balancing (PCC)**

Distribute traffic evenly between two ISPs using Per-Connection Classifier:

```routeros
/ip firewall mangle
add chain=prerouting action=mark-routing new-routing-mark=isp1 \
    per-connection-classifier=both-addresses-and-ports:2/1 passthrough=yes

add chain=prerouting action=mark-routing new-routing-mark=isp2 \
    per-connection-classifier=both-addresses-and-ports:2/2 passthrough=yes

/ip route
add dst-address="0.0.0.0/0" distance="1" gateway="192.168.1.1" \
    routing-table=isp1 check-gateway="ping" comment="ISP-1"
add dst-address="0.0.0.0/0" distance="1" gateway="192.168.1.2" \
    routing-table=isp2 check-gateway="ping" comment="ISP-2"
```

Each connection goes to either ISP-1 or ISP-2 based on source/destination hash.

### 5. **Bandwidth Management Per ISP**

Limit each ISP route to prevent one from saturating:

```routeros
/ip firewall mangle
# Queue ISP-1 traffic for rate limiting
add chain=forward routing-mark=to-isp1 action=mark-packet new-packet-mark=isp1-limited passthrough=yes

/queue
add name="isp1-queue" parent=ether1 direction=in limit-at=50M target=192.168.1.1
add name="isp2-queue" parent=ether2 direction=in limit-at=50M target=192.168.1.2
```

---

## Related Guides

- [Policy-Based Routing (PBR) for Call Center VPNs](./pbr-call-center-vpn)
- [Policy-Based Routing (PBR) for GCash](./pbr-gcash-mobile-wallet)
- [Quality of Service (QoS) Setup](../Bandwidth/guest-bandwidth-dhcp-on-up)
- [MikroTik Security Hardening](../Security/router-hardening-hide-identify)

---

✅ **Failover Configuration Complete!** Your network now has redundant ISP paths with automatic failover. Monitor the routes and adjust check-gateway intervals based on your ISP stability.
