---
sidebar_position: 6
---

# 🌐 IPoE Server Setup

Deploy and manage IPoE (Internet Protocol over Ethernet) servers for always-on connectivity without PPPoE overhead. Learn how to set up DHCP-based access, implement circuit-aware authentication, and manage client connections with advanced options.

---

## ℹ️ Key Information

- **IPoE** — Direct IP-over-Ethernet without PPP encapsulation (Layer 2 authentication)
- **DHCP-based authentication** — Uses DHCP options for user identification
- **Circuit-aware** — Tracks clients by interface/VLAN for per-port billing
- **Lower overhead** — No PPP framing, faster throughput than PPPoE
- **RADIUS integration** — Centralized user management and session accounting
- **Multiple authentication** — MAC-based, VLAN-based, or DHCP option-based
- **Always-on capability** — No dial-up needed, automatic IP assignment

:::warning
- IPoE requires Layer 2 connectivity (same VLAN or bridge)
- DHCP authentication must be configured before client connections
- Multiple auth methods can cause conflicts - choose one per interface
- IP pool exhaustion blocks new connections - size pools appropriately
- Requires proper DHCP relay or local DHCP server configuration
:::

---

## ✅ Prerequisites

- MikroTik RouterOS v6.48+ for advanced IPoE features
- DHCP server configured or DHCP relay enabled
- One or more network interfaces for client connections
- RADIUS server for centralized authentication (optional but recommended)
- Understanding of DHCP and Layer 2 networking
- Network switch or bridge connecting clients to IPoE server

---

## 🔧 Configuration

### Option A: Basic IPoE Setup (Local Auth)

#### Server 1: Simple DHCP with Static IP Pool

```routeros
# Create DHCP server IP pool
/ip pool add name=ipoe_pool ranges=10.0.0.10-10.0.0.254

# Create DHCP server
/ip dhcp-server add name=ipoe_dhcp interface=ether2 address-pool=ipoe_pool \
    lease-time=24h

# Configure DHCP network
/ip address add address=10.0.0.1/24 interface=ether2

# Add DHCP network binding
/ip dhcp-server network add address=10.0.0.0/24 gateway=10.0.0.1 \
    dns-server=8.8.8.8,8.8.4.4

# Enable IP/Ethernet binding (circuit-aware authentication)
/interface ether set [find default-name=ether2] advertise-mac-address=yes
```

#### Server 2: DHCP with MAC-based Authentication

```routeros
# Create DHCP server IP pool
/ip pool add name=ipoe_pool_sec ranges=10.1.0.10-10.1.0.254

# Create DHCP server
/ip dhcp-server add name=ipoe_dhcp_sec interface=ether2 \
    address-pool=ipoe_pool_sec lease-time=24h

# Configure DHCP network
/ip address add address=10.1.0.1/24 interface=ether2

# Add DHCP network binding
/ip dhcp-server network add address=10.1.0.0/24 gateway=10.1.0.1 \
    dns-server=8.8.8.8,8.8.4.4

# Add MAC-based lease bindings for known clients
/ip dhcp-server lease add mac-address=00:11:22:33:44:55 address=10.1.0.100 \
    server=ipoe_dhcp_sec

/ip dhcp-server lease add mac-address=AA:BB:CC:DD:EE:FF address=10.1.0.101 \
    server=ipoe_dhcp_sec
```

---

### Option B: IPoE with RADIUS Authentication

#### Server with Centralized RADIUS Auth

```routeros
# Create DHCP server IP pool
/ip pool add name=ipoe_pool_radius ranges=10.2.0.10-10.2.0.254

# Create DHCP server with RADIUS
/ip dhcp-server add name=ipoe_dhcp_radius interface=ether2 \
    address-pool=ipoe_pool_radius lease-time=24h use-radius=yes

# Configure DHCP network
/ip address add address=10.2.0.1/24 interface=ether2

# Add DHCP network binding
/ip dhcp-server network add address=10.2.0.0/24 gateway=10.2.0.1 \
    dns-server=8.8.8.8,8.8.4.4

# Configure RADIUS servers
/radius add service=dhcp address=192.168.1.100 secret=RadiusSecret123 \
    timeout=2s retry=3

/radius add service=dhcp address=192.168.1.101 secret=RadiusSecret123 \
    timeout=2s retry=3

# Enable circuit ID tracking (interface-based identification)
/ip dhcp-server set [find name=ipoe_dhcp_radius] use-circuit-id=yes
```

