---
sidebar_position: 4
---

# 📦 Jumbo Frames Configuration

Jumbo frames are Ethernet frames with Maximum Transmission Unit (MTU) larger than the standard 1500 bytes, typically 9000 bytes. They reduce CPU overhead and improve throughput for bulk data transfers by sending more data per frame, ideal for storage networks, virtualization, and high-performance computing environments.

:::info Key Concepts
- **MTU (Maximum Transmission Unit)** - Maximum payload size in bytes per frame
- **Standard MTU** - 1500 bytes (default Ethernet standard)
- **Jumbo Frame** - Ethernet frame with MTU > 1500 bytes (typically 9000 bytes)
- **L2 MTU** - Layer 2 MTU includes Ethernet overhead (headers, VLAN tags)
- **Fragmentation** - Breaking large packets into smaller ones (avoided with proper MTU)
- **Path MTU Discovery** - Process to find smallest MTU along route
- **MSS (Maximum Segment Size)** - TCP payload size (MTU minus IP/TCP headers)
:::

---

## Prerequisites

Before configuring jumbo frames, ensure you have:

- ✅ Network equipment supporting jumbo frames (NICs, switches, routers)
- ✅ All devices in data path configured for same MTU
- ✅ Understanding of your network topology and traffic patterns
- ✅ Backup configuration before making changes
- ✅ Test environment or maintenance window
- ✅ Monitoring tools to verify performance improvements

---

:::warning Important Considerations
- **End-to-End Support Required:** ALL devices in path must support jumbo frames
- **Switch Configuration:** Most switches need explicit jumbo frame enablement
- **Performance Impact:** Misconfigured MTU causes fragmentation and packet loss
- **VLAN Overhead:** 802.1Q tag adds 4 bytes to frame size
- **Internet Traffic:** Jumbo frames only work on local networks (not across internet)
- **Testing Required:** Always verify with iperf/ping before production
- **Incremental Deployment:** Enable jumbo frames progressively, not all at once
:::

---

## Understanding Jumbo Frames

### Frame Size Comparison

**Standard Ethernet Frame (1500 MTU):**
```
[Preamble 8B][Dest MAC 6B][Src MAC 6B][Type 2B][Payload 1500B][CRC 4B]
Total Frame Size: 1526 bytes (without VLAN tag)
```

**Jumbo Frame (9000 MTU):**
```
[Preamble 8B][Dest MAC 6B][Src MAC 6B][Type 2B][Payload 9000B][CRC 4B]
Total Frame Size: 9026 bytes (without VLAN tag)
```

### Performance Benefits

| Frame Size | Payload | Overhead | Efficiency | CPU Cycles | Use Case |
|------------|---------|----------|------------|------------|----------|
| 1500 MTU (Standard) | 1500B | 26B/frame | 98.3% | Baseline | General networking, internet |
| 4000 MTU | 4000B | 26B/frame | 99.4% | -40% vs 1500 | Moderate performance boost |
| 9000 MTU (Jumbo) | 9000B | 26B/frame | 99.7% | -60% vs 1500 | Storage, backups, VM migration |

**Throughput Example:**
- **1 Gbps link with 1500 MTU:** ~118 MB/s actual throughput
- **1 Gbps link with 9000 MTU:** ~125 MB/s actual throughput (~6% gain)
- **10 Gbps link with 9000 MTU:** ~1180 MB/s (10-15% gain over standard MTU)

:::tip When to Use Jumbo Frames
**Best Use Cases:**
- iSCSI/NFS storage traffic
- VMware vMotion and vSphere replication
- Database replication and backups
- High-resolution video streaming (internal)
- Hyper-V Live Migration

**Avoid For:**
- Internet-facing connections
- Mixed MTU environments
- Networks with legacy equipment
- Wireless networks (limited support)
:::

---

## Common Jumbo Frame Scenarios

### Scenario 1: Data Center Storage Network

**Topology:**
```
[ESXi Hosts] ──┬── [10G Switch] ──┬── [iSCSI Storage]
               │                   │
            [NAS]              [Backup Server]

All devices: MTU 9000
```

**Device Configuration:**

