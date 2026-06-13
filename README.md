# Bodycare Boys Command Centre

Decision dashboard for Bodycare boys product data. The app groups workbook rows by GenCode, scores each product with stock/sales/image signals, supports manual decisions and notes, and exports PDF summaries.

## Project Map

- `src/app/` - top-level app composition and screen/drawer state.
- `src/features/command-center/` - dashboard, GenCode cards, and GenCode detail view.
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

https://aarohaam.github.io/bodycare-command-center-boys-v01-public/

The public build intentionally starts with no sample product rows. Users should upload a workbook to populate the command center.
