---
sidebar_position: 15
---

# 🚀 Speedtest PBR

Detect speedtest traffic in real-time and route it through a dedicated gateway using policy-based routing (PBR). Speedtest detection identifies large, sustained transfers (800KB+, 2-500Mbps connection rate) on TCP port 443 to external addresses. Routes these packets through a separate `to-speedtest` routing table, preventing speedtest from saturating primary WAN or mixing with other high-bandwidth traffic. Useful for multi-WAN setups, separating speedtest from production traffic, or testing alternate ISP connections.

:::info
**What this does:**
- Detects speedtest traffic by connection rate and size
- Marks connections based on port 8080 (local) and port 443 (remote)
- Routes identified traffic through dedicated routing table
- Keeps speedtest from interfering with regular users
:::

## Prerequisites

- ✅ MikroTik RouterOS with mangle/routing support
- ✅ Multiple WAN connections or dedicated gateway
- ✅ Local network defined via address list (`local-ip`)
- ✅ Access to RouterOS console (terminal, Winbox, or WinBox)
- ✅ RouterOS v6.41+

:::warning
**Speedtest detection notes:**
- Requires address lists: `local-ip` (your local networks)
- Connection rate detection needs some traffic to work
- May trigger on legitimate large downloads (torrents, backups)
- Test before enabling on production network
:::

## Configuration Steps

### Option A: Terminal Configuration

1. **Access the terminal:**
   ```bash
   ssh admin@your-router-ip
   ```

2. **Create local IP address list** (if not already present):
   ```routeros
   /ip firewall address-list
   add address=192.168.1.0/24 list=local-ip comment="Local Network"
   add address=10.0.0.0/8 list=local-ip comment="Internal Networks"
   ```

3. **Create routing table for speedtest:**
   ```routeros
   /routing table add disabled=no fib name=to-speedtest
   ```

4. **Add mangle rules - detect speedtest connections:**
   ```routeros
   /ip firewall mangle add action=mark-connection chain=prerouting \
       connection-state=established,new dst-address-list=local-ip \
       new-connection-mark=speedtest_conn protocol=tcp \
       src-address-list=!local-ip src-port=8080 \
       comment="PBR SPEEDTEST - Incoming test"
   ```

5. **Add mangle rule - local to external on port 8080:**
   ```routeros
   /ip firewall mangle add action=mark-connection chain=prerouting \
       connection-state=established,new dst-address-list=!local-ip \
       new-connection-mark=speedtest_conn protocol=tcp \
       src-address-list=local-ip dst-port=8080 \
       comment="PBR SPEEDTEST - Outgoing test"
   ```

6. **Add high-bandwidth detection on HTTPS (port 443):**
   ```routeros
   /ip firewall mangle add action=mark-connection chain=prerouting \
       connection-bytes=800000-0 connection-rate=2M-500M \
       connection-state=established,new dst-address-list=!local-ip \
       new-connection-mark=speedtest_conn port=443 protocol=tcp \
       src-address-list=local-ip \
       comment="PBR SPEEDTEST - High bandwidth HTTPS"
   ```

7. **Route marked traffic through speedtest table:**
   ```routeros
   /ip firewall mangle add action=mark-routing chain=prerouting \
       connection-mark=speedtest_conn dst-address-list=!local-ip \
       new-routing-mark=to-speedtest passthrough=no \
       src-address-list=local-ip \
       comment="PBR SPEEDTEST - Apply routing mark"
   ```

8. **Add route to speedtest gateway** (replace SPEEDTEST_GW with actual IP):
   ```routeros
   /ip route add disabled=no distance=1 dst-address=0.0.0.0/0 \
       gateway="SPEEDTEST_GW" routing-table=to-speedtest \
       comment="Speedtest traffic via dedicated gateway"
   ```

9. **Verify configuration:**
   ```routeros
   /ip firewall address-list print where list=local-ip
   /routing table print where name=to-speedtest
   /ip firewall mangle print where comment~"SPEEDTEST"
   /ip route print
   ```

