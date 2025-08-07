# Context Findings - Mesa de Ayuda Hub

**Date:** 2025-08-05 13:25  
**Phase:** Context Analysis Complete

## Existing Codebase Analysis

### Available Components & Infrastructure

**✅ Table Component (`src/components/application/table/table.tsx`)**
- Built with React Aria Components for accessibility
- Includes row actions dropdown, sorting, selection
- Perfect foundation for IMEI data display
- TypeScript-ready with proper prop types

**✅ Navigation System (`src/components/application/app-navigation/config.ts`)**
- Configurable navigation with icons, badges, nested items
- Ready for multi-section dashboard (Base, Reports, Settings)

**✅ Theme & Layout Foundation**
- `src/app/layout.tsx` - Next.js 15 App Router setup
- `src/providers/theme.tsx` - Light/dark theme support
- `src/utils/cx.ts` - Extended Tailwind merge utility

**✅ Custom Hooks**
- `use-clipboard.ts` - Copy functionality (useful for IMEI copying)
- `use-breakpoint.ts` - Responsive breakpoint detection (mobile support)

### Missing Components (Need Creation)
- **API Routes**: No `/api` folder exists yet
- **Google Sheets Integration**: No googleapis integration
- **Authentication System**: No auth middleware/providers
- **Dashboard Components**: No IMEI-specific components
- **Role-Based Access Control**: No permission system

## Technical Implementation Patterns

### Google Sheets API Integration (2025 Best Practices)

**Service Account Authentication** (Recommended)
```typescript
// Pattern for sheets.ts
import { google } from "googleapis";

export async function getGoogleSheetsData(range: string) {
  const auth = await google.auth.getClient({
    credentials: {
      type: "service_account",
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  
  const sheets = google.sheets({ version: "v4", auth });
  return sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range,
  });
}
```

**Environment Variables Required:**
- `GOOGLE_CLIENT_EMAIL`
- `GOOGLE_PRIVATE_KEY` 
- `GOOGLE_SHEET_ID`

### API Routes Structure (Next.js 15 App Router)

**Create Directory Structure:**
```
src/app/api/
├── base/route.ts          # GET: Pull all BASE data
├── inactivos/route.ts     # GET: Filter inactive devices
└── update/route.ts        # POST: Webhook for real-time updates
```

### Role-Based Authentication (Auth.js v5 + Middleware)

**Middleware Pattern (`middleware.ts` at root):**
```typescript
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const role = req.nextauth.token?.role as string;
    
    // Different access levels for different teams
    if (req.nextUrl.pathname.startsWith("/admin") && role !== "admin") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);
```

## IMEI Data Structure Analysis

Based on context.md, each IMEI record contains:
```typescript
interface IMEIRecord {
  Nombre_SOTI: string;
  ID_SOTI: string;
  Distribuidora: "EDEA" | "EDEN" | string;
  SSID: string;
  Flag: "Usando" | "Inactivo" | string;
  Hora_Relativa: string;
  Modelo: string;
  Numero_Telefono: string;
  Plan_Abono: string;
  Status: string;
  Ticket: string;
  Observaciones: string;
}
```

## Integration Points Identified

### Required API Endpoints
1. **`/api/base`** - Main data pull from Google Sheets
2. **`/api/inactivos`** - Filter devices inactive >7 days
3. **`/api/update`** - Webhook for Google Apps Script triggers

### Component Architecture Needed
```
src/components/dashboard/
├── imei-table/
│   ├── IMEITable.tsx
│   ├── IMEIFilters.tsx
│   └── IMEIRow.tsx
├── kpi-charts/
│   ├── InactiveDevicesChart.tsx
│   ├── DistributorPieChart.tsx
│   └── StockProjectionsChart.tsx
└── alerts/
    └── InactiveDeviceAlert.tsx
```

### Mobile Considerations
- Existing `use-breakpoint` hook perfect for responsive design
- Table component needs mobile-optimized view
- Touch-friendly interactions for mobile users

### Security Requirements
- Service account for Google Sheets (server-side only)
- JWT sessions for middleware compatibility
- Role-based access: Mesa de Ayuda, EDEN branches, Management
- Input sanitization for webhook endpoints
- CORS configuration for API security

## External Dependencies to Add
```json
{
  "googleapis": "^131.0.0",
  "next-auth": "5.0.0-beta.11",
  "recharts": "^2.8.0"
}
```

## Performance Considerations
- Server-side data fetching to avoid client-side API key exposure
- Caching strategy for Google Sheets data
- Real-time updates via webhooks (not polling)
- Optimistic updates for better UX

---

**Ready for Phase 4: Expert Detail Questions**