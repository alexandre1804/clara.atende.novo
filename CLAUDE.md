# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Clara Atende** is a marketing and lead-generation static site for a WhatsApp AI customer service agent platform, built by **Lorvix**. The site collects business leads, captures onboarding briefings, and presents the product offering. There is no build step — every file is a self-contained HTML page deployed as-is.

## Running Locally

Serve the root directory with any static file server:

```bash
python3 -m http.server 8080
# or
npx serve .
```

There are no dependencies to install, no compilation, and no environment files.

## Page Inventory

| File | Purpose |
|---|---|
| `index.html` | Main product landing page with lead capture form |
| `lorvix.html` | Company (Lorvix) institutional landing page |
| `briefing-agente.html` | Multi-step onboarding form for configuring a client's AI agent |
| `briefing-contrato.html` | Contract/agreement briefing form |
| `conteudo-atualizado.html` | Content generation product sub-page |

## Architecture

Each HTML file is fully self-contained: CSS lives in `<style>` blocks, JavaScript in `<script>` blocks, with no external local assets. Pages share no common base template or shared JS/CSS files — changes to a shared pattern (e.g., header, color scheme) must be applied to each file individually.

### External Integrations

**Supabase** (PostgreSQL-backed REST API) stores submitted leads:
- Endpoint: `https://ioaweihjmpmvuuezcope.supabase.co/rest/v1/leads`
- The `leads` table accepts fields: `nome`, `whatsapp`, `negocio`, and form-specific fields (e.g., `servicos`, `segmento`, and the full briefing payload from `briefing-agente.html`)
- The Supabase anon key and URL are hardcoded inline in each page's `<script>` block — this is intentional for a public-facing static site using Supabase Row Level Security

**EmailJS** (v4, loaded from CDN) sends email notifications on form submission:
- Initialized with public key `0tab_50eUTc4Hgu8g` in the briefing forms
- Service/template IDs are referenced inline in the submit handler

### Form Pattern

Multi-step forms (especially `briefing-agente.html`) use a step-based pattern:
- Steps are `<div class="form-step">` elements, shown/hidden via JS
- A progress bar updates on each step transition
- Final submission fires both a Supabase `fetch` POST and an EmailJS send, then renders a success state

### Styling Conventions

- CSS custom properties (variables) defined in `:root` drive the color system
- Layout uses CSS Grid and Flexbox throughout
- Gradient backgrounds and rounded cards are the dominant visual motifs
- Google Fonts: **Outfit** and **DM Sans** loaded via `<link>` in each page's `<head>`

## Key Constraints

- **No shared files**: Refactoring a pattern shared across pages requires editing each HTML file separately.
- **No framework, no bundler**: Keep changes to vanilla HTML/CSS/JS only unless the scope of work explicitly introduces a build system.
- **WhatsApp CTA number** `5527988612054` appears across multiple pages — update all occurrences if it changes.
