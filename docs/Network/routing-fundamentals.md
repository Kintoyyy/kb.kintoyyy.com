---
sidebar_position: 3
---

# 🗺️ IP Routing and Route Management

IP routing is the process of forwarding packets between networks by determining the best path from source to destination. This guide covers static routing, dynamic routing protocols, route metrics, policy-based routing, and multi-WAN scenarios with practical MikroTik configurations.

:::info Key Concepts
- **Routing Table** - Database of network paths used to forward packets
- **Static Route** - Manually configured permanent route entry
- **Dynamic Route** - Automatically learned via routing protocols (OSPF, BGP)
- **Default Route** - Catch-all route (0.0.0.0/0) for unknown destinations
- **Route Metric** - Value used to select best path when multiple routes exist
- **Gateway** - Next-hop router IP address where packets are forwarded
- **Distance** - Administrative distance (lower = more trusted)
:::

---

## Prerequisites

Before configuring routing, ensure you have:

- ✅ Understanding of IP addressing and subnets
- ✅ Network topology diagram with gateway IPs
- ✅ Knowledge of source and destination networks
- ✅ Access to router configuration (SSH/Winbox)
- ✅ IP addresses configured on router interfaces
- ✅ Basic firewall rules allowing forwarding

---

:::warning Important Considerations
- **Default Route Priority:** Lower distance value takes precedence (static=1, OSPF=110, BGP=170)
- **Routing Loops:** Improper routes can create packet loops causing network outages
- **Asymmetric Routing:** Traffic may take different paths in each direction
- **Route Flapping:** Unstable routes can cause intermittent connectivity
- **Firewall Impact:** Forward chain rules affect routed traffic
- **MTU Issues:** Path MTU discovery failures cause packet drops
:::

---

## Understanding Routing

### How Routing Works

When a packet arrives, the router checks its routing table and forwards based on the longest prefix match:

```
Destination: 10.0.20.50
Routing Table:
  10.0.20.0/24    via 192.168.1.1    ← MATCHES (longest prefix)
  10.0.0.0/16     via 192.168.2.1    ← Also matches but less specific
  0.0.0.0/0       via 192.168.3.1    ← Default route (fallback)

Decision: Forward to 192.168.1.1 (most specific match)
```

### Route Types

| Type | Description | Use Case | Configuration |
|------|-------------|----------|---------------|
| **Connected** | Directly attached networks | LAN/WAN interfaces | Automatic when IP assigned |
| **Static** | Manually configured routes | Simple networks, backup routes | `/ip route add` |
| **Dynamic (OSPF)** | Open Shortest Path First | Internal enterprise networks | `/routing ospf` |
| **Dynamic (BGP)** | Border Gateway Protocol | ISP peering, multi-homing | `/routing bgp` |
| **Default Route** | Catch-all for internet traffic | Internet gateway | `dst-address=0.0.0.0/0` |
| **Blackhole** | Drop traffic to destination | Null routing attacks | `type=blackhole` |
| **Policy Route** | Source-based routing | Multi-WAN, VPN steering | `/ip route rule` |

---

## Common Routing Scenarios

### Scenario 1: Basic Office Network with Internet

**Topology:**
```
Internet ─── [ISP Gateway] ─── [Router] ─── [LAN Switch] ─── Clients
              203.0.113.1      203.0.113.2   192.168.1.1     192.168.1.0/24
```

**Routing Table:**

| Destination | Gateway | Interface | Distance | Scope | Type |
|-------------|---------|-----------|----------|-------|------|
| 0.0.0.0/0 | 203.0.113.1 | ether1-wan | 1 | 30 | Static (Default) |
| 192.168.1.0/24 | 0.0.0.0 | ether2-lan | 0 | 10 | Connected |
| 203.0.113.0/30 | 0.0.0.0 | ether1-wan | 0 | 10 | Connected |

