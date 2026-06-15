# Bodycare Product Command Centre Structure and Future Build Guide

## Purpose

Bodycare Product Command Centre is a decision workflow for GenCode and SKU review. It is not only a reporting dashboard. The current version proves that Bodycare can turn product review into a structured decision system: import the product workbook, group rows by GenCode, show color and size-wise evidence, challenge weak assumptions, assign follow-up ownership, and export an action queue.

The first module is Boys Sweat Shirts. The same structure can later support other categories and broader Bodycare decision modules.

## Current Live Setup

- Public app: `https://aarohaam.github.io/bodycare-command-center/`
- Public repository currently accessible: `aarohaam/bodycare-command-center`
- UI naming: `Bodycare Product Command Centre`
- Current hosting mode: static React/Vite build served from GitHub Pages
- Future production domain target: `bcc.bodycareapparels.tech` on Hostinger VPS

The user-facing product uses "Centre" wording. The live GitHub Pages URL currently uses `bodycare-command-center` because that is the accessible GitHub repository. To move the URL to `bodycare-command-centre`, rename or create that repository in GitHub and publish the same `gh-pages` build there.

## App Architecture

The app is currently frontend-only:

- React renders the Command Centre, Action Queue, and GenCode Detail screens.
- Vite builds the static website.
- The browser imports Excel workbooks and image mappings.
- Decision scoring runs in the browser.
- Manual decisions, notes, workflow fields, rules, imported rows, and image mappings are stored in browser local storage.
- CSV and PDF exports are generated in the browser.

This is suitable for v0.2 proof-of-value and Director review. It also keeps the core decision logic portable for a future full-stack version.

## Main Directory Map

```text
src/
  app/
    BodycareCommandCenterApp.tsx
  domain/
    decision-engine.ts
    product-variants.ts
    workflow.ts
  features/
    command-center/
    action-queue/
    workbook-import/
    image-mapping/
    rules/
    data-quality/
  services/
    workbook-parser.ts
    local-storage-store.ts
    csv-export.ts
    pdf-export.ts
  ui/
  utils/
  data/
docs/
deploy/
scripts/
```

## Key Files

`src/app/BodycareCommandCenterApp.tsx`

Main app shell. It owns screen navigation, drawer state, loaded workbook rows, manual decisions, notes, workflow actions, rules, and image mappings. It wires the domain layer to the visible screens.

`src/types.ts`

Shared TypeScript contracts for product rows, GenCode products, decisions, confidence, risk, workflow state, image mappings, parse summaries, and data quality summaries.

`src/domain/decision-engine.ts`

Core decision logic. It groups workbook rows by GenCode, totals sales and stock, evaluates demand/risk/confidence, creates recommendations, and calculates data quality summary counts.

`src/domain/product-variants.ts`

Variant presentation logic. It groups product rows by image/color, selects representative SKUs, sorts variants by stock, and builds size-wise stock summaries for the GenCode Detail view.

`src/domain/workflow.ts`

Action Queue and Challenge Mode logic. It decides which GenCodes enter the queue, creates default workflow fields, derives priority, and produces evidence, weak assumptions, and missing-evidence prompts.

`src/services/workbook-parser.ts`

Workbook import logic. It detects headers, maps the minimal workbook template into `ProductRow` records, parses numbers and image links, extracts embedded workbook images on a best-effort basis, and merges imported rows.

`src/services/local-storage-store.ts`

Browser persistence. It stores rows, manual decisions, notes, rules, image mappings, and workflow actions under the v0.1-compatible `bodycare-command-center-v01` key prefix.

`src/services/csv-export.ts`

Exports the current Action Queue view with evidence and workflow fields for follow-up outside the app.

`src/services/pdf-export.ts`

Generates Director-ready PDF summaries from the visible product and decision evidence.

`src/features/command-center/CommandCenterPage.tsx`

Main product review screen. It shows KPIs, decision filters, product cards, and entry points for import, rules, data quality, detail review, and PDF export.

