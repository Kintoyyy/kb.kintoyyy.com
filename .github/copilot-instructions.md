# Copilot Instructions for kb.kintoyyy.com

## Quick Start

**Tech Stack:** Docusaurus 3.9.2, React 19, Node.js ≥20, npm/yarn  
**URL:** https://kb.kintoyyy.com  
**Core Commands:**
```bash
yarn start   # Dev server with hot-reload (http://localhost:3000)
yarn build   # Production build → /build directory (strict link checking)
yarn deploy  # Build + push to GitHub Pages
```

---

## Architecture Overview

This is a **Docusaurus static site** hosting 25+ infrastructure guides organized by topic:

```
docs/
├── intro.md                          # Homepage
├── Mikrotik/                         # 17+ guides organized in subcategories
│   ├── Routing/       (_category_.json with slug: /category/routing-pbr)
│   ├── Security/      (_category_.json with slug: /category/security-firewall)
│   ├── ISP/           (_category_.json with slug: /category/isp-infrastructure)
│   ├── Monitoring/    (_category_.json with slug: /category/monitoring-alerts)
│   ├── Email/         (_category_.json with slug: /category/email-logs)
│   ├── Container/
│   ├── Bandwidth/     (_category_.json with slug: /category/bandwidth-qos)
│   ├── JuanFi System/ (8 guides: vending automation subcategory)
│   └── _category_.json
├── Proxmox/                         # 4 infrastructure guides (VE virtualization)
│   ├── pci-passthrough-setup.md
│   ├── pcie-passthrough-fix.md
│   ├── efi-boot-fix.md
│   ├── windows-11-vm.md
│   └── _category_.json
└── tutorial-basics/                 # Default Docusaurus template (safe to ignore)
```

**Key Insight:** Each subcategory folder REQUIRES a `_category_.json` with explicit `"slug"` property to prevent Docusaurus chunk loading errors (e.g., "ChunkLoadError: Loading chunk ... failed").

---

## Critical Developer Workflows

### Local Development (Fastest Iteration)
```bash
yarn start
```
- Hot-reloads on `.md` changes instantly (no restart needed)
- JS/config changes require manual restart
- Links auto-validate in dev mode
- Navigate to verify sidebar + cross-references work

### Build & Validation (Pre-Deployment)
```bash
yarn build
```
- **Must pass before deployment.** Strict mode: `onBrokenLinks: 'throw'` kills build if any link is broken
- Validates ALL markdown links (catches relative path errors, missing files, .md extensions in links)
- Generates optimized static site to `/build`
- Check for warnings: webpack cache strategy is cosmetic (safe to ignore)

### Category Structure & Routing
**Every subcategory folder MUST have `_category_.json`** with this pattern:
```json
{
  "label": "🌐 Routing & PBR",      // Emoji prefix + category name
  "position": 2,                     // Affects sidebar order (1-8)
  "link": {
    "type": "generated-index",
    "description": "Policy-based routing and traffic steering guides.",
    "slug": "/category/routing-pbr"  // CRITICAL: Prevents chunk load errors
  }
}
```

---

## Documentation Conventions

### File Organization
- **Filenames:** lowercase, hyphens: `block-tethering-ttl.md` NOT `BlockTethering.md`
- **Images:** Store in `category/img/` subfolder, reference as `./img/filename.png`
- **Sidebar order:** Front matter `sidebar_position: 1` (controls doc order in category)

### Markdown Link Format (CRITICAL)
```markdown
❌ WRONG:  [Link](./file.md)         # .md extension breaks build
❌ WRONG:  [Link](../../docs/...)    # Unnecessary depth

✅ CORRECT: [Link](./file)            # Same directory (no extension)
✅ CORRECT: [Link](../Routing/file)   # Cross-category navigation (no extension)
✅ CORRECT: [Link](../../Proxmox/file) # From other top-level category
```
**Why:** Docusaurus auto-generates URLs at build time. Links with `.md` extensions cause "broken link" errors.

### Document Structure Template
Every technical guide follows this 11-section pattern (see `docs/Mikrotik/Routing/ospf-ptp.md` as example):

1. **Title + Emoji:** `# 🌐 OSPF Point-to-Point`
2. **Intro paragraph** (2-3 sentences: problem + benefit)
3. **Info box** (key bullet points)
4. **Prerequisites** (✅ checklist)
5. **Warning box** (caveats/considerations)
6. **Configuration** (Option A: Terminal, Option B: Winbox)
7. **Understanding** (flow diagram + components table)
8. **Verification** (step-by-step tests with commands)
9. **Troubleshooting** (10-12+ row table: Issue/Cause/Solution)
10. **Advanced options** (8-12+ practical variations, each with code block)
11. **Related guides** + **completion emoji**

### Code Blocks & Syntax Highlighting
```markdown
# RouterOS scripting (use "routeros" language tag)
    ```routeros
    /ip firewall filter add action=drop chain=forward
    ```

# Terminal commands (use "bash")
    ```bash
    ssh root@10.0.0.1 "ping 8.8.8.8"
    ```

# Config files (use "json", "yaml", etc.)
    ```json
    { "config": "value" }
    ```
```

### Callouts (Docusaurus Admonitions)
```markdown
:::info
Informational content
:::

:::warning
Important warnings or gotchas
:::

:::tip
Helpful tips or shortcuts
:::
```

