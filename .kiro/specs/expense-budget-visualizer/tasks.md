# Implementation Plan: Expense & Budget Visualizer

## Overview

Build a single-page, client-side web application using plain HTML, CSS, and Vanilla JavaScript. The app lets users record expenses by category, view a running balance, and explore spending distribution via a Chart.js pie chart. All data persists in `localStorage`. The implementation follows a strict unidirectional data-flow: write to storage first, then commit to in-memory state, then re-render DOM.

---

## Tasks

- [x] 1. Set up project file structure and HTML entry point
  - Create `expense-budget-visualizer/index.html` with the full page structure: Input_Form (`<form id="expense-form">`), Balance_Display (`<div id="balance-display"><span id="balance-value"></span></div>`), Transaction_List (`<ul id="transaction-list">`), and Pie_Chart (`<canvas id="pie-chart"></canvas>`)
  - Add inline error `<span>` elements for each form field (`#item-name-error`, `#amount-error`, `#category-error`)
  - Load Chart.js from CDN: `https://cdn.jsdelivr.net/npm/chart.js`
  - Link `css/style.css` and `js/app.js` via `<link>` and `<script defer>` tags
  - Create `expense-budget-visualizer/css/style.css` as an empty placeholder
  - Create `expense-budget-visualizer/js/app.js` as an empty placeholder
  - _Requirements: 7.1, 7.3, 7.4, 7.5_

- [x] 2. Implement utility functions and data model
  - [x] 2.1 Implement `generateId()` and `formatCurrency()` in `js/app.js`
    - `generateId()`: uses `crypto.randomUUID()` with `Date.now().toString()` fallback
    - `formatCurrency(amount)`: returns a string starting with `$` and formatted with exactly 2 decimal places and thousands separators (e.g. `"$1,234.56"`)
    - _Requirements: 2.1, 4.1_

  - [ ]* 2.2 Write property test for `formatCurrency` (Property 7)
    - **Property 7: Currency formatting always produces exactly 2 decimal places with a symbol prefix**
    - Generate non-negative finite numbers (0, integers, decimals, large values, values with >2 dp) using fast-check
    - Assert the result starts with `$` and the decimal portion is exactly 2 digits
    - Tag: `// Feature: expense-budget-visualizer, Property 7`
    - **Validates: Requirements 2.1, 4.1**

- [x] 3. Implement the Storage Module
  - [x] 3.1 Implement `loadFromStorage()` and `saveToStorage()` in `js/app.js`
    - `loadFromStorage()`: reads `"expense-transactions"` from `localStorage`, parses JSON, filters out invalid Transaction entries (validates `id`, `name`, `amount`, `category`, `timestamp` per design rules), returns valid array or `[]` on any parse failure
    - `saveToStorage(transactions)`: serializes and writes to `localStorage`; throws `'StorageWriteError'` if `localStorage.setItem` throws
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.6_

  - [ ]* 3.2 Write property test for storage round-trip (Property 1)
    - **Property 1: Add then retrieve round-trip**
    - Generate arbitrary valid Transaction objects; save then load and assert the loaded array contains an entry with matching `id`, `name`, `amount`, `category`, and `timestamp`
    - Tag: `// Feature: expense-budget-visualizer, Property 1`
    - **Validates: Requirements 6.1, 6.3, 2.4**

  - [ ]* 3.3 Write property test for mixed valid/invalid storage round-trip (Property 6)
    - **Property 6: Storage round-trip discards invalid entries and preserves valid ones**
    - Generate arrays mixing valid and invalid Transaction shapes; assert result length equals valid-entry count and every entry satisfies all Transaction validation rules
    - Tag: `// Feature: expense-budget-visualizer, Property 6`
    - **Validates: Requirements 6.6, 2.4**

