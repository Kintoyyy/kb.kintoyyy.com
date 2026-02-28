---
sidebar_position: 4
---

# 🚀 Enable 10G Port

This guide walks through enabling 10 Gigabit Ethernet (10G) ports on VSOL OLT devices. By default, VSOL OLT ports operate at 1G (1 Gigabit); this procedure upgrades designated ports to 10G capability using debug mode CLI commands.

:::info
**What you're doing:** Accessing OLT debug mode and reconfiguring SFP+ port mode to support 10 Gigabit line rates instead of standard 1 Gigabit.

- Access OLT via Telnet or serial console
- Enter privileged and debug mode
- Configure GIU (Gigabit Interface Unit) to SFP+ mode (10G)
- Save configuration persistently
- Verify 10G port status
- Test bandwidth utilization
:::

:::warning
**Important Caveats:**
- Debug mode is restricted—only authorized administrators should access
- Port reconfiguration requires OLT reload/reboot to fully apply (some models)
- Existing 1G connections on target port will be reset during mode switch
- Ensure SFP+ transceiver is 10G-capable and properly seated before enabling
- 10G line rates require quality fiber (typically OS2 single-mode) and low-loss connections
- Not all VSOL OLT models support 10G—check hardware specifications first
- Configuration persists after reload; reverting requires explicit reconfiguration
- Debug mode commands are undocumented—use cautiously
:::

---

## Prerequisites

✅ VSOL OLT with SFP+ port(s) (hardware must support 10G)  
✅ SSH or serial console access to OLT with root/admin credentials  
✅ OLT running firmware v2.0 or later (most VSOL v2.x models support 10G)  
✅ SFP+ transceiver module installed in target port (10G-capable, not 1G-only)  
✅ Fiber optic cable (OS2 single-mode recommended for 10G distances)  
✅ Upstream device port capable of 10G line rate (router uplink, aggregate switch, etc.)  
✅ Understanding of OLT CLI mode progression (user → enable → config → debug-mode)  
✅ Backup of current OLT configuration before making changes  

---

## Configuration Steps

### Step 1: Connect to OLT

Access the OLT via SSH or serial console (115200 baud, 8N1):

**Option A: SSH Access**
```
ssh admin@192.168.8.1
Password: [enter password]
OLT>
```

**Option B: Serial Console**
```
Connect serial cable to OLT console port (DB-9 or USB)
Open terminal (PuTTY, minicom, or Device Manager)
Settings: 115200 baud, 8 data bits, 1 stop bit, no parity, no flow control
Power on OLT and wait for login prompt
Login: admin
Password: [enter password]
OLT>
```

You should see the `OLT>` prompt, indicating you're in user mode.

### Step 2: Enter Enable Mode

Escalate to privileged (enable) mode:

```
OLT>enable
OLT#
```

The prompt changes from `>` to `#`, confirming you're now in enable mode with full privileges.

### Step 3: Enter Configuration Terminal

Access global configuration mode:

```
OLT#configure terminal
OLT(config)#
```

The prompt now shows `(config)`, indicating you're in configuration context.

### Step 4: Enter Debug Mode

Switch to debug mode (restricted, undocumented functionality):

```
OLT(config)#debug mode
OLT(debug-mode)#
```

:::warning
**Debug mode warning:** This mode is intended for support personnel only. Improper use can render OLT inoperable. Proceed only if you understand the implications.
:::

### Step 5: Configure GIU to SFP+ Mode (10G)

Set the Gigabit Interface Unit to SFP+ 10G mode:

```
OLT(debug-mode)#set giu mode sfp+
Setting GIU mode to SFP+ (10G)...
[OK]
```

**Command breakdown:**
- `set giu mode` = Configure Gigabit Interface Unit mode
- `sfp+` = SFP+ standard (10 Gigabit capable)
- Alternative modes (if supported): `sfp` (1G), `rj45giga` (1G RJ45), `rj45combo` (1G RJ45 with combo port)