---

### Option C: IPoE with VLAN Segmentation

#### Multi-VLAN IPoE Setup

```routeros
# Create VLANs for different customer tiers
/interface vlan add name=vlan_basic interface=ether1 vlan-id=100
/interface vlan add name=vlan_premium interface=ether1 vlan-id=101
/interface vlan add name=vlan_enterprise interface=ether1 vlan-id=102

# Create IP pools per VLAN
/ip pool add name=pool_basic ranges=10.100.0.10-10.100.0.254
/ip pool add name=pool_premium ranges=10.101.0.10-10.101.0.254
/ip pool add name=pool_enterprise ranges=10.102.0.10-10.102.0.254

# DHCP for Basic VLAN
/ip dhcp-server add name=dhcp_basic interface=vlan_basic \
    address-pool=pool_basic lease-time=24h

/ip address add address=10.100.0.1/24 interface=vlan_basic

/ip dhcp-server network add address=10.100.0.0/24 gateway=10.100.0.1 \
    dns-server=8.8.8.8

# DHCP for Premium VLAN
/ip dhcp-server add name=dhcp_premium interface=vlan_premium \
    address-pool=pool_premium lease-time=12h

/ip address add address=10.101.0.1/24 interface=vlan_premium

/ip dhcp-server network add address=10.101.0.0/24 gateway=10.101.0.1 \
    dns-server=8.8.8.8

# DHCP for Enterprise VLAN
/ip dhcp-server add name=dhcp_enterprise interface=vlan_enterprise \
    address-pool=pool_enterprise lease-time=6h

/ip address add address=10.102.0.1/24 interface=vlan_enterprise

/ip dhcp-server network add address=10.102.0.0/24 gateway=10.102.0.1 \
    dns-server=8.8.8.8
```

---

## 📚 Understanding

### What is IPoE?

IPoE (Internet Protocol over Ethernet) is a method of delivering broadband connectivity that bypasses the PPP (Point-to-Point Protocol) layer. Instead of a dial-up connection, clients receive IP addresses directly via DHCP.

**IPoE vs PPPoE:**

| Feature | PPPoE | IPoE |
|---------|-------|------|
| **Protocol** | PPP over Ethernet (Layer 2/3) | Direct Ethernet (Layer 2) |
| **Connection Type** | Session-oriented (dial-up) | Stateless (always-on) |
| **Overhead** | Higher (PPP framing) | Lower (pure DHCP) |
| **Authentication** | Built-in (PPP auth) | Via DHCP/RADIUS |
| **Speed** | 50-100 Mbps typical | 1Gbps+ capable |
| **Setup Time** | 1-2 seconds | Immediate |
| **Usage** | ISP/DSL hotspots | Fiber/Ethernet networks |

### IPoE Connection Flow

```
Step 1: Client connects to IPoE network
        └─ Connected to Ethernet interface/VLAN

Step 2: Client broadcasts DHCP DISCOVER
        └─ "Can I get an IP address?"

Step 3: IPoE server identifies client (MAC/VLAN/Circuit ID)
        └─ Queries RADIUS if enabled

Step 4: RADIUS returns user profile (optional)
        ├─ IP pool assignment
        ├─ Bandwidth limits
        ├─ VLAN assignment
        └─ Session accounting

Step 5: IPoE server sends DHCP OFFER
        └─ "Here's an IP from pool: 10.0.0.50"

Step 6: Client sends DHCP REQUEST
        └─ "I accept 10.0.0.50"

Step 7: IPoE server sends DHCP ACK
        └─ "Confirmed! Use this IP address"

Step 8: Client configures IP and is online
        └─ Can access services immediately
```

### Authentication Methods

#### 1. MAC-Based Authentication

