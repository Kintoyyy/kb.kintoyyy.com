---
sidebar_position: 2
---

# 🔧 BDCOM Configuration

Configure VLANs on BDCOM GPON OLT to manage multi-service delivery including PPPoE, hotspot, and customer-specific traffic. This guide covers ONU type templates, VLAN creation, flow mapping, and uplink port configuration for carrier-grade GPON networks.

:::info Key Concepts
- **GPON** - Gigabit Passive Optical Network with passive splitters
- **ONU Type Template** - Profile matching specific ONU models (HGU, SFU, etc.)
- **Flow Mapping** - Maps UNI ports to virtual ports and VLANs
- **Tcont** - Traffic Container for bandwidth allocation
- **Virtual Port** - Logical port on ONU for service mapping
- **Dot1q-tunnel** - Provider VLAN mode for uplinks
:::

---

## Prerequisites

Before configuring BDCOM OLT, ensure you have:

- ✅ BDCOM GPON OLT (GP3600-04L or similar) with SSH access
- ✅ Management IP configured (e.g., 192.168.0.1)
- ✅ VLAN plan documented (VLAN 40, 100-200)
- ✅ Uplink connectivity to MikroTik/core router
- ✅ ONU models identified (HGU, SFU, ZTE, etc.)
- ✅ Backup of current configuration

---

:::warning Important Considerations
- **ONU Type Precedence:** Lower precedence values are matched first (ZTE = 126, HGU = 127, default = 128)
- **Flow Mapping:** Entry 1 is required; additional entries support multi-VLAN per UNI
- **Tcont Type 3:** For guaranteed + burst bandwidth (assured + peak rate)
- **Storm Control:** Set low thresholds (5 fps) to prevent network flooding
- **Dot1q-tunnel:** Allows Q-in-Q VLAN stacking for ISP aggregation
:::

---

## Understanding BDCOM Architecture

### Network Topology

```
[Internet] ──── [MikroTik Router] ──── [BDCOM GPON OLT] ──── [ONUs] ──── [Customers]
                      │                  (GP3600-04L)        │
                      │                      │                └─ VLAN 40: PPPoE
                      │                  Gig 0/1-0/4         └─ VLAN 100-200: Customers
                      │                  GPON 0/1-0/4        └─ VLAN 200: Hotspot
```

### VLAN Design

| VLAN ID | Name | Purpose | Uplink Port | ONU Type |
|---------|------|---------|-------------|----------|
| 1 | Native | Management | Gig 0/0 | Management only |
| 10 | ISP-Mgmt | ISP management | Gig 0/1-0/4 | All ONUs |
| 40 | PPPoE | PPPoE subscribers | TGig 0/1-0/2 | HGU/SFU |
| 100-200 | Customer | Per-customer VLANs | TGig 0/1-0/2 | HGU/SFU |
| 200 | Hotspot | Guest access | TGig 0/3-0/4 | All ONUs |

### Port Configuration

| Interface | Type | Mode | Purpose | Storm Control |
|-----------|------|------|---------|---------------|
| Gig 0/0 | Management | IP interface | OLT management (192.168.0.1/24) | N/A |
| Gig 0/1-0/4 | Uplink | dot1q-tunnel | Provider VLAN uplinks | 5 fps |
| TGig 0/1-0/2 | Uplink | dot1q-tunnel | 10G uplink (PPPoE + Customer) | 5 fps |
| TGig 0/3-0/4 | Uplink | dot1q-tunnel | 10G uplink (Hotspot) | 5 fps |
| GPON 0/1-0/4 | PON | GPON | ONU connections | 5 fps |

---

## Configuration

### Step 1: Create ONU Type Templates