| Device | Role | MTU | L2 MTU | Interface | Performance Gain |
|--------|------|-----|--------|-----------|------------------|
| ESXi Host 1 | Hypervisor | 9000 | 9018 | vmnic1 (storage) | +12% IOPS |
| ESXi Host 2 | Hypervisor | 9000 | 9018 | vmnic1 (storage) | +12% IOPS |
| Storage Switch | Aggregation | 9000 | 9216 | All ports | Full line-rate |
| iSCSI SAN | Storage | 9000 | 9018 | eth0-3 (MPIO) | +15% throughput |
| NAS Server | File storage | 9000 | 9018 | bond0 | +8% SMB transfer |
| Backup Server | Veeam proxy | 9000 | 9018 | ens192 | +10% backup speed |

---

### Scenario 2: Virtualization Cluster

**Network:** VMware vSphere cluster with separate networks

| Network Type | VLAN | MTU | Purpose | Traffic Pattern |
|--------------|------|-----|---------|-----------------|
| Management | 10 | 1500 | vCenter, SSH, web | Low volume, latency-sensitive |
| vMotion | 20 | 9000 | Live VM migration | Bulk transfers, high throughput |
| Storage | 30 | 9000 | iSCSI/NFS datastores | Sequential I/O, consistent load |
| VM Network | 40 | 1500 | Guest VM traffic | Mixed protocols, internet access |
| Replication | 50 | 9000 | vSphere Replication | Large file transfers |

**Per-Interface Configuration:**

| ESXi Host Interface | Portgroup | MTU | Comment |
|---------------------|-----------|-----|---------|
| vmk0 (Management) | Management-PG | 1500 | Standard for management |
| vmk1 (vMotion) | vMotion-PG | 9000 | Optimize VM migration speed |
| vmk2 (iSCSI-A) | iSCSI-A-PG | 9000 | First iSCSI path |
| vmk3 (iSCSI-B) | iSCSI-B-PG | 9000 | Second iSCSI path (MPIO) |
| vmnic4 (VM traffic) | VM-Network-PG | 1500 | Guest VM connectivity |

---

### Scenario 3: Multi-Site Replication

**Network:** HQ with branch office replication over dedicated fiber

| Site | Device | WAN MTU | LAN MTU | Notes |
|------|--------|---------|---------|-------|
| HQ | Router | 1500 | 9000 | WAN limited by ISP |
| HQ | Core Switch | N/A | 9000 | Internal storage network |
| HQ | Database Server | 9000 | 9000 | Replication source |
| Branch | Router | 1500 | 9000 | Same WAN limitation |
| Branch | Access Switch | N/A | 9000 | Internal network |
| Branch | Database Replica | 9000 | 9000 | Replication target |

**Path MTU Impact:**
- **Local LAN traffic:** 9000 MTU (optimized)
- **WAN replication:** 1500 MTU (fragmented to standard size)
- **Solution:** MSS clamping at router to avoid fragmentation

---

### Scenario 4: Mixed MTU Environment (Transition Phase)

**Challenge:** Upgrading network progressively to jumbo frames

| Device Group | Current MTU | Target MTU | Migration Phase | Notes |
|--------------|-------------|------------|-----------------|-------|
| Core Switches | 1500 | 9000 | Phase 1 (Week 1) | Enable switch support first |
| Storage Servers | 1500 | 9000 | Phase 2 (Week 2) | Low-risk, isolated VLAN |
| Hypervisor Hosts | 1500 | 9000 | Phase 3 (Week 3) | During maintenance window |
| Application Servers | 1500 | 1500 | Not changed | No performance benefit |
| User VLANs | 1500 | 1500 | Not changed | Internet-facing traffic |

---

## Configuration in MikroTik RouterOS

### Option A: Terminal (Interface MTU Configuration)

#### Basic Interface MTU
```routeros
# Set MTU on physical interface
/interface ethernet set ether1 mtu=9000 l2mtu=9216 comment="Storage Network"

# Verify interface MTU
/interface ethernet print detail where name=ether1

# Expected output:
# name="ether1" mtu=9000 l2mtu=9216
```

