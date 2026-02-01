---
sidebar_position: 5
---

# 🌐 PPPoE PADO Delay

Optimize PPPoE connection establishment by configuring PADO (PPP Active Discovery Offer) delays across multiple servers with RADIUS authentication and automatic failover to backup servers when the primary becomes unavailable.

---

## ℹ️ Key Information

- **PADO delay** — Controls how quickly PPPoE server responds to discovery requests (lower = faster connection)
- **Dual PPPoE servers** — Primary and backup for redundancy and load distribution
- **RADIUS authentication** — Centralized user credential management with failover support
- **Automatic failover** — Secondary PPPoE server takes over if primary becomes unresponsive
- **Connection quality** — Optimized delays prevent congestion and improve client experience
- **Service uptime** — Multi-server setup ensures continuous service availability

:::warning
- Test PADO delays in lab before production deployment
- RADIUS failover requires proper server health monitoring
- Incorrect PADO timing can cause connection delays or failed authentications
- Configure both primary and secondary RADIUS servers for redundancy
:::

---

## ✅ Prerequisites

- Two MikroTik routers or RouterOS instances for PPPoE servers
- One RADIUS server (NPS, Mikrotik, or FreeRADIUS)
- User database configured in RADIUS
- Network connectivity between routers and RADIUS server
- Basic understanding of PPPoE and RADIUS authentication

---

## 🔧 Configuration

### Option A: Minimal Setup WITHOUT RADIUS

#### Server 1: Primary PPPoE (Local Auth)

```routeros
# Create IP pool
/ip pool add name=pppoe_pool ranges=10.0.0.10-10.0.0.254

# Create PPP profile
/ppp profile add name=pppoe_profile local-address=10.0.0.1 \
    remote-address=pppoe_pool

# Add local user
/ppp secret add name=testuser password=password123 service=pppoe profile=pppoe_profile

# Create PPPoE server with PADO delay 0 (primary)
/interface pppoe-server
add service-name=PRIMARY interface=ether2 profile=pppoe_profile pado-delay=0
```

#### Server 2: Secondary PPPoE (Local Auth)

```routeros
# Create IP pool
/ip pool add name=pppoe_pool_sec ranges=10.1.0.10-10.1.0.254

# Create PPP profile
/ppp profile add name=pppoe_profile_sec local-address=10.1.0.1 \
    remote-address=pppoe_pool_sec

# Add local user (same name and password)
/ppp secret add name=testuser password=password123 service=pppoe profile=pppoe_profile_sec

# Create PPPoE server with PADO delay 100 (secondary)
/interface pppoe-server
add service-name=SECONDARY interface=ether2 profile=pppoe_profile_sec pado-delay=100
```

---

### Option B: Complete Setup WITH RADIUS

#### Server 1: Primary PPPoE (RADIUS Auth)

```routeros
# Create IP pool
/ip pool add name=pppoe_pool ranges=10.0.0.10-10.0.0.254

# Create PPP profile with RADIUS
/ppp profile add name=pppoe_profile local-address=10.0.0.1 \
    remote-address=pppoe_pool use-radius=yes

# Add RADIUS servers (primary and backup)
/radius add service=ppp address=192.168.1.100 secret=RadiusSecret123 timeout=2s retry=3
/radius add service=ppp address=192.168.1.101 secret=RadiusSecret123 timeout=2s retry=3

# Create PPPoE server
/interface pppoe-server
add service-name=PRIMARY interface=ether2 profile=pppoe_profile pado-delay=0
```

#### Server 2: Secondary PPPoE (RADIUS Auth)

```routeros
# Create IP pool
/ip pool add name=pppoe_pool_sec ranges=10.1.0.10-10.1.0.254

# Create PPP profile with RADIUS
/ppp profile add name=pppoe_profile_sec local-address=10.1.0.1 \
    remote-address=pppoe_pool_sec use-radius=yes

# Add RADIUS servers (same as primary)
/radius add service=ppp address=192.168.1.100 secret=RadiusSecret123 timeout=2s retry=3
/radius add service=ppp address=192.168.1.101 secret=RadiusSecret123 timeout=2s retry=3

# Create PPPoE server
/interface pppoe-server
add service-name=SECONDARY interface=ether2 profile=pppoe_profile_sec pado-delay=100
```

