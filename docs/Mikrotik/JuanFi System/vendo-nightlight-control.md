---
sidebar_position: 1
---

# 💡 Vendo Nightlight Control


Remotely control nightlight (LED lighting) on multiple JuanFi vending machines from your MikroTik router using an automated API script. This guide demonstrates how to loop through multiple vendo devices, authenticate via API key, and toggle nightlights on/off based on time of day or manual trigger. Perfect for managing ambient lighting in 24/7 convenience stores, reducing power consumption at night, or creating scheduled lighting scenes.

:::info
**What this does:**
- Targets multiple vendo IP addresses (e.g., 10.1.1.2, 10.1.2.2, 10.1.3.2)
- Authenticates with API key header (`X-TOKEN`)
- Sends HTTP POST request to toggle nightlight
- Logs success/failure for each vendo
- Handles offline devices gracefully
:::

## Prerequisites

- ✅ MikroTik RouterOS device with HTTP client capability
- ✅ One or more JuanFi vendo devices on network (with nightlight feature)
- ✅ Vendo devices have assigned static IP addresses
- ✅ API credentials from vendo (IP address + API key)
- ✅ Network connectivity between MikroTik and all vendos
- ✅ Access to RouterOS console (SSH, Winbox, or WinBox)
- ✅ RouterOS v6.48+ for reliable HTTP POST operations

:::warning
**Vendo compatibility:**
- Works with JuanFi v2+ and compatible vending systems
- Requires vendo firmware that supports `/admin/api/toggerNightLight` endpoint
- Check with your vendo provider for API documentation
:::

## Configuration Steps

### Option A: Terminal Configuration

1. **Access the terminal** via SSH, console, or Winbox terminal
   ```bash
   ssh admin@your-router-ip
   ```

2. **Create a script for nightlight control:**
   ```routeros
   /system script add name="vendo-nightlight-control" source={
       :local vendos {"10.1.1.2"; "10.1.2.2"; "10.1.3.2";};
       :local apiKey "pqa92jwxrk";
       :local state 0;
       
       :foreach vendo in=$vendos do={ 
           /do {
               :log warning "============<[[ Setting Nightlight $vendo ]]>=============";
               /tool fetch http-method=post http-header-field="X-TOKEN: $apiKey" \
                   url="http://$vendo/admin/api/toggerNightLight?toggle=$state"
           } on-error={
               :log error "============<[[ ERROR! $vendo OFFLINE... ]]>=============";
           }
       }
   }
   ```

   :::tip
   **Customize the script:**
   - Add/remove vendo IPs in `vendos` array
   - Replace `pqa92jwxrk` with your actual API key
   - Change `state 0` to `1` to turn on nightlights
   :::

3. **Schedule the script to run** (daily at night - turn off nightlights):
   ```routeros
   /system scheduler add name="nightlight-off-schedule" on-event="vendo-nightlight-control" \
       start-time=20:00:00 interval=1d comment="Turn off vendo nightlights at 8 PM"
   ```

4. **Create second script for daytime** (turn nightlights back on):
   ```routeros
   /system script add name="vendo-nightlight-on" source={
       :local vendos {"10.1.1.2"; "10.1.2.2"; "10.1.3.2";};
       :local apiKey "pqa92jwxrk";
       :local state 1;
       
       :foreach vendo in=$vendos do={ 
           /do {
               :log warning "============<[[ Setting Nightlight $vendo ]]>=============";
               /tool fetch http-method=post http-header-field="X-TOKEN: $apiKey" \
                   url="http://$vendo/admin/api/toggerNightLight?toggle=$state"
           } on-error={
               :log error "============<[[ ERROR! $vendo OFFLINE... ]]>=============";
           }
       }
   }
   ```

5. **Schedule daytime activation** (turn on nightlights at morning):
   ```routeros
   /system scheduler add name="nightlight-on-schedule" on-event="vendo-nightlight-on" \
       start-time=06:00:00 interval=1d comment="Turn on vendo nightlights at 6 AM"
   ```

6. **Verify scripts were created:**
   ```routeros
   /system script print
   ```
   Should show `vendo-nightlight-control` and `vendo-nightlight-on`.

### Option B: Winbox Configuration

1. **Navigate to System > Scripts:**
   - Click **+** to add new script
   - Name: `vendo-nightlight-control`
   - Paste the script from Option A step 2
   - Click **OK**

2. **Add second script for day mode:**
   - Click **+** again
   - Name: `vendo-nightlight-on`
   - Change `state 0` to `state 1` in source
   - Click **OK**

3. **Schedule nighttime script:**
   - Navigate to System > Scheduler
   - Click **+**
   - Name: `nightlight-off-schedule`
   - On Event: `vendo-nightlight-control`
   - Start Time: `20:00:00`
   - Interval: `1d`
   - Click **OK**

4. **Schedule daytime script:**
   - Click **+** again
   - Name: `nightlight-on-schedule`
   - On Event: `vendo-nightlight-on`
   - Start Time: `06:00:00`
   - Interval: `1d`
   - Click **OK**

