---
sidebar_position: 1
---

# 🌐 GPON Configuration

Configure VLANs on GPON (Gigabit Passive Optical Network) OLT to manage multi-service delivery including DHCP, PPPoE, hotspot, and customer-specific VLANs. This guide covers VLAN creation, uplink port configuration, GPON interface setup, and ONU line/service profile creation for carrier-grade fiber networks.

:::info Key Concepts
- **GPON** - Gigabit Passive Optical Network with passive optical splitters (1:64 to 1:128 split ratio)
- **OLT** - Optical Line Terminal (headend OLT_003_4PON)
- **ONU** - Optical Network Unit (customer premise equipment)
- **VLAN Transparent** - ONU VLAN tags passed through to OLT unmodified
- **VLAN Translation** - ONU VLAN mapped to OLT customer VLAN
- **Tcont** - Traffic Container for bandwidth allocation on PON port
- **Gemport** - GEM Port for service mapping (supports multiple tcont)
- **DBA Profile** - Dynamic Bandwidth Allocation (assured + maximum rates)
:::

---

## Prerequisites

Before configuring GPON VLANs, ensure you have:

- ✅ GPON OLT (4+ PON ports) with console/SSH access
- ✅ Network VLAN plan (management, DHCP, PPPoE, customer ranges)
- ✅ Uplink connectivity to MikroTik/core router (Gig 0/3-0/4)
- ✅ ONU devices discovered and ready for provisioning
- ✅ Backup of current OLT configuration
- ✅ GPON splitter topology and split ratio documented (1:64 or 1:128)
- ✅ Understanding of DBA profiles and traffic classes

---

:::warning Important Considerations
- **VLAN 500 Management:** Reserved for OLT management and should not be used for customer traffic
- **Native VLAN 1:** Default untagged VLAN; set PVID on hybrid ports correctly
- **Transparent Mode:** Enables per-customer VLAN flexibility; ONU config must match OLT
- **ONU Auto-Learn:** Automatically provisions ONUs matching specified line/service profiles; verify profiles before enabling
- **Storm Control:** Set broadcast limits (512 fps) to prevent network loops and DDoS
- **Uplink Saturation:** Monitor Gig 0/3-0/4; aggregate traffic from 4 PON ports (up to 40 Gbps shared)
- **DBA Profiles:** Default profile (ID 511) uses assured 1 Mbps + max 1 Gbps; adjust for SLA requirements
:::

---

## Understanding GPON Architecture

### Network Topology

```
                           [Internet Core]
                                  │
                                  │ (Gig 0/1-0/2 trunk)
                                  │
                    ┌─────────────────────────┐
                    │  GPON OLT_003_4PON      │
                    │  (4 PON ports)          │
                    │  Management: 192.168.9.2│
                    └──────┬──────────────────┘
                    │      │      │      │
        ┌───────────┤      │      ├───────────┐
        │           │      │      │           │
      GPON 0/1    GPON 0/2 GPON 0/3 GPON 0/4
        │           │      │      │
    [Split 1:64] [Split 1:64] [Split 1:64] [Split 1:64]
        │           │      │      │
    ┌──┴──┐      ┌──┴──┐  ┌──┴──┐  ┌──┴──┐
   ONU1-64    ONU65-128 ONU129-192 ONU193-256
    │           │      │      │
   [Customers] [Customers] [Customers] [Customers]
   VLAN 100-200 VLAN 100-200 VLAN 100-200 VLAN 100-200
```

### VLAN Design

| VLAN ID | Name | Service Type | Port Assignment | Customers | Notes |
|---------|------|--------------|-----------------|-----------|-------|
| 1 | Native | Untagged default | Gig 0/1-0/4 | N/A | PVID for all hybrid ports |
| 500 | Management | OLT management (192.168.9.2/24) | Gig 0/3-0/4, Aux | N/A | Do not use for customer traffic |
| 100-200 | Customer VLANs | Per-customer or shared pools | GPON 0/1-0/4 | 101 VLANs | Transparent to ONU configuration |

### Port Configuration

| Interface | Type | Mode | Primary Use | VLAN Tags |
|-----------|------|------|-------------|-----------|
| Gig 0/1 | Gigabit Ethernet | Hybrid | Upstream ISP | 500 (tagged), 1 (PVID) |
| Gig 0/2 | Gigabit Ethernet | Hybrid | Upstream Core | 500 (tagged), 1 (PVID) |
| GPON 0/1-0/4 | PON Port | Trunk | ONU connections | 500, 100-200 (all tagged) |

