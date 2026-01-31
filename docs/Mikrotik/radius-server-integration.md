---
sidebar_position: 16
---

# 🔐 RADIUS Server Integration

## Overview

Set up MikroTik as a RADIUS server to centralize authentication and billing for PPPoE users across multiple Access Concentrators (ACs). RADIUS (Remote Authentication Dial-In User Service) runs on a central server and manages user accounts, bandwidth tiers, and session tracking. Access Concentrators (AC) are high-capacity routers in the field that aggregate user PPPoE connections and query the RADIUS server for each authentication. Users authenticate once, get assigned to profiles (10Mbps, 20Mbps, 30Mbps) automatically, and the AC applies bandwidth limits. Useful for ISPs, WiFi hotspots, and multi-site networks needing centralized billing.

:::info
**What this does:**
- Creates user groups with bandwidth tiers (RADIUS server)
- Registers PPPoE users and assigns them to groups (RADIUS server)
- Configures MikroTik as central RADIUS authentication server
- Enables multiple Access Concentrators to authenticate users remotely
- RADIUS server returns user group → AC applies QoS profile
- Tracks all user sessions centrally
:::

## Prerequisites

- ✅ MikroTik RADIUS server with User Manager license
- ✅ One or more Access Concentrators (MikroTik with PPP support)
- ✅ Network connectivity between RADIUS server and ACs (must reach port 1812 UDP)
- ✅ VLAN 100 (or equivalent) on AC for PPPoE interface
- ✅ IP address assigned to AC loopback (lo) interface
- ✅ Each AC pre-registered in RADIUS server's User-Manager
- ✅ Understanding of RADIUS protocol basics
- ✅ RouterOS v6.41+ on both server and ACs

:::warning
**RADIUS server considerations:**
- User Manager adds per-user licensing costs
- RADIUS traffic uses port 1812/1813 (UDP)
- Firewall must allow RADIUS packets from NAS routers
- User-Manager accounts are separate from system logins
- Changes to groups don't affect existing sessions immediately
- Large user bases (1000+) may need dedicated hardware
:::

## Configuration Steps

### Option A: Terminal Configuration

1. **Access the terminal:**
   ```bash
   ssh admin@your-router-ip
   ```

2. **Create User Manager user groups with bandwidth profiles:**
   ```routeros
   /user-manager user group
   add attributes=Mikrotik-Group:10MBPS \
       inner-auths=ttls-pap,ttls-chap,ttls-mschap1,ttls-mschap2,peap-mschap2 \
       name=10MBPS \
       outer-auths=pap,chap,mschap1,mschap2,eap-tls,eap-ttls,eap-peap,eap-mschap2
   
   add attributes=Mikrotik-Group:20MBPS \
       inner-auths=ttls-pap,ttls-mschap1,ttls-mschap2,peap-mschap2 \
       name=20MBPS \
       outer-auths=pap,chap,mschap1,mschap2,eap-tls,eap-ttls,eap-peap,eap-mschap2
   
   add attributes=Mikrotik-Group:30MBPS \
       inner-auths=ttls-pap,ttls-chap,ttls-mschap1,ttls-mschap2,peap-mschap2 \
       name=30MBPS \
       outer-auths=pap,chap,mschap1,mschap2,eap-tls,eap-ttls,eap-peap,eap-mschap2
   ```

3. **Add a test user to a group:**
   ```routeros
   /user-manager user
   add group=30MBPS name=TEST1
   ```

4. **Set RADIUS server loopback IP:**
   ```routeros
   /ip address
   add address=10.255.255.5 interface=lo network=10.255.255.5
   ```

5. **Register NAS router(s):**
   ```routeros
   /user-manager router
   add address=10.255.255.3 name=router1
   ```

6. **Create IP pools for PPPoE clients:**
   ```routeros
   /ip pool
   add name=POOL1 ranges=10.0.0.2-10.0.0.254
   add name=POOL2 ranges=10.1.0.2-10.1.0.254
   add name=POOL3 ranges=10.2.0.2-10.2.0.254
   ```