- [x] 4. Checkpoint — Verify utility and storage logic
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement the Validator
  - [x] 5.1 Implement `validateForm(itemName, amountStr, category)` in `js/app.js`
    - Returns `{ valid: boolean, errors: { itemName?, amount?, category? } }`
    - `itemName`: non-empty after trim, max 100 chars
    - `amountStr`: parses to a finite positive number, ≤ 999,999,999.99, matches `/^\d+(\.\d{1,2})?$/`
    - `category`: must be one of `["Food", "Transport", "Fun"]`
    - _Requirements: 1.3, 1.4_

  - [ ]* 5.2 Write property test for invalid input rejection (Property 2)
    - **Property 2: Invalid inputs are rejected by the validator**
    - Generate: whitespace-only strings, empty strings (invalid name); non-positive numbers, zero, non-numeric strings, values >999,999,999.99, values with >2 decimal places (invalid amount)
    - Assert `validateForm` returns `valid: false` for each generated invalid input
    - Tag: `// Feature: expense-budget-visualizer, Property 2`
    - **Validates: Requirements 1.3, 1.4**

- [x] 6. Implement the Balance_Display renderer
  - [x] 6.1 Implement `renderBalance(transactions)` in `js/app.js`
    - Computes the sum of all `amount` fields and writes `formatCurrency(sum)` into `#balance-value`
    - For an empty array, renders `"$0.00"`
    - _Requirements: 4.1, 4.4_

  - [ ]* 6.2 Write property test for balance calculation (Property 3)
    - **Property 3: Balance equals the sum of all transaction amounts**
    - Generate arrays of valid Transaction objects (including empty array); assert the rendered balance string equals `formatCurrency` applied to the arithmetic sum of all amounts
    - Tag: `// Feature: expense-budget-visualizer, Property 3`
    - **Validates: Requirements 4.1, 4.4**

- [x] 7. Implement the Transaction_List renderer and delete handler
  - [x] 7.1 Implement `renderList(transactions)` in `js/app.js`
    - Clears `#transaction-list` and re-renders all items sorted by `timestamp` descending
    - Each `<li data-id="{id}">` contains: `<span class="item-name">`, `<span class="item-amount">` (formatted via `formatCurrency`), `<span class="item-category">`, and `<button class="delete-btn" aria-label="Delete {name}">✕</button>`
    - When `transactions` is empty, renders a single `<li>` with the no-transactions message
    - _Requirements: 2.1, 2.2, 2.3, 2.5_

  - [ ]* 7.2 Write property test for `renderList` ordering and structure (Property 8)
    - **Property 8: Transaction list renders all items newest-first with required fields and delete buttons**
    - Generate arrays of valid Transactions with distinct timestamps; assert items appear in descending timestamp order, each `<li>` contains name, formatted amount, category, and a delete button with `data-id` matching the transaction's `id`
    - Tag: `// Feature: expense-budget-visualizer, Property 8`
    - **Validates: Requirements 2.1, 2.3, 3.1**

  - [x] 7.3 Implement `handleDelete(id)` in `js/app.js`
    - Removes the transaction with the given `id` from a candidate array
    - Attempts `saveToStorage` first; on failure shows error banner and aborts (no state or DOM mutation)
    - On success: updates `transactions`, calls `renderList`, `renderBalance`, `renderChart`
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 6.2_

  - [ ]* 7.4 Write property test for delete removing from state and storage (Property 5)
    - **Property 5: Delete removes the target transaction from both state and storage**
    - Generate non-empty transaction arrays and a randomly chosen target `id`; after running delete logic assert the resulting array does not contain that `id`, `localStorage` value does not contain that `id`, and array length is exactly one less
    - Tag: `// Feature: expense-budget-visualizer, Property 5`
    - **Validates: Requirements 3.2, 6.2**