---

## Configuration

### Step 1: Create VLANs

```bash
# Access OLT via SSH
ssh admin@192.168.9.2

# Enter enable mode (if required)
enable

# Configure VLANs
configure terminal

# Management VLAN 500
vlan 500
description management_500
exit

# Customer VLAN range (100-200)
vlan 100 to 200
exit

# Exit to apply
exit
```

### Step 2: Configure Uplink Gigabit Ports

```bash
configure terminal

# Gig 0/1 - Primary Uplink (ISP)
interface gigabitethernet 0/1
switchport mode hybrid
switchport hybrid vlan 1 untagged
switchport hybrid vlan 500 tagged
switchport hybrid vlan 100 - 200 tagged
switchport hybrid pvid vlan 1
no shutdown
mdi force
storm-control broadcast fps 512
no storm-control multicast
storm-control unknow fps 512
no switchport isolate
no ip igmp snooping immediate-leave
exit

# Gig 0/2 - Upstream Core
interface gigabitethernet 0/2
switchport mode hybrid
switchport hybrid vlan 1 untagged
switchport hybrid vlan 500 tagged
switchport hybrid vlan 100 - 200 tagged
switchport hybrid pvid vlan 1
no shutdown
mdi force
storm-control broadcast fps 512
no storm-control multicast
storm-control unknow fps 512
no switchport isolate
no ip igmp snooping immediate-leave
exit

exit
```

### Step 3: Configure GPON PON Ports

```bash
configure terminal

# GPON PON 0/1
interface gpon 0/1
no shutdown
mdi force
storm-control broadcast fps 512
no storm-control multicast
storm-control unknow fps 512
switchport isolate
no p2p
no ip igmp snooping immediate-leave
exit

# GPON PON 0/2
interface gpon 0/2
no shutdown
mdi force
storm-control broadcast fps 512
no storm-control multicast
storm-control unknow fps 512
switchport isolate
no p2p
no ip igmp snooping immediate-leave
exit

# GPON PON 0/3
interface gpon 0/3
no shutdown
mdi force
storm-control broadcast fps 512
no storm-control multicast
storm-control unknow fps 512
switchport isolate
no p2p
no ip igmp snooping immediate-leave
exit

# GPON PON 0/4
interface gpon 0/4
no shutdown
mdi force
storm-control broadcast fps 512
no storm-control multicast
storm-control unknow fps 512
switchport isolate
no p2p
no ip igmp snooping immediate-leave
exit

exit
```

### Step 4: Create DBA Profiles (Bandwidth Allocation)

```bash
configure terminal

# DBA Profile 1: 1Gbps maximum (high-speed customers)
profile dba id 1 name 1024000
type 4 maximum 1024000
exit

# DBA Profile 511 (Default): 1Mbps assured, 1Gbps maximum (standard customers)
profile dba id 511 name default1
type 3 assured 1024 maximum 1024000
exit

exit
```

### Step 5: Create Service Profiles

```bash
configure terminal

# Service Profile 1: Main (transparent mode)
profile srv id 1 name main
portvlan veip 1 mode transparent
commit
exit

exit
```

### Step 6: Create Line Profiles (ONU Service Configuration)

