/**
 * pdf_handler.js
 * Handles PDF table editing, CSS loading/editing/downloading, and printing.
 * Elements with the "no-print" class are hidden at print time via @media print in pdf_style.css.
 */

'use strict';

(function () {
  // ── State ──────────────────────────────────────────────────────────
  let columns = ['Item', 'Quantity', 'Price', 'Notes'];
  let rows = [
    ['Widget A', '10', '$5.00', 'In stock'],
    ['Widget B', '3',  '$12.50', 'Low stock'],
  ];

  // ── DOM refs ────────────────────────────────────────────────────────
  const tableEl    = document.getElementById('pdf_table');
  const statusEl   = document.getElementById('pdf_status');
  const cssTextarea = document.getElementById('pdf_css_textarea');

  // ── Injected custom CSS style element ───────────────────────────────
  let injectedStyleEl = null;

  // ── Render ──────────────────────────────────────────────────────────
  function render() {
    tableEl.innerHTML = '';

    // Header
    const thead = tableEl.createTHead();
    const hrow  = thead.insertRow();

    columns.forEach((col, ci) => {
      const th = document.createElement('th');
      const input = document.createElement('input');
      input.className = 'pdf_col_header_input';
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
    thDel.className = 'pdf_row_actions no-print';
    hrow.appendChild(thDel);

    // Body
    const tbody = tableEl.createTBody();
    rows.forEach((row, ri) => {
      const tr = tbody.insertRow();

      columns.forEach((_, ci) => {
        const td = tr.insertCell();
        const input = document.createElement('input');
        input.className = 'pdf_cell_input';
        input.value = row[ci] !== undefined ? row[ci] : '';
        input.addEventListener('input', () => {
          rows[ri][ci] = input.value;
          saveToSession();
        });
        td.appendChild(input);
      });

      // Delete row
      const tdDel = tr.insertCell();
      tdDel.className = 'pdf_row_actions no-print';
      const delBtn = document.createElement('button');
      delBtn.className = 'pdf_btn_row_delete';
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
    sessionStorage.setItem('pdf_handler_data', JSON.stringify({ columns, rows }));
  }

  function loadFromSession() {
    const raw = sessionStorage.getItem('pdf_handler_data');
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      if (Array.isArray(data.columns)) columns = data.columns;
      if (Array.isArray(data.rows))    rows    = data.rows;
    } catch (_) { /* ignore */ }
  }

  // ── Status ───────────────────────────────────────────────────────────
  function showStatus(msg, type) {
    statusEl.textContent = msg;
    statusEl.className = `pdf_status pdf_status_show pdf_status_${type}`;
    clearTimeout(statusEl._timer);
    statusEl._timer = setTimeout(() => {
      statusEl.className = 'pdf_status';
    }, 4000);
  }

  // ── Public API ────────────────────────────────────────────────────────

  window.pdf_addRow = function () {
    rows.push(columns.map(() => ''));
    render();
    saveToSession();
    showStatus('New row added.', 'success');
  };

  window.pdf_addColumn = function () {
    const name = `Col${columns.length + 1}`;
    columns.push(name);
    rows.forEach(row => row.push(''));
    render();
    saveToSession();
    showStatus(`Column "${name}" added.`, 'success');
  };

  /** Load a CSS file and display it in the textarea. */
  window.pdf_loadCSS = function (input) {
    const file = input.files && input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
      cssTextarea.value = e.target.result;
      showStatus(`CSS loaded: ${file.name}`, 'success');
    };
    reader.onerror = function () {
      showStatus('Failed to read CSS file.', 'error');
    };
    reader.readAsText(file);
    // Reset so the same file can be re-selected
    input.value = '';
  };

  /** Apply the CSS in the textarea to the current page. */
  window.pdf_applyCSS = function () {
    const css = cssTextarea.value.trim();
    if (injectedStyleEl) {
      injectedStyleEl.textContent = css;
    } else {
      injectedStyleEl = document.createElement('style');
      injectedStyleEl.id = 'pdf_injected_css';
      injectedStyleEl.textContent = css;
      document.head.appendChild(injectedStyleEl);
    }
    showStatus('CSS applied.', 'success');
  };

  /** Download the current CSS textarea content as a .css file. */
  window.pdf_downloadCSS = function () {
    const css = cssTextarea.value;
    const blob = new Blob([css], { type: 'text/css' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const ts = new Date().toISOString().slice(0, 16).replace(/[T:]/g, '-');
    a.download = `pdf_custom_${ts}.css`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
    showStatus('CSS downloaded.', 'success');
  };

  /** Print the current page. Elements with .no-print are hidden via @media print CSS. */
  window.pdf_print = function () {
    window.print();
  };

  // ── Init ─────────────────────────────────────────────────────────────
  loadFromSession();
  render();

})();
