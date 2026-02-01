---
sidebar_position: 1
---

# 🔧 EPON Configuration

Configure VLANs on VSOL EPON OLT to segment traffic for DHCP, PPPoE, hotspot, and customer-specific services. This guide covers VLAN creation, trunk/access port configuration, and EPON interface setup for fiber-to-the-home (FTTH) networks.

:::info Key Concepts
- **VLAN** - Virtual LAN for traffic segmentation
- **Hybrid Port** - Mix of tagged and untagged VLANs on single port
- **PVID** - Port VLAN ID (default untagged VLAN)
- **EPON Interface** - PON port connecting ONUs/ONTs
- **Gigabit Interface** - Uplink ports to core network
- **VLAN Tagging** - 802.1Q VLAN tags for multi-service delivery
:::

---

## Prerequisites

Before configuring VLANs, ensure you have:

- ✅ VSOL EPON OLT with console/SSH access
- ✅ Network design with VLAN plan documented
- ✅ Uplink connectivity to MikroTik/core router
- ✅ Understanding of hybrid port modes
- ✅ Backup of current configuration

---

:::warning Important Considerations
- **VLAN 1 Default:** Native VLAN 1 used for management (change if needed)
- **Hybrid Mode:** Mix untagged (VLAN 1) with tagged VLANs (40, 200)
- **ONU Provisioning:** ONUs must match OLT VLAN configuration
- **Uplink Bandwidth:** Ensure Gig 0/1-0/2 can handle aggregated traffic
- **Storm Control:** Keep broadcast/multicast limits to prevent loops
:::

---

## Understanding VSOL VLAN Architecture

### Network Topology

```
[Internet] ──── [MikroTik Router] ──── [VSOL EPON OLT] ──── [ONUs/ONTs] ──── [Customers]
                      │                      │
                      │                      └─ VLAN 40: PPPoE Users
                      │                      └─ VLAN 200: Hotspot Users
```

### VLAN Design

| VLAN ID | Name | Purpose | Uplink Port | Mode |
|---------|------|---------|-------------|------|
| 1 | Native | Management (default) | Gig 0/1-0/2 | Hybrid PVID |
| 40 | PPPoE | PPPoE subscribers | Gig 0/1-0/2, EPON 0/1-0/4 | Hybrid tagged |
| 100-200 | Customer VLANs | Per-customer or shared pools | Gig 0/1-0/2, EPON 0/1-0/4 | Hybrid tagged |
| 200 | Hotspot | Guest/voucher access | Gig 0/1-0/2, EPON 0/1-0/4 | Hybrid tagged |

---

## Configuration

### Step 1: Create VLANs

```bash
# Access OLT via SSH
ssh admin@192.168.8.100

# Enter configuration mode
enable
configure terminal

# Create VLANs
vlan 40
description vlan40pppoe
exit

vlan 100 to 200
description customer_vlans
exit

vlan 200
description vlan200hotspot
exit
```

### Step 2: Configure Hybrid Uplink Ports (Gig 0/1-0/2)

```bash
# Gig 0/1 - Hybrid uplink
interface gigabitethernet 0/1
switchport mode hybrid
switchport hybrid vlan 1 untagged
switchport hybrid vlan 40 tagged
switchport hybrid vlan 100 to 200 tagged
switchport hybrid pvid vlan 1
no shutdown
jumboframe enable
storm-control broadcast fps 512
storm-control unknow fps 512
exit

# Gig 0/2 - Hybrid uplink (redundancy)
interface gigabitethernet 0/2
switchport mode hybrid
switchport hybrid vlan 1 untagged
switchport hybrid vlan 40 tagged
switchport hybrid vlan 100 to 200 tagged
switchport hybrid pvid vlan 1
no shutdown
jumboframe enable
storm-control broadcast fps 512
storm-control unknow fps 512
exit
```

### Step 3: Configure EPON Interfaces (PON Ports)