**Traffic Flow:**
- Client `192.168.1.100` → Internet: Uses default route via `203.0.113.1`
- Client → LAN device: Uses connected route (no gateway needed)

---

### Scenario 2: Multi-Site Network with Static Routes

**Topology:**
```
HQ Site              Branch A Site         Branch B Site
10.0.0.0/24 ───┬─── 10.10.10.0/30 ──┬─── 10.0.1.0/24
               │                     │
        [Router-HQ]           [Router-A]
        10.10.10.1            10.10.10.2
                              10.20.20.1 ──┬─── 10.0.2.0/24
                                           │
                                    [Router-B]
                                    10.20.20.2
```

**HQ Router Routing Table:**

| Destination | Gateway | Interface | Comment |
|-------------|---------|-----------|---------|
| 10.0.0.0/24 | Connected | bridge-lan | HQ LAN |
| 10.0.1.0/24 | 10.10.10.2 | vlan-vpn-a | To Branch A |
| 10.0.2.0/24 | 10.10.10.2 | vlan-vpn-a | To Branch B (via A) |
| 10.10.10.0/30 | Connected | vlan-vpn-a | VPN link to A |
| 0.0.0.0/0 | 203.0.113.1 | ether1-wan | Internet |

**Branch A Router Routing Table:**

| Destination | Gateway | Interface | Comment |
|-------------|---------|-----------|---------|
| 10.0.1.0/24 | Connected | bridge-lan | Branch A LAN |
| 10.0.0.0/24 | 10.10.10.1 | vlan-vpn-hq | To HQ |
| 10.0.2.0/24 | 10.20.20.2 | vlan-vpn-b | To Branch B |
| 10.10.10.0/30 | Connected | vlan-vpn-hq | VPN link to HQ |
| 10.20.20.0/30 | Connected | vlan-vpn-b | VPN link to B |
| 0.0.0.0/0 | 10.10.10.1 | vlan-vpn-hq | Internet via HQ |

---

### Scenario 3: Dual-WAN Failover with Route Distances

**Topology:**
```
           ┌─── [ISP-A] ─── Internet (Primary)
           │    Gateway: 203.0.113.1
[Router] ──┤
           │    [ISP-B] ─── Internet (Backup)
           └─── Gateway: 198.51.100.1
```

**Routing Table with Failover:**

| Destination | Gateway | Distance | Check Gateway | Status | Purpose |
|-------------|---------|----------|---------------|--------|---------|
| 0.0.0.0/0 | 203.0.113.1 | 1 | ping | Active | Primary ISP |
| 0.0.0.0/0 | 198.51.100.1 | 2 | ping | Backup | Failover ISP |

**How It Works:**
- Primary route (distance 1) used when gateway responds to ping
- If primary fails, route becomes inactive
- Backup route (distance 2) automatically activates
- When primary recovers, traffic shifts back

---

### Scenario 4: Policy-Based Routing (PBR) for Multi-WAN

**Network:** Office with 2 ISPs, route traffic by source subnet

| Source Network | Purpose | ISP | Gateway | Routing Policy |
|----------------|---------|-----|---------|----------------|
| 10.0.10.0/24 | Management | ISP-A | 203.0.113.1 | High reliability |
| 10.0.20.0/24 | Sales | ISP-A | 203.0.113.1 | Primary link |
| 10.0.30.0/24 | Bulk downloads | ISP-B | 198.51.100.1 | Cheaper bandwidth |
| 10.0.50.0/24 | Guest WiFi | ISP-B | 198.51.100.1 | Isolated traffic |

**Policy Route Rules:**

| Priority | Src Address | Dst Address | Action | Table | Comment |
|----------|-------------|-------------|--------|-------|---------|
| 1 | 10.0.10.0/24 | Any | Lookup | main | Management via ISP-A |
| 2 | 10.0.30.0/24 | Any | Lookup | isp-b | Downloads via ISP-B |
| 3 | 10.0.50.0/24 | Any | Lookup | isp-b | Guest via ISP-B |

