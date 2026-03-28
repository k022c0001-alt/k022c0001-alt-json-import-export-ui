/**
 * pdf_config.js
 * Hybrid PDF hide-element selector:
 *   Method 1 – CSS-rule analysis: scans all loaded stylesheets for selectors
 *   Method 2 – Smart DOM detection: finds interactive/UI elements by tag/class patterns
 *
 * Used by pdf_editor_ver_0003011.html
 */

'use strict';

/* =========================================================================
   CSS Analysis
   ========================================================================= */

/**
 * Scan all same-origin stylesheets and collect selectors that already have
 * display:none, visibility:hidden, or look like "no-print" utilities.
 * @returns {Array<{selector: string, reason: string, group: string}>}
 */
function pdf_analyzeCSSRules() {
  const results = [];
  const seen = new Set();

  const noPrintPattern = /no.?print|hide.?print|print.?hide|d-print-none/i;

  Array.from(document.styleSheets).forEach(sheet => {
    let rules;
    try {
      rules = sheet.cssRules || sheet.rules;
    } catch (_) {
      // Cross-origin stylesheet – skip
      return;
    }
    if (!rules) return;

    Array.from(rules).forEach(rule => {
      if (!(rule instanceof CSSStyleRule)) return;
      const sel = rule.selectorText;
      if (!sel || seen.has(sel)) return;

      const style = rule.style;
      let reason = '';

      if (style.display === 'none') {
        reason = 'display:none';
      } else if (style.visibility === 'hidden') {
        reason = 'visibility:hidden';
      } else if (noPrintPattern.test(sel)) {
        reason = 'no-print class';
      }

      if (reason) {
        seen.add(sel);
        results.push({ selector: sel, reason, group: 'CSS Rules' });
      }
    });
  });

  return results;
}

/* =========================================================================
   Smart DOM Detection
   ========================================================================= */

const PDF_SMART_PATTERNS = {
  Buttons: [
    /^button$/i,
    /\bbtn\b/i,
    /button/i,
    /\baction/i,
  ],
  Forms: [
    /^(input|select|textarea|form)$/i,
    /\bform\b/i,
    /\bcontrol\b/i,
  ],
  Toolbars: [
    /toolbar/i,
    /\bmenu\b/i,
    /\bnav\b/i,
    /\bsidebar\b/i,
    /\bheader\b/i,
  ],
  Modals: [
    /modal/i,
    /dialog/i,
    /overlay/i,
    /popup/i,
    /\btoast\b/i,
    /\balert\b/i,
  ],
  Other: [
    /editor/i,
    /debug/i,
    /\bstatus\b/i,
    /\bbadge\b/i,
    /\bnotice\b/i,
  ],
};

/**
 * Walk all elements in the document and suggest CSS selectors based on
 * tag names and class patterns.
 * @param {Document} targetDoc  Document to inspect (may be opener's document)
 * @returns {Object<string, Array<{selector: string, reason: string}>>}
 */
function pdf_smartDetect(targetDoc) {
  const grouped = {};
  const seenSelectors = new Set();

  Object.keys(PDF_SMART_PATTERNS).forEach(group => {
    grouped[group] = [];
  });

  targetDoc.querySelectorAll('*').forEach(el => {
    const tag = el.tagName.toLowerCase();
    const classes = Array.from(el.classList);

    Object.entries(PDF_SMART_PATTERNS).forEach(([group, patterns]) => {
      patterns.forEach(pattern => {
        // Check tag
        if (pattern.test(tag)) {
          // Use tag selector only if element has no classes (too broad otherwise)
          const sel = tag;
          if (!seenSelectors.has(sel)) {
            seenSelectors.add(sel);
            grouped[group].push({ selector: sel, reason: `<${tag}> element` });
          }
        }

        // Check each class
        classes.forEach(cls => {
          if (pattern.test(cls)) {
            const sel = '.' + CSS.escape(cls);
            if (!seenSelectors.has(sel)) {
              seenSelectors.add(sel);
              grouped[group].push({ selector: sel, reason: `class "${cls}" on <${tag}>` });
            }
          }
        });

        // Check id
        if (el.id && pattern.test(el.id)) {
          const sel = '#' + CSS.escape(el.id);
          if (!seenSelectors.has(sel)) {
            seenSelectors.add(sel);
            grouped[group].push({ selector: sel, reason: `id "${el.id}" on <${tag}>` });
          }
        }
      });
    });
  });

  return grouped;
}

/* =========================================================================
   UI Builder
   ========================================================================= */

/**
 * Build the full PDF configuration panel and insert it into `containerEl`.
 *
 * @param {HTMLElement} containerEl  Where to render the panel
 * @param {Document}    targetDoc    Document to inspect (opener or current)
 */
