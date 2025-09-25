# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Mesa de Ayuda Hub application for Grupo DESA, built on top of Untitled UI Next.js starter kit. The application centralizes data from Google Sheets for mobile support level 2 operations.

### Tech Stack
- Next.js 15.3.5 with Turbopack
- React 19.0  
- TypeScript 5.8
- Tailwind CSS v4.1
- React Aria Components for accessibility
- next-themes for theme switching

### Business Context
- **Purpose**: Mobile support level 2 dashboard for tracking IMEI devices, connections, and tickets
- **Architecture**: Database-first with PostgreSQL + Prisma, Google Sheets sync via dedicated endpoints
- **Key Features**:
  - Real-time SOTI device tracking with connection status
  - Ticket management with R-X pattern extraction (R-1, R-2 for replacements)
  - Inventory management with status tracking and SOTI correlation
  - Advanced search and filtering across all data sources
  - Real-time analytics and KPI dashboards
  - Sync buttons for manual data updates from external sources

### Target Users
- Mesa de Ayuda team (level 2 mobile support)  
- Remote branch offices (EDEN) for stock visibility
- Management for KPI reporting

## Development Commands

```bash
# Start development server with Turbopack  
bun dev

# Build for production
bun run build

# Start production server
bun start

# Add new components using Untitled UI CLI
npx untitledui@latest add

# Test endpoints
bun test
```

## Environment Setup

Required environment variables in `.env.local`:
```bash
# Google Sheets API (Service Account)
GOOGLE_CLIENT_EMAIL=your-service-account@project-id.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----"
GOOGLE_SHEET_ID=your_google_sheet_id_here

# Optional: Claude AI for component generation
CLAUDE_API_KEY=your_claude_key
```

### Google Sheets Setup
1. Create Google Cloud Project and enable Sheets API
2. Create Service Account credentials
3. Download JSON key file
4. Use `client_email` and `private_key` from JSON file
5. Share your Google Sheet with the service account email

### API Endpoints

#### Synchronization Endpoints (Data Import)
- `/api/sync/soti` - POST: Sync SOTI devices from external sources
- `/api/sync/tickets` - POST: Sync tickets with R-X pattern extraction
- `/api/sync/stock` - POST: Sync inventory/stock data

#### Data Endpoints (Database Queries)
- `/api/soti` - GET: SOTI devices with search/filters
- `/api/telefonos-tickets` - GET: Tickets with real-time analytics
- `/api/stock` - GET: Inventory with SOTI correlation
- `/api/models` - GET: Phone models for dropdowns
- `/api/distributors` - GET: Distributors for dropdowns
- `/api/test` - Test endpoint to verify configuration

## Architecture

### Directory Structure
- `src/app/` - Next.js App Router pages and layouts
  - `src/app/base/` - Main dashboard page for IMEI management  
  - `src/app/api/` - API routes for Google Sheets integration
- `src/components/` - Component library organized by category:
  - `base/` - Basic UI components (buttons, inputs, forms, etc.)
  - `application/` - Complex application components (navigation, modals, tables, etc.)
  - `dashboard/` - Mesa de Ayuda specific components (IMEI table, KPI charts)
  - `foundations/` - Core design elements (icons, logos, patterns)
- `src/lib/` - Utility libraries
  - `sheets.ts` - Google Sheets API integration helpers
  - `types.ts` - TypeScript definitions for IMEI data
- `src/providers/` - React context providers
- `src/hooks/` - Custom React hooks for data fetching
- `src/utils/` - Utility functions
- `src/styles/` - Global CSS files

### API Routes Structure
- `/api/base` - GET: Pull all BASE data from Google Sheets
- `/api/inactivos` - GET: Filter inactive IMEI devices (>7 days)
- `/api/update` - POST: Webhook endpoint for real-time updates from Google Apps Script

### Data Flow
1. User accesses `/base` dashboard
2. Next.js fetches `/api/base` endpoint  
3. API calls Google Sheets API to pull latest data
4. Frontend renders IMEI table with filters and KPI charts
5. Google Apps Script triggers `/api/update` webhook on sheet edits

### Key Data Structure
IMEI records contain:
- Nombre_SOTI, ID_SOTI, Distribuidora
- SSID, Flag, Hora Relativa  
- Modelo, Número Teléfono, Plan/Abono
- Status, Ticket, Observaciones

### Component Architecture
Built on Untitled UI components with React Aria for accessibility. Custom dashboard components extend base components for domain-specific functionality.

### Styling System
Uses Tailwind CSS with custom design tokens. The `cx` utility function handles class merging and conflicts.

### Theme System
Supports light/dark themes for different work environments and user preferences.
- Librerias: UntitledUI (@componentes lo usable) - BetterAuth - Supabase - sonner - prisma
- Recordá que esto tiene que ser un proyecto funcional y tecnicamente solido, pero priorizando lo necesario y lo funcional por sobre las validaciones sin sentido o bien, que sobrevaliden las cosas, en caso de que algo consideres que tiene más de 3 validaciones, consultar sobre las posibles y yo elijo antes de que lo apliques como solución
- recordá usar la librería de @src\components\ que es la librería de UNtitledUI y los disenos tienen que ser funcionales.
- los archivos se nombra en ingles y co - y minuscula
- cada archivo que veas que no está bien seteado, ponele el nombre correcto en lowercase y con - en los espacios