---
sidebar_position: 3
---

# 💡 Mikrotik Failback

Keep traffic shaped even when LibreQoS is offline by automatically enabling RouterOS simple queues during outages. This guide adds **FQ_CoDel queues**, a **Netwatch failback**, and **PPP on-up/on-down scripts** so users are shaped locally when LibreQoS is down and disabled when it’s back online.

:::info
This setup assumes LibreQoS is the primary shaper and MikroTik queues are the fallback. When LibreQoS is online, queues are disabled; when it’s down, queues are enabled.
:::

## Prerequisites

- ✅ MikroTik RouterOS v6.49+ or v7.x
- ✅ PPPoE users (or PPP secrets) with profiles
- ✅ LibreQoS reachable on your network (e.g., `10.10.10.10`)
- ✅ Netwatch enabled for uptime detection
- ✅ Admin access via Winbox or SSH

:::warning
These scripts modify queues automatically. Test on a small subset of users before enabling globally.
:::

## Configuration Steps

### Option A: Terminal (Recommended)

1. **Create FQ_CoDel queue type**
   ```routeros
   /queue type add kind=fq-codel name=FQ_CODEL
   ```

2. **Limit SSH access to a dedicated API group**
   ```routeros
   /user group add name=sshAPI policy=ssh,read,write,!local,!telnet,!ftp,!reboot,!policy,!test,!winbox,!password,!web,!sniff,!sensitive,!api,!romon
   ```

3. **PPP on-up script (create fallback queue)**
   ```routeros
   :local address [/ppp active get [find name=$user] address]
   :local limit [/ppp profile get [find name=[/ppp secret get [find name=$user] profile]] comment]
   :local status [/tool netwatch get [find name="libreqos"] status]
   :if ($limit != "") do={
       :if ($status = "up") do={
           /queue simple add target=$address max-limit=$limit limit-at=$limit disabled=yes queue=FQ_CODEL/FQ_CODEL name=$user
       } else={
           /queue simple add target=$address max-limit=$limit limit-at=$limit disabled=no queue=FQ_CODEL/FQ_CODEL name=$user
       }
   }
   ```

4. **PPP on-down script (remove fallback queue)**
   ```routeros
   /queue simple remove [find dynamic=no name~$user]
   ```

5. **Netwatch entry for LibreQoS**
   ```routeros
   /tool netwatch add host=10.10.10.10 interval=00:00:30 timeout=2s name=libreqos \
       up-script="/queue simple set [find dynamic=no] disabled=yes" \
       down-script="/queue simple set [find dynamic=no] disabled=no"
   ```

6. **Apply PPP profile scripts**
   - Add the **on-up** and **on-down** scripts to your PPP profile(s).

### Option B: Winbox

1. **Create FQ_CoDel queue type**
   - **Queues → Queue Types → Add (+)**
   - **Name:** `FQ_CODEL`
   - **Kind:** `fq-codel`

2. **Create SSH API group**
   - **System → Users → Groups → Add (+)**
   - **Name:** `sshAPI`
   - **Policies:** check `ssh`, `read`, `write` only (disable all others)

3. **Add PPP on-up script**
   - **PPP → Profiles → Select Profile → Scripts → On Up**
   - Paste the on-up script from Option A

4. **Add PPP on-down script**
   - **PPP → Profiles → Select Profile → Scripts → On Down**
   - Paste the on-down script from Option A

5. **Add Netwatch entry**
   - **Tools → Netwatch → Add (+)**
   - **Host:** LibreQoS IP (e.g., `10.10.10.10`)
   - **Interval:** `00:00:30`
   - **Timeout:** `2s`
   - **Up Script:** `/queue simple set [find dynamic=no] disabled=yes`
   - **Down Script:** `/queue simple set [find dynamic=no] disabled=no`

## Understanding the Configuration

**Flow Diagram**

```
[PPPoE User Up]
      ↓
[Create Simple Queue Disabled]
      ↓
[Netwatch Checks LibreQoS]
      ↓
[LibreQoS Down?] → Enable Queues
[LibreQoS Up?]   → Disable Queues
```

**Components Table**

| Component | Purpose | Notes |
|---|---|---|
| FQ_CODEL queue | Low-latency fallback shaping | Applied to PPP users |
| PPP on-up script | Adds user queue | Disabled when LibreQoS is up |
| PPP on-down script | Removes user queue | Keeps config clean |
| Netwatch | Detects LibreQoS availability | Toggles queue state |
| sshAPI group | Limits access | Optional but recommended |

## Verification

1. **Confirm queue type exists**
   ```routeros
   /queue type print where name="FQ_CODEL"
   ```
2. **Check Netwatch status**
   ```routeros
   /tool netwatch print where name="libreqos"
   ```
3. **Simulate LibreQoS down** (block ping or power off)
   - Verify queues become **enabled**
4. **Simulate LibreQoS up**
   - Verify queues become **disabled**

## Troubleshooting

| Issue | Cause | Solution |
|---|---|---|
| Queues never enable | Netwatch not firing | Check host IP and timeout |
| Queues always enabled | Netwatch stuck down | Verify ping reachability |
| No queues created | PPP profile has no comment | Add `download/upload` in profile comment |
| Wrong speed | Profile comment format invalid | Use `100M/50M` format |
| Duplicate queues | Script runs multiple times | Remove existing queue on-up before add |
| On-down not removing | Name mismatch | Ensure `name=$user` matches PPP user |
| High latency | Queue type wrong | Confirm `FQ_CODEL` set correctly |
| CPU spikes | Too many queues | Use queue trees for scale |
| LibreQoS flapping | Short interval | Increase Netwatch interval |
| SSH access too open | Group policies | Use `sshAPI` group only |
| PPP user missing | Not active | Check `/ppp active print` |
| Script errors | Syntax issue | Paste scripts exactly as shown |

## Advanced Options

1. **Guard against duplicate queues**
   ```routeros
   /queue simple remove [find dynamic=no name=$user]
   /queue simple add target=$address max-limit=$limit limit-at=$limit disabled=yes queue=FQ_CODEL/FQ_CODEL name=$user
   ```
2. **Use higher fallback limits for VIP users**
3. **Set per-profile queue types**
4. **Add logging to Netwatch scripts**
   ```routeros
   /log info "LibreQoS down — enabling fallback queues"
   ```
5. **Use Netwatch with multiple LibreQoS targets**
6. **Schedule daily cleanup of stale queues**
7. **Disable queues only for certain profiles**
8. **Move fallback queues to queue trees**
9. **Set burst parameters for short spikes**
10. **Integrate with Telegram alerts**

## Related Guides

- [LibreQoS Setup](./libreqos-installation)
- [MikroTik PPP/Hotspot Sync](./mikrotik-ppp-hotspot-sync)
- [Guest Bandwidth Control](../Mikrotik/Bandwidth/guest-bandwidth-dhcp-on-up)
- [NetWatch Telegram Alerts](../Mikrotik/Monitoring/netwatch-telegram-alerts)

## Completion

✅ **LibreQoS failback queues are active!**

**Next steps:**
- Test outage and recovery workflows
- Document profile limits and naming
- Monitor CPU usage during fallback
