# Requirements Specification: CSV Table Migration

**Project**: Mesa de Ayuda Hub - IMEI Data Table Migration  
**Date**: 2025-08-07  
**Status**: Ready for Implementation

## Problem Statement

The Mesa de Ayuda Hub currently displays a welcome screen on the root route (/). The user needs to migrate IMEI device data from Google Sheets to display in a comprehensive table interface on the root route, replacing the current welcome screen.

## Solution Overview

Implement a dynamic IMEI data table that fetches data from Google Sheets API, displays it using the existing Untitled UI table components, and provides search, filtering, and data management capabilities for Mesa de Ayuda operations.

## Functional Requirements

### FR1: Data Display
- **FR1.1**: Display IMEI data in a table format on the root route (/)
- **FR1.2**: Show all columns from Google Sheets columns A through N
- **FR1.3**: Use row 1 as column headers, display data starting from row 2
- **FR1.4**: Display column names in lowercase format
- **FR1.5**: Handle empty cells and data validation

### FR2: Data Fetching
- **FR2.1**: Load data dynamically from Google Sheets API using existing authentication
- **FR2.2**: Extend current API endpoint from 'BASE!A:M' to 'BASE!A:N' range
- **FR2.3**: Implement 15-minute automatic data refresh
- **FR2.4**: Provide manual refresh button for immediate updates
- **FR2.5**: Show loading states during data fetching

### FR3: Search and Filtering
- **FR3.1**: Implement search input with local data filtering
- **FR3.2**: Enable search across key fields (IMEI, nombre_soti, distribuidora)
- **FR3.3**: Provide filter buttons for common operations
- **FR3.4**: Maintain filter state during auto-refresh cycles
- **FR3.5**: Display filtered result counts

### FR4: Table Functionality
- **FR4.1**: Enable column sorting (ascending/descending)
- **FR4.2**: Support row selection (single and multiple)
- **FR4.3**: Implement pagination for large datasets
- **FR4.4**: Responsive design for mobile and desktop
- **FR4.5**: Maintain sort state during data refreshes

### FR5: Row Actions
- **FR5.1**: Provide edit functionality for IMEI records
- **FR5.2**: Support ticket assignment and status updates
- **FR5.3**: Implement optimistic updates with local state changes
- **FR5.4**: Sync changes to Google Sheets in background
- **FR5.5**: Handle sync failures with user feedback

## Technical Requirements

### TR1: Component Architecture
- **TR1.1**: Replace `src/app/home-screen.tsx` with IMEI table component
- **TR1.2**: Reuse existing `Table` and `TableCard` components from `src/components/application/table/`
- **TR1.3**: Follow existing component patterns and styling conventions
- **TR1.4**: Use React Aria Components for accessibility compliance

### TR2: API Integration
- **TR2.1**: Extend `src/app/api/base/route.ts` to fetch A:N range
- **TR2.2**: Update `src/lib/sheets.ts` getBaseSheetData() function
- **TR2.3**: Maintain existing error handling and response formatting
- **TR2.4**: Add new API endpoints for data updates if needed

### TR3: Data Management
- **TR3.1**: Create `src/hooks/use-base-data.ts` for data fetching and auto-refresh
- **TR3.2**: Implement local state management for search/filter operations
- **TR3.3**: Use existing `IMEIRecord` interface from `src/lib/types.ts`
- **TR3.4**: Handle data transformation from Google Sheets format

### TR4: User Interface
- **TR4.1**: Implement search bar using existing `Input` component with `SearchLg` icon
- **TR4.2**: Add filter buttons using `ButtonGroup` component pattern
- **TR4.3**: Include manual refresh button in table header
- **TR4.4**: Show data freshness timestamp
- **TR4.5**: Use existing badge and status components for data visualization

## Implementation Hints and Patterns

### File Modifications Required

1. **`src/app/page.tsx`**
   - Replace HomeScreen import with new IMEI table component

2. **`src/app/home-screen.tsx`** → **`src/app/imei-table.tsx`**
   - Transform into IMEI data table component
   - Follow pattern from `table-example.tsx`

