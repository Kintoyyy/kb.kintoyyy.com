---
sidebar_position: 9
---

# 🔔 NetWatch Telegram Alerts


Send real-time Telegram notifications when network devices go up or down using MikroTik's NetWatch feature. Monitor critical servers, gateways, or equipment and get instant alerts on Telegram. Perfect for 24/7 monitoring, alerting NOC teams, or tracking device availability. This guide uses Telegram Bot API to send messages when a host responds to ping (up) or stops responding (down).

:::info
**What this does:**
- NetWatch continuously pings a target IP
- When target becomes unreachable → script triggers → Telegram alert sent
- When target comes back online → script triggers → Telegram alert sent
- Works with any Telegram bot or group chat
:::

## Prerequisites

- ✅ MikroTik RouterOS device with NetWatch support
- ✅ Telegram Bot API token (create bot with @BotFather)
- ✅ Telegram chat ID (your personal chat or group chat)
- ✅ Access to RouterOS console (SSH, Winbox, or WinBox)
- ✅ Target IP address to monitor (e.g., 10.1.3.239)
- ✅ Router has internet connectivity for HTTPS to Telegram API

:::warning
**Security note:** Bot tokens are sensitive. Store them securely and never share them in repositories or logs.
:::

## Getting Telegram Bot Token & Chat ID

### Step 1: Create a Telegram Bot

1. Open Telegram and search for `@BotFather`
2. Send command: `/start`
3. Send command: `/newbot`
4. Choose a name (e.g., "MikroTik Monitor")
5. Choose a username (e.g., "mikrotik_monitor_bot")
6. Copy the provided token: `123456789:ABCDefGHIJKlmNOpqrsTUvwxYZ`

### Step 2: Get Your Chat ID

1. Open Telegram and search for `@userinfobot`
2. Send `/start`
3. It will show your chat ID (e.g., `123456789`)

:::tip
**For group chats:** Add the bot to a group, send `/start`, and check bot's chat history for group ID (starts with `-`).
:::

## Configuration Steps

### Option A: Terminal Configuration

1. **Access the terminal** via SSH, console, or Winbox terminal
   ```bash
   ssh admin@your-router-ip
   ```

2. **Add the NetWatch entry:**
   ```routeros
   /tool netwatch add host=10.1.3.239 interval=30s up-script={
       :local message "10.1.3.239 is up!!!";
       :local botApi "123456789:ABCDefGHIJKlmNOpqrsTUvwxYZ";
       :local chatId "-123456789";
       
       :log warning ">> $message";
       /tool fetch url="https://api.telegram.org/bot$botApi/sendMessage?chat_id=$chatId&text=$message" keep-result=no;
   } down-script={
       :local message "10.1.3.239 is DOWN!!!";
       :local botApi "123456789:ABCDefGHIJKlmNOpqrsTUvwxYZ";
       :local chatId "-123456789";
       
       :log warning ">> $message";
       /tool fetch url="https://api.telegram.org/bot$botApi/sendMessage?chat_id=$chatId&text=$message" keep-result=no;
   }
   ```

   :::tip
   **Customize:**
   - Replace `10.1.3.239` with your target IP
   - Replace `123456789:ABCDefGHIJKlmNOpqrsTUvwxYZ` with your bot token
   - Replace `-123456789` with your chat ID
   - Adjust `interval` (e.g., `60s`, `300s` for slower networks)
   :::

3. **Verify NetWatch entry was created:**
   ```routeros
   /tool netwatch print
   ```
   Should show your new entry with `host=10.1.3.239`.

4. **Test the alert manually:**
   ```routeros
   /tool netwatch run [find host=10.1.3.239]
   ```

### Option B: Winbox Configuration

1. **Navigate to Tools > NetWatch:**
   - Click the **+** button to add a new entry

2. **General Tab:**
   - Host: `10.1.3.239`
   - Interval: `30s`

3. **Up Script Tab:**
   - Paste the up-script:
   ```routeros
   :local message "10.1.3.239 is up!!!";
   :local botApi "123456789:ABCDefGHIJKlmNOpqrsTUvwxYZ";
   :local chatId "-123456789";
   
   :log warning ">> $message";
   /tool fetch url="https://api.telegram.org/bot$botApi/sendMessage?chat_id=$chatId&text=$message" keep-result=no;
   ```