- [x] 8. Checkpoint — Verify list rendering and deletion
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Implement the Pie_Chart and chart data aggregation
  - [x] 9.1 Implement chart data aggregation logic and `initChart()` / `renderChart(transactions)` in `js/app.js`
    - Extract a pure `aggregateChartData(transactions)` helper that returns `{ labels, data, colors }` — one entry per category with at least one transaction; value equals sum of that category's amounts; uses fixed color map `{ Food: "#FF6384", Transport: "#36A2EB", Fun: "#FFCE56" }`
    - `initChart()`: creates a single Chart.js doughnut/pie instance on `#pie-chart`; stores it in module-level `chartInstance`; shows "No spending data available" label when data is empty
    - `renderChart(transactions)`: mutates `chart.data` and calls `chart.update()` — never recreates the instance
    - _Requirements: 5.1, 5.4, 5.5, 5.6, 5.7_

  - [ ]* 9.2 Write property test for chart data aggregation (Property 4)
    - **Property 4: Pie chart segments are proportional and absent for empty categories**
    - Generate arrays of valid Transactions with varying category distributions (including single-entry categories); assert the aggregated data contains exactly one entry per category that has ≥1 transaction, with each entry's value equal to the sum of that category's amounts; categories with zero transactions must have no entry
    - Tag: `// Feature: expense-budget-visualizer, Property 4`
    - **Validates: Requirements 5.1, 5.7, 3.5**

- [x] 10. Implement the Input_Form submit handler and full application wiring
  - [-] 10.1 Implement `handleFormSubmit(event)` and `resetForm()` in `js/app.js`
    - `handleFormSubmit`: prevents default, reads field values, calls `validateForm`; on invalid input displays inline errors and returns; on valid input builds a Transaction object (using `generateId()` and `Date.now()`), calls `saveToStorage` first — on write failure shows error banner and returns — on success prepends to `transactions`, calls `renderList`, `renderBalance`, `renderChart`, then `resetForm`
    - `resetForm()`: clears all field values and all error spans
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 6.1, 6.5, 8.1_

  - [x] 10.2 Wire up application initialization in `js/app.js`
    - On `DOMContentLoaded`: check `localStorage` availability; if absent, render fatal error and return
    - Call `loadFromStorage()` to hydrate `transactions`; if parse failed show error banner
    - Call `initChart()`, `renderList(transactions)`, `renderBalance(transactions)`, `renderChart(transactions)`
    - Attach `handleFormSubmit` to `#expense-form` `submit` event
    - Attach delegated `click` listener on `#transaction-list` to call `handleDelete` when a `.delete-btn` is clicked
    - _Requirements: 2.4, 2.6, 6.3, 6.4, 7.6_

- [~] 11. Implement CSS styling
  - [~] 11.1 Write `css/style.css` with responsive layout and visual design
    - Use a single-column layout; separate Input_Form, Balance_Display, Transaction_List, and Pie_Chart into visually distinct sections with at least 16px spacing or a visible border between them
    - Body font ≥ 14px; headings and Balance_Display value ≥ 16px
    - Responsive from 320px to 1440px: no horizontal scroll, no overlapping elements, all four sections reachable via vertical scroll
    - Style inline error spans (e.g. red text) and the error banner (e.g. dismissible top banner)
    - _Requirements: 8.2, 8.3, 8.4_

- [~] 12. Final checkpoint — Full integration verification
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Property-based tests use [fast-check](https://fast-check.io/) loaded via CDN or `npm install --save-dev fast-check`; each test runs a minimum of 100 iterations
- All property test files should be co-located in a `js/tests/` directory (e.g. `app.test.js`) and can be run with any test runner that supports ESM imports (e.g. Vitest or Jest with ESM config)
- The `localStorage` write-before-render contract is enforced in both `handleFormSubmit` and `handleDelete` — never update `transactions` or the DOM before `saveToStorage` succeeds
- Chart.js instance must be updated via `chart.data` mutation + `chart.update()` — never destroy and recreate to avoid canvas flickering
- Each property test task references a specific design property number and the requirements clause it validates

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "3.1", "5.1"] },
    { "id": 2, "tasks": ["2.2", "3.2", "3.3", "5.2", "6.1"] },
    { "id": 3, "tasks": ["6.2", "7.1", "9.1"] },
    { "id": 4, "tasks": ["7.2", "7.3", "9.2"] },
    { "id": 5, "tasks": ["7.4", "10.1"] },
    { "id": 6, "tasks": ["10.2"] },
    { "id": 7, "tasks": ["11.1"] }
  ]
}
```