```bash
# HGU (4-port Ethernet) template for main subscribers
gpon onutype-template onutype-default-hgu
 gpon-onutype match ctc-onu-type HGU
 gpon-onutype config tcont-virtual-port-bind-profile tvbind-default
 gpon-onutype config flow-mapping-profile flow-mapping-default-hgu
exit

# Generic default template for fallback
gpon onutype-template onutype-default
 gpon-onutype config tcont-virtual-port-bind-profile tvbind-default
 gpon-onutype config flow-mapping-profile flow-mapping-default
exit

# ZTE-specific template (F670LV10P.0 model)
gpon onutype-template zte
 gpon-onutype match vendorid ZTEG modelid F670LV10P.0
 gpon-onutype match ctc-onu-type HGU
 gpon-onutype config tcont-virtual-port-bind-profile tvbind-default
 gpon-onutype config flow-mapping-profile test_vlan99
exit
```

### Step 2: Create GPON Profiles (Bandwidth & Virtual Ports)

```bash
# Tcont Profile: 512 Kbps assured, 1 Gbps peak
gpon profile onu-tcont tcont-default id 1
 gpon-profile tcont-type 3 pir 1024000 cir 512
exit

# Virtual Port: 8 upstream/downstream queues
gpon profile onu-virtual-port virtual-port-default id 1
 gpon-profile encryption disable
 gpon-profile upstream queue 8
 gpon-profile downstream queue 8
exit

# Bind Tcont + Virtual Port
gpon profile onu-tcont-virtual-port-bind tvbind-default id 1
 gpon-profile virtual-port 1 profile virtual-port-default tcont 1 profile tcont-default
exit

# Rate Limit: 1.2 Gbps PIR/CIR
gpon profile onu-rate-limit ratelimit-default id 1
 gpon-profile pir 1244160 cir 1244160
exit
```

### Step 3: Create Flow Mapping Profiles (VLAN Mapping)

```bash
# Default: All Ethernet UNIs to virtual port 1 (untagged)
gpon profile onu-flow-mapping flow-mapping-default id 1
 gpon-profile entry 1 uni type eth-uni all
 gpon-profile entry 1 virtual-port 1
exit

# HGU: VEIP (Virtual Ethernet Interface Port) untagged
gpon profile onu-flow-mapping flow-mapping-default-hgu id 2
 gpon-profile entry 1 uni type veip all
 gpon-profile entry 1 virtual-port 1
exit

# VLAN 99 transparent mapping
gpon profile onu-flow-mapping flow-mapping-vlan99 id 3
 gpon-profile entry 1 uni type eth-uni all
 gpon-profile entry 1 vlan 99
 gpon-profile entry 1 virtual-port 1
exit

# VLAN trunk (10-20): Multiple VLANs transparent
gpon profile onu-flow-mapping flow-mapping-trunk id 4
 gpon-profile entry 1 uni type eth-uni all
 gpon-profile entry 1 vlan 10-20
 gpon-profile entry 1 virtual-port 1
exit

# VLAN 40 (PPPoE): Single VLAN transparent
gpon profile onu-flow-mapping flow-mapping-pppoe id 5
 gpon-profile entry 1 uni type eth-uni all
 gpon-profile entry 1 vlan 40
 gpon-profile entry 1 virtual-port 1
exit

# VLAN 100-200 (Customer): VLAN range transparent
gpon profile onu-flow-mapping flow-mapping-customer id 6
 gpon-profile entry 1 uni type eth-uni all
 gpon-profile entry 1 vlan 100-200
 gpon-profile entry 1 virtual-port 1
exit

# VLAN 200 (Hotspot): Single VLAN transparent
gpon profile onu-flow-mapping flow-mapping-hotspot id 7
 gpon-profile entry 1 uni type eth-uni all
 gpon-profile entry 1 vlan 200
 gpon-profile entry 1 virtual-port 1
exit
```

### Step 4: Create VLANs

```bash
configure terminal

# Create VLAN range
vlan 1,10-100

exit
```

### Step 5: Configure Gigabit Uplink Ports (Dot1q-tunnel)

