document.getElementById('generatePdf').addEventListener('click', function() {
  const title = document.getElementById('pdfTitle').value;
  const columns = parseInt(document.getElementById('columns').value, 10);
  const rows = parseInt(document.getElementById('rows').value, 10);
  const barcodeData = document.getElementById('barcodeData').value.split('\n');

  if (title && columns && rows && barcodeData) {
      generatePdf(title, columns, rows, barcodeData);
  } else {
      alert('Please fill in all fields.');
  }
});