7. **Create PPP profiles with bandwidth limits:**
   ```routeros
   /ppp profile
   add change-tcp-mss=yes local-address=10.0.0.1 \
       name=10MBPS on-up=":log error \"YAWA\"" remote-address=POOL1
   
   add change-tcp-mss=yes local-address=10.1.0.1 \
       name=20MBPS on-up=":log error \"YAWA\"" remote-address=POOL2
   
   add change-tcp-mss=yes local-address=10.2.0.1 \
       name=30MBPS on-up=":log error \"YAWA\"" remote-address=POOL3
   ```

8. **Configure PPPoE server on interface:**
   ```routeros
   /interface pppoe-server server
   add disabled=no interface=vlan100 service-name=service1
   ```

9. **Set NAS loopback IP:**
   ```routeros
   /ip address
   add address=10.255.255.3 interface=lo network=10.255.255.3
   ```

10. **Enable RADIUS for PPP AAA:**
    ```routeros
    /ppp aaa
    set use-radius=yes
    ```

11. **Add static PPP secret (optional fallback):**
    ```routeros
    /ppp secret
    add local-address=10.0.0.1 name=TEST remote-address=10.0.0.2 service=pppoe
    ```

12. **Configure RADIUS server on NAS:**
    ```routeros
    /radius
    add address=10.255.255.5 service=ppp
    ```

13. **Enable RADIUS incoming (on RADIUS server):**
    ```routeros
    /radius incoming
    set accept=yes
    ```

14. **Verify configuration:**
    ```routeros
    /user-manager user print
    /user-manager router print
    /user-manager user group print
    /ppp aaa print
    /radius print
    ```

### Option B: WebFig Configuration

1. **Create User Groups:**
   - Navigate to System > User Manager > User Groups
   - Click **+**
   - Group Name: `10MBPS`
   - Attributes: `Mikrotik-Group:10MBPS`
   - Inner Auths: Check all PAP/CHAP/MSCHAP variants
   - Outer Auths: Check all PAP/CHAP/EAP variants
   - Click **OK**
   - Repeat for `20MBPS` and `30MBPS` groups

2. **Add Users:**
   - Navigate to System > User Manager > Users
   - Click **+**
   - Name: `TEST1`
   - Group: `30MBPS`
   - Click **OK**

3. **Set RADIUS Server Loopback:**
   - Navigate to IP > Addresses
   - Click **+**
   - Address: `10.255.255.5/32`
   - Interface: `lo`
   - Network: `10.255.255.5`
   - Click **OK**

4. **Register NAS Router:**
   - Navigate to System > User Manager > Routers
   - Click **+**
   - Name: `router1`
   - IP Address: `10.255.255.3`
   - Click **OK**

5. **Create IP Pools:**
   - Navigate to IP > Pools
   - Click **+** for each pool:
     - Name: `POOL1`, Ranges: `10.0.0.2-10.0.0.254`
     - Name: `POOL2`, Ranges: `10.1.0.2-10.1.0.254`
     - Name: `POOL3`, Ranges: `10.2.0.2-10.2.0.254`

6. **Create PPP Profiles:**
   - Navigate to PPP > Profiles
   - Click **+**
   - Name: `10MBPS`
   - Local Address: `10.0.0.1`
   - Remote Address: `POOL1`
   - Change TCP MSS: Checked
   - Click **OK**
   - Repeat for `20MBPS` and `30MBPS`

7. **Enable PPPoE Server:**
   - Navigate to Interfaces > PPPoE Server
   - Click **+**
   - Interface: `vlan100`
   - Service Name: `service1`
   - Click **OK**

8. **Enable RADIUS for PPP:**
   - Navigate to PPP > AAA
   - Use RADIUS: Check
   - Click **Apply**

9. **Configure RADIUS Server (on NAS):**
   - Navigate to Authentication > RADIUS
   - Click **+**
   - RADIUS Server Address: `10.255.255.5`
   - Service: `ppp`
   - Click **OK**

