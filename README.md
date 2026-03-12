# Barcode PDF Generator

[![CI](https://github.com/Adrian01987/barcode-gen/actions/workflows/ci.yml/badge.svg)](https://github.com/Adrian01987/barcode-gen/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![GitHub Pages](https://img.shields.io/badge/demo-GitHub%20Pages-brightgreen)](https://adrian01987.github.io/barcode-gen/)

## Introduction

Barcode PDF Generator is a web-based application that allows users to easily create PDF documents filled with barcodes. This tool is particularly useful for businesses and individuals who need to generate barcode labels in bulk. It offers a simple interface where users can specify the title of the PDF, the barcode format, and the number and arrangement of barcodes per page.

**[Try it live](https://adrian01987.github.io/barcode-gen/)**

## Features

- **Multiple barcode formats** -- CODE128, CODE39, EAN-13, UPC-A, and ITF-14
- **Customizable grid layout** -- Configure columns (2-5) and rows (5-15) per page
- **CSV / text file import** -- Load barcode data from `.csv` or `.txt` files
- **Live preview** -- See barcodes rendered in real-time before generating
- **Copy individual barcodes** -- Copy any preview barcode as a PNG image
- **Print directly** -- Print barcode sheets without generating a PDF
- **Progress indicator** -- Visual feedback for large batch generation
- **Dark mode** -- Automatically follows your system preference
- **Offline support** -- Works without internet once loaded (PWA)
- **Responsive design** -- Works on desktop, tablet, and mobile
- **Accessible** -- ARIA labels, reduced motion support, high contrast mode

## Usage

1. Open the [web app](https://adrian01987.github.io/barcode-gen/) in your browser.
2. Enter a PDF title.
3. Choose the number of columns, rows, and barcode format.
4. Enter barcode data (one per line) or import from a file.
5. Click **Generate PDF** to download, or **Print** to print directly.

## Installation

No installation necessary. Just open the webpage in your browser.

For local development:

```bash
git clone https://github.com/Adrian01987/barcode-gen.git
cd barcode-gen
# Open index.html in your browser, or:
npx serve .
```

### Running Tests

```bash
node tests/validators.test.js
```

## Technologies

- **HTML5** / **CSS3** / **Vanilla JavaScript** (ES6+)
- [jsPDF](https://github.com/parallax/jsPDF) -- PDF generation (MIT License)
- [JsBarcode](https://github.com/lindell/JsBarcode) -- Barcode rendering (MIT License)
- [Bootstrap 5](https://getbootstrap.com/) -- UI framework (MIT License)

## Acknowledgments

This project uses the following open-source libraries, all under the MIT License:

| Library | Purpose |
|---------|---------|
| [jsPDF](https://github.com/parallax/jsPDF) | PDF document generation |
| [JsBarcode](https://github.com/lindell/JsBarcode) | Barcode image rendering |
| [Bootstrap](https://getbootstrap.com/) | Responsive UI framework |

## License

This project is licensed under the MIT License -- see the [LICENSE](LICENSE) file for details.
