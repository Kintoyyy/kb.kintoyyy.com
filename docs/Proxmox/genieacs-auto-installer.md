---
sidebar_position: 4
---

# 🚀 Install GenieACS

Automatically deploy a complete TR-069 ACS (Auto Configuration Server) for managing CPE devices with GenieACS, MongoDB 8.0, Node.js 20.x, and Nginx reverse proxy. This installer configures all services with systemd management, firewall rules, and production-ready defaults on Ubuntu systems.

:::info Key Features
- **Complete Stack** - Node.js 20.x, MongoDB 8.0, GenieACS v1.2.13, Nginx reverse proxy
- **Automated Services** - Systemd units for cwmp, nbi, fs, ui with auto-restart on boot
- **Firewall Configuration** - UFW rules for ports 80, 443, 7547, 7557, 7567
- **Production Ready** - JWT authentication, log management, service monitoring
- **TR-069 Compliant** - CWMP endpoint on port 7547 for CPE device management
- **Clean Uninstall** - Complete removal script for packages, configs, and logs
:::

## Prerequisites

Before installing GenieACS, ensure you have:

✅ **Proxmox VE** - Version 7.0 or higher  
✅ **Ubuntu VM** - 20.04, 22.04, or 24.04 LTS  
✅ **Root Access** - Script requires sudo privileges  
✅ **Internet Connection** - For downloading packages and dependencies  
✅ **Available Ports** - 80, 443, 7547, 7557, 7567 not in use  
✅ **Minimum Resources** - 2 CPU cores, 4GB RAM, 20GB storage

:::warning Important Considerations
- Default JWT secret is "secret" (must change for production environments)
- Default web UI credentials are admin/admin (change immediately after first login)
- MongoDB 8.0 requires AVX CPU instruction set (verify compatibility)
- Port 7547 (CWMP) must be accessible to CPE devices over WAN
- Services consume ~1GB RAM under typical load
- Uninstall script removes ALL data including MongoDB databases
- UFW firewall is automatically enabled (may affect existing rules)
:::

## Configuration Steps

### Option A: One-Liner Installation

```bash
# Download and execute installer directly from GitHub
bash -c "$(curl -fsSL https://raw.githubusercontent.com/Kintoyyy/genieacs-installer/main/install.sh)"

# Installation will automatically:
# - Install Node.js 20.x from NodeSource repository
# - Install MongoDB 8.0 Community Edition
# - Install GenieACS v1.2.13 via npm
# - Configure Nginx reverse proxy for UI (port 80)
# - Set up UFW firewall rules
# - Create systemd services for cwmp, nbi, fs, ui
# - Start and enable all services

# Monitor installation progress (outputs service status at end)
# Installation takes approximately 5-10 minutes depending on connection speed
```

### Option B: Manual Clone and Install

```bash
# Clone installer repository
git clone https://github.com/Kintoyyy/genieacs-installer.git
cd genieacs-installer

# Review install script before execution (recommended)
cat install.sh

# Make script executable
chmod +x install.sh

# Run installer with sudo
sudo ./install.sh

# Script will prompt for confirmation before:
# - Installing packages
# - Modifying firewall rules
# - Creating system users
# - Starting services

# Check installation logs
tail -f /var/log/genieacs/genieacs-ui.log
tail -f /var/log/genieacs/genieacs-cwmp.log
```

### Component Relationships

| Component | Purpose | Network Configuration |
|-----------|---------|----------------------|
| **GenieACS UI** | Web-based management interface | Port 3000 (proxied via Nginx on port 80) |
| **GenieACS CWMP** | TR-069 endpoint for CPE communication | Port 7547 (direct access from WAN/Internet) |
| **GenieACS NBI** | Northbound REST API for integration | Port 7557 (localhost or restricted access) |
| **GenieACS FS** | File server for firmware/config distribution | Port 7567 (CPE devices download files) |
| **MongoDB 8.0** | Database for device data, sessions, configs | Port 27017 (localhost only, no external access) |
| **Nginx** | Reverse proxy for UI, SSL termination ready | Port 80/443 (public access for administrators) |
| **UFW Firewall** | Port filtering and security policy | Allows 80, 443, 7547, 7557, 7567 |
| **Systemd Services** | Service management and auto-restart | genieacs-cwmp, genieacs-nbi, genieacs-fs, genieacs-ui |

### Service Management

