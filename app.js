// ============== Constants ==============
const CONFIG = {
  BARCODE_MAX_LENGTH: 15,
  COLUMNS_MIN: 3,
  COLUMNS_MAX: 4,
  ROWS_MIN: 10,
  ROWS_MAX: 13,
  TITLE_MAX_LENGTH: 60,
  PREVIEW_MAX_BARCODES: 6,
  VALIDATION_DEBOUNCE_MS: 300
};

// CODE128 supports ASCII characters 0-127
const VALID_BARCODE_PATTERN = /^[\x00-\x7F]+$/;

// ============== DOM References ==============
const DOM = {
  pdfTitle: document.getElementById('pdfTitle'),
  columns: document.getElementById('columns'),
  rows: document.getElementById('rows'),
  barcodeData: document.getElementById('barcodeData'),
  generateBtn: document.getElementById('generatePdf'),
  errorContainer: document.getElementById('errorContainer'),
  previewContainer: document.getElementById('previewContainer'),
  previewGrid: document.getElementById('previewGrid'),
  previewToggle: document.getElementById('previewToggle'),
  barcodeCount: document.getElementById('barcodeCount')
};

// ============== State ==============
let isGenerating = false;
let validationTimeout = null;

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

const findInvalidLengthLines = (barcodeData) => {
  return barcodeData.filter(line => line.length > CONFIG.BARCODE_MAX_LENGTH);
};

const findInvalidCharacterLines = (barcodeData) => {
  return barcodeData.filter(line => !VALID_BARCODE_PATTERN.test(line));
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
    return { valid: false, message: `${invalidChars.length} barcode(s) have invalid characters` };
  }
  
  return { valid: true, message: '' };
};

// ============== Full Validation ==============
const validateInput = (title, columns, rows, barcodeData) => {
  const errors = [];

  const titleResult = validateTitle(title);
  if (!titleResult.valid) errors.push('PDF title is required.');

  const colResult = validateColumns(columns);
  if (!colResult.valid) errors.push(`Columns must be between ${CONFIG.COLUMNS_MIN} and ${CONFIG.COLUMNS_MAX}.`);

  const rowResult = validateRows(rows);
  if (!rowResult.valid) errors.push(`Rows must be between ${CONFIG.ROWS_MIN} and ${CONFIG.ROWS_MAX}.`);

  const dataResult = validateBarcodeData(barcodeData);
  if (!dataResult.valid) {
    if (barcodeData.length === 0) {
      errors.push('Barcode data is required.');
    } else {
      const tooLongLines = findInvalidLengthLines(barcodeData);
      if (tooLongLines.length > 0) {
        errors.push(`The following barcodes exceed ${CONFIG.BARCODE_MAX_LENGTH} characters: ${tooLongLines.join(', ')}`);
      }
      const invalidCharLines = findInvalidCharacterLines(barcodeData);
      if (invalidCharLines.length > 0) {
        errors.push(`The following barcodes contain invalid characters: ${invalidCharLines.join(', ')}`);
      }
    }
  }

  return errors;
}

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
};

const debounce = (fn, delay) => {
  return (...args) => {
    clearTimeout(validationTimeout);
    validationTimeout = setTimeout(() => fn(...args), delay);
  };
};

// ============== Loading State ==============
const setLoadingState = (loading) => {
  isGenerating = loading;
  DOM.generateBtn.disabled = loading;
  DOM.generateBtn.innerHTML = loading 
    ? '<span class="spinner"></span> Generating...'
    : 'Generate PDF';
  DOM.generateBtn.setAttribute('aria-busy', loading.toString());
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
    return;
  }
  
  // Set grid columns
  DOM.previewGrid.style.gridTemplateColumns = `repeat(${Math.min(columns, 3)}, 1fr)`;
  
  // Render preview (limit to first N barcodes)
  const previewData = barcodeData.slice(0, CONFIG.PREVIEW_MAX_BARCODES);
  
  previewData.forEach(data => {
    const item = document.createElement('div');
    item.className = 'preview-item';
    
    const isValidData = data.length <= CONFIG.BARCODE_MAX_LENGTH && VALID_BARCODE_PATTERN.test(data);
    
    if (isValidData && typeof JsBarcode !== 'undefined') {
      try {
        const canvas = document.createElement('canvas');
        JsBarcode(canvas, data, {
          format: 'CODE128',
          width: 1,
          height: 30,
          displayValue: false,
          margin: 0
        });
        item.appendChild(canvas);
        
        const label = document.createElement('span');
        label.className = 'preview-label';
        label.textContent = data;
        item.appendChild(label);
      } catch (e) {
        item.innerHTML = `<span class="preview-error">⚠️ ${data}</span>`;
      }
    } else {
      item.innerHTML = `<span class="preview-error">⚠️ ${data}</span>`;
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

// ============== Event Listeners ==============
// Real-time validation with debounce
DOM.pdfTitle.addEventListener('input', debounce(() => {
  validateFieldRealtime(DOM.pdfTitle, validateTitle, () => DOM.pdfTitle.value.trim());
}, CONFIG.VALIDATION_DEBOUNCE_MS));

DOM.columns.addEventListener('input', debounce(() => {
  validateFieldRealtime(DOM.columns, validateColumns, () => parseInt(DOM.columns.value, 10));
  updatePreview();
}, CONFIG.VALIDATION_DEBOUNCE_MS));

DOM.rows.addEventListener('input', debounce(() => {
  validateFieldRealtime(DOM.rows, validateRows, () => parseInt(DOM.rows.value, 10));
}, CONFIG.VALIDATION_DEBOUNCE_MS));

DOM.barcodeData.addEventListener('input', debounce(() => {
  const barcodeData = sanitizeBarcodeData(DOM.barcodeData.value);
  validateFieldRealtime(DOM.barcodeData, validateBarcodeData, () => barcodeData);
  updatePreview();
}, CONFIG.VALIDATION_DEBOUNCE_MS));

// Immediate validation on blur
[DOM.pdfTitle, DOM.columns, DOM.rows, DOM.barcodeData].forEach(field => {
  field.addEventListener('blur', () => {
    clearTimeout(validationTimeout);
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

// Preview toggle
if (DOM.previewToggle) {
  DOM.previewToggle.addEventListener('click', togglePreview);
}

// Main generate handler
DOM.generateBtn.addEventListener('click', async () => {
  hideError();

  const title = DOM.pdfTitle.value.trim();
  const columns = parseInt(DOM.columns.value, 10);
  const rows = parseInt(DOM.rows.value, 10);
  const barcodeData = sanitizeBarcodeData(DOM.barcodeData.value);

  const validationErrors = validateInput(title, columns, rows, barcodeData);

  if (validationErrors.length === 0) {
    setLoadingState(true);
    
    // Use setTimeout to allow UI to update before heavy processing
    setTimeout(() => {
      try {
        generatePdf(title, columns, rows, barcodeData);
      } catch (error) {
        showError(`Failed to generate PDF: ${error.message}`);
      } finally {
        setLoadingState(false);
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
};

init();