Expected output: `[OK]` or `Setting completed`

If you see `[ERROR] Mode not supported`, your OLT hardware doesn't support 10G, or the transceiver is incompatible.

### Step 6: Exit Debug Mode

Return to configuration mode:

```
OLT(debug-mode)#exit
OLT(config)#
```

The prompt returns to `(config)`.

### Step 7: Save Configuration

Write configuration to persistent storage:

```
OLT(config)#write
Saving configuration...
[OK] Configuration saved to flash
```

**Critical step:** The `write` command saves changes to NVRAM/flash storage so they survive OLT reboot. Without this, changes are lost on next power cycle.

Expected output indicates successful save. If you see `[ERROR] Write failed`, check flash storage space: `show flash-info`

### Step 8: Verify SFP+ Port Status

Exit configuration and check port status:

```
OLT(config)#exit
OLT#show interface
```

Expected output (example for SFP+ port):
```
Port      Status    Mode      Speed       IP Address
GE0/0/0   UP        SFP+      10Gbps      192.168.1.100
GE0/0/1   UP        SFP+      10Gbps      192.168.1.101
GE0/1/0   UP        SFPX      1Gbps       [disabled]
```

**Key indicators:**
- **Mode:** Should show `SFP+` (not `SFPX` or `RJ45`)
- **Speed:** Should show `10Gbps` (not `1Gbps` or `Auto`)
- **Status:** Should show `UP` (if transceiver and cable are connected)

If status is `DOWN`:
- Verify transceiver is fully inserted
- Check fiber optic cable for kinks, dust, or contamination
- Test with known working 10G transceiver
- Reload OLT: `reload`

### Step 9: Reload OLT (If Required)

Some VSOL OLT models require restart to fully apply 10G mode:

```
OLT#reload
Are you sure you want to reload? (yes/no): yes
Rebooting system...
System will restart momentarily
Connection closed
```

Wait 2-3 minutes for OLT to boot:
```
VSOL OLT Boot...
[OK] System started
OLT#
```

Reconnect and verify 10G status again (repeat Step 8).

---

## Understanding 10G Port Configuration

### SFP+ vs SFP vs RJ45 Comparison

| Interface Type | Standard | Speed | Transceiver | Fiber Type | Distance |
|---|---|---|---|---|---|
| **SFP+** (10G) | IEEE 802.3ae | 10 Gbps | SFP+ module (small optics) | Single-mode, Multi-mode | 10-80 km |
| **SFP** (1G) | IEEE 802.3z | 1 Gbps | SFP module | Single-mode, Multi-mode | 2-70 km |
| **RJ45** (1G) | IEEE 802.3u | 1 Gbps | Copper (no transceiver) | Cat5e/Cat6 twisted pair | 100 m |
| **SFPX** (Combo) | Mixed | Auto 1G | Auto-sensing | Fiber OR copper | Varies |

**VSOL OLT with SFP+ default mode:** By default, SFP+ ports run in "compatibility mode" at 1G to support both 1G and 10G transceivers. The `set giu mode sfp+` command explicitly locks the port to 10G-only, negotiating faster line rates.

### Architecture Diagram

```
┌──────────────────────────────────┐
│     VSOL OLT Device              │
│                                  │
│  ┌──────────────────────────────┐│
│  │ Port Configuration:          ││
│  │ ┌─ GE0/0/0: SFP (1G) default││
│  │ ├─ GE0/0/1: SFP (1G)        ││
│  │ ├─ GE0/1/0: RJ45 (1G)       ││
│  │ └─ Uplink: SFP+ ← Set to 10G││
│  └──────────────────────────────┘│
│           │                       │
│     After: set giu mode sfp+      │
│           ↓                       │
│  ┌──────────────────────────────┐│
│  │ Uplink Port: SFP+ (10G)      ││
│  │ ├─ Speed: 10 Gbps            ││
│  │ ├─ Transceiver: SFP+ 10G     ││
│  │ └─ Distance: up to 40 km      ││
│  └──────────────────────────────┘│
│           │                       │
│     Fiber Connection              │
│           ↓                       │
├──────────────────────────────────┤
│   Upstream Device (10G Switch)   │
│   Port in 10G mode               │
└──────────────────────────────────┘
```