| Command | Action | Use Case |
|---------|--------|----------|
| `systemctl status genieacs-ui` | Check UI service status | Verify web interface is running |
| `systemctl restart genieacs-cwmp` | Restart CWMP service | After config changes or troubleshooting |
| `systemctl stop genieacs-*` | Stop all GenieACS services | Maintenance or updates |
| `systemctl enable genieacs-ui` | Enable UI on boot | Ensure service starts after reboot |
| `journalctl -u genieacs-cwmp -f` | Follow CWMP logs in real-time | Monitor TR-069 sessions |
| `systemctl daemon-reload` | Reload systemd configuration | After editing service files |

## Verification

Test the installation with these commands:

**1. Check All Services Running:**
```bash
systemctl status genieacs-ui genieacs-cwmp genieacs-nbi genieacs-fs
# All services should show "active (running)" in green
# Look for "enabled" to confirm auto-start on boot
```

**2. Verify MongoDB Connection:**
```bash
mongosh --eval "db.version()"
# Expected: MongoDB version 8.0.x
# Confirms MongoDB is running and accessible

# Check GenieACS database exists
mongosh --eval "use genieacs" --eval "db.stats()"
# Expected: Database statistics (collections count, size)
```

**3. Test Web UI Access:**
```bash
curl -I http://localhost
# Expected: HTTP/1.1 200 OK
# Expected: nginx server header

# Test from browser: http://<server-ip>
# Login with admin/admin
```

**4. Verify CWMP Endpoint:**
```bash
curl -I http://localhost:7547
# Expected: HTTP/1.1 200 OK or 401 Unauthorized
# Confirms CWMP service is listening

# Check external accessibility (replace with your server IP)
curl -I http://<server-ip>:7547
# Should be accessible from WAN for CPE devices
```

**5. Test NBI API:**
```bash
# Get API version
curl http://localhost:7557

# List devices (will be empty on fresh install)
curl http://localhost:7557/devices/

# Expected: JSON response with empty array []
```

**6. Check UFW Firewall Rules:**
```bash
sudo ufw status numbered
# Expected ports ALLOW:
# 80/tcp, 443/tcp, 7547/tcp, 7557/tcp, 7567/tcp

# Verify UFW is active
sudo ufw status
# Expected: Status: active
```

**7. Verify Log Files:**
```bash
# Check log directory exists and has recent logs
ls -lah /var/log/genieacs/
# Expected: genieacs-ui.log, genieacs-cwmp.log, genieacs-nbi.log, genieacs-fs.log

# Check for errors in CWMP log
tail -n 50 /var/log/genieacs/genieacs-cwmp.log
# Should show service startup messages, no critical errors
```

**8. Test GenieACS Configuration:**
```bash
# Check GenieACS environment file
cat /opt/genieacs/genieacs.env
# Expected: GENIEACS_CWMP_ACCESS_LOG_FILE, GENIEACS_UI_JWT_SECRET, etc.

# Verify GenieACS installation
npm list -g genieacs
# Expected: genieacs@1.2.13 (or current version)
```

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| **"Cannot connect to MongoDB"** | MongoDB service not started or crashed | Check status: `systemctl status mongodb`, restart: `systemctl restart mongodb`, check logs: `journalctl -u mongodb -n 100` |
| **UI shows blank page** | Nginx proxy misconfiguration or UI service down | Verify UI running: `systemctl status genieacs-ui`, check Nginx config: `nginx -t`, restart Nginx: `systemctl restart nginx` |
| **Port 7547 not accessible from WAN** | Firewall blocking or CWMP service not listening | Check UFW: `sudo ufw status`, verify CWMP port: `netstat -tulpn \| grep 7547`, check router port forwarding |
| **"AVX instruction set required"** | CPU doesn't support MongoDB 8.0 requirements | Install older MongoDB version (7.0 or 6.0), or upgrade hardware, verify with: `grep avx /proc/cpuinfo` |
| **Service fails to start after reboot** | Systemd service not enabled | Enable service: `systemctl enable genieacs-ui genieacs-cwmp genieacs-nbi genieacs-fs`, verify: `systemctl is-enabled genieacs-ui` |
| **"npm ERR! code EACCES"** | Permission issues during installation | Run with sudo: `sudo ./install.sh`, fix npm permissions: `sudo chown -R $USER:$USER /opt/genieacs` |
| **CPE devices not connecting** | Wrong ACS URL configured on CPE or firewall | Verify ACS URL format: `http://<server-ip>:7547/`, check CPE logs, test with: `curl http://<server-ip>:7547` |
| **High CPU usage** | Too many concurrent CPE sessions or polling | Increase resources, adjust polling intervals in UI, check active sessions: `curl http://localhost:7557/devices/ \| jq length` |
| **MongoDB authentication failed** | JWT secret mismatch or corrupted config | Edit `/opt/genieacs/genieacs.env`, set new JWT secret, restart services: `systemctl restart genieacs-*` |
| **Nginx 502 Bad Gateway** | UI service crashed or port conflict | Check UI logs: `journalctl -u genieacs-ui -n 50`, verify port 3000 free: `netstat -tulpn \| grep 3000`, restart UI: `systemctl restart genieacs-ui` |
| **"Cannot find module 'genieacs'"** | npm global install path issue | Reinstall GenieACS: `npm install -g genieacs@1.2.13`, verify path: `npm config get prefix`, update $PATH if needed |
| **File server (FS) not serving files** | Incorrect file path or permissions | Check FS logs: `tail -f /var/log/genieacs/genieacs-fs.log`, verify files in: `/var/genieacs/`, set permissions: `chmod 644 /var/genieacs/*` |
| **Login fails with admin/admin** | Default credentials changed or database reset | Reset admin password via MongoDB: `mongosh genieacs --eval "db.users.updateOne({username:'admin'},{$set:{password:'admin'}})"` |
| **"Error: ENOSPC"** | File system watcher limit exceeded | Increase limit: `echo "fs.inotify.max_user_watches=524288" \| sudo tee -a /etc/sysctl.conf`, apply: `sudo sysctl -p` |
| **Slow web UI performance** | MongoDB not indexed or low resources | Add indexes: `mongosh genieacs --eval "db.devices.createIndex({_id:1})"`, increase RAM, optimize queries |