---

### Option C: Health Monitoring (Optional)

```routeros
# Monitor primary PPPoE server
/tool netwatch add host=192.168.50.1 \
    down-script=":log warning \"Primary DOWN - Failover Active\""

# Monitor secondary PPPoE server
/tool netwatch add host=192.168.50.2 \
    up-script=":log info \"Secondary UP - Backup Active\""
```

---

### Option B: Winbox Configuration

#### Primary Server Setup (without RADIUS)

1. **Create IP Pool:**
   - Navigate to: **IP** → **Pool** → **+**
   - Name: `pppoe_pool`
   - Addresses: `10.0.0.10-10.0.0.254`

2. **Create PPP Profile:**
   - Go to: **PPP** → **Profiles** → **+**
   - Name: `pppoe_profile`
   - Local Address: `10.0.0.1`
   - Remote Address: `pppoe_pool`

3. **Add Local User:**
   - Go to: **PPP** → **Secrets** → **+**
   - Name: `testuser`
   - Password: `password123`
   - Service: `pppoe`
   - Profile: `pppoe_profile`

4. **Create PPPoE Server:**
   - Go to: **Interfaces** → **PPPoE Server** → **+**
   - Service Name: `PRIMARY`
   - Interface: `ether2`
   - Profile: `pppoe_profile`
   - PADO Delay: `0`

#### Primary Server Setup (with RADIUS)

1-2. Follow steps above to create pool and profile

3. **Enable RADIUS in Profile:**
   - Edit profile `pppoe_profile`
   - Set **Use RADIUS:** `yes`

4. **Add RADIUS Servers:**
   - Go to: **AAA** → **RADIUS** → **+**
   - Address: `192.168.1.100`
   - Secret: `RadiusSecret123`
   - Service: `ppp`
   - Timeout: `2s`
   - Repeat for backup: `192.168.1.101`

5. **Create PPPoE Server:**
   - Go to: **Interfaces** → **PPPoE Server** → **+**
   - Service Name: `PRIMARY`
   - Interface: `ether2`
   - Profile: `pppoe_profile`
   - PADO Delay: `0`

#### Secondary Server Setup
- Repeat above steps but:
  - Pool name: `pppoe_pool_sec` with range `10.1.0.10-10.1.0.254`
  - Profile name: `pppoe_profile_sec` with local: `10.1.0.1`
  - Service name: `SECONDARY`
  - **PADO Delay: `100`** (higher than primary)

---

## 📚 Understanding

### What is PADO Delay?

**PADO** stands for **PPP Active Discovery Offer**. It's the response message a PPPoE server sends when a client broadcasts a PADI (PPP Active Discovery Initiation) discovery request.

**PADO Delay** is the millisecond delay before the server responds to a discovery request. By configuring different delays on multiple servers, you control which server clients prefer:

- **Primary server (0ms delay):** Responds immediately → clients choose this first
- **Secondary server (100ms+ delay):** Responds slower → clients only choose this if primary doesn't respond

**Example timeline:**
```
T+0ms:    Client sends PADI broadcast asking "Any PPPoE servers available?"
T+0ms:    Primary server responds with PADO immediately
T+50ms:   Secondary server starts preparing PADO response (but primary already answered)
T+100ms:  Secondary server would send PADO (but client already connected to primary)

Result: Client connects to primary server automatically
```

If the primary server is down or offline:
```
T+0ms:    Client sends PADI broadcast
T+0ms:    Primary server is DOWN - no response
T+100ms:  Secondary server responds with PADO
T+105ms:  Client connects to secondary server

Result: Automatic failover to secondary server
```

### Why Use Dual Servers?

1. **High Availability** — If primary fails, clients immediately switch to secondary
2. **Load Distribution** — Spread connections across multiple servers
3. **Planned Maintenance** — Disable primary for updates while secondary handles traffic
4. **Redundancy** — No single point of failure in your PPPoE infrastructure
5. **Performance** — Reduce latency by spreading connections across servers

### RADIUS vs Local Authentication

**Without RADIUS (Local Authentication):**
- User credentials stored locally on each PPPoE server
- Each server has its own user database (`/ppp secret`)
- **Pros:** Simple, no external dependencies, faster
- **Cons:** Must manually sync users between servers

