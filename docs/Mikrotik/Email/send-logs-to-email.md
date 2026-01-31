---
sidebar_position: 3
---

# 📋 Send Logs to Email


Automatically collect system logs from your MikroTik router and email them to yourself for remote monitoring and troubleshooting. This script captures all router events (authentication failures, interface changes, errors) and sends them on a schedule. Perfect for monitoring multiple routers or keeping offsite audit trails of network activity.

## Prerequisites

- ✅ MikroTik RouterOS device with email service enabled
- ✅ Gmail account (or SMTP server credentials)
- ✅ Email service already configured (see [Email Backup](./email-backup.md) for setup)
- ✅ Router has internet connectivity
- ✅ Access to RouterOS console (SSH, Winbox, or WinBox)
- ✅ Sufficient disk space for temporary log files

:::info
This guide assumes you've already configured SMTP settings. If not, complete the [Email Backup](./email-backup.md) guide first.
:::

## Configuration Steps

### Option A: Terminal Configuration

1. **Access the terminal** via SSH, console, or Winbox terminal
   ```bash
   ssh admin@your-router-ip
   ```

2. **Create the log backup script:**
   ```routeros
   /system script add name="send-logs-email" source={
       :local reciept "your-email@example.com";
       :local clearLogs 1;
       
       /do {
           :log warning "===========<[[ Creating Log File ]]>===========";
           log print file="logs backup";
           :log warning "===========<[[ Sending Log File ]]>===========";
           /do {
               /tool e-mail send to=$reciept subject="Logs $[/system identity get name] - $[/system clock get date] $[/system clock get time]" file="logs backup";
           } on-error={
               :log error "===========<[[ Error in sending the email ]]>===========";
           }
       } on-error={
           :log error "===========<[[ Error in Creating Log File ]]>===========";
       }
       :delay 5s;
       :if ($clearLogs = 1) do={ 
           /system logging action set memory memory-lines=1;
           /system logging action set memory memory-lines=1000;
       }
       /file remove "logs backup";
       :log warning "===========<[[ Done! Log Cleared & Removed Log File ]]>===========";
   }
   ```

   :::tip
   **Customize these settings:**
   - Replace `your-email@example.com` with your actual email
   - Set `clearLogs` to `0` if you want to preserve logs on the router
   - Adjust `memory-lines=1000` to control how many recent logs to keep
   :::

3. **Schedule the log email** (daily at 3 AM):
   ```routeros
   /system scheduler add name="daily-logs" on-event="send-logs-email" start-time=03:00:00 interval=1d
   ```

### Option B: Winbox Configuration

1. **Navigate to System > Scripts:**
   - Click the **+** button to add a new script
   - Name: `send-logs-email`
   - Paste the full script from Option A step 2
   - Click **Apply**

2. **Schedule the job via System > Scheduler:**
   - Click the **+** button to add a new scheduler entry
   - Name: `daily-logs`
   - On Event: `send-logs-email`
   - Start Time: `03:00:00`
   - Interval: `1d`
   - Click **Apply**

## Understanding the Script

| Component | Purpose |
|-----------|---------|
| `reciept` variable | Email address to send logs to |
| `clearLogs` flag | `1` = clear logs after sending; `0` = keep logs |
| `log print file` | Exports all logs to a temporary file |
| `on-error` blocks | Handles failures gracefully with error logging |
| `:delay 5s` | Waits for email to send before cleanup |
| `memory-lines` | Controls how many log entries to keep in memory |
| `:local` variables | Script-local variables, not persistent |

## Verification

1. **Test the script manually:**
   ```routeros
   /system script run send-logs-email
   ```
   Check your email inbox within 1-2 minutes.

2. **Verify log file was created and removed:**
   ```routeros
   /file print
   ```
   The "logs backup" file should not be present (it's auto-removed).

3. **Check the system log for script execution:**
   ```routeros
   log print where topics~"system"
   ```
   You should see entries like:
   ```
   "Creating Log File"
   "Sending Log File"
   "Done! Log Cleared & Removed Log File"
   ```

4. **Verify scheduler is active:**
   ```routeros
   /system scheduler print
   ```
   Confirm `daily-logs` is listed and enabled.

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Email contains no logs | Logs were cleared | Set `clearLogs = 0` to preserve logs for testing |
| "Error in sending the email" message | Email service not configured | Complete [Email Backup](./email-backup.md) setup; test with `/tool e-mail send` |
| Large email files | Too many logs being kept | Reduce `memory-lines` value (e.g., `500` instead of `1000`) |
| Script runs but no email received | Script timing issue | Increase `:delay` to `10s`; check email spam folder |
| "Log file already exists" error | Previous script failed to cleanup | Manually remove: `/file remove "logs backup"` |
| Scheduler not running | Scheduler disabled or system time wrong | Verify system time: `/system clock print`; enable scheduler in System menu |

## Log Contents

Each emailed log file typically contains:

```
00 00:00:00 system,info router rebooted
00 00:01:23 system,info system identity changed
00 00:05:45 interface,info ether1 link up
01 08:30:12 system,warning no available certificate
02 14:22:33 user,info admin logged in from SSH
```

:::warning
**Log Retention:** The script clears logs by resetting memory-lines to 1, then back to 1000. This prevents unbounded log growth but means only the last 1000 entries are retained between emails.
:::

## Advanced Options

### Send logs less frequently (weekly):
```routeros
/system scheduler set daily-logs interval=7d
```

### Send logs to multiple recipients:
Modify the script to loop through multiple emails:
```routeros
:local emails ("email1@example.com","email2@example.com")
:foreach email in=$emails do={
    /tool e-mail send to=$email subject="..." file="logs backup"
}
```

### Include logs before clearing (for audit trails):
Set `clearLogs = 0` to keep logs on the router even after emailing.

## Completion

✅ **Your router now sends logs automatically!**

**Next steps:**
- Test the scheduler by checking your email tomorrow at the scheduled time
- Store received log files in a centralized location for audit trails
- Combine with [Email Backup](./email-backup.md) to have complete monitoring
- Consider setting up different log email frequencies for different topics (interfaces, user activity, etc.)
