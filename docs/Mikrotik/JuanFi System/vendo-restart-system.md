---
sidebar_position: 2
---

# 🔄 Vendo System Restart


Remotely restart multiple JuanFi vending machines from your MikroTik router using API automation. Trigger system reboots on a schedule or manually for maintenance, software updates, or troubleshooting without visiting each physical location. Coordinates with multiple vendos simultaneously and handles offline devices gracefully with error logging.

:::info
**What this does:**
- Targets multiple vendo IP addresses (10.1.1.2, 10.1.2.2, etc.)
- Sends HTTP POST restart command via API
- Authenticates with API key header (`X-TOKEN`)
- Logs success/failure for audit trail
- Tolerates offline vendos without script failure
:::

## Prerequisites

- ✅ MikroTik RouterOS device with HTTP client capability
- ✅ One or more JuanFi vendo devices on network
- ✅ Vendo devices with static IP addresses
- ✅ API credentials (vendo IPs + API key)
- ✅ Network connectivity between MikroTik and vendos
- ✅ Access to RouterOS console (SSH, Winbox, or WinBox)
- ✅ RouterOS v6.48+

:::warning
**Service interruption:** Restarting vendos will interrupt customer transactions. Schedule reboots during low-traffic windows.
:::

## Configuration Steps

### Option A: Terminal Configuration

1. **Access the terminal:**
   ```bash
   ssh admin@your-router-ip
   ```

2. **Create restart script:**
   ```routeros
   /system script add name="vendo-restart-system" source={
       :local vendos {"10.1.1.2"; "10.1.2.2"; "10.1.3.2";};
       :local apiKey "pqa92jwxrk";
       
       :foreach vendo in=$vendos do={ 
           /do {
               :log warning "============<[[ Restarting $vendo ]]>=============";
               /tool fetch http-method=post http-header-field="X-TOKEN: $apiKey" \
                   url="http://$vendo/admin/api/restartSystem"
           } on-error={
               :log error "============<[[ ERROR! $vendo OFFLINE... ]]>=============";
           }
       }
   }
   ```

   :::tip
   - Update vendo IPs in the array
   - Replace API key with your actual credentials
   :::

3. **Schedule weekly maintenance restart** (Sunday 2 AM):
   ```routeros
   /system scheduler add name="vendo-restart-weekly" on-event="vendo-restart-system" \
       start-time=02:00:00 interval=7d comment="Weekly vendo restart"
   ```

4. **Create alternative script for immediate restart:**
   ```routeros
   /system script add name="vendo-restart-now" source={
       :local vendos {"10.1.1.2"; "10.1.2.2"; "10.1.3.2";};
       :local apiKey "pqa92jwxrk";
       :local timestamp [/system clock get time];
       
       :log warning "IMMEDIATE RESTART TRIGGERED at $timestamp";
       
       :foreach vendo in=$vendos do={ 
           /do {
               :log warning "Restarting $vendo";
               /tool fetch http-method=post http-header-field="X-TOKEN: $apiKey" \
                   url="http://$vendo/admin/api/restartSystem"
           } on-error={
               :log error "FAILED: $vendo";
           }
       }
   }
   ```

5. **Verify scripts:**
   ```routeros
   /system script print
   ```

### Option B: Winbox Configuration

1. **Navigate to System > Scripts:**
   - Click **+**
   - Name: `vendo-restart-system`
   - Paste script from Option A step 2
   - Click **OK**

2. **Navigate to System > Scheduler:**
   - Click **+**
   - Name: `vendo-restart-weekly`
   - On Event: `vendo-restart-system`
   - Start Time: `02:00:00`
   - Interval: `7d`
   - Click **OK**

## Verification

1. **Test script manually:**
   ```routeros
   /system script run vendo-restart-system
   ```

2. **Check logs:**
   ```routeros
   /log print where topics~"system"
   ```
   Should show restart attempts.

3. **Verify vendo responded:**
   - Monitor physical vendo display
   - Should show reboot sequence/splash screen
   - Service down for 30-60 seconds typically

4. **Confirm scheduler active:**
   ```routeros
   /system scheduler print
   ```

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| All vendos offline | Network connectivity lost | Ping vendo: `ping 10.1.1.2`; check cable connections |
| API key rejected | Invalid credentials | Verify key matches vendo provider documentation |
| No visible restart | API endpoint wrong or firmware outdated | Check vendo firmware version; test endpoint manually with curl |
| Restart doesn't complete | Vendo hanging during boot | Wait 2 minutes; manually power-cycle if stuck |
| Scheduler doesn't trigger | Time/date mismatch | Check: `/system clock print`; sync time if needed |