#### Bridge with Jumbo Frames
```routeros
# Create bridge for storage network
/interface bridge add name=bridge-storage mtu=9000 comment="Jumbo Frame Bridge"

# Add interfaces to bridge
/interface bridge port add bridge=bridge-storage interface=ether2 comment="ESXi-1"
/interface bridge port add bridge=bridge-storage interface=ether3 comment="ESXi-2"
/interface bridge port add bridge=bridge-storage interface=ether4 comment="Storage"

# Set L2 MTU on bridge ports
/interface ethernet set ether2,ether3,ether4 l2mtu=9216

# Assign IP to bridge
/ip address add address=10.0.100.1/24 interface=bridge-storage comment="Storage Gateway"
```

#### VLAN with Jumbo Frames
```routeros
# Create VLAN interface with larger MTU
/interface vlan add name=vlan-storage vlan-id=30 interface=bridge1 mtu=9000 \
  comment="Storage VLAN"

# Set L2 MTU on physical interfaces carrying VLAN
/interface ethernet set ether1 l2mtu=9216

# Assign IP address
/ip address add address=10.0.30.1/24 interface=vlan-storage
```

#### MSS Clamping for Mixed MTU
```routeros
# Clamp TCP MSS for WAN interface (prevent fragmentation)
/ip firewall mangle add chain=forward protocol=tcp tcp-flags=syn \
  out-interface=ether1-wan action=change-mss new-mss=1360 \
  comment="MSS Clamp for WAN"

# For jumbo frame network
/ip firewall mangle add chain=forward protocol=tcp tcp-flags=syn \
  in-interface=bridge-storage action=change-mss new-mss=8960 \
  comment="MSS for Jumbo Frames"
```

#### PPPoE with Jumbo Frames
```routeros
# PPPoE client with larger MTU (if ISP supports)
/interface pppoe-client add name=pppoe-out1 interface=ether1-wan \
  mtu=9000 mrru=9000 user=username password=password \
  comment="Jumbo Frame PPPoE"

# Note: ISP must support jumbo frames on uplink
```

### Option B: Winbox

#### Setting Interface MTU

1. **Physical Interface:**
   - Interfaces → Ethernet → Select `ether1`
   - General Tab:
     - MTU: `9000`
     - L2 MTU: `9216`
     - Comment: `Storage Network`
   - Click Apply → OK

2. **Bridge Configuration:**
   - Bridge → Bridge → [+]
   - Name: `bridge-storage`
   - MTU: `9000`
   - Comment: `Jumbo Frame Bridge`
   - Click OK

3. **Bridge Ports:**
   - Bridge → Ports → [+]
   - Interface: `ether2`
   - Bridge: `bridge-storage`
   - Click OK
   - Repeat for ether3, ether4

4. **VLAN Interface:**
   - Interfaces → VLAN → [+]
   - Name: `vlan-storage`
   - VLAN ID: `30`
   - Interface: `bridge1`
   - MTU: `9000`
   - Click OK

5. **MSS Clamping:**
   - IP → Firewall → Mangle → [+]
   - Chain: `forward`
   - Protocol: `tcp`
   - TCP Flags: `syn` (check only)
   - Out Interface: `ether1-wan`
   - Action: `change-mss`
   - New MSS: `1360`
   - Comment: `MSS Clamp for WAN`
   - Click OK

---

## Understanding MTU Configuration

### MTU vs L2 MTU

| Parameter | Definition | Typical Value | Layer | Includes |
|-----------|------------|---------------|-------|----------|
| **MTU** | Maximum IP packet size | 1500 or 9000 | Layer 3 | IP header + payload |
| **L2 MTU** | Maximum Ethernet frame size | 1518 or 9216 | Layer 2 | Ethernet header + MTU + CRC |
| **VLAN MTU** | MTU with 802.1Q tag | 1504 or 9004 | Layer 2.5 | MTU + 4-byte VLAN tag |

