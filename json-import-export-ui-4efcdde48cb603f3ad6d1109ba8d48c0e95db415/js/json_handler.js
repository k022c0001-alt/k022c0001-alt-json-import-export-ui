/**
 * json_handler.js
 * Handles JSON table editing, import, export, and editor communication.
 */

'use strict';

(function () {
  // ── State ──────────────────────────────────────────────────────────
  let columns = ['Name', 'Value', 'Description'];
  let rows = [
    ['Alice', '100', 'First entry'],
    ['Bob',   '200', 'Second entry'],
  ];

  // ── DOM refs ────────────────────────────────────────────────────────
  const tableEl   = document.getElementById('json_table');
  const statusEl  = document.getElementById('json_status');
  const fileInput = document.getElementById('json_file_input');

  // ── Render ──────────────────────────────────────────────────────────
  function render() {
    tableEl.innerHTML = '';

    // Header
    const thead = tableEl.createTHead();
    const hrow  = thead.insertRow();

    columns.forEach((col, ci) => {
      const th = document.createElement('th');
      const input = document.createElement('input');
      input.className = 'json_col_header_input';
      input.value = col;
      input.title = 'Click to rename column';
      input.addEventListener('change', () => {
        columns[ci] = input.value.trim() || `Col${ci + 1}`;
        saveToSession();
      });
      th.appendChild(input);
      hrow.appendChild(th);
    });

    // Delete-row column header
    const thDel = document.createElement('th');
    thDel.className = 'json_row_actions';
    thDel.textContent = '';
    hrow.appendChild(thDel);

    // Body
    const tbody = tableEl.createTBody();
    rows.forEach((row, ri) => {
      const tr = tbody.insertRow();

      columns.forEach((_, ci) => {
        const td = tr.insertCell();
        const input = document.createElement('input');
        input.className = 'json_cell_input';
        input.value = row[ci] !== undefined ? row[ci] : '';
        input.addEventListener('input', () => {
          rows[ri][ci] = input.value;
          saveToSession();
        });
        td.appendChild(input);
      });

      // Delete button
      const tdDel = tr.insertCell();
      tdDel.className = 'json_row_actions';
      const delBtn = document.createElement('button');
      delBtn.className = 'json_btn_row_delete';
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
    const data = { columns, rows };
    sessionStorage.setItem('json_handler_data', JSON.stringify(data));
  }

  function loadFromSession() {
    const raw = sessionStorage.getItem('json_handler_data');
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      if (Array.isArray(data.columns)) columns = data.columns;
      if (Array.isArray(data.rows))    rows    = data.rows;
    } catch (_) { /* ignore */ }
  }

  // ── Build JSON object array ──────────────────────────────────────────
  function buildJSONArray() {
    return rows.map(row => {
      const obj = {};
      columns.forEach((col, ci) => {
        obj[col] = row[ci] !== undefined ? row[ci] : '';
      });
      return obj;
    });
  }

  // ── Load from JSON array ─────────────────────────────────────────────
  function loadFromJSONArray(arr) {
    if (!Array.isArray(arr) || arr.length === 0) {
      throw new Error('JSON must be a non-empty array of objects.');
    }
    const first = arr[0];
    if (typeof first !== 'object' || first === null || Array.isArray(first)) {
      throw new Error('Each element must be a JSON object.');
    }
    columns = Object.keys(first);
    rows = arr.map(obj => columns.map(col => {
      const v = obj[col];
      return v === undefined || v === null ? '' : String(v);
    }));
  }

  // ── Status messages ──────────────────────────────────────────────────
  function showStatus(msg, type) {
    statusEl.textContent = msg;
    statusEl.className = `json_status json_status_show json_status_${type}`;
    clearTimeout(statusEl._timer);
    statusEl._timer = setTimeout(() => {
      statusEl.className = 'json_status';
    }, 4000);
  }

  // ── Public API (called from HTML onclick) ────────────────────────────

  window.json_addRow = function () {
    rows.push(columns.map(() => ''));
    render();
    saveToSession();
    showStatus('New row added.', 'success');
  };

  window.json_addColumn = function () {
    const name = `Col${columns.length + 1}`;
    columns.push(name);
    rows.forEach(row => row.push(''));
    render();
    saveToSession();
    showStatus(`Column "${name}" added.`, 'success');
  };

  window.json_exportJSON = function () {
    const arr = buildJSONArray();
    const text = JSON.stringify(arr, null, 2);
    const blob = new Blob([text], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `export_${timestamp()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showStatus('JSON exported successfully.', 'success');
  };

  window.json_importJSON = function () {
    fileInput.value = '';
    fileInput.click();
  };

  window.json_openEditor = function () {
    saveToSession();
    // Store formatted JSON for editor
    const arr  = buildJSONArray();
    const text = JSON.stringify(arr, null, 2);
    sessionStorage.setItem('json_editor_content', text);
    window.open('../components/editors/json_editor_ver_0004001.html', '_blank');
  };

  // File input handler
  if (fileInput) {
    fileInput.addEventListener('change', () => {
      const file = fileInput.files[0];
      if (!file) return;
      showStatus('Loading…', 'info');
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const arr = JSON.parse(e.target.result);
          loadFromJSONArray(arr);
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

  // ── Utility ──────────────────────────────────────────────────────────
  function timestamp() {
    const d = new Date();
    return d.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  }

  // ── Init ─────────────────────────────────────────────────────────────
  loadFromSession();
  render();

})();
