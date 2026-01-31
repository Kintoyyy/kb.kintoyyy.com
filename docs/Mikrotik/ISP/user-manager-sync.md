---
sidebar_position: 7
---

# 💡 UM Sync

This guide automates **MikroTik User Manager** group creation and user imports based on existing PPP profiles and secrets. It saves time in ISP environments by keeping User Manager aligned with your PPPoE user database.

:::info
The script creates User Manager groups for every PPP profile, then imports PPP secrets as User Manager users if they don’t already exist.
:::

## Prerequisites

- ✅ MikroTik RouterOS with User Manager installed/enabled
- ✅ PPP profiles and PPP secrets already configured
- ✅ Admin access via Winbox or SSH/Terminal
- ✅ Sufficient storage for User Manager DB

:::warning
This script will **create** User Manager users. It does not update existing users. Test on a non‑production router first.
:::

## Configuration Steps

### Option A: Terminal (Recommended)

1. **Create User Manager groups from PPP profiles**
   ```routeros
   :foreach i in=[/ppp/profile find] do={
       :local profName [/ppp/profile get $i name]
       :if ([:len [/user-manager/user/group/find where name=$profName]] = 0) do={
           /user-manager/user/group/add attributes=("Mikrotik-Group:" . $profName) \
           inner-auths="ttls-pap,ttls-chap" \
           outer-auths="ttls-pap,ttls-chap" \
           name=$profName
       }
   }
   ```

2. **Import PPP secrets as User Manager users**
   ```routeros
   :foreach i in=[/ppp/secret find] do={
       :local userName [/ppp/secret get $i name]
       :local profileName [/ppp/secret get $i profile]
       :local password [/ppp/secret get $i password]

       :if (($password != "") and ($profileName != "")) do={
           :if ([:len [/user-manager/user/find where name=$userName]] = 0) do={

               :do {
                   /user-manager/user/add \
                       name=$userName \
                       password=$password \
                       group=$profileName
                   :log info ("[UM-IMPORT] Added user: " . $userName . " (Profile: " . $profileName . ")")
               } on-error={
                   :log warning ("[UM-IMPORT] Failed to add user: " . $userName)
               }

           } else={
               :log info ("[UM-IMPORT] Skipped existing user: " . $userName)
           }

       } else={
           :log warning ("[UM-IMPORT] Skipped invalid user: " . $userName)
       }
   }
   ```

3. **(Optional) Save script in System → Scripts**
   ```routeros
   /system script add name=um-sync policy=read,write,test source="<paste script>"
   ```

4. **(Optional) Schedule automatic sync**
   ```routeros
   /system scheduler add name=um-sync interval=1d on-event=um-sync
   ```

### Option B: Winbox

1. **Open** System → Scripts → Add
2. **Name:** `um-sync`
3. **Policy:** check `read`, `write`, `test`
4. **Paste** the full script (both sections)
5. **Run Script** to create groups and users
6. **Optional:** System → Scheduler → Add to run daily

## Understanding the Configuration

**Flow Diagram**

```
[PPP Profiles] -> [UM Groups]
[PPP Secrets]  -> [UM Users]
```

**Components Table**

| Component | Purpose | Notes |
|---|---|---|
| PPP Profiles | Source of group names | One group per profile |
| PPP Secrets | Source of users | Username + password |
| User Manager | AAA database | Groups + users |
| Scheduler | Automation | Run daily/weekly |

## Verification

1. **Check User Manager groups**
   ```routeros
   /user-manager/user/group print
   ```
2. **Check imported users**
   ```routeros
   /user-manager/user print
   ```
3. **Check logs**
   ```routeros
   /log print where message~"UM-IMPORT"
   ```
4. **Validate sample user login** in your PPP setup

## Troubleshooting

| Issue | Cause | Solution |
|---|---|---|
| Groups not created | User Manager disabled | Enable User Manager package |
| Users not imported | Empty password | Set PPP secret passwords |
| Wrong group assigned | Profile missing | Fix PPP secret profile field |
| Duplicate users | User exists | Script skips existing by design |
| Script errors | Missing policy | Add `read,write,test` policies |
| Logs empty | Script not run | Execute script manually |
| UM add fails | DB locked | Reboot UM service/router |
| Authentication fails | Wrong inner/outer auth | Use PAP/CHAP as configured |
| Profile renamed | Group mismatch | Re-run script to create group |
| Large imports slow | UM DB size | Run during off‑peak |
| User Manager missing | Package not installed | Install User Manager package |
| Scheduler not running | Disabled task | Enable scheduler entry |

## Advanced Options

1. Add a **pre-clean** step to remove unused UM users
2. Sync groups only for selected PPP profiles
3. Run on a schedule (hourly/daily)
4. Add email/Telegram alerts on sync failure
5. Filter out disabled PPP secrets
6. Add rate limits per profile in User Manager
7. Mirror User Manager DB backups weekly
8. Export a CSV report after each sync
9. Log to file for audit trails
10. Add a dry‑run mode (no changes)

## Related Guides

- [Access Concentrator Setup](./access-concentrator-setup)
- [RADIUS Server Integration](./radius-server-integration)
- [PPPoe QinQ Multi-OLT](./pppoe-qinq-multi-olt)

## Completion

✅ **User Manager is now synchronized with PPP profiles and secrets!**

**Next steps:**
- Schedule the script
- Verify user logins
- Back up User Manager database