## Advanced Options

### Add staggered delays to prevent network surge:
```routeros
:foreach vendo in=$vendos do={ 
    :delay 2s;
    /do {
        /tool fetch http-method=post http-header-field="X-TOKEN: $apiKey" \
            url="http://$vendo/admin/api/restartSystem"
    } on-error={
        :log error "FAILED: $vendo";
    }
}
```

### Retry failed vendos:
```routeros
:local vendos {"10.1.1.2"; "10.1.2.2"; "10.1.3.2";};
:local apiKey "pqa92jwxrk";

:foreach vendo in=$vendos do={ 
    :local success 0;
    :for attempt from=1 to=3 do={
        :if ($success = 0) do={
            /do {
                /tool fetch http-method=post http-header-field="X-TOKEN: $apiKey" \
                    url="http://$vendo/admin/api/restartSystem"
                :set success 1;
                :log warning "Restarted $vendo on attempt $attempt";
            } on-error={
                :log error "Attempt $attempt failed for $vendo";
                :delay 1s;
            }
        }
    }
}
```

### Send Telegram alert before restart:
```routeros
:local botApi "123456789:ABCDefGHIJKlmNOpqrsTUvwxYZ";
:local chatId "-123456789";
:local message "⚠️ Vendo restart scheduled - Service down 1 minute";
/tool fetch url="https://api.telegram.org/bot$botApi/sendMessage?chat_id=$chatId&text=$message" keep-result=no;

:delay 2s;

# Then execute restart...
:foreach vendo in=$vendos do={ ... }
```

### Restart specific vendo groups by time:
```routeros
# Group A - Restart every Monday
:local vendosA {"10.1.1.2"; "10.1.2.2";};

# Group B - Restart every Thursday  
:local vendosB {"10.1.3.2"; "10.1.4.2";};

# Distribute load across week
```

### Log restart history to file:
```routeros
:local timestamp [/system clock get date];
/file print file="vendo-restart-log" >> "$timestamp: Vendo restart initiated\n";

:foreach vendo in=$vendos do={ 
    /do {
        /tool fetch http-method=post http-header-field="X-TOKEN: $apiKey" \
            url="http://$vendo/admin/api/restartSystem"
        /file print file="vendo-restart-log" >> "$timestamp: $vendo - SUCCESS\n";
    } on-error={
        /file print file="vendo-restart-log" >> "$timestamp: $vendo - FAILED\n";
    }
}
```

### Email notification on failed restarts:
```routeros
:local failedCount 0;

:foreach vendo in=$vendos do={ 
    /do {
        /tool fetch http-method=post http-header-field="X-TOKEN: $apiKey" \
            url="http://$vendo/admin/api/restartSystem"
    } on-error={
        :set failedCount ($failedCount + 1);
    }
}

:if ($failedCount > 0) do={
    /tool e-mail send to="admin@example.com" subject="Vendo Restart Failed" \
        body="$failedCount vendos failed to restart"
}
```

### Conditional restart based on time:
```routeros
:local currentDay [/system clock get day-of-week];

# Only restart on weekends
:if ($currentDay = "sat" || $currentDay = "sun") do={
    :foreach vendo in=$vendos do={ ... }
}
```

## Best Practices

1. **Schedule during low-traffic hours** (2-6 AM recommended)
2. **Notify customers** before scheduled maintenance
3. **Stagger restarts** if many vendos to prevent network overload
4. **Test on one vendo first** before deploying to all
5. **Keep API keys secure** and rotate regularly
6. **Monitor logs** for repeated failures
7. **Have manual backup** if API unavailable

## Related Guides

- [Vendo Nightlight Control](./vendo-nightlight-control)
- [NetWatch Telegram Alerts](../Monitoring/netwatch-telegram-alerts)
- [Send Logs to Email](../Email/send-logs-to-email)

## Completion

✅ **Vendo restart automation is ready!**

**Next steps:**
- Test script on one vendo
- Verify restart completes successfully
- Schedule weekly maintenance window
- Set up Telegram/email alerts
- Back up configuration: `/system backup save`
- Document restart schedule for team
