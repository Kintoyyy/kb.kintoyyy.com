---
sidebar_position: 8
---

# 🌐 TR-069 Provisioning

Master TR-069 (CPE WAN Management Protocol) for automated modem and ONT provisioning. Learn how OLTs configure ONTs via OMCI, and how GenieACS (TR-069 server) provisions broadband device settings from the cloud.

---

## ℹ️ Key Information

- **TR-069** — CWMP (CPE WAN Management Protocol) standard for remote device management
- **GenieACS** — Open-source TR-069 server for device provisioning and management
- **OMCI** — ONT Management and Control Interface (Layer 2 protocol between OLT and ONT)
- **ONT** — Optical Network Terminal (subscriber device connected to OLT)
- **OLT** — Optical Line Terminal (ISP-side network equipment)
- **Auto-provisioning** — Zero-touch device configuration without manual setup
- **Device parameters** — WAN, VLAN, QoS, DNS, DHCP, and firmware settings managed remotely

:::warning
- TR-069 requires working Internet connectivity from device to ACS server
- OMCI provisioning requires OLT-ONT optical connection to be established
- Incorrect VLAN configuration can prevent TR-069 communication
- GenieACS database and Redis cache must be monitored for performance
- Device firmware updates via TR-069 can cause temporary outages
- OMCI messages are Layer 2 - not routable beyond OLT port
:::

---

## ✅ Prerequisites

- OLT device supporting OMCI (VSOL, BSCom, Huawei, ZTE, etc.)
- ONTs compatible with OLT and TR-069
- GenieACS server deployed (on router, Linux VM, or cloud)
- Network connectivity: OLT ↔ GenieACS server (typically management network)
- Management VLAN configured on OLT and router
- Basic understanding of OMCI, VLAN, and DHCP

---

## 🔧 Configuration

### Understanding the Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    TR-069 PROVISIONING FLOW                     │
└─────────────────────────────────────────────────────────────────┘

PHASE 1: OLT Configures ONT via OMCI (Layer 2)
┌──────────────┐                               ┌──────────────┐
│     OLT      │──────── OMCI Messages ────────│     ONT      │
│              │  (SetValue, GetValue, etc)   │   (CPE/      │
│  - Profiles  │                               │   Modem)     │
│  - TR069 URL │                               │              │
│  - VLAN ID   │                               │              │
└──────────────┘                               └──────────────┘
        │
        ├─ OMCI sets:
        │  ├─ WAN service port VLAN
        │  ├─ IP host config mode (DHCP)
        │  ├─ TR069 ACS server URL
        │  └─ Connection request username
        │
        └─ ONT stores config and reboots


PHASE 2: ONT Boots and Connects to Management VLAN
┌──────────────┐              
│     ONT      │
│  - Boots up  │
│  - Gets VLAN │
│  - Gets IP   │──── DHCP Request ────┐
│    from DHCP │                      │
└──────────────┘                      │
        │                             │
        └─── Gets IP from DHCP Pool ──┘
        
        ├─ Assigned IP: 10.20.0.50
        ├─ Gateway: 10.20.0.1
        └─ DNS: 8.8.8.8


PHASE 3: ONT Contacts GenieACS Server (Layer 3)
┌──────────────┐                       ┌──────────────────────┐
│     ONT      │───── TR-069 HTTP ────│   GenieACS Server    │
│              │   (CWMP Protocol)    │                      │
│  - Initiates │                       │  - Analyzes params   │
│    1st hello │                       │  - Applies rules     │
│  - Reports   │◄──── XML Response ───│  - Sends config      │
│    parameters│                       │                      │
└──────────────┘                       └──────────────────────┘
        │                                        │
        ├─ Sends: Device serial #               ├─ Stores in DB
        ├─ Sends: Software version              ├─ Updates cache
        ├─ Sends: Current parameters            ├─ Triggers hooks
        └─ Requests: Config from ACS            └─ Provisions new params


