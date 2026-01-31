---
sidebar_position: 14
---

# ☁️ Cloud DDNS PBR


Route MikroTik cloud DDNS updates through a specific gateway to ensure reliable connectivity to Mikrotik's cloud infrastructure. This setup creates a dedicated routing path for cloud synchronization, bypassing congested or filtered routes. Useful for enterprise deployments, multi-gateway setups, or environments where cloud connectivity is critical for remote management.

:::info
**What this does:**
- Enables MikroTik cloud DDNS service
- Routes cloud traffic through dedicated gateway
- Ensures stable connection to cloud.mikrotik.com
- Maintains separate routing table for cloud updates
- Supports failover scenarios
:::

## Prerequisites

- ✅ MikroTik RouterOS with cloud support (v6.43+)
- ✅ Multiple internet gateways or ISPs (optional but recommended)
- ✅ Access to RouterOS console (SSH, Winbox, or WinBox)
- ✅ MikroTik account for cloud services
- ✅ Router connected to internet

:::warning
**Cloud service requirements:**
- MikroTik Cloud requires valid account
- DDNS allows dynamic IP updates to cloud.mikrotik.com
- Enables remote management via cloud.mikrotik.com portal
- Keeps device findable even if IP changes
:::

## Configuration Steps

### Option A: Terminal Configuration

1. **Access the terminal:**
   ```bash
   ssh admin@your-router-ip
   ```

2. **Enable cloud DDNS:**
   ```routeros
   /ip cloud set ddns-enabled=yes
   ```

3. **Create address list for cloud servers:**
   ```routeros
   /ip firewall address-list
   add address=cloud.mikrotik.com list=mikrotik-cloud
   add address=cloud2.mikrotik.com list=mikrotik-cloud
   ```

4. **Create dedicated routing table for cloud:**
   ```routeros
   /routing table add disabled=no fib name=to-cloud-ddns
   ```

5. **Mark cloud traffic for routing:**
   ```routeros
   /ip firewall mangle add action=mark-routing chain=output \
       dst-address-list=mikrotik-cloud new-routing-mark=to-cloud-ddns \
       passthrough=no
   ```

6. **Add route for cloud traffic** (replace ISP_XGW with your gateway):
   ```routeros
   /ip route add comment="For Cloud Update" disabled=no distance=1 \
       dst-address=0.0.0.0/0 gateway=ISP_XGW pref-src="" \
       routing-table=to-cloud-ddns scope=30 suppress-hw-offload=no \
       target-scope=10
   ```

   :::tip
   - Replace `ISP_XGW` with your actual gateway name (e.g., `ether1` or gateway IP)
   - Use distance `1` for primary, `10` for backup
   - Adjust scope values if needed for your network
   :::

7. **Verify configuration:**
   ```routeros
   /ip cloud print
   /ip firewall address-list print where list=mikrotik-cloud
   /routing table print
   /ip firewall mangle print
   /ip route print
   ```

### Option B: Winbox Configuration

1. **Enable Cloud DDNS:**
   - Navigate to IP > Cloud
   - Check **DDNS Enabled**: ✓
   - Click **Apply**

2. **Create Address List:**
   - Navigate to IP > Firewall > Address List
   - Click **+** twice to add:
     - Address: `cloud.mikrotik.com` → List: `mikrotik-cloud`
     - Address: `cloud2.mikrotik.com` → List: `mikrotik-cloud`

3. **Create Routing Table:**
   - Navigate to Routing > Tables
   - Click **+**
   - Name: `to-cloud-ddns`
   - FIB: Checked
   - Click **OK**

4. **Add Mangle Rule:**
   - Navigate to IP > Firewall > Mangle
   - Click **+**
   - Chain: `output`
   - Dst. Address List: `mikrotik-cloud`
   - Action: `mark-routing`
   - New Routing Mark: `to-cloud-ddns`
   - Passthrough: Unchecked
   - Click **OK**

5. **Add Cloud Route:**
   - Navigate to IP > Routes
   - Click **+**
   - Dst. Address: `0.0.0.0/0`
   - Gateway: `ISP_XGW` (your gateway)
   - Routing Table: `to-cloud-ddns`
   - Comment: `For Cloud Update`
   - Distance: `1`
   - Click **OK**

## Understanding the Configuration

### Cloud Connectivity Flow

```
MikroTik Router
    ↓
Router initiates cloud update (checks IP change)
    ↓
Firewall mangle detects: dst = cloud.mikrotik.com
    ↓
Marks packet with routing mark: to-cloud-ddns
    ↓
Routing table looks up: routing-mark = to-cloud-ddns
    ↓
Uses dedicated route: gateway = ISP_XGW
    ↓
Packet sent through specific gateway
    ↓
Cloud server receives update from specific IP
    ↓
DDNS record updated: cloud.mikrotik.com → current-public-ip
```

### Configuration Components

| Component | Purpose |
|-----------|---------|
| Cloud DDNS | Automatically updates IP on cloud.mikrotik.com |
| Address List | Identifies cloud server IPs for routing |
| Routing Table | Dedicated routing decisions for cloud traffic |
| Mangle Rule | Marks outbound cloud traffic |
| Cloud Route | Sends marked traffic through specific gateway |

### Multi-Gateway Scenario

```
Primary ISP (Distance 1)
├─ Cloud traffic routes via ISP1
└─ If ISP1 down, falls back to ISP2

Backup ISP (Distance 10)
└─ Used only if primary unavailable
```

## Verification

1. **Check cloud status:**
   ```routeros
   /ip cloud print
   ```
   Should show:
   - `ddns-enabled=yes`
   - `update-time=XX:XX:XX` (recent update)
   - Status indicating connection

