---
sidebar_position: 1
---

# 🔢 Understanding IP Subnets and CIDR

Subnetting divides large networks into smaller, manageable segments to optimize performance, security, and IP address allocation. This guide explains subnet masks, CIDR notation, and practical client distribution with real-world examples.

:::info Key Concepts
- **Subnet Mask** - Defines network and host portions of an IP address
- **CIDR Notation** - Shorthand format using slash notation (/24, /27, etc.)
- **Network Address** - First IP in subnet (reserved, identifies the network)
- **Broadcast Address** - Last IP in subnet (reserved, sends to all devices)
- **Usable Hosts** - Total IPs minus network and broadcast addresses
- **Subnetting** - Breaking large networks into smaller logical segments
:::

---

## Prerequisites

Before working with subnets, ensure you understand:

- ✅ Basic IP addressing (IPv4 format: `192.168.1.1`)
- ✅ Binary and decimal number systems (basic conversion)
- ✅ Network vs. host portions of IP addresses
- ✅ Purpose of subnet masks in routing

---

## Understanding Subnet Masks

### What Is a Subnet Mask?

A subnet mask is a 32-bit number that divides an IP address into **network** and **host** portions. It uses consecutive 1s for the network part and 0s for hosts.

**Example:**
```
IP Address:    192.168.1.100
Subnet Mask:   255.255.255.0
Binary Mask:   11111111.11111111.11111111.00000000
                ↑ Network (24 bits)      ↑ Hosts (8 bits)
```

### CIDR Notation

**CIDR (Classless Inter-Domain Routing)** replaces dotted-decimal masks with slash notation:

| Subnet Mask     | CIDR | Network Bits | Host Bits | Total IPs | Usable Hosts |
|-----------------|------|--------------|-----------|-----------|--------------|
| 255.255.255.252 | /30  | 30           | 2         | 4         | 2            |
| 255.255.255.248 | /29  | 29           | 3         | 8         | 6            |
| 255.255.255.240 | /28  | 28           | 4         | 16        | 14           |
| 255.255.255.224 | /27  | 27           | 5         | 32        | 30           |
| 255.255.255.192 | /26  | 26           | 6         | 64        | 62           |
| 255.255.255.128 | /25  | 25           | 7         | 128       | 126          |
| 255.255.255.0   | /24  | 24           | 8         | 256       | 254          |
| 255.255.254.0   | /23  | 23           | 9         | 512       | 510          |
| 255.255.252.0   | /22  | 22           | 10        | 1024      | 1022         |
| 255.255.0.0     | /16  | 16           | 16        | 65536     | 65534        |

:::tip Quick Calculation
**Usable Hosts** = 2^(host bits) - 2

Example: /24 has 8 host bits → 2^8 - 2 = 256 - 2 = **254 usable hosts**
:::

---

## Common Subnet Scenarios with Client Distribution

### Scenario 1: Small Office Network (/24)

**Network:** `192.168.1.0/24`

| Component         | Value           | Description                              |
|-------------------|-----------------|------------------------------------------|
| Network Address   | 192.168.1.0     | Identifies the subnet                    |
| Subnet Mask       | 255.255.255.0   | Standard Class C mask                    |
| First Usable IP   | 192.168.1.1     | Typically gateway/router                 |
| Last Usable IP    | 192.168.1.254   | Last assignable device IP                |
| Broadcast Address | 192.168.1.255   | Sends packets to all devices             |
| Total Hosts       | 254             | Suitable for small/medium networks       |

**Client Allocation Example:**

| IP Range            | Purpose               | Device Count | Notes                          |
|---------------------|-----------------------|--------------|--------------------------------|
| 192.168.1.1         | Gateway/Router        | 1            | MikroTik RB4011                |
| 192.168.1.2-10      | Network Infrastructure| 9            | Switches, APs, NAS             |
| 192.168.1.11-50     | Servers               | 40           | DHCP, DNS, File servers        |
| 192.168.1.51-100    | Static IPs            | 50           | Printers, cameras, VoIP phones |
| 192.168.1.101-254   | DHCP Pool             | 154          | Laptops, phones, guest devices |

:::warning Best Practice
Reserve first 50-100 IPs for static assignments (infrastructure, servers, printers) to avoid DHCP conflicts.
:::

