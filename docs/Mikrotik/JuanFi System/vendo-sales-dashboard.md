---
sidebar_position: 3
---

# 📊 Vendo Sales Dashboard Report


Generate a centralized sales dashboard report from all JuanFi vending machines, displaying real-time metrics including total sales, current balance, daily/monthly revenue in a formatted system note. Pulls data via API from multiple vendos, processes timestamps in 12-hour format, and compiles everything into a single readable report updated hourly or on-demand.

:::info
**Report includes:**
- Vendo names and IP addresses
- Total accumulated sales
- Current balance in machine
- Daily sales total
- Monthly sales total
- Timestamp of last update
- Error handling for offline vendos
:::

## Prerequisites

- ✅ MikroTik RouterOS device with HTTP client capability
- ✅ Multiple JuanFi vendos with API endpoints:
  - `/admin/api/getSystemConfig` (vendo name, data)
  - `/admin/api/dashboard` (balance, sales data)
- ✅ Vendo static IP addresses configured
- ✅ API key for authentication
- ✅ Access to RouterOS console (SSH, WebFig, or WinBox)
- ✅ RouterOS v6.48+

:::warning
**API Response Format:** This script expects JSON responses with specific fields. Verify your vendo firmware matches expected API format before deploying.
:::

## Configuration Steps

### Option A: Terminal Configuration

1. **Access the terminal:**
   ```bash
   ssh admin@your-router-ip
   ```

2. **Create the dashboard script:**
   ```routeros
   /system script add name="vendo-sales-dashboard" source={
       :local vendos {"10.1.1.2"; "10.1.2.2"; "10.1.3.2";};
       :local apiKey "pqa92jwxrk";
       
       # Format current time as 12-hour (2:30 PM format)
       :local itime  [/system clock get time];
       :local minsec [:pick $itime 2 8];
       :local mhours [:tonum [:pick $itime 0 2]];
       :local msymbl "AM";
       :if ($mhours > 11) do={:set msymbl "PM"};
       :set mhours ($mhours % 12);
       :if ($mhours = 0) do={:set mhours 12};
       :if ($mhours < 10) do={:set mhours "0$mhours"};
       :local mtime "$mhours$minsec $msymbl";
       
       # String split helper function
       :global split do={ 
           :local array;
           :for i from=0 to=([:len $string] - 1) do={ 
               :local char [:pick $string $i];
               :if ($char = "|") do={
                   :set $char ",";
               };
               :set array ($array . $char);
           };
           :return ([:toarray $array]);
       };
       
       # Build report rows
       :local row "";
       :foreach vendo in=$vendos do={ 
           /do {
               :log warning "Getting data from $vendo";
               :local settings [$split string=([ /tool fetch http-method=post \
                   http-header-field="X-TOKEN: $apiKey" \
                   url="http://$vendo/admin/api/getSystemConfig" \
                   output="user" as-value ]->"data")];
               :local infos [$split string=([ /tool fetch http-method=post \
                   http-header-field="X-TOKEN: $apiKey" \
                   url="http://$vendo/admin/api/dashboard" \
                   output="user" as-value ]->"data")];
               :local sales [toarray ([/system script get [find name=($settings->0)] comment])];
               :local newRow "$($settings->0)\t\t$vendo\t$($infos->1)\t$($infos->2)\t$($sales->3)\t$($sales->1)\r\n";
               :set row ($row . $newRow);
           } on-error={
               :log error "ERROR! $vendo OFFLINE";
               :local newRow "error! - offline\t$vendo\r\n";
               :set row ($row . $newRow);
           }
       }
       
       # Get daily and monthly income from scripts
       :local todayincome ([/system script get [find name=todayincome] source]);
       :local monthlyincome ([/system script get [find name=monthlyincome] source]);
       
       # Update system note with report
       /system note set note=\
           "==============================================================================\r\
           \n\t\t  TERMINAL VENDO SALES REPORT by AZK-TECH\r\
           \n\t\t    Updated on: $([/system clock get date]) $mtime\r\
           \n\t\tDAILY: $todayincome\t\t\tMONTHLY: $monthlyincome\r\
           \n==============================================================================\r\
           \nNAME\t\t\tIP ADDRESS\tTOTAL\tCURRENT\tDAILY\tMONTHLY\r\n$row";
       
       :log warning "Dashboard update complete";
   }
   ```

3. **Schedule hourly updates:**
   ```routeros
   /system scheduler add name="vendo-dashboard-hourly" on-event="vendo-sales-dashboard" \
       start-time=00:00:00 interval=1h comment="Update vendo sales dashboard"
   ```

4. **View the dashboard:**
   ```routeros
   /system note print
   ```

### Option B: WebFig Configuration

1. **Navigate to System > Scripts:**
   - Click **+**
   - Name: `vendo-sales-dashboard`
   - Paste full script from Option A step 2
   - Click **OK**

2. **Navigate to System > Scheduler:**
   - Click **+**
   - Name: `vendo-dashboard-hourly`
   - On Event: `vendo-sales-dashboard`
   - Start Time: `00:00:00`
   - Interval: `1h`
   - Click **OK**

3. **View dashboard:**
   - Navigate to System > System Notes
   - Should display formatted sales report

## Understanding the Script

### Time Formatting Logic

```routeros
:local itime [/system clock get time]     # Get 24-hour time (14:30:45)
:local minsec [:pick $itime 2 8]           # Extract :30:45
:local mhours [:tonum [:pick $itime 0 2]]  # Extract 14, convert to number

:if ($mhours > 11) do={:set msymbl "PM"}   # PM if > 11
:set mhours ($mhours % 12)                 # Convert to 12-hour (14 % 12 = 2)
:if ($mhours = 0) do={:set mhours 12}      # Midnight = 12
```

