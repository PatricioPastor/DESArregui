# Context Analysis Findings

## Existing Architecture Analysis

### Google Sheets API Integration ✅
- **Location**: `src/app/api/base/route.ts` and `src/lib/sheets.ts`
- **Authentication**: Service account OAuth2 with environment variables
- **Data Range**: Currently fetches 'BASE!A:M' (matches user's A-N requirement)
- **Functions**: `getBaseSheetData()`, `convertRowToIMEIRecord()`, `getGoogleSheetsAuth()`
- **Pattern**: Well-structured error handling and response formatting

### Table Components Available ✅
- **Location**: `src/components/application/table/table.tsx`
- **Framework**: React Aria Components for accessibility
- **Features**: Sorting, selection, responsive design, pagination
- **Components**: `TableCard.Root`, `TableCard.Header`, `Table`, `Table.Header`, `Table.Body`
- **Search Example**: User provided table example with search input (`SearchLg` icon, `Input` component)

### Current Page Structure
- **Root Route**: `src/app/page.tsx` → `src/app/home-screen.tsx` (Untitled UI welcome)
- **Target**: Replace home-screen with CSV table display
- **Layout**: Global layout already configured

### Data Types & Interfaces ✅
- **Location**: `src/lib/types.ts`
- **Interface**: `IMEIRecord` with all required CSV columns
- **API Response**: `BaseSheetResponse` for structured responses
- **Headers**: Flexible mapping system for row 1 headers, data from row 2

### Implementation Patterns Found
1. **API Endpoints**: `/api/base` already exists and functional
2. **Data Fetching**: No custom hook yet - needs implementation
3. **Search Pattern**: Table example shows `Input` with `SearchLg` icon, `ButtonGroup` for filters
4. **Auto-refresh**: Timer-based refresh pattern needed (15 min requirement)
5. **Manual Refresh**: Button pattern available in table examples

## Files That Need Modification

### Primary Changes
1. **`src/app/page.tsx`** - Replace HomeScreen import with CSV table component
2. **`src/app/home-screen.tsx`** - Transform into IMEI table component OR create new component
3. **`src/hooks/`** - Create `use-base-data.ts` for data fetching with auto-refresh
4. **`src/lib/types.ts`** - May need additional interfaces for filters/search

### Secondary Extensions
- **`src/components/dashboard/`** - Could house IMEI-specific table components
- **`src/utils/`** - Add filtering/search utilities

## Technical Implementation Strategy

### Data Flow
1. Component mounts → Hook calls `/api/base` → Google Sheets API → Returns IMEI records
2. 15-minute timer refreshes data automatically
3. Manual refresh button calls same endpoint
4. Search input filters local data in real-time
5. Table displays all A-N columns with sorting

### Component Architecture
- Reuse existing `Table` and `TableCard` components
- Add search input bar (pattern from user's table example)
- Implement row actions for IMEI management operations
- Use existing pagination component

## Integration Points Identified

### Google Sheets API ✅
- Current implementation supports user's requirements perfectly
- Headers from row 1, data from row 2 (exactly what user specified)
- Handles all A-N columns

### UI Components ✅
- Table structure matches user's table-example reference
- Search input example provided by user
- Responsive design built-in
- Action buttons and pagination available

### Business Logic Gaps
- Need filtering by "distribuidora" (distributor)
- Need search by IMEI/nombre_soti
- Need row actions for ticket assignment and status updates
- Need auto-refresh mechanism

## Security & Performance Considerations
- Google Sheets API rate limits already handled
- Service account credentials properly configured
- Component-level state management for large datasets
- Efficient re-renders with proper React keys

## Ready for Implementation
The codebase has all foundational pieces needed:
- ✅ Google Sheets integration working
- ✅ Table components ready
- ✅ TypeScript interfaces defined
- ✅ API endpoint functional
- ✅ Routing structure in place

Main work involves:
1. Creating data fetching hook with auto-refresh
2. Building search/filter logic
3. Replacing home screen with table component
4. Adding row action handlers