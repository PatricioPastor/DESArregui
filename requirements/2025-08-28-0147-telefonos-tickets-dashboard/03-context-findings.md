# Context Findings - TELEFONOS_TICKETS Dashboard

**Phase 3: Targeted Context Gathering**

Based on the codebase analysis and discovery answers, here are the specific technical findings and patterns that will guide the implementation:

## Existing Architecture Patterns

### 1. API Endpoint Structure
**Location:** `src/app/api/`
- **Pattern:** Next.js App Router API routes
- **Existing endpoints:** `/api/base`, `/api/report`, `/api/stock`
- **Authentication:** Google Sheets Service Account via environment variables
- **Response format:** Standardized with `success`, `data`, `error` fields

**Implementation needed:**
- New endpoint: `/api/telefonos-tickets` following existing patterns
- Add `TelefonosTicketRecord` type and response interface in `src/lib/types.ts`
- Extend `src/lib/sheets.ts` with `getTelefonosTicketsData()` function

### 2. Data Hook Patterns
**Location:** `src/hooks/`
- **Pattern:** Custom hooks using `useState`, `useEffect`, `useCallback`
- **Existing:** `use-base-data.ts`, `use-stock-data.ts`
- **Features:** Auto-refresh (disabled per user request), error handling, loading states

**Implementation needed:**
- New hook: `use-telefonos-tickets-data.ts` with manual refresh only
- Date range filtering parameters
- Advanced filtering by distribuidora, ticket type, keyword search

### 3. Dashboard Component Architecture
**Location:** `src/components/dashboard/`
- **Pattern:** Untitled UI components with React Aria
- **Existing:** `imei-table.tsx`, `stock-table.tsx`, `reports-display.tsx`
- **Features:** Advanced filtering, pagination, search, sorting, optimistic updates

**Key components to replicate/improve:**
- Table structure from `imei-table.tsx` with enhancements
- Metric cards from `reports-display.tsx`
- Modal patterns for detailed views

### 4. PDF Generation Requirements
**Research finding:** React-PDF (`@react-pdf/renderer`) is the ideal choice
- **Components:** Document, Page, View, Text, StyleSheet
- **Features:** Server-side rendering, download capability
- **Styling:** CSS-like styling with Flexbox support

**Implementation needed:**
- Install `@react-pdf/renderer`
- Create PDF template component matching claude.md specification
- Add PDF download endpoint following `/api/report/download` pattern

## Specific Files Requiring Modification

### Core Data Layer
1. **`src/lib/types.ts`**
   ```typescript
   // Add TelefonosTicketRecord interface
   interface TelefonosTicketRecord {
     issue_type: string;
     key: string;
     title: string;
     label: string;
     enterprise: string;
     created: string;
     updated: string;
   }
   ```

2. **`src/lib/sheets.ts`**
   - Add `getTelefonosTicketsSheetData()` function
   - Add `convertRowToTelefonosTicketRecord()` converter
   - Add `getTelefonosTicketRecords()` processor

3. **`src/app/api/telefonos-tickets/route.ts`** (NEW)
   - Follow existing `/api/base/route.ts` pattern
   - Add date range filtering
   - Manual sync only (no auto-refresh)

### UI Components
4. **`src/app/reportes/phones/page.tsx`** (MAIN TARGET)
   - Complete dashboard implementation
   - Date picker integration (existing component at `src/components/application/date-picker/`)
   - Advanced filtering UI
   - Charts/visualizations (need to add chart library)
   - PDF export button

5. **`src/hooks/use-telefonos-tickets-data.ts`** (NEW)
   - Manual refresh only
   - Date range filtering
   - Filter by distribuidora, type, keywords

### PDF Generation
6. **`src/components/reports/telefonos-pdf-template.tsx`** (NEW)
   - React-PDF components
   - Match structure from claude.md context
   - Dynamic data binding

7. **`src/app/api/telefonos-tickets/pdf/route.ts`** (NEW)
   - Generate PDF with analysis
   - Follow `/api/report/download` pattern

## Similar Features Analysis

### IMEI Table Dashboard (`src/components/dashboard/imei-table.tsx`)
**Reusable patterns:**
- Search functionality with debounced input
- Multi-filter system (search + type filters)
- Pagination with 50 items per page
- Sort descriptors with column sorting
- Optimistic updates for record actions
- Loading states and error handling

**Improvements needed:**
- Better chart integration (currently only metric cards)
- Enhanced date filtering UI
- More sophisticated analytics display

### Reports Display (`src/components/dashboard/reports-display.tsx`)
**Reusable patterns:**
- MetricCard component with trend indicators
- Color-coded status indicators
- Responsive grid layout
- Export functionality

**Enhancements for phones dashboard:**
- Add chart visualizations (bar, donut, line charts)
- Timeline-based metrics
- Distribuidora breakdown charts

## Technical Integration Points

### Date Filtering
- **Existing component:** `src/components/application/date-picker/date-range-picker.tsx`
- **Integration:** Use for filtering by `created` column (Column F)

### Charts/Visualizations
- **Need to add:** Chart library (recommend Recharts for React integration)
- **Package.json addition:** `"recharts": "^2.x.x"`
- **Charts needed:** Bar (distribuidoras), Donut (breakdown), Line (trends)

### Untitled UI Components to Use
- **Tables:** `src/components/application/table/table.tsx`
- **Date Pickers:** `src/components/application/date-picker/`
- **Buttons/Forms:** `src/components/base/` directory
- **Navigation:** Existing header/sidebar patterns

## Performance Considerations

### Data Loading Strategy
- Manual refresh only (per user requirement)
- Client-side filtering for better UX
- Pagination for large datasets
- Debounced search to reduce API calls

### PDF Generation Strategy
- Server-side PDF generation for better performance
- Async generation with download link
- Include processed analytics in PDF data

## Dependencies to Add
```json
{
  "@react-pdf/renderer": "^3.x.x",
  "recharts": "^2.x.x",
  "date-fns": "^2.x.x" // for date manipulation
}
```

## Architectural Consistency
- Follow existing file structure patterns
- Use established hook patterns
- Maintain Untitled UI design system
- Keep consistent error handling
- Follow existing API response formats
- Use same authentication patterns (Google Sheets Service Account)