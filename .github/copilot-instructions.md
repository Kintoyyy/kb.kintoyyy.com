# Copilot Instructions for kb.kintoyyy.com

## Project Overview

This is a **Docusaurus v3.9.2** documentation site hosting practical knowledge about Proxmox, MikroTik, Networking, and Scripting. The site is focused on real-world setups with clear, repeatable procedures.

**Key Details:**
- **Language:** JavaScript/JSX with Markdown content
- **Runtime:** Node.js ≥20.0
- **Package Manager:** npm/yarn
- **Deployment:** GitHub Pages with automatic builds
- **URL:** https://kb.kintoyyy.com

---

## Architecture & Key Directories

```
project/
├── docs/                  # Main documentation (auto-indexed by Docusaurus)
│   ├── intro.md          # Home page
│   ├── Mikrotik/         # MikroTik topic collection (label in _category_.json)
│   │   └── JuanFi System/  # Subcategory with guides (position-based ordering)
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

### 2. **Document Structure Pattern (See JuanFi System docs)**
All technical guides follow this pattern:
1. **Emoji Header + Overview** - What problem does this solve?
2. **Prerequisites** - Checklist of requirements
3. **Step-by-step instructions** - Split into numbered sections with options (A/B)
4. **Verification** - How to confirm it worked
5. **Troubleshooting table** - Issue → Cause → Solution
6. **Completion message** - Celebration with emoji + next steps

**Example files:** `docs/Mikrotik/JuanFi System/*.md`

### 3. **Linking Between Docs**
```markdown
[Link text](./relative/path/to/file.md)    # Same directory navigation
[Link text](../parent/file.md)              # Parent directory
[Link text](../../docs/Mikrotik/file.md)    # Absolute from project root
```
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
See `docs/Mikrotik/JuanFi System/1970-bug.md` for complete pattern:
- Overview section with emoji
- Prerequisites checklist
- Options A (terminal) / B (GUI) for configuration
- Verification steps with specific commands
- Troubleshooting table format
- Completion confirmation

### Category Metadata
See `docs/Mikrotik/JuanFi System/_category_.json`:
```json
{
  "label": "JuanFi System",
  "position": 2,
  "link": { "type": "generated-index", "description": "..." }
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
- Deploy script uses `GIT_USER` env var (see README.md)
- Built site appears in `build/` directory

---

## Important Notes for AI Agents

- **Auto-generation is key:** Docusaurus auto-indexes docs and generates sidebars—avoid manual sidebar.js edits (currently using autogenerated mode)
- **Strict link checking:** Build will fail if any Markdown link is broken
- **Hot reload works:** Always use `yarn start` for iterative content development
- **Image paths are relative:** Images in `docs/Mikrotik/JuanFi System/img/` referenced as `./img/filename.png`
- **Front matter matters:** Missing `sidebar_position` can cause doc ordering issues
- **Category descriptions auto-generate index pages**—no need to manually create index.md files

---

## Technology Stack Summary

| Component | Version | Notes |
|-----------|---------|-------|
| Docusaurus | 3.9.2 | Modern, v4-compatible |
| React | 19.0.0 | Minimal usage in this project |
| Node.js | ≥20.0 | Required runtime |
| Prism | 2.3.0 | Syntax highlighting |
| MDX | 3.0.0 | Markdown + JSX support |

