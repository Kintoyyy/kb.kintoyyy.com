---
sidebar_position: 2
---

# 🏢 VLAN Configuration and Management

VLANs (Virtual Local Area Networks) logically segment a physical network into isolated broadcast domains, improving security, performance, and management without additional hardware. This guide covers VLAN basics, trunking, inter-VLAN routing, and practical enterprise configurations.

:::info Key Concepts
- **VLAN** - Logical network segment within a physical switch/network
- **VLAN ID** - Unique identifier (1-4094) for each VLAN
- **Trunk Port** - Carries multiple VLANs using 802.1Q tagging
- **Access Port** - Belongs to single VLAN (untagged traffic)
- **Native VLAN** - Untagged traffic on trunk ports (usually VLAN 1)
- **Inter-VLAN Routing** - Routes traffic between different VLANs
- **802.1Q** - IEEE standard for VLAN tagging
:::

---

## Prerequisites

Before configuring VLANs, ensure you have:

- ✅ Basic understanding of Layer 2 switching concepts
- ✅ RouterOS or managed switch with VLAN support
- ✅ Network topology diagram with VLAN assignments
- ✅ IP addressing plan for each VLAN
- ✅ Access to router/switch configuration (SSH/Winbox)

---

:::warning Important Considerations
- **VLAN 1 Security Risk:** Default VLAN 1 should not be used for production traffic
- **Native VLAN Mismatch:** Trunk ports on both ends must use same native VLAN
- **PVID Assignment:** Each port needs proper PVID (Port VLAN ID) configuration
- **Switch Compatibility:** Verify switch supports 802.1Q tagging
- **Routing Requirement:** VLANs cannot communicate without Layer 3 routing
- **Bridge VLAN Filtering:** MikroTik requires bridge VLAN filtering for proper isolation
:::

---

## Understanding VLANs

### What Are VLANs?

VLANs divide a single physical network into multiple logical networks, isolating broadcast traffic and creating security boundaries.

**Without VLANs:**
```
[Switch] ─── All devices in one broadcast domain (192.168.1.0/24)
  ├── HR PC
  ├── Guest Laptop
  ├── Server
  └── IP Camera
```

**With VLANs:**
```
[Router/Switch with VLANs]
  ├── VLAN 10 (HR):        10.0.10.0/24
  ├── VLAN 20 (Guest):     10.0.20.0/24
  ├── VLAN 30 (Servers):   10.0.30.0/24
  └── VLAN 40 (Security):  10.0.40.0/24
```

### VLAN Tagging (802.1Q)

When traffic crosses a trunk port, it's "tagged" with VLAN ID:

```
Ethernet Frame WITHOUT Tag (Access Port):
[Dest MAC][Src MAC][Type][Payload][CRC]

Ethernet Frame WITH 802.1Q Tag (Trunk Port):
[Dest MAC][Src MAC][802.1Q Tag: VLAN 10][Type][Payload][CRC]
                    ↑ 4-byte tag inserted
```

---

## Common VLAN Scenarios

### Scenario 1: Office with Departmental VLANs

**Network:** Small office with 4 departments

| VLAN ID | Name       | Subnet          | Gateway      | Purpose               | Devices |
|---------|------------|-----------------|--------------|----------------------|---------|
| 10      | Management | 10.0.10.0/24    | 10.0.10.1    | Network infrastructure| 30      |
| 20      | HR         | 10.0.20.0/24    | 10.0.20.1    | HR department        | 50      |
| 30      | Sales      | 10.0.30.0/24    | 10.0.30.1    | Sales team           | 80      |
| 40      | Engineering| 10.0.40.0/24    | 10.0.40.1    | Development team     | 100     |
| 50      | Guest      | 10.0.50.0/24    | 10.0.50.1    | Guest WiFi           | 200     |
| 99      | Native     | 192.168.99.0/24 | N/A          | Unused native VLAN   | 0       |

**Port Assignments:**

| Port(s)    | Type   | VLAN(s)        | Description                    |
|------------|--------|----------------|--------------------------------|
| ether1     | Trunk  | All (10-50)    | Uplink to router               |
| ether2-5   | Access | VLAN 10        | Switches, APs, management      |
| ether6-10  | Access | VLAN 20        | HR workstations                |
| ether11-15 | Access | VLAN 30        | Sales desks                    |
| ether16-20 | Access | VLAN 40        | Engineering lab                |
| wlan1      | Access | VLAN 50        | Guest WiFi access point        |