```routeros
# Known clients get fixed IPs based on MAC address
/ip dhcp-server lease add mac-address=00:11:22:33:44:55 \
    address=10.0.0.100 server=ipoe_dhcp
```

**Use case:** Small ISP with known customers, fixed CPE devices

**Advantages:**
- Simple to implement
- Deterministic IP assignment
- Works offline (no RADIUS needed)

**Disadvantages:**
- Manual management
- Not scalable beyond 100s of clients
- Can't track session details

#### 2. RADIUS-Based Authentication

```routeros
# RADIUS validates each DHCP request
/ip dhcp-server set ipoe_dhcp use-radius=yes
/radius add service=dhcp address=192.168.1.100 secret=secret timeout=2s
```

**Use case:** Large ISP with dynamic user base and billing requirements

**Advantages:**
- Centralized user management
- Session accounting for billing
- Dynamic attributes (bandwidth, pools, VLANs)
- Scalable to thousands of users

**Disadvantages:**
- RADIUS server dependency
- Network latency affects DHCP speed
- More complex troubleshooting

#### 3. Circuit-ID Based (Interface-Aware)

```routeros
# Each interface/VLAN is a circuit with its own pool
/ip dhcp-server set ipoe_dhcp use-circuit-id=yes
/ip dhcp-server network add address=10.0.0.0/24 circuit=ether2
```

**Use case:** ISP with dedicated interfaces per customer (wholesale/backhaul)

**Advantages:**
- Per-port billing accuracy
- Interface-level isolation
- Prevents pool conflicts

**Disadvantages:**
- Requires dedicated interfaces per customer
- Not suitable for shared interfaces

#### 4. VLAN-Based Segmentation

```routeros
# Different VLANs for different customer tiers
/interface vlan add name=vlan_100 interface=ether1 vlan-id=100
/ip dhcp-server add interface=vlan_100 address-pool=pool_basic
```

**Use case:** Multi-tenant networks, customer isolation

**Advantages:**
- Separate broadcast domains
- Per-VLAN billing and limits
- Enhanced security and isolation

**Disadvantages:**
- Requires VLAN-capable equipment
- Higher configuration complexity

### DHCP Lease Management

IPoE servers manage IP assignments through DHCP leases:

```routeros
# View active DHCP leases
/ip dhcp-server lease print

# Output:
# ID  ADDRESS      MAC-ADDRESS         HOST-NAME  EXPIRES-AFTER
# 0   10.0.0.50    00:11:22:33:44:55   client1    23h59m32s
# 1   10.0.0.51    AA:BB:CC:DD:EE:FF   client2    23h59m18s
```

**Lease Duration Impact:**

| Duration | Use Case | Pros | Cons |
|----------|----------|------|------|
| **1 hour** | Mobile/hotspot | Quick turnover | More DHCP traffic |
| **6 hours** | Small ISP | Balance between both | Still frequent renewal |
| **24 hours** | Standard ISP | Reduced DHCP load | Can't reclaim IPs quickly |
| **7 days** | Enterprise | Minimal load | Stale IPs may remain |

**Recommended:** 24h for typical ISP, 1h for hotspot networks

#### Rate Limiting on DHCP Leases

Assign speed limits directly to individual DHCP leases for simpler management:

**1. Create lease with rate limit (MAC-based)**

```routeros
# Basic tier: 10 Mbps down / 5 Mbps up
/ip dhcp-server lease add mac-address=00:11:22:33:44:55 \
    address=10.0.0.100 server=ipoe_dhcp \
    rate-limit=10M/5M

# Premium tier: 50 Mbps down / 20 Mbps up
/ip dhcp-server lease add mac-address=AA:BB:CC:DD:EE:FF \
    address=10.0.0.101 server=ipoe_dhcp \
    rate-limit=50M/20M

# Enterprise tier: 100 Mbps down / 50 Mbps up
/ip dhcp-server lease add mac-address=11:22:33:44:55:66 \
    address=10.0.0.102 server=ipoe_dhcp \
    rate-limit=100M/50M
```

**2. View and manage lease rate limits**

