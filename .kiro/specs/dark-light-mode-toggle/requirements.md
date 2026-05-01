# Requirements Document

## Introduction

This feature adds a Dark/Light mode toggle to the Expense & Budget Visualizer web app. A button in the header lets users switch between a light theme (the current default) and a dark theme. The selected theme is saved to `localStorage` so it persists across page reloads. The implementation adds only the minimum HTML, CSS, and vanilla JavaScript needed — it does not restructure or rewrite any existing code, and it must not break existing features (add/delete/sort transactions, localStorage persistence, Chart.js chart).

## Glossary

- **Theme_Toggle**: The button element placed in the `<header>` that switches between dark and light mode.
- **Theme_Manager**: The JavaScript logic (added to `js/app.js`) responsible for reading, applying, and persisting the selected theme.
- **Dark_Mode**: The visual state in which a `.dark-mode` CSS class is applied to `<body>`, overriding colors to a dark palette.
- **Light_Mode**: The default visual state with no `.dark-mode` class on `<body>`, using the existing light color palette.
- **Theme_Storage_Key**: The `localStorage` key `ebv_theme` used to persist the user's theme preference.
- **App**: The Expense & Budget Visualizer web application.

---

## Requirements

### Requirement 1: Theme Toggle Button

**User Story:** As a user, I want a clearly labeled toggle button in the header, so that I can switch between dark and light mode at any time.

#### Acceptance Criteria

1. THE App SHALL render a `<button>` element with `id="theme-toggle"` inside the existing `<header>`.
2. WHEN the App is in Light_Mode, THE Theme_Toggle SHALL display the text "Dark Mode".
3. WHEN the App is in Dark_Mode, THE Theme_Toggle SHALL display the text "Light Mode".
4. THE Theme_Toggle SHALL be keyboard-focusable and operable via the Enter and Space keys.

---

### Requirement 2: Theme Switching

**User Story:** As a user, I want clicking the toggle button to immediately switch the page theme, so that I can see the change without a page reload.

#### Acceptance Criteria

1. WHEN the Theme_Toggle is clicked while the App is in Light_Mode, THE Theme_Manager SHALL add the `.dark-mode` class to `<body>` and update the Theme_Toggle label to "Light Mode".
2. WHEN the Theme_Toggle is clicked while the App is in Dark_Mode, THE Theme_Manager SHALL remove the `.dark-mode` class from `<body>` and update the Theme_Toggle label to "Dark Mode".
3. WHEN the theme is toggled, THE App SHALL continue to display the transaction list, balance, chart, and form without visual breakage or loss of data.

---

### Requirement 3: Dark Mode Visual Styles

**User Story:** As a user, I want the dark theme to apply consistent dark colors across all visible sections, so that the interface is comfortable to use in low-light environments.

#### Acceptance Criteria

1. WHILE the `.dark-mode` class is present on `<body>`, THE App SHALL apply a dark background color (`#1a1a2e`) to `<body>`.
2. WHILE the `.dark-mode` class is present on `<body>`, THE App SHALL apply a light foreground text color (`#e2e8f0`) to `<body>`.
3. WHILE the `.dark-mode` class is present on `<body>`, THE App SHALL apply a dark surface color (`#16213e`) to the form section, chart section, and list section card backgrounds.
4. WHILE the `.dark-mode` class is present on `<body>`, THE App SHALL apply a dark border color (`#2d3748`) to card borders, input borders, and the header bottom border.
5. WHILE the `.dark-mode` class is present on `<body>`, THE App SHALL apply a dark input background (`#0f3460`) and light input text color (`#e2e8f0`) to all `<input>` and `<select>` elements within the form.
6. WHILE the `.dark-mode` class is present on `<body>`, THE App SHALL apply a dark background (`#0f3460`) and light text color (`#e2e8f0`) to transaction list items.
7. WHILE the `.dark-mode` class is present on `<body>`, THE App SHALL apply a dark background (`#1a1a2e`) and a contrasting border to the Theme_Toggle button.

---

### Requirement 4: Theme Persistence

**User Story:** As a user, I want my theme preference to be remembered after I close or reload the page, so that I do not have to re-select my preferred theme every visit.

#### Acceptance Criteria

1. WHEN the user toggles the theme, THE Theme_Manager SHALL write the active theme value (`"dark"` or `"light"`) to `localStorage` under the key `ebv_theme`.
2. WHEN the App initialises on page load and `localStorage` contains the key `ebv_theme` with value `"dark"`, THE Theme_Manager SHALL apply Dark_Mode before the first render.
3. WHEN the App initialises on page load and `localStorage` does not contain the key `ebv_theme`, THE Theme_Manager SHALL default to Light_Mode.
4. IF `localStorage` is unavailable during theme read or write, THEN THE Theme_Manager SHALL silently fall back to Light_Mode without throwing an uncaught error or disrupting other App features.

---

### Requirement 5: Non-Regression

**User Story:** As a developer, I want the dark/light mode feature to be additive only, so that no existing functionality is broken by the change.

#### Acceptance Criteria

1. WHEN the dark/light mode feature is added, THE App SHALL continue to add, delete, and display transactions correctly in both Light_Mode and Dark_Mode.
2. WHEN the dark/light mode feature is added, THE App SHALL continue to persist and reload transactions from `localStorage` using the existing `ebv_transactions` key.
3. WHEN the dark/light mode feature is added, THE App SHALL continue to render the Chart.js pie chart correctly in both Light_Mode and Dark_Mode.
4. WHEN the dark/light mode feature is added, THE App SHALL continue to sort transactions by amount and category without errors.
