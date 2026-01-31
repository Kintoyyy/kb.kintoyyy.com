---
sidebar_position: 5
---

# 🚫 Block Tethering

Prevent clients from sharing your router's internet connection with other devices (tethering) by manipulating the TTL (Time To Live) value of outgoing packets. When a device tethers, packets pass through multiple hops—by setting TTL to 1, packets die after leaving your network, blocking tethered devices while allowing direct clients to work normally. This is a common ISP technique to enforce fair usage policies.

:::info
**What is TTL?** Every IP packet has a TTL counter that decreases by 1 at each network hop. When TTL reaches 0, the packet is dropped. By setting TTL to 1 for clients, packets can't reach tethered devices on the internet.
:::

## Prerequisites

- ✅ MikroTik RouterOS device with firewall mangle support
- ✅ Access to RouterOS console (SSH, Winbox, or WinBox)
- ✅ Outgoing internet connection
- ✅ Clients connecting via WiFi or Ethernet (DHCP or static)

:::warning
**Side effects:** Some legitimate use cases may fail:

- VPN clients may have issues
- Docker/container networks may break
- Gaming console online play might fail
- Mobile hotspot forwarding will definitely be blocked

Test in a controlled environment before production deployment.
:::

## Configuration Steps

### Option A: Terminal Configuration

1. **Access the terminal** via SSH, console, or Winbox terminal

   ```bash
   ssh admin@your-router-ip
   ```

2. **Add the TTL mangle rule:**

   ```routeros
   /ip firewall mangle add action=change-ttl chain=postrouting new-ttl=set:1 \
       passthrough=no out-interface-list=""
   ```

   :::tip
   **For specific interfaces only** (e.g., LAN WiFi only):

   ```routeros
   /ip firewall mangle add action=change-ttl chain=postrouting new-ttl=set:1 \
       passthrough=no out-interface=wlan0
   ```

   :::

3. **Verify the rule was added:**

   ```routeros
   /ip firewall mangle print
   ```

   You should see the new rule with `action=change-ttl`.

### Option B: Winbox Configuration

1. **Navigate to IP > Firewall > Mangle:**
   - Click the **+** button to add a new mangle rule

2. **Configure the rule:**
   - **General Tab:**
     - Chain: `postrouting`
     - Out. Interface: (leave blank for all interfaces)
   - **Action Tab:**
     - Action: `change-ttl`
     - New TTL: `set:1`
     - Passthrough: ☐ (unchecked)
   - Click **OK/Apply**

3. **Verify rule is enabled:**
   - Rule should appear in mangle list with `action=change-ttl`
   - Check: `disabled=no`

## Understanding the Configuration

| Parameter | Value | Purpose |
|-----------|-------|---------|
| `chain` | `postrouting` | Processes packets after routing decision |
| `action` | `change-ttl` | Modifies TTL value |
| `new-ttl` | `set:1` | Sets TTL to exactly 1 |
| `passthrough` | `no` | Doesn't chain to next rule |
| `out-interface-list` | (empty) | Applies to all outgoing interfaces |

**How it works:**

1. Client sends packet (TTL = 64 by default)
2. Router's mangle rule changes TTL to 1
3. Packet reaches first hop on internet (TTL decrements to 0)
4. Packet is dropped - tethered devices can't connect
5. Direct clients unaffected (only see TTL lowered, still works)

## Verification

1. **Confirm mangle rule exists:**

   ```routeros
   /ip firewall mangle print
   ```

   Should show rule with `action=change-ttl` and `new-ttl=set:1`

2. **Test from a client on your network (direct connection):**

   ```bash
   ping google.com
   # Should work fine
   ```

3. **Check TTL value on received packets (Linux/Mac):**

   ```bash
   ping -c 1 8.8.8.8 | grep ttl
   # Example output: 64 bytes from 8.8.8.8: icmp_seq=1 ttl=56
   # TTL will be lower than normal (usually 58-63 for Google's DNS)
   ```

4. **Test tethering (should fail):**
   - Take a second device
   - Share internet from a client connected to your router
   - Second device should NOT get internet access
   - Try accessing a website → should timeout

5. **Monitor packet stats:**

   ```routeros
   /ip firewall mangle print stats
   ```

   `packets` counter should increase as rules process traffic

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Tethering still works | Rule not applied correctly | Verify chain is `postrouting` not `forward`; check rule is enabled |
| Direct clients lose internet | TTL set too low | Change from `set:1` to `set:64` (or back to default) |
| Rule not appearing in list | Syntax error or low on memory | Check: `/ip firewall mangle print` shows error messages |
| Specific service broken (gaming, VPN) | Service sensitive to TTL | Exclude via src-address: add `src-address=!192.168.0.100` to rule |
| Some clients work, others don't | Inconsistent TTL behavior | Different OS have different default TTLs; test each type |
| Rules don't persist after reboot | Not saved to startup | Export config: `/system backup save` then `download` |

## Advanced Options

### Allow specific clients to tether (whitelist)

```routeros
/ip firewall mangle add action=change-ttl chain=postrouting new-ttl=set:64 \
    src-address="192.168.0.100" passthrough=no
/ip firewall mangle add action=change-ttl chain=postrouting new-ttl=set:1 \
    passthrough=no out-interface-list=""
```

(Whitelist rule must come BEFORE the blocking rule)

### Block tethering from specific interface only

```routeros
/ip firewall mangle add action=change-ttl chain=postrouting new-ttl=set:1 \
    in-interface=wlan0 passthrough=no
```

(Only clients from WiFi affected; Ethernet clients can tether)

### Log tethering attempts

```routeros
/ip firewall mangle set [find action=change-ttl] log=yes
```

Then check: `/log print where topics~"mangle"`

### Gradual TTL instead of blocking completely

```routeros
/ip firewall mangle add action=change-ttl chain=postrouting new-ttl=set:32 \
    passthrough=no out-interface-list=""
```

(Allows one level of tethering but blocks deeper chains)

### Different TTL for different subnets

```routeros
# Block WiFi clients (192.168.1.0/24)
/ip firewall mangle add action=change-ttl chain=postrouting new-ttl=set:1 \
    src-address="192.168.1.0/24" passthrough=no

# Allow LAN clients (192.168.0.0/24)
/ip firewall mangle add action=change-ttl chain=postrouting new-ttl=set:64 \
    src-address="192.168.0.0/24" passthrough=no
```

## Related Configurations

- **DNS enforcement:** See [Enforce DNS to Google](./enforce-dns-8.8.8.8.md)
- **Bandwidth limiting:** `/queue tree` rules to limit speed
- **Connection limiting:** `/ip firewall filter` to drop excessive connections
- **Packet inspection:** Enable DPI (Deep Packet Inspection) in `/ip firewall layer7-protocol`

## Completion

✅ **Tethering is now blocked!**

**Next steps:**

- Monitor your network for 24 hours to identify legitimate services affected
- Whitelist critical devices if needed (admin workstations, servers)
- Document which devices/services have issues for IT support tickets
- Consider combining with bandwidth limits for additional fair usage enforcement
