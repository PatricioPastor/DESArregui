import jsPDF from 'jspdf';

interface ShippingVoucherData {
  voucherId: string;
  assigneeName: string;
  assigneePhone: string;
  deliveryLocation: string;
  contactDetails: string;
  deviceName: string;
  deviceModel: string;
  deviceImei: string;
  distributorName: string;
  expectsReturn: boolean;
  returnDeviceImei: string;
  assignmentDate: string;
}

export const generateShippingVoucherPDF = async (data: ShippingVoucherData) => {
  // Crear PDF en formato de caja de teléfono móvil - GEIST Design
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [150, 80] // 15cm x 8cm - perfecto para caja de teléfono
  });

  // GEIST Design: Solo blanco y negro, fuente monospace
  const BLACK = 0;
  const WHITE = 255;
  const GRAY_LIGHT = 240;
  const GRAY_MID = 128;

  // Configurar fuente monospace (Courier para PDF)
  pdf.setFont('courier');

  // === HEADER MINIMALISTA GEIST ===
  pdf.setFillColor(BLACK, BLACK, BLACK);
  pdf.rect(0, 0, 150, 15, 'F');
  
  pdf.setTextColor(WHITE);
  pdf.setFontSize(12);
  pdf.setFont('courier', 'bold');
  pdf.text('DESA - BIOS', 8, 9);
  
  pdf.setFontSize(8);
  pdf.setFont('courier', 'normal');
  pdf.text('VALE DE ENVIO', 142, 6, { align: 'right' });
  pdf.text(data.voucherId, 142, 11, { align: 'right' });

  // === GRID SYSTEM GEIST ===
  pdf.setTextColor(BLACK);
  let y = 22;
  const leftCol = 8;
  const rightCol = 78;
  const lineHeight = 4;

  // Fecha en formato español
  pdf.setFontSize(7);
  pdf.setFont('courier', 'normal');
  const fecha = new Date(data.assignmentDate).toLocaleDateString('es-AR');
  pdf.text(`FECHA: ${fecha}`, leftCol, y);
  y += lineHeight * 1.5;

  // === SECCIÓN 01: DESTINATARIO ===
  pdf.setFontSize(8);
  pdf.setFont('courier', 'bold');
  pdf.text('01. DESTINATARIO', leftCol, y);
  y += lineHeight;

  pdf.setFontSize(7);
  pdf.setFont('courier', 'normal');
  pdf.text(`NOMBRE   ${data.assigneeName.toUpperCase()}`, leftCol, y);
  y += lineHeight;
  pdf.text(`TELEFONO ${data.assigneePhone}`, leftCol, y);
  y += lineHeight;
  pdf.text(`DIRECCION ${data.deliveryLocation.toUpperCase()}`, leftCol, y);
  
  if (data.contactDetails) {
    y += lineHeight;
    pdf.text(`CONTACTO ${data.contactDetails.toUpperCase()}`, leftCol, y);
  }
  
  y += lineHeight * 1.5;

  // === SECCIÓN 02: DISPOSITIVO ===
  pdf.setFontSize(8);
  pdf.setFont('courier', 'bold');
  pdf.text('02. DISPOSITIVO', leftCol, y);
  y += lineHeight;

  pdf.setFontSize(7);
  pdf.setFont('courier', 'normal');
  pdf.text(`EQUIPO   ${data.deviceName}`, leftCol, y);
  y += lineHeight;
  pdf.text(`MODELO   ${data.deviceModel.toUpperCase()}`, leftCol, y);
  y += lineHeight;
  pdf.text(`IMEI     ${data.deviceImei}`, leftCol, y);
  y += lineHeight;
  pdf.text(`DISTRIB  ${data.distributorName.toUpperCase()}`, leftCol, y);
  
  y += lineHeight * 1.5;

  // === SECCIÓN 03: DEVOLUCION (si aplica) ===
  if (data.expectsReturn) {
    pdf.setFontSize(8);
    pdf.setFont('courier', 'bold');
    pdf.text('03. DEVOLUCION', leftCol, y);
    y += lineHeight;

    pdf.setFontSize(7);
    pdf.setFont('courier', 'normal');
    pdf.text(`IMEI     ${data.returnDeviceImei}`, leftCol, y);
    y += lineHeight * 1.5;
  }

  // === LÍNEAS DE SEPARACIÓN MINIMALISTAS ===
  pdf.setDrawColor(BLACK);
  pdf.setLineWidth(0.2);
  
  // Línea vertical central (muy GEIST)
  pdf.line(75, 15, 75, 65);
  
  // Líneas horizontales sutiles
  pdf.setDrawColor(GRAY_MID);
  pdf.setLineWidth(0.1);
  pdf.line(leftCol, 18, 142, 18);
  pdf.line(leftCol, 67, 142, 67);

  // === ÁREA DE VERIFICACIÓN (lado derecho) ===
  pdf.setFontSize(8);
  pdf.setFont('courier', 'bold');
  pdf.setTextColor(BLACK);
  pdf.text('VERIFICACION', rightCol, 24);
  
  pdf.setFontSize(7);
  pdf.setFont('courier', 'normal');
  
  // Checkboxes minimalistas
  pdf.rect(rightCol, 28, 3, 3);
  pdf.text('EQUIPO RECIBIDO', rightCol + 5, 30.5);
  
  pdf.rect(rightCol, 34, 3, 3);
  pdf.text('ESTADO CORRECTO', rightCol + 5, 36.5);
  
  if (data.expectsReturn) {
    pdf.rect(rightCol, 40, 3, 3);
    pdf.text('DEVOLUCION OK', rightCol + 5, 42.5);
  }
  
  // Área de firma
  y = 52;
  pdf.text('FIRMA:', rightCol, y);
  pdf.setDrawColor(GRAY_MID);
  pdf.line(rightCol, y + 2, rightCol + 35, y + 2);
  
  pdf.text('FECHA:', rightCol, y + 8);
  pdf.line(rightCol, y + 10, rightCol + 35, y + 10);

  // === FOOTER GEIST ===
  pdf.setFillColor(GRAY_LIGHT, GRAY_LIGHT, GRAY_LIGHT);
  pdf.rect(0, 70, 150, 10, 'F');
  
  pdf.setTextColor(BLACK);
  pdf.setFontSize(6);
  pdf.setFont('courier', 'normal');
  pdf.text('PRESENTAR ESTE VALE PARA LA ENTREGA / CONSERVAR COPIA PARA SEGUIMIENTO', 75, 75, { align: 'center' });

  // === QR CODE PLACEHOLDER (muy minimalista) ===
  pdf.setDrawColor(BLACK);
  pdf.setLineWidth(0.5);
  pdf.rect(125, 45, 15, 15);
  
  // Grid pattern inside QR (simulando QR code)
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if ((i + j) % 2 === 0) {
        pdf.setFillColor(BLACK, BLACK, BLACK);
        pdf.rect(127 + i * 3.5, 47 + j * 3.5, 2, 2, 'F');
      }
    }
  }

  // === METADATA TÉCNICA (muy GEIST) ===
  pdf.setFontSize(5);
  pdf.setTextColor(GRAY_MID);
  const timestamp = new Date().toLocaleString('es-AR');
  pdf.text(`GENERADO: ${timestamp}`, 2, 78);
  pdf.text(`v1.0`, 145, 78);

  // Descargar con nombre limpio en español
  const cleanName = data.assigneeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
  const fileName = `VALE_${data.voucherId}_${cleanName}.pdf`;
  pdf.save(fileName);
};

export default generateShippingVoucherPDF;
