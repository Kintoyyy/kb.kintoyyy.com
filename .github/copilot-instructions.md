# Copilot Instructions for kb.kintoyyy.com

## Project Overview

This is a **Docusaurus v3.9.2** documentation site hosting practical knowledge about Proxmox, MikroTik, Networking, and JuanFi vending systems. The site is focused on real-world setups with clear, repeatable procedures.

**Key Details:**
- **Language:** JavaScript/JSX with Markdown content
- **Runtime:** Node.js ≥20.0
- **Package Manager:** npm/yarn
- **Deployment:** GitHub Pages with automatic builds
- **URL:** https://kb.kintoyyy.com

**Content Inventory:**
- **17 MikroTik Guides** - Routing, firewall, RADIUS, monitoring
- **8 JuanFi System Guides** - Vending automation
- **2 Proxmox Guides** - Virtualization, post-install

---

## Architecture & Key Directories

```
project/
├── docs/                  # Main documentation (auto-indexed by Docusaurus)
│   ├── intro.md          # Home page
│   ├── Proxmox/          # Proxmox virtualization guides
│   ├── Mikrotik/         # MikroTik topic collection (17 guides)
│   │   └── JuanFi System/  # Vending automation subcategory (8 guides)
│   └── tutorial-basics/  # Default Docusaurus example (can be removed)
├── blog/                 # Blog posts (separate from docs, RSS enabled)
├── src/
│   ├── pages/            # Custom pages (index.js for homepage)
│   └── css/              # Global styles (custom.css)
├── static/               # Static assets (favicons, images)
└── docusaurus.config.js  # Main Docusaurus configuration (v4 compat mode enabled)
```

**Important:** Documentation files use **front matter YAML** for metadata:
```yaml
---
sidebar_position: 1          # Controls doc order in category
---
```

For categories, create `_category_.json` with:
```json
{
  "label": "Category Name",
  "position": 2,
  "link": {
    "type": "generated-index",
    "description": "Auto-generates index page from category docs"
  }
}
```

---

## Essential Workflows

### Local Development
```bash
yarn start        # Hot-reload dev server (http://localhost:3000)
```
- Changes to `.md` files reflect **instantly** without restart
- Changes to JS config files **require restart**
- Sidebar navigation auto-updates from file structure

### Building & Deployment
```bash
yarn build        # Generate static site to /build directory
yarn deploy       # Build + push to gh-pages branch (GitHub Pages)
```

**Build Check:** Always run `yarn build` before pushing—it catches broken markdown links and config errors (see `onBrokenLinks: 'throw'` in docusaurus.config.js).

---

## Documentation Conventions

### 1. **Markdown Formatting (Applied in Recent Updates)**
- **Images:** Use Markdown syntax `![alt text](./img/filename.png)` NOT HTML
- **Callouts:** Use Docusaurus admonitions:
  ```markdown
  :::info
  Informational content
  :::
  
  :::warning
  Important warnings
  :::
  
  :::tip
  Helpful tips
  :::
  ```
- **Tables:** Standard Markdown tables for config/troubleshooting
- **Code blocks:** Always specify language (bash, javascript, json, etc.)

