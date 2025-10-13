import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Re-export shipping voucher function
export { generateShippingVoucherPDF } from './shipping-voucher-pdf';

interface ReportData {
  reportDate: string;
  period: string;
  distributorsData: Array<{
    distributor: string;
    pending: number;
    assignments: number;
    replacements: number;
    total: number;
  }>;
  obsoleteDevices: number;
  analyzedDemand: number;
  projectedDemand: number;
  stockData: Array<{
    model: string;
    quantity: number;
    usage: string;
  }>;
  totalStock: number;
  pendingByDistributor: Record<string, number>;
  budgetEstimate: number;
}

export function generateMobileDevicesReport(data: ReportData): void {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 25;

  // Header configuration
  const addHeader = (pageNum: number) => {
    doc.setFontSize(10);
    doc.text('Informe de Dispositivos Móviles', margin, 15);
    doc.text(`Fecha y Hora: ${data.reportDate}`, pageWidth - margin - 60, 15);
    
    // Footer
    doc.text(`Página ${pageNum}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
  };

  // Page 1 - Title and Introduction
  addHeader(1);
  
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('INFORME DE DISPOSITIVOS MÓVILES', pageWidth / 2, 50, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Proyección de Stock y Demanda', pageWidth / 2, 58, { align: 'center' });
  doc.text(`Fecha de Reporte: ${data.reportDate}`, pageWidth / 2, 66, { align: 'center' });

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Introducción', margin, 85);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const introText = `Este informe tiene como objetivo estimar la cantidad de equipos celulares necesarios para cubrir las necesidades operativas durante el período ${data.period}. El análisis se basa en los datos recopilados por Mesa de Ayuda sobre los equipos entregados a las distribuidoras (EDEN, EDEA, EDELAP, EDES y EDESA), incluyendo: asignaciones a nuevos usuarios, recambios por robo, rotura, extravío u obsolescencia. Esta información permite establecer una proyección para el próximo trimestre, basada en el comportamiento real del período analizado.`;
  
  const splitText = doc.splitTextToSize(introText, pageWidth - 2 * margin);
  doc.text(splitText, margin, 95);

  // Page 2 - Distributors Analysis
  doc.addPage();
  addHeader(2);

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Distribuidoras', margin, 40);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const distText = 'A continuación, se presenta un resumen del comportamiento de consumo de equipos móviles por parte de cada distribuidora durante el trimestre analizado. Se incluyen datos de:';
  doc.text(doc.splitTextToSize(distText, pageWidth - 2 * margin), margin, 50);

  doc.text('• Solicitudes pendientes (resueltas o no según contexto)', margin + 5, 70);
  doc.text('• Nuevas asignaciones', margin + 5, 78);
  doc.text('• Recambios por obsolescencia, rotura, robo o extravío', margin + 5, 86);

  // Distributors table
  const tableData = data.distributorsData.map(row => [
    row.distributor,
    row.pending.toString(),
    row.assignments.toString(),
    row.replacements.toString(),
    row.total.toString()
  ]);

  // Add total row
  const totalRow = [
    'TOTAL',
    data.distributorsData.reduce((sum, row) => sum + row.pending, 0).toString(),
    data.distributorsData.reduce((sum, row) => sum + row.assignments, 0).toString(),
    data.distributorsData.reduce((sum, row) => sum + row.replacements, 0).toString(),
    data.distributorsData.reduce((sum, row) => sum + row.total, 0).toString()
  ];
  tableData.push(totalRow);

  autoTable(doc, {
    startY: 95,
    head: [['Distribuidora', 'Pendientes', 'Asignaciones', 'Recambios', 'Demanda Total']],
    body: tableData,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [200, 200, 200], textColor: [0, 0, 0] },
    alternateRowStyles: { fillColor: [245, 245, 245] }
  });

  // Analysis section
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  const prevTableY = (doc as any).lastAutoTable?.finalY || 150;
  doc.text('Análisis', margin, prevTableY + 20);

  doc.setFontSize(12);
  doc.text('Teléfonos pendientes de recambio (solicitud y obsolescencia)', margin, (doc as any).lastAutoTable.finalY + 35);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const pendingText = `Actualmente, no se registran tickets pendientes activos. No obstante, en la base de datos de SOTI MobiControl se identifican ${data.obsoleteDevices} dispositivos que se encuentran por debajo del estándar vigente (Samsung Galaxy A16/A2X).`;
  const pendingTextY = (doc as any).lastAutoTable?.finalY || 150;
  doc.text(doc.splitTextToSize(pendingText, pageWidth - 2 * margin), margin, pendingTextY + 45);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Teléfonos reemplazados', margin, (doc as any).lastAutoTable.finalY + 65);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const replacedText = `Durante el trimestre ${data.period}, se entregaron ${data.analyzedDemand} dispositivos entre asignaciones nuevas y recambios.`;
  const replacedTextY = (doc as any).lastAutoTable?.finalY || 150;
  doc.text(doc.splitTextToSize(replacedText, pageWidth - 2 * margin), margin, replacedTextY + 75);

  // Page 3 - Conclusion
  doc.addPage();
  addHeader(3);

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Conclusión', margin, 40);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const conclusionText = `En el último trimestre (${data.period}), se entregaron ${data.analyzedDemand} equipos celulares (nuevos y recambios por robo, extravío, rotura u obsolescencia). La demanda se mantuvo estable.`;
  doc.text(doc.splitTextToSize(conclusionText, pageWidth - 2 * margin), margin, 50);

  doc.text('• Distribución de entregas:', margin + 5, 70);
  doc.text('  - Nuevos ingresos: 20 unidades', margin + 10, 78);
  doc.text('  - Rotura: 15 unidades', margin + 10, 86);
  doc.text('  - Robo/extravío: 10 unidades', margin + 10, 94);
  doc.text('  - Obsolescencia: 19 unidades', margin + 10, 102);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`Proyección Próximo Trimestre`, margin, 120);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`• Demanda estimada: ${data.projectedDemand} equipos (basado en tendencia).`, margin + 5, 130);
  doc.text(`• Equipos obsoletos (SOTI): ${data.obsoleteDevices} unidades.`, margin + 5, 138);
  doc.text(`• Total estimado: ${data.projectedDemand} + ${data.obsoleteDevices} = ${data.projectedDemand + data.obsoleteDevices} equipos.`, margin + 5, 146);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Presupuesto', margin, 160);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('• Modelo: Samsung Galaxy A16 (U$S 576/unidad).', margin + 5, 170);
  doc.text(`• Costo total: ${data.projectedDemand + data.obsoleteDevices} × U$S 576 = U$S ${data.budgetEstimate.toLocaleString()}.`, margin + 5, 178);

  // Page 4 - Current Stock Status
  doc.addPage();
  addHeader(4);

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Estado Actual de Stock de Dispositivos', margin, 40);

  // Stock table
  const stockTableData = data.stockData.map(row => [
    row.model,
    row.quantity.toString(),
    row.usage
  ]);

  // Add total row
  stockTableData.push(['TOTAL', data.totalStock.toString(), '']);

  autoTable(doc, {
    startY: 55,
    head: [['Modelo', 'Cantidad Disponible', 'Uso Habitual']],
    body: stockTableData,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [200, 200, 200], textColor: [0, 0, 0] },
    alternateRowStyles: { fillColor: [245, 245, 245] }
  });

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const stockText = `El stock actual disponible se compone de ${data.totalStock} dispositivos, de los cuales 117 unidades del modelo Galaxy A16 están destinadas a cubrir la demanda operativa general. El resto corresponde a modelos de gama media y alta para situaciones específicas. Este nivel de stock permite responder tanto a la demanda proyectada como a los equipos obsoletos detectados. En caso de un pico de demanda inesperado, se recomienda reforzar la reserva operativa con una compra preventiva de al menos 30 unidades.`;
  
  const stockTextY = (doc as any).lastAutoTable?.finalY || 150;
  doc.text(doc.splitTextToSize(stockText, pageWidth - 2 * margin), margin, stockTextY + 20);

  // Page 5 - Minimum and Urgent Scenario
  doc.addPage();
  addHeader(5);

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Escenario Mínimo y Urgente', margin, 40);

  const totalPending = Object.values(data.pendingByDistributor).reduce((sum, val) => sum + val, 0);
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const urgentText = `En caso de que se priorice solo cubrir lo ya solicitado a través de tickets aprobados, la demanda mínima a cubrir es de ${totalPending} dispositivos.`;
  doc.text(doc.splitTextToSize(urgentText, pageWidth - 2 * margin), margin, 50);

  let yPos = 70;
  Object.entries(data.pendingByDistributor).forEach(([dist, count]) => {
    doc.text(`• ${dist}: ${count}`, margin + 5, yPos);
    yPos += 8;
  });

  doc.text(`Presupuesto estimado: U$S ${(totalPending * 576).toLocaleString()}`, margin, yPos + 10);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Adquisición de Accesorios', margin, yPos + 30);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('Para acompañar los dispositivos mencionados anteriormente:', margin, yPos + 40);
  doc.text('• 50 vidrios templados para Galaxy A25', margin + 5, yPos + 50);
  doc.text('• 50 fundas para Galaxy A25', margin + 5, yPos + 58);
  doc.text('• 30 cabezales de cargador tipo C', margin + 5, yPos + 66);
  doc.text('Presupuesto estimado para accesorios: U$S 1,500', margin, yPos + 80);

  // Page 6 - Medium/High Range Projection
  doc.addPage();
  addHeader(6);

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Proyección de Gama Media / Alta', margin, 40);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const highEndText = 'En paralelo al recambio convencional, se prevé la necesidad de reemplazar o asignar nuevos equipos para personal de supervisión, gerencia o dirección.';
  doc.text(doc.splitTextToSize(highEndText, pageWidth - 2 * margin), margin, 50);

  doc.text('Se estima el siguiente requerimiento:', margin, 70);
  doc.text('• Galaxy A35: 5 unidades', margin + 5, 80);
  doc.text('• Galaxy A55: 3 unidades', margin + 5, 88);
  doc.text('• Galaxy S25+: 2 unidades', margin + 5, 96);

  doc.text('Presupuesto estimado: U$S 5,760 (Incluye equipos y accesorios correspondientes)', margin, 110);

  // Save the PDF
  doc.save(`Informe_Dispositivos_Moviles_${new Date().toISOString().split('T')[0]}.pdf`);
}

// Example usage function
export function generateSampleReport(): void {
  const sampleData: ReportData = {
    reportDate: "28 de agosto de 2025, 01:36 PM -03",
    period: "junio-agosto 2025",
    distributorsData: [
      { distributor: "DESA", pending: 0, assignments: 2, replacements: 3, total: 5 },
      { distributor: "EDES", pending: 0, assignments: 0, replacements: 5, total: 5 },
      { distributor: "EDELAP", pending: 0, assignments: 3, replacements: 7, total: 10 },
      { distributor: "EDEN", pending: 0, assignments: 2, replacements: 19, total: 21 },
      { distributor: "EDEA", pending: 0, assignments: 0, replacements: 14, total: 14 },
      { distributor: "EDESA", pending: 0, assignments: 5, replacements: 4, total: 9 }
    ],
    obsoleteDevices: 26,
    analyzedDemand: 64,
    projectedDemand: 56,
    stockData: [
      { model: "Samsung Galaxy A16", quantity: 117, usage: "Recambios convencionales" },
      { model: "Samsung Galaxy A36", quantity: 8, usage: "Uso específico" },
      { model: "Samsung Galaxy A56", quantity: 4, usage: "Uso específico" },
      { model: "Galaxy S25 Plus", quantity: 1, usage: "Gerencia/Dirección" },
      { model: "Galaxy S25 Ultra", quantity: 1, usage: "Gerencia/Dirección" }
    ],
    totalStock: 131,
    pendingByDistributor: {
      "EDEA": 1,
      "EDELAP": 1,
      "EDESA": 1,
      "EDEN": 2,
      "EDES": 1,
      "DESA": 0
    },
    budgetEstimate: 47232
  };

  generateMobileDevicesReport(sampleData);
}