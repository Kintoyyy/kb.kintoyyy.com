---
sidebar_position: 8
---

# 🎁 Guest Network Bandwidth


Automatically apply per-guest bandwidth limits using a DHCP on-up script. When guests connect to your network and receive a DHCP lease, this script creates a unique queue for them with burst and sustained rate limits. When the lease expires or releases, the queue is automatically removed. Perfect for fair-share bandwidth management, preventing guests from consuming all bandwidth, or implementing tiered guest access levels.

:::info
**What this does:**
- Creates individual bandwidth queues per guest (identified by MAC address)
- Sets both burst limits (temporary speed) and sustained limits (continuous speed)
- Automatically cleans up when the lease ends
- Allows monitoring of per-client bandwidth usage
:::

## Prerequisites

- ✅ MikroTik RouterOS device with queue support
- ✅ DHCP server configured on the router
- ✅ Guest network subnet separate from main LAN (e.g., 10.0.0.0/20)
- ✅ Access to RouterOS console (SSH, Winbox, or WinBox)
- ✅ Parent queue already created (e.g., "10.Lan-Guestx" for guest LAN)
- ✅ RouterOS v6.43+ for reliable queue operations

:::warning
**Performance impact:** Each guest creates a new queue. With 50+ guests, this can impact router CPU. Monitor `/queue simple print` and adjust limits if needed.
:::

## Configuration Steps

### Option A: Terminal Configuration

1. **Access the terminal** via SSH, console, or Winbox terminal
   ```bash
   ssh admin@your-router-ip
   ```

2. **Verify DHCP server exists:**
   ```routeros
   /ip dhcp-server print
   ```
   Note the DHCP server name (e.g., `default` or `guest-dhcp`).

3. **Create or verify parent queue for guest network:**
   ```routeros
   /queue simple add name="10.Lan-Guestx" parent=global-in target=10.0.0.0/20 \
       max-limit=100M/100M comment="Guest network parent queue"
   ```

   :::tip
   Adjust `10.0.0.0/20` and `100M/100M` to match your guest subnet and total available bandwidth.
   :::

4. **Add the on-up script to DHCP server:**
   ```routeros
   /ip dhcp-server set [find name="default"] on-up={
       :local queueName "Guest $leaseActMAC";
       
       :if ($leaseBound = "1") do={
           /queue simple add name=$queueName parent="10.Lan-Guestx" \
               target=($leaseActIP . "/32") burst-limit=7M/7M \
               burst-threshold=3750K/3750K burst-time=12s/12s \
               limit-at=625K/625K max-limit=5M/5M;
       } else={
           /queue simple remove $queueName
       }
   }
   ```

   :::tip
   **Customize bandwidth limits:**
   - `limit-at` - Guaranteed minimum bandwidth (625K = 625 Kbps)
   - `max-limit` - Maximum sustained bandwidth (5M = 5 Mbps)
   - `burst-limit` - Maximum burst speed (7M = 7 Mbps for 12 seconds)
   - `burst-threshold` - Buffer before burst kicks in (3750K = 3.75 Mbps)
   :::

5. **Verify the script is applied:**
   ```routeros
   /ip dhcp-server print detail
   ```
   You should see the on-up script in the output.

### Option B: Winbox Configuration

1. **Navigate to IP > DHCP Server:**
   - Click on your DHCP server (e.g., `default`)
   - Click to edit

2. **Locate the "On Up" field:**
   - Paste the entire script:
   ```routeros
   :local queueName "Guest $leaseActMAC";
   
   :if ($leaseBound = "1") do={
       /queue simple add name=$queueName parent="10.Lan-Guestx" \
           target=($leaseActIP . "/32") burst-limit=7M/7M \
           burst-threshold=3750K/3750K burst-time=12s/12s \
           limit-at=625K/625K max-limit=5M/5M;
   } else={
       /queue simple remove $queueName
   }
   ```

3. **Click OK/Apply**

4. **Verify in Terminal:**
   ```routeros
   /ip dhcp-server print detail
   ```

## Understanding the Script

### Script Variables

