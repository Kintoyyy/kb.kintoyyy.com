---
sidebar_position: 10
---

# 💳 Payment Reminder Popup


Display a payment reminder popup/image to users whose service has expired, while allowing them limited internet access and whitelisted sites. This is a captive portal approach that intercepts HTTP/HTTPS traffic and redirects expired users to a payment page hosted on an external service. Perfect for ISPs, hotspot operators, or subscription-based networks that need to remind users to renew their accounts. Users can access whitelisted sites (payment processor) but see a reminder image on all other HTTP/HTTPS requests.

:::info
**How it works:**
1. Expired users placed in separate PPP profile with rate limit (128k/128k)
2. All their HTTP/HTTPS traffic redirected to local proxy on port 8082
3. Proxy intercepts requests and shows payment reminder image
4. Whitelisted domains (e.g., payment processor) allowed to pass through
5. User sees popup/image → clicks → goes to payment page → renews service
:::

## Prerequisites

- ✅ MikroTik RouterOS device with proxy and NAT support
- ✅ User authentication system (PPP, Hotspot, or manual address-list)
- ✅ Hosting service for payment reminder image (e.g., freeimage.host, Imgur, or own server)
- ✅ Payment page URL or link (e.g., iili.io, your payment portal)
- ✅ Access to RouterOS console (SSH, Winbox, or WinBox)
- ✅ Separate subnet for expired users (e.g., 10.200.0.0/24)

:::warning
**Legal considerations:**
- Transparently disclose that traffic is being redirected
- Allow whitelist access to critical services (banking, emergency, health)
- Comply with ISP regulations in your country
- Consider HTTPS interception laws (may require user consent)
- Keep redirect image professional and non-aggressive
:::

## Configuration Steps

### Option A: Terminal Configuration

1. **Access the terminal** via SSH, console, or Winbox terminal
   ```bash
   ssh admin@your-router-ip
   ```

2. **Create loopback address for fake DNS:**
   ```routeros
   /ip address add address=10.255.255.2 interface=lo network=10.255.255.2
   ```

3. **Create DHCP pool for expired users:**
   ```routeros
   /ip pool add name=EXPIRED ranges=10.200.0.10-10.200.0.250
   ```

4. **Create PPP profile for expired users (rate-limited):**
   ```routeros
   /ppp profile add name=EXPIRED local-address=10.200.0.1 \
       remote-address=EXPIRED address-list=EXPIRED \
       dns-server=10.255.255.2 rate-limit=128k/128k
   ```

   :::tip
   Adjust `rate-limit=128k/128k` to your desired speed (128k = 128 Kbps).
   :::

5. **Create address list for expired users:**
   ```routeros
   /ip firewall address-list add address=10.200.0.0/24 list=EXPIRED
   ```

6. **Whitelist payment processor domain:**
   ```routeros
   /ip firewall address-list add address=iili.io list=WHITELIST
   ```

   :::tip
   Replace `iili.io` with your actual payment processor domain.
   :::

7. **Add NAT rule to redirect HTTP/HTTPS traffic:**
   ```routeros
   /ip firewall nat add action=redirect chain=dstnat protocol=tcp \
       dst-port=80,443 src-address-list=EXPIRED \
       dst-address-list=!WHITELIST to-ports=8082
   ```

8. **Add filter rule to drop non-whitelisted traffic:**
   ```routeros
   /ip firewall filter add action=drop chain=forward protocol=tcp \
       dst-port=80,443 src-address-list=EXPIRED \
       dst-address-list=!WHITELIST
   ```

9. **Enable HTTP Proxy:**
   ```routeros
   /ip proxy set enabled=yes port=8082
   ```

10. **Add proxy access rules:**
    ```routeros
    /ip proxy access add dst-port=8082 src-address=10.200.0.0/24
    
    /ip proxy access add action=redirect action-data="iili.io/fLtjFkJ.png" \
        dst-port=80,443 dst-address=!10.255.255.2 dst-host=!iili.io \
        src-address=10.200.0.0/24
    
    /ip proxy access add action=deny src-address=10.200.0.0/24
    ```

    :::tip
    Replace `iili.io/fLtjFkJ.png` with your actual payment reminder image URL.
    :::

### Option B: Winbox Configuration

#### Part 1: Create Loopback Address

1. **Navigate to IP > Addresses:**
   - Click **+** to add new address
   - Address: `10.255.255.2`
   - Interface: `lo` (loopback)
   - Network: `10.255.255.2`
   - Click **OK**

#### Part 2: Create Pool and PPP Profile

2. **Navigate to IP > Pools:**
   - Click **+** to add new pool
   - Name: `EXPIRED`
   - Ranges: `10.200.0.10-10.200.0.250`
   - Click **OK**

3. **Navigate to PPP > Profiles:**
   - Click **+** to add new profile
   - Name: `EXPIRED`
   - Local Address: `10.200.0.1`
   - Remote Address: `EXPIRED` (pool name)
   - DNS Servers: `10.255.255.2`
   - Rate Limit: `128k/128k`
   - Address List: `EXPIRED`
   - Click **OK**

