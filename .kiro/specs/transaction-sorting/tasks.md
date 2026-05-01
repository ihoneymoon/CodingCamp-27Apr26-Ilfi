# Implementation Plan: Transaction Sorting

## Overview

Add a sort control above the transaction list that re-orders the displayed expenses by amount (ascending) or category (A–Z). All changes are confined to three existing files: `index.html`, `js/app.js`, and `css/styles.css`. Sorting is display-only — the canonical `StateManager` array and `localStorage` are never touched by sort operations.

## Tasks

- [x] 1. Fix sort markup in `index.html`
  - Replace the broken sort markup inside `#list-section` with a corrected `<div class="sort-bar">` containing a `<label for="sort-option">` and a `<select id="sort-option">` with three options: default placeholder (`value=""`), `value="amount"`, and `value="category"`
  - Ensure the sort bar is placed immediately before `<ul id="transaction-list">`
  - Fix the `<label>` `for` attribute (was `short-option`, must be `sort-option`)
  - Remove the stray closing `</select>` tag and ensure options are correctly nested inside a single `<select>`
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. Add `.sort-bar` styles to `css/styles.css`
  - Add a `/* ── Sort control (transaction-sorting) ─────────────────── */` comment block after the `#list-section` rule
  - Implement `.sort-bar` as a flex row with `align-items: center`, `gap: 0.5rem`, and `margin-bottom: 0.75rem`
  - Style `.sort-bar label` to match existing form label appearance (`font-size: 0.875rem`, `font-weight: 500`, `color: #374151`, `white-space: nowrap`)
  - Style `.sort-bar select` to visually match the existing `#transaction-form select` (same padding, font, border, border-radius, background, `appearance: none`, cursor, transition)
  - Add `.sort-bar select:focus` rule with the same focus ring as the form selects (`border-color: #2563eb`, `box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.2)`, `background: #ffffff`)
  - _Requirements: 1.1_

- [x] 3. Add `getSortedTransactions` pure function to `js/app.js`
  - Insert `getSortedTransactions(txns, sortOrder)` at the top of the IIFE, before the `StorageManager` block
  - When `sortOrder === "amount"`: return `txns.slice().sort((a, b) => a.amount - b.amount)`
  - When `sortOrder === "category"`: return `txns.slice().sort((a, b) => a.category.localeCompare(b.category))`
  - For any other value (including `""`): return `txns.slice()` (preserves insertion order)
  - Function must not mutate the input array under any code path
  - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 4.1, 4.4_

- [x] 4. Add `EventHandlers.onSortChange` and update `Renderer.renderAll` in `js/app.js`
  - [x] 4.1 Add `onSortChange(e)` method to the `EventHandlers` object
    - Read `sortOrder` from `e.target.value`
    - Call `getSortedTransactions(StateManager.getAll(), sortOrder)` to get a sorted copy
    - Call only `Renderer.renderList(sorted)` — must not call `Renderer.renderBalance` or `ChartManager.update`
    - _Requirements: 5.1, 5.2, 2.3, 2.4, 2.5, 3.3, 3.4, 3.5_

  - [x] 4.2 Update `Renderer.renderAll(txns)` to apply the active sort before calling `renderList`
    - Read the current sort value: `const sortOrder = (document.getElementById('sort-option') || {}).value || ''`
    - Pass `getSortedTransactions(txns, sortOrder)` to `Renderer.renderList`
    - Continue passing the original `txns` (unsorted) to `Renderer.renderBalance` and `ChartManager.update`
    - _Requirements: 4.2, 4.3_


- [x] 5. Register `change` listener for `#sort-option` in `init()`
  - Add `document.getElementById('sort-option').addEventListener('change', EventHandlers.onSortChange)` after the existing listener registrations in `init()`
  - _Requirements: 5.3_

- [x] 6. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- `getSortedTransactions` must be placed before `StorageManager` so all objects in the IIFE can call it
- `Renderer.renderAll` always passes the original (unsorted) array to `renderBalance` and `ChartManager.update` — sorting never affects totals or the chart
- Property tests use **fast-check** and run a minimum of 100 iterations each
