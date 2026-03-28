# JSON/CSV/PDF Import-Export UI

A pure HTML/CSS/JS module suite for importing and exporting JSON, CSV, and PDF data.
No external dependencies required.

## Directory Structure

```
json-import-export-ui/
├── README.md
├── components/
│   ├── json_body_ver_0004001.html    ← JSON main UI
│   ├── csv_body_ver_0003001.html     ← CSV main UI
│   ├── pdf_body_ver_0003011.html     ← PDF main UI
│   └── editors/
│       ├── json_editor_ver_0004001.html  ← JSON editor/viewer
│       ├── csv_editor_ver_0003001.html   ← CSV editor/viewer
│       └── pdf_editor_ver_0003011.html   ← PDF hide-element config
├── js/
│   ├── json_handler.js
│   ├── csv_handler.js
│   ├── pdf_handler.js
│   └── pdf_config.js
└── css/
    ├── json_style.css
    ├── csv_style.css
    └── pdf_style.css
```

## How to Open Locally

Simply open any HTML file directly in your browser — no server needed.

### JSON Module
- Open `components/json_body_ver_0004001.html` in your browser.
- Add/remove rows in the editable table.
- Click **Import JSON** to load a `.json` file.
- Click **Export JSON** to download the table as a JSON file.
- Click **Open JSON Editor** to view/edit the raw JSON and validate syntax.

### CSV Module
- Open `components/csv_body_ver_0003001.html` in your browser.
- Add/remove rows in the editable table.
- Select the delimiter (comma, semicolon, or tab).
- Click **Import CSV** to load a `.csv` file.
- Click **Export CSV** to download the table as a CSV file.
- Click **Open CSV Editor** to edit the raw CSV text and preview it.

### PDF Module
- Open `components/pdf_body_ver_0003011.html` in your browser.
- Add/remove rows in the editable table.
- Click **Configure PDF** to open the PDF editor and select which elements to hide.
- Click **Export / Print** to open the browser's print dialog (Save as PDF).

## Notes

- All CSS classes are namespaced: `json_*`, `csv_*`, `pdf_*` to prevent conflicts.
- The PDF editor uses a hybrid approach: CSS-rule analysis + smart DOM detection to suggest elements to hide before printing.
- Editor pages communicate with the body page via `sessionStorage` (same-origin).