4. **Down Script Tab:**
   - Paste the down-script:
   ```routeros
   :local message "10.1.3.239 is DOWN!!!";
   :local botApi "123456789:ABCDefGHIJKlmNOpqrsTUvwxYZ";
   :local chatId "-123456789";
   
   :log warning ">> $message";
   /tool fetch url="https://api.telegram.org/bot$botApi/sendMessage?chat_id=$chatId&text=$message" keep-result=no;
   ```

5. **Click OK/Apply**

## Understanding the Configuration

### NetWatch Parameters

| Parameter | Default | Purpose |
|-----------|---------|---------|
| `host` | Required | IP address to monitor (ping target) |
| `interval` | 30s | How often to check (30s recommended) |
| `timeout` | 5s | How long to wait for ping response |
| `up-script` | - | Script to run when host becomes reachable |
| `down-script` | - | Script to run when host becomes unreachable |

### Script Variables

| Variable | Value | Purpose |
|----------|-------|---------|
| `message` | String | Text to send in Telegram |
| `botApi` | Token | Bot API credentials |
| `chatId` | Number or -Group ID | Where to send message |

### Telegram API URL Structure

```
https://api.telegram.org/bot[BOT_TOKEN]/sendMessage?chat_id=[CHAT_ID]&text=[MESSAGE]
```

**Example:**
```
https://api.telegram.org/bot123456789:ABCDefGHIJKlmNOpqrsTUvwxYZ/sendMessage?chat_id=-123456789&text=10.1.3.239%20is%20up!!!
```

## Verification

1. **Verify NetWatch entry:**
   ```routeros
   /tool netwatch print
   ```
   Should show your entry with correct host and interval.

2. **Check scripts are in place:**
   ```routeros
   /tool netwatch print detail
   ```
   Should display both `up-script` and `down-script` content.

3. **Manual script test (up-script):**
   ```routeros
   /tool netwatch run [find host=10.1.3.239]
   ```
   Check your Telegram for message: "10.1.3.239 is up!!!"

4. **Check router logs:**
   ```routeros
   /log print where topics~"netwatch"
   ```
   Should show NetWatch check attempts and results.

5. **Ping the target to verify connectivity:**
   ```bash
   ping 10.1.3.239
   # Should respond normally
   ```

6. **Monitor NetWatch status:**
   ```routeros
   /tool netwatch print status
   ```
   Should show current status (up/down) and last check time.

7. **Force a state change test:**
   - Block the IP temporarily via firewall (simulate down state)
   - Wait for next interval check
   - Should receive "DOWN" alert on Telegram
   - Remove firewall rule
   - Should receive "UP" alert on Telegram

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| No Telegram message received | Bot token invalid | Verify token format; test with `curl` from another machine |
| "Access denied" Telegram error | Bot not added to chat/group | Add bot to group and check chat ID is correct (negative for groups) |
| Chat ID not found | Wrong chat ID format | Verify format: personal chat is positive (`123456`), group is negative (`-123456`) |
| Message shows URL encoding | Special characters in message | Use `%20` for spaces, `%21` for `!` (already handled by router) |
| NetWatch not triggering | Host always reachable or unreachable | Check: `interval` is appropriate; verify `host` is correct IP |
| Fetch timeout | Telegram API unreachable | Check: router has internet; verify HTTPS connectivity; try longer timeout |
| Script error "unknown identifier" | Variable name typo | Verify: `$message`, `$botApi`, `$chatId` (case-sensitive) |
| Message never changes from UP to DOWN | NetWatch not detecting state change | Increase `timeout` value; verify target actually goes offline |

## Advanced Options

### Include device hostname in alert:
```routeros
:local hostname [/system identity get name];
:local message "$hostname: 10.1.3.239 is up!!!";
```

### Add timestamp to alert:
```routeros
:local timestamp [/system clock get time];
:local message "10.1.3.239 UP at $timestamp";
```

### Include router IP in alert:
```routeros
:local routerIp [/ip address get [find interface=ether1] address];
:local message "[$routerIp] 10.1.3.239 is up!!!";
```

