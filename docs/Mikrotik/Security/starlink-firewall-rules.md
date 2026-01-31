---
sidebar_position: 6
---

# 🛰️ Starlink Anti Stow


Set up advanced firewall rules to manage Starlink connectivity and control traffic between local networks and Starlink devices. This guide demonstrates how to create address lists (for easy rule management) and apply firewall filters to reject or drop specific traffic patterns. Useful for isolating Starlink equipment, preventing unauthorized access, or managing bandwidth to satellite devices.

:::info
**Address Lists:** Instead of writing firewall rules for every IP, address lists let you group IPs and reference them by name. Makes rules easier to update and reuse.
:::

## Prerequisites

- ✅ MikroTik RouterOS device with firewall support
- ✅ Starlink dish/router connected to your network
- ✅ Access to RouterOS console (SSH, WebFig, or WinBox)
- ✅ Knowledge of your local network subnet (usually 192.168.x.0 or 10.0.0.0)
- ✅ Starlink device IP address (commonly 192.168.100.1)

:::warning
**Before deploying:** Test these rules in a lab first. Firewall rules can block legitimate traffic if misconfigured. Have a backup plan to revert changes.
:::

## Configuration Steps

### Option A: Terminal Configuration

1. **Access the terminal** via SSH, console, or WebFig terminal
   ```bash
   ssh admin@your-router-ip
   ```

2. **Create the STARLINK_IP address list:**
   ```routeros
   /ip firewall address-list
   add address=dishy.starlink.com list="STARLINK_IP"
   add address=192.168.100.1 list="STARLINK_IP"
   ```

   :::tip
   Replace `192.168.100.1` with your actual Starlink device IP. Find it with:
   ```routeros
   /ip arp print
   ```
   :::

3. **Create the local address lists:**
   ```routeros
   /ip firewall address-list
   add address=192.168.0.0/16 list=local
   add address=172.16.0.0/12 list=local
   add address=10.0.0.0/8 list=local
   ```

   :::info
   These are RFC 1918 private address ranges:
   - `10.0.0.0/8` - Class A private (10.0.0.0 - 10.255.255.255)
   - `172.16.0.0/12` - Class B private (172.16.0.0 - 172.31.255.255)
   - `192.168.0.0/16` - Class C private (192.168.0.0 - 192.168.255.255)
   :::

4. **Add filter rule to reject TCP traffic from Starlink:**
   ```routeros
   /ip firewall filter
   add action=reject chain=forward protocol=tcp reject-with=icmp-admin-prohibited \
       src-address-list="STARLINK_IP"
   ```

5. **Add filter rule to drop port 9201 (Starlink management):**
   ```routeros
   /ip firewall filter
   add action=drop chain=forward dst-port=9201 protocol=tcp \
       dst-address-list="STARLINK_IP" src-address-list=local
   ```

### Option B: WebFig Configuration

#### Part 1: Create Address Lists

1. **Navigate to IP > Firewall > Address List:**
   - Click **+** to add new entry
   
   **Entry 1 (Starlink domain):**
   - Address: `dishy.starlink.com`
   - List: `STARLINK_IP`
   - Click **OK**

   **Entry 2 (Starlink device IP):**
   - Address: `192.168.100.1`
   - List: `STARLINK_IP`
   - Click **OK**

   **Entry 3 (Private range 192.168):**
   - Address: `192.168.0.0/16`
   - List: `local`
   - Click **OK**

   **Entry 4 (Private range 172.16):**
   - Address: `172.16.0.0/12`
   - List: `local`
   - Click **OK**

   **Entry 5 (Private range 10.0):**
   - Address: `10.0.0.0/8`
   - List: `local`
   - Click **OK**

#### Part 2: Create Firewall Filter Rules

2. **Navigate to IP > Firewall > Filter Rules:**
   - Click **+** to add new rule

   **Rule 1 (Reject TCP from Starlink):**
   - Chain: `forward`
   - Protocol: `tcp`
   - Src. Address List: `STARLINK_IP`
   - Action: `reject`
   - Reject With: `icmp-admin-prohibited`
   - Click **OK**

   **Rule 2 (Drop port 9201 from local to Starlink):**
   - Chain: `forward`
   - Protocol: `tcp`
   - Dst. Port: `9201`
   - Dst. Address List: `STARLINK_IP`
   - Src. Address List: `local`
   - Action: `drop`
   - Click **OK**

## Understanding the Configuration

### Address Lists

