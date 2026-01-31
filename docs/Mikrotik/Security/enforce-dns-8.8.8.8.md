---
sidebar_position: 4
---

# 🔒 Enforce DNS to Google

Force all clients on your network to use Google's DNS (8.8.8.8) regardless of their configured DNS settings. This guide covers three enforcement methods: router DNS settings, DHCP server assignment, and firewall NAT redirection. Useful for ensuring consistent DNS resolution, blocking custom DNS configurations, or enforcing corporate DNS policies.

:::warning
**Before deploying:** This redirects all DNS traffic from your subnet. Some clients or applications may have hardcoded DNS servers that bypass this. Always test in a lab first.
:::

## Prerequisites

- ✅ MikroTik RouterOS device with router OS v6.41+
- ✅ DHCP server enabled (or static IP clients)
- ✅ Access to RouterOS console (SSH, Winbox, or WinBox)
- ✅ Network subnet to enforce (e.g., 192.168.0.0/24)
- ✅ Internet connectivity to validate DNS resolution

:::info
This guide enforces DNS for subnet `192.168.0.0/24`. Adjust the subnet to match your network.
:::

## Configuration Steps

### Option A: Terminal Configuration

1. **Access the terminal** via SSH, console, or Winbox terminal
   ```bash
   ssh admin@your-router-ip
   ```

2. **Set the router's own DNS server:**
   ```routeros
   /ip dns set dns-server="8.8.8.8"
   ```

3. **Configure DHCP server to advertise DNS:**
   ```routeros
   /ip dhcp-server set [find] dns-server="8.8.8.8"
   ```

4. **Add NAT rule to redirect UDP DNS traffic:**
   ```routeros
   /ip firewall nat add action=dst-nat chain=dstnat dst-port=53 protocol=udp \
       src-address="192.168.0.0/24" to-addresses="8.8.8.8" to-ports=53
   ```

5. **Add NAT rule to redirect TCP DNS traffic:**
   ```routeros
   /ip firewall nat add action=dst-nat chain=dstnat dst-port=53 protocol=tcp \
       src-address="192.168.0.0/24" to-addresses="8.8.8.8" to-ports=53
   ```

   :::tip
   **Multiple subnets?** Repeat steps 4-5 for each subnet, changing `src-address` each time:
   ```routeros
   /ip firewall nat add action=dst-nat chain=dstnat dst-port=53 protocol=udp \
       src-address="192.168.1.0/24" to-addresses="8.8.8.8" to-ports=53
   ```
   :::

### Option B: Winbox Configuration

#### Part 1: Set Router DNS

1. **Navigate to IP > DNS:**
   - DNS Servers: `8.8.8.8`
   - Allow Remote Requests: ☐ (unchecked - secure)
   - Click **Apply**

#### Part 2: Set DHCP Server DNS

2. **Navigate to IP > DHCP Server:**
   - Select your DHCP server (e.g., `default`)
   - Click to edit
   - DNS Servers: `8.8.8.8`
   - Click **OK/Apply**

#### Part 3: Add NAT Rules

3. **Navigate to IP > Firewall > NAT:**
   - Click **+** to add new rule

   **Rule 1 (UDP):**
   - Chain: `dstnat`
   - Dst. Port: `53`
   - Protocol: `udp`
   - Src. Address: `192.168.0.0/24`
   - Action: `dst-nat`
   - To Addresses: `8.8.8.8`
   - To Ports: `53`
   - Click **OK**

   **Rule 2 (TCP):**
   - Repeat above with Protocol: `tcp`
   - Click **OK**

## Understanding the Configuration

| Component | Purpose | Impact |
|-----------|---------|--------|
| Router DNS (`/ip dns`) | Queries router makes to resolve names | Router itself uses 8.8.8.8 |
| DHCP DNS assignment | DNS servers advertised to clients | Clients receive 8.8.8.8 in DHCP lease |
| UDP NAT rule (port 53) | Redirects UDP DNS queries | Intercepts standard DNS lookups |
| TCP NAT rule (port 53) | Redirects TCP DNS queries | Handles zone transfers & large responses |

**All three components work together:**
1. DHCP tells clients to use 8.8.8.8
2. NAT rules redirect any DNS attempts to 8.8.8.8 (even if client ignores DHCP)
3. Router itself uses 8.8.8.8 for recursive queries

## Verification

1. **Test DNS resolution on router:**
   ```routeros
   /tool dns print
   ```
   Verify that `status=running` and queries resolve correctly.

2. **From a client on the network, check DNS resolution:**
   ```bash
   nslookup google.com
   # or
   dig google.com
   ```
   Should resolve successfully (8.8.8.8 is working).

3. **Verify DHCP clients receive correct DNS:**
   ```bash
   # Windows
   ipconfig /all
   # Look for "DNS Servers : 8.8.8.8"
   
   # Linux/Mac
   cat /etc/resolv.conf
   # Look for "nameserver 8.8.8.8"
   ```

4. **Check NAT rules are in place:**
   ```routeros
   /ip firewall nat print
   ```
   You should see two rules with `dst-port=53`, one for UDP and one for TCP.

5. **Monitor DNS traffic being redirected:**
   ```routeros
   /ip firewall nat print stats
   ```
   Count should increase as clients make DNS queries.

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Clients still use different DNS | DHCP not applied | Clients need to renew lease: `ipconfig /release` then `/renew` on Windows |
| Some apps bypass DNS | Hardcoded DNS in app | Edit app settings; some apps (Chrome, Firefox) have DNS bypass options |
| DNS slow/timeouts | 8.8.8.8 unreachable or slow | Try alternate: Cloudflare `1.1.1.1`, Quad9 `9.9.9.9`, OpenDNS `208.67.222.222` |
| "Invalid src-address" error | Subnet notation wrong | Use CIDR notation: `192.168.0.0/24` not `192.168.0.0-255` |
| NAT rules not applying | Firewall disabled or rules disabled | Check: `/ip firewall nat print` and verify `disabled=no` |
| Some clients can't resolve | DNS cache poisoning | Clear DHCP cache: `/ip dhcp-server release [find]` then reassign |

## Advanced Options

### Use multiple DNS servers for redundancy:
```routeros
/ip dns set dns-server="8.8.8.8,1.1.1.1"
```

### Add third-party DNS (Cloudflare WARP, NextDNS):
Replace `8.8.8.8` with your preferred DNS:
- **Cloudflare:** `1.1.1.1`
- **Quad9:** `9.9.9.9`
- **OpenDNS:** `208.67.222.222`
- **Quad9 Malware:** `9.9.9.10`

### Exclude specific clients (e.g., admin workstation):
Add exception rule before NAT rules:
```routeros
/ip firewall nat add action=accept chain=dstnat dst-port=53 \
    src-address="192.168.0.100" disabled=yes
```
(Set `disabled=yes` to activate; leave disabled until needed)

### Log DNS redirections:
```routeros
/ip firewall nat set [find dst-port=53] log=yes
```

## Completion

✅ **All DNS traffic now routes through 8.8.8.8!**

**Next steps:**
- Monitor resolution performance for 24 hours
- Check client logs for any DNS-related errors
- Consider implementing DNS caching for performance: `/ip dns cache print`