```bash
configure terminal

# Line Profile 1: Basic single VLAN
profile line id 1 name main
  tcont 1 name 1 dba 1024000
    gemport 1 tcont 1 gemport_name 1
      service INTERNET gemport 1 vlan 1
      service-port 1 gemport 1 uservlan 1 vlan 1
commit
exit

# Line Profile 2: Multi-GEM port (VLAN 100-110)
profile line id 3 name vlan_100_110
  tcont 1 name 1 dba 1024000
    gemport 1 tcont 1 gemport_name 1
      service INTERNET gemport 1 vlan 1
      service-port 1 gemport 1 uservlan 1 vlan 1
    gemport 2 tcont 1 gemport_name 2
      service ser_2 gemport 2 vlan 100-110
      service-port 2 gemport 2 uservlan 100 to 110 transparent
commit
exit

# Line Profile 4: Multi-GEM port (VLAN 111-120)
profile line id 4 name vlan_111_120
  tcont 1 name 1 dba 1024000
    gemport 1 tcont 1 gemport_name 1
      service INTERNET gemport 1 vlan 1
      service-port 1 gemport 1 uservlan 1 vlan 1
    gemport 2 tcont 1 gemport_name 2
      service ser_2 gemport 2 vlan 111-120
      service-port 2 gemport 2 uservlan 111 to 120 transparent
commit
exit

# Line Profile 5: Multi-GEM port (VLAN 121-200)
profile line id 5 name vlan_121_200
  tcont 1 name 1 dba 1024000
    gemport 1 tcont 1 gemport_name 1
      service INTERNET gemport 1 vlan 1
      service-port 1 gemport 1 uservlan 1 vlan 1
    gemport 2 tcont 1 gemport_name 2
      service ser_2 gemport 2 vlan 121-200
      service-port 2 gemport 2 uservlan 121 to 200 transparent
commit
exit

exit
```

### Step 7: Enable ONU Auto-Learn on GPON Ports

```bash
configure terminal

# GPON 0/1 - Enable auto-learn with profiles
interface gpon 0/1
onu auto-learn
onu auto-learn line-profile name vlan
onu auto-learn srv-profile name main
exit

# GPON 0/2
interface gpon 0/2
onu auto-learn
onu auto-learn line-profile name vlan
onu auto-learn srv-profile name main
exit

# GPON 0/3
interface gpon 0/3
onu auto-learn
onu auto-learn line-profile name vlan
onu auto-learn srv-profile name main
exit

# GPON 0/4
interface gpon 0/4
onu auto-learn
onu auto-learn line-profile name vlan
onu auto-learn srv-profile name main
exit

exit
```

### Step 9: Configure OLT Management

```bash
configure terminal

# OLT hostname
hostname OLT_003_4PON

# Management VLAN interface
interface vlan 500
ip address 192.168.9.2/24
exit

# Remote access control
login-access-list permit telnet 192.168.9.1 255.255.255.0
login-access-list permit web 192.168.9.0 255.255.255.0
login-access-list permit ssh 192.168.9.1 255.255.255.0
login-access-list deny snmp 0.0.0.0 0.0.0.0
login-access-list enable

# DNS
ip dns 8.8.8.8 1.1.1.1

# Time zone
time zone 08:00

# DHCP relay
dhcp-relay information option disable
dhcp-relay information strategy keep

# SNMP monitoring
snmp-server start
snmp-server community public ro
snmp-server community private rw

# System logging
alarm oamlog critical-event enable
alarm oamlog dying-gasp enable
alarm oamlog link-fault enable
alarm oamlog link-event disable
alarm oamlog organization-specific enable

# NTP synchronization
ntp server 203.177.21.122 52.148.114.188

# Spanning tree
spanning-tree on
queue-scheduler strict-priority

# Loopback detection
loopback detect enable
loopback mode auto-recovery

exit
```

---

## Understanding GPON Components

### DBA Profiles (Bandwidth Management)

| DBA ID | Name | Type | Assured | Maximum | Use Case |
|--------|------|------|---------|---------|----------|
| 1 | 1024000 | 4 | N/A | 1 Gbps | High-speed/premium customers |
| 511 | default1 | 3 | 1 Mbps | 1 Gbps | Standard residential customers |

**DBA Type Explanation:**
- **Type 3 (Assured):** Minimum guaranteed + burst bandwidth (best for shared pools)
- **Type 4 (Maximum):** Maximum limit only; no minimum (best for fixed rates)

### Service Port Mapping (Transparent Mode)

| Service-Port | Tcont | Gemport | ONU VLAN Input | OLT VLAN Output | Purpose |
|--------------|-------|---------|----------------|-----------------|---------|
| 1 | 1 | 1 | 1 | 1 | Default/untagged traffic |
| 1 | 1 | 1-11 | 100-200 | 100-200 | Per-customer VLAN passthrough |
| 2-11 | 1 | 2-11 | 100-110, 110-120, etc. | 100-110, 110-120, etc. | Segmented service pools |

### ONU Auto-Learn Process

```
ONU Registration → Match Profile → Apply Line Profile → Apply Service Profile → Active
     ↓                 ↓                    ↓                      ↓              ↓
Plug in ONU     Check exact match   Configure tcont/        Configure VLAN   Customer
                with ONU profile    gemport/service-port    mapping/ports     online
```