---

## Configuration in MikroTik RouterOS

### Option A: Terminal (Static Routes)

#### Basic Default Route
```routeros
# Add default route to internet
/ip route add dst-address=0.0.0.0/0 gateway=203.0.113.1 comment="Default to ISP"

# Verify route
/ip route print where dst-address=0.0.0.0/0
```

#### Multi-Site Static Routes
```routeros
# HQ Router: Routes to branch offices
/ip route add dst-address=10.0.1.0/24 gateway=10.10.10.2 comment="To Branch A"
/ip route add dst-address=10.0.2.0/24 gateway=10.10.10.2 comment="To Branch B via A"

# Branch A Router: Routes back to HQ and to Branch B
/ip route add dst-address=10.0.0.0/24 gateway=10.10.10.1 comment="To HQ"
/ip route add dst-address=10.0.2.0/24 gateway=10.20.20.2 comment="To Branch B"
/ip route add dst-address=0.0.0.0/0 gateway=10.10.10.1 comment="Internet via HQ"

# Branch B Router: Routes to HQ and Branch A
/ip route add dst-address=10.0.0.0/24 gateway=10.20.20.1 comment="To HQ via A"
/ip route add dst-address=10.0.1.0/24 gateway=10.20.20.1 comment="To Branch A"
/ip route add dst-address=0.0.0.0/0 gateway=10.20.20.1 comment="Internet via A"
```

#### Dual-WAN Failover with Recursive Gateway Check
```routeros
# Create recursive route for gateway checking
/ip route add dst-address=8.8.8.8/32 gateway=203.0.113.1 scope=10 comment="ISP-A Check"
/ip route add dst-address=1.1.1.1/32 gateway=198.51.100.1 scope=10 comment="ISP-B Check"

# Add failover routes with check-gateway
/ip route add dst-address=0.0.0.0/0 gateway=203.0.113.1 distance=1 \
  check-gateway=ping comment="Primary ISP-A"

/ip route add dst-address=0.0.0.0/0 gateway=198.51.100.1 distance=2 \
  check-gateway=ping comment="Backup ISP-B"

# Monitor route status
/ip route print where dst-address=0.0.0.0/0
```

#### Policy-Based Routing
```routeros
# Create routing tables
/routing table add name=isp-a fib
/routing table add name=isp-b fib

# Add routes to each table
/ip route add dst-address=0.0.0.0/0 gateway=203.0.113.1 routing-table=isp-a \
  comment="ISP-A Default"
/ip route add dst-address=0.0.0.0/0 gateway=198.51.100.1 routing-table=isp-b \
  comment="ISP-B Default"

# Create routing rules
/ip route rule add src-address=10.0.10.0/24 table=isp-a comment="Management via ISP-A"
/ip route rule add src-address=10.0.30.0/24 table=isp-b comment="Downloads via ISP-B"
/ip route rule add src-address=10.0.50.0/24 table=isp-b comment="Guest via ISP-B"

# Verify rules
/ip route rule print
```

#### Route with Interface Binding
```routeros
# Force route through specific interface (useful for multi-homed)
/ip route add dst-address=192.168.100.0/24 gateway=10.10.10.2 \
  pref-src=10.10.10.1 comment="Prefer source IP 10.10.10.1"
```

### Option B: Winbox

#### Adding Static Routes

1. **Basic Static Route:**
   - IP → Routes → [+]
   - Dst. Address: `10.0.1.0/24`
   - Gateway: `10.10.10.2`
   - Comment: `To Branch Office`
   - Click OK

2. **Default Route:**
   - IP → Routes → [+]
   - Dst. Address: `0.0.0.0/0`
   - Gateway: `203.0.113.1`
   - Comment: `Internet Gateway`
   - Click OK