## Understanding the Script

### Array of Vendos

```routeros
:local vendos {"10.1.1.2"; "10.1.2.2"; "10.1.3.2";};
```

**Syntax breakdown:**
- `{...}` - Array/list container
- `"10.1.1.2"` - First vendo IP
- `;` - Separator between array elements
- Final `;` after last element required

**To add more vendos:**
```routeros
:local vendos {"10.1.1.2"; "10.1.2.2"; "10.1.3.2"; "10.1.4.2"; "10.1.5.2";};
```

### HTTP Request Components

| Component | Purpose |
|-----------|---------|
| `http-method=post` | Use HTTP POST (not GET) |
| `http-header-field="X-TOKEN: $apiKey"` | Authentication header |
| `url="http://$vendo/..."` | Target URL with vendo IP |
| `toggle=$state` | Query parameter (0=off, 1=on) |
| `/tool fetch` | RouterOS HTTP client command |

### Error Handling

```routeros
/do {
    # Try to execute command
} on-error={
    # If error occurs (vendo offline, wrong API key, etc.)
    :log error "ERROR! $vendo OFFLINE..."
}
```

**Gracefully handles:**
- Vendo offline/unreachable
- Timeout (vendo slow to respond)
- API key invalid
- Wrong endpoint

## Verification

1. **Verify scripts exist:**
   ```routeros
   /system script print
   ```
   Should show both `vendo-nightlight-control` and `vendo-nightlight-on`.

2. **Test script manually** (turn off nightlights):
   ```routeros
   /system script run vendo-nightlight-control
   ```

3. **Check logs for execution:**
   ```routeros
   /log print where topics~"system"
   ```
   Should show entries like:
   ```
   "============<[[ Setting Nightlight 10.1.1.2 ]]>============="
   "============<[[ ERROR! 10.1.1.2 OFFLINE... ]]>============="
   ```

4. **Test with vendo online:**
   - Ensure at least one vendo is powered on
   - Run: `/system script run vendo-nightlight-control`
   - Check physical vendo: nightlight should turn off
   - Check logs: Should see success message (no error)

5. **Verify scheduler is active:**
   ```routeros
   /system scheduler print
   ```
   Should show both nightlight schedules enabled.

6. **Monitor scheduled execution:**
   - Wait for scheduled time (or manually run for testing)
   - Check logs: `/log print`
   - Physical vendos should respond

7. **Test API authentication:**
   ```bash
   # From any device with HTTP client
   curl -H "X-TOKEN: pqa92jwxrk" \
       "http://10.1.1.2/admin/api/toggerNightLight?toggle=0"
   ```
   Should return success JSON (consult vendo API docs for response format).

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| All vendos show OFFLINE error | Network unreachable or wrong IPs | Verify IPs with `/ip arp print`; ping vendos: `ping 10.1.1.2` |
| Script runs but no effect | API key invalid or endpoint wrong | Test with curl (see verification step 7); check vendo firmware version |
| "Unknown identifier" error | Variable name or syntax error | Verify: array syntax `{...}`, string quotes `"..."`, semicolons exact |
| Scheduler doesn't run at scheduled time | Time not synchronized or scheduler disabled | Check: `/system clock print`; verify scheduler is `disabled=no` |
| Timeout waiting for vendo response | Vendo slow or network congestion | Increase timeout: add `http-timeout=5s` to fetch command |
| Some vendos work, some offline | Specific vendo offline or firewall blocking | Check individual vendo: `ping 10.1.X.X`; verify no firewall rules |
| API key rejected | Typo in API key or key expired | Verify exact key from vendo provider; contact support for key rotation |
| Script loops forever | Infinite loop or missing exit condition | Verify array syntax; check `on-error` is catching exceptions |

## Advanced Options

### Add more vendos dynamically:
```routeros
:local vendos {"10.1.1.2"; "10.1.2.2"; "10.1.3.2"; "10.1.4.2"; "10.1.5.2"; "10.1.6.2";};
```

### Stagger requests to avoid overload:
```routeros
:foreach vendo in=$vendos do={ 
    :delay 500ms;  # Wait 500ms between requests
    /do {
        :log warning "Setting Nightlight $vendo";
        /tool fetch http-method=post http-header-field="X-TOKEN: $apiKey" \
            url="http://$vendo/admin/api/toggerNightLight?toggle=$state"
    } on-error={
        :log error "ERROR! $vendo OFFLINE...";
    }
}
```

### Toggle based on sunset/sunrise time:
```routeros
:local currentHour [/system clock get hour];
:local state 0;

# Turn off nightlights between 8 PM and 6 AM
:if ($currentHour >= 20 || $currentHour < 6) do={
    :set state 0;  # OFF at night
} else={
    :set state 1;  # ON during day
}

# Then loop through vendos...
:foreach vendo in=$vendos do={ ... }
```