### GIU Mode Lifecycle

| Step | Mode | Prompt | Action |
|------|------|--------|--------|
| 1 | User | `OLT>` | Initial login state |
| 2 | Enable | `OLT#` | Enter `enable` |
| 3 | Config | `OLT(config)#` | Enter `configure terminal` |
| 4 | Debug | `OLT(debug-mode)#` | Enter `debug mode` |
| 5 | **Config GIU** | `OLT(debug-mode)#` | Execute `set giu mode sfp+` |
| 6 | Config | `OLT(config)#` | Exit debug with `exit` |
| 7 | Enable | `OLT#` | Exit config with `exit` |
| 8 | User | `OLT>` | Exit enable with `disable` |

---

## Verification Steps

### 1. Check Port Speed After Configuration

Verify port now reports 10G capability:

```
OLT#show interface GE0/0/0
Interface: GE0/0/0
Mode: SFP+
Speed: 10Gbps
Status: UP
MTU: 1500
```

If speed shows `1Gbps`, reload OLT: `reload`

### 2. Check Transceiver Information

Verify SFP+ transceiver is detected:

```
OLT#show transceiver GE0/0/0
Transceiver Information:
  Type: SFP+
  Vendor: VSOL (or compatible)
  Model: VSP-SFP10G-SR (example)
  Serial: SN123456789
  RX Power: -2.5 dBm
  TX Power: 0.1 dBm
  Temperature: 35°C
```

**Expected values:**
- RX Power: -3 to 0 dBm (stronger signal = closer transceiver)
- TX Power: -1 to +5 dBm
- Temperature: 0-70°C (within operating range)

If **RX Power < -8 dBm** or **TX Power < -10 dBm**, connection is degraded—check fiber for dirt/kinks.

### 3. Test 10G Link with Upstream Device

From upstream device (10G switch/router), verify 10G negotiation:

```
Router#show interface GigabitEthernet0/0/0
GigabitEthernet0/0/0 is up, line protocol is up
  Hardware is SFP+, address is 0000.1111.2222
  MTU 1500 bytes, BW 10000000 Kbit/sec (10 Gbps)
  Encapsulation ARPA, loopback not set
  Full duplex, 10Gb/s
  [GOOD - 10G link up]
```

### 4. Run Throughput Test (iperf)

Test actual 10G bandwidth utilization from OLT or connected device:

```
# On uplink device (originator)
iperf -c <OLT-uplink-IP> -P 4 -t 30 -R
# Expected: ~9-10 Gbps (accounting for protocol overhead)

# Example output:
[ ID] Interval           Transfer     Bitrate
[  1] 0.0-10.0 sec  11.5 GBytes  9.87 Gbps
[  2] 0.0-10.0 sec  11.6 GBytes  9.93 Gbps
[  3] 0.0-10.0 sec  11.4 GBytes  9.81 Gbps
[  4] 0.0-10.0 sec  11.5 GBytes  9.89 Gbps
```

If throughput is < 5 Gbps:
- Check for fiber contamination (clean connectors with isopropyl alcohol and lens paper)
- Verify SFP+ transceiver supports 10G (check model number)
- Test with different fiber patch cable
- Check for duplex mismatch on upstream device

### 5. Verify Configuration Persists After Reload

Reload OLT and verify 10G mode remains:

```
OLT#reload
[After reboot, reconnect...]
OLT#show interface
Port    Status    Mode     Speed
GE0/0/0 UP        SFP+     10Gbps  ← ✅ Persisted
```