---

### Scenario 2: Multi-Site with VoIP Separation

**Network:** Headquarters + branch with VoIP quality requirements

| VLAN ID | Name       | Subnet          | Gateway      | QoS Priority | Description                |
|---------|------------|-----------------|--------------|--------------|----------------------------|
| 100     | Data       | 172.16.100.0/24 | 172.16.100.1 | Normal       | User workstations          |
| 200     | VoIP       | 172.16.200.0/24 | 172.16.200.1 | High (EF)    | IP phones, PBX             |
| 300     | Servers    | 172.16.300.0/24 | 172.16.300.1 | Medium       | File, print, DHCP servers  |
| 999     | Management | 192.168.1.0/24  | 192.168.1.1  | Critical     | Switch/router management   |

**VoIP VLAN Benefits:**
- **QoS Enforcement:** Priority queuing for voice packets (low latency)
- **Bandwidth Reservation:** Guaranteed 128 kbps per call
- **Security:** Isolate phones from user data network
- **Simplified Troubleshooting:** Separate broadcast domains

---

### Scenario 3: ISP Customer Isolation

**Network:** ISP PPPoE server with customer VLANs

| VLAN ID | Customer Name    | PPPoE Pool        | Bandwidth  | Notes                      |
|---------|------------------|-------------------|------------|----------------------------|
| 101     | Business Corp A  | 10.101.0.0/24     | 100/100M   | Dedicated fiber, static IPs|
| 102     | Residential Zone | 10.102.0.0/22     | 50/10M     | Shared GPON, dynamic DHCP  |
| 103     | Cafe Hotspot     | 10.103.0.0/24     | 20/20M     | Captive portal, rate limit |
| 104     | School District  | 10.104.0.0/23     | 200/200M   | Content filtering enabled  |

**Per-VLAN Configuration:**
```routeros
# Customer isolation via VLAN + PPPoE
/interface vlan add name=vlan-biz-a vlan-id=101 interface=ether1-sfp
/interface vlan add name=vlan-resi vlan-id=102 interface=ether1-sfp

# PPPoE servers per VLAN
/interface pppoe-server server add service-name=biz-fiber interface=vlan-biz-a
/interface pppoe-server server add service-name=residential interface=vlan-resi

# Bandwidth profiles
/queue simple add name=customer-a target=vlan-biz-a max-limit=100M/100M
/queue simple add name=residential target=vlan-resi max-limit=50M/10M
```

---

## Configuration in MikroTik RouterOS

### Option A: Terminal (Bridge VLAN Setup)