```routeros
# List all leases with their rate limits
/ip dhcp-server lease print columns=address,mac-address,rate-limit

# Output:
# ADDRESS      MAC-ADDRESS         RATE-LIMIT
# 10.0.0.100   00:11:22:33:44:55   10M/5M
# 10.0.0.101   AA:BB:CC:DD:EE:FF   50M/20M
# 10.0.0.102   11:22:33:44:55:66   100M/50M
```

**3. Modify rate limit for existing lease**

```routeros
# Change rate limit for a specific MAC address
/ip dhcp-server lease set [find mac-address=00:11:22:33:44:55] rate-limit=20M/10M

# Increase speed for customer upgrade
/ip dhcp-server lease set [find mac-address=AA:BB:CC:DD:EE:FF] rate-limit=100M/50M

# Remove rate limit (unlimited)
/ip dhcp-server lease set [find mac-address=11:22:33:44:55:66] rate-limit=""
```

**4. Create bulk leases with tier-based rate limits**

```routeros
# Tier 1: Budget (5 Mbps)
/ip dhcp-server lease add mac-address=00:11:11:11:11:11 address=10.0.0.103 rate-limit=5M/2M
/ip dhcp-server lease add mac-address=00:22:22:22:22:22 address=10.0.0.104 rate-limit=5M/2M

# Tier 2: Standard (10 Mbps)
/ip dhcp-server lease add mac-address=00:33:33:33:33:33 address=10.0.0.105 rate-limit=10M/5M
/ip dhcp-server lease add mac-address=00:44:44:44:44:44 address=10.0.0.106 rate-limit=10M/5M

# Tier 3: Premium (50 Mbps)
/ip dhcp-server lease add mac-address=00:55:55:55:55:55 address=10.0.0.107 rate-limit=50M/20M
/ip dhcp-server lease add mac-address=00:66:66:66:66:66 address=10.0.0.108 rate-limit=50M/20M
```

**Benefits of Lease-based Rate Limiting:**
- ✅ Per-client limits without separate queue rules
- ✅ Easy tier management (change one lease attribute)
- ✅ No queue complexity or naming conflicts
- ✅ Automatic cleanup when lease expires
- ✅ Works with MAC-based and fixed-IP leases

**Lease Rate Limit vs Queue-based Limiting:**

| Aspect | Lease Rate Limit | Queue Rule |
|--------|------------------|------------|
| **Setup** | Single command | Multiple steps |
| **Per-IP** | Easy | Medium |
| **Per-VLAN** | Hard | Easy |
| **Scalability** | 100s clients | 1000s+ clients |
| **Management** | Simple | Complex |
| **Performance** | Low overhead | Slightly higher |
| **Use case** | Small ISP | Large ISP |

### IP Pool Sizing

Calculate pool size based on expected concurrent users:

```
Pool Formula:
Total IPs = Expected Concurrent Users × Safety Margin (1.2-1.5)

Example 1: 100 concurrent users
Total IPs = 100 × 1.2 = 120 IPs needed
/10 network = 254 usable IPs ✓ (sufficient)

Example 2: 500 concurrent users
Total IPs = 500 × 1.2 = 600 IPs needed
Single /10 (254 IPs) ✗ (insufficient)
Solution: Use multiple /9 networks or subnets
/ip pool add ranges=10.0.0.10-10.0.255.254  (65,526 IPs)
```

### Rate Limiting and Bandwidth Management

IPoE servers control user bandwidth through queues and rate limits. Each customer can be assigned different speed tiers.

#### Bandwidth Control Methods

**1. Simple Rate Limit (Per IP)**

```routeros
# Limit single IP to 10 Mbps download / 5 Mbps upload
/queue simple add name=client_10m target=10.0.0.50/32 \
    max-packet-queue=50 limit-at=5M/5M \
    burst-limit=10M/10M burst-time=10s/10s
```

**2. Per-Pool Rate Limit (All customers in pool)**

```routeros
# All clients in 10.0.0.0/24 limited to combined 1 Gbps
/queue simple add name=pool_limit target=10.0.0.0/24 \
    max-packet-queue=100 limit-at=500M/500M \
    burst-limit=1G/1G burst-time=30s/30s
```

