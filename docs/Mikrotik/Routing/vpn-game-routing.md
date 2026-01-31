---
sidebar_position: 13
---

# 🎮 Game VPN PBR


Route gaming traffic through a VPN tunnel while keeping regular internet on direct connection. This guide uses policy-based routing with firewall rules to detect game server traffic (Mobile Legends, DOTA, COD, etc.) and automatically tunnel it through a VPN, reducing latency and bypassing regional restrictions. Perfect for gaming hotspots, reducing WAN congestion, or accessing geo-blocked game servers.

:::info
**What this does:**
- Detects game traffic by port and protocol
- Routes game packets through VPN tunnel (VPN-GAME)
- Regular traffic uses normal ISP connection
- Reduces latency for gaming
- Bypasses geo-blocking for games
:::

## Prerequisites

- ✅ MikroTik RouterOS with OpenVPN support
- ✅ VPN credentials (username, password, server IP)
- ✅ WAN/ISP connection active
- ✅ Access to RouterOS console (SSH, Winbox, or WinBox)
- ✅ Basic firewall knowledge
- ✅ RouterOS v6.48+

:::warning
**VPN considerations:**
- Ensure VPN provider allows gaming traffic
- Some games may detect VPN and block access
- VPN may increase latency for some games - test first
- Bandwidth will be split between VPN and direct
:::

## Configuration Steps

### Option A: Terminal Configuration

1. **Access the terminal:**
   ```bash
   ssh admin@your-router-ip
   ```

2. **Create OpenVPN client connection:**
   ```routeros
   /interface ovpn-client add connect-to="10.0.10.1" disabled=no name="VPN-GAME" \
       user="test" password="test" comment="VPN-GAME"
   ```

   :::tip
   Replace:
   - `10.0.10.1` with your VPN server IP
   - `test` (user) with your VPN username
   - `test` (password) with your VPN password
   :::

3. **Add NAT masquerade for VPN traffic:**
   ```routeros
   /ip firewall nat add chain=srcnat out-interface="VPN-GAME" action=masquerade \
       comment="VPN-GAME"
   ```

4. **Create local IP address list:**
   ```routeros
   /ip firewall address-list
   add address=192.168.0.0/16 list=local-ip
   add address=172.16.0.0/12 list=local-ip
   add address=10.0.0.0/8 list=local-ip
   ```

5. **Add routing mark rule:**
   ```routeros
   /ip firewall mangle add action=mark-routing chain=prerouting \
       src-address-list=local-ip dst-address-list=GAMES_IP \
       new-routing-mark=vpn-routing-game passthrough=no comment="VPN-GAME"
   ```

6. **Add static route to VPN gateway:**
   ```routeros
   /ip route add dst-address="10.0.10.1" gateway="192.168.1.1" comment="VPN-GAME"
   ```

   :::tip
   Replace `192.168.1.1` with your actual gateway/ISP IP
   :::

7. **Add VPN routing rule:**
   ```routeros
   /ip route add gateway="VPN-GAME" routing-mark=vpn-routing-game comment="VPN-GAME"
   ```

8. **Add game traffic detection rules** (Mobile Legends example):
   ```routeros
   /ip firewall raw
   add action=add-dst-to-address-list address-list="GAMES_IP" \
       address-list-timeout=1d chain=prerouting comment="Mobile Legends - TCP" \
       dst-address-list=!local-ip dst-port=5001-5180,5501-5680,9443,30000-30220,9001 \
       protocol=tcp
   
   add action=add-dst-to-address-list address-list="GAMES_IP" \
       address-list-timeout=1d chain=prerouting comment="Mobile Legends - UDP" \
       dst-address-list=!local-ip dst-port=5001-5180,5501-5680,9992,30020-30220,9001 \
       protocol=udp
   ```

9. **Verify configuration:**
   ```routeros
   /interface ovpn-client print
   /ip firewall nat print
   /ip route print
   /ip firewall mangle print
   /ip firewall raw print
   ```

