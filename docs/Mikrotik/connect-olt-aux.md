---
sidebar_position: 12
---

# 🌐 Access OLT via Mikrotik


Establish a management connection between your MikroTik router and an OLT (Optical Line Terminal) device via the AUX port. This enables remote management, monitoring, and configuration of your fiber optic network infrastructure. The OLT AUX connection allows you to centrally manage subscriber lines, monitor optical signal levels, and trigger line provisioning from a single control point. Perfect for ISPs managing multi-fiber networks or shared fiber deployments.

:::info
**OLT Overview:**
- OLT = Optical Line Terminal (fiber network hub)
- AUX port = Auxiliary management/control port
- Typical connection: Separate management VLAN or subnet
- Used for: Provisioning, monitoring, backup management
:::

## Prerequisites

- ✅ MikroTik RouterOS device (RB series, HEX, or similar)
- ✅ OLT device with AUX/management port (EPON or GPON)
- ✅ Ethernet cable connecting OLT AUX to MikroTik port (e.g., ether5)
- ✅ OLT AUX port configured in same subnet or routable network
- ✅ Access to RouterOS console (SSH, WebFig, or WinBox)
- ✅ Access to OLT management interface
- ✅ Network diagram showing OLT and MikroTik connectivity

:::warning
**Network topology considerations:**
- Keep OLT AUX on separate interface/VLAN for security
- Do NOT mix OLT data and AUX traffic on same interface
- Firewall rules may need adjustment for OLT communication protocols
- Some OLT vendors use proprietary protocols (not standard TCP/IP)
:::

## Configuration Steps

### Option A: Terminal Configuration

1. **Access the terminal** via SSH, console, or WebFig terminal
   ```bash
   ssh admin@your-router-ip
   ```

2. **Verify the interface (ether5) exists:**
   ```routeros
   /interface ethernet print
   ```
   Should show `ether5` in the list. If using a different port, adjust accordingly.

3. **Assign IP address to OLT AUX interface:**
   ```routeros
   /ip address add address=192.168.8.200/24 interface=ether5
   ```

   :::tip
   **Customize the subnet:**
   - `192.168.8.200/24` assigns IP in 192.168.8.0/24 subnet
   - Gateway typically at .1 (192.168.8.1)
   - Adjust to match your OLT management subnet
   - Verify no IP conflicts with existing networks
   :::

4. **Verify the IP address was assigned:**
   ```routeros
   /ip address print
   ```
   Should show new address on `ether5` interface.

5. **Test connectivity to OLT:**
   ```bash
   ping 192.168.8.1
   ```
   (Replace .1 with actual OLT AUX IP)

6. **Configure NAT for OLT outbound traffic** (if needed):
   ```routeros
   /ip firewall nat add chain=srcnat out-interface=ether4-OLT action=masquerade
   ```

   :::warning
   **NAT considerations:**
   - Only use masquerade if OLT needs to access external networks through ether4
   - For local management only, NAT is usually unnecessary
   - Verify `ether4-OLT` is the correct uplink interface name
   :::

### Option B: WebFig Configuration

#### Part 1: Assign IP Address

1. **Navigate to IP > Addresses:**
   - Click **+** to add new address

2. **Configure the address:**
   - Address: `192.168.8.200/24`
   - Interface: `ether5`
   - Click **OK/Apply**

#### Part 2: Configure NAT (if needed)

3. **Navigate to IP > Firewall > NAT:**
   - Click **+** to add new rule
   - Chain: `srcnat`
   - Out. Interface: `ether4-OLT`
   - Action: `masquerade`
   - Click **OK/Apply**

## Understanding the Configuration

### Network Layout

```
┌─────────────────────┐
│   OLT Device        │
│  (Fiber Hub)        │
│  AUX: 192.168.8.1   │
└──────────┬──────────┘
           │ Ethernet cable
           │ (ether5)
           │
┌──────────▼──────────┐
│   MikroTik Router   │
│  ether5: 192.168.8.200
│  ether4: ISP uplink │
│  ether1-3: Subscribers
└─────────────────────┘
```

### IP Address Configuration

| Parameter | Value | Purpose |
|-----------|-------|---------|
| `address` | 192.168.8.200 | MikroTik management IP |
| `interface` | ether5 | Physical port connected to OLT AUX |
| `/24` (netmask) | 255.255.255.0 | Subnet mask (254 usable IPs) |

