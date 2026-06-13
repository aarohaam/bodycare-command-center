# Project Audit And Feature Backlog

Audit date: 2026-06-13

Live URL checked: https://aarohaam.github.io/bodycare-command-center-boys-v01-public/

## What Exists

- Workbook upload with smart merge into the current browser dataset.
- GenCode grouping with stock, sales, trend, image status, and decision scoring.
- Manual decision overrides and notes stored in the browser.
- Image URL support, embedded image detection, manual image upload, and ZIP image mapping.
- Decision rules drawer with editable thresholds.
- Data quality drawer with high-level issue counts.
- PDF exports for dashboard, filtered view, and decision summary.

## Issues To Challenge

- Public build starts empty, which is correct for privacy, but the first-run state does not clearly guide a new user toward the exact workbook format.
- Data persistence is browser-local only. A user can lose decisions/notes when switching browser, device, or clearing storage.
- Decision labels should stay cycle-neutral and use `Last 30 Days` / `Last 90 Days` movement rather than fixed date-window wording.
- Data quality only shows counts. It does not let the user open the affected rows or export an issue list.
- Workbook parsing currently prioritizes the first sheet. Multi-sheet workbooks need a sheet picker or explicit handling.
- PDF exports are useful for summaries, but there is no filtered CSV/XLSX export for operational follow-up.
- Image mapping is best-effort. Broken external image URLs are handled visually, but not surfaced as a downloadable issue list.
- Manual decisions have timestamps, but there is no visible decision history or owner/due-date workflow.
- There are no automated tests for parser aliases, merge behavior, or decision scoring thresholds.
- Generated folders like `dist/` and `work/` exist locally as ignored artifacts. They are useful for deployment history but should stay outside source review.

## Highest-Value Features

1. First-run import guide: show required columns, accepted aliases, and a sample workbook download.
2. Backup/restore: export and import browser-saved rows, decisions, image mappings, notes, and rules as one JSON file.
3. Action queue: a focused table for Liquidate, Discontinue, Needs Review, and missing-image GenCodes.
4. Data quality drilldown: click each quality count to see affected GenCodes/SKUs and export the issue list.
5. Filtered CSV/XLSX export: export the current filtered product list for merchandising follow-up.
6. Workbook cycle settings: make sales periods and current year configurable instead of hard-coded to 2026.
7. Multi-sheet import picker: let the user choose the sheet and preview detected columns before merge.
8. Decision history: show who/when/why for manual overrides and note edits.
9. Image health report: list missing, broken, partial, and manually mapped image records.
10. Rule presets: save named threshold presets for seasonal review, clearance review, and new-product review.

## Suggested Fix Order

1. Add first-run guidance and backup/restore so the live public tool is safer to use.
2. Add data quality drilldown and filtered CSV/XLSX export for daily operations.
3. Replace hard-coded period/year assumptions with configurable workbook cycle metadata.
4. Add parser/merge/decision tests before expanding the decision engine.
5. Add multi-sheet import and decision history once the data foundation is stable.