2. **Verify address list:**
   ```routeros
   /ip firewall address-list print where list=mikrotik-cloud
   ```
   Should show both `cloud.mikrotik.com` and `cloud2.mikrotik.com`

3. **Check routing table:**
   ```routeros
   /routing table print
   ```
   Should show `to-cloud-ddns` table with FIB enabled

4. **Monitor mangle rule:**
   ```routeros
   /ip firewall mangle print stats
   ```
   Counter should increase when cloud updates occur

5. **Verify routes:**
   ```routeros
   /ip route print where routing-table=to-cloud-ddns
   ```
   Should show route through `ISP_XGW`

6. **Test cloud connectivity:**
   ```bash
   # From router terminal
   ping cloud.mikrotik.com
   # Should respond
   ```

7. **Check cloud portal:**
   - Log into cloud.mikrotik.com
   - Device should show as online
   - IP should match your current public IP

8. **Monitor cloud updates:**
   ```routeros
   /log print where topics~"cloud"
   ```
   Should show periodic update attempts

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Cloud shows offline | Cloud disabled or no connectivity | Verify DDNS enabled: `/ip cloud set ddns-enabled=yes` |
| Cloud IP not updating | Route not working or mangle rule disabled | Check mangle rule: `/ip firewall mangle print where action=mark-routing` |
| Wrong gateway used | Routing table not applied correctly | Verify route: `/ip route print where routing-table=to-cloud-ddns` |
| DNS can't resolve cloud.mikrotik.com | DNS issue or blocked | Try pinging IP directly or set static DNS |
| Frequent update failures | ISP_XGW incorrect or gateway down | Verify gateway name: `/ip route print`; test ping through gateway |
| Cloud traffic going through default route | Mangle rule not matching | Check address list exists and rule enabled: `disabled=no` |

## Advanced Options

### Add backup cloud route (failover):
```routeros
/ip route add comment="Cloud Backup" disabled=no distance=10 \
    dst-address=0.0.0.0/0 gateway=ISP_BACKUP \
    routing-table=to-cloud-ddns
```

### Include secondary cloud DNS:
```routeros
/ip firewall address-list add address=119.16.248.141 list=mikrotik-cloud
/ip firewall address-list add address=119.16.248.142 list=mikrotik-cloud
```

### Monitor cloud update frequency:
```routeros
/log print where topics~"cloud" | head 20
```

### Disable cloud for testing:
```routeros
/ip cloud set ddns-enabled=no
```

### Force immediate cloud update:
```routeros
/ip cloud force-update
```

### Route cloud via specific interface only:
```routeros
/ip firewall mangle add action=mark-routing chain=output \
    dst-address-list=mikrotik-cloud out-interface=ether1 \
    new-routing-mark=to-cloud-ddns passthrough=no
```

### Time-based cloud updates (disable during maintenance):
```routeros
:local hour [/system clock get hour];
:if ($hour >= 2 && $hour <= 4) do={
    # Maintenance window - disable cloud
    /ip cloud set ddns-enabled=no
} else={
    # Normal hours - enable cloud
    /ip cloud set ddns-enabled=yes
}
```

### Email alert on cloud failures:
```routeros
:if ([/ip cloud get installed-version] = "") do={
    /tool e-mail send to="admin@example.com" subject="Cloud Update Failed" \
        body="MikroTik cloud DDNS update failed"
}
```

### Telegram alert on IP change:
```routeros
:local currentIP ([/ip address get [find interface=ether1] address]);
:local botApi "123456789:ABCDefGHIJKlmNOpqrsTUvwxYZ";
:local chatId "-123456789";
/tool fetch url="https://api.telegram.org/bot$botApi/sendMessage?chat_id=$chatId&text=IP%20Changed:%20$currentIP" keep-result=no;
```

### Custom DNS for cloud (if blocked):
```routeros
/ip dns set servers=1.1.1.1 allow-remote-requests=no
```

### Monitor cloud bandwidth:
```routeros
/queue simple add name="Cloud-Traffic" target=192.168.0.0/16 \
    address-list=mikrotik-cloud max-limit=1M/1M comment="Monitor Cloud"
```

## Multi-Gateway Cloud Routing

### Scenario: Two ISP setup

```routeros
# ISP 1 (Primary)
/ip route add gateway=ISP1 routing-table=to-cloud-ddns distance=1 comment="Cloud Primary"

# ISP 2 (Backup)
/ip route add gateway=ISP2 routing-table=to-cloud-ddns distance=10 comment="Cloud Backup"
```

Router will use ISP1 normally, but if ISP1 fails, traffic automatically switches to ISP2.

## Cloud Service Benefits

| Feature | Benefit |
|---------|---------|
| DDNS | Automatic IP updates - find router anytime |
| Remote Access | Manage router from anywhere via web interface |
| Cloud Backup | Sync configuration to cloud |
| Device Tracking | Monitor device status and uptime |
| Analytics | View historical data and usage patterns |

## Security Considerations

1. **Firewall:** Ensure cloud updates aren't blocked
2. **DNS:** Cloud.mikrotik.com must be resolvable
3. **Account:** Use strong MikroTik account password
4. **Updates:** Keep RouterOS up-to-date for cloud fixes
5. **Monitoring:** Regular log checks for update failures

## Related Guides

- [Enforce DNS](./enforce-dns-8.8.8.8.md)
- [NetWatch Telegram Alerts](./netwatch-telegram-alerts.md)
- [VPN Game Routing](./vpn-game-routing.md)

## Completion

✅ **Cloud DDNS routing is configured!**

**Next steps:**
- Verify cloud connection in web console
- Monitor logs for successful updates
- Test failover if backup gateway configured
- Set up IP change alerts
- Back up configuration: `/system backup save`
- Document gateway names and their ISP assignments
- Schedule regular cloud service status checks
- Test remote access via cloud.mikrotik.com
