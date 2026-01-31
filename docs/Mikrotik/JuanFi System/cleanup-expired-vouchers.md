---
sidebar_position: 4
---

# 🗑️ Clean Up Expired Vouchers


Automatically identify and remove expired hotspot voucher users that no longer have active schedulers. When a voucher expires, its scheduler ends but the user account remains in the system. This script cleans up orphaned accounts by either disabling or completely removing users without associated schedulers. Keeps your hotspot user database lean and prevents customers from accessing expired vouchers.

:::info
**What this does:**
- Scans all hotspot users for specific profile (e.g., HS-default)
- Checks if each user has an active scheduler
- Finds users with no scheduler (expired vouchers)
- Disables or removes them based on configuration
- Logs all actions for audit trail
:::

## Prerequisites

- ✅ MikroTik RouterOS device with hotspot configured
- ✅ Hotspot users created with schedulers (vouchers)
- ✅ Access to RouterOS console (SSH, Winbox, or WinBox)
- ✅ User profile name (e.g., "HS-default")
- ✅ RouterOS v6.41+
- ✅ Scheduled to run periodically (nightly recommended)

:::warning
**Data loss consideration:** Setting `disable = 1` permanently removes users. Use `disable = 0` (disable first) for testing.
:::

## Configuration Steps

### Option A: Terminal Configuration

1. **Access the terminal:**
   ```bash
   ssh admin@your-router-ip
   ```

2. **Create cleanup script (disable mode - safer):**
   ```routeros
   /system script add name="cleanup-expired-vouchers" source={
       :local profile "HS-default";
       :local disable 0;
       
       :log warning "==========<[ Removing Users with no Scheduler ]>=============";
       :foreach i in=[/ip hotspot user find] do={
           :local com [/ip hotspot user get $i comment];
           :if ($com = "") do={ 
               :local user [/ip hotspot user get $i name];
               :local uprof [/ip hotspot user get $i profile];
               :local shed [/system sche print count-only where name=$user];
               :if (($shed=0) && ($profile=$uprof)) do={ 
                   :log warning "Found expired: $user";
                   :if ($disable = 0) do={
                       /ip hotspot user set $i disabled=yes;
                   } else={ 
                       /ip hotspot user remove $i
                   }
               }
           }
       }
       :log warning "=======================<[ Done! ]>=========================";
   }
   ```

   :::tip
   - Replace `HS-default` with your actual profile name
   - Keep `disable = 0` for testing first
   - Change to `disable = 1` after confirming behavior
   :::

3. **Alternative: More aggressive cleanup** (remove users with or without comment):
   ```routeros
   /system script add name="cleanup-all-expired-vouchers" source={
       :local disable 0;
       
       :log warning "==========<[ Removing Users with no Scheduler ]>=============";
       :foreach i in=[/ip hotspot user find where name!~"default"] do={
           :local user [/ip hotspot user get $i name];
           :log info "Checking user $user";
           :local shed [/system sche print count-only where name=$user];
           :if ($shed=0) do={ 
               :log warning "Found expired: $user";
               :if ($disable = 0) do={
                   /ip hotspot user set $i disabled=yes;
               } else={ 
                   /ip hotspot user remove $i
               }
           }
       }
       :log warning "=======================<[ Done! ]]=========================";
   }
   ```

4. **Schedule nightly cleanup** (2 AM):
   ```routeros
   /system scheduler add name="cleanup-vouchers-nightly" on-event="cleanup-expired-vouchers" \
       start-time=02:00:00 interval=1d comment="Clean expired hotspot vouchers"
   ```

5. **Verify script:**
   ```routeros
   /system script print
   ```

### Option B: Winbox Configuration

1. **Navigate to System > Scripts:**
   - Click **+**
   - Name: `cleanup-expired-vouchers`
   - Paste script from Option A step 2
   - Click **OK**

2. **Navigate to System > Scheduler:**
   - Click **+**
   - Name: `cleanup-vouchers-nightly`
   - On Event: `cleanup-expired-vouchers`
   - Start Time: `02:00:00`
   - Interval: `1d`
   - Click **OK**

## Understanding the Script

### First Variant (Profile-Specific Cleanup)

```routeros
:local profile "HS-default";      # Only clean users with this profile
:local disable 0;                  # 0=disable, 1=remove

:foreach i in=[/ip hotspot user find] do={
    :local com [/ip hotspot user get $i comment];
    :if ($com = "") do={           # Only if comment is empty
        :local shed [/system sche print count-only where name=$user];
        :if (($shed=0) && ($profile=$uprof)) do={  # No scheduler AND matching profile
            # Action: disable or remove
        }
    }
}
```

**Conditions for cleanup:**
- Comment field is empty
- User has 0 active schedulers
- User profile matches "HS-default"

### Second Variant (Aggressive Cleanup)

```routeros
:foreach i in=[/ip hotspot user find where name!~"default"] do={
    # Excludes: users named "default"
    # Includes: all other users regardless of profile/comment
    
    :local shed [/system sche print count-only where name=$user];
    :if ($shed=0) do={             # Simply: no scheduler = remove
        # Action: disable or remove
    }
}
```

**Cleaner logic:**
- Ignores profile and comment
- Removes ANY user with no scheduler
- Better for simple voucher systems

## Verification

1. **Test script manually (disable mode first):**
   ```routeros
   /system script run cleanup-expired-vouchers
   ```