PHASE 4: GenieACS Provisions Parameters
┌──────────────────────────────────────────────────────────────┐
│               Parameter Provisioning                         │
├──────────────────────────────────────────────────────────────┤
│ 1. WAN Configuration                                         │
│    ├─ InternetGatewayDevice.WANDevice.1.WANCommonInterface  │
│    │  .Enabled = 1                                           │
│    ├─ WANIPConnection.ConnectionType = "IP_Routed"           │
│    └─ WANIPConnection.AddressingType = "DHCP"                │
│                                                              │
│ 2. VLAN Settings                                            │
│    ├─ .VAlanEnable = 1                                       │
│    ├─ .VAlanID = 100 (Data VLAN)                             │
│    └─ .TPriority = 2                                         │
│                                                              │
│ 3. LAN Configuration                                         │
│    ├─ LANDevice.1.LANEthernetInterfaceConfig                │
│    ├─ .Enable = 1                                            │
│    └─ .Speed = "Auto"                                        │
│                                                              │
│ 4. WiFi (if supported)                                      │
│    ├─ Radio.1.Enable = 1                                     │
│    ├─ SSID = "ISP_WIFI_" + Serial                            │
│    └─ KeyPassphrase = GeneratedPassword                     │
│                                                              │
│ 5. DNS/DHCP Settings                                        │
│    ├─ LANDevice.1.DHCPServer.Enable = 1                     │
│    ├─ DHCPServer.Pool.1.SubnetMask = "255.255.255.0"        │
│    ├─ DHCPServer.Pool.1.MinAddress = "192.168.1.100"        │
│    └─ DHCPServer.Pool.1.MaxAddress = "192.168.1.200"        │
│                                                              │
│ 6. QoS / Bandwidth Limits                                   │
│    ├─ TrafficScheduler.1.QueueWeight = 50                   │
│    └─ TrafficScheduler.2.QueueWeight = 30                   │
│                                                              │
│ 7. Firmware Update (if needed)                              │
│    ├─ SetParameterValues(Firmware)                          │
│    ├─ Upload triggers device reboot                         │
│    └─ Version checked post-reboot                           │
└──────────────────────────────────────────────────────────────┘
```

### Option A: Huawei OLT - Configure ONT via OMCI

**Note:** TR-069 and GenieACS provisioning require third-party applications and management systems to be truly effective. Standalone OLT provisioning via OMCI is just the foundation. For comprehensive provisioning with automatic scaling, user management, and service activation, you need a proper ACS (Auto Configuration Server) system like GenieACS.

```routeros
# Connect to Huawei OLT (SSH/Telnet)

# Step 1: Configure ONT
config
olt 0
port 0/1/0
  ont add 0 1 sn TESTONU00001234 type SFU desc "Test ONT"

# Step 2: Configure IP host (management VLAN 20)
config
interface ont0/1/0/1
  ip-host 0 ipconfig dhcp vlan 20

# Step 3: Set TR069 parameters via OMCI
config
interface ont0/1/0/1
  tr069-server-address http://192.168.1.50:7547/
  tr069-server-username support
  tr069-server-password support123
  tr069-enable enable

# Step 4: Configure WAN interface (data VLAN 100)
config
service-port 0 1
  port-mapping 0 1
    wan-port 1 vlan-id 100 priority 2

# Step 5: Set service bandwidth (QoS)
config
service-port 0 1
  qos-profile 1 name "Standard_10M"
    cir 10M
    pir 10M

# Step 6: Apply profile to ONT
config
interface ont0/1/0/1
  qos-profile 1

# Step 7: Enable ONT
config
interface ont0/1/0/1
  state enable

# Step 8: Reboot to apply OMCI config
admin reboot ont 0 1 1
```

**Implementation Notes:**

OLT provisioning via OMCI differs significantly between vendors in syntax and command structure. Each OLT manufacturer (VSOL, BSCom, Huawei, ZTE) uses their own CLI conventions, so adapt the commands above based on your specific OLT model's documentation.

---

### Option B: GenieACS Server Configuration

#### GenieACS Installation and Setup

**For complete GenieACS installation and deployment instructions, refer to the dedicated guide:**

👉 **[GenieACS Auto-Installer and Deployment](../../Proxmox/genieacs-auto-installer)**

This guide covers:
- Automated installation scripts
- Docker deployment
- Proxmox VM setup
- Post-installation configuration
- Service management and troubleshooting

**Quick reference:**
```bash
# After GenieACS is installed and running
# Access web UI: http://localhost:3000
# Default credentials: admin / admin

# Start services
sudo systemctl start genieacs

# Check status
sudo systemctl status genieacs

# View logs
sudo journalctl -u genieacs -f
```

#### GenieACS Configuration File

```javascript
// /opt/genieacs/config/config.json

