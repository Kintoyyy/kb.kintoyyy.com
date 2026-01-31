---
sidebar_position: 18
---

# 🏗️ PPPoE QinQ Multi-OLT

Deploy PPPoE server with QinQ (IEEE 802.1ad) VLAN tagging to aggregate multiple OLT connections through cascaded CRS switches. QinQ encapsulates customer VLANs inside service provider VLANs, allowing isolation of traffic from different OLTs while maintaining scalability. PPPoE server terminates user sessions and dynamically injects inner VLANs, while CRS317 switches handle VLAN filtering and tag manipulation. Useful for ISPs with fiber infrastructure, multiple OLT locations, and large subscriber counts (1000+).

:::info
**What this does:**
- Creates QinQ service VLANs (S-VLANs) on PPPoE server
- Configures PPPoE-over-VLAN-range for automatic inner VLAN handling
- Routes traffic through CRS317 switches with VLAN filtering
- Connects multiple OLT devices with isolated VLANs
- Supports optional inner VLAN injection for custom routing
- Enables scalable multi-location fiber networks
:::

## Prerequisites

- ✅ MikroTik PPPoE server (RouterOS with PPP support)
- ✅ Two or more CRS317 switches (or CRS3xx with QinQ support)
- ✅ OLT devices connected to CRS switches
- ✅ Understanding of QinQ (802.1ad) vs regular VLANs (802.1q)
- ✅ Network connectivity between PPPoE server → CRS → OLT
- ✅ VLAN 2000, 2001 available (adjust as needed)
- ✅ RouterOS v6.43+ (QinQ support)

:::warning
**QinQ deployment considerations:**
- QinQ uses ethertype 0x88a8 (not standard 0x8100)
- CRS switches MUST enable `ether-type=0x88a8` on bridge
- VLAN filtering required on CRS bridges (`vlan-filtering=yes`)
- PPPoE-over-VLAN-range automatically creates inner VLANs
- Each OLT should have dedicated service VLAN (S-VLAN)
- QinQ adds 8 bytes overhead (consider MTU on links)
- Not all switches support QinQ—verify hardware compatibility
:::

## Configuration Steps

### Option A: Terminal Configuration

#### PPPoE Server Configuration

1. **Access PPPoE server terminal:**
   ```bash
   ssh admin@pppoe-server-ip
   ```

2. **Create QinQ service VLANs (S-VLANs):**
   ```routeros
   /interface vlan
   add interface="ether1-to CRS" name=svlan2000 use-service-tag=yes vlan-id=2000
   add interface="ether1-to CRS" name=svlan2001 use-service-tag=yes vlan-id=2001
   ```

   :::tip
   Replace `ether1-to CRS` with your actual interface connected to CRS switch
   :::

3. **Configure PPPoE servers with VLAN ranges:**
   ```routeros
   /interface pppoe-server server
   add disabled=no interface=svlan2000 pppoe-over-vlan-range=1,10,200,11 \
       service-name=service1
   
   add disabled=no interface=svlan2001 pppoe-over-vlan-range=1,10,200 \
       service-name=service2
   ```

   **VLAN Range Explanation:**
   - `1,10,200,11` = Creates VLANs 1-10, 200, and 11
   - PPPoE dynamically creates inner VLANs when users connect

4. **Optional: Create inner VLAN manually for custom routing:**
   ```routeros
   /interface vlan
   add interface=svlan2000 name=vlan11 vlan-id=11
   
   /interface pppoe-server server
   add disabled=no interface=vlan11 service-name=service3
   ```

5. **Verify PPPoE server configuration:**
   ```routeros
   /interface vlan print
   /interface pppoe-server server print
   ```

#### CRS317 Switch 1 Configuration

1. **SSH to CRS317 switch 1:**
   ```bash
   ssh admin@crs1-ip
   ```

2. **Create bridge with QinQ support:**
   ```routeros
   /interface bridge
   add ether-type=0x88a8 name=br0 vlan-filtering=yes
   ```

3. **Add ports to bridge:**
   ```routeros
   /interface bridge port
   add bridge=br0 interface="ether1 to PPPoE Server"
   add bridge=br0 interface="ether3-to olt" pvid=2000
   add bridge=br0 interface="ether2 to CRS2"
   ```

4. **Configure VLAN filtering:**
   ```routeros
   /interface bridge vlan
   # Untagged port for outer VLAN (OLT on this switch)
   add bridge=br0 tagged="ether1 to PPPoE Server" \
       untagged="ether3-to olt" vlan-ids=2000
   
   # Tagged VLAN to next switch (CRS2)
   add bridge=br0 tagged="ether1 to PPPoE Server,ether2 to CRS2" \
       vlan-ids=2001
   ```

