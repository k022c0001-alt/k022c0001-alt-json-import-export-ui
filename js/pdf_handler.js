/**
 * pdf_handler.js
 * Handles PDF table editing and printing.
 * PDF configuration (hide-element selector) is in pdf_config.js and used by the editor page.
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
  const tableEl  = document.getElementById('pdf_table');
  const statusEl = document.getElementById('pdf_status');

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
    thDel.className = 'pdf_row_actions';
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
      tdDel.className = 'pdf_row_actions';
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

  window.pdf_openEditor = function () {
    saveToSession();
    window.open('../components/editors/pdf_editor_ver_0003011.html', '_blank');
  };

  window.pdf_print = function () {
    // Apply any saved print config before printing
    const configRaw = sessionStorage.getItem('pdf_print_config');
    let styleEl = null;
    if (configRaw) {
      try {
        const config = JSON.parse(configRaw);
        if (Array.isArray(config.selectors) && config.selectors.length > 0) {
          styleEl = document.createElement('style');
          let css = '@media print {\n';
          config.selectors.forEach(sel => {
            css += `  ${sel} { display: none !important; }\n`;
          });
          css += '}\n';
          styleEl.textContent = css;
          document.head.appendChild(styleEl);
        }
      } catch (_) { /* ignore */ }
    }
    window.print();
    if (styleEl) {
      setTimeout(() => styleEl.remove(), 1500);
    }
  };

  // ── Init ─────────────────────────────────────────────────────────────
  loadFromSession();
  render();

})();
