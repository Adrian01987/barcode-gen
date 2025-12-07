document.getElementById('generatePdf').addEventListener('click', function() {
  const title = document.getElementById('pdfTitle').value;
  const columns = parseInt(document.getElementById('columns').value, 10);
  const rows = parseInt(document.getElementById('rows').value, 10);
  
  const barcodeData = document.getElementById('barcodeData').value
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

  const isValidConfig = 
      title && 
      !isNaN(columns) && columns >= 3 && columns <= 4 &&
      !isNaN(rows) && rows >= 10 && rows <= 13 &&
      barcodeData.length > 0;

  if (isValidConfig) {
      generatePdf(title, columns, rows, barcodeData);
  } else {
      alert('Please fill in all fields correctly. Ensure columns (3-4) and rows (10-13) are within range and barcode data is not empty.');
  }
});