**With RADIUS (Centralized Authentication):**
- User credentials stored on central RADIUS server
- Both PPPoE servers query RADIUS for authentication
- **Pros:** Single source of truth, easy user management, scalable
- **Cons:** Requires RADIUS infrastructure, network dependency

### How Failover Works

**Scenario 1: Normal Operation**

```
Step 1: Client sends PADI to all PPPoE servers
        └─ Broadcast: "Who is providing PPPoE?"

Step 2: Primary PPPoE (PADO delay 0ms) responds immediately
        └─ Sends PADO: "I am! Connect to me"

Step 3: Secondary PPPoE also responds (but slower due to 100ms delay)
        └─ By now, client has already accepted primary's offer

Step 4: Client connects to primary PPPoE server
        └─ TCP connection established to primary server

Step 5: PPPoE authentication (with or without RADIUS)
        ├─ Without RADIUS: Check local /ppp secret
        └─ With RADIUS: Query RADIUS server for credentials

Step 6: Client gets IP address from pool
        └─ Primary pool: 10.0.0.10-10.0.0.254

Step 7: Active PPP session maintained on primary
        └─ User can browse/access services
```

**Scenario 2: Primary Server Failure**

```
Step 1: Client sends PADI to all PPPoE servers
        └─ Broadcast: "Who is providing PPPoE?"

Step 2: Primary PPPoE is DOWN (crashed, rebooted, network issue)
        └─ No response at T+0ms

Step 3: Client waits for responses (typically 3-5 seconds)
        └─ Primary didn't respond

Step 4: Secondary PPPoE responds at T+100ms
        └─ Sends PADO: "I can provide PPPoE"

Step 5: Client connects to secondary PPPoE server
        └─ TCP connection established to secondary server

Step 6: PPPoE authentication on secondary
        ├─ Without RADIUS: Check local /ppp secret on secondary
        └─ With RADIUS: Query RADIUS server (same as primary uses)

Step 7: Client gets IP address from secondary pool
        └─ Secondary pool: 10.1.0.10-10.1.0.254

Step 8: Active PPP session on secondary
        └─ Service continues with temporary IP change
```

### PADO Delay Values

| Delay | Use Case | Effect |
|-------|----------|--------|
| **0ms** | Primary server | Responds instantly, clients prefer this |
| **50-100ms** | Secondary server | Provides fallback while primary is tried first |
| **200ms+** | Tertiary/backup | Only chosen if primary and secondary fail |
| **Not set** | Disabled server | Server disabled or not participating |

**Recommendation:** Start with 0ms for primary and 100ms for secondary. Adjust based on your network latency.

### Connection Pool Management

Each PPPoE server manages its own IP pool:

```
Primary Server:
├─ Service Name: PRIMARY
├─ Pool: 10.0.0.10-10.0.0.254 (245 usable IPs)
├─ Local Address: 10.0.0.1
└─ Connects: 50-150 typical users

Secondary Server:
├─ Service Name: SECONDARY
├─ Pool: 10.1.0.10-10.1.0.254 (245 usable IPs)
├─ Local Address: 10.1.0.1
└─ Connects: 50-150 typical users

Important: Use different subnets to avoid IP conflicts!
Primary uses 10.0.0.0/24, Secondary uses 10.1.0.0/24
```

### RADIUS Server Failover

When using RADIUS, both PPPoE servers are configured with the same RADIUS servers (primary and backup):

```
Primary PPPoE Server connects to RADIUS:
├─ Try: 192.168.1.100 (RADIUS Primary) ← Tries first
├─ If fails → Try: 192.168.1.101 (RADIUS Backup)
└─ If both fail → Connection rejected (no local fallback)

Secondary PPPoE Server connects to RADIUS:
├─ Try: 192.168.1.100 (RADIUS Primary) ← Tries first
├─ If fails → Try: 192.168.1.101 (RADIUS Backup)
└─ If both fail → Connection rejected (no local fallback)

Each PPPoE connection gets authenticated independently
```