### Monitor multiple hosts with same script template:
```routeros
/tool netwatch add host=10.1.3.239 interval=30s \
    up-script={:local botApi "123456789:ABCDefGHIJKlmNOpqrsTUvwxYZ"; :local chatId "-123456789"; /tool fetch url="https://api.telegram.org/bot$botApi/sendMessage?chat_id=$chatId&text=10.1.3.239%20UP" keep-result=no;} \
    down-script={:local botApi "123456789:ABCDefGHIJKlmNOpqrsTUvwxYZ"; :local chatId "-123456789"; /tool fetch url="https://api.telegram.org/bot$botApi/sendMessage?chat_id=$chatId&text=10.1.3.239%20DOWN" keep-result=no;}

/tool netwatch add host=10.1.3.240 interval=30s \
    up-script={:local botApi "123456789:ABCDefGHIJKlmNOpqrsTUvwxYZ"; :local chatId "-123456789"; /tool fetch url="https://api.telegram.org/bot$botApi/sendMessage?chat_id=$chatId&text=10.1.3.240%20UP" keep-result=no;} \
    down-script={:local botApi "123456789:ABCDefGHIJKlmNOpqrsTUvwxYZ"; :local chatId "-123456789"; /tool fetch url="https://api.telegram.org/bot$botApi/sendMessage?chat_id=$chatId&text=10.1.3.240%20DOWN" keep-result=no;}
```

### Send additional info in message (with severity):
```routeros
# Up-script
:local message "🟢 ALERT UP: 10.1.3.239 is online";
:local botApi "123456789:ABCDefGHIJKlmNOpqrsTUvwxYZ";
:local chatId "-123456789";
/tool fetch url="https://api.telegram.org/bot$botApi/sendMessage?chat_id=$chatId&text=$message" keep-result=no;

# Down-script
:local message "🔴 ALERT DOWN: 10.1.3.239 is OFFLINE";
:local botApi "123456789:ABCDefGHIJKlmNOpqrsTUvwxYZ";
:local chatId "-123456789";
/tool fetch url="https://api.telegram.org/bot$botApi/sendMessage?chat_id=$chatId&text=$message" keep-result=no;
```

### Use script files for cleaner organization:
```routeros
# Create separate script files
/system script add name="netwatch-up-alert" source={
    :local message "10.1.3.239 is up!!!";
    :local botApi "123456789:ABCDefGHIJKlmNOpqrsTUvwxYZ";
    :local chatId "-123456789";
    /tool fetch url="https://api.telegram.org/bot$botApi/sendMessage?chat_id=$chatId&text=$message" keep-result=no;
}

/system script add name="netwatch-down-alert" source={
    :local message "10.1.3.239 is DOWN!!!";
    :local botApi "123456789:ABCDefGHIJKlmNOpqrsTUvwxYZ";
    :local chatId "-123456789";
    /tool fetch url="https://api.telegram.org/bot$botApi/sendMessage?chat_id=$chatId&text=$message" keep-result=no;
}

# Reference in NetWatch
/tool netwatch add host=10.1.3.239 interval=30s \
    up-script=/system script run netwatch-up-alert \
    down-script=/system script run netwatch-down-alert
```

### Send to Discord instead of Telegram:
```routeros
# Discord webhook format
:local message "10.1.3.239 is up!!!";
:local webhook "https://discordapp.com/api/webhooks/XXXXX/YYYYY";
/tool fetch url="$webhook" method=post http-data="content=$message" keep-result=no;
```

### Escalate alerts on repeated failures:
```routeros
# Down-script with escalation
:local message "10.1.3.239 DOWN - Alert Level 1";
:local botApi "123456789:ABCDefGHIJKlmNOpqrsTUvwxYZ";
:local chatId "-123456789";
/tool fetch url="https://api.telegram.org/bot$botApi/sendMessage?chat_id=$chatId&text=$message" keep-result=no;

# On third consecutive failure, send to emergency group
:local failures [/tool netwatch get [find host=10.1.3.239] comment];
:if ($failures > 3) do={
    :local emergencyChatId "-987654321";
    /tool fetch url="https://api.telegram.org/bot$botApi/sendMessage?chat_id=$emergencyChatId&text=🚨%20CRITICAL:%2010.1.3.239%20offline%20for%203+%20checks" keep-result=no;
}
```

## Related Configurations

- **Email alerts:** See [Email Backup](../Email/email-backup) for similar alert patterns
- **Logs to email:** See [Send Logs to Email](../Email/send-logs-to-email) for SMTP integration
- **Bandwidth monitoring:** See [Guest Bandwidth Control](../Bandwidth/guest-bandwidth-dhcp-on-up) for other on-event scripts
- **Telegram Bot best practices:** Store tokens in `/system script environment` for security

## Completion

✅ **NetWatch Telegram monitoring is now active!**

**Next steps:**
- Test with a device that goes offline/online
- Monitor alerts for 24 hours to verify reliability
- Add additional hosts to monitor
- Set up escalation policies for critical services
- Document monitored devices and their purposes
- Back up configuration: `/system backup save`
- Rotate bot tokens periodically for security