**Calculation Example:**
```
Jumbo Frame Components:
- Ethernet Header: 14 bytes (Dest MAC + Src MAC + Type)
- 802.1Q VLAN Tag: 4 bytes (optional)
- IP Payload: 9000 bytes (MTU)
- CRC: 4 bytes
- Interframe Gap: 12 bytes

Total L2 MTU Required: 14 + 4 + 9000 + 4 = 9022 bytes
Recommended L2 MTU: 9216 bytes (accommodates overhead)
```

### Network Flow Diagram

```
[Client] ─── 9000 MTU ─── [Switch] ─── 9000 MTU ─── [Storage]
  10.0.100.10            (L2 MTU: 9216)          10.0.100.50

Ping Test:
  ping 10.0.100.50 size=8972 -f
  
  Packet breakdown:
  - ICMP data: 8972 bytes
  - IP header: 20 bytes
  - ICMP header: 8 bytes
  - Total: 9000 bytes (fits in MTU)
```

---

## Verification

### Step 1: Verify Interface MTU Settings

```routeros
# Check all interfaces
/interface print detail

# Check specific interface
/interface ethernet print detail where name=ether1

# Expected output:
# name="ether1" mtu=9000 l2mtu=9216 mac-address=XX:XX:XX:XX:XX:XX
```

### Step 2: Test with Ping (Do Not Fragment)

```routeros
# Ping with maximum payload (9000 MTU - 20 IP - 8 ICMP = 8972 bytes)
/ping 10.0.100.50 size=8972 do-not-fragment count=10

# Expected: 0% packet loss

# Test slightly larger (should fail)
/ping 10.0.100.50 size=9000 do-not-fragment count=5

# Expected: 100% packet loss or "packet too large" error
```

### Step 3: Check Switch Support (from Linux/Windows)

```bash
# Linux: Check interface MTU
ip link show eth0
# Expected: mtu 9000

# Windows: Check MTU
netsh interface ipv4 show subinterfaces
# Expected: MTU = 9000

# Ping test from client
ping 10.0.100.1 -f -l 8972
# Expected: Reply from 10.0.100.1 (0% loss)
```

### Step 4: Measure Throughput with iperf3

```bash
# On storage server (target):
iperf3 -s

# On client (source):
iperf3 -c 10.0.100.50 -t 30 -i 5

# Compare results:
# Standard MTU (1500): ~118 MB/s on 1G link
# Jumbo MTU (9000): ~125 MB/s on 1G link (+6%)
```

### Step 5: Monitor CPU Usage During Transfer

```routeros
# Monitor CPU while transferring large file
/tool profile duration=30

# Expected: Lower CPU usage with jumbo frames
# Standard MTU: 60-70% CPU
# Jumbo MTU: 40-50% CPU (~20-30% reduction)
```

### Step 6: Verify Path MTU Discovery

```bash
# Linux: Trace path MTU
tracepath 10.0.100.50

# Expected output shows MTU at each hop:
# 1: 10.0.100.1 (10.0.100.1) pmtu 9000
# 2: 10.0.100.50 (10.0.100.50) reached
```

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Ping works but file transfer fails | Path MTU discovery blocked (ICMP) | Allow ICMP "Packet Too Big" in firewall |
| Intermittent packet loss | Switch buffer overflow with large frames | Enable flow control: `/interface ethernet set ether1 flow-control=on` |
| Cannot set MTU > 1500 | Interface/hardware limitation | Check driver/firmware, use `/interface ethernet print capabilities` |
| VLAN traffic drops with jumbo frames | L2 MTU too small for VLAN+jumbo | Set L2 MTU ≥ 9216: `/interface ethernet set l2mtu=9216` |
| Fragmentation occurring | MSS not clamped properly | Set TCP MSS: `/ip firewall mangle add action=change-mss new-mss=8960` |
| Performance degradation after enabling | Misconfigured device in path | Test each hop individually, verify all support 9000 MTU |
| Switch not forwarding jumbo frames | Jumbo frame support disabled | Enable on switch (varies by vendor) |
| ESXi vmkernel cannot set 9000 MTU | vSwitch MTU not configured | Set vSwitch MTU to 9000 before vmkernel adapters |
| NFS mount fails with jumbo frames | Server/client MTU mismatch | Verify both NFS server and client use same MTU |
| iSCSI initiator disconnects | MSS/MTU mismatch causing retransmits | Set iSCSI initiator MTU = target MTU |
| PPPoE drops with large MTU | ISP equipment limitation | Revert PPPoE to 1500 MTU, use jumbo on LAN only |
| Bridge not passing jumbo frames | Bridge MTU smaller than port MTU | Set bridge MTU ≥ port MTU: `/interface bridge set mtu=9000` |