**3. Per-VLAN Rate Limit (Tier-based speeds)**

```routeros
# Basic tier: 10 Mbps
/queue simple add name=tier_basic target=10.100.0.0/24 \
    limit-at=10M/10M burst-limit=20M/20M

# Premium tier: 50 Mbps
/queue simple add name=tier_premium target=10.101.0.0/24 \
    limit-at=50M/50M burst-limit=100M/100M

# Enterprise tier: 100 Mbps
/queue simple add name=tier_enterprise target=10.102.0.0/24 \
    limit-at=100M/100M burst-limit=200M/200M
```

**4. Dynamic Rate Limit via RADIUS**

```routeros
# RADIUS sends Filter-Id attribute to apply queue rule
# Create queues first

/queue simple add name=speed_5m priority=8 target=0.0.0.0/0 \
    limit-at=5M/5M burst-limit=10M/10M

/queue simple add name=speed_10m priority=8 target=0.0.0.0/0 \
    limit-at=10M/10M burst-limit=20M/20M

/queue simple add name=speed_50m priority=8 target=0.0.0.0/0 \
    limit-at=50M/50M burst-limit=100M/100M

# RADIUS attribute example:
# Filter-Id = speed_10m  (client gets 10 Mbps)
```

#### Rate Limit Parameters Explained

| Parameter | What It Does | Example |
|-----------|--------------|---------|
| **limit-at** | Guaranteed minimum speed | `limit-at=10M/10M` = 10 Mbps min |
| **burst-limit** | Maximum speed allowed | `burst-limit=20M/20M` = 20 Mbps max |
| **burst-time** | How long burst lasts | `burst-time=10s/10s` = 10 second bursts |
| **max-packet-queue** | Buffer before drop | Higher = more latency, better for large files |
| **priority** | Queue priority (1-8) | Lower = higher priority |

**Real Example:**
```routeros
/queue simple add name=client_john target=10.0.0.75/32 \
    limit-at=10M/5M \              # Guaranteed 10M down, 5M up
    burst-limit=20M/10M \          # Up to 20M down, 10M up
    burst-time=30s/30s \           # Can burst for 30 seconds
    max-packet-queue=100 \         # Buffer 100 packets
    priority=4                      # Medium priority
```

**What this means:**
- John's line always gets at least 10 Mbps download, 5 Mbps upload
- During idle network (burst time), John can get up to 20 Mbps down, 10 Mbps up
- If network is congested, John drops back to 10M/5M guarantees

#### Speed Tier Combinations

| Tier | Download | Upload | Use Case |
|------|----------|--------|----------|
| **Basic** | 5 Mbps | 2 Mbps | Browsing, email |
| **Standard** | 10 Mbps | 5 Mbps | Video streaming |
| **Premium** | 50 Mbps | 20 Mbps | HD video, gaming |
| **Enterprise** | 100 Mbps | 50 Mbps | Business, large files |
| **Unlimited** | No limit | No limit | Premium customers |

#### Testing Actual Speeds

```bash
# From client, test download speed
speedtest-cli                          # Generic speedtest

# From server, generate test traffic
iperf3 -s                             # Start server mode
iperf3 -c 10.0.0.50 -R              # Test client → server

# Results show actual throughput achieved
[ 5] 0.0-10.0 sec  120 MBytes  96.0 Mbits/sec
```

### RADIUS Attributes for Bandwidth Control

When using RADIUS, send these attributes to apply per-user speed limits:

```
Standard RADIUS Attributes:

Attribute Name              | Code | Example Value
────────────────────────────┼──────┼─────────────
Filter-Id                   | 11   | speed_10m (references queue name)
Acct-Input-Gigawords        | 52   | Track data usage
Acct-Output-Gigawords       | 53   | Track data usage
Acct-Session-Time           | 46   | Session duration in seconds
```

**Example RADIUS Response (FreeRADIUS format):**
```
Reply-Message = "Authenticated successfully"
Filter-Id = "speed_10m"
Session-Timeout = 86400
Framed-IP-Address = 10.0.0.50
```

