# Requirements Specification - TELEFONOS_TICKETS Dashboard

**Generated:** 2025-08-28 01:47  
**Status:** Complete  
**Target Implementation:** `src/app/reportes/phones/page.tsx`

## Problem Statement

The user needs an interactive analytics dashboard for TELEFONOS_TICKETS data from Google Sheets that provides comprehensive demand analysis, stock projections, and generates two types of PDF reports based on filtered date ranges. The solution must integrate with the existing Mesa de Ayuda Hub architecture while providing enhanced functionality beyond the current IMEI table dashboard.

## Solution Overview

Create a comprehensive analytics dashboard that:
- Processes TELEFONOS_TICKETS data with advanced filtering (date range, distribuidora, ticket type, keyword search)
- Performs demand projections and stock analysis calculations
- Provides interactive visualizations (bar, donut, line charts)
- Generates two PDF reports: Demand Analysis and Stock Shortage Analysis
- Uses manual data synchronization (no auto-refresh)
- Follows Untitled UI design patterns with improvements

## Functional Requirements

### FR1: Data Integration
- **FR1.1:** Create separate data handling module for TELEFONOS_TICKETS (new file, not extending existing sheets.ts)
- **FR1.2:** Handle Google Sheets data with columns A-G (issue_type, key, title, label, enterprise, created, updated)
- **FR1.3:** Extract type, quantity, and region from columns C, D, E (title, label, enterprise)
- **FR1.4:** Use column F (created) as primary date filtering field
- **FR1.5:** Manual data refresh only (no automatic updates)

### FR2: Advanced Filtering & Search
- **FR2.1:** Date range picker for filtering by created date
- **FR2.2:** Distribuidora filter (EDEN, EDELAP, EDEA, EDESA, EDES, DESA)
- **FR2.3:** Ticket type filtering based on extracted data
- **FR2.4:** Keyword search functionality across all fields
- **FR2.5:** Combination filtering (multiple filters simultaneously)

### FR3: Analytics & Projections
- **FR3.1:** Demand projections with full added value calculations
- **FR3.2:** Stock analysis integration
- **FR3.3:** Budget calculations and recommendations
- **FR3.4:** Distribuidora breakdown analysis
- **FR3.5:** Time-based trend analysis
- **FR3.6:** Comparative analysis (current vs previous periods)

### FR4: Data Visualization
- **FR4.1:** Bar charts for distribuidora comparisons
- **FR4.2:** Donut charts for breakdown analysis
- **FR4.3:** Line charts for trend analysis over time
- **FR4.4:** Metric cards with trend indicators
- **FR4.5:** Interactive charts with drill-down capabilities

### FR5: Enhanced Table Display
- **FR5.1:** Extend existing imei-table.tsx patterns with improvements
- **FR5.2:** Advanced pagination (50+ items per page)
- **FR5.3:** Multi-column sorting
- **FR5.4:** Enhanced search with debouncing
- **FR5.5:** Export table data functionality

### FR6: PDF Report Generation
- **FR6.1:** Generate "Demand Analysis Report" based on filtered date range
- **FR6.2:** Generate "Stock Shortage Analysis Report" based on filtered date range
- **FR6.3:** Include all analytics, projections, and visualizations in PDF
- **FR6.4:** Server-side PDF generation with React-PDF
- **FR6.5:** Download capability with proper file naming

## Technical Requirements

### TR1: Architecture & File Structure
```
src/
├── lib/
│   ├── types.ts (add TelefonosTicketRecord interface)
│   └── telefonos-sheets.ts (NEW - dedicated data handling)
├── hooks/
│   └── use-telefonos-tickets-data.ts (NEW - manual refresh hook)
├── components/
│   ├── dashboard/
│   │   └── telefonos-table.tsx (NEW - enhanced table)
│   └── reports/
│       ├── telefonos-pdf-demand.tsx (NEW - demand PDF template)
│       └── telefonos-pdf-stock.tsx (NEW - stock PDF template)
├── app/
│   ├── api/
│   │   └── telefonos-tickets/
│   │       ├── route.ts (NEW - data API)
│   │       ├── pdf-demand/
│   │       │   └── route.ts (NEW - demand PDF generation)
│   │       └── pdf-stock/
│   │           └── route.ts (NEW - stock PDF generation)
│   └── reportes/phones/
│       └── page.tsx (MAIN TARGET - complete dashboard)
```

### TR2: Dependencies
```json
{
  "@react-pdf/renderer": "^3.x.x",
  "recharts": "^2.x.x",
  "date-fns": "^2.x.x"
}
```