### 2. **Document Structure Pattern (Strict Template)**
All technical gui** (NO "## Overview" section - start directly with content)
2. **Introductory paragraph** (2-3 sentences: What problem? What's the benefit?)
3. **Info Box** - Key bullet points about functionality
4. **Prerequisites** - Checklist of requirements (✅ style)
5. **Prerequisites** - Checklist of requirements (✅ style)
4. **Warning Box** - Specific considerations/caveats
5. **Configuration Steps** - Option A (Terminal) and Option B (WebFig)
6. **Understanding the Configuration** - Flow diagram + Components table
7. **Verification** - Step-by-step tests with specific commands
8. **Troubleshooting** - Issue/Cause/Solution table (10-12+ rows minimum)
9. **Advanced Options** - 8-12 variations/extensions (separate code blocks)
10. **Related Guides** - Links to related documentation
11. **Completion** - Emoji celebration + next steps

**Example files:** `docs/Mikrotik/cloud-ddns-routing.md`, `docs/Mikrotik/speedtest-traffic-routing.md`, `docs/Mikrotik/JuanFi System/*.md`

### 3. **Title Format Requirements**
- Keep titles SHORT: 2-4 words maximum
- Include emoji prefix matching topic category:
  - 📧 Email/Logging (email-backup, send-logs-to-email)
  - 🔒 Security/Firewall (enforce-dns-8.8.8.8, block-tethering-ttl)
  - 💡 Control/Automation (payment-reminder-popup, vendo-nightlight-control)
  - 🌐 Networking/Routing (cloud-ddns-routing, vpn-game-routing)
  - 🚀 Performance/Optimization (speedtest-traffic-routing, guest-bandwidth-dhcp-on-up)
  - 🔊 Monitoring/Alerts (netwatch-telegram-alerts, beeper-alert-internet-down)

### 3. **Linking Between Docs**
```markdown)    # Same directory navigation (NO .md extension)
[Link text](../parent/file)              # Parent directory (NO .md extension)
[Link text](../../docs/Mikrotik/file)    # Absolute from project root (NO .md extension)
```
**CRITICAL:** Never include `.md` extensions in links. ```
Docusaurus auto-generates valid URLs at build time.

### 4. **Blog Post Front Matter**
```yaml
---
title: Post Title
authors: [author-key]        # References authors.yml
tags: [tag1, tag2]           # For blog categorization
---
```
See `blog/authors.yml` and `blog/tags.yml` for available values.

### 5. **MikroTik Scripting Patterns**
MikroTik guides use RouterOS scripting syntax. Key conventions:
- **Terminal code blocks** use `routeros` language tag for syntax highlighting
- **Variables** use MikroTik syntax: `:local varname` (not bash `$variable`)
- **Always provide BOTH terminal AND WebFig approaches** (never GUI-only)
- **Terminal examples** include realistic IP addresses/gateway names that MUST be replaced
- **WebFig steps** describe exact navigation path with field values

---

## Content Requirements & Checks

### When Adding Documentation:
1. **Use descriptive filenames:** `feature-name.md` (lowercase, hyphens)
2. **Add sidebar_position** in front matter to control ordering
3. **Create _category_.json** for new category folders
4. **Test links locally:** `yarn start` then click through content
5. **Validate build:** `yarn build` must complete without errors
6. **Add images to `img/` subfolder** within topic directory

### Before Committing:
```bash
yarn build  # Catches broken links, config errors
git add .
git commit -m "docs: descriptive message"
git push
```

---

## Docusaurus-Specific Patterns

### Auto-Generated Navigation
- **Sidebar:** Built from `docs/` folder structure + `_category_.json` files
- **Breadcrumbs:** Auto-generated from file path hierarchy
- **Next/Previous buttons:** Automatically linked based on `sidebar_position`
- **Search:** Full-text search works on all `.md` content (built-in)

### Key Config (docusaurus.config.js)
- `onBrokenLinks: 'throw'` - Build fails if links are broken (strict checking)
- `v4: true` flag in future config - Prepares for Docusaurus v4 upgrade
- GitHub edit links automatically generated to `tree/main/` branch
- Site title: "Knowledge Base - Kintoyyy"

### MDX Support
- Markdown files support JSX (can embed React components if needed)
- Keep JSX minimal—prefer standard Markdown + admonitions for consistency

---

## Example Patterns from Codebase

### Document Front Matter
```yaml
---
sidebar_position: 1
---

# Document Title
```

### Technical Guide Structure
See `docs/Mikrotik/cloud-ddns-routing.md` for complete pattern:
- Overview section with emoji + 2-3 sentence summary
- Info box with key bullet points
- Prerequisites checklist with ✅ style
- Warning box for caveats
- Option A (Terminal) / Option B (WebFig) configuration
- Understanding section with flow diagram + components table
- Verification steps with specific RouterOS commands
- Troubleshooting table (minimum 10-12 rows)
- Advanced options (8-12+ variations, each with code block)
- Related guides linking to related docs
- Completion confirmation with emoji

### Sidebar Posi7 guides + Welcome (sidebar_position 1-17)
1. Welcome (1), Email Backup (2), Send Logs (3), Enforce DNS (4)
2. Block Tethering (5), Starlink Firewall (6), Block ChromeCast (7)
3. Guest Bandwidth (8), NetWatch Telegram (9), Payment Popup (10)
4. Beeper Alert (11), Connect OLT (12), VPN Game Routing (13)
5. Cloud DDNS (14), Speedtest Routing (15), RADIUS Server (16), Access Concentrator (17)

When adding new guides, increment sidebar_position to maintain order.

### Proxmox Guides
Path: `docs/Proxmox/`
Current count: 2 guides
- Post-Install Configuration (1)
- Install MikroTik CHR (2)
When adding new guides, increment sidebar_position to maintain order.

### JuanFi System Guides
Path: `docs/Mikrotik/JuanFi System/`
Current count: 4 core guides + 4 pre-existing (sidebar_position 1-8)
- Core: Vendo Nightlight (1), Vendo Restart (2), Sales Dashboard (3), Cleanup Expired (4)
- Pre-existing: Address List (5), Fix 1970 Bug (6), Auto Binding (7), Sales Reset (8)

### Category Metadata
See `docs/Mikrotik/_category_.json` and `docs/Mikrotik/JuanFi System/_category_.json`:
```json
{
  "label": "Category Name",
  "position": 2,
  "link": { "type": "generated-index", "description": "Category overview text" }
}
```

---

## Common Tasks

### Add New Documentation Topic
1. Create folder: `docs/TopicName/`
2. Create `_category_.json` with label + position
3. Add `.md` files with `sidebar_position` front matter
4. Add images to `TopicName/img/`
5. Test: `yarn start` → navigate to verify
6. Build: `yarn build` → ensure no broken links

### Update Existing Documentation
- Keep Markdown formatting consistent (images, callouts, tables)
- Maintain document structure pattern for technical guides
- Test locally: changes should appear instantly
- Run `yarn build` to catch any link breakage

### Deploy Changes
- All changes to `main` branch auto-deploy to GitHub Pages
- DeNo "## Overview" headers:** Start directly with intro paragraph after title (new convention)
- **No .md extensions in links:** Use `[text](./file)` not `[text](./file.md)` (new convention)
- **ploy script uses `GIT_USER` env var (see README.md)
- Built site appears in `build/` directory

---

## Important Notes for AI Agents

- **Auto-generation is key:** Docusaurus auto-indexes docs and generates sidebars—avoid manual sidebar.js edits (currently using autogenerated mode)
- **Strict link checking:** Build will fail if any Markdown link is broken
- **Hot reload works:** Always use `yarn start` for iterative content development
- **Image paths are relative:** Images in `docs/Mikrotik/JuanFi System/img/` referenced as `./img/filename.png`
- **Front matter matters:** Missing `sidebar_position` can cause doc ordering issues
- **Category descriptions auto-generate index pages**—no need to manually create index.md files
- **RouterOS code blocks:** MUST use `routeros` language tag, not generic `bash` or `shell`
- **Dual configuration:** Every technical guide requires both terminal AND WebFig approaches—never GUI-only or terminal-only
- **Cross-references:** Link related guides at the end of each guide for discoverability
- **Troubleshooting depth:** Minimum 10-12 rows in troubleshooting tables covering edge cases and common issues
- **Advanced options:** Provide 8-12+ practical variations/extensions beyond basic configuration

---

## Technology Stack Summary

| Component | Version | Notes |
|-----------|---------|-------|
| Docusaurus | 3.9.2 | Modern, v4-compatible |
| React | 19.0.0 | Minimal usage in this project |
| Node.js | ≥20.0 | Required runtime |
| Prism | 2.3.0 | Syntax highlighting |
| MDX | 3.0.0 | Markdown + JSX support |