```bash
# EPON 0/1
interface epon 0/1
switchport mode hybrid
switchport hybrid vlan 1 untagged
switchport hybrid vlan 40 tagged
switchport hybrid vlan 100 to 200 tagged
switchport hybrid pvid vlan 1
jumboframe enable
storm-control broadcast fps 512
storm-control unknow fps 512
exit

# EPON 0/2
interface epon 0/2
switchport mode hybrid
switchport hybrid vlan 1 untagged
switchport hybrid vlan 40 tagged
switchport hybrid vlan 100 to 200 tagged
switchport hybrid pvid vlan 1
jumboframe enable
storm-control broadcast fps 512
storm-control unknow fps 512
exit

# EPON 0/3
interface epon 0/3
switchport mode hybrid
switchport hybrid vlan 1 untagged
switchport hybrid vlan 40 tagged
switchport hybrid vlan 100 to 200 tagged
switchport hybrid pvid vlan 1
jumboframe enable
storm-control broadcast fps 512
storm-control unknow fps 512
exit

# EPON 0/4
interface epon 0/4
switchport mode hybrid
switchport hybrid vlan 1 untagged
switchport hybrid vlan 40 tagged
switchport hybrid vlan 100 to 200 tagged
switchport hybrid pvid vlan 1
jumboframe enable
storm-control broadcast fps 512
storm-control unknow fps 512
exit
```

### Step 4: Configure Management Interface

```bash
# Set management IP (AUX interface)
interface aux
ip address 192.168.8.100 255.255.255.0
ip gateway 192.168.8.250
exit

# Configure DNS
ip dns 1.1.1.1 1.0.0.1

# Configure NTP
ntp server time.google.com ph.pool.ntp.org

# Set timezone (GMT+8)
time zone 8
```

### Step 5: Save Configuration

```bash
# Save running config to startup
write memory

# Or
copy running-config startup-config

# Verify
show running-config
```

---

## Verification

### Step 1: Check VLAN Database

```bash
# View all VLANs
show vlan

# Expected output:
# VLAN ID: 40, Name: vlan40pppoe
# VLAN ID: 100-200, Name: customer_vlans
# VLAN ID: 200, Name: vlan200hotspot
```

### Step 2: Verify Interface Configuration

```bash
# Check specific interface
show running-config interface gigabitethernet 0/1

# Check all EPON interfaces
show running-config interface epon 0/1
show interface epon 0/1 status

# Verify hybrid mode configuration
show running-config interface epon 0/1 | include hybrid
```

### Step 3: Verify ONU Registration

```bash
# List all ONUs
show epon onu-information

# Check ONU VLAN assignment (example: EPON 0/1, ONU 1)
show epon onu-config epon 0/1 onu 1

# Expected: VLANs 40, 200 configured
```

### Step 4: Test VLAN Connectivity

```bash
# From MikroTik router, ping OLT management IP
ping 192.168.8.100

# Check VLAN tagging (from router)
/tool sniffer quick interface=ether1 ip-protocol=icmp

# Expected: See 802.1Q tags for VLANs 40, 100-200
```

### Step 5: Check Port Statistics

```bash
# View port counters
show interface gigabitethernet 0/1 counters

# Check for errors
show interface epon 0/1 statistics

# Expected: RX/TX packets, minimal errors/drops
```

### Step 6: Verify Storm Control

```bash
# Check storm control settings
show storm-control interface gigabitethernet 0/1

# Expected: Broadcast limit 512 fps
```

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| ONU not registering | VLAN mismatch OLT/ONU | Verify ONU VLAN config matches OLT hybrid VLANs (40, 200) |
| PPPoE authentication fails | VLAN 40 not tagged properly | Verify Gig 0/1-0/2 and EPON ports have VLAN 40 tagged |
| Hotspot users no access | VLAN 200 not configured | Add VLAN 200 to all hybrid ports (Gig 0/1-0/2, EPON 0/1-0/4) |
| High broadcast traffic | Storm control disabled | Enable storm control on all ports |
| Management IP unreachable | Gateway misconfigured | Verify `ip gateway 192.168.8.250` in aux interface |
| EPON link down | Fiber issue or ONU offline | Check fiber connections, ONU power, laser levels |
| Hybrid port drops packets | MTU mismatch | Enable jumboframe on all hybrid ports |
| VLAN isolation fails | PVID not set | Set `switchport hybrid pvid vlan 1` on all hybrid ports |
| ONU gets wrong VLAN | Native VLAN leak | Ensure PVID = 1 on all hybrid ports |
| Port flapping | Duplex mismatch or cable issue | Check cable, set `speed auto`, verify duplex |

---

## Advanced Configuration Options

### 1. Per-ONU VLAN Assignment

Assign specific VLAN to individual ONU:

```bash
# ONU 1 on EPON 0/1 → VLAN 40
interface epon 0/1
onu 1 type custom-onu
switchport vlan 40
exit

# ONU 2 → VLAN 200
interface epon 0/1
onu 2 type custom-onu
switchport vlan 200
exit
```