#### Part 3: Create Address Lists

4. **Navigate to IP > Firewall > Address List:**
   - Add entry for expired users:
     - Address: `10.200.0.0/24`
     - List: `EXPIRED`
     - Click **OK**
   
   - Add entry for whitelist:
     - Address: `iili.io`
     - List: `WHITELIST`
     - Click **OK**

#### Part 4: Configure NAT and Filter

5. **Navigate to IP > Firewall > NAT:**
   - Click **+** to add rule:
   - Chain: `dstnat`
   - Protocol: `tcp`
   - Dst. Port: `80,443`
   - Src. Address List: `EXPIRED`
   - Dst. Address List: `!WHITELIST`
   - Action: `redirect`
   - To Ports: `8082`
   - Click **OK**

6. **Navigate to IP > Firewall > Filter Rules:**
   - Click **+** to add rule:
   - Chain: `forward`
   - Protocol: `tcp`
   - Dst. Port: `80,443`
   - Src. Address List: `EXPIRED`
   - Dst. Address List: `!WHITELIST`
   - Action: `drop`
   - Click **OK**

#### Part 5: Configure Proxy

7. **Navigate to IP > Web Proxy:**
   - Enabled: ✓ (checked)
   - Port: `8082`
   - Click **Apply**

8. **Navigate to IP > Web Proxy > Access:**
   - Add three rules:
   
   **Rule 1 (Allow proxy access):**
   - Dst. Port: `8082`
   - Src. Address: `10.200.0.0/24`
   - Action: (default - allow)
   - Click **OK**
   
   **Rule 2 (Redirect to payment):**
   - Dst. Port: `80,443`
   - Dst. Address: `!10.255.255.2`
   - Dst. Host: `!iili.io`
   - Src. Address: `10.200.0.0/24`
   - Action: `redirect`
   - Action Data: `iili.io/fLtjFkJ.png`
   - Click **OK**
   
   **Rule 3 (Deny all other):**
   - Src. Address: `10.200.0.0/24`
   - Action: `deny`
   - Click **OK**

## Understanding the Configuration

### Network Components

| Component | Address | Purpose |
|-----------|---------|---------|
| Loopback (fake DNS) | 10.255.255.2 | Fake DNS responses for expired users |
| Expired user gateway | 10.200.0.1 | Gateway for expired user subnet |
| Expired user pool | 10.200.0.10-10.200.0.250 | DHCP range for expired users |
| Proxy server | Port 8082 | Intercepts and redirects HTTP/HTTPS |

### Traffic Flow for Expired Users

```
1. Expired user (10.200.0.50) tries to visit website.com
2. NAT rule intercepts traffic destined to port 80/443
3. Traffic redirected to proxy port 8082 on local router
4. Proxy access rule matches:
   - If dst = whitelisted domain → allow through
   - If dst = any other → redirect to payment image
5. Browser displays payment reminder image
6. User clicks image → redirected to payment page
```

### Rate Limit Explanation

```
rate-limit=128k/128k
          ↓
     Upload/Download

128 Kbps (kilobits per second) = ~16 KB/s
- Slow enough to encourage payment
- Fast enough for basic browsing and payment page loading
```

## Verification

1. **Verify loopback address:**
   ```routeros
   /ip address print
   ```
   Should show `10.255.255.2` on `lo` interface.

2. **Verify pool and PPP profile:**
   ```routeros
   /ip pool print
   /ppp profile print
   ```
   Should show `EXPIRED` pool and profile with correct settings.

3. **Verify address lists:**
   ```routeros
   /ip firewall address-list print
   ```
   Should show `EXPIRED` (10.200.0.0/24) and `WHITELIST` (iili.io) entries.

4. **Verify NAT rule:**
   ```routeros
   /ip firewall nat print
   ```
   Should show redirect rule from port 80/443 to 8082.

5. **Verify proxy is enabled:**
   ```routeros
   /ip proxy print
   ```
   Should show `enabled=yes` and `port=8082`.

6. **Verify proxy access rules:**
   ```routeros
   /ip proxy access print
   ```
   Should show three rules with redirect and deny actions.

7. **Test from expired user device:**
   - Connect to network and receive IP in 10.200.0.0/24 range
   - Open browser and navigate to any HTTP/HTTPS site
   - Should see payment reminder image
   - Click image → should redirect to payment page

