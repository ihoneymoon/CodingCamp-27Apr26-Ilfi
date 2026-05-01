# Design Document — Spending Limit Highlight

## Overview

The Spending Limit Highlight feature adds a per-transaction threshold control to the Expense & Budget Visualizer. Users type a positive number into a new input field; any transaction whose `amount` strictly exceeds that number receives a visual highlight (`over-limit` CSS class on the `<li>`) and an inline badge (`<span class="over-limit-badge">Over limit</span>`). The limit persists across page reloads via `localStorage`. When no limit is set, the list renders exactly as before — no highlighting occurs.

The implementation stays within the existing stack: plain HTML, CSS, and vanilla JavaScript inside the existing IIFE in `js/app.js`. No new files, no build tools, no npm packages.

---

## Architecture

The feature introduces one new module (`SpendingLimitManager`) and extends two existing ones (`Renderer.renderList`, `init`). The data flow is:

```
User types in #spending-limit-input
        │
        ▼
EventHandlers.onLimitChange(e)
        │  calls SpendingLimitManager.save(value) or SpendingLimitManager.clear()
        │  calls Renderer.renderAll(StateManager.getAll())
        │
        ▼
Renderer.renderAll(txns)
        │  calls Renderer.renderList(getSortedTransactions(txns, sortOrder))
        │
        ▼
Renderer.renderList(txns)
        │  reads SpendingLimitManager.getLimit()
        │  for each txn: if amount > limit → adds .over-limit + badge
        │
        ▼
DOM updated
```

On page load, `init()` reads the stored limit and populates the input field before the first render.

```
init()
  │  SpendingLimitManager.init()  → populates #spending-limit-input from localStorage
  │  Renderer.renderAll(txns)     → renderList reads limit and highlights accordingly
```

---

## Components and Interfaces

### `SpendingLimitManager` — new object

Responsible for reading, writing, and exposing the spending limit value. Lives inside the IIFE in `js/app.js`, declared before `Renderer` so `Renderer.renderList` can call `getLimit()`.

```javascript
const SPENDING_LIMIT_KEY = 'ebv_spending_limit';

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
```

| Method | Behaviour |
|---|---|
| `save(value)` | Writes `String(value)` to `localStorage` under `SPENDING_LIMIT_KEY`; swallows errors |
| `clear()` | Removes `SPENDING_LIMIT_KEY` from `localStorage`; swallows errors |
| `getLimit()` | Returns stored value as a positive `number`, or `null` if absent/invalid/unavailable |
| `init()` | Reads stored limit and sets `#spending-limit-input` value before first render |

---

### `Renderer.renderList(txns)` — updated

The only change to `renderList` is the addition of over-limit highlighting logic after the existing `<li>` is assembled:

```javascript
renderList(txns) {
  // ... existing code unchanged up to li assembly ...

  const limit = SpendingLimitManager.getLimit();

  txns.forEach(txn => {
    const li = document.createElement('li');
    // ... existing nameSpan, amountSpan, categorySpan, deleteBtn ...

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
}
```

- `SpendingLimitManager.getLimit()` is called **once per render**, not once per transaction.
- The `over-limit` class and badge are only added when `limit !== null && txn.amount > limit`.
- Transactions at or below the limit receive neither the class nor the badge.
- When `limit === null` (no limit set), the loop body is identical to the current implementation.

---

### `EventHandlers.onLimitChange(e)` — new handler

```javascript
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
```

- Listens on the `input` event of `#spending-limit-input` so the list updates as the user types.
- Clears the stored limit when the field is emptied.
- Ignores non-positive or non-finite values (the `min="0"` attribute on the input provides a first line of defence in the browser).
- Always calls `Renderer.renderAll` to re-render the list with the updated limit.

---

### `init()` — updated

```javascript
SpendingLimitManager.init();
// ... existing init code ...
document.getElementById('spending-limit-input')
  .addEventListener('input', EventHandlers.onLimitChange);
```

`SpendingLimitManager.init()` is called before `Renderer.renderAll` so the input is populated before the first render.

---

## Data Models

No new transaction fields are introduced. The existing `Transaction` shape is unchanged:

```
{
  id:        string   — unique identifier
  name:      string   — item description
  amount:    number   — positive float
  category:  string   — one of "Food" | "Transport" | "Fun"
  timestamp: number   — Unix ms
}
```

The spending limit is stored in `localStorage` as a plain string under the key `ebv_spending_limit`. It is read back with `parseFloat` and validated as a positive finite number before use.

---

## HTML Changes — `index.html`

Add the spending limit control inside `#list-section`, immediately before the `.sort-bar` div:

```html
<section id="list-section">

  <div class="limit-bar">
    <label for="spending-limit-input">Spending limit</label>
    <input
      id="spending-limit-input"
      type="number"
      min="0"
      step="any"
      placeholder="e.g. 50"
      aria-label="Spending limit per transaction"
    />
  </div>

  <div class="sort-bar">
    <!-- existing sort control unchanged -->
  </div>

  <ul id="transaction-list" aria-label="Transaction list"></ul>
  <p id="list-empty-msg">No expenses recorded yet.</p>

</section>
```

---

## CSS Changes — `css/styles.css`

Add the following block after the `.sort-bar` rules:

```css
/* ── Spending limit control (spending-limit-highlight) ───── */

.limit-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.limit-bar label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  white-space: nowrap;
}

.limit-bar input {
  width: 8rem;
  padding: 0.375rem 0.625rem;
  font-size: 0.875rem;
  font-family: inherit;
  color: #1a1a2e;
  background: #f9fafb;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.limit-bar input:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.2);
  background: #ffffff;
}

/* ── Over-limit transaction highlight ────────────────────── */

#transaction-list li.over-limit {
  border-color: #fca5a5;
  background: #fff5f5;
}

.over-limit-badge {
  flex: 0 0 auto;
  font-size: 0.75rem;
  font-weight: 600;
  color: #dc2626;
  background: #fee2e2;
  border: 1px solid #fca5a5;
  border-radius: 999px;
  padding: 0.125rem 0.5rem;
}

/* Dark mode overrides */
body.dark-mode #transaction-list li.over-limit {
  background: #3b1a1a;
  border-color: #dc2626;
}

body.dark-mode .over-limit-badge {
  background: #7f1d1d;
  color: #fca5a5;
  border-color: #dc2626;
}
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

The core logic of this feature is concentrated in two pure-ish functions: `SpendingLimitManager.getLimit()` (a round-trip over localStorage) and the highlighting decision inside `Renderer.renderList` (a predicate applied to every transaction). Both are excellent candidates for property-based testing because their correctness must hold across all possible transaction arrays and limit values.

---

### Property Reflection

Before writing the final properties, reviewing the prework for redundancy:

- Requirements 3.1 and 3.2 both describe what happens to over-limit items (class + badge). They can be combined into one comprehensive property that checks both the class and the badge together.
- Requirements 3.3 and 3.4 both describe what happens to non-over-limit items (no class, no badge). They can be combined into the same property as 3.1/3.2 — a single property that checks the correct highlighting for every item in the list.
- Requirements 5.1 and 5.2 are redundant with 3.3 and 4.2 respectively — covered by the combined highlighting property and the clear example test.
- Requirements 4.1 and 4.2 are about re-rendering on limit change. 4.1 is a property (varies with limit value); 4.2 is an example (the specific "clear" case).

After reflection: three properties remain, each providing unique validation value.

---

### Property 1: SpendingLimitManager round-trip

*For any* positive finite number saved via `SpendingLimitManager.save(value)`, calling `SpendingLimitManager.getLimit()` immediately afterwards SHALL return a number equal to `value`.

**Validates: Requirements 2.1, 2.3**

---

### Property 2: Highlighting correctness for all transactions

*For any* array of transactions and any active spending limit (positive number), after `Renderer.renderList` is called, every `<li>` in the rendered list SHALL satisfy exactly one of the following:
- The transaction's `amount` is strictly greater than the limit → the `<li>` has the `over-limit` CSS class AND contains a `<span class="over-limit-badge">` child.
- The transaction's `amount` is less than or equal to the limit → the `<li>` does NOT have the `over-limit` CSS class AND does NOT contain any `<span class="over-limit-badge">` child.

**Validates: Requirements 3.1, 3.2, 3.4**

---

### Property 3: No highlighting when no limit is active

*For any* array of transactions rendered when `SpendingLimitManager.getLimit()` returns `null`, every `<li>` in the rendered list SHALL NOT have the `over-limit` CSS class and SHALL NOT contain any `<span class="over-limit-badge">` child.

**Validates: Requirements 3.3, 5.1**

---

## Error Handling

| Scenario | Behaviour |
|---|---|
| `localStorage` unavailable on `save` | `SpendingLimitManager.save` swallows the error; limit is not persisted but the UI still reflects the typed value for the current session |
| `localStorage` unavailable on `getLimit` | Returns `null`; no highlighting is applied — safe degradation |
| User types a non-numeric value into the input | `parseFloat` returns `NaN`; `isFinite(NaN)` is `false`; `SpendingLimitManager.save` is not called; `clear` is not called either; the previous limit remains active |
| User types `0` or a negative number | `parsed > 0` is `false`; save is skipped; previous limit remains active |
| `#spending-limit-input` not found in DOM | `SpendingLimitManager.init()` guards with `if (input && ...)` — no crash |
| `renderList` called before `SpendingLimitManager` is declared | Not possible — `SpendingLimitManager` is declared before `Renderer` in the IIFE |

---

## Testing Strategy

### Unit tests (example-based)

These cover concrete scenarios and side-effect assertions:

- `SpendingLimitManager.getLimit()` returns `null` when localStorage is empty
- `SpendingLimitManager.getLimit()` returns `null` when localStorage is unavailable (mock throws)
- `SpendingLimitManager.clear()` removes the key from localStorage
- `SpendingLimitManager.init()` populates `#spending-limit-input` when a limit is stored
- `SpendingLimitManager.init()` leaves `#spending-limit-input` empty when no limit is stored
- `Renderer.renderList` with a known fixture: over-limit items have `.over-limit` class and badge
- `Renderer.renderList` with a known fixture: at-limit items have no class and no badge
- `Renderer.renderList` with `null` limit: no items have `.over-limit` class or badge
- After `init()`, an `input` event on `#spending-limit-input` triggers `onLimitChange`
- `onLimitChange` with empty value calls `SpendingLimitManager.clear()` and re-renders

### Property-based tests

Property-based testing is appropriate here because the highlighting logic is a pure predicate applied to every transaction, and `SpendingLimitManager.getLimit()` is a round-trip over localStorage. The recommended library is **fast-check** (already used in the project).

Each property test runs a minimum of **100 iterations**.

Tag format: `// Feature: spending-limit-highlight, Property N: <property text>`

| Property | Test description |
|---|---|
| Property 1 | Generate random positive numbers; save via `SpendingLimitManager.save`; assert `getLimit()` returns the same value |
| Property 2 | Generate random transaction arrays and a random positive limit; render with `Renderer.renderList`; assert every `<li>` has the correct class and badge presence based on `txn.amount > limit` |
| Property 3 | Generate random transaction arrays; render with no limit (localStorage cleared); assert no `<li>` has `.over-limit` class or `.over-limit-badge` child |

> **Note:** Do not generate test files as part of this spec. The testing strategy above is the specification for tests to be written during the implementation phase.