If speed reverts to 1Gbps, configuration wasn't saved—repeat Step 7 (write).

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| **Port shows 1Gbps after set command** | OLT requires reload to apply 10G mode | Run `reload` and wait 3 minutes; verify with `show interface` |
| **Port status DOWN after 10G enable** | Incompatible or failed transceiver | Verify SFP+ 10G transceiver is installed (not 1G SFP); check LED indicators |
| **RX Power < -8 dBm (very weak signal)** | Optical signal loss—dirty fiber or bad connector | Clean fiber connectors (isopropyl alcohol); inspect for cracks; replace fiber patch cable |
| **TX Power off/unavailable** | Transceiver TX failure or unsupported | Swap with known working 10G SFP+ module; verify vendor matches |
| **Cannot enter debug mode** | User permissions insufficient or debug disabled | Confirm you're using admin account; check if debug mode is restricted in firmware |
| **"[ERROR] Mode not supported"** | Hardware doesn't support 10G or SFP+ port doesn't exist | Check OLT model specifications; not all VSOL models support 10G; use different OLT model |
| **Port goes UP/DOWN intermittently** | Loose transceiver or dusty connector | Reseat SFP+ transceiver firmly; clean both ends of fiber patch cable |
| **Speed negotiates at 1Gbps with 10G transceiver** | Port still in auto-negotiation mode | Verify GIU mode change took effect: `show interface` should show SFP+; reload if needed |
| **Cannot save config (write failed)** | Insufficient flash storage on OLT | Check: `show flash-info`; delete old logs or backups; ensure 20MB+ free space |
| **Upstream device won't recognize 10G link** | Transceiver incompatibility or firmware mismatch | Verify transceiver vendor (VSOL, Broadcom, etc.) matches expectations; test with known working module |
| **Performance drops after enabling 10G** | CRC errors or frame loss due to optical issues | Run `show interface counters` to check error rates; clean fiber immediately |
| **Debug mode exits unexpectedly** | Session timeout or authentication loss | Reconnect and re-enter: `enable` → `configure terminal` → `debug mode` |

---

## Advanced Options

### Option A: Downgrade Port to 1G (Revert 10G)

If 10G causes issues, revert to 1G mode:

```
OLT(config)#debug mode
OLT(debug-mode)#set giu mode sfp
OLT(debug-mode)#exit
OLT(config)#write
OLT(config)#exit
OLT#reload
```

After reload, verify: `show interface GE0/0/0` should show `1Gbps`

### Option B: Configure Multiple 10G Ports

Enable 10G on secondary SFP+ ports:

```
OLT(config)#debug mode
OLT(debug-mode)#set giu mode sfp+
OLT(debug-mode)#show interface | include GE0/0
# Lists all available GE ports
# Configure each SFP+ port in sequence
OLT(debug-mode)#exit
OLT(config)#write
```

**Note:** Most VSOL OLTs have 1-2 10G-capable ports (uplink ports). Standard PON/GE ports (1G) cannot be internally upgraded to 10G.

### Option C: Monitor Real-Time Port Statistics

Check live port statistics during traffic:

```
OLT#monitor interface GE0/0/0
Interface: GE0/0/0 (SFP+)
In:  94.2 Mbps (1250 pps)  Out: 98.5 Mbps (1350 pps)
RX Errors: 0    TX Errors: 0    CRC: 0
Updates every 5 seconds (Press Q to exit)
```

**Healthy indicators:**
- Sustained 8-10 Gbps in/out during full throughput
- Zero CRC errors
- Zero RX/TX errors

### Option D: Enable Jumbo Frames (9000 MTU) for Enhanced Throughput

Maximize throughput by supporting larger packet sizes:

```
OLT(config)#interface GE0/0/0
OLT(config-if)#mtu 9000
OLT(config-if)#exit
OLT(config)#write
```