3. **Failover Route:**
   - IP → Routes → [+]
   - Dst. Address: `0.0.0.0/0`
   - Gateway: `203.0.113.1`
   - Distance: `1`
   - Check Gateway: ✅ `ping`
   - Comment: `Primary ISP`
   - Click OK

   - Add second route with same destination:
   - Gateway: `198.51.100.1`
   - Distance: `2`
   - Check Gateway: ✅ `ping`
   - Comment: `Backup ISP`

#### Policy-Based Routing Setup

4. **Create Routing Tables:**
   - Routing → Tables → [+]
   - Name: `isp-b`
   - FIB: ✅ Checked
   - Click OK

5. **Add Routes to Custom Table:**
   - IP → Routes → [+]
   - Dst. Address: `0.0.0.0/0`
   - Gateway: `198.51.100.1`
   - Routing Table: `isp-b`
   - Click OK

6. **Create Route Rules:**
   - IP → Routes → Rules → [+]
   - Src. Address: `10.0.30.0/24`
   - Table: `isp-b`
   - Comment: `Downloads via ISP-B`
   - Click OK

---

## Understanding Route Metrics

### Distance (Administrative Distance)

Lower distance = more trusted source

| Route Source | Default Distance | Priority | Typical Use |
|--------------|------------------|----------|-------------|
| Connected | 0 | Highest | Directly attached networks |
| Static | 1 | Very High | Manual configuration |
| EIGRP | 90 | High | Cisco proprietary (not RouterOS) |
| OSPF | 110 | Medium | Internal enterprise routing |
| RIP | 120 | Low | Legacy networks |
| BGP | 170 | Lowest | Internet peering |

**Example:**
```routeros
# If same destination has multiple routes:
/ip route add dst-address=10.0.0.0/24 gateway=192.168.1.1 distance=1
/ip route add dst-address=10.0.0.0/24 gateway=192.168.2.1 distance=2

# Result: First route (distance 1) is active, second is backup
```

### Scope

Controls route advertisement in dynamic protocols:

| Scope | Value | Meaning |
|-------|-------|---------|
| target-scope | 10 | Host route (specific IP) |
| link | 10 | Connected networks |
| universe | 30 | Global routes |

---

## Verification

### Step 1: Check Routing Table

```routeros
# View all routes
/ip route print

# Expected columns:
# Dst-Address, Gateway, Distance, Scope, Active (A/S/D flags)

# Filter by destination
/ip route print where dst-address=0.0.0.0/0

# Show only active routes
/ip route print where active=yes
```

### Step 2: Test Route Path

```routeros
# Trace route to destination
/tool traceroute 8.8.8.8

# Expected: Shows each hop router IP

# Ping with source IP
/ping 8.8.8.8 src-address=10.0.20.1 count=5

# Check which route is used
/ip route print detail where dst-address=0.0.0.0/0
```

### Step 3: Monitor Route Changes

```routeros
# Watch routing table in real-time
/ip route print follow

# Check route status (DAC flags)
# D = Dynamic, A = Active, C = Connect, S = Static
```

### Step 4: Verify Gateway Reachability

```routeros
# Ping gateway
/ping 203.0.113.1 count=10

# Check ARP for gateway MAC
/ip arp print where address=203.0.113.1

# Verify interface is up
/interface print where name=ether1-wan
```

### Step 5: Test Policy-Based Routing

```routeros
# From router console, test with source address
/tool traceroute 8.8.8.8 src-address=10.0.30.50

# Expected: Should use ISP-B gateway (198.51.100.1)

# Check rule hits
/ip route rule print stats
```

### Step 6: Validate Failover