3. **`src/hooks/use-base-data.ts`** (NEW)
   ```typescript
   export function useBaseData(autoRefreshMs = 15 * 60 * 1000) {
     // Implement data fetching with auto-refresh timer
     // Return: { data, loading, error, refresh, lastUpdated }
   }
   ```

4. **`src/lib/sheets.ts`**
   - Change 'BASE!A:M' to 'BASE!A:N' in getBaseSheetData()

5. **`src/lib/types.ts`**
   - Verify IMEIRecord interface matches all A-N columns
   - Add search/filter state interfaces if needed

### Component Structure Pattern
```typescript
<TableCard.Root>
  <TableCard.Header 
    title="IMEI Devices" 
    badge={`${totalRecords} devices`}
    contentTrailing={<RefreshButton />} 
  />
  
  <SearchAndFilterBar />
  
  <Table sortDescriptor={sortDescriptor} selectionMode="multiple">
    <Table.Header>
      {/* All A-N columns with sorting */}
    </Table.Header>
    <Table.Body items={filteredData}>
      {/* IMEI record rows with actions */}
    </Table.Body>
  </Table>
  
  <PaginationCardMinimal />
</TableCard.Root>
```

### Auto-refresh Implementation
```typescript
const useBaseData = (refreshInterval = 15 * 60 * 1000) => {
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData();
    }, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);
};
```

## Acceptance Criteria

### AC1: Data Display
- [ ] Root route (/) displays IMEI table instead of welcome screen
- [ ] All columns A through N are visible and properly labeled
- [ ] Data starts from row 2 with row 1 as headers
- [ ] Column names appear in lowercase

### AC2: Data Loading
- [ ] Table loads data from Google Sheets API on page load
- [ ] Data refreshes automatically every 15 minutes
- [ ] Manual refresh button updates data immediately
- [ ] Loading states are shown during data operations

### AC3: Search and Filter
- [ ] Search input filters data across IMEI, nombre_soti, distribuidora fields
- [ ] Filter results update in real-time as user types
- [ ] Search state persists during auto-refresh
- [ ] Clear search functionality works correctly

### AC4: Table Operations
- [ ] Columns can be sorted ascending/descending
- [ ] Rows can be selected individually or in bulk
- [ ] Pagination works for datasets > page size
- [ ] Table is responsive on mobile and desktop

### AC5: Row Actions
- [ ] Edit buttons are available for each row
- [ ] Status updates reflect immediately in UI
- [ ] Changes sync to Google Sheets in background
- [ ] Error handling shows appropriate user feedback

### AC6: Performance
- [ ] Initial page load < 3 seconds
- [ ] Search/filter operations < 500ms response time
- [ ] Auto-refresh doesn't disrupt user interactions
- [ ] Memory usage remains stable during extended use

## Assumptions

### Business Assumptions
- IMEI data structure in Google Sheets remains consistent
- Mesa de Ayuda team has appropriate Google Sheets access permissions
- Current Google Sheets API quota is sufficient for 15-minute refresh cycles
- Row actions will primarily involve status and ticket assignment updates

### Technical Assumptions
- Existing Google Sheets service account credentials are properly configured
- Current React/Next.js version supports required functionality
- Table component library is sufficient for all display requirements
- Network connectivity is stable for API operations

### Data Assumptions
- Row 1 contains consistent column headers
- Data types in each column are predictable and consistent
- Empty cells are acceptable and handled gracefully
- Maximum dataset size is manageable for client-side filtering (<10,000 records)

## Dependencies

### External Dependencies
- Google Sheets API availability and rate limits
- Existing service account permissions
- Network connectivity for real-time operations

### Internal Dependencies
- Existing table component library
- Google Sheets integration library
- TypeScript interfaces and utilities
- Tailwind CSS styling system

## Risk Mitigation

### API Rate Limits
- Implement exponential backoff for failed requests
- Cache data locally to reduce API calls
- Monitor Google Sheets API quota usage

### Data Synchronization
- Implement conflict resolution for simultaneous edits
- Provide rollback mechanism for failed sync operations
- Clear user feedback for sync status

### Performance
- Implement virtual scrolling for large datasets if needed
- Debounce search input to avoid excessive filtering
- Optimize re-renders with React.memo and proper keys

---

**Implementation Ready**: All requirements are clearly defined with existing codebase integration points identified. The project can proceed to development phase.