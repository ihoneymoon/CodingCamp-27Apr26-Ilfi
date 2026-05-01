# Design Document — Transaction Sorting

## Overview

The Transaction Sorting feature adds a `<select>` dropdown above the transaction list that lets users re-order the displayed expenses by amount (ascending) or by category (A–Z). Sorting is **display-only**: it never touches the canonical array owned by `StateManager`, never writes to `localStorage`, and never triggers a balance or chart refresh.

The implementation is intentionally minimal — a single pure helper function (`getSortedTransactions`), one new event handler (`EventHandlers.onSortChange`), a small update to `Renderer.renderAll`, and a one-line listener registration in `init()`. All changes live inside the existing IIFE in `js/app.js`.

---

## Architecture

The feature slots into the existing layered structure without introducing new modules or files.

```
User selects sort option
        │
        ▼
EventHandlers.onSortChange(e)
        │  reads #sort-option value
        │  calls getSortedTransactions(StateManager.getAll(), sortOrder)
        │
        ▼
getSortedTransactions(txns, sortOrder)   ← pure function, returns shallow-copy
        │
        ▼
Renderer.renderList(sortedCopy)          ← only the list is re-rendered
```

When a transaction is **added or deleted**, `StateManager.add` / `StateManager.remove` calls `Renderer.renderAll`, which is updated to read the current sort selection and apply it before calling `renderList`.

```
StateManager.add / StateManager.remove
        │
        ▼
Renderer.renderAll(txns)
        │  reads #sort-option value
        │  calls getSortedTransactions(txns, sortOrder)
        │
        ├──▶ Renderer.renderList(sortedCopy)
        ├──▶ Renderer.renderBalance(txns)      ← always uses original array
        └──▶ ChartManager.update(txns)         ← always uses original array
```

---

## Components and Interfaces

### `getSortedTransactions(txns, sortOrder)` — new pure function

| Aspect | Detail |
|---|---|
| Location | Top of the IIFE, before `StorageManager`, so all other objects can call it |
| Parameters | `txns` — the array from `StateManager.getAll()`; `sortOrder` — string `"amount"`, `"category"`, or `""` |
| Returns | A **new shallow-copy array** sorted according to `sortOrder`; returns the original array reference when `sortOrder` is `""` or unrecognised |
| Side effects | None — must not mutate `txns` |

Sorting logic:

```javascript
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
```

`Array.prototype.sort` is guaranteed to be stable in all modern browsers (ECMAScript 2019+). `localeCompare` provides correct locale-aware A–Z ordering.

---

### `EventHandlers.onSortChange(e)` — new handler

```javascript
onSortChange(e) {
  const sortOrder = e.target.value;
  const sorted = getSortedTransactions(StateManager.getAll(), sortOrder);
  Renderer.renderList(sorted);
}
```

- Reads the current `<select>` value from the event target.
- Calls `getSortedTransactions` with the canonical array — never modifies it.
- Calls only `Renderer.renderList` — balance and chart are untouched.

---

### `Renderer.renderAll(txns)` — updated

```javascript
renderAll(txns) {
  const sortOrder = (document.getElementById('sort-option') || {}).value || '';
  Renderer.renderList(getSortedTransactions(txns, sortOrder));
  Renderer.renderBalance(txns);
  ChartManager.update(txns);
}
```

- Reads the active sort selection from the DOM so that add/delete operations respect the current sort.
- Passes the **original** `txns` array to `renderBalance` and `ChartManager.update` — those functions are unaffected by sort order.
- The `|| {}` guard keeps the function safe if called before the DOM is ready (e.g. during unit tests).

---

### `init()` — updated

```javascript
document.getElementById('sort-option')
  .addEventListener('change', EventHandlers.onSortChange);
```

Added after the existing listener registrations.

---

## Data Models

No new data models are introduced. The existing `Transaction` shape is unchanged:

```
{
  id:        string   — unique identifier (crypto.randomUUID or fallback)
  name:      string   — item description
  amount:    number   — positive float
  category:  string   — one of "Food" | "Transport" | "Fun"
  timestamp: number   — Unix ms, represents insertion order
}
```

`getSortedTransactions` operates on this shape using `amount` (numeric comparison) and `category` (string comparison). The `timestamp` field implicitly encodes insertion order and is preserved by the stable sort when keys are equal.

---

## HTML Changes — `index.html`

Replace the malformed sort markup currently in `#list-section` with the following corrected block, placed immediately before `#transaction-list`:

```html
<section id="list-section">

  <div class="sort-bar">
    <label for="sort-option">Sort by</label>
    <select id="sort-option">
      <option value="">Sort by…</option>
      <option value="amount">Sort by Amount</option>
      <option value="category">Sort by Category</option>
    </select>
  </div>

  <ul id="transaction-list" aria-label="Transaction list"></ul>
  <p id="list-empty-msg">No expenses recorded yet.</p>

</section>
```

Key corrections from the current broken markup:
- The `<label>` `for` attribute is fixed to `sort-option` (was `short-option`).
- The stray closing `</select>` before the options is removed.
- The options are inside a single `<select>` element.
- A wrapper `<div class="sort-bar">` groups the label and select for layout.

---

## CSS Changes — `css/styles.css`

Add the following block after the `#list-section` rule (around line 155):