```bash
configure terminal

# Gig 0/1 - Primary uplink
interface GigaEthernet0/1
 switchport mode dot1q-tunnel-uplink
 storm-control broadcast threshold 5
 storm-control multicast threshold 5
 storm-control unicast threshold 5
exit

# Gig 0/2 - Secondary uplink
interface GigaEthernet0/2
 switchport mode dot1q-tunnel-uplink
 storm-control broadcast threshold 5
 storm-control multicast threshold 5
 storm-control unicast threshold 5
exit

# Gig 0/3 - Tertiary uplink
interface GigaEthernet0/3
 switchport mode dot1q-tunnel-uplink
 storm-control broadcast threshold 5
 storm-control multicast threshold 5
 storm-control unicast threshold 5
exit

# Gig 0/4 - Quaternary uplink
interface GigaEthernet0/4
 switchport mode dot1q-tunnel-uplink
 storm-control broadcast threshold 5
 storm-control multicast threshold 5
 storm-control unicast threshold 5
exit

exit
```

### Step 6: Configure 10G Uplink Ports (Dot1q-tunnel)

```bash
configure terminal

# TGig 0/1 - 10G uplink (PPPoE + Customers)
interface TGigaEthernet0/1
 switchport mode dot1q-tunnel-uplink
 storm-control broadcast threshold 5
 storm-control multicast threshold 5
 storm-control unicast threshold 5
exit

# TGig 0/2 - 10G uplink redundancy
interface TGigaEthernet0/2
 switchport mode dot1q-tunnel-uplink
 storm-control broadcast threshold 5
 storm-control multicast threshold 5
 storm-control unicast threshold 5
exit

# TGig 0/3 - 10G uplink (Hotspot)
interface TGigaEthernet0/3
 switchport mode dot1q-tunnel-uplink
 storm-control broadcast threshold 5
 storm-control multicast threshold 5
 storm-control unicast threshold 5
exit

# TGig 0/4 - 10G uplink redundancy
interface TGigaEthernet0/4
 switchport mode dot1q-tunnel-uplink
 storm-control broadcast threshold 5
 storm-control multicast threshold 5
 storm-control unicast threshold 5
exit

exit
```

### Step 7: Configure GPON Ports with ONU Type Binding

```bash
configure terminal

# GPON 0/1 - HGU/Default ONUs
interface GPON0/1
 gpon bind-onutype onutype-default-hgu precedence 127
 gpon bind-onutype onutype-default precedence 128
 switchport protected 1
 storm-control broadcast threshold 5
 storm-control multicast threshold 5
 storm-control unicast threshold 5
exit

# GPON 0/2 - ZTE preferred, with auto-fallback
interface GPON0/2
 gpon bind-onutype zte precedence 126
 gpon bind-onutype onutype-default-hgu precedence 127
 gpon bind-onutype onutype-default precedence 128
 switchport protected 1
 storm-control broadcast threshold 5
 storm-control multicast threshold 5
 storm-control unicast threshold 5
exit

# GPON 0/3 - HGU/Default ONUs
interface GPON0/3
 gpon bind-onutype onutype-default-hgu precedence 127
 gpon bind-onutype onutype-default precedence 128
 switchport protected 1
 storm-control broadcast threshold 5
 storm-control multicast threshold 5
 storm-control unicast threshold 5
exit

# GPON 0/4 - HGU/Default ONUs
interface GPON0/4
 gpon bind-onutype onutype-default-hgu precedence 127
 gpon bind-onutype onutype-default precedence 128
 switchport protected 1
 storm-control broadcast threshold 5
 storm-control multicast threshold 5
 storm-control unicast threshold 5
exit

exit
```

### Step 8: Configure Management

```bash
configure terminal

# Management IP (Gig 0/0)
interface GigaEthernet0/0
 ip address 192.168.0.1 255.255.255.0
exit

# Admin user
username admin password 0 admin

# SNMP community
snmp-server community 0 nmscloud RW

exit
```

---

## Understanding BDCOM Concepts

### ONU Type Matching Precedence

| Precedence | Type | Example | Priority |
|------------|------|---------|----------|
| 126 | Vendor-specific | ZTE F670LV10P.0 | Highest (matched first) |
| 127 | HGU (4-port) | Generic HGU models | Medium |
| 128 | Default fallback | Any ONU type | Lowest (last resort) |

**Lower precedence = higher priority for matching**

