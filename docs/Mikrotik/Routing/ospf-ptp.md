---
sidebar_position: 4
---

# 🌐 OSPF PTP

Set up a clean OSPF point‑to‑point (PTP) adjacency using interface templates, a loopback router‑ID, and a /30 transit network. This configuration is ideal for router‑to‑router links where you want predictable neighbor formation and fast convergence.

:::info
This guide uses RouterOS v7 OSPF interface templates. Adjust interface names and subnets to match your environment.
:::

## Prerequisites

- ✅ MikroTik RouterOS v7.x
- ✅ Two routers connected on a /30 or /31 link
- ✅ Loopback interface configured (or use a stable interface address)
- ✅ SSH/Winbox access to both routers
- ✅ Matching OSPF area on both ends

:::warning
OSPF will advertise routes between routers. Confirm your firewall allows OSPF (protocol 89) and avoid overlapping subnets.
:::

## Configuration Steps

### Option A: Terminal

1. **Create OSPF instance**
   ```routeros
   /routing ospf instance add disabled=no name=ospf-instance-1 originate-default=always router-id=10.254.254.1
   ```

2. **Create OSPF area**
   ```routeros
   /routing ospf area add disabled=no instance=ospf-instance-1 name=ospf-area-1
   ```

3. **Add loopback template (passive)**
   ```routeros
   /routing ospf interface-template add area=ospf-area-1 disabled=no interfaces=lo \
       networks=10.254.254.1/32 passive priority=1
   ```

4. **Add PTP interface template**
   ```routeros
   /routing ospf interface-template add area=ospf-area-1 disabled=no interfaces=vlan10-OSPF \
       networks=172.16.0.0/30 priority=1 type=ptp
   ```

### Option B: Winbox

1. **Routing → OSPF → Instances**
   - Add instance `ospf-instance-1`
   - Set **Router ID** to `10.254.254.1`
   - Set **Originate Default** to `always`

2. **Routing → OSPF → Areas**
   - Add area `ospf-area-1`
   - Link to `ospf-instance-1`

3. **Routing → OSPF → Interface Templates**
   - Add **Loopback template**
     - **Interface:** `lo`
     - **Network:** `10.254.254.1/32`
     - **Passive:** enabled
   - Add **PTP template**
     - **Interface:** `vlan10-OSPF`
     - **Network:** `172.16.0.0/30`
     - **Type:** `ptp`

## Understanding the Configuration

**Flow Diagram**

```
[Loopback /32] -> [OSPF Instance] -> [Area] -> [PTP Link] -> [Neighbor]
```

**Topology Chart (Two Routers)**

```
      OSPF Area 0.0.0.0 (ospf-area-1)

   Router-A (R1)                             Router-B (R2)
   ----------------                           ----------------
   Lo0: 10.254.254.1/32                       Lo0: 10.254.254.2/32
   Router-ID: 10.254.254.1                    Router-ID: 10.254.254.2
   VLAN10-OSPF: 172.16.0.1/30  <----PTP---->  VLAN10-OSPF: 172.16.0.2/30
```

**Components Table**

| Component | Purpose | Notes |
|---|---|---|
| Router ID | Stable OSPF identity | Use loopback /32 |
| Area | OSPF scope | Same on both ends |
| Interface Template | Binds interfaces | RouterOS v7 model |
| PTP Type | Point‑to‑point adjacency | Ideal for /30 links |

## Two-Router Example Configuration

### Router-A (R1 CORE)

```routeros
/interface bridge add name=lo
/ip address add address=10.254.254.1/32 interface=lo
/ip address add address=172.16.0.1/30 interface=vlan10-OSPF

/routing ospf instance add disabled=no name=ospf-instance-1 originate-default=always router-id=10.254.254.1
/routing ospf area add disabled=no instance=ospf-instance-1 name=ospf-area-1
/routing ospf interface-template add area=ospf-area-1 disabled=no interfaces=lo \
   networks=10.254.254.1/32 passive priority=1
/routing ospf interface-template add area=ospf-area-1 disabled=no interfaces=vlan10-OSPF \
   networks=172.16.0.0/30 priority=1 type=ptp
```

### Router-B (R2 AC)

```routeros
/interface bridge add name=lo
/ip address add address=10.254.254.2/32 interface=lo
/ip address add address=172.16.0.2/30 interface=vlan10-OSPF

/routing ospf instance add disabled=no name=ospf-instance-1 router-id=10.254.254.2
/routing ospf area add disabled=no instance=ospf-instance-1 name=ospf-area-1
/routing ospf interface-template add area=ospf-area-1 disabled=no interfaces=lo \
   networks=10.254.254.2/32 passive priority=1
/routing ospf interface-template add area=ospf-area-1 disabled=no interfaces=vlan10-OSPF \
   networks=172.16.0.0/30 priority=1 type=ptp
```