### Option B: Winbox Configuration

1. **Create OpenVPN Client:**
   - Navigate to Interfaces > OpenVPN Client
   - Click **+**
   - Name: `VPN-GAME`
   - Connect To: `10.0.10.1`
   - User: `test`
   - Password: `test`
   - Comment: `VPN-GAME`
   - Click **OK**

2. **Add NAT Rule:**
   - Navigate to IP > Firewall > NAT
   - Click **+**
   - Chain: `srcnat`
   - Out. Interface: `VPN-GAME`
   - Action: `masquerade`
   - Comment: `VPN-GAME`
   - Click **OK**

3. **Create Address Lists:**
   - Navigate to IP > Firewall > Address List
   - Add three entries:
     - `192.168.0.0/16` → List: `local-ip`
     - `172.16.0.0/12` → List: `local-ip`
     - `10.0.0.0/8` → List: `local-ip`

4. **Add Mangle Rule:**
   - Navigate to IP > Firewall > Mangle
   - Click **+**
   - Chain: `prerouting`
   - Src. Address List: `local-ip`
   - Dst. Address List: `GAMES_IP`
   - Action: `mark-routing`
   - New Routing Mark: `vpn-routing-game`
   - Passthrough: Unchecked
   - Click **OK**

5. **Add Routes:**
   - Navigate to IP > Routes
   - Add static route to VPN server:
     - Dst. Address: `10.0.10.1`
     - Gateway: `192.168.1.1` (your ISP gateway)
     - Click **OK**
   - Add VPN routing:
     - Gateway: `VPN-GAME`
     - Routing Mark: `vpn-routing-game`
     - Click **OK**

## Understanding the Configuration

### Traffic Flow

```
Local Client (192.168.x.x)
        ↓
Requests to Game Server (e.g., 5001 TCP)
        ↓
Raw Firewall Rule Detects Port 5001
        ↓
Adds Server IP to GAMES_IP Address List
        ↓
Mangle Rule Marks Traffic with vpn-routing-game
        ↓
Routing Table: Send marked traffic → VPN-GAME interface
        ↓
NAT Masquerade: VPN-GAME replaces source IP
        ↓
VPN Connection: Packet encrypted → VPN Server
        ↓
VPN Server: Forwards to Game Server (appears from VPN IP)
```

### Configuration Components

| Component | Purpose |
|-----------|---------|
| OpenVPN Client | VPN tunnel to external server |
| NAT Masquerade | Hide MikroTik IP behind VPN |
| Address Lists | Store VPN server IP + detected game IPs |
| Raw Firewall | Detect game traffic by port |
| Mangle Rules | Mark traffic for routing decisions |
| Routes | Direct marked traffic through VPN |

## Verification

1. **Check VPN connection status:**
   ```routeros
   /interface ovpn-client print status
   ```
   Should show: `running=true`, `connected=yes`

2. **Verify game server detection:**
   ```routeros
   /ip firewall address-list print where list=GAMES_IP
   ```
   Should populate with detected game IPs after clients connect

3. **Test from client machine:**
   ```bash
   # Launch a game that uses ports 5001-5180
   # Game server IP should appear in address list within seconds
   ```

4. **Check routing marks:**
   ```routeros
   /ip firewall mangle print stats
   ```
   Counter should increase when game traffic passes

5. **Monitor VPN tunnel:**
   ```routeros
   /interface ovpn-client monitor VPN-GAME
   ```
   Should show active connection and packet counts

6. **Verify NAT translation:**
   ```routeros
   /ip firewall nat print stats
   ```
   VPN-GAME rule packet count should increase during gaming

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| VPN won't connect | Wrong credentials or server down | Verify IP/username/password; test VPN manually |
| Game traffic not routed through VPN | Raw rule not detecting ports | Check game uses listed ports; verify protocol (TCP/UDP) |
| Address list stays empty | Game server not detected | Manually add game IP: `/ip firewall address-list add address=X.X.X.X list=GAMES_IP` |
| VPN disconnects during gaming | VPN server overloaded or unstable | Try different VPN server; check VPN provider status |
| Game latency worse with VPN | VPN location too far | Choose closer VPN server; disable VPN for that game |
| Regular internet slow | All traffic going through VPN | Verify mangle rule targets only GAMES_IP |