---

### Scenario 2: Departmental Subnets (/26)

**Network:** `10.0.0.0/24` divided into 4 subnets of /26 each

| Subnet | Network Address | Usable IPs         | Broadcast     | Department  | Capacity |
|--------|-----------------|--------------------|--------------|--------------|-----------
| 1      | 10.0.0.0/26     | 10.0.0.1 - 10.0.0.62   | 10.0.0.63    | HR           | 62 hosts |
| 2      | 10.0.0.64/26    | 10.0.0.65 - 10.0.0.126 | 10.0.0.127   | Sales        | 62 hosts |
| 3      | 10.0.0.128/26   | 10.0.0.129 - 10.0.0.190| 10.0.0.191   | Engineering  | 62 hosts |
| 4      | 10.0.0.192/26   | 10.0.0.193 - 10.0.0.254| 10.0.0.255   | Guest WiFi   | 62 hosts |

**HR Department (10.0.0.0/26) Client Distribution:**

| IP Range         | Purpose            | Device Count | Examples                    |
|------------------|--------------------|--------------|------------------------------|
| 10.0.0.1         | Gateway            | 1            | VLAN 10 gateway             |
| 10.0.0.2-5       | Infrastructure     | 4            | Print server, file share    |
| 10.0.0.6-30      | Static Devices     | 25           | Desktops, printers          |
| 10.0.0.31-62     | DHCP Pool          | 32           | Laptops, tablets, phones    |

:::info Why Subnet by Department?
- **Security:** Firewall rules between departments
- **Performance:** Reduced broadcast traffic per segment
- **Management:** Easier troubleshooting and monitoring
- **Scalability:** Add VLANs without redesigning
:::

---

### Scenario 3: ISP Customer Allocation (/27)

**Network:** `203.0.113.0/27` for dedicated business customer

| Component         | Value              | Description                         |
|-------------------|--------------------|------------------------------------|
| Network Address   | 203.0.113.0        | Customer subnet identifier         |
| Subnet Mask       | 255.255.255.224    | /27 mask                           |
| Gateway           | 203.0.113.1        | ISP-side router interface          |
| Customer IPs      | 203.0.113.2-30     | 29 usable public IPs               |
| Broadcast         | 203.0.113.31       | Subnet broadcast                   |

**Customer IP Assignment:**

| IP Address       | Device                  | Purpose                          |
|------------------|-------------------------|----------------------------------|
| 203.0.113.1      | ISP Gateway             | PPPoE/DHCP server                |
| 203.0.113.2      | Customer Router (WAN)   | MikroTik CCR2004 public interface|
| 203.0.113.3      | Web Server              | Apache/Nginx production          |
| 203.0.113.4      | Mail Server             | Exchange/Postfix MX record       |
| 203.0.113.5      | VPN Server              | OpenVPN/WireGuard endpoint       |
| 203.0.113.6-10   | Reserved                | Future expansion                 |
| 203.0.113.11-30  | Available               | Load balancers, DNS, staging     |

---

### Scenario 4: Point-to-Point Links (/30)

**Network:** `10.10.10.0/30` for router-to-router connections

| Component         | Value          | Description                          |
|-------------------|----------------|--------------------------------------|
| Network Address   | 10.10.10.0     | Link subnet                          |
| Subnet Mask       | 255.255.255.252| /30 (only 2 usable IPs)              |
| Router A          | 10.10.10.1     | Site A border router                 |
| Router B          | 10.10.10.2     | Site B border router                 |
| Broadcast         | 10.10.10.3     | Subnet broadcast                     |

**Use Cases:**
- **WAN Links:** ISP uplinks, dedicated fiber connections
- **OSPF Neighbors:** Point-to-point routing between sites
- **VPN Tunnels:** WireGuard/IPsec tunnel endpoints
- **Efficiency:** Minimal IP waste (only 2 hosts needed)

:::tip Why /30 for P2P?
Using /30 (4 IPs: network, 2 hosts, broadcast) is the most efficient for two-device links. /31 exists (RFC 3021) but has limited compatibility.
:::

---

## Subnet Calculation Examples

### Example 1: How Many /26 Subnets in /24?

**Given:** You have `192.168.10.0/24` and need /26 subnets.

