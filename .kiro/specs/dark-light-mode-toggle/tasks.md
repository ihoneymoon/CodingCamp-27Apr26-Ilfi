# Implementation Plan: Dark/Light Mode Toggle

## Overview

Add a dark/light mode toggle to the Expense & Budget Visualizer. The change is purely additive: a `<button id="theme-toggle">` is inserted into the existing `<header>`, dark-mode CSS overrides are appended to `css/styles.css`, and a `ThemeManager` block is added to `js/app.js` (and mirrored in `js/app-testable.js`). No existing code is restructured or removed.

## Tasks

- [x] 1. Add the theme toggle button to `index.html`
  - Insert `<button id="theme-toggle" type="button">Dark Mode</button>` as the last child of the existing `<header>` element, after the `<output id="balance-display">` element
  - The button must be keyboard-focusable by default (no `tabindex="-1"` or `disabled` attribute)
  - _Requirements: 1.1, 1.2, 1.4_

- [x] 2. Add dark-mode CSS overrides to `css/styles.css`
  - [x] 2.1 Add `#theme-toggle` base styles
    - Style `#theme-toggle` to sit inline in the header flex row (no extra layout disruption)
    - Add padding, border-radius, cursor, and transition properties consistent with existing button styles
    - _Requirements: 3.7_

  - [x] 2.2 Add `.dark-mode` body and global overrides
    - Add a `/* ── Dark mode overrides (dark-light-mode-toggle) ─── */` comment block
    - `body.dark-mode` rule: `background-color: #1a1a2e`, `color: #e2e8f0`
    - `body.dark-mode header` rule: `border-bottom-color: #2d3748`
    - `body.dark-mode header h1` rule: `color: #e2e8f0`
    - _Requirements: 3.1, 3.2, 3.4_

  - [x] 2.3 Add `.dark-mode` card section overrides
    - `body.dark-mode #form-section`, `body.dark-mode #chart-section`, `body.dark-mode #list-section` rule: `background: #16213e`, `border-color: #2d3748`
    - _Requirements: 3.3, 3.4_

  - [x] 2.4 Add `.dark-mode` form input and select overrides
    - `body.dark-mode #transaction-form input`, `body.dark-mode #transaction-form select` rule: `background: #0f3460`, `color: #e2e8f0`, `border-color: #2d3748`
    - `body.dark-mode .sort-bar select` rule: same dark input styles
    - _Requirements: 3.5_

  - [x] 2.5 Add `.dark-mode` transaction list item overrides
    - `body.dark-mode #transaction-list li` rule: `background: #0f3460`, `border-color: #2d3748`
    - `body.dark-mode .txn-name` rule: `color: #e2e8f0`
    - `body.dark-mode .txn-category` rule: `background: #2d3748`, `color: #e2e8f0`
    - _Requirements: 3.6_

  - [x] 2.6 Add `.dark-mode` theme toggle button overrides
    - `body.dark-mode #theme-toggle` rule: `background: #1a1a2e`, `color: #e2e8f0`, `border: 1px solid #e2e8f0`
    - _Requirements: 3.7_

- [x] 3. Implement `ThemeManager` in `js/app.js`
  - [x] 3.1 Add `THEME_STORAGE_KEY` constant
    - Insert `const THEME_STORAGE_KEY = 'ebv_theme';` in the constants block at the top of the IIFE, alongside `STORAGE_KEY` and `CATEGORIES`
    - _Requirements: 4.1_

  - [x] 3.2 Implement `ThemeManager` object
    - Add a `ThemeManager` object with the following methods, placed after the `StorageManager` block and before `StateManager`:
    - `applyTheme(theme)`: adds `.dark-mode` to `<body>` when `theme === 'dark'`, removes it otherwise; updates `#theme-toggle` text to `"Light Mode"` (dark) or `"Dark Mode"` (light)
    - `toggle()`: reads current state from `document.body.classList.contains('dark-mode')`, flips it, calls `applyTheme`, then persists the new value to `localStorage` under `THEME_STORAGE_KEY` — wrapped in a try/catch that silently swallows errors
    - `init()`: reads `localStorage.getItem(THEME_STORAGE_KEY)` in a try/catch; calls `applyTheme('dark')` if value is `'dark'`, otherwise calls `applyTheme('light')`
    - _Requirements: 1.2, 1.3, 2.1, 2.2, 4.1, 4.2, 4.3, 4.4_

  - [ ] 3.3 Wire `ThemeManager` into `init()`
    - Call `ThemeManager.init()` as the first statement inside the `init()` function, before `StorageManager.load()`
    - Add `document.getElementById('theme-toggle').addEventListener('click', ThemeManager.toggle)` after the existing event listener registrations
    - _Requirements: 2.1, 2.2, 4.2, 4.3_

- [x] 4. Mirror `ThemeManager` in `js/app-testable.js`
  - Export `THEME_STORAGE_KEY` constant
  - Export `ThemeManager` object with the same `applyTheme`, `toggle`, and `init` methods as in `app.js`
  - Update the exported `init()` function to call `ThemeManager.init()` first and register the `#theme-toggle` click listener
  - Update `setupDOM()` helper in `js/app.test.js` to include `<button id="theme-toggle" type="button">Dark Mode</button>` inside the `<header>`
  - _Requirements: 1.1, 2.1, 2.2, 4.1, 4.2, 4.3, 4.4_

- [x] 5. Write unit tests for `ThemeManager` in `js/app.test.js`

- [ ] 6. Final checkpoint — Ensure all tests pass
  - Run `npm test` and confirm all existing tests and new `ThemeManager` tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- `ThemeManager.init()` must run before `StorageManager.load()` so the theme is applied before any render
- The `toggle` and `init` methods must never throw — all `localStorage` access is wrapped in try/catch
- No existing code in `app.js` is modified; `ThemeManager` is a new, self-contained block
- The `app-testable.js` mirror ensures all new logic is covered by the Vitest test suite