### Flow Mapping Entry Structure

```
gpon profile onu-flow-mapping <profile-name> id <id>
 gpon-profile entry 1 uni type <eth-uni|veip|pots> all
 gpon-profile entry 1 vlan <single|range>
 gpon-profile entry 1 virtual-port <number>
exit
```

- **uni type eth-uni:** Ethernet ports (LAN)
- **uni type veip:** Virtual Ethernet Interface (HGU mode)
- **uni type pots:** Plain Old Telephone Service (VoIP)
- **vlan:** Single (e.g., 40) or range (e.g., 100-200)
- **virtual-port 1:** Bind to virtual-port 1 (must exist in tvbind profile)

### Tcont Types

| Type | Description | CIR | PIR | Use Case |
|------|-------------|-----|-----|----------|
| 1 | Fixed | Max only | Max | Unused |
| 2 | Assured | Guaranteed | Max | Bandwidth guarantee |
| 3 | Non-assured | Assured | Peak | Hybrid (guaranteed + burst) |
| 4 | Best effort | None | Max | No guarantee |

**Type 3 (tcont-type 3):** Most common - guarantees CIR (512 Kbps) with peak PIR (1 Gbps)

---

## Verification

### Step 1: Check ONU Type Templates

```bash
# Show all ONU type templates
show gpon onutype-template

# Show specific template
show gpon onutype-template onutype-default-hgu

# Expected: Template with flow-mapping and tcont bindings
```

### Step 2: Check GPON Profiles

```bash
# Show all GPON profiles
show gpon profile all

# Show flow mapping profile
show gpon profile onu-flow-mapping flow-mapping-default

# Show tcont profile
show gpon profile onu-tcont tcont-default
```

### Step 3: Check ONU Registration

```bash
# List all ONUs
show gpon onu

# Show specific ONU details
show gpon onu GPON0/1:1 detail

# Expected: ONU in online state with correct template applied
```

### Step 4: Check Port Configuration

```bash
# Show interface status
show interface GigaEthernet0/1

# Show GPON port status
show interface GPON0/1

# Check storm control
show interface GigaEthernet0/1 | include storm
```

### Step 5: Check VLAN Database

```bash
# Show all VLANs
show vlan

# Expected: VLAN 1, 10-100 present
```

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| ONU not registering | ONU type template not matching | Verify vendor ID/model in template matches ONU |
| ONU stuck in "O5" state | Flow mapping profile missing | Check flow-mapping-profile is configured in template |
| Customer VLAN not working | VLAN not in flow-mapping entry | Add VLAN to `gpon profile onu-flow-mapping` entry |
| High CPU on OLT | Storm control threshold too high | Lower `threshold 5` or disable on uplinks |
| GPON0/1 flapping | Fiber signal issue | Check optical power: `show gpon onu optical-power GPON0/1:1` |
| ONU loses VLAN tagging | UNI type mismatch (eth-uni vs veip) | Verify correct `uni type` for ONU model in flow-mapping |
| Uplink congestion | Dot1q-tunnel not active | Verify `switchport mode dot1q-tunnel-uplink` on all uplinks |
| ONU gets wrong ONU type | Precedence misconfigured | Lower precedence = higher priority; check `precedence` values |
| Port flapping | Duplex/speed mismatch | Set `speed 1000` or `speed 10000` as needed |

---

## Advanced Configuration Options

### 1. Bind Specific ONU by Serial Number

```bash
configure terminal

interface GPON0/2
 gpon bind-onu sn ZTEG:D1B052C5 1
exit

exit
```

### 2. Create Multi-Entry Flow Mapping (Multiple VLANs per UNI)

```bash
gpon profile onu-flow-mapping flow-mapping-multi-vlan id 8
 # Entry 1: UNI 1 → VLAN 40 (PPPoE)
 gpon-profile entry 1 uni type eth-uni 1
 gpon-profile entry 1 vlan 40
 gpon-profile entry 1 virtual-port 1
 
 # Entry 2: UNI 2-4 → VLAN 100-200 (Customer)
 gpon-profile entry 2 uni type eth-uni 2-4
 gpon-profile entry 2 vlan 100-200
 gpon-profile entry 2 virtual-port 1
exit
```

