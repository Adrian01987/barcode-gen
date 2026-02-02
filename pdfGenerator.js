// ============== jsPDF Compatibility ==============
if (window.jspdf && window.jspdf.jsPDF) {
  window.jsPDF = window.jspdf.jsPDF;
}

// ============== PDF Generator Module ==============
const PdfGenerator = (function() {
  // Layout constants (in mm for jsPDF default units)
  const LAYOUT = {
    PAGE_MARGIN: 10,
    HEADER_Y_POSITION: 8,
    HEADER_FONT_SIZE: 15,
    DATE_FONT_SIZE: 10,
    DATE_MARGIN_RIGHT: 10,
    DATE_MARGIN_BOTTOM: 5,
    BARCODE_LABEL_FONT_SIZE: 10,
    BARCODE_LABEL_OFFSET_Y: 4,
    BARCODE_PADDING_X: 6,
    BARCODE_TEXT_HEIGHT: 5,
    BARCODE_VERTICAL_PADDING: 5
  };

  // JsBarcode rendering settings
  const BARCODE_SETTINGS = {
    FORMAT: 'CODE128',
    BAR_WIDTH: 2,
    BAR_HEIGHT: 40,
    DISPLAY_VALUE: false,
    MARGIN: 0
  };

  const createBarcodeCanvas = (data) => {
    const canvas = document.createElement('canvas');
    JsBarcode(canvas, data, {
      format: BARCODE_SETTINGS.FORMAT,
      width: BARCODE_SETTINGS.BAR_WIDTH,
      height: BARCODE_SETTINGS.BAR_HEIGHT,
      displayValue: BARCODE_SETTINGS.DISPLAY_VALUE,
      margin: BARCODE_SETTINGS.MARGIN
    });
    return canvas;
  };

  const calculateBarcodePosition = (canvas, cellWidth, cellHeight, cellX, cellY) => {
    const aspectRatio = canvas.width / canvas.height;
    const maxAvailableWidth = cellWidth - LAYOUT.BARCODE_PADDING_X;
    const maxAvailableHeight = cellHeight - LAYOUT.BARCODE_TEXT_HEIGHT - LAYOUT.BARCODE_VERTICAL_PADDING;

    let height = maxAvailableHeight;
    let width = height * aspectRatio;

    if (width > maxAvailableWidth) {
      width = maxAvailableWidth;
    }

    const totalContentHeight = height + LAYOUT.BARCODE_TEXT_HEIGHT;
    const startY = cellY + (cellHeight - totalContentHeight) / 2;
    const centeredX = cellX + (cellWidth - width) / 2;

    return { width, height, x: centeredX, y: startY };
  };

  const generate = (title, columns, rows, barcodeData) => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      const horizontalSpace = pageWidth - 2 * LAYOUT.PAGE_MARGIN;
      const verticalSpace = pageHeight - 2 * LAYOUT.PAGE_MARGIN;
      const cellWidth = horizontalSpace / columns;
      const cellHeight = verticalSpace / rows;
      const barcodesPerPage = columns * rows;

      const addHeader = () => {
        doc.setFontSize(LAYOUT.HEADER_FONT_SIZE);
        doc.text(title, pageWidth / 2, LAYOUT.HEADER_Y_POSITION, { align: 'center' });
      };

      const addDate = () => {
        doc.setFontSize(LAYOUT.DATE_FONT_SIZE);
        // Use user's locale for date formatting
        const dateStr = new Date().toLocaleDateString(undefined, {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        });
        doc.text(dateStr, pageWidth - LAYOUT.DATE_MARGIN_RIGHT, pageHeight - LAYOUT.DATE_MARGIN_BOTTOM, { align: 'right' });
      };

      addHeader();
      addDate();

      barcodeData.forEach((data, index) => {
        const pageIndex = Math.floor(index / barcodesPerPage);
        const positionOnPage = index % barcodesPerPage;
        const col = positionOnPage % columns;
        const row = Math.floor(positionOnPage / columns);

        // Add new page if needed (but not for the first barcode)
        if (positionOnPage === 0 && index > 0) {
          doc.addPage();
          addHeader();
          addDate();
        }

        const cellX = LAYOUT.PAGE_MARGIN + col * cellWidth;
        const cellY = LAYOUT.PAGE_MARGIN + row * cellHeight;

        try {
          const canvas = createBarcodeCanvas(data);
          const pos = calculateBarcodePosition(canvas, cellWidth, cellHeight, cellX, cellY);

          const barcodeImage = canvas.toDataURL('image/png');
          doc.addImage(barcodeImage, 'PNG', pos.x, pos.y, pos.width, pos.height);

          doc.setFontSize(LAYOUT.BARCODE_LABEL_FONT_SIZE);
          doc.text(data, cellX + cellWidth / 2, pos.y + pos.height + LAYOUT.BARCODE_LABEL_OFFSET_Y, { align: 'center' });
        } catch (barcodeError) {
          console.error(`Failed to generate barcode for "${data}":`, barcodeError);
          doc.setFontSize(LAYOUT.BARCODE_LABEL_FONT_SIZE);
          doc.text(`[Error: ${data}]`, cellX + cellWidth / 2, cellY + cellHeight / 2, { align: 'center' });
        }
      });

      doc.save(title + '.pdf');
      return { success: true };
    } catch (error) {
      console.error('PDF generation failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Public API
  return {
    generate: generate
  };
})();

// Global alias for backward compatibility with app.js
const generatePdf = (title, columns, rows, barcodeData) => {
  const result = PdfGenerator.generate(title, columns, rows, barcodeData);
  if (!result.success) {
    throw new Error(result.error);
  }
};
