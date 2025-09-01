# Expert Detail Questions - TELEFONOS_TICKETS Dashboard

**Phase 4: Expert Requirements Questions**

Based on deep codebase analysis, these questions clarify expected system behavior from a senior developer perspective who understands the technical implementation details:

## Q6: Should we extend the existing Google Sheets API pattern in `src/lib/sheets.ts` to handle TELEFONOS_TICKETS data with the same authentication and error handling?
**Default if unknown:** Yes (maintains architectural consistency with existing `getBaseSheetData()` and `getStockSheetData()` functions)

**Why this default:** The current codebase has a well-established pattern in `sheets.ts` with standardized authentication via Service Account, consistent error handling, and data conversion functions. Adding `getTelefonosTicketsSheetData()` would follow the exact same pattern used for BASE and STOCK sheets.

## Q7: Will the dashboard require real-time analytics calculations (like projections and stock analysis from claude.md) or should it display raw ticket data with basic filtering?
**Default if unknown:** Yes (based on the comprehensive analysis requirements described in claude.md including projections, stock integration, and budget calculations)

**Why this default:** The claude.md file describes complex analytics including demand projections, stock netting, budget calculations, and distribuidora analysis. This suggests users need processed analytics, not just raw table data.

## Q8: Should we use the existing table patterns from `src/components/dashboard/imei-table.tsx` with pagination and optimistic updates, or create a simpler read-only table?
**Default if unknown:** Yes (extend existing table patterns but make read-only since these are historical tickets)

**Why this default:** The existing `imei-table.tsx` has sophisticated filtering, search, pagination (50 items), and sort functionality that users are already familiar with. However, ticket data is typically historical and read-only, so we'd remove the edit/update functionality.

## Q9: Based on the existing `/api/report/download` pattern that generates Excel files, should the PDF export follow the same async download pattern with file generation?
**Default if unknown:** Yes (maintains consistency with existing download functionality and handles large reports efficiently)

**Why this default:** The current `/api/report/route.ts` generates Excel files as downloadable responses. PDF generation with React-PDF should follow the same pattern for consistency and to handle potentially large reports with multiple pages and charts.

## Q10: Should we add Recharts as a dependency for visualizations, following the pattern of other added libraries like `@untitledui/icons` and `googleapis`?
**Default if unknown:** Yes (based on chart requirements in claude.md and existing pattern of adding specialized libraries to package.json)

**Why this default:** The claude.md specification mentions multiple chart types (barras, donut, líneas, pie) for the dashboard. The codebase already includes specialized libraries for icons and Google Sheets integration, indicating the project is comfortable adding focused dependencies for specific functionality.