import ReportsServerWrapper from './reports-server-wrapper';

// This page is now a simple server component that delegates to the server wrapper
export default function TelefonosTicketsDashboard() {
  return <ReportsServerWrapper />;
}