## Advanced Options

### Add more game ports:
```routeros
# DOTA 2
/ip firewall raw add action=add-dst-to-address-list address-list="GAMES_IP" \
    chain=prerouting dst-address-list=!local-ip dst-port=27000-27030 protocol=tcp

# Call of Duty Warzone
/ip firewall raw add action=add-dst-to-address-list address-list="GAMES_IP" \
    chain=prerouting dst-address-list=!local-ip dst-port=3074 protocol=tcp
```

### Exclude specific IPs from VPN:
```routeros
/ip firewall mangle add action=mark-routing chain=prerouting \
    src-address-list=local-ip dst-address-list=!GAMES_IP \
    new-routing-mark=direct-routing passthrough=no comment="Direct Traffic"

/ip route add gateway="192.168.1.1" routing-mark=direct-routing comment="Direct Route"
```

### Bandwidth limit for VPN gaming:
```routeros
/queue simple add name="VPN-Gaming" target=10.1.0.0/16 \
    max-limit=10M/10M comment="Game traffic limit"
```

### Log all game traffic:
```routeros
/ip firewall raw set [find comment="Mobile Legends - TCP"] log=yes
/ip firewall raw set [find comment="Mobile Legends - UDP"] log=yes
```

### Time-based VPN (only active during gaming hours):
```routeros
:local hour [/system clock get hour];
:if ($hour >= 18 && $hour <= 23) do={
    /interface ovpn-client enable VPN-GAME
} else={
    /interface ovpn-client disable VPN-GAME
}
```

### Auto-detect by L7 protocol:
```routeros
/ip firewall layer7-protocol add name=mobile-legends regexp="ML"
/ip firewall mangle add action=mark-routing chain=forward layer7-protocol=mobile-legends \
    new-routing-mark=vpn-routing-game
```

### Automatic game IP list update from provider:
```routeros
# Script to fetch game server list and update address-list
/system script add name="update-game-servers" source={
    /tool fetch url="https://game-servers-list.example.com/export" output="file" \
        file="game-servers.txt"
    # Parse and add IPs to address-list
}
```

### VPN failover (backup VPN):
```routeros
# Primary VPN
/ip route add gateway="VPN-GAME-PRIMARY" routing-mark=vpn-routing-game distance=5

# Backup VPN (if primary fails)
/ip route add gateway="VPN-GAME-BACKUP" routing-mark=vpn-routing-game distance=10
```

## Game Server Port Reference

| Game | TCP Ports | UDP Ports |
|------|-----------|-----------|
| Mobile Legends | 5001-5180, 5501-5680, 9443, 30000-30220, 9001 | 5001-5180, 5501-5680, 9992, 30020-30220, 9001 |
| DOTA 2 | 27000-27030 | 27015-27030 |
| Valorant | 443, 80 | 443 |
| COD Warzone | 3074, 3478 | 3074, 3478 |
| Fortnite | 80, 443 | 5060 |

## Performance Considerations

1. **Bandwidth impact:** VPN encrypts all game traffic, ~5-10% overhead
2. **Latency:** Typically adds 20-100ms depending on VPN location
3. **CPU load:** Encryption/decryption on router CPU - monitor with `/system resource print`
4. **Concurrent games:** Each game creates separate address-list entry - limit if many players

## Completion

✅ **Gaming VPN routing is configured!**

**Next steps:**
- Test with actual game launch
- Monitor VPN connection stability
- Adjust game ports if needed
- Add more games as discovered
- Set up failover VPN if critical
- Back up configuration: `/system backup save`
- Document game IP ranges for future reference