```routeros
# Step 1: Create bridge (if not exists)
/interface bridge add name=bridge1 vlan-filtering=yes comment="Main Bridge"

# Step 2: Add interfaces to bridge
/interface bridge port add bridge=bridge1 interface=ether2 pvid=10 comment="Management"
/interface bridge port add bridge=bridge1 interface=ether3 pvid=20 comment="HR"
/interface bridge port add bridge=bridge1 interface=ether4 pvid=30 comment="Sales"
/interface bridge port add bridge=bridge1 interface=ether5 pvid=40 comment="Engineering"
/interface bridge port add bridge=bridge1 interface=ether1 comment="Trunk to Core"

# Step 3: Create VLAN interfaces on bridge
/interface vlan add name=vlan10-mgmt vlan-id=10 interface=bridge1
/interface vlan add name=vlan20-hr vlan-id=20 interface=bridge1
/interface vlan add name=vlan30-sales vlan-id=30 interface=bridge1
/interface vlan add name=vlan40-eng vlan-id=40 interface=bridge1

# Step 4: Assign IP addresses to VLAN interfaces
/ip address add address=10.0.10.1/24 interface=vlan10-mgmt comment="MGMT Gateway"
/ip address add address=10.0.20.1/24 interface=vlan20-hr comment="HR Gateway"
/ip address add address=10.0.30.1/24 interface=vlan30-sales comment="Sales Gateway"
/ip address add address=10.0.40.1/24 interface=vlan40-eng comment="Eng Gateway"

# Step 5: Configure bridge VLAN table (CRITICAL for isolation)
/interface bridge vlan add bridge=bridge1 vlan-ids=10 tagged=ether1 untagged=ether2
/interface bridge vlan add bridge=bridge1 vlan-ids=20 tagged=ether1 untagged=ether3
/interface bridge vlan add bridge=bridge1 vlan-ids=30 tagged=ether1 untagged=ether4
/interface bridge vlan add bridge=bridge1 vlan-ids=40 tagged=ether1 untagged=ether5

# Step 6: Enable VLAN filtering (APPLIES isolation rules)
/interface bridge set bridge1 vlan-filtering=yes

# Step 7: Setup DHCP servers per VLAN
/ip pool add name=pool-mgmt ranges=10.0.10.100-10.0.10.200
/ip pool add name=pool-hr ranges=10.0.20.100-10.0.20.200
/ip pool add name=pool-sales ranges=10.0.30.100-10.0.30.200
/ip pool add name=pool-eng ranges=10.0.40.100-10.0.40.200

/ip dhcp-server network add address=10.0.10.0/24 gateway=10.0.10.1 dns-server=8.8.8.8
/ip dhcp-server network add address=10.0.20.0/24 gateway=10.0.20.1 dns-server=8.8.8.8
/ip dhcp-server network add address=10.0.30.0/24 gateway=10.0.30.1 dns-server=8.8.8.8
/ip dhcp-server network add address=10.0.40.0/24 gateway=10.0.40.1 dns-server=8.8.8.8

/ip dhcp-server add name=dhcp-mgmt interface=vlan10-mgmt address-pool=pool-mgmt
/ip dhcp-server add name=dhcp-hr interface=vlan20-hr address-pool=pool-hr
/ip dhcp-server add name=dhcp-sales interface=vlan30-sales address-pool=pool-sales
/ip dhcp-server add name=dhcp-eng interface=vlan40-eng address-pool=pool-eng
```

### Option B: Winbox

#### Part 1: Bridge Configuration

1. **Create Bridge:**
   - Bridge → [+]
   - Name: `bridge1`
   - VLAN Filtering: ✅ **Checked** (enable after setup)
   - Click OK

2. **Add Ports to Bridge:**
   - Bridge → Ports → [+]
   - Interface: `ether2`, Bridge: `bridge1`, PVID: `10`, Comment: `Management`
   - Repeat for ether3 (PVID 20), ether4 (PVID 30), ether5 (PVID 40)
   - Add `ether1` with no PVID (trunk port)

#### Part 2: VLAN Interfaces

3. **Create VLAN Interfaces:**
   - Interfaces → VLAN → [+]
   - Name: `vlan10-mgmt`, VLAN ID: `10`, Interface: `bridge1`
   - Repeat for VLAN 20, 30, 40

4. **Assign IP Addresses:**
   - IP → Addresses → [+]
   - Address: `10.0.10.1/24`, Interface: `vlan10-mgmt`
   - Repeat for other VLANs (10.0.20.1/24, 10.0.30.1/24, 10.0.40.1/24)

#### Part 3: Bridge VLAN Table

5. **Configure VLAN Membership:**
   - Bridge → VLANs → [+]
   - Bridge: `bridge1`, VLAN IDs: `10`
   - Tagged: `ether1` (trunk)
   - Untagged: `ether2` (access port)
   - Repeat for VLANs 20, 30, 40

6. **Enable VLAN Filtering:**
   - Bridge → Bridge → Select `bridge1`
   - VLAN Filtering: ✅ **Check**
   - Click Apply

#### Part 4: DHCP Setup

7. **Create DHCP Pools and Networks:**
   - IP → Pool → [+] for each VLAN range
   - IP → DHCP Server → Networks → [+] for each subnet
   - IP → DHCP Server → DHCP → [+] for each VLAN interface

---

## Understanding the Configuration

### Network Flow Diagram

