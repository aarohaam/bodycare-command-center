# Bodycare Product Command Centre

Decision workflow system for Bodycare product decisions. The app groups workbook rows by GenCode, shows color and size-wise stock evidence, scores each product with stock/sales/image signals, supports workflow ownership and challenge responses, and exports follow-up CSV/PDF summaries.

## Project Map

- `src/app/` - top-level app composition and screen/drawer state.
- `src/features/command-center/` - Command Centre, GenCode cards, and GenCode detail view.
- `src/features/action-queue/` - action queue, owner/due-date/status tracking, and challenge follow-up controls.
- `src/features/workbook-import/` - Excel workbook parsing UI and merge flow.
- `src/features/image-mapping/` - manual image/ZIP mapping workflow.
- `src/features/rules/` - decision rule settings drawer.
- `src/features/data-quality/` - current workbook quality checklist.
- `src/domain/` - merchandising decision engine and quality summary logic.
- `src/services/` - workbook parsing, local persistence, and PDF export.
- `src/ui/` - shared interface building blocks.
- `src/utils/` - small formatting helpers.
- `src/data/` - local sample rows and public empty-seed rows.
- `docs/` - project audit, known issues, and feature backlog.
- `scripts/` - static hosting/package helpers.

## Commands

- `npm run dev` - start local development server.
- `npm run typecheck` - run TypeScript checks.
- `npm run build` - build the static app plus static host entry.
- `npm run build:pages` - build the GitHub Pages public version.
- `npm run package:sites` - build and package a static site archive.

## Live Site

The public tool is hosted at:

https://aarohaam.github.io/bodycare-command-center/

The public build is usable in the browser and can be populated from the current minimal workbook template. The interface uses "Command Centre" wording; the GitHub Pages URL currently uses `bodycare-command-center` because that is the accessible public repository name.

## Current Workbook Template

Use these headers for the current source workbook:

```text
Image Link, Item SKU Code, SUPER_GEN, Brand, Category, Color, Size, Nature, Season, FY23-24, FY24-25, FY25-26, Last 30 Days, Last 90 Days, Total Current Stock, MRP, Amazon Selling Price
```

For future build details, see `docs/app-structure-and-future-build-guide.md`.