{
  "cwmp": {
    "port": 7547,
    "ssl": false
  },
  "nbi": {
    "port": 7548,
    "ssl": false
  },
  "fs": {
    "port": 7549,
    "ssl": false
  },
  "mongodb": {
    "url": "mongodb://localhost:27017/genieacs"
  },
  "redis": {
    "url": "redis://localhost:6379"
  }
}
```

#### GenieACS Device Configuration Template

```javascript
// Create device object in GenieACS

// Access device via serial number
// Device: TESTONU00001234

// Provision WAN parameters
declare("Device.WANDevice.1.WANCommonInterface.Enabled", {value: 1});
declare("Device.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.Enable", {value: 1});
declare("Device.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.ConnectionType", {value: "IP_Routed"});
declare("Device.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.AddressingType", {value: "DHCP"});

// Provision VLAN settings
declare("Device.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.VlanEnable", {value: 1});
declare("Device.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.VlanID", {value: 100});
declare("Device.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.VlanPriority", {value: 2});

// Provision LAN DHCP
declare("Device.LANDevice.1.LANEthernetInterfaceConfig.1.Enable", {value: 1});
declare("Device.LANDevice.1.DHCPServer.1.Enable", {value: 1});
declare("Device.LANDevice.1.DHCPServer.1.MinAddress", {value: "192.168.1.100"});
declare("Device.LANDevice.1.DHCPServer.1.MaxAddress", {value: "192.168.1.200"});
declare("Device.LANDevice.1.DHCPServer.1.SubnetMask", {value: "255.255.255.0"});

// Provision WiFi (if supported)
declare("Device.WiFi.Radio.1.Enable", {value: 1});
declare("Device.WiFi.SSID.1.SSID", {value: "ISP_WIFI_" + serialNumber});
declare("Device.WiFi.AccessPoint.1.Security.BeaconType", {value: "WPAand11i"});
declare("Device.WiFi.AccessPoint.1.Security.KeyPassphrase", {value: generatePassword()});

// Set DNS
declare("Device.LANDevice.1.DHCPServer.1.DNSServers", {value: "8.8.8.8,8.8.4.4"});

// Configure QoS if needed
declare("Device.QueueManagement.Queue.1.Interface", {value: "WANDevice.1.WANConnectionDevice.1.WANIPConnection.1"});
declare("Device.QueueManagement.Queue.1.QueueWeight", {value: 50});
```

### Option C: Complete End-to-End Provisioning

#### MikroTik Router with GenieACS Integration

```routeros
# On MikroTik Router (management network)

# Step 1: Create management VLAN
/interface vlan add name=vlan_mgmt interface=ether1 vlan-id=20

# Step 2: Configure IP for management VLAN
/ip address add address=10.20.0.1/24 interface=vlan_mgmt

# Step 3: Create DHCP pool for ONT management
/ip pool add name=ont_mgmt_pool ranges=10.20.0.10-10.20.0.254

# Step 4: Create DHCP server for ONT management
/ip dhcp-server add name=ont_dhcp interface=vlan_mgmt address-pool=ont_mgmt_pool

# Step 5: Configure DHCP network
/ip dhcp-server network add address=10.20.0.0/24 gateway=10.20.0.1 \
    dns-server=8.8.8.8,8.8.4.4

# Step 6: Deploy GenieACS server on router (optional, or use external server)
# If using external: Set firewall rules to allow traffic

/ip firewall nat add chain=dstnat protocol=tcp dst-port=7547 \
    action=dst-nat to-address=192.168.1.50 to-port=7547

# Step 7: Monitor DHCP assignments
/ip dhcp-server lease print

# Step 8: Verify ONT connectivity to GenieACS
/log print where message~"genieacs"
```

---

## 📚 Understanding

### What is TR-069?

**TR-069** (CPE WAN Management Protocol) is an industry standard (published by Broadcom) that enables:
- Remote management of Customer Premises Equipment (CPE)
- Auto-provisioning of device parameters
- Firmware updates
- Diagnostics and monitoring
- Software activation

**Key characteristics:**
- HTTP/HTTPS-based (XML protocol)
- Pull-based: Device initiates connection to ACS server
- Stateful: Server can provision parameters during connection
- Secure: Can use SSL/TLS and digest authentication

### OMCI (ONT Management and Control Interface)

**OMCI** is Layer 2 (Data Link layer) protocol used between OLT and ONT:

```
OSI Layer Mapping:

Layer 7: Application (TR-069, ICMP)
         ↑↓
Layer 6-5: (Presentation, Session)
         ↑↓
