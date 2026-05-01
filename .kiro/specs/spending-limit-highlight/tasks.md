# Implementation Plan: Spending Limit Highlight

## Overview

Add a spending limit input field above the transaction list. Transactions whose `amount` exceeds the limit receive a visual highlight (`over-limit` CSS class on the `<li>`) and an inline badge. The limit persists via `localStorage`. All changes are confined to three existing files: `index.html`, `js/app.js`, and `css/styles.css`, plus the testable mirror `js/app-testable.js`.

## Tasks

- [x] 1. Add spending limit markup to `index.html`
  - Add a `<div class="limit-bar">` inside `#list-section`, immediately before the existing `.sort-bar` div
  - Inside `.limit-bar`, add a `<label for="spending-limit-input">Spending limit</label>`
  - Add `<input id="spending-limit-input" type="number" min="0" step="any" placeholder="e.g. 50" aria-label="Spending limit per transaction" />`
  - _Requirements: 1.1, 1.2_

- [x] 2. Add CSS for the limit control and over-limit styles to `css/styles.css`
  - [x] 2.1 Add `.limit-bar` layout styles after the `.sort-bar` block
    - `.limit-bar`: `display: flex`, `align-items: center`, `gap: 0.5rem`, `margin-bottom: 0.75rem`
    - `.limit-bar label`: `font-size: 0.875rem`, `font-weight: 500`, `color: #374151`, `white-space: nowrap`
    - `.limit-bar input`: `width: 8rem`, same padding/font/border/border-radius/transition as `.sort-bar select`
    - `.limit-bar input:focus`: same focus ring as `.sort-bar select:focus`
    - _Requirements: 1.1_

  - [x] 2.2 Add over-limit highlight styles
    - `#transaction-list li.over-limit`: `border-color: #fca5a5`, `background: #fff5f5`
    - `.over-limit-badge`: `flex: 0 0 auto`, `font-size: 0.75rem`, `font-weight: 600`, `color: #dc2626`, `background: #fee2e2`, `border: 1px solid #fca5a5`, `border-radius: 999px`, `padding: 0.125rem 0.5rem`
    - Add dark mode overrides: `body.dark-mode #transaction-list li.over-limit` and `body.dark-mode .over-limit-badge`
    - _Requirements: 3.1, 3.2_

- [x] 3. Add `SpendingLimitManager` to `js/app.js`
  - Add `const SPENDING_LIMIT_KEY = 'ebv_spending_limit'` constant near the top of the IIFE with the other constants
  - Declare `SpendingLimitManager` object before `Renderer` in the IIFE (so `Renderer.renderList` can call `getLimit()`)
  - Implement `save(value)`: calls `localStorage.setItem(SPENDING_LIMIT_KEY, String(value))`; swallows errors silently
  - Implement `clear()`: calls `localStorage.removeItem(SPENDING_LIMIT_KEY)`; swallows errors silently
  - Implement `getLimit()`: reads `localStorage.getItem(SPENDING_LIMIT_KEY)`, parses with `parseFloat`, returns the number if `isFinite(parsed) && parsed > 0`, otherwise returns `null`; returns `null` on any localStorage error
  - Implement `init()`: calls `getLimit()` and sets `#spending-limit-input` value if the element exists and limit is not null
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 4. Update `Renderer.renderList` in `js/app.js` to apply highlighting
  - Call `SpendingLimitManager.getLimit()` once before the `txns.forEach` loop and store in a `limit` variable
  - Inside the `forEach`, after appending the existing child elements to `li`, add the highlighting block:
    - `if (limit !== null && txn.amount > limit)`: add `li.classList.add('over-limit')` and append `<span class="over-limit-badge">Over limit</span>`
  - Transactions at or below the limit must receive neither the class nor the badge
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 5. Add `EventHandlers.onLimitChange` and register the listener in `init()` in `js/app.js`
  - [x] 5.1 Add `onLimitChange(e)` method to the `EventHandlers` object
    - Read `raw = e.target.value.trim()`
    - If `raw === ''`: call `SpendingLimitManager.clear()`
    - Else: parse with `parseFloat`; if `isFinite(parsed) && parsed > 0`, call `SpendingLimitManager.save(parsed)`
    - Always call `Renderer.renderAll(StateManager.getAll())` at the end
    - _Requirements: 4.1, 4.2_

  - [ ] 5.2 Update `init()` to initialise the spending limit and register the event listener
    - Call `SpendingLimitManager.init()` before `Renderer.renderAll(txns)` so the input is populated before the first render
    - Add `document.getElementById('spending-limit-input').addEventListener('input', EventHandlers.onLimitChange)` after the existing listener registrations
    - _Requirements: 1.3, 4.1_