## Advanced Options

### 1. Custom JWT Secret Configuration
```bash
# Generate secure JWT secret
JWT_SECRET=$(openssl rand -base64 32)

# Update GenieACS environment file
sudo sed -i "s/GENIEACS_UI_JWT_SECRET=.*/GENIEACS_UI_JWT_SECRET=$JWT_SECRET/" /opt/genieacs/genieacs.env

# Restart UI service to apply
sudo systemctl restart genieacs-ui

# Verify new secret is loaded
sudo grep JWT_SECRET /opt/genieacs/genieacs.env
```

### 2. SSL/TLS Certificate with Let's Encrypt
```bash
# Install Certbot
sudo apt update && sudo apt install certbot python3-certbot-nginx -y

# Obtain certificate (replace example.com with your domain)
sudo certbot --nginx -d genieacs.example.com

# Certbot auto-configures Nginx for HTTPS on port 443
# Auto-renewal is enabled via systemd timer

# Verify certificate
sudo certbot certificates

# Test renewal
sudo certbot renew --dry-run
```

### 3. MongoDB Authentication Hardening
```bash
# Enable MongoDB authentication
sudo mongosh <<EOF
use admin
db.createUser({
  user: "genieacsAdmin",
  pwd: "SecurePassword123!",
  roles: [{role: "readWrite", db: "genieacs"}]
})
EOF

# Update MongoDB config to require authentication
sudo tee -a /etc/mongod.conf <<EOF
security:
  authorization: enabled
EOF

# Restart MongoDB
sudo systemctl restart mongodb

# Update GenieACS connection string
sudo sed -i 's|mongodb://localhost/genieacs|mongodb://genieacsAdmin:SecurePassword123!@localhost/genieacs|' /opt/genieacs/genieacs.env
sudo systemctl restart genieacs-*
```

### 4. External API Access with API Key
```bash
# Create API key in GenieACS UI
# Navigate to Admin > API Access > Add API Key

# Test NBI API with authentication
API_KEY="your-api-key-here"
curl -H "Authorization: Bearer $API_KEY" http://localhost:7557/devices/

# Configure firewall to restrict NBI access
sudo ufw delete allow 7557
sudo ufw allow from 10.0.0.0/8 to any port 7557 proto tcp
sudo ufw reload
```

### 5. Custom Log Rotation
```bash
# Create logrotate configuration
sudo tee /etc/logrotate.d/genieacs <<EOF
/var/log/genieacs/*.log {
    daily
    rotate 30
    missingok
    notifempty
    compress
    delaycompress
    postrotate
        systemctl reload genieacs-* > /dev/null 2>&1 || true
    endscript
}
EOF

# Test logrotate configuration
sudo logrotate -d /etc/logrotate.d/genieacs

# Force rotation
sudo logrotate -f /etc/logrotate.d/genieacs
```

