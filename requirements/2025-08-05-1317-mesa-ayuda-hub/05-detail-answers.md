# Expert Detail Answers - Mesa de Ayuda Hub

**Date:** 2025-08-05 13:30  
**Phase:** Expert Questions Complete

## Q6: Should we extend the existing Table component at `src/components/application/table/table.tsx` for IMEI data display?
**Answer:** Yes (use Untitled UI React library)
**Impact:** Leverage Untitled UI React components from https://www.untitledui.com/react/components/tables - maintains consistency and accessibility

## Q7: Will the Google Sheets data need real-time synchronization, or is periodic refresh sufficient?
**Answer:** Direct endpoint consultation to Google Sheets
**Impact:** Simple API endpoint that directly queries Google Sheets when needed, no webhook complexity required

## Q8: Should inactive device alerts (>7 days) be displayed in the UI dashboard or only sent via email?
**Answer:** Both UI and email alerts
**Impact:** Implement UI notifications/badges for active users plus email service for notifications when not actively monitoring

## Q9: Do different user roles need separate dashboard views or shared views with role-based filtering?
**Answer:** No roles initially - single simple view
**Impact:** Start with one unified dashboard view, no authentication complexity in MVP. Better Auth (https://www.better-auth.com/) noted for future implementation

## Q10: Should the application support bulk actions on IMEI devices?
**Answer:** Yes
**Impact:** Implement multi-select functionality in Untitled UI table with bulk operations like status updates, ticket assignments

---

**Key Technical Decisions:**
- Use Untitled UI React library components
- Direct Google Sheets API calls (no webhooks)
- Better Auth for future authentication needs
- No role-based access control in MVP
- Support bulk operations for efficiency
- Both UI and email alerting system