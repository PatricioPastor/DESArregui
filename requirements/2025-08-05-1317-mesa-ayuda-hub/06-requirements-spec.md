# Mesa de Ayuda Hub - Requirements Specification

**Date:** 2025-08-05 13:30  
**Project:** Mesa de Ayuda Hub for Grupo DESA  
**Status:** Complete Requirements Specification

---

## Problem Statement

The Mesa de Ayuda team at Grupo DESA currently manages IMEI device tracking, connections, and support tickets through manual Google Sheets processes. This leads to inefficiencies, delayed responses to inactive devices, and difficulty accessing information across different teams and locations.

## Solution Overview

Transform the existing Untitled UI Next.js starter into a centralized Mesa de Ayuda Hub that:
- Automatically pulls data from Google Sheets (BASE with SOTI/eTarifacion/STOCK/EDESA lookups)
- Provides real-time dashboard with IMEI device tracking
- Automates alerts for inactive devices (>7 days)
- Reduces manual tasks by 40% through automation
- Supports mobile access for field teams

---

## Functional Requirements

### Core Dashboard Features
1. **IMEI Device Table**
   - Display all device data in sortable, filterable table using Untitled UI components
   - Columns: Nombre_SOTI, ID_SOTI, Distribuidora, SSID, Flag, Hora_Relativa, Modelo, Número_Teléfono, Plan/Abono, Status, Ticket, Observaciones
   - Support for bulk selection and actions
   - Mobile-responsive design for field access

2. **Filtering & Search**
   - Filter by Distribuidora (EDEA/EDEN/etc.)
   - Filter by device status (Usando/Inactivo)
   - Filter by inactive devices >7 days
   - Real-time search across all fields

3. **Bulk Operations**
   - Bulk status updates
   - Bulk ticket assignment
   - Bulk device actions (mark as resolved, etc.)

### Alert System
4. **Inactive Device Alerts**
   - UI notifications for devices inactive >7 days
   - Email notifications for critical alerts
   - Dashboard badges showing alert counts

### KPI Dashboard
5. **Analytics & Charts**
   - Pie chart: Device distribution by Distribuidora
   - Bar chart: Inactive devices by region
   - Line chart: Stock projections over time
   - Summary cards: Total devices, active/inactive counts

### Data Management
6. **Google Sheets Integration**
   - Direct API calls to Google Sheets (no webhooks initially)
   - Pull data from BASE sheet with all lookups
   - Service account authentication for security
   - Handle API rate limits and errors gracefully

---

## Technical Requirements

