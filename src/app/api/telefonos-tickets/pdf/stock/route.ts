// import { NextRequest, NextResponse } from 'next/server';
// import { renderToStream } from '@react-pdf/renderer';
// import { StockAnalysisReport } from '@/components/reports/telefonos-pdf-template';
// import { 
//   getTelefonosTicketRecords,
//   calculateTelefonosTicketsAnalytics 
// } from '@/lib/telefonos-tickets-sheets';
// import type { TelefonosTicketsFilters } from '@/lib/types';

// export async function POST(request: NextRequest) {
//   try {
//     console.log('Generating stock analysis PDF report...');
    
//     const body = await request.json();
//     const { filters, reportType } = body as { 
//       filters?: TelefonosTicketsFilters;
//       reportType: 'stock';
//     };

//     // Fetch current data
//     const records = await getTelefonosTicketRecords();
    
//     // Calculate analytics with filters
//     const analytics = calculateTelefonosTicketsAnalytics(records, filters);
    
//     console.log('Stock PDF data prepared:', {
//       totalTickets: analytics.totalTickets,
//       stockAnalysis: analytics.stockAnalysis.length,
//       filtersApplied: !!filters
//     });

//     // Generate PDF document
//     const pdfDocument = <StockAnalysisReport analytics={analytics} filters={filters} />;
    
//     // Render PDF to stream
//     const stream = await renderToStream(pdfDocument);
    
//     // Convert stream to buffer
//     const chunks: Buffer[] = [];
//     stream.on('data', (chunk) => chunks.push(chunk));
    
//     await new Promise((resolve, reject) => {
//       stream.on('end', resolve);
//       stream.on('error', reject);
//     });
    
//     const buffer = Buffer.concat(chunks);
    
//     console.log('Stock analysis PDF generated successfully, size:', buffer.length);
    
//     return new NextResponse(buffer, {
//       status: 200,
//       headers: {
//         'Content-Type': 'application/pdf',
//         'Content-Disposition': `attachment; filename="Reporte_Stock_${new Date().toISOString().split('T')[0]}.pdf"`,
//         'Content-Length': buffer.length.toString(),
//       },
//     });
    
//   } catch (error) {
//     console.error('Error generating stock analysis PDF:', error);
    
//     return NextResponse.json(
//       { 
//         success: false, 
//         error: error instanceof Error ? error.message : 'Unknown error occurred' 
//       },
//       { status: 500 }
//     );
//   }
// }