(function () {
  'use strict';

  // ── Constants ──────────────────────────────────────────────

  const STORAGE_KEY = 'ebv_transactions';
  const THEME_STORAGE_KEY = 'ebv_theme';
  const SPENDING_LIMIT_KEY = 'ebv_spending_limit';
  const CATEGORIES = ['Food', 'Transport', 'Fun'];
  const CATEGORY_COLORS = {
    Food: '#FF6384',
    Transport: '#36A2EB',
    Fun: '#FFCE56'
  };

  // ── getSortedTransactions ──────────────────────────────────

  /**
   * Return a sorted shallow copy of the transaction array.
   * Never mutates the input array.
   * @param {Array} txns - Array of transaction objects
   * @param {string} sortOrder - "amount", "category", or "" (insertion order)
   * @returns {Array} A new sorted array
   */
  function getSortedTransactions(txns, sortOrder) {
    if (sortOrder === 'amount') {
      return txns.slice().sort(function (a, b) { return a.amount - b.amount; });
    }
    if (sortOrder === 'category') {
      return txns.slice().sort(function (a, b) {
        return a.category.localeCompare(b.category);
      });
    }
    // Default / empty: return original insertion order
    return txns.slice();
  }

  // ── StorageManager ─────────────────────────────────────────

  const StorageManager = {
    /**
     * Load transactions from localStorage.
     * Returns [] and shows an error banner if the key is absent or parsing fails.
     * @returns {Array} Array of transaction objects (never throws)
     */
    load() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw === null) {
          return [];
        }
        return JSON.parse(raw);
      } catch (err) {
        console.error('[StorageManager.load] Failed to read from localStorage:', err);
        const banner = document.getElementById('storage-error-banner');
        if (banner) {
          banner.textContent = 'Unable to load saved expenses. Your data may be unavailable.';
          banner.hidden = false;
        }
        return [];
      }
    },

    /**
     * Persist transactions to localStorage.
     * Shows a non-blocking warning banner on quota or other errors without throwing.
     * @param {Array} txns - Array of transaction objects to save
     */
    save(txns) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(txns));
      } catch (err) {
        console.error('[StorageManager.save] Failed to write to localStorage:', err);
        const banner = document.getElementById('storage-error-banner');
        if (banner) {
          banner.textContent = 'Warning: Your expenses could not be saved. Storage may be full or unavailable.';
          banner.hidden = false;
        }
      }
    }
  };

  // ── ThemeManager ──────────────────────────────────────────

  const ThemeManager = {
    /**
     * Apply the given theme to the document.
     * Adds `.dark-mode` to <body> when theme === 'dark', removes it otherwise.
     * Updates the #theme-toggle button label accordingly.
     * @param {string} theme - 'dark' or 'light'
     */
    applyTheme(theme) {
      if (theme === 'dark') {
        document.body.classList.add('dark-mode');
        const btn = document.getElementById('theme-toggle');
        if (btn) btn.textContent = 'Light Mode';
      } else {
        document.body.classList.remove('dark-mode');
        const btn = document.getElementById('theme-toggle');
        if (btn) btn.textContent = 'Dark Mode';
      }
    },

    /**
     * Toggle between dark and light mode.
     * Reads current state from <body>, flips it, applies the new theme,
     * and persists the value to localStorage. localStorage errors are
     * silently swallowed.
     */
    toggle() {
      const isDark = document.body.classList.contains('dark-mode');
      const newTheme = isDark ? 'light' : 'dark';
      ThemeManager.applyTheme(newTheme);
      try {
        localStorage.setItem(THEME_STORAGE_KEY, newTheme);
      } catch (err) {
        // Silently ignore localStorage errors (e.g. private browsing quota)
      }
    },

    /**
     * Initialise the theme from localStorage on page load.
     * Applies dark mode if the stored value is 'dark', otherwise defaults
     * to light mode. localStorage errors are silently swallowed.
     */
    init() {
      try {
        const stored = localStorage.getItem(THEME_STORAGE_KEY);
        if (stored === 'dark') {
          ThemeManager.applyTheme('dark');
        } else {
          ThemeManager.applyTheme('light');
        }
      } catch (err) {
        // Silently fall back to light mode if localStorage is unavailable
        ThemeManager.applyTheme('light');
      }
    }
  };

  // ── StateManager ───────────────────────────────────────────

  let transactions = [];

  const StateManager = {
    /**
     * Initialise the in-memory store from a pre-loaded array.
     * @param {Array} txns - Array of transaction objects (e.g. from StorageManager.load)
     */
    init(txns) {
      transactions = txns;
    },

    /**
     * Return the current in-memory transaction array.
     * @returns {Array}
     */
    getAll() {
      return transactions;
    },

    /**
     * Add a transaction, persist to storage, and re-render the UI.
     * @param {Object} txn - A valid Transaction object
     */
    add(txn) {
      transactions.push(txn);
      StorageManager.save(transactions);
      Renderer.renderAll(transactions);
    },

    /**
     * Remove the transaction with the given id, persist, and re-render.
     * @param {string} id - The id of the transaction to remove
     */
    remove(id) {
      transactions = transactions.filter(t => t.id !== id);
      StorageManager.save(transactions);
      Renderer.renderAll(transactions);
    }
  };

  // ── Validator ──────────────────────────────────────────────

  const Validator = {
    /**
     * Validate the three transaction form fields.
     *
     * @param {string} name     - Raw value from the item-name input
     * @param {number} amount   - Parsed float from the item-amount input
     * @param {string} category - Selected value from the item-category select
     * @returns {null|Array<{field: string, message: string}>}
     *   null when all fields are valid; otherwise an array of error objects,
     *   one per failing field, in the order: name → amount → category.
     */
    validate(name, amount, category) {
      const errors = [];

      if (!name || name.trim().length === 0) {
        errors.push({ field: 'name', message: 'Item name is required.' });
      }

      if (!isFinite(amount) || amount <= 0) {
        errors.push({ field: 'amount', message: 'Amount must be a positive number.' });
      }

      if (!CATEGORIES.includes(category)) {
        errors.push({ field: 'category', message: 'Please select a category.' });
      }

      return errors.length === 0 ? null : errors;
    }
  };

  // ── SpendingLimitManager ───────────────────────────────────

  const SpendingLimitManager = {
    /**
     * Persist a positive number as the spending limit.
     * Silently ignores localStorage errors.
     * @param {number} value
     */
    save(value) {
      try {
        localStorage.setItem(SPENDING_LIMIT_KEY, String(value));
      } catch (err) { /* ignore */ }
    },

    /**
     * Remove the spending limit from localStorage.
     * Silently ignores localStorage errors.
     */
    clear() {
      try {
        localStorage.removeItem(SPENDING_LIMIT_KEY);
      } catch (err) { /* ignore */ }
    },

    /**
     * Return the stored spending limit as a positive number,
     * or null if no limit is set or localStorage is unavailable.
     * @returns {number|null}
     */
    getLimit() {
      try {
        const raw = localStorage.getItem(SPENDING_LIMIT_KEY);
        if (raw === null) return null;
        const parsed = parseFloat(raw);
        return (isFinite(parsed) && parsed > 0) ? parsed : null;
      } catch (err) {
        return null;
      }
    },

    /**
     * Populate #spending-limit-input from localStorage on page load.
     */
    init() {
      const limit = SpendingLimitManager.getLimit();
      const input = document.getElementById('spending-limit-input');
      if (input && limit !== null) {
        input.value = String(limit);
      }
    }
  };

  // ── Renderer ───────────────────────────────────────────────

  const Renderer = {
    /**
     * Rebuild the #transaction-list DOM from the given array.
     * Shows #list-empty-msg when the array is empty, hides it otherwise.
     * Each <li> carries a data-id attribute and a delete button.
     * @param {Array} txns
     */
    renderList(txns) {
      const list = document.getElementById('transaction-list');
      const emptyMsg = document.getElementById('list-empty-msg');

      // Clear existing items
      list.innerHTML = '';

      if (txns.length === 0) {
        if (emptyMsg) emptyMsg.hidden = false;
        return;
      }

      if (emptyMsg) emptyMsg.hidden = true;

      const limit = SpendingLimitManager.getLimit();

      txns.forEach(txn => {
        const li = document.createElement('li');
        li.dataset.id = txn.id;

        const nameSpan = document.createElement('span');
        nameSpan.className = 'txn-name';
        nameSpan.textContent = txn.name;

        const amountSpan = document.createElement('span');
        amountSpan.className = 'txn-amount';
        amountSpan.textContent = txn.amount.toFixed(2);

        const categorySpan = document.createElement('span');
        categorySpan.className = 'txn-category';
        categorySpan.textContent = txn.category;

        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.dataset.action = 'delete';
        deleteBtn.textContent = 'Delete';
        deleteBtn.setAttribute('aria-label', 'Delete ' + txn.name);

        li.appendChild(nameSpan);
        li.appendChild(amountSpan);
        li.appendChild(categorySpan);
        li.appendChild(deleteBtn);

        // ── Spending limit highlight ──────────────────────────
        if (limit !== null && txn.amount > limit) {
          li.classList.add('over-limit');
          const badge = document.createElement('span');
          badge.className = 'over-limit-badge';
          badge.textContent = 'Over limit';
          li.appendChild(badge);
        }
        // ─────────────────────────────────────────────────────

        list.appendChild(li);
      });
    },

    /**
     * Sum all transaction amounts and update #balance-display.
     * Displays the total formatted to two decimal places with a $ prefix.
     * @param {Array} txns
     */
    renderBalance(txns) {
      const total = txns.reduce((sum, txn) => sum + txn.amount, 0);
      const display = document.getElementById('balance-display');
      if (display) {
        display.textContent = '$' + total.toFixed(2);
      }
    },

    /**
     * Inject one <p class="error-msg"> per error into #form-errors.
     * @param {Array<{field: string, message: string}>} errs
     */
    showFormErrors(errs) {
      const container = document.getElementById('form-errors');
      if (!container) return;
      errs.forEach(function (err) {
        const p = document.createElement('p');
        p.className = 'error-msg';
        p.textContent = err.message;
        container.appendChild(p);
      });
    },

    /**
     * Clear all content from #form-errors.
     */
    clearFormErrors() {
      const container = document.getElementById('form-errors');
      if (container) {
        container.innerHTML = '';
      }
    },

    /**
     * Full UI refresh: list (sorted), balance, and chart — in that order.
     * Reads the active sort selection from the DOM so that add/delete
     * operations respect the current sort. Balance and chart always receive
     * the original (unsorted) array.
     * @param {Array} txns
     */
    renderAll(txns) {
      const sortOrder = (document.getElementById('sort-option') || {}).value || '';
      Renderer.renderList(getSortedTransactions(txns, sortOrder));
      Renderer.renderBalance(txns);
      ChartManager.update(txns);
    }
  };

  // ── ChartManager ───────────────────────────────────────────

  let chartInstance = null;

  const ChartManager = {
    /**
     * Initialise the Chart.js pie chart on the given canvas element.
     * If Chart.js failed to load from CDN, hides the canvas and shows a
     * static fallback message instead.
     * @param {HTMLCanvasElement} canvas
     */
    init(canvas) {
      if (typeof Chart === 'undefined') {
        // CDN failed — hide canvas and show fallback
        if (canvas) canvas.style.display = 'none';
        const emptyMsg = document.getElementById('chart-empty-msg');
        if (emptyMsg) {
          emptyMsg.textContent = 'Chart unavailable: charting library could not be loaded.';
          emptyMsg.hidden = false;
        }
        return;
      }

      chartInstance = new Chart(canvas, {
        type: 'pie',
        data: {
          labels: CATEGORIES,
          datasets: [{
            data: [0, 0, 0],
            backgroundColor: CATEGORIES.map(function (c) { return CATEGORY_COLORS[c]; })
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { position: 'bottom' }
          }
        }
      });
    },

    /**
     * Recompute per-category totals from the transaction array and push
     * the new data into the existing Chart.js instance.
     * Toggles the empty-state message and canvas visibility based on
     * whether there are any transactions.
     * @param {Array} txns
     */
    update(txns) {
      // Guard: chart was never created (CDN failed)
      if (chartInstance === null) return;

      // Compute per-category totals
      const totals = CATEGORIES.reduce(function (acc, cat) {
        acc[cat] = txns
          .filter(function (t) { return t.category === cat; })
          .reduce(function (sum, t) { return sum + t.amount; }, 0);
        return acc;
      }, {});

      // Mutate chart data in place to preserve animations
      chartInstance.data.datasets[0].data = CATEGORIES.map(function (c) { return totals[c]; });
      chartInstance.update();

      // Toggle empty-state message and canvas visibility
      const isEmpty = txns.length === 0;
      const canvas = chartInstance.canvas;
      const emptyMsg = document.getElementById('chart-empty-msg');

      if (canvas) canvas.style.display = isEmpty ? 'none' : 'block';
      if (emptyMsg) emptyMsg.hidden = !isEmpty;
    }
  };

  // ── EventHandlers ──────────────────────────────────────────

  const EventHandlers = {
    /**
     * Handle form submission: validate inputs, build a Transaction object,
     * and hand it off to StateManager.
     * @param {Event} e - The submit event from #transaction-form
     */
    onFormSubmit(e) {
      e.preventDefault();

      const name     = document.getElementById('item-name').value;
      const amount   = parseFloat(document.getElementById('item-amount').value);
      const category = document.getElementById('item-category').value;

      Renderer.clearFormErrors();

      const errors = Validator.validate(name, amount, category);
      if (errors) {
        Renderer.showFormErrors(errors);
        return;
      }

      const id = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
        ? crypto.randomUUID()
        : Date.now().toString(36) + Math.random().toString(36).slice(2);

      const txn = {
        id: id,
        name:      name.trim(),
        amount:    amount,
        category:  category,
        timestamp: Date.now()
      };

      StateManager.add(txn);
      e.target.reset();
    },

    /**
     * Handle sort-option change: re-render the list in the selected order.
     * Does NOT update the balance or chart — sort is display-only.
     * @param {Event} e - The change event from #sort-option
     */
    onSortChange(e) {
      const sortOrder = e.target.value;
      const sorted = getSortedTransactions(StateManager.getAll(), sortOrder);
      Renderer.renderList(sorted);
    },

    /**
     * Handle click events on the transaction list via event delegation.
     * Only acts when the clicked element carries data-action="delete".
     * @param {Event} e - The click event bubbled up to #transaction-list
     */
    onDeleteClick(e) {
      if (e.target.dataset.action !== 'delete') return;

      const li = e.target.closest('li');
      if (!li) return;

      const id = li.dataset.id;
      StateManager.remove(id);
    },

    /**
     * Handle input events on #spending-limit-input.
     * Saves or clears the spending limit in localStorage, then re-renders.
     * @param {Event} e - The input event from #spending-limit-input
     */
    onLimitChange(e) {
      const raw = e.target.value.trim();
      if (raw === '') {
        SpendingLimitManager.clear();
      } else {
        const parsed = parseFloat(raw);
        if (isFinite(parsed) && parsed > 0) {
          SpendingLimitManager.save(parsed);
        }
      }
      Renderer.renderAll(StateManager.getAll());
    }
  };

  // ── Init ───────────────────────────────────────────────────

  function init() {
    ThemeManager.init();
    const txns = StorageManager.load();
    StateManager.init(txns);
    ChartManager.init(document.getElementById('spending-chart'));
    SpendingLimitManager.init();
    Renderer.renderAll(txns);
    document.getElementById('transaction-form')
      .addEventListener('submit', EventHandlers.onFormSubmit);
    document.getElementById('transaction-list')
      .addEventListener('click', EventHandlers.onDeleteClick);
    document.getElementById('sort-option')
      .addEventListener('change', EventHandlers.onSortChange);
    document.getElementById('theme-toggle')
      .addEventListener('click', ThemeManager.toggle);
    document.getElementById('spending-limit-input')
      .addEventListener('input', EventHandlers.onLimitChange);
  }

  document.addEventListener('DOMContentLoaded', init);

})();