**Subnet breakdown:**
- Network: 192.168.8.0
- Gateway: 192.168.8.1 (typically the OLT)
- MikroTik: 192.168.8.200
- Broadcast: 192.168.8.255

### NAT Configuration

```
srcnat chain (Source NAT):
├─ Outgoing traffic
├─ Interface: ether4-OLT
├─ Action: masquerade (hide MikroTik IP, use interface IP)
└─ Purpose: Allow OLT to reach external networks through ISP link
```

**When to use masquerade:**
- OLT needs to access external servers (firmware updates, SNMP collectors)
- Multiple routers sharing same uplink
- **When NOT to use:** Local-only management

## Verification

1. **Verify IP address assignment:**
   ```routeros
   /ip address print
   ```
   Should show: `192.168.8.200/24` on `ether5`

2. **Verify interface is up:**
   ```routeros
   /interface ethernet print status
   ```
   Check `ether5` shows: `running=yes`, `disabled=no`

3. **Test connectivity to OLT:**
   ```bash
   ping 192.168.8.1
   # Should show responses from OLT
   ```

4. **Check routing to OLT:**
   ```routeros
   /ip route print
   ```
   Should show route to 192.168.8.0/24 via ether5

5. **Verify NAT rule (if added):**
   ```routeros
   /ip firewall nat print
   ```
   Should show `srcnat` rule with `out-interface=ether4-OLT`

6. **Test OLT communication:**
   ```bash
   # From MikroTik or management PC
   ping 192.168.8.1  # OLT AUX IP
   telnet 192.168.8.1 22  # If SSH enabled on OLT
   ```

7. **Monitor interface statistics:**
   ```routeros
   /interface ethernet monitor ether5
   ```
   Should show packets sent/received (if OLT is sending keepalives)

8. **Check MAC address learning:**
   ```routeros
   /ip arp print
   ```
   Should show OLT AUX MAC address once packets are received

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Ping to OLT fails | No connectivity or wrong interface | Verify cable is connected to correct port; check interface name with `/interface print` |
| Interface shows down | Interface disabled or cable issue | Enable: `/interface ethernet set [find name=ether5] disabled=no`; check cable |
| Wrong IP assigned | Copy-paste error or subnet conflict | List existing IPs: `/ip address print`; adjust subnet if conflict |
| OLT can't reach external networks | NAT not configured | Add masquerade rule; verify out-interface is correct |
| IP address disappears after reboot | Address not saved to startup config | Backup config: `/system backup save`; verify running config |
| Firewall blocks OLT traffic | Default filter rules too restrictive | Add allow rule: `/ip firewall filter add action=accept src-address=192.168.8.0/24` |
| OLT VLAN traffic not working | VLAN tagging misconfigured | Verify VLAN IDs match OLT config; check bridge VLAN filtering |
| DNS not working from OLT | No DNS server configured | Set DNS: `/ip dns set servers=8.8.8.8,1.1.1.1` |

## Advanced Options

### Separate VLAN for OLT management (security best practice):
```routeros
# Create VLAN 8 for OLT
/interface vlan add name=vlan8-OLT vlan-id=8 interface=ether5

# Assign IP to VLAN instead of physical interface
/ip address add address=192.168.8.200/24 interface=vlan8-OLT

# Apply VLAN tagging on switch if applicable
/interface bridge port set [find interface=ether5] pvid=8
```

### Monitor OLT reachability continuously:
```routeros
# Create monitoring script
/system script add name="olt-monitor" source={
    :if ([:ping 192.168.8.1 count=1] = 0) do={
        :log error "OLT AUX unreachable!"
        # Trigger alert (see NetWatch Telegram guide)
    }
}

# Schedule every 5 minutes
/system scheduler add name="olt-check" on-event="olt-monitor" interval=5m
```

### Static route with priority (if multiple paths to OLT):
```routeros
/ip route add dst-address=192.168.8.0/24 gateway=192.168.8.1 \
    routing-table=main distance=10 comment="OLT Management Route"
```

### Firewall rule to allow OLT traffic only:
```routeros
/ip firewall filter add action=accept chain=input src-address=192.168.8.0/24 \
    protocol=tcp dst-port=22,23,80,161 comment="OLT Management Ports"

/ip firewall filter add action=accept chain=forward src-address=192.168.8.0/24 \
    comment="Allow OLT to external networks"
```

