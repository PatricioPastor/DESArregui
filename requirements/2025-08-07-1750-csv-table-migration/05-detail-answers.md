# Detail Answers

## Q6: Should we replace the current HomeScreen component at src/app/page.tsx or create a new route for the IMEI table?
**Answer:** Yes
**Notes:** Replace HomeScreen to display IMEI table on root route (/)

## Q7: Will the table use the existing /api/base endpoint that fetches 'BASE!A:M' range from Google Sheets?
**Answer:** Yes
**Notes:** Extend existing endpoint to fetch A:N range to include the additional column. All column names are in lowercase.

## Q8: Should the 15-minute auto-refresh be implemented using setInterval in a custom React hook like useBaseData()?
**Answer:** Yes
**Notes:** Create custom hook for data fetching with 15-minute auto-refresh timer

## Q9: Will the search functionality filter locally loaded data or trigger new API calls to Google Sheets?
**Answer:** Yes
**Notes:** Filter locally loaded data for better performance and reduced API calls

## Q10: Should row actions (edit, assign ticket) modify data locally first, then sync to Google Sheets via API?
**Answer:** Yes
**Notes:** Implement optimistic updates with background sync to Google Sheets for better user experience