```css
/* ── Sort control (transaction-sorting) ─────────────────── */

.sort-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.sort-bar label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  white-space: nowrap;
}

.sort-bar select {
  padding: 0.375rem 0.625rem;
  font-size: 0.875rem;
  font-family: inherit;
  color: #1a1a2e;
  background: #f9fafb;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  appearance: none;
  -webkit-appearance: none;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.sort-bar select:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.2);
  background: #ffffff;
}
```

This mirrors the visual style of the existing form `<select>` elements (same border, radius, focus ring, and font) while keeping the control compact and left-aligned above the list.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

The core logic of this feature is concentrated in the pure function `getSortedTransactions`. Because it takes an array and returns a new array with no side effects, it is an ideal candidate for property-based testing. The properties below are derived from the acceptance criteria and cover the four correctness guarantees the feature must uphold.

---

### Property 1: Sort does not mutate the original array

*For any* array of transactions and any sort order value (`"amount"`, `"category"`, or `""`), calling `getSortedTransactions` SHALL return a new array and the original array SHALL remain identical in length, element identity, and element order to its state before the call.

**Validates: Requirements 2.3, 3.3, 4.1**

---

### Property 2: Amount sort produces ascending order

*For any* non-empty array of transactions, calling `getSortedTransactions(txns, "amount")` SHALL return an array where, for every adjacent pair of elements at indices `i` and `i+1`, `result[i].amount <= result[i+1].amount`.

**Validates: Requirements 2.1**

---

### Property 3: Category sort produces A–Z order

*For any* non-empty array of transactions, calling `getSortedTransactions(txns, "category")` SHALL return an array where, for every adjacent pair of elements at indices `i` and `i+1`, `result[i].category.localeCompare(result[i+1].category) <= 0`.

**Validates: Requirements 3.1**

---

### Property 4: Sort is stable

*For any* array of transactions containing two or more elements that share the same sort key (equal `amount` values for amount sort, or equal `category` values for category sort), those elements SHALL appear in the output in the same relative order as they appeared in the input.

**Validates: Requirements 2.2, 3.2**

---

### Property 5: Default sort preserves insertion order

*For any* array of transactions, calling `getSortedTransactions(txns, "")` SHALL return an array whose elements appear in the same order as the input array.

**Validates: Requirements 4.4**

---

### Property 6: Active sort is re-applied after list mutations

*For any* transaction array and any active sort order, after a transaction is added to or removed from `StateManager`, the transaction list rendered in the DOM SHALL match the result of applying `getSortedTransactions` to the updated array with the same sort order.

**Validates: Requirements 4.2, 4.3**

---

## Error Handling

| Scenario | Behaviour |
|---|---|
| `#sort-option` element not found in `renderAll` | The `|| {}` guard returns `""`, so `getSortedTransactions` falls back to insertion order — no crash |
| `getSortedTransactions` called with `null` or `undefined` txns | Caller (`onSortChange`, `renderAll`) always passes `StateManager.getAll()` which returns `[]` at minimum — no null path in practice |
| `localeCompare` on non-string category | Categories are validated by `Validator` before a transaction is created; only `"Food"`, `"Transport"`, `"Fun"` can appear — no runtime error |
| Sort selected when list is empty | `getSortedTransactions([])` returns `[]`; `renderList([])` shows the empty-state message — correct behaviour |

---

## Testing Strategy

### Unit tests (example-based)

These cover concrete scenarios and side-effect assertions:

- `getSortedTransactions([], "amount")` returns `[]`
- `getSortedTransactions([], "category")` returns `[]`
- `getSortedTransactions(txns, "")` returns elements in original order
- `getSortedTransactions` with a known fixture sorted by amount matches expected order
- `getSortedTransactions` with a known fixture sorted by category matches expected order
- `onSortChange` calls `Renderer.renderList` and does **not** call `Renderer.renderBalance` or `ChartManager.update`
- `renderAll` with an active sort calls `renderList` with the sorted array and `renderBalance`/`ChartManager.update` with the original array
- After `init()`, a `change` event on `#sort-option` triggers `onSortChange`

### Property-based tests

Property-based testing is appropriate here because `getSortedTransactions` is a pure function whose correctness must hold across all possible transaction arrays and sort orders. The recommended library is **fast-check** (JavaScript).

Each property test runs a minimum of **100 iterations**.

Tag format: `// Feature: transaction-sorting, Property N: <property text>`

| Property | Test description |
|---|---|
| Property 1 | Generate random `txns` array and random `sortOrder`; assert original array is unchanged after call |
| Property 2 | Generate random `txns`; assert `getSortedTransactions(txns, "amount")` result is non-decreasing by amount |
| Property 3 | Generate random `txns`; assert `getSortedTransactions(txns, "category")` result is non-decreasing by category (localeCompare) |
| Property 4 | Generate random `txns` with forced duplicate keys; assert relative order of equal-key elements is preserved |
| Property 5 | Generate random `txns`; assert `getSortedTransactions(txns, "")` result matches input order |
| Property 6 | Generate random `txns` and `sortOrder`; simulate add/delete; assert rendered list matches `getSortedTransactions` output |

> **Note:** Do not generate test files as part of this spec. The testing strategy above is the specification for tests to be written during the implementation phase.