Verify: `show interface GE0/0/0 | include MTU` should show `9000`

**Caution:** Ensure upstream device also supports 9000 MTU; route all intermediate devices (switches) must support jumbo frames.

### Option E: Check OLT Firmware Version for 10G Support

Verify your firmware supports 10G:

```
OLT#show version
System Information:
  Product Name: VSOL OLT-8004
  Firmware Version: v2.5.1
  Build Date: 2024-12-15
  Hardware Version: 1.2
```

**10G Support Matrix (typical):**
- OLT-8004, OLT-8008: v2.2+ supports 10G
- OLT-8016: v1.8+ supports 10G
- OLT-4416: Limited to 1G (no 10G uplink)

Upgrade firmware if 10G is not working: Check VSOL support portal for latest release notes.

### Option F: Configure Link Aggregation (LAG) for Multiple 10G Uplinks

Bond multiple 10G ports for redundancy and load balancing:

```
OLT(config)#interface port-channel 1
OLT(config-if)#description "Uplink LAG 10G"
OLT(config-if)#exit
OLT(config)#interface GE0/0/0
OLT(config-if)#channel-group 1 mode active
OLT(config-if)#exit
OLT(config)#interface GE0/0/1
OLT(config-if)#channel-group 1 mode active
OLT(config-if)#exit
OLT(config)#write
```

Verify: `show interface port-channel 1` should show aggregated bandwidth

### Option G: Enable LLDP (Link Layer Discovery Protocol) on 10G Port

Auto-discover upstream device capabilities:

```
OLT(config)#lldp run
OLT(config)#interface GE0/0/0
OLT(config-if)#lldp send-mgmt-address
OLT(config-if)#exit
OLT(config)#write
```

Check discovered peers: `show lldp neighbors`

### Option H: Set Port Speed to Forced 10G (No Auto-Negotiation)

Force 10G even if auto-negotiation fails:

```
OLT(config)#interface GE0/0/0
OLT(config-if)#speed 10000
OLT(config-if)#duplex full
OLT(config-if)#exit
OLT(config)#write
```

Verify: `show interface GE0/0/0` should show `10Gbps, full duplex`

### Option I: Monitor Optical Signal Health Over Time

Log transceiver signal degradation:

```
OLT#show transceiver GE0/0/0 history
Sample  Time        RX Power  TX Power  Temperature
1       14:23:10    -1.2 dBm  +1.5 dBm  34°C
2       14:33:10    -1.5 dBm  +1.3 dBm  35°C
3       14:43:10    -1.8 dBm  +0.9 dBm  36°C
[Signal degrading—fiber may need cleaning]
```

If RX power drops >0.5 dBm over time, proactively clean fiber.

### Option J: Schedule 10G Configuration During Maintenance Window

Apply 10G mode change and reload at off-peak time:

```
OLT(config)#scheduler event set giu mode 02:00
Configuration applied at 02:00 UTC
OLT(config)#scheduler reload 02:15
System will reload at 02:15 UTC
OLT(config)#write
```

Ensures minimal customer impact. Verify with `show scheduler`

---

## Related Guides

- [VSOL OLT Firmware Upgrade via TFTP](./vsol-firmware-tftp-upgrade) – Update firmware to enable advanced features
- [GPON VLAN Configuration](./gpon-vlan-configuration) – Network segmentation on VSOL OLTs
- [EPON VLAN Configuration](./epon-vlan-configuration) – Alternative OLT type configuration
- [Network VLAN Configuration](../../Network/vlan-configuration) – Fundamental VLAN concepts
- [Jumbo Frames Configuration](../../Network/jumbo-frames) – Optimize throughput with larger packet sizes

---

✅ **10G port enablement complete!** Your VSOL OLT uplink is now operating at 10 Gigabit speeds. Monitor optical signal strength regularly (check RX/TX power monthly) to ensure link stability and longevity.
