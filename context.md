# Mesa de Ayuda Hub - UI Dinámica en NextJS

## Descripción del Proyecto
Este proyecto es una aplicación web en NextJS para el "Mesa de Ayuda" en Grupo DESA, enfocada en soporte móvil nivel 2. Centraliza datos de Google Sheets (BASE con lookups SOTI/eTarifacion/STOCK/EDESA) en una UI dinámica, con endpoints API para pull auto y refresh real-time. Objetivos:
- Automatizar tracking conexiones (flags "Usando"/inactivos >7 días), líneas/planes, status asignación/tickets.
- Reducir tareas manuales como 0800 en 40%, con dashboards KPIs (inactivos/stock/proyecciones).
- Integración Claude para generación código/UI (ej. prompts para components React).
- Escalable: API REST (NestJS backend opcional), webhooks para auto-update al editar Sheets.

Beneficios operativos:
- Vista unificada: Filtra IMEI por distribuidora (EDEA/EDEN/etc.), alerta emails inactivos.
- Proyecciones: Semi-auto tickets P-1/R-2, integración JIRA/emails.
- Acceso remoto: Sucursales EDEN ven stock/envíos sin Sheets manual.

## Arquitectura
- **Frontend**: NextJS 14 (React, SSG/SSR para performance, pages/api para endpoints).
- **Backend**: Sheets como DB inicial (Google API pull), escalable a NestJS API (REST/GraphQL).
- **Datos**: Pull de Sheets BASE (IMEI lookups), SOTI (conexiones), eTarifacion (líneas/planes), STOCK (asignaciones).
- **Integraciones**: Claude AI (generación components/prompts), Google Apps Script (triggers push to API), n8n (bots emails/Whatsapp opcional).
- **Stack**: 
  - NextJS (UI/dashboards).
  - TailwindCSS (estilos responsivos).
  - Recharts (gráficos KPIs).
  - Vercel (deploy free).
  - Google Sheets API (auth OAuth2).

Flujo datos:
1. User accede UI /base.
2. NextJS fetch endpoint /api/base (pull Sheets via Google API).
3. Render table (react-table con filtros/search), charts (inactivos por distribuidora).
4. Triggers: Apps Script onEdit push webhook to API for refresh.

## Requisitos
- Node.js 22+.
- Cuenta Google (Sheets API auth).
- Claude AI API key (para generación, opcional).
- Vercel account (deploy).
- Env vars (ver .env.example).

## Instalación y Setup
1. Clone repo: `git clone [your-repo-url] && cd mesa-ayuda-hub`.
2. Instala deps: `bun install`.
3. Crea .env.local:


- Obtén API key: Google Console > APIs > Sheets API, enable and create key.
- Sheet ID: De URL Sheets BASE.
4. Genera components con Claude (opcional): Prompt "Generate React component for IMEI table with filters".
5. Run local: `bun dev` – open http://localhost:3000/base.

## Uso
- **Dashboard Principal**: /base – table IMEI con columnas (Nombre_SOTI, ID_SOTI, Distribuidora, SSID, Flag, Hora Relativa, Modelo, Número Teléfono, Plan/Abono, Status, Ticket, Observaciones).
- Filtros: Por distribuidora, inactivos >7 días.
- Charts: Pie distribuidoras, bar inactivos, line proyecciones stock.
- **Endpoints API** (pages/api):
- /api/base: GET – pull all BASE data from Sheets, return JSON.
- /api/inactivos: GET – filter IMEI inactivos >7 días, for emails.
- /api/update: POST – webhook from Apps Script for refresh.
- **Auto-Update**: Setup Apps Script trigger onEdit in Sheets: fetch('/api/update', {method: 'POST'}).
- **Emails/Alerts**: Use n8n or script for "Inactivo >7 días" emails from flag.

## Estructura Código
- /pages/base.js: UI principal (table/charts).
- /components/Table.js: React-table con filtros/search.
- /components/Chart.js: Recharts for KPIs.
- /pages/api/base.js: Endpoint pull Sheets (googleapis lib).
- /lib/sheets.js: Helper for Google Sheets API auth/query.
- /public: Logos DESA, assets.
- /styles: Tailwind config.

## Desarrollo con Claude
- Prompts Ejemplo: "Create NextJS component for IMEI dashboard with Recharts bar for inactivos, using Tailwind".
- Integra: Copia código de Claude a components, test con `npm run dev`.
- Best Practices: Prompts específicos (incluye stack, context BASE).

## Testing
- Unit: `npm test` – Jest for components (table render, charts data).
- E2E: Cypress (npm run cypress) for UI flows (filter IMEI, refresh).
- Manual: Paste new export in Sheets, check UI auto-pull.
- Edge Cases: IMEI no match (#N/A as "No Data"), empty sheets.

## Deploy
- Vercel: `vercel` command – auto-deploy on push GitHub.
- Production Env: .env.production with keys reales.
- Monitoring: Vercel Analytics for usage, Sentry for errors.

## Mantenimiento y Escalabilidad
- Update Exports: Paste manual in Sheets, or automate with Google Forms for Solicitudes.
- Escalabilidad: Migrate DB to Postgres (if Sheets slow), add auth (NextAuth for roles N2/jefe).
- Seguridad: API keys secret (Vercel env), Sheets share "view only".
- Roadmap: 1. Emails auto (n8n). 2. Bot WhatsApp for sucursales. 3. Full API NestJS for JIRA pull. 4. Mobile app (React Native).

## Contribuciones
Fork, PR – focus en features KPI/emails. Contacto: [tu-email@desa.com].

## Licencia
MIT – Free use in DESA.