Layer 4: Transport (TCP, UDP)
         ↑↓
Layer 3: Network (IP)
         ↑↓
Layer 2: Data Link ◄── OMCI operates here (between OLT and ONT)
         ↑↓
Layer 1: Physical (Optical fiber)
```

**OMCI Message Types:**

| Message | Direction | Purpose |
|---------|-----------|---------|
| **GetRequest** | OLT → ONT | Query ONT managed objects |
| **GetResponse** | ONT → OLT | Return requested parameters |
| **SetRequest** | OLT → ONT | Set ONT parameters (VLAN, TR069 URL, etc) |
| **SetResponse** | ONT → OLT | Confirm parameter change |
| **CreateRequest** | OLT → ONT | Create new managed object instance |
| **CreateResponse** | ONT → OLT | Confirm object creation |
| **RebootRequest** | OLT → ONT | Trigger ONT reboot |
| **RebootResponse** | ONT → OLT | Confirm reboot initiated |

**Example OMCI Flow:**

```
OLT                                          ONT
 │
 ├─ GetRequest (Get TR069 Server URL) ───────→ │
 │                                             │
 │ ◄──── GetResponse (Current URL is empty)───┤
 │
 ├─ SetRequest (Set TR069 URL to 192.168.1.50:7547) ──→ │
 │                                                       │
 │ ◄────── SetResponse (Success) ────────────────────┤
 │
 ├─ RebootRequest ───────────────────────────────────→ │
 │                                                   │
 │ ◄──── RebootResponse (Rebooting...) ────────────┤
 │                                                   │
 │                                         [ONT Reboots]
 │                                    [Connects to VLAN 20]
 │                                    [Gets IP from DHCP]
 │                                    [Contacts GenieACS]