| List Name | Entries | Purpose |
|-----------|---------|---------|
| `STARLINK_IP` | dishy.starlink.com, 192.168.100.1 | Identifies Starlink devices/services |
| `local` | 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16 | RFC 1918 private networks (internal) |

**Why use lists?** Easy to add/remove IPs without editing every rule. Update one list, affects all rules using it.

### Firewall Filter Rules

| Rule | Chain | Protocol | Effect |
|------|-------|----------|--------|
| Reject TCP from STARLINK_IP | forward | TCP | Blocks outbound TCP from Starlink, sends ICMP error |
| Drop port 9201 from local | forward | TCP | Blocks local network access to Starlink port 9201 |

**Chain explanation:**
- `forward` - Processes transit traffic (not destined for router itself)
- `input` - Traffic destined to router
- `output` - Traffic originating from router

## Verification

1. **Verify address lists were created:**
   ```routeros
   /ip firewall address-list print
   ```
   Should show all 5 entries with their respective lists.

2. **Verify filter rules were added:**
   ```routeros
   /ip firewall filter print
   ```
   Should show both rules with correct actions (`reject` and `drop`).

3. **Check rule order (important):**
   ```routeros
   /ip firewall filter print numbers
   ```
   Rules are processed top-to-bottom. More specific rules should come first.

4. **Test connection from local to Starlink (should fail now):**
   ```bash
   # From a local client on 192.168.x.x
   ping 192.168.100.1
   # Should timeout or show "Host unreachable"
   ```

5. **Monitor rule packet hits:**
   ```routeros
   /ip firewall filter print stats
   ```
   `packets` counter should increase if traffic matches the rules.

6. **Test Starlink outbound (should be blocked for TCP):**
   ```bash
   # From Starlink device (192.168.100.1)
   ping -c 1 8.8.8.8
   # May fail depending on other rules
   ```

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Address list not appearing | Syntax error in address | Use CIDR notation: `192.168.0.0/16` not `192.168.0.*` |
| Filter rule not blocking traffic | Rule disabled or in wrong position | Check: `disabled=no`; move rule up in priority |
| Legitimate traffic blocked | Rule too broad | Add exceptions: create new rule with `action=accept` above the block rule |
| Starlink can't reach internet | Reject rule too restrictive | Change `reject-with=icmp-admin-prohibited` to `drop` or remove rule |
| Port 9201 still accessible | Rule not in correct chain | Verify `chain=forward` not `input`; check destination is `STARLINK_IP` |
| Address list update not effective | Rule cached | Disable/enable rule: `/ip firewall filter disable [find numbers=0]; enable [find numbers=0]` |

## Advanced Options

### Add exceptions for specific local devices:
```routeros
/ip firewall filter add action=accept chain=forward src-address="192.168.1.50" \
    dst-address-list="STARLINK_IP" disabled=no
```
(Insert BEFORE the reject/drop rules)

### Log blocked traffic for debugging:
```routeros
/ip firewall filter set [find action=drop] log=yes log-prefix="DROP_STARLINK: "
```
Then check: `/log print where topics~"forward"`

### Block all traffic to Starlink (except DHCP):
```routeros
/ip firewall filter add action=drop chain=forward dst-address-list="STARLINK_IP" \
    protocol=!udp dst-port=!67,68
```

### Create whitelist-only access (block all except specific ports):
```routeros
/ip firewall filter add action=accept chain=forward dst-address-list="STARLINK_IP" \
    dst-port=53 protocol=tcp,udp comment="Allow DNS"
/ip firewall filter add action=drop chain=forward dst-address-list="STARLINK_IP"
```

### Add more Starlink IPs dynamically:
```routeros
/ip firewall address-list add address=203.0.113.0/24 list="STARLINK_IP"
```
(All rules using STARLINK_IP list automatically apply)

## Related Configurations

- **DNS enforcement:** See [Enforce DNS to Google](./enforce-dns-8.8.8.8.md)
- **Tethering block:** See [Block Tethering by TTL](./block-tethering-ttl.md)
- **Advanced filtering:** Layer 7 protocol matching, connection tracking
- **Bandwidth management:** `/queue tree` rules for per-IP limits

## Completion

✅ **Starlink firewall rules are now configured!**

**Next steps:**
- Monitor connection attempts for 24 hours
- Review `/log` entries for blocked traffic
- Adjust rules if legitimate services need access
- Document all exceptions in case of network troubleshooting
- Back up configuration: `/system backup save`
