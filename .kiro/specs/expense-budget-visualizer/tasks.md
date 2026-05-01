# Implementation Plan: Expense & Budget Visualizer

## Overview

Implement a single-page, client-side expense tracker as three files: `index.html`, `css/styles.css`, and `js/app.js`. No build step, no framework, no test files. All logic lives in a single IIFE in `app.js`. Chart.js is loaded via CDN. Data persists to `localStorage`.

## Tasks

- [x] 1. Scaffold project files
  - Create `index.html` with the full HTML structure: `<header>` containing `#balance-display`, `<main>` with `#form-section`, `#chart-section`, and `#list-section`, the Chart.js CDN `<script>` tag, and the `<script src="js/app.js">` tag
  - Include all required element IDs: `transaction-form`, `item-name`, `item-amount`, `item-category`, `form-errors` (with `aria-live="polite"`), `spending-chart`, `chart-empty-msg` (hidden), `transaction-list` (with `aria-label`), `list-empty-msg`, `storage-error-banner`
  - Create `css/styles.css` as an empty file (linked from `index.html` via `<link>`)
  - Create `js/app.js` as an IIFE skeleton with eight comment-banner sections: Constants, StorageManager, StateManager, Validator, Renderer, ChartManager, EventHandlers, Init
  - _Requirements: 1.1, 2.1, 2.5, 4.4, 5.4, 6.2_

- [x] 2. Implement Constants and StorageManager
  - [x] 2.1 Define Constants
    - Inside the IIFE, declare `STORAGE_KEY = 'ebv_transactions'`, `CATEGORIES = ['Food', 'Transport', 'Fun']`, and `CATEGORY_COLORS = { Food: '#FF6384', Transport: '#36A2EB', Fun: '#FFCE56' }`
    - _Requirements: 1.1, 4.5_
  - [x] 2.2 Implement StorageManager
    - Implement `StorageManager.load()`: wrap `localStorage.getItem` + `JSON.parse` in try/catch; return `[]` and inject a message into `#storage-error-banner` on any error; return `[]` when key is absent
    - Implement `StorageManager.save(txns)`: wrap `localStorage.setItem(STORAGE_KEY, JSON.stringify(txns))` in try/catch; on quota or other error, show a non-blocking warning in `#storage-error-banner` without throwing
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 3. Implement StateManager
  - Implement `StateManager.init(txns)`: store the provided array in a closure variable
  - Implement `StateManager.getAll()`: return the current in-memory array
  - Implement `StateManager.add(txn)`: push `txn`, call `StorageManager.save`, call `Renderer.renderAll`
  - Implement `StateManager.remove(id)`: filter out the matching id, call `StorageManager.save`, call `Renderer.renderAll`
  - _Requirements: 1.2, 2.4, 5.1, 5.2_

- [x] 4. Implement Validator
  - Implement `Validator.validate(name, amount, category)`:
    - Return `null` when all three fields pass their rules
    - Return an array of `{ field, message }` objects for each failing rule: name empty/whitespace → `"Item name is required."`; amount not finite or ≤ 0 → `"Amount must be a positive number."`; category not in `CATEGORIES` → `"Please select a category."`
  - _Requirements: 1.3, 1.4_

- [x] 5. Implement Renderer
  - [x] 5.1 Implement `Renderer.renderList(txns)`
    - Clear `#transaction-list`; if `txns` is empty show `#list-empty-msg`, otherwise hide it
    - For each transaction build a `<li>` with `data-id` attribute showing name, amount formatted to two decimal places, and category; include a `<button data-action="delete">` delete control
    - _Requirements: 2.1, 2.2, 2.5_
  - [x] 5.2 Implement `Renderer.renderBalance(txns)`
    - Sum all `txn.amount` values; update `#balance-display` text to the sum formatted to two decimal places
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  - [x] 5.3 Implement `Renderer.showFormErrors(errs)` and `Renderer.clearFormErrors()`
    - `showFormErrors`: inject one `<p class="error-msg">` per error into `#form-errors`
    - `clearFormErrors`: empty `#form-errors`
    - _Requirements: 1.4_
  - [x] 5.4 Implement `Renderer.renderAll(txns)`
    - Call `renderList(txns)`, `renderBalance(txns)`, `ChartManager.update(txns)` in sequence
    - _Requirements: 1.2, 2.4, 3.2, 3.3, 4.2, 4.3_