---

## Advanced Jumbo Frame Options

### 1. Per-VLAN MTU Configuration

Separate MTU for different traffic types:

```routeros
# Management VLAN - standard MTU
/interface vlan add name=vlan-mgmt vlan-id=10 interface=bridge1 mtu=1500

# Storage VLAN - jumbo frames
/interface vlan add name=vlan-storage vlan-id=30 interface=bridge1 mtu=9000

# VM network - standard MTU
/interface vlan add name=vlan-vm vlan-id=40 interface=bridge1 mtu=1500

# Set physical interface L2 MTU to maximum
/interface ethernet set ether1 l2mtu=9216
```

### 2. QoS with Jumbo Frames

Prioritize jumbo frame traffic:

```routeros
# Mark storage traffic
/ip firewall mangle add chain=prerouting in-interface=vlan-storage \
  action=mark-connection new-connection-mark=storage-conn

/ip firewall mangle add chain=prerouting connection-mark=storage-conn \
  action=mark-packet new-packet-mark=storage-pkt

# Prioritize in queue
/queue simple add name=storage-priority target=vlan-storage \
  max-limit=10G/10G priority=1/1 queue=default/default
```

### 3. Baby Jumbo Frames (4000-6000 MTU)

Compromise for partial infrastructure:

```routeros
# Use 4096 MTU where full 9000 not supported
/interface ethernet set ether1 mtu=4096 l2mtu=4116

# Still provides ~30% efficiency gain over 1500 MTU
# Compatible with more switches than 9000 MTU
```

### 4. Bonding with Jumbo Frames

LAG/bonding with large MTU:

```routeros
# Create bonding interface
/interface bonding add name=bond-storage slaves=ether2,ether3 \
  mode=802.3ad lacp-rate=1sec mtu=9000

# Set L2 MTU on member interfaces
/interface ethernet set ether2,ether3 l2mtu=9216

# Assign IP
/ip address add address=10.0.100.1/24 interface=bond-storage
```

### 5. MTU Path Discovery Optimization

Fine-tune PMTUD:

```routeros
# Enable PMTUD globally
/ip settings set tcp-syncookies=yes allow-fast-path=yes

# Log PMTUD events
/ip firewall filter add chain=forward protocol=icmp icmp-options=3:4 \
  action=log log-prefix="PMTUD: " comment="Log Packet Too Big"

/ip firewall filter add chain=forward protocol=icmp icmp-options=3:4 \
  action=accept comment="Allow PMTUD"
```

### 6. Router-on-a-Stick with Mixed MTU

Inter-VLAN routing with different MTU:

```routeros
# Standard VLAN
/interface vlan add name=vlan-users vlan-id=10 interface=ether1 mtu=1500
/ip address add address=192.168.10.1/24 interface=vlan-users

# Jumbo VLAN
/interface vlan add name=vlan-storage vlan-id=20 interface=ether1 mtu=9000
/ip address add address=192.168.20.1/24 interface=vlan-storage

# Router automatically fragments when routing between VLANs
```

### 7. Container with Jumbo Frames

Docker/LXC container networking:

```routeros
# Create veth pair with jumbo MTU
/interface veth add name=veth-storage address=10.0.100.2/24 \
  gateway=10.0.100.1 mtu=9000

# Assign to container
/container add interface=veth-storage mtu=9000 \
  file=container-image.tar remote-image=...
```

### 8. Wireless with Large MTU (Limited)

Extend jumbo frames to wireless (rarely supported):

```routeros
# Some enterprise APs support up to 2304 MTU
/interface wireless set wlan1 mtu=2304

# Note: Most wireless devices limited to 1500 MTU
# Test thoroughly before production
```

### 9. Jumbo Frame Monitoring

