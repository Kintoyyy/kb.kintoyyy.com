---
sidebar_position: 7
---

# 📺 Protect ChromeCast


Prevent guests on your hotspot network from discovering and controlling ChromeCast devices (and other mDNS/UPnP devices) on your local LAN. ChromeCast uses ports 8008 (HTTP), 8009 (proprietary), and 8443 (HTTPS) for communication. By blocking these ports between hotspot and LAN subnets, you isolate your personal devices while still allowing hotspot clients internet access. Useful for guest WiFi networks, shared offices, or multi-tenant environments.

:::info
**Ports blocked:**
- `8008` - ChromeCast HTTP interface
- `8009` - ChromeCast proprietary control
- `8443` - ChromeCast HTTPS interface
:::

## Prerequisites

- ✅ MikroTik RouterOS device with firewall filter support
- ✅ Separate subnets for hotspot and LAN (e.g., 10.0.0.0/20 for hotspot, 192.168.0.0/24 for LAN)
- ✅ Access to RouterOS console (SSH, WebFig, or WinBox)
- ✅ ChromeCast or compatible devices on LAN subnet
- ✅ Hotspot network configured with DHCP or static IPs in hotspot subnet

:::warning
**Scope:** This blocks only ChromeCast control ports. Other mDNS services (Airplay, Bluetooth devices, smart home gadgets) may still be discoverable on different ports. Use address lists for comprehensive isolation.
:::

## Configuration Steps

### Option A: Terminal Configuration

1. **Access the terminal** via SSH, console, or WebFig terminal
   ```bash
   ssh admin@your-router-ip
   ```

2. **Create address list for hotspot clients** (if not already exists):
   ```routeros
   /ip firewall address-list
   add address=10.0.0.0/20 list="Hotspot Clients"
   ```

3. **Create address list for LAN devices:**
   ```routeros
   /ip firewall address-list
   add address=192.168.0.0/24 list="LAN"
   ```

4. **Add filter rule to block ChromeCast ports on input chain:**
   ```routeros
   /ip firewall filter
   add action=drop chain=input dst-address-list=LAN dst-port=8008,8009,8443 \
       protocol=tcp src-address-list="Hotspot Clients"
   ```

5. **Add filter rule to block ChromeCast ports on forward chain:**
   ```routeros
   /ip firewall filter
   add action=drop chain=forward dst-address="192.168.0.0/24" \
       dst-port=8008,8009,8443 protocol=tcp src-address="10.0.0.0/20"
   ```

   :::tip
   **Adjust subnets:** Replace `10.0.0.0/20` with your hotspot subnet and `192.168.0.0/24` with your LAN subnet.
   :::

### Option B: WebFig Configuration

#### Part 1: Create Address Lists

1. **Navigate to IP > Firewall > Address List:**
   - Click **+** to add new entry
   
   **Hotspot Clients Entry:**
   - Address: `10.0.0.0/20`
   - List: `Hotspot Clients`
   - Click **OK**

   **LAN Entry:**
   - Address: `192.168.0.0/24`
   - List: `LAN`
   - Click **OK**

#### Part 2: Create Filter Rules

2. **Navigate to IP > Firewall > Filter Rules:**
   - Click **+** to add new rule

   **Rule 1 (Input chain):**
   - Chain: `input`
   - Protocol: `tcp`
   - Dst. Port: `8008,8009,8443`
   - Dst. Address List: `LAN`
   - Src. Address List: `Hotspot Clients`
   - Action: `drop`
   - Click **OK**

   **Rule 2 (Forward chain):**
   - Chain: `forward`
   - Protocol: `tcp`
   - Dst. Port: `8008,8009,8443`
   - Dst. Address: `192.168.0.0/24`
   - Src. Address: `10.0.0.0/20`
   - Action: `drop`
   - Click **OK**

## Understanding the Configuration

### Address Lists

| List Name | Subnet | Purpose |
|-----------|--------|---------|
| `Hotspot Clients` | 10.0.0.0/20 | Guest/hotspot network (256-4096 clients) |
| `LAN` | 192.168.0.0/24 | Personal/local network (ChromeCast devices) |

**Why two rules?**
- **Input rule:** Blocks hotspot clients reaching ChromeCast services ON the router itself
- **Forward rule:** Blocks hotspot clients reaching ChromeCast devices ON the LAN subnet

### Firewall Chains Explained

| Chain | Purpose | Direction |
|-------|---------|-----------|
| `input` | Traffic destined to the router | Hotspot → Router |
| `forward` | Transit traffic through router | Hotspot → LAN segment |

### ChromeCast Ports

| Port | Protocol | Service |
|------|----------|---------|
| 8008 | TCP | HTTP interface (casting, status) |
| 8009 | TCP | Proprietary control protocol |
| 8443 | TCP | HTTPS secure interface |

