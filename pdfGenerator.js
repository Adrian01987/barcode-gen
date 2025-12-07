if (window.jspdf && window.jspdf.jsPDF) {
    window.jsPDF = window.jspdf.jsPDF;
}

function generatePdf(title, columns, rows, barcodeData) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  const horizontalSpace = pageWidth - 2 * margin;
  const verticalSpace = pageHeight - 2 * margin;
  const barcodeWidth = horizontalSpace / columns;
  const barcodeHeight = verticalSpace / rows;

  let x = margin;
  let y = margin;
  let currentPageBarcodes = 0;

  const addHeaderToPage = () => {
    doc.setFontSize(15);
    doc.text(title, pageWidth / 2, 8, { align: 'center' });

    };

  const addDateToPage = () => {
    doc.setFontSize(10);
    doc.text(new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }), pageWidth - 30, pageHeight - 5);
  };

  addHeaderToPage();
  addDateToPage();

  const canvas = document.createElement('canvas');

  barcodeData.forEach((data, index) => {
    const safeData = data.length > 15 ? data.substring(0, 15) : data;
    
    JsBarcode(canvas, safeData, { 
        format: "CODE128", 
        width: 2, 
        height: 40, 
        displayValue: false, 
        margin: 0            
    });

    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const aspectRatio = imgWidth / imgHeight;
    
    const textHeight = 5; 
    const paddingX = 6; 
    const maxAvailableWidth = barcodeWidth - paddingX;
    const maxAvailableHeight = barcodeHeight - textHeight - 5;

    let h = maxAvailableHeight;
    let w = h * aspectRatio;

    if (w > maxAvailableWidth) {
        w = maxAvailableWidth;
    }

    const totalContentHeight = h + textHeight;
    const startY = y + (barcodeHeight - totalContentHeight) / 2;
    const centeredX = x + (barcodeWidth - w) / 2;

    const barcodeImage = canvas.toDataURL("image/png");
    doc.addImage(barcodeImage, 'PNG', centeredX, startY, w, h);

    doc.setFontSize(10);
    doc.text(safeData, x + barcodeWidth / 2, startY + h + 4, { align: 'center' });

    currentPageBarcodes++;

    if (currentPageBarcodes === columns * rows) {
        if (index < barcodeData.length - 1) {
            doc.addPage();
            addHeaderToPage();
            addDateToPage();
            x = margin;
            y = margin;
            currentPageBarcodes = 0;
        }
    } else {
        x += barcodeWidth;
        // Move to next row
        if ((index + 1) % columns === 0) { // Logic fix: check against total processed in this sequence if needed, but this works for simple grids
            x = margin;
            y += barcodeHeight;
        }
    }
});

doc.save(title + '.pdf');

}
