# Requirements Document

## Introduction

This feature adds a spending limit control to the Expense & Budget Visualizer. Users can enter a numeric threshold; any transaction whose amount exceeds that threshold is visually highlighted in the transaction list and labelled "Over limit". The limit persists across page reloads via localStorage. When no limit is set, the list renders exactly as before — no highlighting occurs.

The implementation must stay within the existing stack: plain HTML, CSS, and vanilla JavaScript. No build tools, no npm packages, no framework changes.

## Glossary

- **App**: The Expense & Budget Visualizer single-page application.
- **SpendingLimitManager**: The JavaScript module responsible for reading, writing, and exposing the spending limit value.
- **Renderer**: The existing JavaScript object that builds and updates the transaction list DOM.
- **Transaction**: An expense record with `id`, `name`, `amount`, `category`, and `timestamp` fields.
- **Spending_Limit**: A positive number entered by the user that defines the per-transaction threshold. An absent or cleared value means no limit is active.
- **Over-limit Transaction**: A Transaction whose `amount` is strictly greater than the active Spending_Limit.
- **Limit_Input**: The `<input type="number">` element in the UI where the user types the spending limit.
- **Over_Limit_Badge**: The inline `<span>` element appended to a transaction list item to indicate it exceeds the limit.

---

## Requirements

### Requirement 1: Spending Limit Input Field

**User Story:** As a user, I want an input field where I can type a spending limit, so that the app knows which transactions to flag.

#### Acceptance Criteria

1. THE App SHALL render a `<label>` and a `<input type="number">` (the Limit_Input) in the `#list-section`, above the transaction list.
2. THE Limit_Input SHALL accept only positive numeric values (min="0", step="any").
3. WHEN the page loads, THE Limit_Input SHALL display the previously saved Spending_Limit if one exists in localStorage, and SHALL be empty otherwise.

---

### Requirement 2: Persist the Spending Limit

**User Story:** As a user, I want my spending limit to be remembered between visits, so that I do not have to re-enter it every time I open the app.

#### Acceptance Criteria

1. WHEN the user changes the value of the Limit_Input, THE SpendingLimitManager SHALL save the new value to localStorage under a dedicated key.
2. WHEN the user clears the Limit_Input (sets it to empty), THE SpendingLimitManager SHALL remove the spending limit entry from localStorage.
3. THE SpendingLimitManager SHALL expose a `getLimit()` function that returns the stored Spending_Limit as a positive number, or `null` if no limit is set.
4. IF localStorage is unavailable, THEN THE SpendingLimitManager SHALL silently continue without saving and SHALL return `null` from `getLimit()`.

---

### Requirement 3: Highlight Over-Limit Transactions

**User Story:** As a user, I want transactions that exceed my spending limit to be visually highlighted, so that I can quickly identify large expenses.

#### Acceptance Criteria

1. WHEN the Renderer builds a transaction list item and a Spending_Limit is active, THE Renderer SHALL apply the CSS class `over-limit` to the `<li>` element of every Over-limit Transaction.
2. WHEN the Renderer builds a transaction list item and a Spending_Limit is active, THE Renderer SHALL append an Over_Limit_Badge (`<span class="over-limit-badge">Over limit</span>`) inside the `<li>` of every Over-limit Transaction.
3. WHILE no Spending_Limit is active, THE Renderer SHALL render all transaction list items without the `over-limit` class and without any Over_Limit_Badge.
4. WHILE a Spending_Limit is active, THE Renderer SHALL render transaction list items whose `amount` is less than or equal to the Spending_Limit without the `over-limit` class and without any Over_Limit_Badge.

---

### Requirement 4: Re-render on Limit Change

**User Story:** As a user, I want the transaction list to update immediately when I change the spending limit, so that the highlighted items always reflect the current threshold.

#### Acceptance Criteria

1. WHEN the value of the Limit_Input changes, THE App SHALL re-render the transaction list using the new Spending_Limit.
2. WHEN the Limit_Input is cleared, THE App SHALL re-render the transaction list with no highlighting applied.

---

### Requirement 5: No Highlight When No Limit Is Set

**User Story:** As a user, I want the transaction list to look unchanged when I have not set a spending limit, so that the UI is not cluttered by default.

#### Acceptance Criteria

1. WHEN the App initialises and no Spending_Limit is stored in localStorage, THE Renderer SHALL render all transaction list items without the `over-limit` class and without any Over_Limit_Badge.
2. WHEN the user clears the Limit_Input after having set a limit, THE Renderer SHALL remove the `over-limit` class and all Over_Limit_Badge elements from every transaction list item.