**Calculation:**
- /24 = 256 total IPs
- /26 = 64 IPs per subnet
- **Result:** 256 ÷ 64 = **4 subnets**

**Subnet Breakdown:**

| Subnet # | Network         | First IP       | Last IP         | Broadcast      |
|----------|-----------------|----------------|-----------------|----------------|
| 1        | 192.168.10.0/26 | 192.168.10.1   | 192.168.10.62   | 192.168.10.63  |
| 2        | 192.168.10.64/26| 192.168.10.65  | 192.168.10.126  | 192.168.10.127 |
| 3        | 192.168.10.128/26| 192.168.10.129| 192.168.10.190  | 192.168.10.191 |
| 4        | 192.168.10.192/26| 192.168.10.193| 192.168.10.254  | 192.168.10.255 |

---

### Example 2: Subnetting for Multi-Site Network

**Scenario:** Corporate network with 3 branch offices, each needs 100 usable IPs.

**Solution:** Use /25 subnets (126 usable hosts each)

**Network Plan:**

| Site       | Network         | Usable Range          | Gateway       | DHCP Pool         |
|------------|-----------------|-----------------------|---------------|-------------------|
| HQ         | 10.1.0.0/25     | 10.1.0.1 - 10.1.0.126 | 10.1.0.1      | 10.1.0.50-126     |
| Branch A   | 10.1.0.128/25   | 10.1.0.129 - 10.1.0.254| 10.1.0.129   | 10.1.0.180-254    |
| Branch B   | 10.1.1.0/25     | 10.1.1.1 - 10.1.1.126 | 10.1.1.1      | 10.1.1.50-126     |
| Branch C   | 10.1.1.128/25   | 10.1.1.129 - 10.1.1.254| 10.1.1.129   | 10.1.1.180-254    |

**Per-Site Client Distribution (Branch A Example):**

| IP Range           | Purpose              | Count | Devices                       |
|--------------------|----------------------|-------|-------------------------------|
| 10.1.0.129         | Gateway              | 1     | MikroTik hEX router           |
| 10.1.0.130-135     | Infrastructure       | 6     | Switches, APs, cameras        |
| 10.1.0.136-179     | Static Assignments   | 44    | Desktops, printers, VoIP      |
| 10.1.0.180-254     | DHCP Pool            | 75    | Laptops, phones, IoT devices  |

---

## Configuration in MikroTik RouterOS

### Option A: Terminal (DHCP Server for /24 Subnet)

```routeros
# Configure IP address on LAN interface
/ip address add address=192.168.1.1/24 interface=ether2 comment="LAN Gateway"

# Create DHCP pool (exclude gateway and static range)
/ip pool add name=dhcp_pool ranges=192.168.1.101-192.168.1.254

# Configure DHCP server
/ip dhcp-server network add address=192.168.1.0/24 gateway=192.168.1.1 \
  dns-server=8.8.8.8,8.8.4.4 comment="Main LAN"
/ip dhcp-server add name=dhcp1 interface=ether2 address-pool=dhcp_pool disabled=no

# Add static leases for servers
/ip dhcp-server lease add address=192.168.1.10 mac-address=AA:BB:CC:DD:EE:FF \
  comment="File Server" server=dhcp1
/ip dhcp-server lease add address=192.168.1.11 mac-address=11:22:33:44:55:66 \
  comment="Print Server" server=dhcp1
```

### Option B: Winbox

1. **Add IP Address:**
   - IP → Addresses → [+]
   - Address: `192.168.1.1/24`
   - Interface: `ether2`
   - Comment: `LAN Gateway`

2. **Create DHCP Pool:**
   - IP → Pool → [+]
   - Name: `dhcp_pool`
   - Addresses: `192.168.1.101-192.168.1.254`

3. **Configure DHCP Network:**
   - IP → DHCP Server → Networks → [+]
   - Address: `192.168.1.0/24`
   - Gateway: `192.168.1.1`
   - DNS Servers: `8.8.8.8,8.8.4.4`

4. **Enable DHCP Server:**
   - IP → DHCP Server → DHCP → [+]
   - Name: `dhcp1`
   - Interface: `ether2`
   - Address Pool: `dhcp_pool`
   - Click OK

---

## Verification

