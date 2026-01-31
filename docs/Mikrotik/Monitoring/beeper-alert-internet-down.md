---
sidebar_position: 11
---

# 🔊 Beeper Alert

Sound an audible alarm on your MikroTik device when the internet connection goes down. This script uses the built-in beeper to emit a series of alert tones at different frequencies, providing immediate physical notification that WAN connectivity is lost. Perfect for unattended server rooms, data centers, or remote installations where visual monitoring is impossible. Combines with NetWatch for automated failover detection.

:::info
**Compatible devices:**

- HEX GR3, HEX S - Compact Ethernet routers with built-in beeper
- HEX PoE - PoE-enabled variant
- RB3011UiAS-RM - Rack mount 10-port router
- RB1100AHx4 - 1U rack mount with dual CPU
- Any RouterOS device with audio output capability

**Alert pattern:** 10 repetitions of 600Hz (100ms) + 1000Hz (100ms) tones = ~8 seconds total alert
:::

## Prerequisites

- ✅ MikroTik RouterOS device with **audio output/beeper** (HEX series, RB series)
- ✅ Access to RouterOS console (SSH, Winbox, or WinBox)
- ✅ Physical location with audible range (server room, office, etc.)
- ✅ Internet connectivity detection method (NetWatch, script, or failover trigger)
- ✅ RouterOS v6.41+ for reliable beeper operation
- ✅ Optional: Speakers connected to audio jack (for amplified alerts)

:::warning
**Device compatibility:** Not all MikroTik devices have speakers. Check your device specs:

- ✅ Has beeper: HEX, HEX S, HEX PoE, RB-series rack mounts
- ❌ No beeper: Cloud Router Switch (CRS), Virtual Machine RouterOS, SwitchOS devices

:::

## Configuration Steps

### Option A: Terminal Configuration (NetWatch Trigger)

1. **Access the terminal** via SSH, console, or Winbox terminal

   ```bash
   ssh admin@your-router-ip
   ```

2. **Verify beeper is available:**

   ```routeros
   :beep frequency=1000 length=100ms
   ```

   You should hear a 1000 Hz tone for 100ms. If not, device may not have beeper.

3. **Create NetWatch entry for internet detection** (ping external DNS):

   ```routeros
   /tool netwatch add host=8.8.8.8 interval=10s down-script={
       :log error "> INTERNET DOWN!";
       :for i from=1 to=10 do={  
           :beep frequency=600 length=100ms;
           :delay 500ms;
           :beep frequency=1000 length=100ms;
           :delay 300ms;
       }
   }
   ```

   :::tip
   **Customize monitoring:**
   - Change `host=8.8.8.8` to your ISP gateway or reliable external IP
   - Adjust `interval=10s` for faster/slower detection (faster = more CPU)
   - Replace `8.8.8.8` with local gateway if internet monitored via PPP/WAN
   :::

4. **Verify NetWatch was created:**

   ```routeros
   /tool netwatch print
   ```

   Should show entry monitoring 8.8.8.8 with down-script.

### Option B: Winbox Configuration (NetWatch Trigger)

1. **Navigate to Tools > NetWatch:**
   - Click **+** to add new entry

2. **Configure NetWatch:**
   - Host: `8.8.8.8`
   - Interval: `10s`

3. **Down Script Tab:**
   - Paste the alert script:

   ```routeros
   :log error "> INTERNET DOWN!";
   :for i from=1 to=10 do={  
       :beep frequency=600 length=100ms;
       :delay 500ms;
       :beep frequency=1000 length=100ms;
       :delay 300ms;
   }
   ```

4. **Click OK/Apply**

### Option C: Manual Script Execution (Testing)

1. **Create a script for manual testing:**

   ```routeros
   /system script add name="beep-alert" source={
       :log error "> INTERNET DOWN!";
       :for i from=1 to=10 do={  
           :beep frequency=600 length=100ms;
           :delay 500ms;
           :beep frequency=1000 length=100ms;
           :delay 300ms;
       }
   }
   ```

2. **Run the script manually to test beeper:**

   ```routeros
   /system script run beep-alert
   ```

   Should hear: low tone (600Hz) → pause → high tone (1000Hz) → repeat 10 times

## Understanding the Script

### Beeper Command Syntax

```routeros
:beep frequency=FREQ length=DURATION;
```