5. **Verify CRS1 configuration:**
   ```routeros
   /interface bridge print
   /interface bridge port print
   /interface bridge vlan print
   ```

#### CRS317 Switch 2 Configuration

1. **SSH to CRS317 switch 2:**
   ```bash
   ssh admin@crs2-ip
   ```

2. **Create bridge with QinQ support:**
   ```routeros
   /interface bridge
   add ether-type=0x88a8 name=bridge1 vlan-filtering=yes
   ```

3. **Add ports to bridge:**
   ```routeros
   /interface bridge port
   add bridge=bridge1 interface="ether1 crs"
   add bridge=bridge1 interface="ether2 olt" pvid=2001
   ```

4. **Configure VLAN filtering:**
   ```routeros
   /interface bridge vlan
   # Untagged port for outer VLAN (OLT on this switch)
   add bridge=bridge1 tagged="ether1 crs" \
       untagged="ether2 olt" vlan-ids=2001
   ```

5. **Verify CRS2 configuration:**
   ```routeros
   /interface bridge print
   /interface bridge port print
   /interface bridge vlan print
   ```

### Option B: Winbox Configuration

#### PPPoE Server (Winbox)

1. **Create QinQ VLANs:**
   - Navigate to Interfaces > VLAN
   - Click **+**
   - Name: `svlan2000`
   - VLAN ID: `2000`
   - Interface: `ether1-to CRS`
   - Use Service Tag: ✓ (checked)
   - Click **OK**
   - Repeat for `svlan2001` with VLAN ID `2001`

2. **Configure PPPoE servers:**
   - Navigate to Interfaces > PPPoE Server
   - Click **+**
   - Interface: `svlan2000`
   - Service Name: `service1`
   - PPPoE Over VLAN Range: `1,10,200,11`
   - Click **OK**
   - Repeat for `svlan2001` with service name `service2` and range `1,10,200`

#### CRS317 Switch 1 (Winbox)

1. **Create bridge:**
   - Navigate to Bridge
   - Click **+**
   - Name: `br0`
   - VLAN Filtering: ✓ (checked)
   - Ether Type: `0x88a8`
   - Click **OK**

2. **Add bridge ports:**
   - Navigate to Bridge > Ports
   - Add three ports:
     - Bridge: `br0`, Interface: `ether1 to PPPoE Server`
     - Bridge: `br0`, Interface: `ether3-to olt`, PVID: `2000`
     - Bridge: `br0`, Interface: `ether2 to CRS2`

3. **Configure VLAN filtering:**
   - Navigate to Bridge > VLANs
   - Add VLAN 2000:
     - Bridge: `br0`
     - VLAN IDs: `2000`
     - Tagged: `ether1 to PPPoE Server`
     - Untagged: `ether3-to olt`
   - Add VLAN 2001:
     - Bridge: `br0`
     - VLAN IDs: `2001`
     - Tagged: `ether1 to PPPoE Server, ether2 to CRS2`

#### CRS317 Switch 2 (Winbox)

1. **Create bridge:**
   - Navigate to Bridge
   - Click **+**
   - Name: `bridge1`
   - VLAN Filtering: ✓
   - Ether Type: `0x88a8`
   - Click **OK**

2. **Add bridge ports:**
   - Navigate to Bridge > Ports
   - Add:
     - Bridge: `bridge1`, Interface: `ether1 crs`
     - Bridge: `bridge1`, Interface: `ether2 olt`, PVID: `2001`

3. **Configure VLAN:**
   - Navigate to Bridge > VLANs
   - Add:
     - Bridge: `bridge1`
     - VLAN IDs: `2001`
     - Tagged: `ether1 crs`
     - Untagged: `ether2 olt`

## Understanding the Configuration

### Network Architecture