10. **Enable RADIUS Incoming:**
    - Navigate to Authentication > RADIUS Incoming
    - Accept: Check
    - Click **Apply**

## Understanding the Configuration
RADIUS Server vs Access Concentrator (AC)

**RADIUS Server (This Guide):**
- Central, authoritative authentication system
- Maintains user database (User-Manager)
- Returns user group/bandwidth tier information
- Runs User Manager license
- No direct user connections
- Typically one server (or redundant pair)
- IP: 10.255.255.5 (loopback)

**Access Concentrator (AC) - See [AC Server Guide](#):**
- Field router aggregating multiple user connections
- Receives RADIUS responses and applies QoS locally
- Does NOT store user database
- Runs PPPoE server for user connections
- Multiple ACs per RADIUS server
- Each AC has own IP (e.g., 10.255.255.3)

### Authentication Flow (RADIUS + AC Architecture)

```
User1 connects to AC1 (PPPoE) → AC1 gets username
                                    ↓
                        AC1 queries RADIUS Server (10.255.255.5:1812)
                                    ↓
                    RADIUS checks User-Manager: user "TEST1" → group "30MBPS"
                                    ↓
                    RADIUS returns: Mikrotik-Group=30MBPS (attribute)
                                    ↓
            AC1 receives response, applies profile "30MBPS" locally
                                    ↓
        AC1 assigns User1 IP from POOL3 (10.2.0.x) ← configured on AC
                                    ↓
            On-up script executes on AC1: `:log error "YAWA"`
                                    ↓
                    User1 connected with 30Mbps limit

User2 connects to AC2 (Different location)
                                    ↓
                        AC2 queries RADIUS Server (same 10.255.255.5)
                                    ↓
                    RADIUS checks User-Manager: user "TEST2" → group "10MBPS"
                                    ↓
                    RADIUS returns: Mikrotik-Group=10MBPS
                                    ↓
            AC2 applies profile "10MBPS" locally to User2
```

### Component Relationships

| Component | Location | Purpose |
|-----------|----------|---------|
| RADIUS Server | Central (10.255.255.5) | Authentication authority, user database, billing |
| User-Manager | RADIUS Server | Stores users, groups, attributes |
| Access Concentrator (AC) | Field (10.255.255.3, 10.255.255.4, etc.) | Aggregates user connections |
| PPPoE Server | AC | Accepts user connections |
| PPP Profiles | AC | Applies bandwidth/QoS to authenticated users |
| IP Pools | AC | Assigns IPs to PPPoE users |
| RADIUS Client | AC | Sends auth requests to RADIUS server |up script executes: `:log error "YAWA"`


### Component Relationships

| Component | Purpose |
|-----------|---------|
| User Groups | Define bandwidth tiers and auth methods |
| Users | Individual accounts linked to groups |
| IP Pools | Address ranges for PPPoE clients |
| PPP Profiles | QoS settings, local/remote IPs, scripts |
| PPPoE Server | Interface accepting PPP connections |
| RADIUS Server | Central authentication authority |
| NAS Router | Authenticates users against RADIUS |

## Verification


1. **Check user groups created:**
   ```routeros
   /user-manager user group print
   ```
   Should show: 10MBPS, 20MBPS, 30MBPS

2. **Verify users exist:**
   ```routeros
   /user-manager user print
   ```
   Should show: TEST1 in group 30MBPS

3. **Check NAS router registered:**
   ```routeros
   /user-manager router print
   ```
   Should show: router1 at 10.255.255.3

4. **Verify IP pools:**
   ```routeros
   /ip pool print
   ```

5. **Check RADIUS configuration:**
   ```routeros
   /radius print
   /radius incoming print
   ```

6. **Test PPPoE connection:**
   - From PPPoE client:
   ```bash
   pppoe-start
   ```
   - Watch logs on NAS:
   ```routeros
   /log print
   ```

7. **Monitor active sessions:**
   ```routeros
   /interface pppoe-server print stats
   /ppp active print
   ```

8. **Check assigned IPs:**
   ```routeros
   /ip address print
   ```
   Should show client IPs from POOL1/POOL2/POOL3

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| RADIUS server not responding | Incoming not enabled or firewall blocking | `/radius incoming set accept=yes` and allow port 1812/UDP |
| Users not authenticating | Group not created or user missing | Verify `/user-manager user print` and `/user-manager user group print` |
| NAS can't reach RADIUS server | Network route missing or wrong IP | Check route to 10.255.255.5 from NAS, verify loopback address on server |
| PPPoE connections succeed but no QoS applied | Profile not linked to group | Verify group attributes match profile names: `Mikrotik-Group:10MBPS` |
| Users get wrong IP pool | Profile misconfigured or RADIUS not returning attributes | Check `/ppp profile print` and verify on-up scripts execute |
| RADIUS log shows "invalid user" | User-Manager database wrong or typo | Compare username in RADIUS log vs `/user-manager user print` |
| Bandwidth limits not working | QoS not applied or queue rules missing | Add queue rules: `/queue simple add target=10.0.0.0/24 max-limit=10M/10M` |
| PPPoE server not accepting connections | Interface or service-name misconfigured | Verify: `/interface pppoe-server server print` shows interface active |
| NAS doesn't authenticate with RADIUS | Service set wrong or RADIUS client not configured | Ensure `/radius add service=ppp` on NAS side |
| Connection drops after auth | On-up script error or profile issue | Check `/log print` for script errors in on-up scripts |
| Multiple routers can't auth | NAS router not registered or firewall blocking | Add each NAS: `/user-manager router add address=X.X.X.X name=routerN` |
| User in wrong group | Typo in group assignment | Re-verify group name when adding user: `/user-manager user add group=30MBPS` |

## Advanced Options

### Create bandwidth-limited queue rules per profile:
```routeros
/queue simple add name="10MBPS" target=10.0.0.0/24 max-limit=10M/10M
/queue simple add name="20MBPS" target=10.1.0.0/24 max-limit=20M/20M
/queue simple add name="30MBPS" target=10.2.0.0/24 max-limit=30M/30M
```

### Add expiration date to user accounts:
```routeros
/user-manager user set TEST1 disabled-after=2026-12-31
```

### Create time-based profiles (peak/off-peak):
```routeros
/ppp profile add name=10MBPS-PEAK local-address=10.0.0.1 \
    remote-address=POOL1 rate-limit=10M
/ppp profile add name=10MBPS-OFFPEAK local-address=10.0.0.1 \
    remote-address=POOL1 rate-limit=20M
```

### Enable RADIUS accounting (track session duration):
```routeros
/ppp aaa set use-radius=yes accounting=yes
```

### Add multiple RADIUS servers (backup):
```routeros
/radius add address=10.255.255.6 service=ppp
```

### Create auto-disconnecting sessions:
```routeros
/ppp profile add name=10MBPS idle-timeout=30m
```

### Generate RADIUS shared secret for security:
```routeros
/user-manager router set router1 shared-secret="SecureRandomString123!"
```

### Monitor RADIUS traffic:
```routeros
:log info "RADIUS session: user=[/user-manager user get [*] name]"
```

### Create user groups with MAC-based profiles:
```routeros
/user-manager user group add attributes="Mikrotik-Group:MAC-LIMITED" name=mac-limited
```

### Enable RADIUS vendor-specific attributes (VSAs):
```routeros
/user-manager user group set 10MBPS attributes="Vendor-Specific:26.8000=100"
```

## Completion

✅ **RADIUS server configured!**

**Next steps:**
- Register NAS routers in User-Manager
- Create additional user groups for different speed tiers
- Set up monitoring for active sessions
- Add firewall rules to protect RADIUS port 1812/UDP
- Document user accounts and group assignments
- Back up configuration: `/system backup save`