---

## Verification

### Step 1: Verify VLAN Configuration

```bash
# Show all VLANs
show vlan

# Expected output should list VLAN 1, 500, 100-200

# Show specific VLAN
show vlan 500

# Verify VLAN 500 management interface
show interface vlan 500

# Expected: IP 192.168.9.2/24 active
```

### Step 2: Verify GPON Port Status

```bash
# Show all GPON port status
show interface gpon brief

# Expected output:
# GPON 0/1                                     up    up
# GPON 0/2                                     up    up
# GPON 0/3                                     up    up
# GPON 0/4                                     up    up

# Show detailed GPON 0/1 info
show interface gpon 0/1

# Verify auto-learn enabled
show run interface gpon 0/1 | include auto-learn
```

### Step 3: Verify ONU Status

```bash
# Show discovered ONUs on all PON ports
show onu

# Expected columns:
# Interface | ONU-ID | SN | Status | Distance(m) | Power(dBm) | Line-Profile | Srv-Profile

# Show specific ONU details
show onu detail interface gpon 0/1 id 1

# Verify Line Profile applied
show onu profile interface gpon 0/1 id 1 line-profile

# Verify Service Profile applied
show onu profile interface gpon 0/1 id 1 srv-profile
```

### Step 4: Verify Port Configuration

```bash
# Show Gigabit port VLAN assignments
show interface gigabitethernet 0/1 switchport

# Expected output should show:
# switchport mode: hybrid
# native vlan: 1
# tagged vlans: 500, 100-200

# Show trunk port status
show interface gigabitethernet 0/1 | include vlan

# Show storm control settings
show interface gigabitethernet 0/1 | include storm
```

### Step 5: Verify Uplink Connectivity

```bash
# Ping core router (assuming 192.168.9.1)
ping 192.168.9.1

# Expected: replies received (should be 100% success)

# Verify routing to customer VLANs
show ip route

# Verify DHCP relay configuration
show run | include dhcp-relay

# Test VLAN 500 connectivity
ping -c 4 -I vlan500 192.168.9.1
```

### Step 6: Verify SNMP Monitoring

```bash
# Show SNMP configuration
show run | include snmp

# Test SNMP from monitoring system
snmpwalk -v2c -c public 192.168.9.2 1.3.6.1.2.1.1.1.0

# Expected: System description returned
```

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| ONU not registering on PON port | PON port down or auto-learn disabled | Verify `show interface gpon 0/1` shows "up"; enable `onu auto-learn` on interface |
| VLAN traffic not reaching customer | Service port VLAN mapping incorrect | Verify service-port VLAN mapping matches customer VLAN; use `show onu profile` |
| All ONUs on PON port fail | ONU profile missing or corrupt | Create ONU profile with `profile onu id 1 name main`; verify with `show profile onu` |
| Management VLAN 500 unreachable | Interface vlan 500 not configured | Configure `interface vlan 500 ip address 192.168.9.2/24`; verify with `show interface vlan 500` |
| ONUs report errors after boot | Line profile DBA rate too low | Increase DBA profile maximum from 1024000 to higher rate; verify with `show profile dba id 1` |
| GPON 0/1-0/4 show many retransmissions | Storm control broadcast limit hit | Increase storm control fps: `storm-control broadcast fps 1024` |
| OLT reports "distant/high loss ONUs" | Poor signal quality or cable fault | Check fiber cable for damage; verify splitter connections; measure optical power |
| ONU provisioning hangs at "Configuring" state | Service profile not committed | Commit service profile: `profile srv id 1 ... commit exit` |
| Customer cannot ping past OLT | Spanning tree blocking VLAN | Disable loop detection: `spanning-tree on` then check `show spanning-tree` output |
| VLAN 500 DNS not resolving | DNS not configured on OLT | Add DNS: `ip dns 8.8.8.8 1.1.1.1`; test with `ping 8.8.8.8 -c 4 -I vlan500` |
| GPON port shows "down/down" after configuration | Port not activated | Execute `no shutdown` on GPON interface; verify with `show interface gpon 0/1 status` |
| Duplicate ONU SN detected | ONU auto-learn enabled with non-unique profiles | Verify ONU profiles are assigned correctly; check for duplicate ONUs on different PON ports |
| Performance degrades with all PON ports active | Uplink saturation (Gig 0/3-0/4) | Implement QoS on uplink ports; enable DHCP Option 82 for rate limiting; consider link aggregation |

