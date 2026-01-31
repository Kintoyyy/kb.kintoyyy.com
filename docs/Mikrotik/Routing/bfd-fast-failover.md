---
sidebar_position: 5
---

# ⚡ BFD Failover

Bidirectional Forwarding Detection (BFD) provides sub‑second link failure detection for OSPF, BGP, and static routes. This guide enables BFD on MikroTik RouterOS v7 to achieve faster failover and smoother reconvergence.

:::info
BFD works best on point‑to‑point links and stable transport. Use conservative timers if you have noisy links or high CPU usage.
:::

## Prerequisites

- ✅ MikroTik RouterOS v7.x
- ✅ Two routers with a direct link (PTP recommended)
- ✅ OSPF or BGP already configured
- ✅ Administrative access via Winbox/SSH
- ✅ Firewall allows UDP 3784/3785 (BFD)

:::warning
Aggressive BFD timers can cause flapping on unstable links. Start with safe values and tune gradually.
:::

## Configuration Steps

### Option A: Terminal

1. **Enable BFD on an interface**
   ```routeros
   /routing bfd interface add interface=vlan10-OSPF required-min-rx=200ms desired-min-tx=200ms detect-mult=3
   ```

2. **Enable BFD for OSPF**
   ```routeros
   /routing ospf interface-template set [find interfaces=vlan10-OSPF] bfd=yes
   ```

3. **Verify BFD sessions**
   ```routeros
   /routing bfd session print
   ```

### Option B: Winbox

1. **Routing → BFD → Interfaces → Add (+)**
   - **Interface:** `vlan10-OSPF`
   - **Desired Min TX:** `200ms`
   - **Required Min RX:** `200ms`
   - **Detect Mult:** `3`

2. **Routing → OSPF → Interface Templates**
   - Select your PTP interface
   - Enable **BFD**

3. **Routing → BFD → Sessions**
   - Confirm state is **Up**

## Understanding the Configuration

**Flow Diagram**

```
[Link] -> [BFD Session] -> [OSPF/BGP] -> [Fast Failover]
```

**Components Table**

| Component | Purpose | Notes |
|---|---|---|
| BFD interface | Link monitoring | Per‑interface settings |
| OSPF template | Routing integration | `bfd=yes` |
| BFD session | Detection state | Should show **Up** |
| Timers | Failover speed | Lower = faster, riskier |

## Verification

1. **Check BFD sessions**
   ```routeros
   /routing bfd session print
   ```
2. **Check OSPF neighbors**
   ```routeros
   /routing ospf neighbor print
   ```
3. **Simulate link failure**
   - Disable interface or unplug cable
   - Observe adjacency drops within sub‑second range

## Troubleshooting

| Issue | Cause | Solution |
|---|---|---|
| No BFD session | BFD not enabled | Enable on both routers |
| Session flaps | Timers too low | Increase to 300–500ms |
| CPU spikes | Too many sessions | Use BFD only on core links |
| OSPF not reacting | BFD not linked | Ensure `bfd=yes` in template |
| One‑way BFD | Firewall blocking | Allow UDP 3784/3785 |
| Session Down | Link unstable | Check cable, MTU, VLANs |
| BFD Up, OSPF Down | OSPF misconfig | Validate OSPF area + IPs |
| BGP not failing fast | BFD not on BGP | Enable BFD in BGP peer |
| Duplicate sessions | Multiple templates | Use one template per link |
| No logs | Logging disabled | Enable routing logs |
| Timers ignored | Wrong interface | Match correct interface name |
| BFD missing in v6 | Unsupported | Upgrade to RouterOS v7 |

## Advanced Options

1. Use different timers per link class
2. Combine BFD with ECMP for resilience
3. Add route filters to prevent churn
4. Enable BFD on BGP peers only
5. Use BFD for static routes (routing rules)
6. Monitor BFD with Netwatch/Telegram
7. Increase detect‑mult for noisy links
8. Use dedicated VLAN for core links
9. Log BFD events to syslog
10. Document timer settings per link

## Two-Link Failover Example (BFD + OSPF)

Use BFD on **both** PTP links so OSPF fails over within sub‑second ranges when a link drops.

**Topology**

```
R1 <==== Link A (vlan10) ====> R2
R1 <==== Link B (vlan20) ====> R2

Link A: 172.16.0.0/30
Link B: 172.16.0.4/30
```

### Router-A (R1)

```routeros
/routing bfd interface add interface=vlan10-OSPF required-min-rx=200ms desired-min-tx=200ms detect-mult=3
/routing bfd interface add interface=vlan20-OSPF required-min-rx=200ms desired-min-tx=200ms detect-mult=3

/routing ospf interface-template set [find interfaces=vlan10-OSPF] bfd=yes
/routing ospf interface-template set [find interfaces=vlan20-OSPF] bfd=yes
```

### Router-B (R2)

```routeros
/routing bfd interface add interface=vlan10-OSPF required-min-rx=200ms desired-min-tx=200ms detect-mult=3
/routing bfd interface add interface=vlan20-OSPF required-min-rx=200ms desired-min-tx=200ms detect-mult=3

/routing ospf interface-template set [find interfaces=vlan10-OSPF] bfd=yes
/routing ospf interface-template set [find interfaces=vlan20-OSPF] bfd=yes
```

:::info
If you want one link as primary, set different OSPF costs. BFD will still detect failure quickly on both links.
:::

## Related Guides

- [OSPF PTP](./ospf-ptp)
- [Cloud DDNS Routing](./cloud-ddns-routing)
- [NetWatch Telegram Alerts](../Monitoring/netwatch-telegram-alerts)
- [Enforce DNS to Google](../Security/enforce-dns-8.8.8.8)

## Completion

✅ **BFD fast failover is active!**

**Next steps:**
- Test failover under maintenance window
- Tune timers based on link stability
- Document BFD settings per link