---

## Build System & Deployment

### Build Pipeline
1. **`yarn build`** runs Docusaurus webpack bundler
2. Validates all links with `onBrokenLinks: 'throw'`
3. Generates static HTML/JS/CSS to `/build`
4. GitHub Actions auto-deploys to GitHub Pages on `main` branch push

### Common Build Errors & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `onBrokenMarkdownLink: Source ...` | Broken internal link | Update link in markdown (no .md extension) |
| `ChunkLoadError: Loading chunk ... failed` | Missing `_category_.json` or slug | Add `_category_.json` with explicit slug to category folder |
| `Link cannot reference other documents` | Invalid relative path | Use correct relative path (e.g., `../Routing/file` not `../../docs/`) |

---

## MikroTik-Specific Patterns

### RouterOS Code Blocks
Always use **`routeros` language tag** (not generic `bash`):
```routeros
:local ipaddr "192.168.1.1"
/ip firewall nat add chain=srcnat src-address=$ipaddr action=masquerade
```

### Dual Configuration Approach
**Every technical guide MUST provide both:**
1. **Terminal/CLI** - Paste-able script with real IP examples (e.g., `192.168.1.1` - users MUST replace)
2. **Winbox GUI** - Step-by-step navigation path with field values

Example:
```markdown
### Option A: Terminal
[Terminal commands here]

### Option B: Winbox
[GUI navigation: Menu → Submenu → Field = Value]
```

---

## Cross-Category Linking Best Practices

When linking between MikroTik subcategories or to Proxmox:

```markdown
# From Security/ guide to Routing/ guide
[OSPF configuration](../Routing/ospf-ptp)

# From ISP/ guide to Bandwidth/ guide
[Guest bandwidth setup](../Bandwidth/guest-bandwidth-dhcp-on-up)

# From MikroTik to Proxmox
[Windows 11 VM setup](../../Proxmox/windows-11-vm)

# From JuanFi System/ to parent Mikrotik guides
[LibreQoS setup](../../Mikrotik/libreqos-installation)
```

---

## Frontend Customization

### Homepage (`src/pages/index.js`)
- React component with donate modal triggered by `#support` hash
- QR image placeholder at `/static/img/donate-qr.png` (user uploads image)
- Support button in navbar links to modal

### Styling (`src/css/custom.css`, `src/pages/index.module.css`)
- CSS modules for component-scoped styles
- Custom Docusaurus theme overrides in `custom.css`
- Donate modal: `.donateModal`, `.donateOverlay`, `.donateQr` classes

---

## New Guide Checklist

When adding a new guide:

- [ ] Create file: `docs/Category/feature-name.md`
- [ ] Add front matter: `---\nsidebar_position: N\n---`
- [ ] Follow 11-section structure (intro, prerequisites, config, verify, troubleshoot, advanced)
- [ ] Use emoji in title matching category (`🌐` Routing, `🔒` Security, `💡` Control, etc.)
- [ ] Test locally: `yarn start` → verify sidebar + links
- [ ] Check build: `yarn build` → must pass with no broken link errors
- [ ] All MikroTik configs: both Terminal AND Winbox options
- [ ] Cross-reference related guides at end of document

---

## Key Files Reference

| File | Purpose | When to Edit |
|------|---------|--------------|
| `docusaurus.config.js` | Site config, navbar, plugins | URL, title, deployment settings |
| `sidebars.js` | Sidebar navigation (auto-generated) | Don't edit—use `_category_.json` + file structure |
| `docs/*/\_category_.json` | Category metadata + slug | Adding new subcategory or fixing routes |
| `src/pages/index.js` | Homepage + donate modal | Donate feature, hero banner |
| `src/css/custom.css` | Global theme overrides | Dark/light mode, navbar styling |
| `package.json` | Dependencies + scripts | Adding npm packages (rarely needed) |

---

## Troubleshooting AI Development

**Issue: Links break after adding new guide**
- Ensure all cross-references use relative paths WITHOUT `.md` extension
- Run `yarn build` to validate

**Issue: New category doesn't appear in sidebar**
- Add `_category_.json` to folder with `label`, `position`, and `slug` properties
- Restart dev server (`yarn start`)

**Issue: Documentation won't deploy**
- Check build: `yarn build` must complete without errors
- Verify `onBrokenLinks: 'throw'` passes
- All markdown links must be valid relative paths

---

## Technology Dependencies

| Tech | Version | Role |
|------|---------|------|
| Docusaurus | 3.9.2 | Static site generation, nav, search |
| React | 19.0.0 | Homepage + interactive components |
| Prism | 2.3.0 | Syntax highlighting for code blocks |
| MDX | 3.0.0 | Markdown + JSX support (used minimally) |
| Node.js | ≥20.0 | Runtime for build scripts |

---

## Recent Codebase Updates (As of Feb 2026)

✅ **New MikroTik Subcategories:** Routing, Security, ISP, Monitoring, Email, Container, Bandwidth  
✅ **New Guides:** OSPF PTP, BFD failover, Windows 11 VM, PCIe RMRR fix, EFI boot fix  
✅ **Build Improvements:** All category slugs now explicit to prevent chunk loading  
✅ **Homepage Enhancement:** Donate modal with QR support button in navbar  
✅ **Validation:** Build system passes with zero broken links