### Step 1: Verify IP Configuration

```bash
# Check interface IP assignment
/ip address print

# Expected output:
# 0  192.168.1.1/24  ether2  LAN Gateway
```

### Step 2: Check DHCP Server Status

```routeros
# Verify DHCP server is running
/ip dhcp-server print

# Check active leases
/ip dhcp-server lease print
```

### Step 3: Test Client Connectivity

```bash
# From client device (Windows):
ipconfig /all

# Expected:
#   IPv4 Address: 192.168.1.101
#   Subnet Mask: 255.255.255.0
#   Default Gateway: 192.168.1.1
#   DNS Servers: 8.8.8.8, 8.8.4.4

# Ping gateway
ping 192.168.1.1

# Ping external IP
ping 8.8.8.8
```

### Step 4: Verify Subnet Reachability

```routeros
# From MikroTik router
/ping 192.168.1.101 count=5

# Check routing table
/ip route print where dst-address=192.168.1.0/24
```

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Clients not getting DHCP | DHCP server disabled | `/ip dhcp-server enable dhcp1` |
| IP conflicts detected | Static IP in DHCP range | Adjust pool to exclude static IPs (e.g., .101-254) |
| Can't ping devices in same subnet | Subnet mask mismatch | Verify all devices use same mask (/24 = 255.255.255.0) |
| Gateway unreachable | Interface not bridged/UP | Check `/interface print` and bridge configuration |
| DNS not resolving | Wrong DNS in DHCP network | Update DHCP network with correct DNS servers |
| Subnet full (no IPs available) | Pool exhausted | Expand to /23 or reclaim unused leases |
| DHCP leases not releasing | Lease time too long | Set shorter lease time: `/ip dhcp-server set dhcp1 lease-time=1h` |
| Broadcast storms | No VLAN segmentation | Implement VLANs to separate broadcast domains |
| Cross-subnet routing fails | Missing routes | Add static routes or enable routing protocol (OSPF/BGP) |
| Point-to-point link down | /30 broadcast IP used | Use only .1 and .2 IPs in /30 subnets |
| ARP not resolving | Proxy ARP disabled | Enable proxy ARP if needed: `/interface set ether2 arp=proxy-arp` |
| ISP subnet unreachable | Default route missing | `/ip route add dst-address=0.0.0.0/0 gateway=203.0.113.1` |

---

## Advanced Subnetting Options

### 1. Variable Length Subnet Masking (VLSM)

Use different subnet sizes for different needs:

```routeros
# Servers (/27 - 30 hosts)
/ip address add address=10.0.1.1/27 interface=vlan10

# Office PCs (/24 - 254 hosts)
/ip address add address=10.0.2.1/24 interface=vlan20

# P2P links (/30 - 2 hosts)
/ip address add address=10.0.3.1/30 interface=vlan30
```

### 2. Supernetting (Route Aggregation)

Combine multiple subnets into one route:

```routeros
# Summarize 192.168.0.0/24, 192.168.1.0/24, 192.168.2.0/24, 192.168.3.0/24
# Into single route: 192.168.0.0/22

/ip route add dst-address=192.168.0.0/22 gateway=10.0.0.1 comment="Aggregated route"
```

### 3. Secondary IP Addresses

Assign multiple subnets to one interface:

```routeros
/ip address add address=192.168.1.1/24 interface=ether2 comment="Primary"
/ip address add address=192.168.2.1/24 interface=ether2 comment="Secondary"
/ip address add address=10.0.0.1/24 interface=ether2 comment="Management"
```

### 4. Private vs. Public IP Planning

**Private (RFC 1918):**
```routeros
# Class A: 10.0.0.0/8 (16M hosts)
/ip address add address=10.10.10.1/24 interface=lan

# Class B: 172.16.0.0/12 (1M hosts)
/ip address add address=172.16.1.1/24 interface=lan

# Class C: 192.168.0.0/16 (65K hosts)
/ip address add address=192.168.1.1/24 interface=lan
```

**Public (Routed on Internet):**
```routeros
# Use ISP-assigned block
/ip address add address=203.0.113.2/27 interface=ether1-wan
```

### 5. DHCP Reservations by MAC

Assign static IPs via DHCP for centralized management:

```routeros
/ip dhcp-server lease add address=192.168.1.50 mac-address=00:0C:29:12:34:56 \
  comment="CEO Laptop" server=dhcp1

/ip dhcp-server lease add address=192.168.1.51 mac-address=A4:B1:C1:D1:E1:F1 \
  comment="Conference Room TV" server=dhcp1
```

### 6. Subnet Monitoring with Netwatch

Monitor critical devices in each subnet:

```routeros
/tool netwatch add host=192.168.1.10 interval=30s \
  up-script=":log info \"File Server UP\"" \
  down-script="/tool e-mail send to=\"admin@company.com\" \
  subject=\"File Server DOWN\" body=\"192.168.1.10 unreachable\""
```

### 7. Inter-VLAN Routing for Subnets

Route between department subnets:

```routeros
# Enable IP routing
/ip route add dst-address=0.0.0.0/0 gateway=wan-gateway

# Create VLANs for subnets
/interface vlan add name=vlan-hr interface=bridge1 vlan-id=10
/interface vlan add name=vlan-sales interface=bridge1 vlan-id=20

# Assign IPs
/ip address add address=10.0.0.1/26 interface=vlan-hr
/ip address add address=10.0.0.65/26 interface=vlan-sales

# Firewall rules for inter-VLAN
/ip firewall filter add chain=forward src-address=10.0.0.0/26 \
  dst-address=10.0.0.64/26 action=accept comment="HR to Sales allowed"
```

### 8. Subnet Documentation Script

Auto-generate subnet documentation:

```routeros
:local subnet "192.168.1.0/24"
:local netmask [/ip address get [find address~$subnet] network]
:local broadcast [/ip address get [find address~$subnet] broadcast]

:put "Subnet: $subnet"
:put "Network: $netmask"
:put "Broadcast: $broadcast"
:log info "Subnet $subnet documented"
```

### 9. DHCP Option 121 (Static Routes via DHCP)

Push routes to DHCP clients:

```routeros
/ip dhcp-server option add name=static-route code=121 \
  value=0x18C0A80A01C0A80101

/ip dhcp-server network set [find address=192.168.1.0/24] \
  dhcp-option=static-route
```

### 10. IPv6 Dual-Stack Subnetting

Run IPv4 and IPv6 simultaneously:

```routeros
# IPv4 subnet
/ip address add address=192.168.1.1/24 interface=ether2

# IPv6 subnet (same interface)
/ipv6 address add address=2001:db8:1234::1/64 interface=ether2

# IPv6 DHCP server
/ipv6 dhcp-server add name=dhcp6 interface=ether2 address-pool=ipv6-pool
```

### 11. Automated Subnet Backup

Export subnet configuration:

```routeros
/system script add name=backup-subnets source={
  :local filename ("subnet-backup-" . [/system clock get date])
  /ip address export file=$filename
  /ip dhcp-server export file=("dhcp-" . $filename)
  :log info "Subnet backup created: $filename"
}

# Schedule weekly backup
/system scheduler add name=weekly-backup on-event=backup-subnets \
  interval=7d start-time=03:00:00
```

### 12. Subnet Bandwidth Limiting

Apply rate limits per subnet:

```routeros
/queue simple add name=guest-subnet target=192.168.100.0/24 \
  max-limit=10M/10M comment="Guest WiFi bandwidth cap"

/queue simple add name=management-subnet target=192.168.1.0/26 \
  priority=1/1 comment="Priority for management"
```

---

## Related Guides

- [OSPF Point-to-Point](../Mikrotik/Routing/ospf-ptp) - Dynamic routing between subnets
- [VPN Game Routing](../Mikrotik/Routing/vpn-game-routing) - Route specific subnets through VPN
- [Guest Bandwidth with DHCP](../Mikrotik/Bandwidth/guest-bandwidth-dhcp-on-up) - DHCP-based QoS
- [Block Tethering via TTL](../Mikrotik/Security/block-tethering-ttl) - Subnet security enforcement
- [Enforce DNS 8.8.8.8](../Mikrotik/Security/enforce-dns-8.8.8.8) - DNS redirection for subnets

---

🎉 **You now understand IP subnetting, CIDR notation, and practical client distribution strategies!** Use this knowledge to design scalable networks with proper segmentation and efficient IP allocation.