### Architecture
- **Frontend:** Next.js 15 with App Router, React 19, TypeScript 5.8
- **UI Library:** Untitled UI React components (https://www.untitledui.com/react/components/tables)
- **Styling:** Tailwind CSS v4.1 with existing theme system
- **Data Source:** Google Sheets API v4
- **Authentication:** Better Auth (https://www.better-auth.com/) for future implementation

### File Structure Implementation
```
src/
├── app/
│   ├── base/
│   │   └── page.tsx              # Main dashboard page
│   └── api/
│       ├── base/route.ts         # GET: Pull all BASE data from Sheets
│       ├── inactivos/route.ts    # GET: Filter inactive devices >7 days
│       └── sheets/
│           └── route.ts          # Generic Sheets API handler
├── components/
│   └── dashboard/
│       ├── imei-table/
│       │   ├── IMEITable.tsx     # Main table component (extends Untitled UI)
│       │   ├── IMEIFilters.tsx   # Filter controls
│       │   ├── BulkActions.tsx   # Bulk operation controls
│       │   └── IMEIRow.tsx       # Custom row component
│       ├── kpi-charts/
│       │   ├── DistributorChart.tsx
│       │   ├── InactiveChart.tsx
│       │   └── StockChart.tsx
│       └── alerts/
│           ├── InactiveAlert.tsx
│           └── AlertBadge.tsx
├── lib/
│   ├── sheets.ts                 # Google Sheets API helpers
│   ├── types.ts                  # TypeScript definitions
│   └── email.ts                  # Email service for alerts
└── hooks/
    ├── use-sheets-data.ts        # Custom hook for data fetching
    └── use-device-alerts.ts      # Hook for alert management
```

### Data Types
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
  isInactive?: boolean; // Computed field for >7 days
}

interface BulkAction {
  type: 'status' | 'ticket' | 'flag';
  value: string;
  deviceIds: string[];
}
```

### API Endpoints
1. **`GET /api/base`**
   - Pulls all data from Google Sheets BASE
   - Returns: `{ data: IMEIRecord[], lastUpdated: string }`
   - Caching: 5-minute cache to avoid rate limits

2. **`GET /api/inactivos`**
   - Filters devices inactive >7 days
   - Returns: `{ inactiveDevices: IMEIRecord[], count: number }`

3. **`POST /api/bulk-update`** (Future)
   - Handles bulk operations on multiple devices
   - Body: `{ action: BulkAction }`

### Environment Variables
```bash
# Google Sheets API
GOOGLE_CLIENT_EMAIL=service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
GOOGLE_SHEET_ID=1abc123...

# Email Service (Future)
SMTP_HOST=smtp.gmail.com
SMTP_USER=alerts@desa.com
SMTP_PASS=app_password
```

### Dependencies to Add
```json
{
  "googleapis": "^131.0.0",
  "recharts": "^2.8.0",
  "nodemailer": "^6.9.0",
  "@types/nodemailer": "^6.4.0"
}
```

---

## Implementation Hints & Patterns

### Google Sheets Integration Pattern
```typescript
// lib/sheets.ts
import { google } from "googleapis";

export async function getSheetData(range: string) {
  const auth = await google.auth.getClient({
    credentials: {
      type: "service_account",
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  
  const sheets = google.sheets({ version: "v4", auth });
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range,
  });
  
  return response.data.values;
}
```

### Custom Hook Pattern
```typescript
// hooks/use-sheets-data.ts
export function useSheetsData() {
  const [data, setData] = useState<IMEIRecord[]>([]);
  const [loading, setLoading] = useState(true);
  
  const refreshData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/base');
      const result = await response.json();
      setData(result.data);
    } finally {
      setLoading(false);
    }
  }, []);
  
  return { data, loading, refreshData };
}
```

### Untitled UI Table Extension
```typescript
// components/dashboard/imei-table/IMEITable.tsx
import { Table } from "@/components/application/table/table";

export function IMEITable({ data }: { data: IMEIRecord[] }) {
  return (
    <Table.Root>
      <Table.Header>
        <Table.Column>Nombre SOTI</Table.Column>
        <Table.Column>Distribuidora</Table.Column>
        <Table.Column>Flag</Table.Column>
        {/* More columns */}
      </Table.Header>
      <Table.Body>
        {data.map((record) => (
          <IMEIRow key={record.ID_SOTI} record={record} />
        ))}
      </Table.Body>
    </Table.Root>
  );
}
```

---

## Acceptance Criteria

### MVP Requirements
- ✅ Dashboard displays IMEI data from Google Sheets in responsive table
- ✅ Filter by distribuidora and device status
- ✅ Identify and highlight devices inactive >7 days
- ✅ UI alerts for inactive devices with count badges
- ✅ Mobile-responsive design for field access
- ✅ Bulk selection and operations on devices
- ✅ Direct Google Sheets API integration with error handling

### Performance Requirements
- ✅ Initial page load < 3 seconds
- ✅ Data refresh < 2 seconds
- ✅ Mobile-friendly table navigation
- ✅ Graceful handling of Google Sheets API rate limits

### Security Requirements
- ✅ Google Sheets service account authentication
- ✅ No API keys exposed to client
- ✅ Proper environment variable handling
- ✅ Input sanitization for all user inputs

---

## Assumptions

1. **Google Sheets Structure:** Assumes current Google Sheets structure remains consistent with columns mentioned in context.md
2. **No Authentication Initially:** MVP starts without user authentication - single shared access
3. **Email Service:** Email alerts will be implemented in future phase using standard SMTP
4. **Data Volume:** Assumes manageable data volume (<10,000 devices) for client-side operations
5. **Update Frequency:** Direct API calls acceptable for current scale; webhooks not required initially
6. **Browser Support:** Modern browsers with JavaScript enabled
7. **Internet Connectivity:** Requires internet connection for Google Sheets API calls

---

## Future Enhancements (Out of Scope for MVP)
- Better Auth integration for user roles
- Real-time webhooks from Google Apps Script
- Advanced analytics and reporting
- Integration with JIRA for ticket management
- WhatsApp bot for remote notifications
- Mobile app (React Native)
- Database migration from Google Sheets