### Retry failed vendos (add resilience):
```routeros
:local vendos {"10.1.1.2"; "10.1.2.2"; "10.1.3.2";};
:local apiKey "pqa92jwxrk";
:local state 0;
:local retries 3;

:foreach vendo in=$vendos do={ 
    :local success 0;
    :for attempt from=1 to=$retries do={
        :if ($success = 0) do={
            /do {
                /tool fetch http-method=post http-header-field="X-TOKEN: $apiKey" \
                    url="http://$vendo/admin/api/toggerNightLight?toggle=$state"
                :set success 1;
                :log warning "Vendo $vendo - Success on attempt $attempt";
            } on-error={
                :log error "Vendo $vendo - Attempt $attempt failed";
                :delay 1s;
            }
        }
    }
}
```

### Send email notification on errors:
```routeros
:local vendos {"10.1.1.2"; "10.1.2.2"; "10.1.3.2";};
:local apiKey "pqa92jwxrk";
:local state 0;
:local failedVendos "";

:foreach vendo in=$vendos do={ 
    /do {
        /tool fetch http-method=post http-header-field="X-TOKEN: $apiKey" \
            url="http://$vendo/admin/api/toggerNightLight?toggle=$state"
    } on-error={
        :set failedVendos "$failedVendos $vendo,";
    }
}

# If any failed, send email alert
:if ($failedVendos != "") do={
    /tool e-mail send to="admin@example.com" subject="Vendo Nightlight Failed: $failedVendos" \
        body="The following vendos did not respond: $failedVendos"
}
```

### Log all transactions to file for audit:
```routeros
:local vendos {"10.1.1.2"; "10.1.2.2"; "10.1.3.2";};
:local apiKey "pqa92jwxrk";
:local state 0;
:local timestamp [/system clock get date];

/file print file="nightlight-log" >> "$timestamp: Starting nightlight control\n";

:foreach vendo in=$vendos do={ 
    /do {
        /tool fetch http-method=post http-header-field="X-TOKEN: $apiKey" \
            url="http://$vendo/admin/api/toggerNightLight?toggle=$state"
        /file print file="nightlight-log" >> "$timestamp: $vendo - SUCCESS\n";
    } on-error={
        /file print file="nightlight-log" >> "$timestamp: $vendo - FAILED\n";
    }
}
```

### Monitor and alert via Telegram (see NetWatch Telegram guide):
```routeros
:local failCount 0;
:foreach vendo in=$vendos do={ 
    /do {
        /tool fetch http-method=post http-header-field="X-TOKEN: $apiKey" \
            url="http://$vendo/admin/api/toggerNightLight?toggle=$state"
    } on-error={
        :set failCount ($failCount + 1);
    }
}

:if ($failCount > 0) do={
    :local botApi "123456789:ABCDefGHIJKlmNOpqrsTUvwxYZ";
    :local chatId "-123456789";
    :local message "🚨 $failCount vendos offline during nightlight control";
    /tool fetch url="https://api.telegram.org/bot$botApi/sendMessage?chat_id=$chatId&text=$message" keep-result=no;
}
```

## Integration with JuanFi System

### Combine with time-of-use (TOU) billing:
- Nightlights OFF during high-rate hours (peak pricing)
- Nightlights ON during low-rate hours (save power cost)

### Coordinate with customer notification:
```routeros
# Before turning off nightlights, send SMS/popup to customers
:log info "Announcing nightlight change to customers...";
# Call customer notification API here
:delay 5s;
# Then execute nightlight toggle
/system script run vendo-nightlight-control
```

### Monitor vendo energy usage:
Use nightlight state as part of overall power consumption tracking.

## JuanFi System Best Practices

1. **Keep API keys secure:**
   - Store in `/system script environment` if possible
   - Never commit API keys to version control
   - Rotate keys periodically

2. **Test before deploying:**
   - Run script on one vendo first
   - Verify nightlight actually changes state
   - Check for unintended side effects

3. **Schedule during low-usage times:**
   - Avoid peak business hours
   - Batch all API calls together (not spread throughout day)

4. **Monitor for failures:**
   - Review logs daily: `/log print | grep -i nightlight`
   - Set up alerts for repeated failures
   - Document failed vendos for maintenance

5. **Document your settings:**
   - Record which vendo IPs are in the array
   - Keep API key secure but documented for emergency access
   - Note scheduled times for on/off cycles

## Related Configurations

- **Telegram alerts:** See [NetWatch Telegram Alerts](../Monitoring/netwatch-telegram-alerts)
- **Email notifications:** See [Send Logs to Email](../Email/send-logs-to-email)
- **Scheduling tasks:** See [Guest Bandwidth DHCP On-Up](../Bandwidth/guest-bandwidth-dhcp-on-up)
- **Vendo management:** Consult JuanFi System documentation

## Completion

✅ **Vendo nightlight control is now automated!**

**Next steps:**
- Test script with one vendo manually
- Set up two schedules (morning on, evening off)
- Monitor logs for 7 days to verify reliability
- Adjust timing based on actual business hours
- Add email alerts for failed vendos
- Back up configuration: `/system backup save`
- Document nightlight schedule for staff
- Consider adding seasonal adjustments (longer days in summer)
