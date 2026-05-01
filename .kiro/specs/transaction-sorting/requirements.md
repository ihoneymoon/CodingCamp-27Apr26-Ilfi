# Requirements Document

## Introduction

The Transaction Sorting feature adds a sort control to the Expense & Budget Visualizer's transaction list section. Users can choose to sort the displayed transactions by amount (ascending) or by category (alphabetical A–Z). Sorting is a display-only operation — it does not alter the order in which transactions are persisted to Local Storage, and it does not affect the Balance Display or the Chart. The feature is implemented by adding a `<select>` dropdown above the transaction list and wiring it to a sort handler that calls the existing `Renderer.renderList` method with a sorted copy of the transaction array.

## Glossary

- **App**: The Expense & Budget Visualizer single-page web application.
- **Transaction**: A single expense entry consisting of an item name, a monetary amount, and a category.
- **Transaction_List**: The scrollable UI component (`#transaction-list`) that displays all stored transactions.
- **Sort_Control**: The `<select>` dropdown element (`#sort-option`) placed above the Transaction_List that allows the user to choose a sort order.
- **Sort_Order**: The currently selected sorting criterion. Valid values are: none (default insertion order), amount (ascending by amount), category (alphabetical A–Z by category name).
- **StateManager**: The in-memory store that owns the canonical transaction array and persists it to Local Storage.
- **Renderer**: The rendering module that rebuilds the Transaction_List DOM from a given array.
- **Storage**: The browser's Local Storage API used to persist transaction data client-side.

---

## Requirements

### Requirement 1: Sort Control Presence

**User Story:** As a user, I want a sort dropdown above the transaction list, so that I can choose how my expenses are ordered without leaving the page.

#### Acceptance Criteria

1. THE App SHALL render a `<select>` element with the id `sort-option` above the `#transaction-list` element within the `#list-section`.
2. THE Sort_Control SHALL contain exactly three options: a default placeholder option with an empty value (e.g. "Sort by…"), an option with value `"amount"` labelled "Sort by Amount", and an option with value `"category"` labelled "Sort by Category".
3. WHEN the App initializes, THE Sort_Control SHALL display the default placeholder option as the selected value.

---

### Requirement 2: Sort by Amount

**User Story:** As a user, I want to sort my transactions from smallest to largest amount, so that I can quickly identify my cheapest expenses.

#### Acceptance Criteria

1. WHEN the user selects the `"amount"` option in the Sort_Control, THE App SHALL re-render the Transaction_List with transactions ordered by amount from the smallest value to the largest value (ascending numeric order).
2. WHEN two transactions have equal amounts, THE App SHALL preserve their relative insertion order (stable sort).
3. WHEN the user selects the `"amount"` option, THE App SHALL NOT modify the transaction array held by StateManager.
4. WHEN the user selects the `"amount"` option, THE App SHALL NOT write any changes to Storage.
5. WHEN the user selects the `"amount"` option, THE App SHALL NOT update the Balance_Display or the Chart.

---

### Requirement 3: Sort by Category

**User Story:** As a user, I want to sort my transactions alphabetically by category, so that I can see all expenses of the same type grouped together.

#### Acceptance Criteria

1. WHEN the user selects the `"category"` option in the Sort_Control, THE App SHALL re-render the Transaction_List with transactions ordered alphabetically A–Z by their category value.
2. WHEN two transactions share the same category, THE App SHALL preserve their relative insertion order (stable sort).
3. WHEN the user selects the `"category"` option, THE App SHALL NOT modify the transaction array held by StateManager.
4. WHEN the user selects the `"category"` option, THE App SHALL NOT write any changes to Storage.
5. WHEN the user selects the `"category"` option, THE App SHALL NOT update the Balance_Display or the Chart.

---

### Requirement 4: Display-Only Sorting

**User Story:** As a user, I want sorting to only affect what I see in the list, so that my saved data and totals are never accidentally reordered or corrupted.

#### Acceptance Criteria

1. THE App SHALL sort a shallow copy of the transaction array returned by StateManager.getAll() and SHALL NOT mutate the original array.
2. WHEN a new transaction is added while a sort option is active, THE App SHALL re-render the Transaction_List applying the currently selected Sort_Order to the updated transaction array.
3. WHEN a transaction is deleted while a sort option is active, THE App SHALL re-render the Transaction_List applying the currently selected Sort_Order to the updated transaction array.
4. WHEN the user selects the default placeholder option in the Sort_Control, THE App SHALL re-render the Transaction_List in the original insertion order as returned by StateManager.getAll().

---

### Requirement 5: Integration with Existing Rendering

**User Story:** As a developer, I want the sort feature to use the existing Renderer.renderList method, so that the implementation stays consistent with the current codebase structure.

#### Acceptance Criteria

1. THE App SHALL call Renderer.renderList with the sorted (or unsorted) transaction array whenever the Sort_Control value changes.
2. THE App SHALL NOT call Renderer.renderBalance or ChartManager.update when handling a Sort_Control change event.
3. THE App SHALL attach a `"change"` event listener to the Sort_Control during the App initialization phase.
