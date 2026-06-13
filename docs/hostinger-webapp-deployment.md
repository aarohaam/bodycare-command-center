# Bodycare Command Centre Deployment Plan

## Current App Structure

The current product is a React/Vite frontend app. It is ready to deploy as a static web app today and can later become a full-stack decision system.

```text
src/
  app/
    BodycareCommandCenterApp.tsx     Main app shell, navigation, state wiring
  domain/
    decision-engine.ts               GenCode scoring, recommendation, confidence, risk
    product-variants.ts              Color/image/size/current-stock grouping
    workflow.ts                      Action Queue, workflow state, decision review evidence
  features/
    command-center/                  Command Centre and GenCode Detail screens
    action-queue/                    Workflow queue screen and controls
    workbook-import/                 Excel upload and import drawer
    image-mapping/                   Manual product image mapping
    rules/                           Decision rule controls
    data-quality/                    Data quality review drawer
  services/
    workbook-parser.ts               Excel parsing and row normalization
    local-storage-store.ts           Browser-local persistence
    csv-export.ts                    Queue export
    pdf-export.ts                    PDF export
  data/
    sample-product-rows.json         Current built-in Boys Sweat Shirts dataset
```

## Current Deployment Mode

The app is currently frontend-only:

- Data source: built-in sample rows or uploaded workbook.
- Persistence: browser local storage.
- Export: CSV and PDF from the browser.
- Hosting: static files from `dist/`.

This is suitable for the v0.2 proof and Director review.

## Hostinger VPS Static Deployment

For `bcc.bodycareapparels.tech`, deploy the contents of `dist/` to the VPS and serve it through Nginx.

High-level steps:

1. Point DNS `A` record for `bcc.bodycareapparels.tech` to the Hostinger VPS public IP.
2. Install Nginx on the VPS.
3. Upload the built `dist/` contents to `/var/www/bodycare-command-centre/current`.
4. Use the Nginx config template in `deploy/hostinger/nginx-bcc.conf.example`.
5. Enable HTTPS with Certbot.

Build command:

```bash
npm run build
```

Deployable folder:

```text
dist/
```

## Full-Stack Upgrade Path

Yes, this can become a full-stack web app on the Hostinger VPS. The scalable architecture should be:

```text
Browser
  -> React frontend
  -> API backend
  -> PostgreSQL database
  -> File storage for workbook/image uploads
  -> Background jobs for imports, scoring, and exports
```

Recommended stack:

- Frontend: current React/Vite app.
- Backend API: Node.js with Fastify, Express, or NestJS.
- Database: PostgreSQL.
- File storage: local VPS volume first, later S3-compatible object storage.
- Auth: role-based users for Director, Brand Manager, Merchandiser, Admin.
- Deployment: Docker Compose on Hostinger VPS.
- Reverse proxy: Nginx.
- SSL: Certbot.

Suggested backend modules:

- `products`: GenCode, SKU, color, size, stock, price, image records.
- `imports`: workbook upload, parse history, validation errors.
- `decisions`: recommendations, manual decisions, decision history.
- `workflow`: owner, due date, status, priority, challenge response.
- `rules`: decision thresholds and preset versions.
- `users`: roles and permissions.
- `exports`: CSV/PDF generation history.

## Recommended Next Milestone

Move from browser-local persistence to server persistence:

1. Keep the current UI.
2. Add login.
3. Save imports, workflow actions, notes, image mappings, and decisions to PostgreSQL.
4. Keep CSV/PDF export.
5. Add audit history for each GenCode decision.

