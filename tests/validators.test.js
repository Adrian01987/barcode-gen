/**
 * Unit tests for validation logic.
 *
 * These tests extract and re-implement the pure validation functions from app.js
 * so they can be tested in Node.js without a DOM environment.
 *
 * Run with: node tests/validators.test.js
 */

'use strict';

// ============== Re-implemented validation functions ==============
// (Extracted from app.js for testability)

const CONFIG = {
  BARCODE_MAX_LENGTH: 15,
  COLUMNS_MIN: 2,
  COLUMNS_MAX: 5,
  ROWS_MIN: 5,
  ROWS_MAX: 15,
  TITLE_MAX_LENGTH: 60
};

const BARCODE_FORMATS = {
  CODE128: { pattern: /^[\x00-\x7F]+$/ },
  CODE39: { pattern: /^[A-Z0-9 \-.$\/+%]+$/ },
  EAN13: { pattern: /^\d{12,13}$/ },
  UPC: { pattern: /^\d{11,12}$/ },
  ITF14: { pattern: /^\d{13,14}$/ }
};

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

const sanitizeBarcodeData = (rawData) => {
  return rawData
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
};

const findInvalidLengthLines = (barcodeData) => {
  return barcodeData.filter(line => line.length > CONFIG.BARCODE_MAX_LENGTH);
};

const findInvalidCharacterLines = (barcodeData, format) => {
  const pat = BARCODE_FORMATS[format] ? BARCODE_FORMATS[format].pattern : BARCODE_FORMATS.CODE128.pattern;
  return barcodeData.filter(line => !pat.test(line));
};

const validateBarcodeData = (barcodeData, format) => {
  if (barcodeData.length === 0) return { valid: false, message: 'At least one barcode required' };

  const tooLong = findInvalidLengthLines(barcodeData);
  if (tooLong.length > 0) {
    return { valid: false, message: `${tooLong.length} barcode(s) exceed ${CONFIG.BARCODE_MAX_LENGTH} chars` };
  }

  const invalidChars = findInvalidCharacterLines(barcodeData, format || 'CODE128');
  if (invalidChars.length > 0) {
    return { valid: false, message: `${invalidChars.length} barcode(s) have invalid characters for ${format || 'CODE128'}` };
  }

  return { valid: true, message: '' };
};

// ============== Test Runner ==============
let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, description) {
  if (condition) {
    passed++;
  } else {
    failed++;
    failures.push(description);
    console.error('  FAIL: ' + description);
  }
}

function assertEqual(actual, expected, description) {
  const ok = actual === expected;
  if (!ok) {
    description += ' (expected ' + JSON.stringify(expected) + ', got ' + JSON.stringify(actual) + ')';
  }
  assert(ok, description);
}

function suite(name, fn) {
  console.log('\n' + name);
  console.log('='.repeat(name.length));
  fn();
}

// ============== Tests ==============

suite('validateTitle', () => {
  assertEqual(validateTitle('').valid, false, 'empty title is invalid');
  assertEqual(validateTitle('My PDF').valid, true, 'normal title is valid');
  assertEqual(validateTitle('A').valid, true, 'single char title is valid');
  assertEqual(validateTitle('A'.repeat(60)).valid, true, 'exactly 60 chars is valid');
  assertEqual(validateTitle('A'.repeat(61)).valid, false, '61 chars is invalid');
  assertEqual(validateTitle(null).valid, false, 'null title is invalid');
  assertEqual(validateTitle(undefined).valid, false, 'undefined title is invalid');
});

suite('validateColumns', () => {
  assertEqual(validateColumns(2).valid, true, 'min value (2) is valid');
  assertEqual(validateColumns(3).valid, true, '3 columns is valid');
  assertEqual(validateColumns(4).valid, true, '4 columns is valid');
  assertEqual(validateColumns(5).valid, true, 'max value (5) is valid');
  assertEqual(validateColumns(1).valid, false, '1 column is invalid (below min)');
  assertEqual(validateColumns(6).valid, false, '6 columns is invalid (above max)');
  assertEqual(validateColumns(NaN).valid, false, 'NaN is invalid');
  assertEqual(validateColumns('').valid, false, 'empty string is invalid');
  assertEqual(validateColumns(0).valid, false, '0 is invalid');
});

suite('validateRows', () => {
  assertEqual(validateRows(5).valid, true, 'min value (5) is valid');
  assertEqual(validateRows(10).valid, true, '10 rows is valid');
  assertEqual(validateRows(15).valid, true, 'max value (15) is valid');
  assertEqual(validateRows(4).valid, false, '4 rows is invalid (below min)');
  assertEqual(validateRows(16).valid, false, '16 rows is invalid (above max)');
  assertEqual(validateRows(NaN).valid, false, 'NaN is invalid');
  assertEqual(validateRows('').valid, false, 'empty string is invalid');
});