`src/features/command-center/GenCodeCard.tsx`

Compact GenCode summary card. It shows image evidence, recommendation, stock, sales, confidence, trend, and action buttons.

`src/features/command-center/GenCodeDetailPage.tsx`

Deep GenCode review screen. It shows the highest-stock representative image first, color/SKU/size-wise stock evidence, performance signals, Challenge Mode, workflow tracking, manual decision override, notes, and GenCode PDF export.

`src/features/action-queue/ActionQueuePage.tsx`

Daily action queue screen. It lists GenCodes that need liquidation, discontinuation, review, image/data correction, or risk follow-up. It supports queue filters and CSV export.

`src/features/action-queue/WorkflowActionControls.tsx`

Reusable workflow controls for owner, due date, status, priority, next action, and challenge response.

`src/features/workbook-import/WorkbookUploadDrawer.tsx`

Workbook upload interface and import summary.

`src/features/image-mapping/ProductImageMappingDrawer.tsx`

Manual image mapping interface for GenCodes or SKUs when workbook image links are incomplete.

`src/features/rules/DecisionRulesDrawer.tsx`

Editable scoring thresholds. This lets Bodycare tune the decision engine without changing code.

`src/features/data-quality/DataQualityDrawer.tsx`

Data quality checklist for missing GenCode, missing SKU, missing images, duplicate rows, and low-confidence products.

## Current Workbook Template

The app is powered by a minimal operational template. These headers are intentionally limited to fields a Brand Manager or merchandiser can realistically maintain:

```text
Image Link
Item SKU Code
SUPER_GEN
Brand
Category
Color
Size
Nature
Season
FY23-24
FY24-25
FY25-26
Last 30 Days
Last 90 Days
Total Current Stock
MRP
Amazon Selling Price
```

The parser also accepts common naming variations such as `SKU`, `Gen Code`, `FY 2024-25`, `Stock`, `Total Inventory`, and `Image URL`.

## Data Flow

```text
Workbook or sample rows
  -> workbook-parser normalizes each SKU row
  -> image mappings are applied
  -> decision-engine groups rows by GenCode
  -> decision-engine scores each GenCode
  -> product-variants builds visual color/size stock groups
  -> workflow builds Action Queue and Challenge Mode evidence
  -> React screens display the decision workflow
  -> local-storage-store saves user edits in the browser
  -> csv-export and pdf-export create follow-up documents
```

## Core Data Model

`ProductRow`

One workbook row, usually one SKU/size/color variant. It contains GenCode, SKU, brand, category, color, size, nature, season, current stock, MRP, Amazon selling price, sales periods, image URLs, and import metadata.

`GenCodeProduct`

Grouped product decision object. It combines all SKU rows under one GenCode and stores total stock, current stock, historical sales, recent sales, image status, recommendation, manual decision, notes, and effective decision.

`DecisionResult`

Decision-engine output. It contains the recommended decision, confidence, reason, suggested action, risk level, historical demand score, recent demand score, stock risk score, trend, sell-through proxy, stock cover, lifecycle signal, score, and analytics summary.

`WorkflowActionState`

Operational follow-up state. It stores owner, due date, status, priority, next action, challenge response, and last update timestamp.

## Decision Logic Summary

The current engine does not use marketplace discount or margin data because those values vary by channel and are difficult to keep accurate. Instead, it focuses on fields that can be maintained consistently:

- Historical demand: FY23-24, FY24-25, FY25-26
- Recent movement: Last 30 Days and Last 90 Days
- Current stock exposure: Total Current Stock
- Stock cover proxy: stock divided by recent or historical monthly demand
- Sell-through proxy: recent movement divided by stock plus recent movement
- Trend: improving, declining, flat, or limited trend data
- Lifecycle context: Nature
- Evidence quality: image status, missing SKU/GenCode, missing sales evidence

The output decisions are:

- Continue
- Refresh
- Micro-test
- Liquidate
- Discontinue
- Needs Review