function pdf_buildConfigPanel(containerEl, targetDoc) {
  containerEl.innerHTML = '';

  // ── Section 1: CSS-derived selectors ──────────────────────────────
  const cssItems = pdf_analyzeCSSRules();

  // ── Section 2: Smart detection ────────────────────────────────────
  const smartGroups = pdf_smartDetect(targetDoc);

  // ── Combine into display groups ───────────────────────────────────
  // First render CSS group, then smart groups
  const allGroups = [];

  if (cssItems.length > 0) {
    allGroups.push({
      name: 'CSS-Derived Selectors',
      icon: '🎨',
      items: cssItems.map(i => ({ selector: i.selector, reason: i.reason, badgeClass: 'pdf_reason_css' })),
      defaultChecked: true,
    });
  }

  const smartGroupNames = Object.keys(PDF_SMART_PATTERNS);
  smartGroupNames.forEach(groupName => {
    const items = smartGroups[groupName];
    if (items && items.length > 0) {
      allGroups.push({
        name: groupName,
        icon: groupIconFor(groupName),
        items: items.map(i => ({ selector: i.selector, reason: i.reason, badgeClass: 'pdf_reason_smart' })),
        defaultChecked: false,
      });
    }
  });

  if (allGroups.length === 0) {
    const msg = document.createElement('p');
    msg.textContent = 'No elements detected. Add a custom selector below.';
    msg.style.color = '#888';
    containerEl.appendChild(msg);
    return;
  }

  allGroups.forEach(group => {
    const fieldset = document.createElement('fieldset');
    fieldset.className = 'pdf_config_fieldset';

    const legend = document.createElement('legend');
    legend.className = 'pdf_config_legend';
    legend.innerHTML = `${group.icon} ${group.name} <span class="pdf_badge">${group.items.length}</span>`;
    fieldset.appendChild(legend);

    const selectAllBtn = document.createElement('button');
    selectAllBtn.type = 'button';
    selectAllBtn.className = 'pdf_select_all_btn';
    selectAllBtn.textContent = 'Select all';
    selectAllBtn.addEventListener('click', () => {
      fieldset.querySelectorAll('input[type="checkbox"]').forEach(cb => { cb.checked = true; });
    });
    fieldset.appendChild(selectAllBtn);

    const list = document.createElement('div');
    list.className = 'pdf_checkbox_list';

    group.items.forEach(item => {
      const label = document.createElement('label');
      label.className = 'pdf_checkbox_label';

      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.value = item.selector;
      cb.checked = group.defaultChecked;
      cb.dataset.pdfSelector = '1';

      const span = document.createElement('span');
      span.className = 'pdf_selector_text';
      span.textContent = item.selector;

      const badge = document.createElement('span');
      badge.className = `pdf_reason_badge ${item.badgeClass}`;
      badge.textContent = item.reason;

      label.appendChild(cb);
      label.appendChild(span);
      label.appendChild(badge);
      list.appendChild(label);
    });

    fieldset.appendChild(list);
    containerEl.appendChild(fieldset);
  });
}

function groupIconFor(name) {
  const icons = { Buttons: '🔘', Forms: '📝', Toolbars: '🛠️', Modals: '📦', Other: '🔧' };
  return icons[name] || '📄';
}

/* =========================================================================
   Collect selected selectors
   ========================================================================= */

/**
 * @param {HTMLElement} containerEl
 * @returns {string[]}
 */
function pdf_getSelectedSelectors(containerEl) {
  return Array.from(containerEl.querySelectorAll('input[data-pdf-selector]:checked'))
    .map(cb => cb.value)
    .filter(Boolean);
}

/* =========================================================================
   Preview
   ========================================================================= */

const PDF_PREVIEW_STYLE_ID = 'pdf_preview_injected_style';

/**
 * Apply (or remove) temporary display:none styles so the user can see which
 * elements will be hidden before printing.
 *
 * @param {string[]} selectors
 * @param {Document} targetDoc
 */
function pdf_applyPreview(selectors, targetDoc) {
  // Remove previous
  const prev = targetDoc.getElementById(PDF_PREVIEW_STYLE_ID);
  if (prev) prev.remove();

  if (selectors.length === 0) return;

  const style = targetDoc.createElement('style');
  style.id = PDF_PREVIEW_STYLE_ID;
  let css = '';
  selectors.forEach(sel => {
    css += `${sel} { display: none !important; }\n`;
  });
  style.textContent = css;
  targetDoc.head.appendChild(style);
}

/**
 * Remove any preview styles.
 * @param {Document} targetDoc
 */
function pdf_removePreview(targetDoc) {
  const el = targetDoc.getElementById(PDF_PREVIEW_STYLE_ID);
  if (el) el.remove();
}

/* =========================================================================
   Export (print with @media print rules)
   ========================================================================= */

/**
 * Inject @media print CSS, call window.print(), then clean up.
 *
 * @param {string[]} selectors
 * @param {Window}   targetWin
 */
function pdf_exportWithConfig(selectors, targetWin) {
  const doc    = targetWin.document;
  const styleEl = doc.createElement('style');
  let css = '@media print {\n';
  selectors.forEach(sel => {
    css += `  ${sel} { display: none !important; }\n`;
  });
  css += '}\n';
  styleEl.textContent = css;
  doc.head.appendChild(styleEl);

  targetWin.focus();
  targetWin.print();

  setTimeout(() => styleEl.remove(), 2000);
}

/**
 * Save selected selectors to sessionStorage so the body page can use them
 * when the user clicks "Print" directly.
 *
 * @param {string[]} selectors
 */
function pdf_saveConfigToSession(selectors) {
  sessionStorage.setItem('pdf_print_config', JSON.stringify({ selectors }));
}