```bash
# Disconnect primary ISP (simulate failure)
/interface disable ether1-wan

# Wait 5-10 seconds, check routing table
/ip route print where dst-address=0.0.0.0/0

# Expected: Primary route inactive, backup route active

# Re-enable primary
/interface enable ether1-wan

# Verify primary route returns to active
```

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| No internet connectivity | Missing default route | Add `/ip route add dst-address=0.0.0.0/0 gateway=X.X.X.X` |
| Route showing inactive (not Active) | Gateway unreachable | Check interface status, ARP, gateway reachability |
| Two default routes both active | Same distance value | Set different distances (1 primary, 2 backup) |
| Failover not working | Check-gateway disabled | Enable `check-gateway=ping` on routes |
| Routing loop detected | Circular route references | Review routing table for conflicts |
| Asymmetric routing issues | Different paths in/out | Use policy routing or connection tracking |
| Cannot reach remote subnet | Missing return route | Add route on remote router back to source |
| Gateway ping timeout | Firewall blocking ICMP | Allow ICMP in firewall input chain |
| Packets dropped at firewall | Firewall forward rules | Add `/ip firewall filter add chain=forward action=accept` |
| Policy routing not working | No matching rule | Verify `/ip route rule` has correct src-address |
| BGP/OSPF routes not appearing | Routing protocol misconfigured | Check `/routing ospf` or `/routing bgp` settings |
| MTU issues (fragmentation) | Path MTU discovery failing | Set TCP MSS: `/ip firewall mangle add chain=forward protocol=tcp tcp-flags=syn tcp-mss=1460 action=change-mss new-mss=1360` |

---

## Advanced Routing Options

### 1. Blackhole Routes (Null Routing)

Drop traffic to specific destinations:

```routeros
# Block traffic to malicious network
/ip route add dst-address=192.0.2.0/24 type=blackhole comment="Drop spam source"

# Null route for DDoS mitigation
/ip route add dst-address=203.0.113.50/32 type=blackhole comment="DDoS target isolation"
```

### 2. Route Recursion

Use intermediate gateway for next-hop resolution:

```routeros
# Create recursive route
/ip route add dst-address=10.0.0.0/8 gateway=10.10.10.2 scope=30

# Gateway 10.10.10.2 must be reachable via another route
/ip route add dst-address=10.10.10.0/30 gateway=ether2 scope=10
```

### 3. ECMP (Equal-Cost Multi-Path)

Load balance across multiple gateways:

```routeros
# Add two default routes with same distance
/ip route add dst-address=0.0.0.0/0 gateway=203.0.113.1 distance=1 \
  check-gateway=ping comment="ISP-A"

/ip route add dst-address=0.0.0.0/0 gateway=198.51.100.1 distance=1 \
  check-gateway=ping comment="ISP-B"

# Traffic will alternate between both gateways (per-connection)
```

### 4. Source-Based NAT with Routing

Combine PBR with NAT:

```routeros
# Route guest traffic via ISP-B
/ip route rule add src-address=10.0.50.0/24 table=isp-b

# NAT guest traffic with ISP-B IP
/ip firewall nat add chain=srcnat src-address=10.0.50.0/24 \
  out-interface=ether2-isp-b action=masquerade comment="Guest NAT via ISP-B"
```

### 5. BGP Route Filtering

Control which routes are accepted/advertised:

```routeros
# Create BGP peer
/routing bgp peer add name=isp-peer remote-address=203.0.113.1 \
  remote-as=65001 tcp-md5-key="bgp-password"

# Filter incoming routes (only accept specific prefixes)
/routing filter rule add chain=bgp-in prefix=0.0.0.0/0 prefix-length=0-24 \
  action=accept comment="Accept default + /24 or larger"

/routing filter rule add chain=bgp-in action=reject comment="Reject all others"
```

### 6. OSPF with Area Configuration

Implement hierarchical routing:

```routeros
# Configure OSPF on backbone area
/routing ospf instance add name=default router-id=10.0.0.1

/routing ospf area add name=backbone area-id=0.0.0.0 instance=default

# Add networks to OSPF
/routing ospf interface-template add area=backbone interfaces=bridge-lan \
  networks=10.0.0.0/24 comment="LAN Network"

/routing ospf interface-template add area=backbone interfaces=vlan-vpn \
  networks=10.10.10.0/30 type=ptp comment="P2P Link"

# Originate default route
/routing ospf instance set default originate-default=always
```

