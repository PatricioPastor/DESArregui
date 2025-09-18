import { cookies } from 'next/headers';
import { Suspense } from 'react';
import ReportsClientPage from './reports-client-page';
import ReportsLoadingFallback from '@/components/reports/reports-loading-fallback';

// Server component wrapper that handles initial data and stable props
export default async function ReportsServerWrapper() {
  // Get stable server-side data
  const serverProps = {
    reportDate: new Date().toISOString().slice(0, 19).replace('T', ' '),
    initialPeriod: 'mayo - julio 2025',
    defaultEnterprises: 'las distribuidoras (EDEN, EDEA, EDELAP, EDES y EDESA)',
    // Pass any auth/user data from server
    user: null, // Replace with actual user data from cookies if needed
  };

  return (
    <Suspense fallback={<ReportsLoadingFallback />}>
      <ReportsClientPage {...serverProps} />
    </Suspense>
  );
}