```

### TR-069 Connection Sequence

```
Step 1: ONT Boot
├─ DHCP discovers management VLAN (20)
├─ Gets IP address (10.20.0.50)
├─ Gets gateway (10.20.0.1) and DNS (8.8.8.8)
└─ Stores TR069 ACS URL from OMCI config (http://192.168.1.50:7547)

Step 2: First Connection ("Inform")
├─ ONT initiates HTTP connection to ACS server
├─ Sends XML: Device info, serial #, software version
├─ Sends: Current parameter values
└─ GenieACS receives and logs in database

Step 3: GenieACS Analyzes & Provisions
├─ Queries device profile in database
├─ Checks if parameters need update
├─ Generates XML response with new values
└─ Sends "ParameterValues" object

Step 4: ONT Receives Parameters
├─ Reads XML response from ACS
├─ Validates parameter changes
├─ Updates internal configuration
├─ Sends back confirmation ("EmptyHttp")
└─ Disconnects from ACS

Step 5: Periodic Inform (Optional)
├─ ONT connects to ACS every 24 hours (default)
├─ Sends new inform with current state
├─ ACS provisions any new parameters
└─ Loop repeats
```

### Device Parameter Tree

TR-069 uses hierarchical parameter naming:

```
Device (root)
├── DeviceInfo
│   ├── Manufacturer = "VENDOR_NAME"
│   ├── ModelName = "MODEL_X"
│   ├── SerialNumber = "TESTONU00001234"
│   ├── SoftwareVersion = "v2.1.3"
│   └── HardwareVersion = "v1.0"
│
├── WANDevice
│   └── 1
│       ├── WANCommonInterface
│       │   └── Enabled = 1
│       │
│       └── WANConnectionDevice
│           └── 1
│               ├── WANIPConnection
│               │   ├── Enable = 1
│               │   ├── AddressingType = "DHCP"
│               │   ├── ExternalIPAddress = "203.0.113.50"
│               │   ├── VlanEnable = 1
│               │   ├── VlanID = 100
│               │   └── VlanPriority = 2
│               │
│               └── WANEthernetLinkConfig
│                   ├── EthernetLinkStatus = "Up"
│                   └── MaxBitRate = "1000"
│
├── LANDevice
│   └── 1
│       ├── LANEthernetInterfaceConfig
│       │   ├── 1
│       │   │   ├── Enable = 1
│       │   │   ├── Status = "Up"
│       │   │   ├── MACAddress = "00:11:22:33:44:55"
│       │   │   └── MaxBitRate = "1000"
│       │   │
│       │   └── 2
│       │       ├── Enable = 1
│       │       └── MaxBitRate = "1000"
│       │
│       └── DHCPServer
│           ├── Enable = 1
│           └── Pool
│               └── 1
│                   ├── Enable = 1
│                   ├── SubnetMask = "255.255.255.0"
│                   ├── MinAddress = "192.168.1.100"
│                   ├── MaxAddress = "192.168.1.200"
│                   └── LeaseTime = 3600
│
├── WiFi (if supported)
│   ├── Radio
│   │   └── 1
│   │       ├── Enable = 1
│   │       ├── Frequency = "2.4GHz"
│   │       ├── Channel = "Auto"
│   │       └── TransmitPower = 100
│   │
│   └── SSID
│       └── 1
│           ├── SSID = "ISP_WiFi_Test123"
│           └── AccessPoint
│               └── 1
│                   ├── SSIDReference = "Device.WiFi.SSID.1"
│                   └── Security
│                       ├── BeaconType = "WPAand11i"
│                       └── KeyPassphrase = "encrypted_password"
│
└── Management
    ├── TraceLevel = 0
    └── SerialNumberMatching = 0
```

### GenieACS Architecture

```
┌────────────────────────────────────────────────────────────┐
│                    GenieACS Stack                          │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌──────────────────────────────────────────────────┐    │
│  │  NBI (North Bound Interface) - Port 7548         │    │
│  │  REST API for management and querying            │    │
│  │  - Access devices                                │    │
│  │  - Create tasks                                  │    │
│  │  - Query parameters                              │    │
│  └──────────────────────────────────────────────────┘    │
│                           ↓                               │
│  ┌──────────────────────────────────────────────────┐    │
│  │  Core Engine - Port 7547 (CWMP)                 │    │
│  │  Handles device connections                      │    │
│  │  - Parse XML from CPE                            │    │
│  │  - Apply provisioning rules                      │    │
│  │  - Generate responses                            │    │
│  └──────────────────────────────────────────────────┘    │
│                           ↓                               │
│  ┌──────────────────────────────────────────────────┐    │
│  │  File Server - Port 7549                         │    │
│  │  Serves firmware files for upgrades              │    │
│  │  - Firmware binaries                             │    │
│  │  - Configuration files                           │    │
│  └──────────────────────────────────────────────────┘    │
│                           ↓                               │
│  ┌──────────────────────────────────────────────────┐    │
│  │  Database Layer                                  │    │
│  │  ┌─────────────┐      ┌─────────────┐           │    │
│  │  │  MongoDB    │      │   Redis     │           │    │
│  │  │  (persistent)      │  (cache)    │           │    │
│  │  └─────────────┘      └─────────────┘           │    │
│  │  - Device profiles   - Session data             │    │
│  │  - Parameters        - Queued tasks             │    │
│  │  - Events logs       - Temporary states         │    │
│  └──────────────────────────────────────────────────┘    │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## ✔️ Verification

### 1. Verify OMCI Communication (OLT side)

```routeros
# Check ONT connection status on OLT
show interface gpon 0/1/0:1        # ONT 1 status

# Expected output:
# ONT 1: Online
# ├─ Serial: TESTONU00001234
# ├─ Vendor ID: VSOL
# ├─ TR069 Status: Enabled
# ├─ TR069 URL: http://192.168.1.50:7547
# └─ Last contact: 2m ago
```

### 2. Verify ONT Received OMCI Config

```routeros
# On ONT (if accessible via SSH)
# Check TR069 settings
cat /proc/tr069/config

# Expected output:
# TR069_ENABLE=1
# TR069_URL=http://192.168.1.50:7547
# TR069_USERNAME=support
# TR069_PASSWORD=support123
# MGMT_VLAN=20
# DATA_VLAN=100
```

### 3. Check DHCP Lease Assignment

```routeros
# On management router
/ip dhcp-server lease print

# Expected output:
# ID  ADDRESS      MAC-ADDRESS         HOSTNAME  EXPIRES-AFTER
# 0   10.20.0.50   00:11:22:33:44:55   ONT_1234  23h59m12s
```

### 4. Verify ONT → GenieACS Connection

```bash
# On GenieACS server
tail -f /var/log/genieacs/core.log

# Expected output:
[2026-02-01 14:35:22] Inform from TESTONU00001234
[2026-02-01 14:35:23] SetParameterValues for Device.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.VlanID
[2026-02-01 14:35:24] Device reboot triggered
[2026-02-01 14:35:45] TESTONU00001234 came back online
```

### 5. Check GenieACS Database

```javascript
// Query MongoDB for device
db.devices.findOne({_id: "TESTONU00001234"})

// Expected output (partial):
{
  "_id": "TESTONU00001234",
  "channels": {
    "default": {
      "port": 7547,
      "interface": "0.0.0.0"
    }
  },
  "parameters": [
    "Device.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.VlanID = 100",
    "Device.LANDevice.1.DHCPServer.1.Enable = 1"
  ],
  "lastInform": new Date("2026-02-01T14:35:22.000Z"),
  "lastOnlineTime": new Date("2026-02-01T14:35:45.000Z")
}
```

### 6. Test TR-069 HTTP Connection

```bash
# From router, test connectivity to GenieACS
curl -v http://192.168.1.50:7547/

# Expected output:
> GET / HTTP/1.1
< HTTP/1.1 405 Method Not Allowed

# 405 error is expected (TR069 uses POST, not GET)
```

---

## 🔧 Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| ONT doesn't boot | No OMCI communication | Check OLT-ONT optical connection, reseat fiber |
| ONT boots but no management IP | VLAN 20 not configured | Use OMCI to set management VLAN again |
| No connection to GenieACS | Firewall blocking port 7547 | Open TCP 7547 in firewall: `/ip firewall rule add chain=input protocol=tcp dst-port=7547 action=accept` |
| OnT can't reach GenieACS | Wrong ACS URL in OMCI | Re-configure OMCI URL, trigger ONT reboot |
| GenieACS not provisioning | Device not in database | Add device profile to GenieACS via NBI |
| TR069 connection timeout | Network latency | Increase timeout in GenieACS config from 30s to 60s |
| Firmware update fails | Device runs out of memory | Reboot ONT before update, reduce config complexity |
| Duplicate device entries | Reboot during connection | Implement idempotent provisioning in GenieACS |
| VLAN tag not applied | ONT rebooted too early | Wait 30s after OMCI config before reboot |

---

## ⚙️ Advanced Options

### 1. Bulk Provisioning Script for GenieACS

```javascript
// Bulk provision multiple ONTs with different speeds

const devices = [
  {serial: "TESTONU00001234", tier: "basic", download: "10M", upload: "5M"},
  {serial: "TESTONU00005678", tier: "premium", download: "50M", upload: "20M"},
  {serial: "TESTONU00009999", tier: "enterprise", download: "100M", upload: "50M"}
];

devices.forEach(device => {
  // Create device profile
  const deviceId = device.serial;
  
  // Set WAN parameters
  declare("Device.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.Enable", {value: 1});
  
  // Set tier-based bandwidth (via shaping)
  declare("Device.QueueManagement.Queue.1.Rate", {value: device.download});
  declare("Device.QueueManagement.Queue.2.Rate", {value: device.upload});
  
  // Set custom SSID for each device
  declare("Device.WiFi.SSID.1.SSID", {value: "ISP_" + device.tier + "_" + device.serial});
  
  // Log provisioning
  console.log(`Provisioned ${device.serial} as ${device.tier} tier`);
});
```

### 2. OMCI Multi-Service Provisioning

```routeros
# Configure multiple VLANs on single ONT via OMCI

# Service 1: Internet (VLAN 100)
ontservice add 0 1 1 vlan-id 100 priority 2 type internet

# Service 2: IPTV (VLAN 101)
ontservice add 0 1 2 vlan-id 101 priority 3 type iptv

# Service 3: Voice (VLAN 102)
ontservice add 0 1 3 vlan-id 102 priority 4 type voice

# Service 4: Management (VLAN 20) - already configured
# (Configured during TR069 setup)

# Each service can have different bandwidth limits
ontservice qos 0 1 1 rate-limit 100M  # Internet: 100 Mbps
ontservice qos 0 1 2 rate-limit 50M   # IPTV: 50 Mbps
ontservice qos 0 1 3 rate-limit 10M   # Voice: 10 Mbps
```

### 3. Automatic Firmware Update via TR-069

```javascript
// GenieACS provision firmware update for specific device class

declare("Device.DeviceInfo.SoftwareVersion", {value: "v2.1.3"});

// Task: Download and install firmware
if (parameter("Device.DeviceInfo.SoftwareVersion").value === "v2.0.0") {
  // Device has old firmware, push update
  declare("Device.ManagementServer.DownloadProgressURL", 
    {value: "http://192.168.1.50:7549/firmware/TESTONU_v2.1.3.bin"});
  
  // Set reboot time for 2 AM (off-peak)
  declare("Device.ManagementServer.PeriodicInformInterval", {value: 3600});
  declare("Device.ManagementServer.PeriodicInformTime", {value: "2023-01-01T02:00:00Z"});
}
```

### 4. Real-Time Parameter Monitoring

```bash
# Monitor device parameter changes in real-time
# (GenieACS webhook to HTTP server)

# Trigger on parameter change:
# When Device.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.ExternalIPAddress changes
# Send webhook to: http://192.168.1.10:8080/webhook

curl -X POST http://192.168.1.10:8080/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "device": "TESTONU00001234",
    "parameter": "Device.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.ExternalIPAddress",
    "oldValue": "0.0.0.0",
    "newValue": "203.0.113.50",
    "timestamp": "2026-02-01T14:35:22Z"
  }'
```

### 5. GenieACS Housekeeping Script

```bash
#!/bin/bash
# Cleanup old logs and device records

# Remove devices offline for > 90 days
mongo genieacs --eval "
  db.devices.deleteMany({
    lastOnlineTime: {
      \$lt: new Date(new Date().getTime() - 90*24*60*60*1000)
    }
  })
"

# Trim logs to last 30 days
mongo genieacs --eval "
  db.logs.deleteMany({
    _id: {
      \$lt: new Date(new Date().getTime() - 30*24*60*60*1000)
    }
  })
"

# Rebuild MongoDB indexes
mongo genieacs --eval "
  db.devices.reIndex()
  db.logs.reIndex()
  db.events.reIndex()
"

echo "GenieACS housekeeping completed"
```

### 6. Custom TR-069 Parameters

```javascript
// Define custom vendor-specific parameters

declare("Device.Services.VoiceService.1.VoiceProfile.1.Enable", {value: 1});
declare("Device.Services.VoiceService.1.VoiceProfile.1.Name", {value: "VoIP_Profile"});
declare("Device.Services.VoiceService.1.VoiceProfile.1.SignalingProtocol", {value: "SIP"});

// Custom ISP parameters
declare("Device.X_ISP.BillingTier", {value: "premium"});
declare("Device.X_ISP.CustomerID", {value: "CUST_12345"});
declare("Device.X_ISP.ExpiryDate", {value: "2027-02-01"});

// These appear in device XML when ONT connects
```

### 7. GenieACS Cluster Setup (HA)

```bash
# Setup multi-node GenieACS with load balancing

# Node 1 (Master)
hostname genieacs-1
apt install genieacs
cp config.json /opt/genieacs/
npm start

# Node 2 (Replica)
hostname genieacs-2
apt install genieacs
cp config.json /opt/genieacs/
npm start

# MongoDB Replica Set (for HA)
mongo --eval "
  rs.initiate({
    _id: 'rs0',
    members: [
      {_id: 0, host: '192.168.1.51:27017'},
      {_id: 1, host: '192.168.1.52:27017'},
      {_id: 2, host: '192.168.1.53:27017', arbiterOnly: true}
    ]
  })
"

# Nginx Load Balancer (frontend)
upstream genieacs {
  server 192.168.1.50:7547;
  server 192.168.1.51:7547;
}

server {
  listen 7547;
  location / {
    proxy_pass http://genieacs;
  }
}
```

---

## 🔗 Related Guides

- [IPoE Server Setup and Management](./ipoe-server-setup-management) — Always-on broadband connectivity
- [VLAN Configuration](../../Network/vlan-configuration) — Network segmentation and tagging
- [GenieACS Auto-Installer](../../Proxmox/genieacs-auto-installer) — Automated GenieACS deployment
- [GPON VLAN Configuration](../../OLT/VSOL/gpon-vlan-configuration) — Optical line terminal setup
- [EPON VLAN Configuration](../../OLT/VSOL/epon-vlan-configuration) — EPON optical setup
- **DHCP Server Configuration** — Dynamic IP assignment (coming soon)
- **RADIUS Authentication Setup** — Centralized authentication (coming soon)
- **Bandwidth Limiting per User** — QoS and traffic control (coming soon)

---

✅ **TR-069 and GenieACS provisioning configured successfully!** Your ONTs are now automatically provisioned from the OLT via OMCI, connected to GenieACS, and receiving remote configuration for optimal broadband delivery.