### 7. Route Prioritization with Pref-Src

Prefer specific source IP for outgoing connections:

```routeros
# Use management IP as source for monitoring traffic
/ip route add dst-address=8.8.8.8/32 gateway=203.0.113.1 \
  pref-src=203.0.113.2 comment="Use WAN IP for DNS checks"
```

### 8. Dynamic Routing with Netwatch

Automatically manage routes based on monitoring:

```routeros
/tool netwatch add host=8.8.8.8 interval=10s \
  up-script={
    :log info "ISP-A UP - Enabling primary route"
    /ip route enable [find comment="Primary ISP-A"]
  } \
  down-script={
    :log error "ISP-A DOWN - Disabling primary route"
    /ip route disable [find comment="Primary ISP-A"]
  }
```

### 9. Route Caching and Performance

Optimize routing performance:

```routeros
# Check route cache stats
/ip route cache print

# Force route recalculation
/ip route cache flush

# Disable route caching (rarely needed)
/ip route cache set enabled=no
```

### 10. VRF (Virtual Routing and Forwarding)

Isolate routing tables for multi-tenancy:

```routeros
# Create separate routing instances
/routing table add name=customer-a fib
/routing table add name=customer-b fib

# Assign interfaces to VRF
/ip address add address=10.1.0.1/24 interface=vlan-customer-a routing-table=customer-a
/ip address add address=10.2.0.1/24 interface=vlan-customer-b routing-table=customer-b

# Each customer has isolated routing
```

### 11. Route Redistribution Between Protocols

Share routes between OSPF and BGP:

```routeros
# Export OSPF routes to BGP
/routing filter rule add chain=ospf-to-bgp protocol=ospf action=accept

# Import into BGP
/routing bgp connection add name=bgp-export redistribute=connected,ospf \
  output.filter=ospf-to-bgp
```

### 12. Route Monitoring Dashboard Script

Generate routing health report:

```routeros
:local totalRoutes [/ip route print count-only]
:local activeRoutes [/ip route print count-only where active=yes]
:local dynamicRoutes [/ip route print count-only where dynamic=yes]
:local staticRoutes [/ip route print count-only where static=yes]

:put "=== Routing Health Report ==="
:put ("Total Routes: " . $totalRoutes)
:put ("Active Routes: " . $activeRoutes)
:put ("Dynamic Routes: " . $dynamicRoutes)
:put ("Static Routes: " . $staticRoutes)

:put "\n=== Default Route Status ==="
:foreach route in=[/ip route find where dst-address=0.0.0.0/0] do={
  :local gw [/ip route get $route gateway]
  :local dist [/ip route get $route distance]
  :local isActive [/ip route get $route active]
  :put ("Gateway: " . $gw . " | Distance: " . $dist . " | Active: " . $isActive)
}
```

---

## Related Guides

- [Understanding Subnets](./understanding-subnets) - IP addressing fundamentals for routing
- [VLAN Configuration](./vlan-configuration) - Inter-VLAN routing setup
- [OSPF Point-to-Point](../Mikrotik/Routing/ospf-ptp) - Dynamic routing protocol
- [BFD Fast Failover](../Mikrotik/Routing/bfd-fast-failover) - Sub-second route convergence
- [VPN Game Routing](../Mikrotik/Routing/vpn-game-routing) - Policy-based VPN routing
- [Cloud DDNS Routing](../Mikrotik/Routing/cloud-ddns-routing) - Dynamic gateway routing

---

🎉 **You now understand IP routing, static/dynamic routes, failover mechanisms, and policy-based routing!** Use this knowledge to build resilient multi-WAN networks, implement traffic steering policies, and optimize network path selection.