---

## Advanced Options

### Option 1: Enable Link Aggregation (LACP) on Uplink

For redundant uplink and load balancing, aggregate Gig 0/1-0/2:

```bash
configure terminal

# Create port channel 1
interface port-channel 1
switchport mode trunk
switchport trunk allowed vlan 1,500,100-200
switchport trunk native vlan 1
exit

# Assign Gig 0/1 to channel group
interface gigabitethernet 0/1
channel-group 1 mode active
switchport mode trunk
switchport trunk allowed vlan 1,500,100-200
exit

# Assign Gig 0/2 to channel group
interface gigabitethernet 0/2
channel-group 1 mode active
switchport mode trunk
switchport trunk allowed vlan 1,500,100-200
exit

exit
```

**Verification:**
```bash
show interface port-channel 1
show interface port-channel 1 status
show etherchannel summary
```

### Option 2: Create Per-Customer VLAN with Rate Limiting

For individual customer isolation with guaranteed bandwidth:

```bash
configure terminal

# Create customer-specific line profile with rate limiting
profile dba id 100 name customer_1
type 3 assured 512 maximum 100000
exit

# Create line profile for customer
profile line id 100 name customer_vlan
  tcont 1 name 1 dba 100
    gemport 1 tcont 1 gemport_name 1
      service customer_1 gemport 1 vlan 1050
      service-port 1 gemport 1 uservlan 1050 vlan 1050
commit
exit

# Assign customer to PON port
interface gpon 0/1
onu 1 line-profile name customer_vlan
onu 1 srv-profile name main
exit

exit
```

### Option 3: VLAN Translation (ONU to OLT Mapping)

Map ONU VLAN to different OLT VLAN (e.g., ONU VLAN 10 → OLT VLAN 150):

```bash
configure terminal

profile line id 4 name vlan_translate
  tcont 1 name 1 dba 1024000
    gemport 1 tcont 1 gemport_name 1
      service INTERNET gemport 1 vlan 150
      service-port 1 gemport 1 uservlan 10 vlan 150
commit
exit

exit
```

### Option 4: Enable SNOOPING for Multicast/IPTV

Configure IGMP snooping to prevent multicast flooding:

```bash
configure terminal

# Enable IGMP snooping on GPON ports
interface gpon 0/1
ip igmp snooping enable
ip igmp snooping immediate-leave
exit

interface gpon 0/2
ip igmp snooping enable
ip igmp snooping immediate-leave
exit

exit
```

### Option 5: Configure Split Ratio Monitoring

Monitor optical power and distance to detect ONU issues:

```bash
# Show optical power levels
show onu optical-power gpon 0/1

# Show ONU distance from splitter
show onu distance gpon 0/1

# Expected distances: 5-20 km depending on splitter architecture
```

### Option 6: Create DBA Profile for Symmetric Traffic

For business customers requiring 50/50 upload/download:

```bash
configure terminal

profile dba id 200 name business_symmetric
type 3 assured 5120 maximum 10240
exit

# Apply to line profile
profile line id 200 name business
  tcont 1 name 1 dba 200
    gemport 1 tcont 1 gemport_name 1
      service BUSINESS gemport 1 vlan 1100
      service-port 1 gemport 1 uservlan 1100 vlan 1100
commit
exit

exit
```

### Option 7: Implement VLAN-based Guest Network

Create separate VLAN for hotspot/guest access without affecting customer VLANs:

```bash
configure terminal

vlan 2000
description guest_hotspot
exit

profile line id 50 name guest
  tcont 1 name 1 dba 511
    gemport 1 tcont 1 gemport_name 1
      service GUEST gemport 1 vlan 2000
      service-port 1 gemport 1 uservlan 2000 vlan 2000
commit
exit

exit
```

**Then configure on MikroTik:**
```routeros
/ip address add address=192.168.50.1/24 interface=VLAN2000
/ip dhcp-server add address-pool=guest_pool interface=VLAN2000 name=guest_dhcp
/ip firewall filter add action=drop chain=forward src-address=192.168.50.0/24 dst-address=192.168.1.0/24 disabled=no
```

### Option 8: Configure Redundant NTP Servers

