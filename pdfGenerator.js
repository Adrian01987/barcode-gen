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
    doc.text(new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }), pageWidth - 30, pageHeight - 5);
  };

  addHeaderToPage();
  addDateToPage();

  barcodeData.forEach((data, index) => {
      if (data.length > 15) {
          data = data.substring(0, 15);
      }

      const canvas = document.createElement('canvas');
      JsBarcode(canvas, data, { format: "CODE128", width: 1, height: 40 });

      const barcodeImage = canvas.toDataURL("image/png");
      doc.addImage(barcodeImage, 'PNG', x, y, barcodeWidth, barcodeHeight);

      currentPageBarcodes++;

      if (currentPageBarcodes === columns * rows) {
        doc.addPage();
        addHeaderToPage();
        x = margin;
        y = margin;
        currentPageBarcodes = 0;
        addDateToPage();
    } else {
        x += barcodeWidth;
        if ((index + 1) % columns === 0) {
            x = margin;
            y += barcodeHeight;
        }
    }
});

doc.save(title + '.pdf');
}