### 6. High Availability with MongoDB Replica Set
```bash
# On primary server, initialize replica set
mongosh --eval '
rs.initiate({
  _id: "genieacs-rs",
  members: [
    {_id: 0, host: "10.0.0.10:27017"},
    {_id: 1, host: "10.0.0.11:27017"},
    {_id: 2, host: "10.0.0.12:27017"}
  ]
})
'

# Update GenieACS connection string for replica set
MONGO_URI="mongodb://10.0.0.10:27017,10.0.0.11:27017,10.0.0.12:27017/genieacs?replicaSet=genieacs-rs"
sudo sed -i "s|GENIEACS_MONGODB_CONNECTION_URL=.*|GENIEACS_MONGODB_CONNECTION_URL=$MONGO_URI|" /opt/genieacs/genieacs.env
sudo systemctl restart genieacs-*
```

### 7. CPE Auto-Provisioning Script
```bash
# Create provisioning script in GenieACS UI
# Navigate to Admin > Provisions > Add Provision

# Example provision script (JavaScript):
cat > provision-default.js <<'EOF'
const deviceId = declare("DeviceID.ID", {value: 1});
const model = declare("InternetGatewayDevice.DeviceInfo.ModelName", {value: 1});

// Set NTP server
declare("InternetGatewayDevice.Time.NTPServer1", {value: "pool.ntp.org"});

// Enable TR-069 periodic inform
declare("InternetGatewayDevice.ManagementServer.PeriodicInformEnable", {value: true});
declare("InternetGatewayDevice.ManagementServer.PeriodicInformInterval", {value: 3600});
EOF

# Upload to GenieACS via NBI API
curl -X PUT http://localhost:7557/provisions/default \
  -H "Content-Type: application/javascript" \
  --data-binary @provision-default.js
```

### 8. Monitoring with Prometheus Exporter
```bash
# Install GenieACS Prometheus exporter
sudo npm install -g genieacs-prometheus-exporter

# Create systemd service
sudo tee /etc/systemd/system/genieacs-prometheus.service <<EOF
[Unit]
Description=GenieACS Prometheus Exporter
After=network.target

[Service]
Type=simple
User=genieacs
WorkingDirectory=/opt/genieacs
ExecStart=/usr/local/bin/genieacs-prometheus-exporter
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# Enable and start exporter
sudo systemctl daemon-reload
sudo systemctl enable --now genieacs-prometheus.service

# Verify metrics endpoint
curl http://localhost:9100/metrics
```

### 9. Backup and Restore MongoDB
```bash
# Create backup script
sudo tee /opt/genieacs/backup.sh <<'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/genieacs"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

mongodump --db=genieacs --out=$BACKUP_DIR/genieacs-$DATE
tar -czf $BACKUP_DIR/genieacs-$DATE.tar.gz -C $BACKUP_DIR genieacs-$DATE
rm -rf $BACKUP_DIR/genieacs-$DATE

# Keep only last 7 backups
find $BACKUP_DIR -name "genieacs-*.tar.gz" -mtime +7 -delete
echo "Backup completed: $BACKUP_DIR/genieacs-$DATE.tar.gz"
EOF

sudo chmod +x /opt/genieacs/backup.sh

# Schedule daily backups
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/genieacs/backup.sh") | crontab -

# Restore from backup
tar -xzf /var/backups/genieacs/genieacs-20260131_020000.tar.gz -C /tmp
mongorestore --db=genieacs /tmp/genieacs-20260131_020000/genieacs
```

### 10. Multi-Tenant Configuration
```bash
# Create separate database for tenant
mongosh --eval 'use genieacs_tenant1'

# Clone GenieACS services for tenant
sudo cp /etc/systemd/system/genieacs-ui.service /etc/systemd/system/genieacs-ui-tenant1.service

# Edit new service file
sudo nano /etc/systemd/system/genieacs-ui-tenant1.service
# Modify:
# - Port: 3001
# - Database: genieacs_tenant1
# - Environment file: /opt/genieacs/genieacs-tenant1.env

# Reload and start tenant services
sudo systemctl daemon-reload
sudo systemctl enable --now genieacs-ui-tenant1

# Configure Nginx for tenant subdomain
sudo tee /etc/nginx/sites-available/tenant1 <<EOF
server {
    listen 80;
    server_name tenant1.genieacs.local;
    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host \$host;
    }
}
EOF

sudo ln -s /etc/nginx/sites-available/tenant1 /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### 11. CPE Firmware Management
```bash
# Create firmware directory
sudo mkdir -p /var/genieacs/firmware
sudo chown genieacs:genieacs /var/genieacs/firmware