Manual decisions can override the recommendation. Challenge Mode then highlights where the system might be wrong and asks the user to record the merchant/director response.

## Screens

Command Centre

Primary product review screen. It supports fast filtering by decision, confidence, risk, image status, trend, brand, category, and sorting. It is intended to help users quickly identify which GenCodes deserve action.

Action Queue

Operational follow-up screen. It converts recommendations into work items with owner, due date, status, priority, next action, and challenge response. This is the daily execution layer.

GenCode Detail

Decision evidence screen. It shows the strongest visual product evidence first, then variant color/SKU/size stock, performance signals, Challenge Mode, and manual decision workflow.

Drawers

Upload, image mapping, rule settings, and data quality are drawers so they support the main workflow without becoming separate dashboards.

## Local Storage Keys

The app currently uses the `bodycare-command-center-v01` prefix for browser storage:

- `rows`
- `decisions`
- `notes`
- `rules`
- `images`
- `workflow-actions`

Keep this prefix stable unless a migration is added. Changing it without migration will make existing browser-saved data appear missing.

## Deployment Structure

GitHub Pages

- Source branch: `main`
- Public build branch: `gh-pages`
- Public URL: `https://aarohaam.github.io/bodycare-command-center/`
- The public build uses relative asset paths so it works under the GitHub Pages repository path.

Hostinger VPS

The current app can be deployed as a static site by serving the `dist/` folder through Nginx. See `docs/hostinger-webapp-deployment.md` and `deploy/hostinger/nginx-bcc.conf.example`.

Full-stack Hostinger deployment is also possible. The recommended path is Docker Compose on the VPS with:

- React/Vite frontend
- Node.js API
- PostgreSQL database
- VPS file storage first, object storage later if needed
- Nginx reverse proxy
- Certbot SSL
- Role-based login for Director, Brand Manager, Merchandiser, and Admin

## Recommended Full-Stack Modules

`products`

Stores GenCodes, SKUs, colors, sizes, stock, prices, seasons, nature, and image records.

`imports`

Stores workbook uploads, parse summaries, row-level validation issues, import history, and rollback metadata.

`decisions`

Stores recommendation snapshots, manual decisions, reasons, Director notes, and decision history.

`workflow`

Stores owner, due date, status, priority, next action, challenge response, and follow-up history.

`rules`

Stores decision thresholds, rule versions, category-level presets, and effective dates.

`users`

Stores login users, roles, and permissions.

`exports`

Stores generated queue CSV and PDF export history.

## Future Enhancement Rules

Keep scoring logic in `src/domain/decision-engine.ts`. UI screens should display and collect evidence; they should not secretly change recommendation rules.

Keep variant grouping in `src/domain/product-variants.ts`. Color image and size stock presentation should remain reusable across cards, detail pages, exports, and future APIs.

Keep workflow logic in `src/domain/workflow.ts`. Action Queue membership and Challenge Mode evidence should be testable without rendering React.

Keep import parsing in `src/services/workbook-parser.ts`. New headers can be added through aliases without forcing users into a large template.

Keep user-facing language professional. Avoid planning, dummy, backend, or technical wording in the visible product interface.

Prefer small, reliable workbook requirements. Add new columns only when they are consistently available and materially improve decisions.

## Suggested Roadmap

v0.3 Data Trust Foundation

- Import guide inside the app
- Row-level data quality drilldown
- Backup and restore of browser-local work
- Clear missing-image and missing-SKU review flows

v0.4 Decision Learning

- Decision history per GenCode
- Rule version snapshots
- Review-cycle learning from previous manual decisions
- Better category-specific thresholds

v0.5 Full-Stack Command Centre

- Login and roles
- Server-side storage
- Import history
- Audit trail
- Multi-category modules
- Hosted app at `bcc.bodycareapparels.tech`

## Build Commands

```bash
npm run dev
npm run typecheck
npm run build
npm run build:pages
npm run package:sites
```

Use `npm run build:pages` for GitHub Pages. Use `npm run build` for a Hostinger static deployment package.