### 3. Create Multiple Tcont Profiles (Different Bandwidth)

```bash
# High-speed profile: 10 Mbps assured, 1 Gbps peak
gpon profile onu-tcont tcont-premium id 2
 gpon-profile tcont-type 3 pir 1024000 cir 10240
exit

# Standard profile: 512 Kbps assured, 1 Gbps peak
gpon profile onu-tcont tcont-standard id 1
 gpon-profile tcont-type 3 pir 1024000 cir 512
exit
```

### 4. Enable IGMP Snooping for IPTV

```bash
configure terminal

ip igmp snooping

exit
```

### 5. Configure SNMP Traps

```bash
configure terminal

snmp-server trap-server 192.168.0.100
snmp-server trap-version v2c nmscloud

exit
```

### 6. Set LLDP (Link Layer Discovery Protocol)

```bash
configure terminal

lldp run

exit
```

### 7. Enable Spanning Tree

```bash
configure terminal

spanning-tree mode rstp

exit
```

### 8. Create QoS Profile

```bash
gpon profile onu-rate-limit ratelimit-business id 2
 gpon-profile pir 5242880 cir 2097152
exit
```

---

## ONU Provisioning Example

### Complete ONU Setup (GPON0/1)

```bash
configure terminal

# Bind ONU to GPON0/1
interface GPON0/1
 gpon bind-onutype onutype-default-hgu precedence 127
 gpon bind-onutype onutype-default precedence 128
exit

# When ONU registers automatically, verify
show gpon onu GPON0/1:1 detail

# To manually add ONU by serial (if auto-discovery disabled)
interface GPON0/1
 gpon bind-onu sn ZTEG:AABBCCDD 1
exit

exit
```

---

## MikroTik Integration

### Router Configuration for BDCOM VLANs

```routeros
# Create VLAN 40 (PPPoE) interface
/interface vlan add name=vlan40-pppoe vlan-id=40 interface=ether1

# Create VLAN 100-200 customer interfaces
/interface vlan add name=vlan100 vlan-id=100 interface=ether1
/interface vlan add name=vlan200 vlan-id=200 interface=ether1

# Configure PPPoE VLAN
/ip address add address=10.0.40.1/24 interface=vlan40-pppoe
/interface pppoe-server server add service-name=bdcom interface=vlan40-pppoe

# Configure customer VLANs
/ip address add address=10.0.100.1/24 interface=vlan100
/ip address add address=10.0.200.1/24 interface=vlan200

# DHCP for hotspot (VLAN 200)
/ip dhcp-server add name=hotspot200 interface=vlan200 address-pool=pool-hotspot
/ip dhcp-server network add address=10.0.200.0/24 gateway=10.0.200.1 dns-server=8.8.8.8
```

---

## Monitoring and Maintenance

### Daily Health Checks

```bash
# Check ONU status
show gpon onu

# Check OLT system info
show system

# Check port utilization
show interface counters

# Check fiber signal quality
show gpon onu optical-power GPON0/1:all

# Expected: Rx Power between -20 dBm and -10 dBm
```

### Backup Configuration

```bash
configure terminal

# Save running config
write memory

# Or backup to TFTP
copy running-config tftp://192.168.0.100/bdcom-backup.conf

exit
```

---

## Related Guides

- [GPON VLAN Configuration](./VSOL/gpon-vlan-configuration) - Compare GPON OLT architecture
- [EPON VLAN Configuration](./VSOL/epon-vlan-configuration) - EPON alternative to GPON
- [VLAN Fundamentals](../Network/vlan-configuration) - Understanding VLANs and tagging
- [Routing Basics](../Network/routing-fundamentals) - Inter-VLAN routing on MikroTik

---

✅ **BDCOM GPON OLT with VLAN 40 (PPPoE), VLAN 100-200 (Customers), and VLAN 200 (Hotspot) is configured and ready for ONU provisioning!**
