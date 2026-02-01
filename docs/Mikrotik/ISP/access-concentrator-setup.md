---
sidebar_position: 17
---

# 🌐 Access Concentrator (AC)

Set up MikroTik as an Access Concentrator (AC) to aggregate multiple PPPoE user connections and authenticate them against a remote RADIUS server. An AC is a field router that concentrates user connections, queries the central RADIUS server for authentication, and applies bandwidth profiles locally. Multiple ACs connect to one RADIUS server, enabling scalable, multi-location ISP networks. Users experience seamless roaming across ACs while maintaining consistent bandwidth profiles assigned by the RADIUS server.

:::info
**What this does:**

- Configures PPPoE server to accept user connections
- Connects to remote RADIUS server for centralized authentication
- Receives user group/tier from RADIUS response
- Applies local QoS profiles based on RADIUS attributes
- Registers AC identity with RADIUS server
- Enables multi-location user authentication

:::

## Prerequisites

- ✅ MikroTik RouterOS with PPP and RADIUS client support
- ✅ Remote RADIUS server already configured (see [RADIUS Server Integration](./radius-server-integration))
- ✅ RADIUS server IP address and network reachability
- ✅ VLAN 100 (or equivalent) interface for PPPoE
- ✅ IP address assigned to AC loopback (lo) interface
- ✅ AC registered in RADIUS server's User-Manager (Routers section)
- ✅ PPP profiles pre-created locally matching RADIUS group names (10MBPS, 20MBPS, 30MBPS)
- ✅ IP pools for PPPoE user assignment
- ✅ RouterOS v6.41+

:::warning
**Access Concentrator considerations:**

- AC does NOT store user database (RADIUS server does)
- PPP profiles MUST match group names from RADIUS server
- RADIUS server must know AC's loopback IP address
- Network latency to RADIUS server affects authentication speed
- If RADIUS unreachable, users cannot authenticate (no local fallback by default)
- Each AC needs unique loopback IP registered on RADIUS
- Scale to 1000+ users per AC (depends on hardware/bandwidth)

:::

## Configuration Steps

### Option A: Terminal Configuration (AC Router)

1. **Access the AC terminal:**

   ```bash
   ssh admin@ac-router-ip
   ```

2. **Assign loopback IP address to AC:**

   ```routeros
   /ip address
   add address=10.255.255.3 interface=lo network=10.255.255.3
   ```

3. **Create IP pools for PPPoE users:**

   ```routeros
   /ip pool
   add name=POOL1 ranges=10.0.0.2-10.0.0.254
   add name=POOL2 ranges=10.1.0.2-10.1.0.254
   add name=POOL3 ranges=10.2.0.2-10.2.0.254
   ```

4. **Create PPP profiles matching RADIUS group names:**

   ```routeros
   /ppp profile
   add change-tcp-mss=yes local-address=10.0.0.1 \
       name=10MBPS on-up=":log error \"USER_CONNECTED\"" remote-address=POOL1
   
   add change-tcp-mss=yes local-address=10.1.0.1 \
       name=20MBPS on-up=":log error \"USER_CONNECTED\"" remote-address=POOL2
   
   add change-tcp-mss=yes local-address=10.2.0.1 \
       name=30MBPS on-up=":log error \"USER_CONNECTED\"" remote-address=POOL3
   ```

5. **Configure PPPoE server on interface:**

   ```routeros
   /interface pppoe-server server
   add disabled=no interface=vlan100 service-name=service1
   ```

6. **Enable RADIUS for PPP authentication:**

   ```routeros
   /ppp aaa
   set use-radius=yes
   ```

7. **Add static PPP secret for fallback (optional):**

   ```routeros
   /ppp secret
   add local-address=10.0.0.1 name=local-user remote-address=10.0.0.2 service=pppoe
   ```

8. **Configure RADIUS server address (point to central server):**

   ```routeros
   /radius
   add address=10.255.255.5 service=ppp
   ```

   :::tip
   Replace `10.255.255.5` with your actual RADIUS server IP
   :::

9. **Add RADIUS shared secret (must match RADIUS server config):**

   ```routeros
   /radius set [find service=ppp] shared-secret="SharedSecret123"
   ```

10. **Verify AC is registered on RADIUS server:**

    ```bash
    # SSH to RADIUS server and check:
    ssh admin@radius-server-ip
    ```

    ```routeros
    /user-manager router print
    # Should show this AC's loopback IP (10.255.255.3) registered
    ```

11. **Verify AC configuration:**

    ```routeros
    /ip address print where interface=lo
    /ppp aaa print
    /radius print
    /ppp profile print
    /ip pool print
    ```

### Option B: Winbox Configuration (AC Router)

1. **Set loopback IP:**
   - Navigate to IP > Addresses
   - Click **+**
   - Address: `10.255.255.3/32`
   - Interface: `lo`
   - Click **OK**