### Create backup link to OLT (failover):
```routeros
# Primary: ether5
/ip address add address=192.168.8.200/24 interface=ether5

# Backup: ether6 (secondary connection)
/ip address add address=192.168.8.201/24 interface=ether6

# Route with failover (ether6 only if ether5 down)
/ip route add dst-address=192.168.8.0/24 gateway=192.168.8.1 \
    interface=ether5 distance=5
/ip route add dst-address=192.168.8.0/24 gateway=192.168.8.1 \
    interface=ether6 distance=10
```

### SNMP monitoring of OLT metrics:
```routeros
/snmp set enabled=yes
/snmp community add name=public security=none read-access=yes
```
(Then query OLT stats via SNMP from monitoring server)

### Packet capture for OLT protocol debugging:
```routeros
/tool packet-sniffer set filter-interface=ether5 filter-direction=both

/tool packet-sniffer start
# Let capture run for a minute
/tool packet-sniffer stop
/tool packet-sniffer print
```

### Bandwidth limit for OLT management traffic (if interfering):
```routeros
/queue simple add name="OLT-Mgmt" target=192.168.8.0/24 \
    max-limit=10M/10M comment="OLT Management Bandwidth"
```

### DHCP server for OLT (if multiple OLT units need auto-configuration):
```routeros
/ip pool add name=olt-pool ranges=192.168.8.10-192.168.8.100

/ip dhcp-server network add address=192.168.8.0/24 dns-server=8.8.8.8 gateway=192.168.8.1

/ip dhcp-server add name=olt-dhcp interface=ether5 address-pool=olt-pool disabled=no
```

## Common OLT Protocols & Ports

| Protocol | Port | Purpose |
|----------|------|---------|
| SSH | 22 | Secure shell (preferred) |
| Telnet | 23 | Legacy unencrypted access |
| HTTP | 80 | Web management interface |
| HTTPS | 443 | Secure web interface |
| SNMP | 161 | Network monitoring (UDP) |
| Syslog | 514 | Event logging (UDP) |
| OMCI | 8000+ | OLT Management Channel Interface (vendor-specific) |

:::warning
**Firewall rules:** You may need to allow these ports if default-drop policy is enabled.
:::

## OLT Vendor Specifics

### Common OLT Manufacturers

| Vendor | Model | AUX Port | Default IP |
|--------|-------|----------|------------|
| ZTE | C300/C320 | RJ45 Eth | 192.168.1.1 |
| Huawei | MA5683T | RJ45 Eth | 192.168.0.1 |
| Calix | C7 | Mgmt Port | 192.168.100.1 |
| Alcatel-Lucent | 7360 | Mgmt Card | Custom |
| Ciena | NFVI | Mgmt NIC | DHCP |

**Consult your OLT manual for specific port names and default IPs.**

## Next Steps in OLT Integration

This guide covers basic AUX connection. For full OLT setup, see complementary guides:
- **VLAN configuration** for subscriber lines
- **QoS policies** for service prioritization
- **Monitoring dashboards** with [NetWatch Telegram Alerts](./netwatch-telegram-alerts.md)
- **Backup/failover** scenarios

## Related Configurations

- **NetWatch monitoring:** See [NetWatch Telegram Alerts](./netwatch-telegram-alerts.md)
- **Firewall rules:** See [Starlink Firewall Rules](./starlink-firewall-rules.md)
- **VLAN management:** Consult MikroTik VLAN documentation
- **QoS setup:** See [Guest Bandwidth Control](./guest-bandwidth-dhcp-on-up.md) for queue concepts

## Completion

✅ **OLT AUX connection is now established!**

**Next steps:**
- Test connectivity: `ping 192.168.8.1`
- Log into OLT management interface
- Configure OLT subscriber line provisioning
- Set up monitoring alerts (see [NetWatch Telegram](./netwatch-telegram-alerts.md))
- Document IP addressing scheme for team
- Back up configuration: `/system backup save`
- Schedule failover testing quarterly
- Create troubleshooting runbook for on-call team

**Tip:** Keep this connection separate from production data for security. Use dedicated VLAN (8 or higher) if your MikroTik supports it.