### TR3: Data Types
```typescript
interface TelefonosTicketRecord {
  issue_type: string;
  key: string;
  title: string;
  label: string;
  enterprise: string;
  created: string;
  updated: string;
  // Derived fields
  type?: string;
  quantity?: number;
  region?: string;
}

interface TelefonosAnalytics {
  demandProjection: DemandProjection;
  stockAnalysis: StockAnalysis;
  budgetCalculations: BudgetCalculations;
  distribuidoraBreakdown: DistribuidoraBreakdown;
  trendAnalysis: TrendAnalysis;
}
```

### TR4: API Specifications
- **Endpoint:** `GET /api/telefonos-tickets`
- **Parameters:** `startDate`, `endDate`, `distribuidora`, `ticketType`, `search`
- **Response:** Processed analytics with raw data
- **Authentication:** Google Sheets Service Account (existing pattern)
- **Error Handling:** Consistent with existing API patterns

### TR5: Chart Integration
- **Library:** Recharts
- **Components:** BarChart, PieChart, LineChart, ComposedChart
- **Styling:** Consistent with Untitled UI theme
- **Responsive:** Adapt to different screen sizes
- **Interactive:** Tooltips, legends, drill-down capabilities

## Implementation Hints & Patterns

### IH1: Follow Existing Patterns
- **Authentication:** Use existing Google Sheets Service Account setup
- **Error Handling:** Follow patterns from `src/hooks/use-base-data.ts`
- **Component Structure:** Based on `src/components/dashboard/imei-table.tsx`
- **Styling:** Maintain Untitled UI consistency with improvements

### IH2: Data Processing Pipeline
1. Fetch raw TELEFONOS_TICKETS data from Google Sheets
2. Apply date range and filter criteria
3. Extract type/quantity/region from title/label/enterprise columns
4. Perform analytics calculations (projections, stock analysis)
5. Generate visualization data
6. Cache processed results for performance

### IH3: Chart Implementation
- Use Recharts with custom themes matching Untitled UI
- Implement responsive design patterns
- Add interactive features (click to filter, hover details)
- Follow color schemes from existing dashboard components

### IH4: PDF Generation Strategy
- Server-side generation for better performance
- Separate templates for demand vs stock shortage reports
- Include filtered data range in report headers
- Embed charts as SVG/images in PDF
- Proper styling with React-PDF StyleSheet

## Acceptance Criteria

### AC1: Dashboard Functionality
- [ ] Dashboard loads TELEFONOS_TICKETS data from Google Sheets
- [ ] Date range filtering works correctly with column F (created)
- [ ] All filter types work independently and in combination
- [ ] Analytics calculations provide accurate projections
- [ ] Charts display data correctly and are interactive
- [ ] Table shows enhanced functionality beyond existing IMEI table
- [ ] Manual refresh button updates all data and analytics

### AC2: PDF Generation
- [ ] "Demand Analysis Report" generates with filtered data
- [ ] "Stock Shortage Analysis Report" generates with filtered data
- [ ] Both PDFs include charts, tables, and calculated analytics
- [ ] PDF downloads work properly with correct filenames
- [ ] Reports reflect the exact date range and filters applied

### AC3: Performance & UX
- [ ] Dashboard responds within 2 seconds for typical data sets
- [ ] Charts are responsive on different screen sizes
- [ ] Table pagination handles large datasets efficiently
- [ ] Search functionality is debounced and responsive
- [ ] Visual design improves upon existing dashboard patterns

### AC4: Integration
- [ ] Follows existing Mesa de Ayuda Hub navigation patterns
- [ ] Uses consistent Untitled UI styling with improvements
- [ ] Integrates with existing authentication system
- [ ] Error handling matches existing patterns
- [ ] No conflicts with existing dashboard functionality

## Assumptions

Based on unanswered implementation details, these assumptions are made:

1. **Data Volume:** TELEFONOS_TICKETS sheet contains manageable data volume (< 10,000 records)
2. **Sheet Structure:** TELEFONOS_TICKETS follows same structure as other sheets in the workbook
3. **Analytics Complexity:** Calculations similar to those described in claude.md context
4. **User Permissions:** Same access control as existing dashboard components
5. **Browser Support:** Modern browsers with ES6+ support
6. **Chart Interactivity:** Standard chart interactions (hover, click, zoom)
7. **PDF Size:** Generated PDFs will be reasonable size (< 10MB)
8. **Date Formats:** Standard date formatting in Google Sheets
9. **Language:** Interface in Spanish, following existing patterns
10. **Deployment:** Same deployment pipeline as existing Next.js application

## Success Metrics

- **Functionality:** All acceptance criteria met
- **Performance:** < 2 second load times for dashboard
- **User Experience:** Improved UX compared to existing IMEI table
- **Code Quality:** Maintains existing architecture patterns
- **Reliability:** Error handling for all failure scenarios