// ============== App Module (IIFE) ==============
(function () {
  'use strict';

  // ============== Constants ==============
  const CONFIG = {
    BARCODE_MAX_LENGTH: 15,
    COLUMNS_MIN: 2,
    COLUMNS_MAX: 5,
    ROWS_MIN: 5,
    ROWS_MAX: 15,
    TITLE_MAX_LENGTH: 60,
    PREVIEW_MAX_BARCODES: 6,
    VALIDATION_DEBOUNCE_MS: 300
  };

  // Barcode format definitions with validation patterns
  const BARCODE_FORMATS = {
    CODE128: {
      label: 'CODE128 (General purpose)',
      pattern: /^[\x00-\x7F]+$/,
      description: 'Supports all ASCII characters (0-127)'
    },
    CODE39: {
      label: 'CODE39 (Alphanumeric)',
      pattern: /^[A-Z0-9 \-.$\/+%]+$/,
      description: 'Uppercase letters, digits, and special chars (- . $ / + % space)'
    },
    EAN13: {
      label: 'EAN-13 (Product codes)',
      pattern: /^\d{12,13}$/,
      description: 'Exactly 12 or 13 digits'
    },
    UPC: {
      label: 'UPC-A (US product codes)',
      pattern: /^\d{11,12}$/,
      description: 'Exactly 11 or 12 digits'
    },
    ITF14: {
      label: 'ITF-14 (Shipping containers)',
      pattern: /^\d{13,14}$/,
      description: 'Exactly 13 or 14 digits'
    }
  };

  // ============== DOM References ==============
  const DOM = {
    pdfTitle: document.getElementById('pdfTitle'),
    columns: document.getElementById('columns'),
    rows: document.getElementById('rows'),
    barcodeData: document.getElementById('barcodeData'),
    barcodeFormat: document.getElementById('barcodeFormat'),
    generateBtn: document.getElementById('generatePdf'),
    printBtn: document.getElementById('printBarcodes'),
    errorContainer: document.getElementById('errorContainer'),
    previewContainer: document.getElementById('previewContainer'),
    previewGrid: document.getElementById('previewGrid'),
    previewToggle: document.getElementById('previewToggle'),
    previewSummary: document.getElementById('previewSummary'),
    barcodeCount: document.getElementById('barcodeCount'),
    fileImport: document.getElementById('fileImport'),
    progressContainer: document.getElementById('progressContainer'),
    progressBar: document.getElementById('progressBar'),
    progressText: document.getElementById('progressText'),
    retryBtn: document.getElementById('retryLoadBtn'),
    formatHelp: document.getElementById('formatHelp')
  };

  // ============== State ==============
  let isGenerating = false;
  const validationTimers = {};

  // ============== Error Handling ==============
  const showError = (message) => {
    DOM.errorContainer.textContent = message;
    DOM.errorContainer.classList.add('visible');
  };

  const hideError = () => {
    DOM.errorContainer.classList.remove('visible');
    DOM.errorContainer.textContent = '';
  };

  // ============== Field Validation UI ==============
  const setFieldState = (field, isValid, message = '') => {
    const feedbackEl = field.parentElement.querySelector('.field-feedback');

    field.classList.remove('is-valid', 'is-invalid');
    if (field.value.trim() || field.type === 'number') {
      field.classList.add(isValid ? 'is-valid' : 'is-invalid');
    }

    if (feedbackEl) {
      feedbackEl.textContent = message;
      feedbackEl.style.display = message ? 'block' : 'none';
    }
  };

  // ============== Input Sanitization ==============
  const sanitizeBarcodeData = (rawData) => {
    return rawData
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
  };

  // ============== Barcode Format Helpers ==============
  const getSelectedFormat = () => {
    return DOM.barcodeFormat ? DOM.barcodeFormat.value : 'CODE128';
  };

  const getFormatPattern = () => {
    const format = getSelectedFormat();
    return BARCODE_FORMATS[format] ? BARCODE_FORMATS[format].pattern : BARCODE_FORMATS.CODE128.pattern;
  };

  const updateFormatHelp = () => {
    if (!DOM.formatHelp) return;
    const format = getSelectedFormat();
    const info = BARCODE_FORMATS[format];
    DOM.formatHelp.textContent = info ? info.description : '';
  };

  const findInvalidLengthLines = (barcodeData) => {
    return barcodeData.filter(line => line.length > CONFIG.BARCODE_MAX_LENGTH);
  };

  const findInvalidCharacterLines = (barcodeData) => {
    const pattern = getFormatPattern();
    return barcodeData.filter(line => !pattern.test(line));
  };

  // ============== Field Validators ==============
  const validateTitle = (title) => {
    if (!title) return { valid: false, message: 'Title is required' };
    if (title.length > CONFIG.TITLE_MAX_LENGTH) return { valid: false, message: `Max ${CONFIG.TITLE_MAX_LENGTH} characters` };
    return { valid: true, message: '' };
  };

  const validateColumns = (columns) => {
    if (isNaN(columns) || columns === '') return { valid: false, message: 'Required' };
    if (columns < CONFIG.COLUMNS_MIN || columns > CONFIG.COLUMNS_MAX) {
      return { valid: false, message: `Must be ${CONFIG.COLUMNS_MIN}-${CONFIG.COLUMNS_MAX}` };
    }
    return { valid: true, message: '' };
  };

  const validateRows = (rows) => {
    if (isNaN(rows) || rows === '') return { valid: false, message: 'Required' };
    if (rows < CONFIG.ROWS_MIN || rows > CONFIG.ROWS_MAX) {
      return { valid: false, message: `Must be ${CONFIG.ROWS_MIN}-${CONFIG.ROWS_MAX}` };
    }
    return { valid: true, message: '' };
  };

  const validateBarcodeData = (barcodeData) => {
    if (barcodeData.length === 0) return { valid: false, message: 'At least one barcode required' };

    const tooLong = findInvalidLengthLines(barcodeData);
    if (tooLong.length > 0) {
      return { valid: false, message: `${tooLong.length} barcode(s) exceed ${CONFIG.BARCODE_MAX_LENGTH} chars` };
    }

    const invalidChars = findInvalidCharacterLines(barcodeData);
    if (invalidChars.length > 0) {
      return { valid: false, message: `${invalidChars.length} barcode(s) have invalid characters for ${getSelectedFormat()}` };
    }

    return { valid: true, message: '' };
  };

  // ============== Full Validation ==============
  const validateInput = (title, columns, rows, barcodeData) => {
    const errors = [];

    const titleResult = validateTitle(title);
    if (!titleResult.valid) errors.push(titleResult.message);

    const colResult = validateColumns(columns);
    if (!colResult.valid) errors.push(`Columns: ${colResult.message}`);

    const rowResult = validateRows(rows);
    if (!rowResult.valid) errors.push(`Rows: ${rowResult.message}`);

    const dataResult = validateBarcodeData(barcodeData);
    if (!dataResult.valid) errors.push(dataResult.message);

    return errors;
  };

  // ============== Real-time Validation ==============
  const validateFieldRealtime = (field, validator, getValue) => {
    const value = getValue();
    const result = validator(value);
    setFieldState(field, result.valid, result.valid ? '' : result.message);
    updateGenerateButtonState();
    return result.valid;
  };

  const updateGenerateButtonState = () => {
    const title = DOM.pdfTitle.value.trim();
    const columns = parseInt(DOM.columns.value, 10);
    const rows = parseInt(DOM.rows.value, 10);
    const barcodeData = sanitizeBarcodeData(DOM.barcodeData.value);

    const isValid =
      validateTitle(title).valid &&
      validateColumns(columns).valid &&
      validateRows(rows).valid &&
      validateBarcodeData(barcodeData).valid;

    DOM.generateBtn.disabled = !isValid || isGenerating;
    if (DOM.printBtn) {
      DOM.printBtn.disabled = !isValid || isGenerating;
    }
  };

  // Per-field debounce using a timers map (fixes shared timer bug)
  const debounce = (key, fn, delay) => {
    return (...args) => {
      clearTimeout(validationTimers[key]);
      validationTimers[key] = setTimeout(() => fn(...args), delay);
    };
  };

  // ============== Progress Bar ==============
  const showProgress = (current, total) => {
    if (!DOM.progressContainer) return;
    DOM.progressContainer.classList.add('visible');
    const percent = Math.round((current / total) * 100);
    DOM.progressBar.style.width = percent + '%';
    DOM.progressBar.setAttribute('aria-valuenow', percent);
    DOM.progressText.textContent = `Processing barcode ${current} of ${total}...`;
  };

  const hideProgress = () => {
    if (!DOM.progressContainer) return;
    DOM.progressContainer.classList.remove('visible');
    DOM.progressBar.style.width = '0%';
    DOM.progressBar.setAttribute('aria-valuenow', 0);
    DOM.progressText.textContent = '';
  };

  // ============== Loading State ==============
  const setLoadingState = (loading) => {
    isGenerating = loading;
    DOM.generateBtn.disabled = loading;
    DOM.generateBtn.innerHTML = loading
      ? '<span class="spinner"></span> Generating...'
      : 'Generate PDF';
    DOM.generateBtn.setAttribute('aria-busy', loading.toString());
    if (DOM.printBtn) {
      DOM.printBtn.disabled = loading;
    }
  };

  // ============== Preview Functionality ==============
  const updatePreview = () => {
    if (!DOM.previewGrid || !DOM.previewContainer) return;

    const barcodeData = sanitizeBarcodeData(DOM.barcodeData.value);
    const columns = parseInt(DOM.columns.value, 10) || CONFIG.COLUMNS_MIN;

    // Update barcode count
    if (DOM.barcodeCount) {
      DOM.barcodeCount.textContent = `${barcodeData.length} barcode${barcodeData.length !== 1 ? 's' : ''}`;
    }

    // Clear existing preview
    DOM.previewGrid.innerHTML = '';

    if (barcodeData.length === 0) {
      DOM.previewGrid.innerHTML = '<p class="text-muted text-center w-100">Enter barcode data to see preview</p>';
      if (DOM.previewSummary) DOM.previewSummary.textContent = '';
      return;
    }

    // Set grid columns
    DOM.previewGrid.style.gridTemplateColumns = `repeat(${Math.min(columns, 3)}, 1fr)`;

    // Render preview (limit to first N barcodes)
    const previewData = barcodeData.slice(0, CONFIG.PREVIEW_MAX_BARCODES);
    const format = getSelectedFormat();
    const formatPattern = getFormatPattern();

    previewData.forEach(data => {
      const item = document.createElement('div');
      item.className = 'preview-item';

      const isValidData = data.length <= CONFIG.BARCODE_MAX_LENGTH && formatPattern.test(data);

      if (isValidData && typeof JsBarcode !== 'undefined') {
        try {
          const canvas = document.createElement('canvas');
          JsBarcode(canvas, data, {
            format: format,
            width: 1,
            height: 30,
            displayValue: false,
            margin: 0
          });
          item.appendChild(canvas);

          // Copy button
          const copyBtn = document.createElement('button');
          copyBtn.className = 'btn-copy-barcode';
          copyBtn.type = 'button';
          copyBtn.title = 'Copy barcode as image';
          copyBtn.textContent = 'Copy';
          copyBtn.setAttribute('aria-label', `Copy barcode ${data} as image`);
          copyBtn.addEventListener('click', () => copyBarcodeAsImage(canvas, data, copyBtn));
          item.appendChild(copyBtn);

          const label = document.createElement('span');
          label.className = 'preview-label';
          label.textContent = data;
          item.appendChild(label);
        } catch (e) {
          item.innerHTML = '<span class="preview-error">Error: ' + escapeHtml(data) + '</span>';
        }
      } else {
        item.innerHTML = '<span class="preview-error">Invalid: ' + escapeHtml(data) + '</span>';
      }

      DOM.previewGrid.appendChild(item);
    });

    // Show "and X more" indicator
    if (barcodeData.length > CONFIG.PREVIEW_MAX_BARCODES) {
      const more = document.createElement('div');
      more.className = 'preview-more';
      more.textContent = `+${barcodeData.length - CONFIG.PREVIEW_MAX_BARCODES} more`;
      DOM.previewGrid.appendChild(more);
    }

    // Update preview summary
    if (DOM.previewSummary) {
      const showing = Math.min(barcodeData.length, CONFIG.PREVIEW_MAX_BARCODES);
      DOM.previewSummary.textContent = barcodeData.length > CONFIG.PREVIEW_MAX_BARCODES
        ? `Showing ${showing} of ${barcodeData.length} barcodes`
        : `${barcodeData.length} barcode${barcodeData.length !== 1 ? 's' : ''}`;
    }
  };

  // ============== Copy Barcode as Image ==============
  const copyBarcodeAsImage = async (canvas, data, btn) => {
    try {
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      if (blob && navigator.clipboard && navigator.clipboard.write) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        const originalText = btn.textContent;
        btn.textContent = 'Copied!';
        btn.classList.add('copied');
        setTimeout(() => {
          btn.textContent = originalText;
          btn.classList.remove('copied');
        }, 1500);
      } else {
        // Fallback: download instead
        downloadBarcodeAsImage(canvas, data);
      }
    } catch (e) {
      // Fallback: download instead
      downloadBarcodeAsImage(canvas, data);
    }
  };

  const downloadBarcodeAsImage = (canvas, data) => {
    const link = document.createElement('a');
    link.download = `barcode-${data}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  // ============== HTML Escaping ==============
  const escapeHtml = (str) => {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  };

  const togglePreview = () => {
    if (!DOM.previewContainer || !DOM.previewToggle) return;

    const isHidden = DOM.previewContainer.classList.toggle('collapsed');
    DOM.previewToggle.textContent = isHidden ? 'Show Preview' : 'Hide Preview';
    DOM.previewToggle.setAttribute('aria-expanded', (!isHidden).toString());

    if (!isHidden) {
      updatePreview();
    }
  };

  // ============== File Import ==============
  const handleFileImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      let lines;

      if (file.name.endsWith('.csv')) {
        // Parse CSV: take the first column of each row
        lines = content.split('\n')
          .map(line => {
            // Handle quoted CSV fields
            const match = line.match(/^"?([^",]*)"?/);
            return match ? match[1].trim() : line.trim();
          })
          .filter(line => line.length > 0);
      } else {
        // Plain text: one barcode per line
        lines = content.split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0);
      }

      // Append to existing data or replace
      const existing = DOM.barcodeData.value.trim();
      DOM.barcodeData.value = existing
        ? existing + '\n' + lines.join('\n')
        : lines.join('\n');

      // Trigger validation and preview update
      const barcodeData = sanitizeBarcodeData(DOM.barcodeData.value);
      validateFieldRealtime(DOM.barcodeData, validateBarcodeData, () => barcodeData);
      updatePreview();
    };

    reader.readAsText(file);
    // Reset so the same file can be imported again
    event.target.value = '';
  };

  // ============== Print Functionality ==============
  const handlePrint = () => {
    const barcodeData = sanitizeBarcodeData(DOM.barcodeData.value);
    if (barcodeData.length === 0) return;

    const columns = parseInt(DOM.columns.value, 10) || CONFIG.COLUMNS_MIN;
    const format = getSelectedFormat();
    const formatPattern = getFormatPattern();

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showError('Pop-up blocked. Please allow pop-ups and try again.');
      return;
    }

    let barcodesHtml = '';
    barcodeData.forEach(data => {
      const isValidData = data.length <= CONFIG.BARCODE_MAX_LENGTH && formatPattern.test(data);
      if (isValidData && typeof JsBarcode !== 'undefined') {
        try {
          const canvas = document.createElement('canvas');
          JsBarcode(canvas, data, { format: format, width: 2, height: 40, displayValue: false, margin: 0 });
          barcodesHtml += `<div class="barcode-cell"><img src="${canvas.toDataURL('image/png')}" alt="${escapeHtml(data)}"><span>${escapeHtml(data)}</span></div>`;
        } catch (e) {
          barcodesHtml += `<div class="barcode-cell"><span class="error">[Error: ${escapeHtml(data)}]</span></div>`;
        }
      } else {
        barcodesHtml += `<div class="barcode-cell"><span class="error">[Invalid: ${escapeHtml(data)}]</span></div>`;
      }
    });

    printWindow.document.write(`<!DOCTYPE html>
<html><head><title>Print Barcodes</title><style>
body { margin: 0; padding: 10mm; font-family: sans-serif; }
.grid { display: grid; grid-template-columns: repeat(${columns}, 1fr); gap: 2mm; }
.barcode-cell { display: flex; flex-direction: column; align-items: center; padding: 2mm; border: 1px solid #ddd; }
.barcode-cell img { max-width: 100%; height: auto; }
.barcode-cell span { font-size: 10px; font-family: monospace; margin-top: 2mm; }
.error { color: red; font-size: 10px; }
@media print { body { padding: 5mm; } .barcode-cell { border: none; } }
</style></head><body>
<div class="grid">${barcodesHtml}</div>
<script>window.onload=function(){window.print();}<\/script>
</body></html>`);
    printWindow.document.close();
  };

  // ============== Event Listeners ==============
  // Real-time validation with per-field debounce
  DOM.pdfTitle.addEventListener('input', debounce('pdfTitle', () => {
    validateFieldRealtime(DOM.pdfTitle, validateTitle, () => DOM.pdfTitle.value.trim());
  }, CONFIG.VALIDATION_DEBOUNCE_MS));

  DOM.columns.addEventListener('input', debounce('columns', () => {
    validateFieldRealtime(DOM.columns, validateColumns, () => parseInt(DOM.columns.value, 10));
    updatePreview();
  }, CONFIG.VALIDATION_DEBOUNCE_MS));

  DOM.rows.addEventListener('input', debounce('rows', () => {
    validateFieldRealtime(DOM.rows, validateRows, () => parseInt(DOM.rows.value, 10));
  }, CONFIG.VALIDATION_DEBOUNCE_MS));

  DOM.barcodeData.addEventListener('input', debounce('barcodeData', () => {
    const barcodeData = sanitizeBarcodeData(DOM.barcodeData.value);
    validateFieldRealtime(DOM.barcodeData, validateBarcodeData, () => barcodeData);
    updatePreview();
  }, CONFIG.VALIDATION_DEBOUNCE_MS));

  // Barcode format change
  if (DOM.barcodeFormat) {
    DOM.barcodeFormat.addEventListener('change', () => {
      updateFormatHelp();
      // Re-validate barcode data with new format
      const barcodeData = sanitizeBarcodeData(DOM.barcodeData.value);
      if (barcodeData.length > 0) {
        validateFieldRealtime(DOM.barcodeData, validateBarcodeData, () => barcodeData);
      }
      updatePreview();
    });
  }

  // Immediate validation on blur
  [DOM.pdfTitle, DOM.columns, DOM.rows, DOM.barcodeData].forEach(field => {
    field.addEventListener('blur', () => {
      // Clear the specific field's timer
      const fieldId = field.id;
      clearTimeout(validationTimers[fieldId]);

      if (field === DOM.pdfTitle) {
        validateFieldRealtime(field, validateTitle, () => field.value.trim());
      } else if (field === DOM.columns) {
        validateFieldRealtime(field, validateColumns, () => parseInt(field.value, 10));
      } else if (field === DOM.rows) {
        validateFieldRealtime(field, validateRows, () => parseInt(field.value, 10));
      } else if (field === DOM.barcodeData) {
        validateFieldRealtime(field, validateBarcodeData, () => sanitizeBarcodeData(field.value));
      }
    });
  });

  // File import
  if (DOM.fileImport) {
    DOM.fileImport.addEventListener('change', handleFileImport);
  }

  // Preview toggle
  if (DOM.previewToggle) {
    DOM.previewToggle.addEventListener('click', togglePreview);
  }

  // Print button
  if (DOM.printBtn) {
    DOM.printBtn.addEventListener('click', handlePrint);
  }

  // Main generate handler (no async -- uses setTimeout for UI update)
  DOM.generateBtn.addEventListener('click', () => {
    hideError();

    const title = DOM.pdfTitle.value.trim();
    const columns = parseInt(DOM.columns.value, 10);
    const rows = parseInt(DOM.rows.value, 10);
    const barcodeData = sanitizeBarcodeData(DOM.barcodeData.value);
    const format = getSelectedFormat();

    const validationErrors = validateInput(title, columns, rows, barcodeData);

    if (validationErrors.length === 0) {
      setLoadingState(true);

      // Use setTimeout to allow UI to update before heavy processing
      setTimeout(() => {
        try {
          // Show progress for large batches
          if (barcodeData.length > 20) {
            showProgress(0, barcodeData.length);
          }
          generatePdf(title, columns, rows, barcodeData, format, (current, total) => {
            showProgress(current, total);
          });
        } catch (error) {
          showError('Failed to generate PDF: ' + error.message);
        } finally {
          setLoadingState(false);
          hideProgress();
        }
      }, 50);
    } else {
      showError(validationErrors.join(' '));
    }
  });

  // ============== Initialize ==============
  const init = () => {
    updateGenerateButtonState();
    updatePreview();
    updateFormatHelp();

    // Update HTML constraints to match CONFIG
    DOM.columns.min = CONFIG.COLUMNS_MIN;
    DOM.columns.max = CONFIG.COLUMNS_MAX;
    DOM.rows.min = CONFIG.ROWS_MIN;
    DOM.rows.max = CONFIG.ROWS_MAX;

    // Update labels to reflect widened ranges
    const colLabel = document.querySelector('label[for="columns"]');
    if (colLabel) colLabel.textContent = `Columns (${CONFIG.COLUMNS_MIN}-${CONFIG.COLUMNS_MAX}):`;
    const rowLabel = document.querySelector('label[for="rows"]');
    if (rowLabel) rowLabel.textContent = `Rows (${CONFIG.ROWS_MIN}-${CONFIG.ROWS_MAX}):`;
    const colPlaceholder = `${CONFIG.COLUMNS_MIN} to ${CONFIG.COLUMNS_MAX}`;
    DOM.columns.placeholder = colPlaceholder;
    const rowPlaceholder = `${CONFIG.ROWS_MIN} to ${CONFIG.ROWS_MAX}`;
    DOM.rows.placeholder = rowPlaceholder;
  };

  init();
})();
