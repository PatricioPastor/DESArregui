# Expert Detail Questions - Mesa de Ayuda Hub

**Date:** 2025-08-05 13:25  
**Phase:** Expert Questions (4/5)

Based on deep codebase analysis and Mesa de Ayuda context, these questions clarify specific system behavior and implementation details.

## Q6: Should we extend the existing Table component at `src/components/application/table/table.tsx` for IMEI data display?
**Default if unknown:** Yes (leverages existing React Aria accessibility and maintains architectural consistency)

**Technical Context:** The existing table component has row actions, sorting, selection, and proper TypeScript definitions. It would need customization for IMEI-specific columns and filters.

## Q7: Will the Google Sheets data need real-time synchronization, or is periodic refresh sufficient?
**Default if unknown:** Real-time (based on context mentioning webhooks and "auto-update")

**Technical Context:** Real-time requires webhook implementation with Google Apps Script triggers. Periodic refresh would be simpler but less responsive to urgent changes in device status.

## Q8: Should inactive device alerts (>7 days) be displayed in the UI dashboard or only sent via email?
**Default if unknown:** Both (UI alerts for immediate visibility, emails for notifications)

**Technical Context:** UI alerts provide immediate visibility for active users, while email notifications ensure important alerts aren't missed when users aren't actively monitoring the dashboard.

## Q9: Do different user roles (Mesa de Ayuda vs EDEN branches vs Management) need completely separate dashboard views or shared views with different permissions?
**Default if unknown:** Shared views with role-based filtering (maintains single codebase, reduces complexity)

**Technical Context:** Separate views would require multiple dashboard components. Shared views with role-based data filtering would use the same components but show different data based on user permissions.

## Q10: Should the application support bulk actions on IMEI devices (bulk status updates, bulk ticket assignment)?
**Default if unknown:** Yes (improves operational efficiency for Mesa de Ayuda team)

**Technical Context:** Bulk actions would require extending the existing table's selection functionality and creating batch API endpoints. This is common for operational dashboards managing many devices.

---

**Next Step:** Ask each question individually and record answers before proceeding to Phase 5.