- [x] 6. Implement ChartManager
  - [x] 6.1 Implement `ChartManager.init(canvas)`
    - Guard with `if (typeof Chart === 'undefined')`: hide the canvas and show a static fallback message, then return early
    - Otherwise create a `new Chart(canvas, { type: 'pie', ... })` instance stored in a closure variable; configure labels from `CATEGORIES`, `backgroundColor` from `CATEGORY_COLORS`, initial data `[0, 0, 0]`, `responsive: true`, legend at bottom
    - _Requirements: 4.1, 4.5, 6.2_
  - [x] 6.2 Implement `ChartManager.update(txns)`
    - Compute per-category totals using `CATEGORIES.reduce`
    - Mutate `chartInstance.data.datasets[0].data` in place and call `chartInstance.update()`
    - Toggle `#chart-empty-msg` visibility and canvas `display` style based on `txns.length === 0`
    - Guard against null `chartInstance` (CDN failed)
    - _Requirements: 4.2, 4.3, 4.4_

- [x] 7. Implement EventHandlers
  - [x] 7.1 Implement `EventHandlers.onFormSubmit(e)`
    - Call `e.preventDefault()`; read `item-name`, `item-amount` (as `parseFloat`), `item-category` from the DOM
    - Call `Renderer.clearFormErrors()`; run `Validator.validate`; if errors call `Renderer.showFormErrors` and return
    - Build a Transaction object: `id` via `crypto.randomUUID()` with fallback `Date.now().toString(36) + Math.random().toString(36).slice(2)`, `name` (trimmed), `amount`, `category`, `timestamp: Date.now()`
    - Call `StateManager.add(txn)` then `e.target.reset()`
    - _Requirements: 1.2, 1.3, 1.4, 1.5_
  - [x] 7.2 Implement `EventHandlers.onDeleteClick(e)`
    - Check `e.target.dataset.action === 'delete'`; if not, return
    - Read `id` from `e.target.closest('li').dataset.id`
    - Call `StateManager.remove(id)`
    - _Requirements: 2.4, 3.3, 5.2_

- [x] 8. Implement Init and wire everything together
  - Implement `init()`: call `StorageManager.load()`, `StateManager.init(txns)`, `ChartManager.init(canvas)`, `Renderer.renderAll(txns)`, attach `submit` listener on `#transaction-form` to `EventHandlers.onFormSubmit`, attach `click` listener on `#transaction-list` to `EventHandlers.onDeleteClick` (event delegation)
  - Register `init` on `document.addEventListener('DOMContentLoaded', init)`
  - _Requirements: 5.3, 5.4, 1.2, 2.4_

- [x] 9. Checkpoint — verify wiring end-to-end
  - Open `index.html` in a browser; confirm the form renders, adding a transaction updates the list, balance, and chart, deleting a transaction removes it, and refreshing the page restores persisted data
  - Ensure all console errors are resolved before proceeding

- [x] 10. Style with CSS
  - [x] 10.1 Layout and typography
    - Style `body` with a readable font stack, max-width container centered on the page, and consistent spacing
    - Style `header` to display the app title and `#balance-display` side by side or stacked on small screens
    - _Requirements: 7.1, 7.3_
  - [x] 10.2 Form styles
    - Style `#form-section` inputs, select, and submit button with consistent sizing, border, focus ring, and spacing
    - Style `.error-msg` in red with appropriate font size; style `#form-errors` container
    - _Requirements: 1.1, 1.4_
  - [x] 10.3 Transaction list styles
    - Style `#list-section` and `#transaction-list` with a max-height and `overflow-y: auto` for scrollability
    - Style each `<li>` to display name, amount, and category in a readable row with the delete button aligned to the right
    - Style `#list-empty-msg` in a muted color
    - _Requirements: 2.1, 2.3, 2.5_
  - [x] 10.4 Chart and balance display styles
    - Style `#chart-section` to constrain the canvas to a reasonable max-width
    - Style `#balance-display` with prominent font size and weight
    - Style `#storage-error-banner` as a visible warning/error banner (hidden by default via CSS; shown by JS)
    - _Requirements: 3.1, 4.1, 5.4_
  - [x] 10.5 Responsive styles
    - Add a media query (e.g., `max-width: 600px`) to stack the chart and list sections vertically and adjust form field widths to full-width
    - _Requirements: 7.1, 7.3_

- [x] 11. Final checkpoint — cross-browser and edge-case review
  - Verify the app loads and functions in Chrome, Firefox, Edge, and Safari
  - Confirm error states render correctly: invalid form submission shows inline errors, localStorage failure shows the banner, Chart.js CDN failure shows the fallback message
  - Ensure all tests pass, ask the user if questions arise.
  - _Requirements: 5.4, 6.1, 6.2_

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP — there are none here per project constraints (no test files)
- All code lives in the IIFE in `js/app.js`; no globals are exposed
- Each task references specific requirements for traceability
- Checkpoints (tasks 9 and 11) ensure incremental validation before moving on