This tells RouterOS:
1. Apply queue named "speed_10m" to this user
2. Disconnect after 24 hours
3. Assign this specific IP address
4. Allow the connection

### Monitoring Bandwidth Usage

```routeros
# View queue statistics
/queue simple print stats

# Output example:
# NAME          BYTES-IN    BYTES-OUT   PACKET-IN  PACKET-OUT
# tier_basic    1.5G        3.2G        2.1M       1.8M
# tier_premium  45.2G       98.5G       34.5M      28.2M

# Monitor real-time throughput
/interface ethernet print stats
```

---

### IP Pool Sizing

Calculate pool size based on expected concurrent users:

```
Pool Formula:
Total IPs = Expected Concurrent Users × Safety Margin (1.2-1.5)

Example 1: 100 concurrent users
Total IPs = 100 × 1.2 = 120 IPs needed
/10 network = 254 usable IPs ✓ (sufficient)

Example 2: 500 concurrent users
Total IPs = 500 × 1.2 = 600 IPs needed
Single /10 (254 IPs) ✗ (insufficient)
Solution: Use multiple /9 networks or subnets
/ip pool add ranges=10.0.0.10-10.0.255.254  (65,526 IPs)
```

### RADIUS Attributes for IPoE

When using RADIUS, these attributes control client behavior:

```
RADIUS Attribute         | RouterOS Use | Example Value
─────────────────────────┼──────────────┼─────────────
Service-Type             | Auth method  | 2 (Framed-User)
Framed-IP-Address        | Fixed IP     | 10.0.0.100
Framed-IP-Netmask        | Subnet mask  | 255.255.255.0
Framed-Route             | Static route | 10.20.0.0/24
Filter-Id                | Queue rule   | bandwidth_limit_10m
Acct-Input-Octets        | Usage count  | Updated on session end
Session-Timeout          | Disconnect   | 3600 (1 hour)
Idle-Timeout             | Inactivity   | 600 (10 min no traffic)
```

### IPoE vs PPPoE Performance

```
Network Capacity Test (on 1Gbps interface):

PPPoE:
├─ Average throughput: 850-920 Mbps
├─ Overhead: 8-15%
├─ CPU load: Medium
└─ Use case: Traditional ISP

IPoE:
├─ Average throughput: 940-980 Mbps
├─ Overhead: 0-2%
├─ CPU load: Low
└─ Use case: Modern fiber/Ethernet ISP
```

---

## ✔️ Verification

### 1. Check DHCP Server Status

```routeros
/ip dhcp-server print
```

**Expected Output:**
```
Flags: X - disabled, D - dynamic
 #     NAME            INTERFACE   ADDRESS-POOL        LEASE-TIME
 0     ipoe_dhcp       ether2      ipoe_pool            24h
 1     ipoe_dhcp_sec   ether3      ipoe_pool_sec        24h
 2     ipoe_radius     ether4      ipoe_pool_radius     24h
```

### 2. Verify Active DHCP Leases

```routeros
/ip dhcp-server lease print
```

**Expected Output:**
```
 #  ADDRESS      MAC-ADDRESS         HOST-NAME    EXPIRES-AFTER   STATUS
 0  10.0.0.50    00:11:22:33:44:55   client1      23h59m12s       bound
 1  10.0.0.51    AA:BB:CC:DD:EE:FF   client2      23h58m45s       bound
 2  10.0.0.52    11:22:33:44:55:66   client3      23h57m30s       bound
```

### 3. Check RADIUS Configuration

```routeros
/radius print
```

**Expected Output:**
```
 #  SERVICE  ADDRESS         SECRET              TIMEOUT  RETRY
 0  dhcp     192.168.1.100   RadiusSecret123     2s       3
 1  dhcp     192.168.1.101   RadiusSecret123     2s       3
```

### 4. Test Client Connection

```bash
# On Linux client
dhclient eth0          # Request IP via DHCP

# Verify assignment
ip addr show eth0      # Should show IPoE server's IP range
```