2. **Create IP pools:**
   - Navigate to IP > Pools
   - Create three pools:
     - Name: `POOL1`, Ranges: `10.0.0.2-10.0.0.254`
     - Name: `POOL2`, Ranges: `10.1.0.2-10.1.0.254`
     - Name: `POOL3`, Ranges: `10.2.0.2-10.2.0.254`

3. **Create PPP profiles:**
   - Navigate to PPP > Profiles
   - For each profile:
     - Name: `10MBPS`, Local: `10.0.0.1`, Remote: `POOL1`, MSS: Checked
     - Name: `20MBPS`, Local: `10.1.0.1`, Remote: `POOL2`, MSS: Checked
     - Name: `30MBPS`, Local: `10.2.0.1`, Remote: `POOL3`, MSS: Checked

4. **Enable PPPoE server:**
   - Navigate to Interfaces > PPPoE Server
   - Click **+**
   - Interface: `vlan100`
   - Service Name: `service1`
   - Click **OK**

5. **Enable RADIUS authentication:**
   - Navigate to PPP > AAA
   - Use RADIUS: Check
   - Click **Apply**

6. **Configure RADIUS server:**
   - Navigate to Authentication > RADIUS
   - Click **+**
   - Address: `10.255.255.5` (your RADIUS server)
   - Service: `ppp`
   - Shared Secret: `SharedSecret123` (must match RADIUS config)
   - Click **OK**

## Understanding the Configuration

### AC Authentication Flow

```
Step 1: User connects to AC PPPoE
        ↓
Step 2: User enters credentials (username/password)
        ↓
Step 3: AC queries RADIUS server:
        "Authenticate user TEST1 with password XYZ"
        (RADIUS server IP: 10.255.255.5:1812)
        ↓
Step 4: RADIUS server checks User-Manager:
        "TEST1 exists → assigned to group 30MBPS"
        ↓
Step 5: RADIUS returns to AC:
        "Auth SUCCESS, Mikrotik-Group=30MBPS"
        ↓
Step 6: AC retrieves PPP profile: "30MBPS"
        (Pre-configured on AC: 30Mbps limit, POOL3 IP range)
        ↓
Step 7: AC applies profile to user:
        - Assigns IP from POOL3 (10.2.0.x)
        - Sets bandwidth limit to 30Mbps
        - Executes on-up script
        ↓
Step 8: User connected with 30Mbps bandwidth
```

### AC vs RADIUS Server Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    RADIUS SERVER (Central)                   │
│                    IP: 10.255.255.5                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ User-Manager Database                                │   │
│  │ - TEST1 → group: 30MBPS                             │   │
│  │ - TEST2 → group: 10MBPS                             │   │
│  │ - TEST3 → group: 20MBPS                             │   │
│  │ - AC1 (10.255.255.3) registered                     │   │
│  │ - AC2 (10.255.255.4) registered                     │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↑ (Port 1812 UDP)
                            ↓
                  ┌─────────────────────┐
                  │  Auth Request       │
                  │  (username/passwd)  │
                  └─────────────────────┘
                            ↓
                  ┌─────────────────────┐
                  │  Auth Response      │
                  │  (group attribute)  │
                  └─────────────────────┘
                            ↑
        ┌───────────────────────────────────────────┐
        │                                           │
   ┌─────────────────────┐              ┌─────────────────────┐
   │ AC1 (Field Router)  │              │ AC2 (Field Router)  │
   │ IP: 10.255.255.3    │              │ IP: 10.255.255.4    │
   ├─────────────────────┤              ├─────────────────────┤
   │ PPPoE Server        │              │ PPPoE Server        │
   │ POOL1,POOL2,POOL3   │              │ POOL1,POOL2,POOL3   │
   │ Profiles:           │              │ Profiles:           │
   │ - 10MBPS            │              │ - 10MBPS            │
   │ - 20MBPS            │              │ - 20MBPS            │
   │ - 30MBPS            │              │ - 30MBPS            │
   └─────────────────────┘              └─────────────────────┘
        ↑                                      ↑
   User1 connects                        User2 connects
   (PPPoE)                               (PPPoE)