**Examples:**
- 14:30:45 → 2:30:45 PM
- 09:15:20 → 9:15:20 AM
- 00:45:00 → 12:45:00 AM

### String Split Function

```routeros
:global split do={ 
    :local array;
    :for i from=0 to=([:len $string] - 1) do={ 
        :local char [:pick $string $i];
        :if ($char = "|") do={
            :set $char ",";  # Convert pipe | to comma
        };
        :set array ($array . $char);
    };
    :return ([:toarray $array]);  # Convert to array
};
```

Converts pipe-delimited strings to RouterOS arrays for easy indexing.

### API Data Fetching

```routeros
/tool fetch http-method=post \
    http-header-field="X-TOKEN: $apiKey" \
    url="http://$vendo/admin/api/getSystemConfig" \
    output="user" as-value
```

Returns: `{"data": "name|model|version|..."}` → Parsed into array → Index as needed

### Report Row Building

```routeros
:local newRow "$($settings->0)\t\t$vendo\t$($infos->1)\t...\r\n"
```

- `$settings->0` - Vendo name
- `$vendo` - IP address
- `$infos->1` - Total sales
- `$infos->2` - Current balance
- Etc.

## Verification

1. **Test script manually:**
   ```routeros
   /system script run vendo-sales-dashboard
   ```

2. **Check system note:**
   ```routeros
   /system note print
   ```
   Should display formatted report with all vendos.

3. **Verify API responses:**
   ```bash
   curl -H "X-TOKEN: pqa92jwxrk" http://10.1.1.2/admin/api/getSystemConfig
   curl -H "X-TOKEN: pqa92jwxrk" http://10.1.1.2/admin/api/dashboard
   ```

4. **Monitor scheduler:**
   ```routeros
   /system scheduler print
   ```

5. **Check logs:**
   ```routeros
   /log print where topics~"system"
   ```

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Empty/blank report | Vendos offline or API unreachable | Ping vendo: `ping 10.1.1.2`; test API manually with curl |
| "Unknown identifier" error | Variable name typo or syntax | Verify: `$split`, `$toarray`, `->` operator syntax |
| Time format wrong | Time format logic issue | Check `/system clock print`; verify modulo math (% 12) |
| Missing data fields | API response format changed | Verify vendo firmware; check API documentation; adjust array indices |
| Report shows all "offline" | API key invalid | Test with curl; verify key matches vendo config |
| Scheduler doesn't run | Interval set incorrectly | Verify interval: `1h` (1 hour), `30m` (30 minutes), etc. |
| Truncated report | Report too long for system note | Reduce number of fields or consolidate data |

## Advanced Options

### Run every 30 minutes instead:
```routeros
/system scheduler set [find name=vendo-dashboard-hourly] interval=30m
```

### Add network status indicator:
```routeros
:foreach vendo in=$vendos do={
    :local status "✓ Online";
    /do {
        /tool fetch url="http://$vendo/admin/api/dashboard" output="none" timeout=2s
    } on-error={
        :set status "✗ Offline";
    }
}
```

### Email report instead of system note:
```routeros
/tool e-mail send to="admin@example.com" subject="Vendo Sales Report" body="$reportText"
```

### Export report to file:
```routeros
/file print file="vendo-sales-report.txt" >> "$reportText";
```

### Add vendo temperature/humidity data:
```routeros
:local environment [$split string=([ /tool fetch http-method=post \
    http-header-field="X-TOKEN: $apiKey" \
    url="http://$vendo/admin/api/getEnvironment" \
    output="user" as-value ]->"data")];
```

### Create dashboard with pie/bar charts:
Generate CSV and import to Excel/Grafana for visualizations.

### Alert if any vendo offline for > 1 hour:
```routeros
:if ($offlineCount > 0) do={
    :local botApi "123456789:ABCDefGHIJKlmNOpqrsTUvwxYZ";
    :local chatId "-123456789";
    /tool fetch url="https://api.telegram.org/bot$botApi/sendMessage?chat_id=$chatId&text=🚨%20$offlineCount%20vendos%20offline" keep-result=no;
}
```

### Compare sales vs previous day/month:
```routeros
:local previousDayTotal 5000;  # Manually track or store
:local todayTotal 5500;
:local percentChange (($todayTotal - $previousDayTotal) / $previousDayTotal * 100);
```

## Sample Report Output

```
==============================================================================
	  TERMINAL VENDO SALES REPORT by AZK-TECH
	    Updated on: 2026-01-31 2:45:30 PM
	DAILY: 5500 PHP		MONTHLY: 125000 PHP
==============================================================================
NAME			IP ADDRESS	TOTAL	CURRENT	DAILY	MONTHLY
Vendo 01		10.1.1.2	15000	1200	1800	45000
Vendo 02		10.1.2.2	12500	950	1500	38000
Vendo 03		10.1.3.2	error! - offline
```

## Best Practices

1. **Check API format** with vendo provider before deployment
2. **Test with one vendo** first before adding all
3. **Store previous totals** to calculate growth trends
4. **Schedule during off-peak** to avoid network congestion
5. **Set up alerts** for offline vendos
6. **Monitor report consistency** - sudden drops may indicate data loss
7. **Back up reports** to external server weekly

## Related Guides

- [Vendo Nightlight Control](./vendo-nightlight-control.md)
- [Vendo System Restart](./vendo-restart-system.md)
- [NetWatch Telegram Alerts](../netwatch-telegram-alerts.md)

## Completion

✅ **Vendo sales dashboard is now active!**

**Next steps:**
- Run script manually to verify format
- Set up hourly scheduler
- Share dashboard view with management
- Add Telegram/email alerts for offline vendos
- Export data to Excel for trend analysis
- Back up configuration: `/system backup save`