**Expected Output:**
```
eth0: <BROADCAST,RUNNING,MULTICAST> mtu 1500
    inet 10.0.0.50/24 brd 10.0.0.255 scope global dynamic eth0
    inet6 fe80::201:11:22:33:44:55/64 scope link
```

### 5. Monitor IPoE Traffic

```routeros
/interface ethernet print stats
/ip route print
/ip firewall nat print
```

---

## 🔧 Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Client can't get IP | DHCP server disabled | Enable: `/ip dhcp-server enable [find]` |
| Gets IP but no internet | Gateway not set | Configure gateway in DHCP network: `gateway=10.0.0.1` |
| IP conflicts with other pools | Overlapping ranges | Use non-overlapping pools (10.0.0.0/24 and 10.1.0.0/24) |
| DHCP very slow | RADIUS timeout | Reduce RADIUS timeout: `timeout=1s` or `timeout=500ms` |
| All IPs exhausted | Pool too small | Increase pool size or add additional pool |
| RADIUS always fails | Network unreachable | Check routing: `ping 192.168.1.100` |
| Lease not renewing | Lease time too short | Increase lease time: `lease-time=24h` |
| VLAN clients not getting IP | DHCP not on VLAN | Create DHCP server for each VLAN interface |
| MAC-based auth not working | Lease not created | Verify MAC address format: `00:11:22:33:44:55` |
| Clients disconnecting | Session timeout | Check RADIUS timeout attribute or DHCP server limits |

---

## ⚙️ Advanced Options

### 1. Dynamic IP Pool Based on Time

```routeros
# Expand pool during peak hours (6PM-11PM)
/system scheduler add name=expand_pool on-time=18:00:00 \
    on-event="/ip pool set ipoe_pool ranges=10.0.0.10-10.0.0.254"

# Shrink pool during off-hours
/system scheduler add name=shrink_pool on-time=23:00:00 \
    on-event="/ip pool set ipoe_pool ranges=10.0.0.100-10.0.0.200"
```

### 2. Per-User Bandwidth Limiting via RADIUS

```routeros
# RADIUS sends Filter-Id attribute pointing to queue
# RouterOS applies queue rule based on Filter-Id

/queue simple
add name=limit_5m target=0.0.0.0/0 priority=8 \
    limit-at=5M/5M burst-limit=10M/10M burst-time=10s/10s

add name=limit_10m target=0.0.0.0/0 priority=8 \
    limit-at=10M/10M burst-limit=20M/20M burst-time=10s/10s

add name=limit_50m target=0.0.0.0/0 priority=8 \
    limit-at=50M/50M burst-limit=100M/100M burst-time=10s/10s

add name=limit_100m target=0.0.0.0/0 priority=8 \
    limit-at=100M/100M burst-limit=200M/200M burst-time=10s/10s

# RADIUS attribute: Filter-Id = limit_10m (applies 10M/10M queue)
```

### 3. Real-Time Bandwidth Monitoring Script

```routeros
# Monitor and log bandwidth usage per customer
:foreach customer in=[/ip dhcp-server lease find] do={
    :local ip [/ip dhcp-server lease get $customer address]
    :local bytes_in [/interface ethernet get [find default-name=ether2] rx-byte]
    :local bytes_out [/interface ethernet get [find default-name=ether2] tx-byte]
    :log info "Customer: $ip | RX: $bytes_in | TX: $bytes_out"
}

# Schedule to run every minute
/system scheduler add name=bandwidth_log interval=60s on-event=bandwidth_monitor
```

```routeros
# Enable accounting to track sessions
/radius set [find address=192.168.1.100] accounting=yes

# Enable DHCP accounting
/ip dhcp-server set ipoe_dhcp accounting=yes

# View accounting logs
/log print where topics~"dhcp"
```

### 4. Client-Specific Configuration via DHCP Options

```routeros
# Add custom DHCP options
/ip dhcp-server option add code=66 name=boot-server value="192.168.1.50"
add code=67 name=boot-file value="/tftp/bootfile"

# Add to network
/ip dhcp-server network set [find address=10.0.0.0/24] \
    dhcp-option=boot-server,boot-file
```