8. **Test whitelist access:**
   - Same device, try accessing whitelisted domain (iili.io)
   - Should load normally without redirect

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Popup doesn't appear | Proxy not enabled or NAT rule disabled | Check: `/ip proxy print` shows `enabled=yes`; verify NAT rule is `disabled=no` |
| Whitelisted site still redirects | Address list not matching | Verify domain name is exactly as registered in address list (case-sensitive) |
| All sites show popup (even whitelisted) | NAT rule priorities wrong | Check NAT rule order; ensure `dst-address-list=!WHITELIST` is applied |
| HTTPS traffic not redirected | HTTP/HTTPS port mismatch | Verify rule includes both `port=80,443`; HTTPS redirection may need special handling |
| Users can bypass popup | Firewall rule not in place | Verify filter rule on `forward` chain with `action=drop` |
| Proxy access denied | Src address not in allowed list | Check proxy access rule for 10.200.0.0/24; add if missing |
| Payment image won't load | Image hosting down or URL wrong | Test URL directly: `https://iili.io/fLtjFkJ.png`; verify URL is accessible |
| Redirect loops/infinite redirects | Proxy rules ordering wrong | Ensure allow rule comes before redirect rule in proxy access list |

## Advanced Options

### Multiple payment processor whitelists:
```routeros
/ip firewall address-list add address=paypal.com list=WHITELIST
/ip firewall address-list add address=stripe.com list=WHITELIST
/ip firewall address-list add address=square.com list=WHITELIST
```

### Different rate limits for different user tiers:
```routeros
# Premium expired (slower but functional)
/ppp profile add name=EXPIRED-PREMIUM rate-limit=256k/256k

# Free tier expired (very limited)
/ppp profile add name=EXPIRED-FREE rate-limit=64k/64k

# Critical sites whitelist (bank, health, emergency)
/ip firewall address-list add address=bank.com list=CRITICAL-WHITELIST
/ip firewall address-list add address=hospital.com list=CRITICAL-WHITELIST
```

### Time-based access restriction (only show popup during business hours):
```routeros
/ip firewall nat add action=redirect chain=dstnat protocol=tcp \
    dst-port=80,443 src-address-list=EXPIRED dst-address-list=!WHITELIST \
    to-ports=8082 disabled=yes comment="Business hours redirect"

# Schedule to enable/disable
/system scheduler add name="enable-payment-popup" on-event="/ip firewall nat enable [find comment=\"Business hours redirect\"]" start-time=09:00:00 interval=1d

/system scheduler add name="disable-payment-popup" on-event="/ip firewall nat disable [find comment=\"Business hours redirect\"]" start-time=18:00:00 interval=1d
```

### Redirect to custom HTML page instead of image:
```routeros
/ip proxy access add action=redirect action-data="yourserver.com/payment.html" \
    dst-port=80,443 dst-address=!10.255.255.2 dst-host=!yourserver.com \
    src-address=10.200.0.0/24
```

### Log redirect attempts:
```routeros
/ip firewall nat set [find action=redirect dst-port~"80|443"] log=yes \
    log-prefix="PAYMENT_REDIRECT: "
```
Then check: `/log print where prefix~"PAYMENT_REDIRECT"`

### Count active expired users:
```routeros
/ppp active print where profile=EXPIRED
```

### Automatically move users to expired profile on lease expiration:
Use `on-down` script on active PPP profile to assign expired profile.

### Whitelist multiple domains with patterns:
```routeros
# Whitelist all subdomains of payment processor
/ip firewall address-list add address=*.payment.com list=WHITELIST

# Or add specific subdomains
/ip firewall address-list add address=api.payment.com list=WHITELIST
/ip firewall address-list add address=checkout.payment.com list=WHITELIST
```

### Email notification when user reaches expired state:
See [Email Backup](../Email/email-backup) and [Send Logs to Email](../Email/send-logs-to-email) for SMTP setup.

## Security Considerations

### Best Practices

1. **HTTPS Interception:**
   - Some browsers/apps detect proxy interception
   - Consider disallowing HTTPS redirect or exempting it
   - May require SSL certificate installation on clients

2. **DNS Spoofing:**
   - Fake DNS (10.255.255.2) only works if DHCP pushes it
   - Users with static DNS may bypass popup
   - Consider blocking all DNS except yours via firewall

3. **Whitelist Management:**
   - Regularly review and update whitelist
   - Don't whitelist entire TLDs (e.g., .com) as this defeats purpose
   - Monitor for abuse patterns

4. **Rate Limiting:**
   - 128k may be too generous for some use cases
   - Test actual user experience before deployment
   - Consider lower limits (64k) for cost savings

5. **Legal Compliance:**
   - Inform users in terms of service
   - Respect regional privacy laws
   - Don't intercept HTTPS without consent in strict jurisdictions

## Related Configurations

- **Email alerts:** See [Send Logs to Email](../Email/send-logs-to-email)
- **DHCP scripting:** See [Guest Bandwidth Control](../Bandwidth/guest-bandwidth-dhcp-on-up)
- **Firewall rules:** See [Starlink Firewall Rules](../Security/starlink-firewall-rules)
- **Address lists:** See [Block Hotspot Users](../Security/block-hotspot-chromecast-access)

## Completion

✅ **Payment reminder popup is now active!**

**Next steps:**
- Create professional payment reminder image/page
- Test with expired user account
- Monitor proxy logs for redirect success rate
- Adjust rate limits based on user feedback
- Set up automatic profile assignment for expired users
- Back up configuration: `/system backup save`
- Document payment processor whitelisting policy
- Ensure compliance with local regulations