| Variable | Source | Purpose |
|----------|--------|---------|
| `queueName` | Local | Unique queue identifier (Guest + MAC address) |
| `leaseActMAC` | DHCP | Actual MAC address of DHCP client |
| `leaseActIP` | DHCP | Actual IP address assigned to client |
| `leaseBound` | DHCP | Status flag: "1" = binding, "0" = releasing |

### Bandwidth Limits Explained

| Parameter | Default | Range | Purpose |
|-----------|---------|-------|---------|
| `limit-at` | 625K | Per-client minimum guaranteed | Ensures guest gets baseline speed |
| `max-limit` | 5M | Per-client maximum sustained | Hard cap on continuous usage |
| `burst-limit` | 7M | Temporary peak speed | Allows burst for file transfers |
| `burst-threshold` | 3750K | Buffer before burst | Speed must exceed this to trigger burst |
| `burst-time` | 12s | Duration of burst | How long burst is allowed |

**How it works:**
1. Guest connects → DHCP assigns IP (e.g., 10.0.0.50)
2. Script creates queue: `Guest AA:BB:CC:DD:EE:FF`
3. If speed < 3750K: normal (up to 5M)
4. If speed > 3750K: burst enabled (up to 7M for 12 seconds max)
5. Guest disconnect → DHCP removes lease → script deletes queue

### Parent Queue Hierarchy

```
global-in (100%)
└── 10.Lan-Guestx (e.g., 100M total)
    ├── Guest AA:BB:CC:DD:EE:FF (5M each)
    ├── Guest 11:22:33:44:55:66 (5M each)
    └── Guest ...
```

## Verification

1. **Check DHCP server configuration:**
   ```routeros
   /ip dhcp-server print detail
   ```
   Verify "on-up" script is present.

2. **Connect a guest device to the network:**
   - Device requests DHCP lease
   - Should receive IP from guest subnet

3. **Verify queue was created:**
   ```routeros
   /queue simple print
   ```
   Should show a new queue named `Guest AA:BB:CC:DD:EE:FF` (with actual MAC).

4. **Check queue belongs to correct parent:**
   ```routeros
   /queue simple print where parent="10.Lan-Guestx"
   ```
   Should list all active guest queues.

5. **Monitor per-guest bandwidth:**
   ```routeros
   /queue simple print stats
   ```
   Shows `bytes-in`, `bytes-out`, and current rate per queue.

6. **Test bandwidth limit (should be capped at max-limit):**
   ```bash
   # From guest device
   iperf -c external-server -t 30
   # Should see speeds capped at 5M (max-limit)
   ```

7. **Disconnect guest and verify cleanup:**
   - Guest disconnects or DHCP lease expires
   - Wait 30 seconds
   - Check: `/queue simple print where name~"Guest"`
   - Queue should be automatically removed

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Queue not created when guest connects | Script syntax error | Check: `/ip dhcp-server print detail` for errors; verify script formatting |
| Parent queue "10.Lan-Guestx" not found | Parent queue doesn't exist | Create parent: `/queue simple add name="10.Lan-Guestx" parent=global-in target=10.0.0.0/20 max-limit=100M/100M` |
| Queue persists after guest leaves | Script not triggered on lease release | Check DHCP lease time; manually remove: `/queue simple remove "Guest AA:BB:CC:DD:EE:FF"` |
| Guest reports slow speeds | Limits too restrictive | Increase `max-limit` and `burst-limit` in script |
| All guests share same queue | MAC address not included in name | Verify `queueName` includes `$leaseActMAC` |
| "Unknown identifier" error | Variable name typo | Check: `$leaseActMAC`, `$leaseActIP`, `$leaseBound` (case-sensitive) |
| DHCP server stops assigning IPs | Queue creation failures | Check `/log` for errors; simplify script to debug |

## Advanced Options