2. **Check logs:**
   ```routeros
   /log print where topics~"system"
   ```
   Should show:
   ```
   "Found expired: voucher123"
   "Found expired: voucher456"
   ```

3. **Verify users were disabled (not deleted):**
   ```routeros
   /ip hotspot user print where disabled=yes
   ```

4. **Count before/after:**
   ```routeros
   /ip hotspot user print count-only
   # Before: 50
   # After: 45 (5 disabled)
   ```

5. **Check specific user status:**
   ```routeros
   /ip hotspot user print where name="voucher123"
   ```
   Should show `disabled=yes`

6. **Verify scheduler is gone:**
   ```routeros
   /system scheduler print where name="voucher123"
   # Should show empty (0 results)
   ```

7. **Monitor first run:**
   - Run script
   - Wait 5 minutes
   - Manually verify a few users were disabled
   - Confirm no errors in logs

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Script doesn't find any users | All users have schedulers or comments | Check: `/ip hotspot user print` to see actual data |
| "Unknown identifier" error | Profile name wrong or typo | List profiles: `/ip hotspot profile print` |
| Script removes too many users | Disable mode set to 1 prematurely | Set `disable = 0` to test first |
| Specific users not cleaned | User has a comment (not empty) | Clear comment: `/ip hotspot user set [find name=user] comment=""` |
| Scheduler still showing | Scheduler name doesn't match username | Verify scheduler names match user names exactly |
| Users re-enabled after cleanup | Someone manually re-enabled them | Add audit logging or block manual changes |

## Advanced Options

### Whitelist specific users (don't remove):
```routeros
:local whitelist {"admin"; "testuser"; "support";};
:local isWhitelisted 0;
:foreach wuser in=$whitelist do={
    :if ($user = $wuser) do={:set isWhitelisted 1}
}
:if ($isWhitelisted = 0) do={
    # Only remove if not in whitelist
    /ip hotspot user set $i disabled=yes;
}
```

### Email report of disabled users:
```routeros
:local disabledList "";
:foreach i in=[/ip hotspot user find] do={
    :local shed [/system sche print count-only where name=$user];
    :if ($shed=0) do={
        :set disabledList "$disabledList $user\n";
    }
}
/tool e-mail send to="admin@example.com" subject="Expired Vouchers Cleaned" \
    body="Disabled users:\n$disabledList";
```

### Backup users before deletion:
```routeros
:local timestamp [/system clock get date];
/ip hotspot user print file="backup-$timestamp-expired.rsc";

# Then disable/remove
```

### Delete users permanently (aggressive):
```routeros
:set disable 1;  # Change from 0 to 1
```

### Only clean specific profile:
```routeros
:local profile "HS-1day";  # Only 1-day vouchers
# Or
:local profile "HS-7day";  # Only 7-day vouchers
```

### Clean based on creation date (older than 30 days):
```routeros
:local createdBefore [/system clock get date-time];
:foreach i in=[/ip hotspot user find] do={
    :local created [/ip hotspot user get $i creation-time];
    # Compare dates and remove if older
}
```

### Telegram alert when cleanup completes:
```routeros
:local botApi "123456789:ABCDefGHIJKlmNOpqrsTUvwxYZ";
:local chatId "-123456789";

# After cleanup completes:
/tool fetch url="https://api.telegram.org/bot$botApi/sendMessage?chat_id=$chatId&text=✅%20Expired%20vouchers%20cleaned:%20$cleanedCount" keep-result=no;
```

### Keep disabled users for 7 days, then delete:
```routeros
# First run: disable users
:local disable 0;

# Second run (7 days later): delete them
:local disable 1;
:local removeOlderThan 7;
```

### Generate statistics report:
```routeros
:local totalUsers ([/ip hotspot user print count-only]);
:local expiredCount ([/ip hotspot user print count-only where disabled=yes]);
:local activeCount ($totalUsers - $expiredCount);

/log info "Total: $totalUsers | Active: $activeCount | Expired: $expiredCount";
```

## Best Practices

1. **Test in disable mode first** - never jump to permanent deletion
2. **Schedule during off-peak hours** (2-4 AM recommended)
3. **Back up before changing to delete mode** - use `/ip hotspot user print file=backup.rsc`
4. **Monitor logs daily** for first week after deployment
5. **Keep disabled users for archive** - disable instead of delete
6. **Run weekly not daily** - balance cleanup vs admin overhead
7. **Document your settings** - profile names, disable settings, frequency

## Common Voucher Scenarios

| Scenario | Configuration |
|----------|---------------|
| 1-day vouchers expire after 24h | Profile: HS-1day; Run daily at 2 AM |
| 7-day vouchers expire after week | Profile: HS-7day; Run every 8 days |
| Mix of durations | Use aggressive variant (second script) |
| Resellable vouchers (keep backup) | Set disable=0; manual deletion later |

## Related Guides

- [Vendo Nightlight Control](./vendo-nightlight-control.md)
- [Vendo System Restart](./vendo-restart-system.md)
- [Vendo Sales Dashboard](./vendo-sales-dashboard.md)

## Completion

✅ **Expired voucher cleanup is ready!**

**Next steps:**
- Run script manually in disable mode
- Monitor for 7 days
- Confirm behavior matches expectations
- Switch to delete mode if needed
- Set up weekly scheduler
- Back up configuration: `/system backup save`
- Document cleanup policy for team
- Add Telegram alerts for notification