```
[Client PC] ─── [Access Port ether3] ───┐
VLAN 20              PVID=20            │
10.0.20.100                             │
                                        ▼
                              ┌─────────────────┐
                              │   Bridge1       │
                              │ VLAN Filtering  │
                              └─────────────────┘
                                        │
                        ┌───────────────┼───────────────┐
                        ▼               ▼               ▼
                  [VLAN 10]       [VLAN 20]       [VLAN 30]
                   Interface       Interface       Interface
                   10.0.10.1/24   10.0.20.1/24   10.0.30.1/24
                        │               │               │
                        └───────────────┴───────────────┘
                                        │
                                   [Routing]
                              Inter-VLAN Traffic
```

### Key Components Table

| Component | Purpose | Configuration |
|-----------|---------|---------------|
| **Bridge** | Unifies physical interfaces into single logical switch | `/interface bridge add` |
| **Bridge Port** | Adds physical interface to bridge with PVID | `/interface bridge port add pvid=XX` |
| **PVID (Port VLAN ID)** | Default VLAN for untagged traffic on access port | Set per bridge port |
| **VLAN Interface** | Layer 3 gateway for VLAN subnet | `/interface vlan add` |
| **Bridge VLAN Table** | Defines which VLANs exist on which ports | `/interface bridge vlan add` |
| **Tagged Port** | Trunk port carrying multiple VLANs (802.1Q) | `tagged=ether1` in VLAN table |
| **Untagged Port** | Access port for single VLAN | `untagged=ether2` in VLAN table |
| **VLAN Filtering** | Enforces isolation between VLANs | `vlan-filtering=yes` on bridge |

---

## Verification

### Step 1: Verify Bridge Configuration

```routeros
# Check bridge exists with VLAN filtering
/interface bridge print detail

# Expected output:
# name="bridge1" vlan-filtering=yes

# Verify bridge ports
/interface bridge port print

# Expected: ether2-5 with PVIDs, ether1 without PVID (trunk)
```

### Step 2: Check VLAN Interfaces

```routeros
# List VLAN interfaces
/interface vlan print

# Verify IP addresses
/ip address print where interface~"vlan"

# Expected:
# 10.0.10.1/24  vlan10-mgmt
# 10.0.20.1/24  vlan20-hr
# 10.0.30.1/24  vlan30-sales
# 10.0.40.1/24  vlan40-eng
```

### Step 3: Test VLAN Isolation

```routeros
# From router, ping VLAN gateways
/ping 10.0.10.1 count=3
/ping 10.0.20.1 count=3

# Check bridge VLAN table
/interface bridge vlan print

# Expected: VLANs 10-40 with correct tagged/untagged ports
```

### Step 4: Verify Client Connectivity

```bash
# From client PC on VLAN 20 (Windows):
ipconfig

# Expected:
#   IPv4 Address: 10.0.20.100
#   Subnet Mask: 255.255.255.0
#   Default Gateway: 10.0.20.1

# Ping gateway
ping 10.0.20.1

# Try ping other VLAN (should work if inter-VLAN routing enabled)
ping 10.0.30.1

# Try ping device in same VLAN
ping 10.0.20.101
```

### Step 5: Check DHCP Leases

```routeros
# View active DHCP leases per VLAN
/ip dhcp-server lease print where server=dhcp-hr

# Expected: Devices with 10.0.20.x addresses
```

### Step 6: Monitor VLAN Traffic

```routeros
# Real-time traffic monitoring on VLAN interface
/interface monitor-traffic vlan20-hr

# Check switch chip offload (if supported)
/interface ethernet switch vlan print
```

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| No connectivity after enabling VLAN filtering | Bridge VLAN table not configured | Add all VLANs to `/interface bridge vlan` before enabling filtering |
| Devices in same VLAN can't communicate | PVID not set on access ports | Verify `/interface bridge port` has correct `pvid=X` |
| Inter-VLAN routing not working | No VLAN interfaces or IP addresses | Create `/interface vlan` with IP addresses for each VLAN |
| Trunk port not passing VLANs | VLAN not tagged on trunk | Add `tagged=ether1` in `/interface bridge vlan` for all VLANs |
| Native VLAN mismatch | Different native VLAN on switches | Use same native VLAN (usually 99 or 1) on all trunk links |
| DHCP not working on VLAN | DHCP server bound to wrong interface | Bind DHCP server to VLAN interface, not physical port |
| Management access lost | Management VLAN not properly configured | Always configure management VLAN first, test before enabling filtering |
| Broadcast storms | Loop in topology without STP | Enable `/interface bridge set bridge1 protocol-mode=rstp` |
| VoIP phones not getting VLAN | LLDP-MED not enabled | Enable LLDP: `/ip neighbor discovery set ether2 discover=yes` |
| Switch chip offload not working | CRS3xx hardware bridge conflict | Use `/interface bridge port set hw=yes` on CRS devices |
| Firewall blocking inter-VLAN | Default drop rules | Add firewall forward rules: `/ip firewall filter add chain=forward action=accept` |
| VLAN traffic untagged on trunk | Port configured as access instead of trunk | Remove PVID from trunk port in bridge port settings |