### 5. Automatic Bandwidth Adjustment Based on Time

```routeros
# During peak hours (6PM-11PM), reduce burst limit to manage congestion
/system scheduler add name=peak_hours on-time=18:00:00 \
    on-event="/queue simple set limit-at=5M/5M burst-limit=10M/10M \
    [find target=10.0.0.0/24]"

# During off-peak hours (11PM-6AM), allow full speed
/system scheduler add name=offpeak_hours on-time=23:00:00 \
    on-event="/queue simple set limit-at=10M/10M burst-limit=50M/50M \
    [find target=10.0.0.0/24]"
```

### 6. Load Balancing Across Multiple DHCP Servers

```routeros
# Server 1 handles first half of pool
/ip pool add name=pool_1 ranges=10.0.0.10-10.0.0.130
/ip dhcp-server add name=dhcp_1 interface=ether2 address-pool=pool_1

# Server 2 handles second half of pool
/ip pool add name=pool_2 ranges=10.0.0.131-10.0.0.254
/ip dhcp-server add name=dhcp_2 interface=ether2 address-pool=pool_2

# Both servers on same interface (RouterOS handles balancing)
```

### 6. Conditional VLAN Assignment via RADIUS

```routeros
# RADIUS sends different VLAN based on user group
# Requires advanced RADIUS configuration

# RouterOS assigns client to pool based on RADIUS response
/ip dhcp-server network
add address=10.100.0.0/24 circuit="basic-tier" gateway=10.100.0.1
add address=10.101.0.0/24 circuit="premium-tier" gateway=10.101.0.1
```

### 7. Monitoring and Alerts

```routeros
# Log when pool reaches 80% capacity
/system scheduler add name=pool_check interval=5m on-event=check_pool_script

# Script content:
:local total [/ip pool get ipoe_pool total-addresses]
:local free [/ip pool get ipoe_pool available-addresses]
:local usage (100 * ($total - $free) / $total)

:if ($usage > 80) do={
    /log warning "IPoE pool usage at $usage%"
    /tool send-email to=admin@isp.com subject="Pool alert"
}
```

### 8. Graceful Shutdown (Migrate Clients)

```routeros
# Reduce lease time before maintenance
/ip dhcp-server set ipoe_dhcp lease-time=5m

# Wait for leases to expire
:delay 300s

# Now safely reboot or update
/system reboot
```

### 9. DHCP Relay Configuration (Remote DHCP Server)

```routeros
# If DHCP server is on different router
/ip dhcp-relay
add name=relay interface=ether1 dhcp-server=192.168.1.100 \
    local-address=192.168.1.1 disabled=no

# Forward DHCP requests from ether1 to remote server
```

### 10. Dual-Stack (IPv4 + IPv6 IPoE)

```routeros
# IPv4 IPoE
/ip dhcp-server add name=dhcp_v4 interface=ether2 address-pool=pool_v4

# IPv6 IPoE (DHCPv6)
/ipv6 dhcp-server add name=dhcp_v6 interface=ether2 address-pool=pool_v6 \
    lease-time=1d

# SLAAC alternative (requires RA)
/ipv6 nd add interface=ether2 ra-lifetime=15m
```

---

## 🔗 Related Guides

- [PPPoE Server PADO Delay Failover](./pppoe-server-pado-delay-failover) — Dial-up alternative
- [RADIUS Authentication Setup](../Monitoring/radius-server-authentication) — Centralized user management
- [DHCP Server Configuration](./dhcp-server-advanced) — DHCP pool management
- [Bandwidth Limiting per User](../Bandwidth/bandwidth-limiting-per-user) — Traffic control
- [VLAN Configuration](../../Network/vlan-configuration) — Network segmentation
- [Multi-WAN Failover](../ISP/multi-wan-failover-advanced) — Redundancy
- [NetWatch Health Monitoring](../Monitoring/netwatch-health-check) — Service monitoring

---

✅ **IPoE server deployed successfully!** Your always-on broadband infrastructure is ready for client connections with flexible authentication and management options.