:::info
Use different router IDs and loopback addresses on each router. The PTP subnet must match on both ends.
:::

:::warning
`originate-default=always` should typically be set **only on R1 (CORE)** if it is the internet gateway. Do **not** enable it on R2 unless R2 is also intended to inject a default route into OSPF.
:::

## Two Links (ECMP) Example

Use two parallel PTP links for redundancy and load‑sharing. OSPF will install **ECMP** routes automatically when costs are equal.

**Topology**

```
R1 <==== PTP Link A ====> R2
R1 <==== PTP Link B ====> R2

Link A: 172.16.0.0/30
   R1: 172.16.0.1/30
   R2: 172.16.0.2/30

Link B: 172.16.0.4/30
   R1: 172.16.0.5/30
   R2: 172.16.0.6/30
```

### Router-A (R1) — Dual Links

```routeros
/ip address add address=172.16.0.1/30 interface=vlan10-OSPF
/ip address add address=172.16.0.5/30 interface=vlan20-OSPF

/routing ospf interface-template add area=ospf-area-1 disabled=no interfaces=vlan10-OSPF \
      networks=172.16.0.0/30 priority=1 type=ptp
/routing ospf interface-template add area=ospf-area-1 disabled=no interfaces=vlan20-OSPF \
      networks=172.16.0.4/30 priority=1 type=ptp
```

### Router-B (R2) — Dual Links

```routeros
/ip address add address=172.16.0.2/30 interface=vlan10-OSPF
/ip address add address=172.16.0.6/30 interface=vlan20-OSPF

/routing ospf interface-template add area=ospf-area-1 disabled=no interfaces=vlan10-OSPF \
      networks=172.16.0.0/30 priority=1 type=ptp
/routing ospf interface-template add area=ospf-area-1 disabled=no interfaces=vlan20-OSPF \
      networks=172.16.0.4/30 priority=1 type=ptp
```

:::info
To prefer one link, set different interface costs: `/routing ospf interface-template set <id> cost=50`.
:::

## Verification

1. **Check OSPF neighbor state**
   ```routeros
   /routing ospf neighbor print
   ```
2. **Verify OSPF routes**
   ```routeros
   /routing route print where routing-table=main protocol=ospf
   ```
3. **Confirm interface templates**
   ```routeros
   /routing ospf interface-template print
   ```
4. **Ping remote router ID**
   ```routeros
   /ping 10.254.254.2
   ```

## Troubleshooting

| Issue | Cause | Solution |
|---|---|---|
| No neighbors | OSPF disabled | Ensure instance and area enabled |
| Neighbor stuck Init | MTU mismatch | Match MTU on both interfaces |
| Neighbor stuck ExStart | Duplicate router ID | Use unique router IDs |
| Neighbor flapping | Link instability | Check physical link/VLAN | 
| No routes learned | Missing network statements | Verify interface templates |
| Passive on PTP | Wrong passive flag | Ensure PTP template is not passive |
| Wrong area | Area mismatch | Match area names on both routers |
| Default route missing | Originate not set | Set `originate-default=always` |
| CPU high | LSA flood | Reduce network size / tune timers |
| Routes in wrong table | Policy routing | Verify routing tables |
| OSPF blocked | Firewall filters | Allow protocol 89 |
| Neighbor up but no reachability | Missing IP config | Set proper /30 addressing |

## Advanced Options

1. Use `/31` for PTP links to save IPs
2. Add authentication (MD5) on templates
3. Tune hello/dead timers for fast failover
4. Use separate area for backbone and access
5. Disable default originate when not needed
6. Add BFD for sub‑second convergence
7. Use route filters to control advertisements
8. Add passive templates for LAN subnets
9. Enable ECMP for multi‑link designs
10. Monitor OSPF with Netwatch/Telegram alerts

## Related Guides

- [Cloud DDNS Routing](./cloud-ddns-routing)
- [VPN Game Routing](./vpn-game-routing)
- [NetWatch Telegram Alerts](../Monitoring/netwatch-telegram-alerts)
- [Enforce DNS to Google](../Security/enforce-dns-8.8.8.8)

## Completion

✅ **OSPF PTP is configured!**

**Next steps:**
- Configure the neighbor router with matching area and network
- Verify routes and adjacency stability
- Document router IDs and link subnets