### Option B: Winbox Configuration

1. **Setup local IP address list:**
   - Navigate to IP > Firewall > Address List
   - Add entries:
     - Address: `192.168.1.0/24`, List: `local-ip`
     - Address: `10.0.0.0/8`, List: `local-ip`

2. **Create routing table:**
   - Navigate to Routing > Tables
   - Click **+**
   - Name: `to-speedtest`
   - FIB: Checked
   - Click **OK**

3. **Add mangle rule - port 8080 detection:**
   - Navigate to IP > Firewall > Mangle
   - Click **+**
   - Chain: `prerouting`
   - Src. Address List: `!local-ip`
   - Dst. Address List: `local-ip`
   - Src. Port: `8080`
   - Protocol: `tcp`
   - Connection State: `established,new`
   - Action: `mark-connection`
   - New Connection Mark: `speedtest_conn`
   - Comment: `PBR SPEEDTEST - Incoming test`
   - Click **OK**

4. **Add mangle rule - local outgoing port 8080:**
   - Click **+**
   - Chain: `prerouting`
   - Src. Address List: `local-ip`
   - Dst. Address List: `!local-ip`
   - Dst. Port: `8080`
   - Protocol: `tcp`
   - Connection State: `established,new`
   - Action: `mark-connection`
   - New Connection Mark: `speedtest_conn`
   - Comment: `PBR SPEEDTEST - Outgoing test`
   - Click **OK**

5. **Add mangle rule - high bandwidth HTTPS:**
   - Click **+**
   - Chain: `prerouting`
   - Src. Address List: `local-ip`
   - Dst. Address List: `!local-ip`
   - Port: `443`
   - Protocol: `tcp`
   - Connection Bytes: `800000-0` (800KB+)
   - Connection Rate: `2M-500M` (2-500 Mbps)
   - Connection State: `established,new`
   - Action: `mark-connection`
   - New Connection Mark: `speedtest_conn`
   - Comment: `PBR SPEEDTEST - High bandwidth HTTPS`
   - Click **OK**

6. **Add routing mark rule:**
   - Click **+**
   - Chain: `prerouting`
   - Connection Mark: `speedtest_conn`
   - Src. Address List: `local-ip`
   - Dst. Address List: `!local-ip`
   - Action: `mark-routing`
   - New Routing Mark: `to-speedtest`
   - Passthrough: Unchecked
   - Comment: `PBR SPEEDTEST - Apply routing mark`
   - Click **OK**

7. **Add route:**
   - Navigate to IP > Routes
   - Click **+**
   - Dst. Address: `0.0.0.0/0`
   - Gateway: `SPEEDTEST_GW` (your alternate gateway)
   - Routing Table: `to-speedtest`
   - Distance: `1`
   - Comment: `Speedtest traffic via dedicated gateway`
   - Click **OK**

## Understanding the Configuration

### Detection Logic

```
Traffic arrives at router
     ↓
Check 1: Port 8080 (speedtest client/server)?
         ✓ YES → Mark as speedtest_conn
     ↓
Check 2: HTTPS (port 443) + 800KB+ + 2-500Mbps rate?
         ✓ YES → Mark as speedtest_conn
     ↓
Mangle rule sees speedtest_conn mark
     ↓
Routes through: to-speedtest table
     ↓
Packet exits via: SPEEDTEST_GW gateway
```

### Mangle Rules Breakdown

| Rule | Purpose | Trigger |
|------|---------|---------|
| Port 8080 in | Detect incoming speedtest | External → port 8080 on local |
| Port 8080 out | Detect outgoing speedtest | Local → port 8080 external |
| HTTPS rate | Detect sustained transfers | HTTPS + 800KB+ + 2-500Mbps |
| Mark-routing | Apply routing table | Match speedtest_conn |

## Verification

1. **Confirm routing table created:**
   ```routeros
   /routing table print
   ```
   Should show: `to-speedtest`

