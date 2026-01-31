---
sidebar_position: 2
---

# 📧 Email Backup

Automatically export your MikroTik router configuration and send it via email. This is essential for disaster recovery and maintaining offsite backups of your network setup. This guide shows you how to configure SMTP settings and create a scheduled backup script that emails your configuration file daily.

## Prerequisites

- ✅ MikroTik RouterOS device with email service enabled
- ✅ Gmail account (or SMTP server credentials)
- ✅ Router has internet connectivity
- ✅ System time is set correctly (for date-stamped backups)
- ✅ Access to RouterOS console (SSH, WebFig, or WinBox)

:::info
This guide uses Gmail SMTP. If using a different email provider, adjust the SMTP settings accordingly.
:::

## Configuration Steps

### Option A: Terminal Configuration

1. **Access the terminal** via SSH, console, or WebFig terminal
   ```bash
   ssh admin@your-router-ip
   ```

2. **Configure SMTP settings for Gmail:**
   ```routeros
   /tool e-mail
   set address=smtp.gmail.com \
       from="your-email@gmail.com" \
       password="your-app-password" \
       port=587 \
       start-tls=yes \
       user="your-email@gmail.com"
   ```

   :::warning
   **For Gmail:** Use an [App Password](https://support.google.com/accounts/answer/185833), not your regular Gmail password. 
   - Enable 2-Factor Authentication first
   - Generate an app-specific password
   - Use that 16-character password in the `password` field
   :::

3. **Create the backup script:**
   ```routeros
   /system script add name="email-backup" source={
       :local email "your-backup-email@example.com"
       /file remove [find name=export.rsc]
       /export file=export
       /tool e-mail send to=$email \
           subject="$[/system identity get name] $[/system clock get date] export" \
           body="Configuration backup - $[/system clock get date]" \
           file=export.rsc
   }
   ```

4. **Schedule the backup** (daily at 2 AM):
   ```routeros
   /system scheduler add name="daily-backup" on-event="email-backup" start-time=02:00:00 interval=1d
   ```

### Option B: WebFig Configuration

1. **Navigate to Tools > E-mail:**
   - Address: `smtp.gmail.com`
   - Port: `587`
   - From: `your-email@gmail.com`
   - User: `your-email@gmail.com`
   - Password: `your-app-password`
   - Start TLS: ✓ (enabled)
   - Click **Apply**

2. **Add the script via System > Scripts:**
   - Name: `email-backup`
   - Paste the script from Option A step 3
   - Click **Apply**

3. **Schedule the job via System > Scheduler:**
   - Name: `daily-backup`
   - On Event: `email-backup`
   - Start Time: `02:00:00`
   - Interval: `1d`
   - Click **Apply**

## Verification

1. **Test the email configuration:**
   ```routeros
   /tool e-mail send to="your-backup-email@example.com" subject="Test from Router" body="Email service is working"
   ```
   Check your inbox within 1-2 minutes.

2. **Run the backup script manually:**
   ```routeros
   /system script run email-backup
   ```
   Verify you receive the export file via email.

3. **Check the export file exists:**
   ```routeros
   /file print
   ```
   You should see `export.rsc` in the file list.

4. **Verify scheduler is active:**
   ```routeros
   /system scheduler print
   ```
   Confirm `daily-backup` is listed and enabled.

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| "Email not sent" error | SMTP credentials incorrect | Verify Gmail app password is correct; check if 2FA is enabled |
| "Connection timeout" | SMTP port blocked | Ensure port 587 is open; try port 25 or 465 |
| "TLS negotiation failed" | Start TLS setting mismatch | Confirm `start-tls=yes` is set; try `start-tls=no` if using port 465 |
| Email arrives late/never | Scheduler not running | Check `/system scheduler print`; verify system clock is accurate |
| "Permission denied" on file removal | Export file locked | Wait a few seconds; try script again |
| Wrong identity name in subject | System identity not set | Set identity: `/system identity set name="MyRouter"` |

## Completion

✅ **Your router now backs up automatically!**

**Next steps:**
- Test the scheduler by checking your email tomorrow at the scheduled time
- Add additional recipients to the script (comma-separated in `to` field)
- Consider rotating old exports to conserve storage: `if ($[/file get [find name=export.rsc] size] > 5M) then { /file remove [find name=export.rsc] }`
- Back up the export file locally to a secure location