Ensure accurate time synchronization for billing/logging:

```bash
configure terminal

# Primary and secondary NTP servers
ntp server 203.177.21.122
ntp server 52.148.114.188
ntp server 91.189.92.4

# Set time zone
time zone +08:00

exit
```

### Option 9: Enable OLT-to-MikroTik SNMP Monitoring

Monitor OLT health from MikroTik:

```bash
configure terminal

# SNMP trap target
snmp-server notify notify trap 192.168.9.1

# Enable SNMP logging
alarm oamlog critical-event enable
alarm oamlog dying-gasp enable
alarm oamlog link-fault enable

exit
```

**Configure on MikroTik:**
```routeros
/snmp community add addresses=192.168.9.0/24 name=public read-access=yes write-access=no
```

### Option 10: Create Backup OLT Configuration Export

Regular backups prevent data loss:

```bash
# Export configuration to text file
show run > /tftp/192.168.9.1/olt-backup-$(date +%Y%m%d).txt

# Export system information
show system > /tftp/192.168.9.1/system-info.txt

# Export all ONU details
show onu > /tftp/192.168.9.1/onu-list.txt
```

### Option 11: Implement RADIUS Authentication for Customer Support

Integrate with RADIUS for centralized user management:

```bash
configure terminal

# RADIUS server configuration
radius-server host 192.168.9.50 key MyRadiusSecret

# Enable RADIUS for remote access
aaa authentication login default radius local
aaa authorization login default radius local

exit
```

### Option 12: Enable Syslog for Centralized Logging

Forward OLT logs to syslog server for monitoring:

```bash
configure terminal

# Syslog server configuration
logging host 192.168.9.100 514
logging facility local0
logging trap informational

# Enable critical events logging
alarm oamlog critical-event enable
alarm oamlog organization-specific enable

exit
```

---

## Integration with MikroTik Router

Once GPON ONUs are provisioned with VLAN 100-200 on OLT, configure MikroTik to route customer traffic:

```routeros
# Create VLAN interfaces for each customer range
/interface vlan
add interface=ether1 name=VLAN100 vlan-id=100
add interface=ether1 name=VLAN101 vlan-id=101
add interface=ether1 name=VLAN150 vlan-id=150
add interface=ether1 name=VLAN200 vlan-id=200

# Add IP addresses
/ip address
add address=192.168.100.1/24 interface=VLAN100
add address=192.168.101.1/24 interface=VLAN101
add address=192.168.150.1/24 interface=VLAN150
add address=192.168.200.1/24 interface=VLAN200

# Add DHCP pools
/ip pool
add name=pool_100 ranges=192.168.100.50-192.168.100.254
add name=pool_101 ranges=192.168.101.50-192.168.101.254

# Add DHCP servers
/ip dhcp-server
add address-pool=pool_100 interface=VLAN100 name=dhcp_100 disabled=no
add address-pool=pool_101 interface=VLAN101 name=dhcp_101 disabled=no

# Add DHCP networks
/ip dhcp-server network
add address=192.168.100.0/24 gateway=192.168.100.1 dns-server=8.8.8.8
add address=192.168.101.0/24 gateway=192.168.101.1 dns-server=8.8.8.8

# Add firewall NAT
/ip firewall nat
add action=masquerade chain=srcnat out-interface=ether1 src-address=192.168.100.0/24
add action=masquerade chain=srcnat out-interface=ether1 src-address=192.168.101.0/24
```

---

## Related Guides

- [VLAN Configuration Fundamentals](../../Network/vlan-configuration) - Essential networking concepts for OLT VLAN setup
- [Routing Fundamentals](../../Network/routing-fundamentals) - Understand static/dynamic routing for inter-VLAN customer traffic
- [RADIUS Server Integration](../../Mikrotik/ISP/radius-server-integration) - PPPoE authentication for customer management
- [Port Forwarding](../../Mikrotik/Security/port-forwarding) - Expose services to specific customers behind OLT
- [EPON VLAN Configuration](./epon-vlan-configuration) - Compare GPON to EPON architecture differences

---

**Configuration Complete!** ✅ Your 4-port GPON OLT is now ready to provision ONUs with multi-VLAN support for DHCP, PPPoE, hotspot, and per-customer services. Monitor optical power and ONU registration regularly to maintain network quality.