### Higher bandwidth for VIP guests:
```routeros
:local queueName "Guest $leaseActMAC";
:local macVIP "AA:BB:CC:DD:EE:FF";

:if ($leaseBound = "1") do={
    :if ($leaseActMAC = $macVIP) do={
        # VIP guest: higher limits
        /queue simple add name=$queueName parent="10.Lan-Guestx" \
            target=($leaseActIP . "/32") limit-at=2M/2M max-limit=25M/25M;
    } else={
        # Regular guest: standard limits
        /queue simple add name=$queueName parent="10.Lan-Guestx" \
            target=($leaseActIP . "/32") limit-at=625K/625K max-limit=5M/5M;
    }
} else={
    /queue simple remove $queueName
}
```

### Time-based limits (restrict during peak hours):
```routeros
:local queueName "Guest $leaseActMAC";
:local currentHour [/system clock get hour];

:if ($leaseBound = "1") do={
    :if ($currentHour >= 18 && $currentHour <= 22) do={
        # Peak hours: stricter limits
        /queue simple add name=$queueName parent="10.Lan-Guestx" \
            target=($leaseActIP . "/32") limit-at=250K/250K max-limit=2M/2M;
    } else={
        # Off-peak: relaxed limits
        /queue simple add name=$queueName parent="10.Lan-Guestx" \
            target=($leaseActIP . "/32") limit-at=625K/625K max-limit=5M/5M;
    }
} else={
    /queue simple remove $queueName
}
```

### Unlimited for local subnet, limited for guests:
```routeros
:local queueName "Guest $leaseActMAC";

:if ($leaseBound = "1" && $leaseActIP ~ "^10\.") do={
    # Only limit guest subnet (10.x.x.x)
    /queue simple add name=$queueName parent="10.Lan-Guestx" \
        target=($leaseActIP . "/32") limit-at=625K/625K max-limit=5M/5M;
}
```

### Log all guest connections:
```routeros
:local queueName "Guest $leaseActMAC";

:if ($leaseBound = "1") do={
    :log info "Guest connected: MAC=$leaseActMAC IP=$leaseActIP";
    /queue simple add name=$queueName parent="10.Lan-Guestx" \
        target=($leaseActIP . "/32") limit-at=625K/625K max-limit=5M/5M;
} else={
    :log info "Guest disconnected: MAC=$leaseActMAC";
    /queue simple remove $queueName
}
```

### Multi-subnet support (different limits per subnet):
```routeros
:local queueName "Guest $leaseActMAC";

:if ($leaseBound = "1") do={
    :if ($leaseActIP ~ "^10\.0\.1\.") do={
        # Subnet 1: higher limit
        /queue simple add name=$queueName parent="10.Lan-Guestx" \
            target=($leaseActIP . "/32") limit-at=1M/1M max-limit=10M/10M;
    } else={
        # Subnet 2: standard limit
        /queue simple add name=$queueName parent="10.Lan-Guestx" \
            target=($leaseActIP . "/32") limit-at=625K/625K max-limit=5M/5M;
    }
} else={
    /queue simple remove $queueName
}
```

## Performance Considerations

### Queue Scaling
- **10 guests:** ~1% CPU impact
- **50 guests:** ~5% CPU impact
- **100+ guests:** ~15%+ CPU impact (consider using HTB queues instead)

### For high-traffic environments:
1. Use `/queue tree` (HTB) instead of `/queue simple` (FIFO)
2. Reduce burst-time to 5s or less
3. Increase burst-threshold to reduce burst frequency
4. Monitor `/system resource print` for CPU usage

## Related Configurations

- **Tethering block:** See [Block Tethering by TTL](./block-tethering-ttl.md)
- **ChromeCast isolation:** See [Block Hotspot Users from Accessing ChromeCast](./block-hotspot-chromecast-access.md)
- **DNS enforcement:** See [Enforce DNS to Google](./enforce-dns-8.8.8.8.md)
- **Queue trees:** Advanced HTB (Hierarchical Token Bucket) queuing for large networks

## Completion

✅ **Guest bandwidth is now automatically managed!**

**Next steps:**
- Connect a test device and verify queue creation
- Monitor bandwidth usage for 24 hours
- Adjust limits based on network performance
- Set up per-subnet or VIP tiers if needed
- Back up configuration: `/system backup save`
- Document bandwidth policy for guests