| Parameter | Range | Default | Purpose |
|-----------|-------|---------|---------|
| `frequency` | 20-20000 Hz | 1000 Hz | Tone pitch (lower = deeper, higher = shriller) |
| `length` | 1-5000 ms | 100 ms | Duration of single beep |

### Audio Frequency Reference

| Frequency | Sound | Use Case |
|-----------|-------|----------|
| 200-300 Hz | Very low, bass | Subdued alerts, background warnings |
| 600 Hz | Medium-low, warning | First tone in dual-frequency alert |
| 1000 Hz | Mid, standard | Common alert tone, easily heard |
| 2000-4000 Hz | High, piercing | Emergency alerts, hard to ignore |
| 8000+ Hz | Very high, shrill | Critical alarms, painful if too loud |

### Script Logic Breakdown

```routeros
:log error "> INTERNET DOWN!";  # Log event for audit trail

:for i from=1 to=10 do={         # Loop 10 times (10 repetitions)
    :beep frequency=600 length=100ms;   # Low tone (100ms)
    :delay 500ms;                       # Wait 500ms
    :beep frequency=1000 length=100ms;  # High tone (100ms)
    :delay 300ms;                       # Wait 300ms
}
# Total time: ~8 seconds (10 × (100+500+100+300)ms)
```

### Timing Details

```
Iteration 1:
├─ 600Hz beep: 100ms
├─ Delay: 500ms
├─ 1000Hz beep: 100ms
└─ Delay: 300ms
= 1000ms per iteration × 10 iterations = 10 seconds total

But with processing: ~8-10 seconds actual
```

## Verification

1. **Confirm beeper hardware exists:**

   ```routeros
   :beep frequency=440 length=200ms
   ```

   Test tone (should hear A note, 440 Hz).

2. **Verify NetWatch monitor is active:**

   ```routeros
   /tool netwatch print
   ```

   Should show monitoring entry with correct down-script.

3. **Check NetWatch status:**

   ```routeros
   /tool netwatch print status
   ```

   Should show current host status (up/down) and last check time.

4. **Test down-script manually:**

   ```routeros
   /tool netwatch run [find host=8.8.8.8]
   ```

   Should trigger alert if 8.8.8.8 is unreachable.

5. **Simulate internet down (firewall block):**

   ```routeros
   /ip firewall filter add action=drop chain=forward dst-address=8.8.8.8 protocol=icmp
   ```

   Wait for NetWatch interval → should hear alert
   Remove filter to restore: `/ip firewall filter remove [find dst-address=8.8.8.8]`

6. **Check system logs:**

   ```routeros
   /log print where topics~"system"
   ```

   Should show `INTERNET DOWN!` entries when alerts triggered.

7. **Monitor beeper resource usage:**

   ```routeros
   /system resource print
   ```

   Beeper uses minimal CPU (~1% during alert).

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| No sound when beeper runs | Device has no beeper | Check device specs (HEX/RB-series only); try external speaker |
| Beeper command not recognized | RouterOS version too old | Upgrade to v6.41+; check `/system package print` |
| Very quiet/inaudible | Frequency too low or too high | Test range: 800-2000 Hz; try higher values (3000-4000 Hz) |
| NetWatch doesn't trigger alert | Wrong host or script not attached | Verify: `host` is reachable; `down-script` is present in `print detail` |
| Alert stops after first occurrence | NetWatch state doesn't change | Internet must come back UP then go DOWN again to re-trigger |
| Multiple alerts overlapping | NetWatch interval too short + slow recovery | Increase `interval` to 30s or higher; add delay before script |
| Beeper sounds permanently | Script loop running indefinitely | Check for syntax errors; limit loop count; add timeout |
| Script errors: "unknown identifier" | Variable name typo or syntax error | Verify: `:for`, `:beep`, `:delay` syntax is exact; no missing colons |

## Advanced Options

### Single loud beep (critical alert)

```routeros
:beep frequency=4000 length=500ms;
:delay 200ms;
:beep frequency=4000 length=500ms;
```

### Siren-like sound (frequency sweep)

```routeros
:beep frequency=1000 length=100ms;
:delay 100ms;
:beep frequency=1500 length=100ms;
:delay 100ms;
:beep frequency=2000 length=100ms;
:delay 100ms;
:beep frequency=1500 length=100ms;
:delay 100ms;
:beep frequency=1000 length=100ms;
```

### Continuous alert until manual stop