suite('sanitizeBarcodeData', () => {
  const r1 = sanitizeBarcodeData('ABC\nDEF\nGHI');
  assertEqual(r1.length, 3, 'splits 3 lines');
  assertEqual(r1[0], 'ABC', 'first line correct');

  const r2 = sanitizeBarcodeData('  ABC  \n  DEF  ');
  assertEqual(r2[0], 'ABC', 'trims whitespace');
  assertEqual(r2[1], 'DEF', 'trims whitespace on second line');

  const r3 = sanitizeBarcodeData('ABC\n\n\nDEF\n\n');
  assertEqual(r3.length, 2, 'filters empty lines');

  const r4 = sanitizeBarcodeData('');
  assertEqual(r4.length, 0, 'empty string produces empty array');

  const r5 = sanitizeBarcodeData('   \n   \n   ');
  assertEqual(r5.length, 0, 'whitespace-only lines are filtered');
});

suite('validateBarcodeData (CODE128)', () => {
  assertEqual(validateBarcodeData([], 'CODE128').valid, false, 'empty array is invalid');
  assertEqual(validateBarcodeData(['ABC123'], 'CODE128').valid, true, 'valid ASCII data');
  assertEqual(validateBarcodeData(['ABC', 'DEF', '123'], 'CODE128').valid, true, 'multiple valid entries');
  assertEqual(validateBarcodeData(['A'.repeat(16)], 'CODE128').valid, false, 'exceeds max length');
  assertEqual(validateBarcodeData(['A'.repeat(15)], 'CODE128').valid, true, 'exactly max length');
});

suite('validateBarcodeData (CODE39)', () => {
  assertEqual(validateBarcodeData(['ABC123'], 'CODE39').valid, true, 'uppercase alphanumeric is valid');
  assertEqual(validateBarcodeData(['abc123'], 'CODE39').valid, false, 'lowercase is invalid for CODE39');
  assertEqual(validateBarcodeData(['A-B.C'], 'CODE39').valid, true, 'special chars (- .) are valid for CODE39');
  assertEqual(validateBarcodeData(['A B'], 'CODE39').valid, true, 'space is valid for CODE39');
});

suite('validateBarcodeData (EAN13)', () => {
  assertEqual(validateBarcodeData(['123456789012'], 'EAN13').valid, true, '12 digits is valid');
  assertEqual(validateBarcodeData(['1234567890123'], 'EAN13').valid, true, '13 digits is valid');
  assertEqual(validateBarcodeData(['12345678901'], 'EAN13').valid, false, '11 digits is invalid');
  assertEqual(validateBarcodeData(['12345678901234'], 'EAN13').valid, false, '14 digits is invalid');
  assertEqual(validateBarcodeData(['12345678901A'], 'EAN13').valid, false, 'non-digit is invalid');
});

suite('validateBarcodeData (UPC)', () => {
  assertEqual(validateBarcodeData(['12345678901'], 'UPC').valid, true, '11 digits is valid');
  assertEqual(validateBarcodeData(['123456789012'], 'UPC').valid, true, '12 digits is valid');
  assertEqual(validateBarcodeData(['1234567890'], 'UPC').valid, false, '10 digits is invalid');
  assertEqual(validateBarcodeData(['1234567890123'], 'UPC').valid, false, '13 digits is invalid');
});

suite('validateBarcodeData (ITF14)', () => {
  assertEqual(validateBarcodeData(['1234567890123'], 'ITF14').valid, true, '13 digits is valid');
  assertEqual(validateBarcodeData(['12345678901234'], 'ITF14').valid, true, '14 digits is valid');
  assertEqual(validateBarcodeData(['123456789012'], 'ITF14').valid, false, '12 digits is invalid');
  assertEqual(validateBarcodeData(['123456789012345'], 'ITF14').valid, false, '15 digits is invalid (also exceeds max length)');
});

suite('findInvalidLengthLines', () => {
  assertEqual(findInvalidLengthLines(['short']).length, 0, 'short string passes');
  assertEqual(findInvalidLengthLines(['A'.repeat(15)]).length, 0, 'exactly 15 chars passes');
  assertEqual(findInvalidLengthLines(['A'.repeat(16)]).length, 1, '16 chars fails');
  assertEqual(findInvalidLengthLines(['ok', 'A'.repeat(20), 'fine']).length, 1, 'only long lines flagged');
});

suite('findInvalidCharacterLines', () => {
  assertEqual(findInvalidCharacterLines(['ABC'], 'CODE128').length, 0, 'ASCII is valid for CODE128');
  assertEqual(findInvalidCharacterLines(['abc'], 'CODE39').length, 1, 'lowercase invalid for CODE39');
  assertEqual(findInvalidCharacterLines(['ABC', 'abc'], 'CODE39').length, 1, 'only invalid lines counted');
});

// ============== Summary ==============
console.log('\n' + '='.repeat(40));
console.log('Results: ' + passed + ' passed, ' + failed + ' failed');
if (failures.length > 0) {
  console.log('\nFailed tests:');
  failures.forEach(f => console.log('  - ' + f));
}
console.log('='.repeat(40));

process.exit(failed > 0 ? 1 : 0);
