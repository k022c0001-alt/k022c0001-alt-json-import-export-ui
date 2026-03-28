/**
 * csv_handler.js
 * Handles CSV table editing, import, export, delimiter selection, and editor communication.
 */

'use strict';

(function () {
  // ── State ──────────────────────────────────────────────────────────
  let columns   = ['Name', 'Value', 'Description'];
  let rows      = [
    ['Alice', '100', 'First entry'],
    ['Bob',   '200', 'Second entry'],
  ];
  let delimiter = ',';

  // ── DOM refs ────────────────────────────────────────────────────────
  const tableEl       = document.getElementById('csv_table');
  const statusEl      = document.getElementById('csv_status');
  const fileInput     = document.getElementById('csv_file_input');
  const delimiterSel  = document.getElementById('csv_delimiter');

  // ── Delimiter sync ───────────────────────────────────────────────────
  if (delimiterSel) {
    delimiterSel.addEventListener('change', () => {
      delimiter = delimiterSel.value;
      saveToSession();
    });
  }

  // ── Render ──────────────────────────────────────────────────────────
  function render() {
    tableEl.innerHTML = '';

    // Header
    const thead = tableEl.createTHead();
    const hrow  = thead.insertRow();

    columns.forEach((col, ci) => {
      const th = document.createElement('th');
      const input = document.createElement('input');
      input.className = 'csv_col_header_input';
      input.value = col;
      input.title = 'Click to rename column';
      input.addEventListener('change', () => {
        columns[ci] = input.value.trim() || `Col${ci + 1}`;
        saveToSession();
      });
      th.appendChild(input);
      hrow.appendChild(th);
    });

    const thDel = document.createElement('th');
    thDel.className = 'csv_row_actions';
    hrow.appendChild(thDel);

    // Body
    const tbody = tableEl.createTBody();
    rows.forEach((row, ri) => {
      const tr = tbody.insertRow();

      columns.forEach((_, ci) => {
        const td = tr.insertCell();
        const input = document.createElement('input');
        input.className = 'csv_cell_input';
        input.value = row[ci] !== undefined ? row[ci] : '';
        input.addEventListener('input', () => {
          rows[ri][ci] = input.value;
          saveToSession();
        });
        td.appendChild(input);
      });

      // Delete row
      const tdDel = tr.insertCell();
      tdDel.className = 'csv_row_actions';
      const delBtn = document.createElement('button');
      delBtn.className = 'csv_btn_row_delete';
      delBtn.title = 'Delete row';
      delBtn.innerHTML = '✕';
      delBtn.addEventListener('click', () => {
        rows.splice(ri, 1);
        render();
        saveToSession();
        showStatus('Row deleted.', 'success');
      });
      tdDel.appendChild(delBtn);
    });
  }

  // ── Session storage ─────────────────────────────────────────────────
  function saveToSession() {
    const data = { columns, rows, delimiter };
    sessionStorage.setItem('csv_handler_data', JSON.stringify(data));
  }

  function loadFromSession() {
    const raw = sessionStorage.getItem('csv_handler_data');
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      if (Array.isArray(data.columns)) columns   = data.columns;
      if (Array.isArray(data.rows))    rows      = data.rows;
      if (data.delimiter)              delimiter = data.delimiter;
      if (delimiterSel) delimiterSel.value = delimiter;
    } catch (_) { /* ignore */ }
  }

  // ── CSV serialisation ────────────────────────────────────────────────
  function escapeField(value, sep) {
    const s = String(value);
    if (s.includes(sep) || s.includes('"') || s.includes('\n')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  }

  function buildCSVString(sep) {
    const lines = [];
    lines.push(columns.map(c => escapeField(c, sep)).join(sep));
    rows.forEach(row => {
      lines.push(columns.map((_, ci) => escapeField(row[ci] || '', sep)).join(sep));
    });
    return lines.join('\r\n');
  }

  // ── CSV parse ────────────────────────────────────────────────────────
  function parseCSV(text, sep) {
    // Simple RFC 4180 parser
    const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    const result = [];
    for (const line of lines) {
      if (line.trim() === '') continue;
      result.push(parseCSVLine(line, sep));
    }
    return result;
  }

  function parseCSVLine(line, sep) {
    const fields = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          if (line[i + 1] === '"') { cur += '"'; i++; }
          else inQuotes = false;
        } else {
          cur += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === sep) {
          fields.push(cur);
          cur = '';
        } else {
          cur += ch;
        }
      }
    }
    fields.push(cur);
    return fields;
  }

  function loadFromCSVText(text, sep) {
    const parsed = parseCSV(text, sep);
    if (parsed.length === 0) throw new Error('Empty CSV.');
    columns = parsed[0];
    rows = parsed.slice(1).map(row => {
      // Pad or trim to match column count
      const r = [];
      for (let i = 0; i < columns.length; i++) {
        r.push(row[i] !== undefined ? row[i] : '');
      }
      return r;
    });
  }

  // ── Status ───────────────────────────────────────────────────────────
  function showStatus(msg, type) {
    statusEl.textContent = msg;
    statusEl.className = `csv_status csv_status_show csv_status_${type}`;
    clearTimeout(statusEl._timer);
    statusEl._timer = setTimeout(() => {
      statusEl.className = 'csv_status';
    }, 4000);
  }

  // ── Utility ──────────────────────────────────────────────────────────
  function timestamp() {
    return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  }

  // ── Public API ────────────────────────────────────────────────────────

  window.csv_addRow = function () {
    rows.push(columns.map(() => ''));
    render();
    saveToSession();
    showStatus('New row added.', 'success');
  };

  window.csv_addColumn = function () {
    const name = `Col${columns.length + 1}`;
    columns.push(name);
    rows.forEach(row => row.push(''));
    render();
    saveToSession();
    showStatus(`Column "${name}" added.`, 'success');
  };

  window.csv_exportCSV = function () {
    const sep  = delimiter;
    const text = buildCSVString(sep);
    const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `export_${timestamp()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showStatus('CSV exported successfully.', 'success');
  };

  window.csv_importCSV = function () {
    fileInput.value = '';
    fileInput.click();
  };

  window.csv_openEditor = function () {
    saveToSession();
    const sep  = delimiter;
    const text = buildCSVString(sep);
    sessionStorage.setItem('csv_editor_content', text);
    sessionStorage.setItem('csv_editor_delimiter', sep);
    window.open('../components/editors/csv_editor_ver_0003001.html', '_blank');
  };

  // File input
  if (fileInput) {
    fileInput.addEventListener('change', () => {
      const file = fileInput.files[0];
      if (!file) return;
      showStatus('Loading…', 'info');
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          loadFromCSVText(e.target.result, delimiter);
          render();
          saveToSession();
          showStatus(`Imported ${rows.length} rows from "${file.name}".`, 'success');
        } catch (err) {
          showStatus(`Import failed: ${err.message}`, 'error');
        }
      };
      reader.readAsText(file);
    });
  }

  // ── Init ─────────────────────────────────────────────────────────────
  loadFromSession();
  render();

})();