---

## Advanced VLAN Options

### 1. Voice VLAN (Dual VLAN on Access Port)

Allow IP phones + PCs on same port:

```routeros
# Create voice VLAN
/interface vlan add name=vlan-voice vlan-id=200 interface=bridge1
/ip address add address=172.16.200.1/24 interface=vlan-voice

# Configure port for data + voice VLANs
/interface bridge port add interface=ether6 bridge=bridge1 pvid=100 comment="PC+Phone"
/interface bridge vlan add bridge=bridge1 vlan-ids=100 untagged=ether6
/interface bridge vlan add bridge=bridge1 vlan-ids=200 tagged=ether6

# Enable LLDP for phone auto-discovery
/ip neighbor discovery-settings set discover-interface-list=all
```

### 2. Private VLANs (Port Isolation)

Isolate clients within same VLAN:

```routeros
# Create guest VLAN with isolation
/interface vlan add name=vlan-guest vlan-id=50 interface=bridge1
/ip address add address=10.0.50.1/24 interface=vlan-guest

# Enable port isolation on bridge
/interface bridge port add interface=ether10 bridge=bridge1 pvid=50 \
  horizon=1 comment="Isolated Guest 1"
/interface bridge port add interface=ether11 bridge=bridge1 pvid=50 \
  horizon=1 comment="Isolated Guest 2"

# Horizon=1 prevents ether10 and ether11 from communicating directly
```

### 3. VLAN Trunking Between Sites (VPN)

Extend VLANs over VPN tunnel:

```routeros
# Site A
/interface vlan add name=vlan10-vpn vlan-id=10 interface=wireguard1

# Site B
/interface vlan add name=vlan10-vpn vlan-id=10 interface=wireguard1

# Bridge VLAN interface to local bridge
/interface bridge port add interface=vlan10-vpn bridge=bridge1
```

### 4. Dynamic VLAN Assignment (RADIUS)

Assign VLAN based on user authentication:

```routeros
# Configure RADIUS server
/radius add address=192.168.1.100 secret=radius-secret service=wireless

# Create wireless interface with dynamic VLAN
/interface wireless security-profiles add name=radius-profile \
  authentication-types=wpa2-eap eap-methods=eap-tls

/interface wireless set wlan1 security-profile=radius-profile \
  vlan-mode=use-tag default-vlan-id=50
```

RADIUS returns VLAN ID in attribute:
```
Tunnel-Type = VLAN (13)
Tunnel-Medium-Type = 802
Tunnel-Private-Group-ID = "20"  # Assigns VLAN 20
```

### 5. QinQ (VLAN Stacking)

Provider bridges for ISP networks:

```routeros
# Service provider edge
/interface vlan add name=customer-a-inner vlan-id=100 interface=ether1
/interface vlan add name=customer-a-outer vlan-id=500 interface=customer-a-inner

# Customer traffic: VLAN 100 wrapped in provider VLAN 500
```

### 6. VLAN Translation

Map VLAN IDs between networks:

```routeros
# Incoming VLAN 10 translated to VLAN 50
/interface vlan add name=vlan-in vlan-id=10 interface=ether1
/interface vlan add name=vlan-out vlan-id=50 interface=ether2

/interface bridge port add interface=vlan-in bridge=bridge1
/interface bridge port add interface=vlan-out bridge=bridge1
```

### 7. VLAN Firewall Rules

Control inter-VLAN traffic:

```routeros
# Allow HR (VLAN 20) to access Servers (VLAN 30)
/ip firewall filter add chain=forward in-interface=vlan20-hr \
  out-interface=vlan30-servers action=accept comment="HR to Servers"

# Block Guest (VLAN 50) from accessing internal VLANs
/ip firewall filter add chain=forward in-interface=vlan50-guest \
  dst-address=10.0.0.0/8 action=drop comment="Block Guest to Internal"

# Allow only DNS/HTTP from Guest
/ip firewall filter add chain=forward in-interface=vlan50-guest \
  protocol=tcp dst-port=53,80,443 action=accept
/ip firewall filter add chain=forward in-interface=vlan50-guest \
  protocol=udp dst-port=53 action=accept
```

### 8. VLAN-Based QoS

Prioritize traffic by VLAN:

```routeros
# Voice VLAN gets highest priority
/queue type add name=voice-queue kind=pfifo pfifo-limit=10 priority=1

/queue simple add name=voip-priority target=vlan-voice queue=voice-queue \
  max-limit=10M/10M priority=1/1

# Guest VLAN gets limited bandwidth
/queue simple add name=guest-limit target=vlan-guest max-limit=5M/5M \
  priority=8/8
```

### 9. VLAN Monitoring with Netwatch

Monitor VLAN gateway reachability:

```routeros
/tool netwatch add host=10.0.20.1 interval=30s \
  down-script={
    :log error "HR VLAN gateway DOWN"
    /tool e-mail send to="admin@company.com" \
      subject="VLAN 20 Gateway Unreachable" \
      body="HR department network may be offline"
  } \
  up-script=":log info \"HR VLAN gateway UP\""
```

### 10. Management VLAN Security

Isolate management traffic:

```routeros
# Create dedicated management VLAN
/interface vlan add name=vlan-mgmt vlan-id=999 interface=bridge1
/ip address add address=192.168.99.1/24 interface=vlan-mgmt

# Restrict management access
/ip firewall filter add chain=input in-interface=!vlan-mgmt \
  dst-port=22,23,80,8291 protocol=tcp action=drop \
  comment="Block non-mgmt VLAN access to router"

# Allow only from management VLAN
/ip firewall filter add chain=input in-interface=vlan-mgmt action=accept
```

### 11. VLAN MAC Filtering

Restrict VLAN access by MAC address:

```routeros
# Only allow specific devices on sensitive VLAN
/interface bridge port add interface=ether8 bridge=bridge1 pvid=30 \
  unknown-unicast-flood=no unknown-multicast-flood=no

# Whitelist MACs
/interface bridge host add bridge=bridge1 interface=ether8 \
  mac-address=AA:BB:CC:DD:EE:FF vid=30

/ip dhcp-server lease add mac-address=AA:BB:CC:DD:EE:FF \
  address=10.0.30.50 server=dhcp-sales comment="Approved device"
```

### 12. VLAN Documentation Script

Auto-generate VLAN map:

```routeros
:put "=== VLAN Configuration Report ==="
:foreach vlan in=[/interface vlan find] do={
  :local vlanname [/interface vlan get $vlan name]
  :local vlanid [/interface vlan get $vlan vlan-id]
  :local vlanip [/ip address get [find interface=$vlanname] address]
  :put ("VLAN " . $vlanid . " - " . $vlanname . " - IP: " . $vlanip)
}

:put "\n=== Bridge Port Assignments ==="
:foreach port in=[/interface bridge port find] do={
  :local iface [/interface bridge port get $port interface]
  :local pvid [/interface bridge port get $port pvid]
  :put ("Port: " . $iface . " - PVID: " . $pvid)
}
```

---

## Related Guides

- [Understanding Subnets](./understanding-subnets) - IP addressing and subnet planning
- [OSPF Point-to-Point](../Mikrotik/Routing/ospf-ptp) - Dynamic routing between VLANs
- [Guest Bandwidth DHCP](../Mikrotik/Bandwidth/guest-bandwidth-dhcp-on-up) - Per-VLAN QoS
- [Enforce DNS 8.8.8.8](../Mikrotik/Security/enforce-dns-8.8.8.8) - DNS redirection per VLAN
- [Block Tethering via TTL](../Mikrotik/Security/block-tethering-ttl) - VLAN-specific security rules

---

🎉 **You now understand VLAN configuration, trunking, inter-VLAN routing, and advanced isolation techniques!** Use VLANs to logically segment networks, improve security, and optimize performance without physical network redesign.