### 2. MAC Address Limiting

Prevent MAC flooding per port:

```bash
interface epon 0/1
mac-address max-learning-num 128
exit
```

### 3. Port Mirroring for Monitoring

Mirror EPON traffic to monitoring port:

```bash
# Mirror EPON 0/1 to Gig 0/2
monitor session 1 source interface epon 0/1 both
monitor session 1 destination interface gigabitethernet 0/2
```

### 4. Rate Limiting per ONU

Limit bandwidth for specific ONU:

```bash
interface epon 0/1
onu 1 qos downstream fixed 100000 kbps
onu 1 qos upstream fixed 50000 kbps
exit
```

### 5. ONU Auto-Discovery

Automatic ONU registration:

```bash
# Enable auto-discovery on EPON port
interface epon 0/1
onu auto-find enable
onu auto-bind enable
exit

# View discovered ONUs
show epon onu-autofind all
```

### 6. Spanning Tree for Loop Prevention

```bash
# Enable MSTP
spanning-tree mode mstp

# Configure on uplink
interface gigabitethernet 0/1
spanning-tree mst instance 0 path-cost 200000
exit
```

```bash
# Enable SNMP
snmp-server start
snmp-server community public ro
snmp-server community private rw

# Set trap destination
snmp-server host 192.168.8.250 version 2c public
```

### 11. Backup Configuration via TFTP

```bash
# Backup to TFTP server
copy running-config tftp://192.168.8.250/olt-backup.conf

# Restore from TFTP
copy tftp://192.168.8.250/olt-backup.conf running-config
```

### 12. Port Security

Restrict MAC addresses per port:

```bash
interface epon 0/1
switchport port-security
switchport port-security maximum 1
switchport port-security mac-address sticky
exit
```

---

## ONU Provisioning Example

### Complete ONU Setup (EPON 0/1, ONU 1)

```bash
# Register ONU (if not auto-discovered)
interface epon 0/1
onu 1 type custom-onu
onu 1 sn ABCD:1234:5678  # ONU serial number
exit

# Configure ONU ports
interface epon-onu 0/1:1
port eth 1 state enable
switchport mode hybrid
switchport hybrid vlan 40
switchport hybrid vlan 200
switchport hybrid pvid vlan 40
exit

# Set bandwidth profile
interface epon 0/1
onu 1 qos downstream fixed 100000 kbps
onu 1 qos upstream fixed 50000 kbps
exit

# Verify ONU status
show epon onu-information epon 0/1 onu 1
show epon onu-config epon 0/1 onu 1
```

---

## MikroTik Integration

### Router Configuration for VSOL VLANs

```routeros
# On MikroTik router connected to Gig 0/1-0/2 (VLAN 40/200)
/interface vlan add name=vlan40-pppoe vlan-id=40 interface=ether1
/interface vlan add name=vlan200-hotspot vlan-id=200 interface=ether1

# Configure VLAN 40 for PPPoE
/ip address add address=10.0.40.1/24 interface=vlan40-pppoe
/interface pppoe-server server add service-name=fiber interface=vlan40-pppoe

# Configure VLAN 200 for Hotspot
/ip address add address=10.0.200.1/24 interface=vlan200-hotspot
/ip dhcp-server add name=hotspot200 interface=vlan200-hotspot address-pool=pool-hotspot
/ip dhcp-server network add address=10.0.200.0/24 gateway=10.0.200.1 dns-server=8.8.8.8
```

---

## Monitoring and Maintenance

### Daily Health Checks

```bash
# Check ONU status
show epon onu-information | include online

# View port utilization
show interface counters

# Check for errors
show interface gigabitethernet 0/1 statistics
show interface epon 0/1 statistics
```

### Log Monitoring

```bash
# View system logs
show logging

# Filter ONU events
show logging | include ONU

# Expected: ONU AUTH Success messages
```

---

## Related Guides

- [VLAN Configuration Fundamentals](../../Network/vlan-configuration) - Essential networking concepts for OLT VLAN setup
- [Understanding Subnets](../../Network/understanding-subnets) - IP addressing and subnet design
- [Routing Fundamentals](../../Network/routing-fundamentals) - Inter-VLAN routing concepts

---

✅ **VSOL EPON OLT with VLAN 40 (PPPoE) and VLAN 200 (Hotspot) is now configured and ready for ONU provisioning!**
