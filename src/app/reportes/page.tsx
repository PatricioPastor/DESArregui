"use client";

import { ReportsDisplay } from "@/components/dashboard/reports-display";
import { DemandRegressionChart } from "@/components/reports/demand-chart";
import { useTelefonosTickets } from "@/utils/use-phone-tickets";

export default function ReportsPage() {

  const { regressionData, isLoading, error } = useTelefonosTickets();

  console.log(regressionData)

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
          <>
            {/* <ReportsDisplay /> */}
            <DemandRegressionChart regressionData={regressionData} />
          </>
         );
}