2. **Check mangle rules:**
   ```routeros
   /ip firewall mangle print where comment~"SPEEDTEST"
   ```

3. **Verify address list:**
   ```routeros
   /ip firewall address-list print where list=local-ip
   ```

4. **Test speedtest traffic:**
   - Run speedtest from client on your network
   - Monitor mangle stats:
     ```routeros
     /ip firewall mangle print stats
     ```
   - Counters should increase for speedtest rules

5. **Monitor routing:**
   ```routeros
   /ip firewall connection print where mark=speedtest_conn
   ```

6. **Check route usage:**
   ```routeros
   /ip route print stats
   ```

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Mangle rules not matching | local-ip address list missing | Create address list: `/ip firewall address-list add address=192.168.1.0/24 list=local-ip` |
| Speedtest still slow | Marked traffic ignored | Verify routing table exists and route uses correct gateway |
| Wrong traffic routed | Port 8080 rule too broad | Narrow to specific IPs: `add src-address=speedtest-ip list=speedtest-servers` |
| No traffic marked | Rate detection too strict | Lower connection-rate: `connection-rate=1M-500M` |
| Address list not resolving | DNS resolution delay | Use IP addresses instead of hostnames for address list |
| Gateway unreachable | SPEEDTEST_GW invalid | Verify gateway IP matches actual ISP gateway |
| Connection marks not appearing | Connection not established | Wait for traffic to establish, check chain=prerouting |

## Advanced Options

### Detect Ookla speedtest servers specifically:
```routeros
/ip firewall address-list add address=speedtest-servers list=speedtest-ips \
    comment="Known speedtest server IP"
```
Then add rule:
```routeros
/ip firewall mangle add action=mark-connection chain=prerouting \
    dst-address-list=speedtest-ips new-connection-mark=speedtest_conn
```

### Route via interface instead of gateway:
```routeros
/ip route add dst-address=0.0.0.0/0 interface="WAN2" \
    routing-table=to-speedtest distance=1
```

### Add QoS to speedtest traffic:
```routeros
/queue simple add name="Speedtest Limiter" \
    target=0.0.0.0/0 max-limit=100M/100M \
    comment="Cap speedtest bandwidth"
```

### Redirect speedtest to measurement WAN:
```routeros
/ip route add dst-address=0.0.0.0/0 gateway=MEASUREMENT_ISP \
    routing-table=to-speedtest distance=1
```

### Detect specific bandwidth threshold:
```routeros
/ip firewall mangle add action=mark-connection chain=prerouting \
    connection-rate=500M-0 new-connection-mark=high-bandwidth \
    comment="Ultra-high bandwidth detection"
```

### Add honeypot address list to exclude:
```routeros
/ip firewall address-list add address=192.168.1.100 list=exclude-speedtest
/ip firewall mangle add action=mark-connection chain=prerouting \
    dst-address-list=!exclude-speedtest \
    connection-rate=2M-500M new-connection-mark=speedtest_conn
```

### Log speedtest events:
```routeros
/ip firewall mangle add action=log-and-mark-connection \
    chain=prerouting connection-mark=speedtest_conn \
    new-connection-mark=speedtest_conn log-prefix="SPEEDTEST: "
```

### Route speedtest through VPN:
```routeros
/ip route add dst-address=0.0.0.0/0 gateway=VPN_ENDPOINT \
    routing-table=to-speedtest distance=1 comment="Speedtest via VPN"
```

## Related Guides

- [VPN Game Routing](./vpn-game-routing)
- [Cloud DDNS Routing](./cloud-ddns-routing)
- [Guest Bandwidth](../Bandwidth/guest-bandwidth-dhcp-on-up)

## Completion

✅ **Speedtest traffic routing is configured!**

**Next steps:**
- Run speedtest and verify routing table is used
- Monitor bandwidth on primary vs speedtest gateway
- Adjust connection-rate threshold if needed
- Log speedtest events for monitoring
- Back up configuration: `/system backup save`
