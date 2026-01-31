---
sidebar_position: 5
---

# 🔒 Block Mobile Legends

Block Mobile Legends traffic using Layer7 patterns, IP ranges, and port filtering. This guide provides a practical, repeatable approach for MikroTik networks where gaming traffic needs to be restricted or scheduled.

:::info
This blocks Mobile Legends domains, IP ranges, and known UDP/TCP ports. Update IP ranges and ports as the game infrastructure changes.
:::

## Prerequisites

- ✅ MikroTik RouterOS v6.45+ or v7.x
- ✅ Firewall rules enabled on the router
- ✅ Access via SSH, Winbox, or terminal
- ✅ Basic knowledge of your LAN subnets

:::warning
Layer7 filtering can be CPU‑intensive on busy networks. Test during off‑peak and monitor CPU usage.
:::

## Configuration Steps

### Option A: Terminal

1. **Add Layer7 protocol pattern**
   ```routeros
   /ip firewall layer7-protocol add name=mobile-legends \
       regexp="mlbbgame\\.com|mlbb-mobile-legends\\.com|mlbbnet\\.com|api\\.mobilelegends\\.com"
   ```

2. **Drop traffic matching Layer7 pattern**
   ```routeros
   /ip firewall filter add chain=forward layer7-protocol=mobile-legends \
       action=drop comment="Block Mobile Legends domains"
   ```

3. **Block known IP ranges**
   ```routeros
   /ip firewall filter add chain=forward dst-address=103.21.0.0/16 action=drop \
       comment="Block ML IP Range 103.21.0.0/16"
   /ip firewall filter add chain=forward dst-address=139.59.0.0/16 action=drop \
       comment="Block ML IP Range 139.59.0.0/16"
   /ip firewall filter add chain=forward dst-address=203.116.0.0/16 action=drop \
       comment="Block ML IP Range 203.116.0.0/16"
   ```

4. **Block common UDP ports**
   ```routeros
   /ip firewall filter add chain=forward protocol=udp dst-port=8000-9000 action=drop \
       comment="Block ML UDP Ports 8000-9000"
   /ip firewall filter add chain=forward protocol=udp dst-port=27000-28000 action=drop \
       comment="Block ML UDP Ports 27000-28000"
   ```

5. **(Optional) Block TCP chat port**
   ```routeros
   /ip firewall filter add chain=forward protocol=tcp dst-port=5222 action=drop \
       comment="Block ML TCP Port 5222"
   ```

### Option B: Winbox

1. **Add Layer7 pattern**
   - Go to **IP → Firewall → Layer7 Protocols**
   - Click **Add (+)**
   - **Name:** `mobile-legends`
   - **Regexp:** `mlbbgame\.com|mlbb-mobile-legends\.com|mlbbnet\.com|api\.mobilelegends\.com`

2. **Create filter rule (Layer7)**
   - **IP → Firewall → Filter Rules → Add (+)**
   - **Chain:** `forward`
   - **Layer7 Protocol:** `mobile-legends`
   - **Action:** `drop`
   - **Comment:** `Block Mobile Legends domains`

3. **Block IP ranges**
   - Add three filter rules in **forward** chain with `dst-address`:
     - `103.21.0.0/16`
     - `139.59.0.0/16`
     - `203.116.0.0/16`
   - **Action:** `drop`

4. **Block UDP ports**
   - Add filter rules in **forward** chain
   - **Protocol:** `udp`
   - **Dst. Port:** `8000-9000` and `27000-28000`
   - **Action:** `drop`

5. **(Optional) Block TCP 5222**
   - **Protocol:** `tcp`
   - **Dst. Port:** `5222`
   - **Action:** `drop`

## Understanding the Configuration

**Flow Diagram**

```
[Client] -> [Layer7 Match] -> [IP Range Match] -> [Port Match] -> [Drop]
```

**Components Table**

| Component | Purpose | Notes |
|---|---|---|
| Layer7 regex | Domain pattern match | CPU‑intensive on busy networks |
| IP ranges | Static infra blocks | Update as infra changes |
| UDP ports | Game traffic block | Adjust per release |
| TCP 5222 | Optional chat block | Only if required |

## Verification

1. **Check rule counters**
   ```routeros
   /ip firewall filter print stats where comment~"Block ML"
   ```
2. **Test gameplay** from a client
3. **Monitor logs** (if enabled)
   ```routeros
   /log print where message~"Block ML"
   ```

## Troubleshooting

| Issue | Cause | Solution |
|---|---|---|
| Game still connects | New IP ranges | Add updated ranges |
| L7 not matching | HTTPS encryption | Use IP/port blocks |
| CPU spikes | L7 too heavy | Disable L7, use IP/port only |
| Other apps blocked | Ports overlap | Narrow port ranges |
| Rule not hit | Wrong chain | Use `forward` for LAN → WAN |
| Rules in wrong order | Accept rule above | Move blocks above accept rules |
| Mobile data bypass | Client not routed | Ensure traffic passes router |
| DNS caching | Old DNS data | Flush DNS on clients |
| IPv6 leaks | IPv6 enabled | Add IPv6 firewall blocks |
| Logs empty | Logging disabled | Enable rule logging temporarily |
| Winbox changes not applied | Unsaved | Click **Apply/OK** |
| Partial block only | Missing chat port | Add TCP 5222 rule |

## Advanced Options

1. Add IP ranges to an **address list** and block the list
2. Schedule blocking rules using **Scheduler**
3. Create **layer7 + TLS SNI** rules (RouterOS v7)
4. Separate rules for **guest VLAN** only
5. Combine with **DNS enforcement** to block domains
6. Add **IPv6** rules for AAAA targets
7. Use **raw** table to drop early
8. Log and export blocked attempts to email
9. Create **time-based** rules for school hours
10. Add **rate-limit** rules instead of full drop

## Related Guides

- [Enforce DNS to Google](./enforce-dns-8.8.8.8)
- [Starlink Firewall Rules](./starlink-firewall-rules)
- [Guest Bandwidth Control](../Bandwidth/guest-bandwidth-dhcp-on-up)
- [NetWatch Telegram Alerts](../Monitoring/netwatch-telegram-alerts)

## Completion

✅ **Mobile Legends traffic is now blocked!**

**Next steps:**
- Update IP ranges quarterly
- Monitor CPU usage if Layer7 is enabled
- Document exceptions for admins