## Verification

1. **Verify address lists exist:**
   ```routeros
   /ip firewall address-list print
   ```
   Should show both `Hotspot Clients` and `LAN` lists.

2. **Verify filter rules are in place:**
   ```routeros
   /ip firewall filter print
   ```
   Should show both `drop` rules with correct ports (8008, 8009, 8443).

3. **Check rule priority (important):**
   ```routeros
   /ip firewall filter print numbers
   ```
   Rules are processed top-to-bottom. Verify drop rules come BEFORE any accept rules.

4. **Test from hotspot client - should NOT see ChromeCast:**
   ```bash
   # From hotspot device (10.0.0.x)
   nmap -p 8008,8009,8443 192.168.0.50
   # Should show: PORT STATE
   #             8008 filtered
   #             8009 filtered
   #             8443 filtered
   ```

5. **Test from LAN client - SHOULD see ChromeCast:**
   ```bash
   # From LAN device (192.168.0.x)
   nmap -p 8008,8009,8443 192.168.0.50
   # Should show: PORT STATE
   #             8008 open
   #             8009 open
   #             8443 open
   ```

6. **Monitor blocked connections:**
   ```routeros
   /ip firewall filter print stats
   ```
   `packets` counter should increase for the drop rules as hotspot clients attempt to access ChromeCast.

7. **Verify hotspot internet still works:**
   ```bash
   # From hotspot device
   ping 8.8.8.8
   # Should work fine
   ```

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| ChromeCast still visible from hotspot | Rule disabled or in wrong position | Check: `disabled=no`; move rule up in filter list |
| ChromeCast stops working for LAN clients | Rule too restrictive | Verify address lists are correct; check rule uses `drop` not `reject` |
| Address list not found | Typo in list name | Use exact name: `Hotspot Clients` (case-sensitive) |
| Hotspot clients lose internet | Rule affects wrong traffic | Verify rule only blocks ports 8008,8009,8443 (TCP only) |
| mDNS discovery still works | Other ports not blocked | Add additional rules for ports 5353 (mDNS), 1900 (UPnP) |
| UPnP/SSDP still working | Different ports in use | Block 1900 (UPnP): `add action=drop protocol=tcp,udp dst-port=1900` |

## Advanced Options

### Block all mDNS traffic (includes Airplay, Bluetooth):
```routeros
/ip firewall filter add action=drop chain=forward dst-port=5353 protocol=udp \
    src-address="10.0.0.0/20" dst-address="192.168.0.0/24"
```

### Block UPnP discovery:
```routeros
/ip firewall filter add action=drop chain=forward dst-port=1900 protocol=udp \
    src-address="10.0.0.0/20" dst-address="192.168.0.0/24"
```

### Allow specific hotspot user to access ChromeCast (exception):
```routeros
/ip firewall filter add action=accept chain=forward dst-port=8008,8009,8443 \
    protocol=tcp src-address="10.0.0.50" dst-address="192.168.0.0/24"
```
(Must come BEFORE the drop rules)

### Log blocked ChromeCast attempts:
```routeros
/ip firewall filter set [find action=drop dst-port~"8008|8009|8443"] log=yes \
    log-prefix="BLOCKED_CHROMECAST: "
```
Then check: `/log print where topics~"forward"`

### Block all non-internet traffic from hotspot:
```routeros
# Only allow DNS, HTTP, HTTPS to external internet
/ip firewall filter add action=drop chain=forward src-address="10.0.0.0/20" \
    dst-address-list="local"
```

### Create whitelist for trusted hotspot devices:
```routeros
/ip firewall address-list add address=10.0.0.50 list="Trusted Hotspot"

/ip firewall filter add action=accept chain=forward src-address-list="Trusted Hotspot" \
    dst-address="192.168.0.0/24" dst-port=8008,8009,8443 protocol=tcp
```
(Must come BEFORE the drop rule)

## Related Configurations

- **DNS enforcement:** See [Enforce DNS to Google](./enforce-dns-8.8.8.8.md)
- **Tethering block:** See [Block Tethering by TTL](./block-tethering-ttl.md)
- **Starlink firewall:** See [Starlink Firewall Rules](./starlink-firewall-rules.md)
- **Address lists:** See [Starlink Firewall Rules - Address Lists](./starlink-firewall-rules.md#understanding-the-configuration)
- **Bandwidth limiting:** Use `/queue tree` to limit hotspot speeds

## Completion

✅ **ChromeCast is now isolated from hotspot users!**

**Next steps:**
- Test access from both hotspot and LAN devices
- Create whitelist exceptions for trusted guests if needed
- Monitor `/log` for blocked connection attempts
- Consider blocking other discovery protocols: mDNS (5353), UPnP (1900)
- Document the isolation policy for your guests
- Back up configuration: `/system backup save`