Track jumbo frame statistics:

```routeros
# Monitor interface stats
/interface ethernet monitor ether1 once

# Check for errors
/interface ethernet print stats

# Log large frame drops
:if ([/interface ethernet get ether1 tx-drop] > 0) do={
  :log warning "Jumbo frame drops detected on ether1"
}
```

### 10. GRE/IPIP Tunnel with Jumbo Frames

Tunnel overhead compensation:

```routeros
# Create GRE tunnel
/interface gre add name=gre-tunnel1 remote-address=203.0.113.1 \
  mtu=8980 local-address=198.51.100.1

# MTU reduced by GRE overhead (20 bytes)
# 9000 MTU network → 8980 MTU tunnel
```

### 11. Load Balancing with Jumbo Frames

ECMP with large frames:

```routeros
# Two equal-cost paths with jumbo MTU
/ip route add dst-address=10.0.200.0/24 gateway=10.0.100.1 \
  distance=1 comment="Path 1"

/ip route add dst-address=10.0.200.0/24 gateway=10.0.101.1 \
  distance=1 comment="Path 2"

# Ensure both paths support 9000 MTU
/interface print detail where name~"ether"
```

### 12. Automated MTU Testing Script

Discover maximum MTU:

```routeros
:local target "10.0.100.50"
:local maxmtu 9000
:local minmtu 1500
:local currentmtu $maxmtu

:put "=== MTU Discovery Test ==="
:while ($currentmtu >= $minmtu) do={
  :local pingsize ($currentmtu - 28)
  :local result [/ping $target count=3 size=$pingsize do-not-fragment]
  
  :if ($result = 0) do={
    :put ("MTU $currentmtu: FAILED")
    :set currentmtu ($currentmtu - 500)
  } else={
    :put ("MTU $currentmtu: SUCCESS - Maximum working MTU found")
    :set currentmtu 0
  }
}
```

---

## Performance Benchmarks

### Throughput Comparison

**1 Gigabit Ethernet:**

| MTU Size | Throughput | Frames/sec | CPU Usage | Efficiency |
|----------|------------|------------|-----------|------------|
| 1500 | 940 Mbps | 78,125 | 65% | Baseline |
| 4000 | 970 Mbps | 30,303 | 50% | +3% throughput |
| 9000 | 980 Mbps | 13,889 | 45% | +4% throughput |

**10 Gigabit Ethernet:**

| MTU Size | Throughput | Frames/sec | CPU Usage | Efficiency |
|----------|------------|------------|-----------|------------|
| 1500 | 9.2 Gbps | 781,250 | 90% | Baseline |
| 4000 | 9.7 Gbps | 303,030 | 65% | +5% throughput |
| 9000 | 9.8 Gbps | 138,889 | 55% | +6.5% throughput |

:::tip Best Practices Summary
1. **Enable jumbo frames only on isolated storage/backup networks**
2. **Set L2 MTU to 9216 on all switches supporting jumbo VLANs**
3. **Test end-to-end with ping before enabling in production**
4. **Use MSS clamping on routers interfacing with standard MTU networks**
5. **Monitor for increased error rates after enabling**
6. **Document all MTU settings in network diagrams**
7. **Keep management networks at 1500 MTU for compatibility**
8. **Use iperf3 to measure actual throughput improvements**
:::

---

## Related Guides

- [Understanding Subnets](./understanding-subnets) - IP addressing and network segmentation
- [VLAN Configuration](./vlan-configuration) - Layer 2 network isolation with MTU considerations
- [Routing Fundamentals](./routing-fundamentals) - Path MTU discovery and inter-network routing
- [Guest Bandwidth DHCP](../Mikrotik/Bandwidth/guest-bandwidth-dhcp-on-up) - QoS with MTU optimization
- [Container Setup](../Mikrotik/Container/smokeping-docker-container) - Container MTU configuration

---

🎉 **You now understand jumbo frames, MTU configuration, performance optimization, and troubleshooting!** Use jumbo frames strategically in storage and virtualization networks to reduce CPU overhead and improve bulk transfer throughput while maintaining standard MTU for general traffic.