```routeros
:local continue 1;
:while ($continue = 1) do={
    :beep frequency=800 length=50ms;
    :delay 200ms;
    :beep frequency=1200 length=50ms;
    :delay 200ms;
}
# Note: Requires manual script termination via `/system script job remove`
```

### Different alert patterns for different failures

**Internet down (3 long beeps):**

```routeros
:for i from=1 to=3 do={
    :beep frequency=1000 length=300ms;
    :delay 400ms;
}
```

**High CPU alert (rapid beeps):**

```routeros
:for i from=1 to=20 do={
    :beep frequency=600 length=50ms;
    :delay 100ms;
}
```

**Low memory alert (warbling):**

```routeros
:beep frequency=700 length=100ms;
:delay 150ms;
:beep frequency=1000 length=100ms;
:delay 150ms;
:beep frequency=700 length=100ms;
:delay 150ms;
:beep frequency=1000 length=100ms;
```

### Alert with email notification

Combine with [Send Logs to Email](./send-logs-to-email):

```routeros
:log error "> INTERNET DOWN - Triggering alerts";
:for i from=1 to=10 do={  
    :beep frequency=600 length=100ms;
    :delay 500ms;
    :beep frequency=1000 length=100ms;
    :delay 300ms;
}
# Email notification sent separately via email backup script
```

### Escalating alert (faster beeps as time progresses)

```routeros
:for i from=1 to=10 do={
    :beep frequency=1000 length=100ms;
    :delay ($i * 100ms);  # Delays decrease as loop continues
}
```

### Alert with syslog integration

```routeros
:log error "CRITICAL: Internet Down - Beeper Alert Triggered";
/log print where message~"CRITICAL" | /tool fetch url="http://syslog-server:514" keep-result=no;
```

### Time-based alerts (disable during maintenance windows)

```routeros
:local hour [/system clock get hour];
:if ($hour < 2 || $hour > 4) do={
    # Only alert outside 2-4 AM maintenance window
    :beep frequency=1000 length=200ms;
}
```

## Physical Considerations

### Audio Output Methods

1. **Built-in Beeper** (HEX, RB series)
   - Limited volume (~60-75 dB)
   - Directional sound
   - No external equipment needed

2. **External Speaker** (via audio jack)
   - Better volume control
   - Amplification possible
   - More professional setup

3. **USB Speaker** (if supported by RouterOS)
   - Portable
   - Variable volume
   - Not standard on RouterOS

### Placement Recommendations

- **Server room:** Mount on front rack panel for audibility
- **Office:** Place on wall near entrance for dual-purpose monitoring
- **Unattended sites:** Use external amplified speaker pointed toward building entrance
- **24/7 NOC:** Integrate with call-out system (combine beeper with Telegram alerts from [NetWatch Telegram Alerts](./netwatch-telegram-alerts))

## Related Configurations

- **NetWatch monitoring:** See [NetWatch Telegram Alerts](./netwatch-telegram-alerts)
- **Email alerts:** See [Send Logs to Email](../Email/send-logs-to-email)
- **Failover detection:** See [Starlink Firewall Rules](../Security/starlink-firewall-rules)
- **System monitoring:** Combine with CPU/memory alerts

## Device Compatibility Matrix

| Device | Beeper | Audio Jack | Notes |
|--------|--------|-----------|-------|
| HEX GR3 | ✅ Yes | - | Compact, built-in beeper |
| HEX S | ✅ Yes | - | Smaller variant |
| HEX PoE | ✅ Yes | - | PoE-powered edition |
| RB3011UiAS-RM | ✅ Yes | - | 10-port rack mount |
| RB1100AHx4 | ✅ Yes | - | 1U dual-CPU rack mount |
| CRS Series | ❌ No | - | Cloud Router Switch (no beeper) |
| CHR | ❌ No | - | Cloud Hosted Router (no audio) |
| RB750 | ❌ No | - | Budget router (no audio output) |

## Completion

✅ **Internet down beeper alert is now active!**

**Next steps:**

- Test beeper hardware: `:beep frequency=1000 length=200ms`
- Configure NetWatch to monitor WAN uplink
- Simulate internet down to verify alert triggers
- Document alert sound pattern for team
- Consider external speaker for better audibility
- Combine with Telegram alerts from [NetWatch Telegram Alerts](./netwatch-telegram-alerts)
- Back up configuration: `/system backup save`
- Test monthly to ensure beeper still functions