- [x] 6. Mirror all changes in `js/app-testable.js`
  - Export `SPENDING_LIMIT_KEY` constant
  - Export `SpendingLimitManager` object with all four methods (`save`, `clear`, `getLimit`, `init`)
  - Apply the same `Renderer.renderList` highlighting changes
  - Add `onLimitChange` to the exported `EventHandlers` object
  - Update the exported `init` function to call `SpendingLimitManager.init()` and register the `input` listener
  - _Requirements: all (enables unit and property tests)_

- [x] 7. Write tests in `js/app.test.js`
  - [ ] 7.1 Unit tests for `SpendingLimitManager`
    - `getLimit()` returns `null` when localStorage is empty
    - `getLimit()` returns `null` when localStorage throws (mock `getItem` to throw)
    - `save(value)` then `getLimit()` returns the same value (concrete example)
    - `clear()` removes the key so `getLimit()` returns `null`
    - `init()` sets `#spending-limit-input` value when a limit is stored
    - `init()` leaves `#spending-limit-input` empty when no limit is stored
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 1.3_

  - [x] 7.2 Unit tests for `Renderer.renderList` highlighting
    - Known fixture: over-limit item has `.over-limit` class and `.over-limit-badge` span
    - Known fixture: at-limit item (amount === limit) has no class and no badge
    - Known fixture: below-limit item has no class and no badge
    - Known fixture: `null` limit → no items have `.over-limit` class or badge
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [ ] 7.3 Unit tests for `EventHandlers.onLimitChange` and `init()`
    - `onLimitChange` with empty string calls `SpendingLimitManager.clear()` and calls `Renderer.renderAll`
    - `onLimitChange` with a valid number calls `SpendingLimitManager.save()` and calls `Renderer.renderAll`
    - After `init()`, an `input` event on `#spending-limit-input` triggers `onLimitChange`
    - _Requirements: 4.1, 4.2_

  - [-] 7.4 Property-based tests (fast-check, minimum 100 iterations each)
    - **Property 1** — `SpendingLimitManager` round-trip: for any positive finite number, `save(value)` then `getLimit()` returns the same value
      - Tag: `// Feature: spending-limit-highlight, Property 1: SpendingLimitManager round-trip`
      - _Requirements: 2.1, 2.3_
    - **Property 2** — Highlighting correctness: for any transaction array and positive limit, every rendered `<li>` has the correct class and badge presence based on `txn.amount > limit`
      - Tag: `// Feature: spending-limit-highlight, Property 2: Highlighting correctness for all transactions`
      - _Requirements: 3.1, 3.2, 3.4_
    - **Property 3** — No highlighting without limit: for any transaction array rendered with no limit, no `<li>` has `.over-limit` class or `.over-limit-badge` child
      - Tag: `// Feature: spending-limit-highlight, Property 3: No highlighting when no limit is active`
      - _Requirements: 3.3, 5.1_

- [ ] 8. Final checkpoint — ensure all tests pass
  - Run the test suite and confirm all existing tests still pass alongside the new ones
  - Verify the feature works end-to-end in the browser: set a limit, see highlights, clear the limit, see highlights removed, reload the page, confirm the limit is restored

## Notes

- `SpendingLimitManager` must be declared before `Renderer` in the IIFE so `Renderer.renderList` can call `getLimit()`
- `SpendingLimitManager.getLimit()` is called once per `renderList` invocation, not once per transaction
- The `input` event (not `change`) is used on `#spending-limit-input` so the list updates as the user types
- Property tests use **fast-check** (already a dev dependency) and run a minimum of 100 iterations each
- All changes to `js/app.js` must be mirrored in `js/app-testable.js` to keep the test module in sync