**RADIUS Failover Timeline:**
```
T+0s:    User connects to PPPoE server
T+0s:    PPPoE queries RADIUS Primary (192.168.1.100)
T+0.5s:  RADIUS Primary responds with OK
T+0.6s:  User authenticated, gets IP address

---

T+0s:    User connects to PPPoE server
T+0s:    PPPoE queries RADIUS Primary (192.168.1.100)
T+2s:    Timeout - RADIUS Primary not responding
T+2s:    PPPoE queries RADIUS Backup (192.168.1.101)
T+2.5s:  RADIUS Backup responds with OK
T+2.6s:  User authenticated, gets IP address
```

### Service Name Purpose

The service name determines which profiles and permissions apply:

```routeros
# In PPPoE configuration
/interface pppoe-server
add service-name=PRIMARY    # Clients see "PRIMARY" in their PPPoE discovery
add service-name=SECONDARY  # Clients see "SECONDARY" in their PPPoE discovery

# Clients can optionally request a specific service
# Most clients just accept any PPPoE server available
```

### How to Recognize Failover in Logs

When failover occurs, you'll see patterns like:

```
Without RADIUS (local auth):
[User1] connected to PRIMARY with IP 10.0.0.15
[User2] connected to PRIMARY with IP 10.0.0.16
[Primary server goes down]
[User3] connected to SECONDARY with IP 10.1.0.17 ← Different pool!

With RADIUS:
[User1] authenticated via RADIUS (192.168.1.100) on PRIMARY
[Primary RADIUS server goes down]
[User2] authenticated via RADIUS (192.168.1.101) on PRIMARY ← Fallback RADIUS
[User3] authenticated via RADIUS (192.168.1.101) on SECONDARY ← Fallback RADIUS
```

---

## ✔️ Verification

### 1. Check PPPoE Server Status

```routeros
/interface pppoe-server print
```

**Expected Output:**
```
Flags: X - disabled, D - dynamic
 #     NAME          INTERFACE  MTU   MRU   PADO-DELAY  PROFILE
 0     PRIMARY       ether2    1500  1500      0        pppoe_profile
 1     SECONDARY     ether2    1500  1500    100        pppoe_profile_sec
```

### 2. Verify Active Connections

```routeros
/interface pppoe-server print status
/ppp active print
```

**Expected Output:**
```
Flags: E - encryption
 #  NAME           CALLER-ID         SERVICE  UPTIME
 0  ppp-in-1       user1@isp         PRIMARY  0:05:32
 1  ppp-in-2       user2@isp         PRIMARY  0:02:15
 2  ppp-in-3       user3@isp         SECONDARY 0:01:08
```

### 3. Test RADIUS Connectivity

```routeros
/radius print
```

**Expected Output:**
```
Flags: X - disabled, D - dynamic
 #  SERVICE  ADDRESS         SECRET       TIMEOUT  RETRY
 0  ppp      192.168.1.100   RadiusSecret 2s       3
 1  ppp      192.168.1.101   RadiusSecret 2s       3
```

### 4. Connect Test Client

```bash
# From Linux client
pppoe -I eth0 -T 60 -U username -P password
```

**Expected:**
- Primary server responds first (PADO at 0ms)
- Connection established to 10.0.0.x range for primary or 10.1.0.x for secondary
- RADIUS authentication successful

### 5. Verify Failover

```routeros
# On primary server - disable PPPoE to simulate failure
/interface pppoe-server disable [find service-name=PRIMARY]

# On client - reconnect
pppoe -I eth0 -T 60 -U username -P password

# Should receive PADO from secondary (10.1.0.x address)
```

---

## 🔧 Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Clients can't connect to PPPoE | PPPoE server disabled | Enable with `/interface pppoe-server enable [find]` |
| PADO delay not working | High delay value configured | Reduce PADO delay (0-100ms recommended) or clear client cache |
| Clients connect but no IP | Profile not applied | Verify profile is set on PPPoE interface |
| Authentication fails | RADIUS unreachable | Check network connectivity: `ping 192.168.1.100` |
| Both RADIUS servers unreachable | Network or firewall issue | Verify UDP port 1812/1813 open, check firewall rules |
| Slow failover | RADIUS timeout too short | Increase timeout from 2s to 3s in `/radius` settings |
| No connections on secondary | Secondary PADO delay wrong | Set higher than primary (e.g., primary=0, secondary=100) |
| Users always connect to secondary | Primary PADO delay too high | Lower primary PADO delay or check if primary is responding |
| RADIUS not failing over | Single RADIUS server configured | Add secondary RADIUS with `add` command |