```

### Key Differences: AC vs RADIUS

| Aspect | Access Concentrator (AC) | RADIUS Server |
|--------|--------------------------|---------------|
| **Location** | Field/remote sites | Central datacenter |
| **User DB** | None (queries RADIUS) | Complete user database |
| **PPPoE** | Runs PPPoE server | No users connect here |
| **Auth Queries** | Sends to RADIUS | Responds to queries |
| **Profiles** | Applies profiles locally | Defines profiles (returns attributes) |
| **User Count** | Can serve 1000+ users | Can serve 10,000+ users |
| **Quantity** | Multiple (one per location) | One or two (with backup) |
| **Storage** | Profiles, IPs, settings | User accounts, groups, billing |

## Verification

1. **Verify AC loopback IP:**

   ```routeros
   /ip address print where interface=lo
   ```

   Should show: `10.255.255.3`

2. **Check PPP profiles:**

   ```routeros
   /ppp profile print
   ```

   Should show: `10MBPS`, `20MBPS`, `30MBPS`

3. **Verify IP pools:**

   ```routeros
   /ip pool print
   ```

4. **Check RADIUS configuration on AC:**

   ```routeros
   /radius print
   /ppp aaa print
   ```

5. **Test user connection from client:**

   ```bash
   pppoe-connect username:password
   ```

6. **Monitor active PPPoE sessions:**

   ```routeros
   /ppp active print
   ```

7. **Check assigned IPs:**

   ```routeros
   /ip address print
   ```

   Should show user IPs from POOL1/POOL2/POOL3

8. **Verify RADIUS communication (check logs):**

   ```routeros
   /log print where topics~"radius"
   ```

9. **Test from RADIUS server side:**

   ```bash
   ssh admin@radius-server
   ```

   ```routeros
   /user-manager user print
   # User connections should appear here
   ```

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| PPPoE users can't connect | PPPoE server not enabled or interface down | Check: `/interface pppoe-server server print` and verify vlan100 is active |
| Auth fails: "RADIUS unreachable" | Network route to RADIUS missing or firewall blocking | Verify: `ping 10.255.255.5` and allow port 1812/UDP in firewall |
| Auth fails: "Invalid user" | User not in RADIUS database or typo | Check RADIUS server: `/user-manager user print` |
| User gets wrong profile | Profile name doesn't match RADIUS group attribute | Verify group name is exactly "10MBPS" not "10mbps" or "10-MBPS" |
| User assigned wrong IP | Pool assignment misconfigured or profile points to wrong pool | Check: `/ppp profile print` remote-address matches pool name |
| AC not registered on RADIUS | AC loopback IP not added to Routers section | On RADIUS: `/user-manager router add address=10.255.255.3 name=ac1` |
| Shared secret mismatch | AC shared secret ≠ RADIUS shared secret | On AC: `/radius set [find service=ppp] shared-secret="SharedSecret123"` |
| Users can't reach internet | Firewall or routing blocking PPPoE clients | Add route: `/ip route add dst-address=10.0.0.0/8 gateway=bridge-gateway` |
| RADIUS server timeout | Server overloaded or network latency high | Increase timeout: `/radius set timeout=3` |
| PPP on-up scripts not executing | Script syntax error or profile not applied | Test script: `/ppp profile set [find name=10MBPS] on-up=":log info TEST"` |
| Multiple AC auth conflicts | Both ACs registered with same IP | Use unique loopback IPs: AC1=10.255.255.3, AC2=10.255.255.4 |

## Advanced Options

### Enable RADIUS session accounting (track duration/bytes)

```routeros
/ppp aaa set accounting=yes
/radius set [find service=ppp] accounting=yes
```

### Create backup static users (fallback if RADIUS down)

```routeros
/ppp secret add name=backup-user remote-address=10.0.0.100 \
    local-address=10.0.0.1 service=pppoe
```

### Add multiple RADIUS servers (primary + backup)

```routeros
/radius add address=10.255.255.6 service=ppp
# Uses first as primary, second as backup
```

### Configure RADIUS timeout and retries

```routeros
/radius set timeout=2 retries=3
```

### Limit concurrent PPPoE connections per user

```routeros
/ppp profile add name=10MBPS session-limit=2
```

### Add QoS queue rules per pool

```routeros
/queue simple add name="POOL1-QoS" target=10.0.0.0/24 \
    max-limit=10M/10M limit-at=1M/1M
```

### Enable PPPoE statistics logging

```routeros
/system scheduler add name="pppoe-stats" interval=1h \
    on-event="/log info \"PPPoE Active: $[/ppp active print count-only]\""
```

### Add per-profile bandwidth graphs

```routeros
/interface ethernet set ether1 comment="PPPoE Uplink"
/interface monitor-traffic ether1
```

### Create VLAN-based AC segregation

```routeros
/interface vlan add name=vlan101 vlan-id=101 interface=ether2
/interface pppoe-server server add interface=vlan101 service-name=service2
```

### Configure idle timeout (disconnect inactive users)

```routeros
/ppp profile set [find name=10MBPS] idle-timeout=30m
```

## Completion

✅ **Access Concentrator configured!**

**Next steps:**

- Register this AC on the RADIUS server: `/user-manager router add address=10.255.255.3 name=ac1`
- Test user login with credentials from RADIUS database
- Monitor active sessions: `/ppp active print`
- Enable accounting if tracking billing data
- Set up monitoring/alerts for connection counts
- Deploy to multiple locations with unique loopback IPs
- Back up configuration: `/system backup save`