# Upload firmware file
sudo cp router-firmware-v1.2.3.bin /var/genieacs/firmware/

# Make accessible via FS service
sudo chmod 644 /var/genieacs/firmware/*

# Create firmware upgrade script in UI
cat > firmware-upgrade.js <<'EOF'
const fileType = "1 Firmware Upgrade Image";
const fileName = "router-firmware-v1.2.3.bin";
const fileUrl = "http://SERVER_IP:7567/firmware/" + fileName;

declare("Downloads.[FileType:1 Firmware Upgrade Image].FileName", {value: fileName});
declare("Downloads.[FileType:1 Firmware Upgrade Image].URL", {value: fileUrl});
declare("Downloads.[FileType:1 Firmware Upgrade Image].Download", {value: Date.now()});
EOF

# Trigger upgrade via NBI API
curl -X POST http://localhost:7557/devices/DEVICE_ID/tasks \
  -H "Content-Type: application/json" \
  -d '{"name": "download", "file": "router-firmware-v1.2.3.bin"}'
```

### 12. Complete Uninstallation
```bash
# Download and run uninstall script
bash -c "$(curl -fsSL https://raw.githubusercontent.com/Kintoyyy/genieacs-installer/main/uninstall.sh)"

# Manual uninstall steps (if script unavailable):
# Stop all services
sudo systemctl stop genieacs-*
sudo systemctl disable genieacs-*

# Remove systemd service files
sudo rm /etc/systemd/system/genieacs-*.service
sudo systemctl daemon-reload

# Uninstall GenieACS
sudo npm uninstall -g genieacs

# Remove MongoDB
sudo systemctl stop mongodb
sudo apt remove --purge mongodb-org* -y
sudo rm -rf /var/lib/mongodb /var/log/mongodb

# Remove Nginx
sudo systemctl stop nginx
sudo apt remove --purge nginx nginx-common -y

# Remove Node.js (optional)
sudo apt remove --purge nodejs -y

# Remove GenieACS data and configs
sudo rm -rf /opt/genieacs /var/log/genieacs /var/genieacs

# Remove UFW rules
sudo ufw delete allow 80
sudo ufw delete allow 443
sudo ufw delete allow 7547
sudo ufw delete allow 7557
sudo ufw delete allow 7567
```

## Related Guides

- [Post-Install Configuration](./post-install-configuration) - Proxmox host optimization before deployment
- [Smokeping Multi-Docker Deployment](./smokeping-multi-docker-deployment) - Network monitoring for managed devices
- [Install MikroTik CHR](./install-mikrotik-chr) - CPE device alternatives for testing

## Completion

🎉 **Installation Complete!**

Your GenieACS TR-069 ACS platform is now operational with:
- ✅ Complete TR-069 stack with CWMP, NBI, FS, UI services
- ✅ MongoDB 8.0 database with automatic backups
- ✅ Nginx reverse proxy with SSL/TLS ready
- ✅ UFW firewall configured with necessary ports
- ✅ Systemd service management with auto-restart

**Next Steps:**
1. Access web UI: `http://<server-ip>` (login: admin/admin)
2. **Change default password immediately** in Admin > Users
3. Update JWT secret for production: `/opt/genieacs/genieacs.env`
4. Configure CPE devices with ACS URL: `http://<server-ip>:7547`
5. Create provisioning scripts for device auto-configuration
6. Set up SSL certificate with Let's Encrypt (Advanced Option 2)
7. Configure MongoDB authentication (Advanced Option 3)
8. Schedule automated backups (Advanced Option 9)

**Management Commands Reference:**
```bash
systemctl status genieacs-*       # Check all services
systemctl restart genieacs-cwmp   # Restart CWMP service
journalctl -u genieacs-ui -f      # Follow UI logs
tail -f /var/log/genieacs/*.log   # Monitor all logs
mongosh genieacs                  # Access database
```

**Security Recommendations:**
- Change admin password and JWT secret before connecting CPE devices
- Enable MongoDB authentication for production use
- Configure SSL/TLS certificate for HTTPS access
- Restrict NBI API access to trusted networks only
- Implement regular backup schedule with off-site storage