---

## ⚙️ Advanced Options

### 1. Dynamic PADO Delay Based on Load

```routeros
# Script to adjust PADO delay based on connection count
:local primary_count [/ppp active print count where service=PRIMARY]
:local secondary_count [/ppp active print count where service=SECONDARY]

:if ($primary_count > 50) do={
    /interface pppoe-server set [find service-name=PRIMARY] pado-delay=50
}
:if ($primary_count <= 30) do={
    /interface pppoe-server set [find service-name=PRIMARY] pado-delay=0
}

# Schedule this script to run every 5 minutes
/system scheduler add name=adjust-pado interval=5m on-event=loadbalance_pado
```

### 2. Per-User RADIUS Accounting

```routeros
# Add accounting to RADIUS for usage tracking
/radius set [find address=192.168.1.100] accounting=yes

# Create accounting profile
/ppp profile add name=accounting_profile accounting=yes
```

### 3. Bandwidth Limiting per User

```routeros
# Configure queue for PPPoE connections
/queue simple
add name=pppoe_limit target=10.0.0.0/24 max-packet-queue=50 \
    limit-at=1M/1M burst-limit=10M/10M burst-time=10s/10s

add name=secondary_limit target=10.1.0.0/24 max-packet-queue=50 \
    limit-at=1M/1M burst-limit=10M/10M burst-time=10s/10s
```

### 4. Automatic Failover Script

```routeros
# Complete failover script with alerts
:local primary_ip "192.168.50.1"
:local secondary_ip "192.168.50.2"
:local telegram_url "https://api.telegram.org/botTOKEN/sendMessage"

:local primary_status [/tool ping address=$primary_ip count=1 \
    timeout=1s do-not-fragment as-value print]

:if ($primary_status->"status" = "failed") do={
    /log warning "PRIMARY PPPoE DOWN - FAILOVER ACTIVE"
    /tool fetch url="$telegram_url?chat_id=ID&text=PPPoE+Primary+Down" \
        keep-result=no
}
```

### 5. Load Balancing Across Servers

```routeros
# Client distribution script
:local users_count [/ppp active print count]
:local balance_threshold (($users_count) / 2)
:local primary_count [/ppp active print count where service=PRIMARY]

:if ($primary_count > $balance_threshold) do={
    /interface pppoe-server set [find service-name=PRIMARY] pado-delay=100
    /interface pppoe-server set [find service-name=SECONDARY] pado-delay=0
}
```

### 6. RADIUS Backup Authentication (Local User DB)

```routeros
# If RADIUS fails, fall back to local database
/ppp secret add name=local_user password=password123 service=pppoe profile=pppoe_profile

# Configure PPP profile for local auth fallback
/ppp profile set pppoe_profile use-radius=yes
```

### 7. Connection Logging and Monitoring

```routeros
# Enable detailed logging
/system logging add topics=ppp,radius action=disk prefix="[PPPoE] "

# View logs
/log print where topics~"ppp|radius"
```

### 8. Scheduled Server Maintenance

```routeros
# Script for graceful server switch for maintenance
# Move all connections from primary to secondary before shutdown
:foreach conn in=[/ppp active find service=PRIMARY] do={
    /ppp terminate numbers=$conn
}

# Wait for disconnections
:delay 5s

# Now safe to reboot or update
/system reboot
```

---

## 🔗 Related Guides

- [PPPoE Server Basic Setup](./pppoe-server-basic) — Simple PPPoE configuration without RADIUS
- [RADIUS Authentication Setup](../Monitoring/radius-server-authentication) — Centralized user management
- [Multi-WAN Failover Configuration](../ISP/multi-wan-failover-advanced) — General failover concepts
- [Bandwidth Limiting and QoS](../Bandwidth/bandwidth-limiting-per-user) — Traffic prioritization
- [NetWatch Health Monitoring](../Monitoring/netwatch-health-check) — Service availability monitoring
- [PPP Profile Optimization](./ppp-profile-advanced) — Advanced profile tuning

---

✅ **PPPoE PADO delay failover configured successfully!** Your dual-server setup with RADIUS authentication is now ready to handle connection requests with automatic failover to backup servers.