```
                   ┌─────────────────────────────────────┐
                   │    PPPoE Server (QinQ VLANs)        │
                   │  - svlan2000 (S-VLAN for OLT1)      │
                   │  - svlan2001 (S-VLAN for OLT2)      │
                   │  - PPPoE-over-VLAN-range enabled    │
                   └─────────────────┬───────────────────┘
                                     │ ether1-to CRS
                                     │ (QinQ tagged: 2000, 2001)
                                     ↓
                   ┌─────────────────────────────────────┐
                   │      CRS317 Switch 1 (br0)          │
                   │  - ether-type: 0x88a8 (QinQ)        │
                   │  - VLAN filtering: enabled          │
                   └───┬───────────────┬─────────────────┘
                       │               │
         VLAN 2000     │               │ VLAN 2001
         untagged      │               │ tagged
                       ↓               ↓
            ┌──────────────┐  ┌──────────────────────┐
            │ OLT 1        │  │ CRS317 Switch 2      │
            │ (ether3)     │  │ (ether2 to CRS2)     │
            └──────────────┘  └───────┬──────────────┘
                                      │ VLAN 2001
                                      │ untagged
                                      ↓
                              ┌──────────────┐
                              │ OLT 2        │
                              │ (ether2)     │
                              └──────────────┘

Users connect to OLT1/OLT2 → Traffic encapsulated in QinQ
                           → Inner VLAN auto-created by PPPoE server
                           → Routed through appropriate S-VLAN
```

### QinQ VLAN Flow

```
User PPPoE request at OLT1
     ↓
OLT adds inner VLAN tag (C-VLAN, e.g., VLAN 5)
     ↓
CRS1 receives untagged on ether3 → adds S-VLAN 2000 (PVID)
     ↓
Packet now: [S-VLAN 2000 | C-VLAN 5 | PPPoE data]
     ↓
CRS1 forwards to PPPoE server via ether1 (tagged 2000)
     ↓
PPPoE server receives on svlan2000
     ↓
PPPoE-over-VLAN-range creates dynamic VLAN interface for inner VLAN 5
     ↓
User authenticated → Assigned IP → Traffic routed
```

### Component Relationships

| Component | Role | VLAN Handling |
|-----------|------|---------------|
| PPPoE Server | Terminates user sessions, authenticates | Receives QinQ, extracts inner VLANs |
| S-VLAN 2000 | Service VLAN for OLT1 traffic | Outer tag for isolation |
| S-VLAN 2001 | Service VLAN for OLT2 traffic | Outer tag for isolation |
| CRS317 Switch 1 | Aggregates OLT1 + forwards to PPPoE + CRS2 | Tags/untags VLANs per port |
| CRS317 Switch 2 | Connects OLT2 to network | Tags/untags VLAN 2001 |
| OLT Devices | Fiber access points for end users | Adds inner C-VLAN tags |

### QinQ vs Regular VLAN

| Feature | Regular VLAN (802.1q) | QinQ (802.1ad) |
|---------|----------------------|----------------|
| Ethertype | 0x8100 | 0x88a8 |
| Tag Depth | Single tag | Double tag (S-VLAN + C-VLAN) |
| Use Case | Local networks | Service provider networks |
| Scalability | 4094 VLANs max | 4094 × 4094 = ~16M VLANs |
| Overhead | 4 bytes | 8 bytes |

## Verification

1. **Check QinQ VLANs on PPPoE server:**
   ```routeros
   /interface vlan print
   ```
   Should show: `svlan2000`, `svlan2001` with `use-service-tag=yes`

2. **Verify PPPoE-over-VLAN-range:**
   ```routeros
   /interface pppoe-server server print
   ```
   Should show ranges configured

3. **Check CRS1 bridge ethertype:**
   ```routeros
   /interface bridge print
   ```
   Should show: `ether-type=0x88a8`

4. **Verify VLAN filtering enabled:**
   ```routeros
   /interface bridge print where vlan-filtering=yes
   ```

5. **Test user connection from OLT1:**
   - User connects via PPPoE
   - Monitor on PPPoE server:
   ```routeros
   /interface pppoe-server print stats
   /ppp active print
   ```

6. **Check dynamic VLAN creation:**
   ```routeros
   /interface vlan print where dynamic=yes
   ```
   Should show auto-created inner VLANs

7. **Monitor VLAN traffic on CRS:**
   ```routeros
   /interface bridge vlan print stats
   ```

8. **Verify OLT connectivity:**
   ```bash
   # From PPPoE server, ping OLT management IPs
   ping olt1-ip
   ping olt2-ip
   ```

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Users can't authenticate | QinQ ethertype wrong on CRS | Verify: `/interface bridge print` shows `ether-type=0x88a8` |
| VLAN traffic not passing | VLAN filtering disabled | Enable: `/interface bridge set br0 vlan-filtering=yes` |
| CRS1 not forwarding to CRS2 | VLAN 2001 not tagged on interconnect | Add to tagged: `/interface bridge vlan add bridge=br0 tagged="ether2 to CRS2" vlan-ids=2001` |
| OLT traffic loops | STP not enabled on CRS | Enable: `/interface bridge set br0 protocol-mode=rstp` |
| PPPoE server doesn't see inner VLANs | `use-service-tag` not set | Set on S-VLANs: `/interface vlan set svlan2000 use-service-tag=yes` |
| Users on wrong S-VLAN | PVID misconfigured on CRS port | Check: `/interface bridge port print` verify PVID on OLT ports |
| Dynamic VLANs not created | PPPoE-over-VLAN-range wrong | Verify range syntax: `1,10,200` creates VLANs 1-10 and 200 |
| Packet loss on QinQ | MTU too small (QinQ adds 8 bytes) | Increase MTU: `/interface set ether1 mtu=1522` |
| CRS switch CPU high | VLAN filtering in software | Use CRS3xx switches with hardware VLAN offload |
| Inter-VLAN routing fails | No routing between S-VLANs | Add firewall/route rules on PPPoE server |
| OLT2 offline | CRS2 bridge misconfigured | Verify: `/interface bridge vlan print` on CRS2 shows VLAN 2001 |
| PPPoE service name conflicts | Same service-name on multiple S-VLANs | Use unique names: `service1`, `service2`, `service3` |

## Advanced Options

### Add third OLT with dedicated S-VLAN:
```routeros
# PPPoE Server
/interface vlan add interface="ether1-to CRS" name=svlan2002 use-service-tag=yes vlan-id=2002
/interface pppoe-server server add interface=svlan2002 pppoe-over-vlan-range=1,10 service-name=service-olt3

# CRS1: Add tagged VLAN 2002
/interface bridge vlan add bridge=br0 tagged="ether1 to PPPoE Server,ether4-to olt3" vlan-ids=2002
```

### Enable RADIUS authentication for PPPoE users:
```routeros
/ppp aaa set use-radius=yes
/radius add address=radius-server-ip service=ppp
```

### Configure per-VLAN bandwidth limits:
```routeros
/queue simple add name="OLT1-QoS" target=svlan2000 max-limit=1G/1G
/queue simple add name="OLT2-QoS" target=svlan2001 max-limit=500M/500M
```

### Add backup link between CRS switches (LAG):
```routeros
# CRS1
/interface bonding add name=lag1 slaves="ether2 to CRS2,ether5-backup" mode=802.3ad
/interface bridge port add bridge=br0 interface=lag1

# CRS2
/interface bonding add name=lag1 slaves="ether1 crs,ether5-backup" mode=802.3ad
/interface bridge port add bridge=bridge1 interface=lag1
```

### Monitor QinQ traffic with packet sniffer:
```routeros
/tool sniffer quick interface="ether1-to CRS" ip-protocol=pppoe
```

### Create VLAN translation (map C-VLAN to different S-VLAN):
```routeros
/interface vlan add interface=svlan2000 name=vlan-translate vlan-id=100
/interface pppoe-server server add interface=vlan-translate service-name=custom
```

### Enable firewall rules per S-VLAN:
```routeros
/ip firewall filter add chain=forward in-interface=svlan2000 action=accept comment="OLT1 traffic"
/ip firewall filter add chain=forward in-interface=svlan2001 action=accept comment="OLT2 traffic"
```

### Add IP pool per S-VLAN:
```routeros
/ip pool add name=pool-olt1 ranges=10.1.0.2-10.1.255.254
/ip pool add name=pool-olt2 ranges=10.2.0.2-10.2.255.254
/ppp profile add name=profile-olt1 remote-address=pool-olt1
```

### Configure MAC-based S-VLAN assignment:
```routeros
/interface bridge vlan add bridge=br0 tagged="ether1 to PPPoE Server" mac-address=aa:bb:cc:dd:ee:ff vlan-ids=2000
```

### Enable IGMP snooping for multicast (IPTV):
```routeros
/interface bridge set br0 igmp-snooping=yes
/interface bridge vlan add bridge=br0 tagged="ether1 to PPPoE Server,ether3-to olt" vlan-ids=100 comment="IPTV VLAN"
```

## Related Guides

- [RADIUS Server Integration](./radius-server-integration) - Central authentication
- [Access Concentrator Setup](./access-concentrator-setup) - PPPoE AC configuration
- [Connect OLT](./connect-olt-aux) - OLT management connectivity
- [Guest Bandwidth DHCP](../Bandwidth/guest-bandwidth-dhcp-on-up) - QoS profiles

## Completion

✅ **PPPoE QinQ multi-OLT network configured!**

**Next steps:**
- Test user authentication from each OLT
- Monitor traffic on S-VLANs: `/interface vlan print stats`
- Configure RADIUS for centralized billing
- Add redundant uplinks between switches
- Set up per-OLT QoS policies
- Document OLT → S-VLAN mappings
- Back up configuration: `/system backup save`
