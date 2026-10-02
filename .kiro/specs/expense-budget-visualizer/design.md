# Design Document: Expense & Budget Visualizer

## Overview

The Expense & Budget Visualizer is a single-page, client-side web application that lets users record personal expenses by category, monitor a running total balance, and understand spending distribution through an auto-updating pie chart. The entire application runs in the browser with no backend, no build step, and no JavaScript framework — only HTML, CSS, Vanilla JavaScript, and Chart.js (loaded via CDN).

All data is persisted in the browser's `localStorage` API as a serialized JSON array of Transaction objects. On every add or delete action, the UI updates synchronously and the data is written to `localStorage` before the DOM changes are committed.

### Goals

- Provide a frictionless expense-entry experience with full inline validation.
- Give instant visual feedback (balance and pie chart) within 100 ms of any add/delete.
- Survive page refreshes by restoring all state from `localStorage`.
- Remain entirely dependency-free from a build-tooling perspective.

---

## Architecture

The application follows a **unidirectional data-flow** pattern inside a single JavaScript module:

```
User Action
    │
    ▼
┌──────────────────────────────────────────────────────────────┐
│                        app.js  (single module)               │
│                                                              │
│   Input_Form ──► Validator ──► State (transactions[])        │
│                                    │                         │
│                                    ├──► localStorage.write() │
│                                    ├──► renderList()         │
│                                    ├──► renderBalance()      │
│                                    └──► renderChart()        │
└──────────────────────────────────────────────────────────────┘
         ▲
         │  load
    localStorage.read()
```

**Key architectural decisions:**

1. **Single source of truth** — the in-memory `transactions` array is always the authoritative state. `localStorage` is kept in sync on every mutation before any DOM update.
2. **Write-before-render** — `localStorage` is written first; if the write throws, the operation is aborted and the UI is not changed.
3. **Full re-render on mutation** — the Transaction_List, Balance_Display, and Pie_Chart are re-rendered from scratch on every state change. This keeps the rendering logic simple and eliminates DOM-diff complexity.
4. **Chart.js instance lifecycle** — a single `Chart` instance is created on load and updated (not recreated) via `chart.data` mutation + `chart.update()` on every state change, which avoids canvas flickering.

### File Structure

```
expense-budget-visualizer/
├── index.html        ← single HTML entry point
├── css/
│   └── style.css     ← single CSS file
└── js/
    └── app.js        ← single JavaScript file
```

---

## Components and Interfaces

### 1. Input_Form

**HTML element**: `<form id="expense-form">`

| Field | Element | Constraints |
|---|---|---|
| Item name | `<input type="text" id="item-name">` | max 100 chars, non-empty |
| Amount | `<input type="number" id="amount">` | positive, ≤ 999,999,999.99, ≤ 2 decimal places |
| Category | `<select id="category">` | options: Food, Transport, Fun |

**Inline error targets**: `<span class="error" id="item-name-error">`, `<span class="error" id="amount-error">`, `<span class="error" id="category-error">`

**JavaScript interface**:
```js
// Called on form submit event
function handleFormSubmit(event) { ... }

// Validates all fields; returns { valid: boolean, errors: { field: message } }
function validateForm(itemName, amount, category) { ... }

// Clears all fields and error spans
function resetForm() { ... }
```

### 2. Transaction_List

**HTML element**: `<ul id="transaction-list">`

Each item is rendered as:
```html
<li data-id="{id}">
  <span class="item-name">{name}</span>
  <span class="item-amount">{currencyFormat(amount)}</span>
  <span class="item-category">{category}</span>
  <button class="delete-btn" aria-label="Delete {name}">✕</button>
</li>
```

**JavaScript interface**:
```js
// Re-renders the full list from the transactions array
function renderList(transactions) { ... }

// Called on delete button click; receives transaction id
function handleDelete(id) { ... }
```

### 3. Balance_Display

**HTML element**: `<div id="balance-display"><span id="balance-value"></span></div>`

**JavaScript interface**:
```js
// Computes sum and updates the DOM element
function renderBalance(transactions) { ... }
```

### 4. Pie_Chart

**HTML element**: `<canvas id="pie-chart"></canvas>`

Chart.js instance is held in a module-level variable and updated (not replaced) on each state change.

**JavaScript interface**:
```js
// Creates the Chart.js instance on first load
function initChart() { ... }

// Updates chart.data and calls chart.update()
function renderChart(transactions) { ... }
```

**Chart.js CDN**:
```html
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
```
Source: [Chart.js jsDelivr CDN](https://www.jsdelivr.com/package/npm/chart.js?path=dist)

**Category color map** (fixed, never changes):
| Category | Color |
|---|---|
| Food | `#FF6384` |
| Transport | `#36A2EB` |
| Fun | `#FFCE56` |

### 5. Storage Module (inline in app.js)

**JavaScript interface**:
```js
// Returns parsed Transaction[] or [] on parse failure
function loadFromStorage() { ... }

// Serializes and writes; throws StorageWriteError on failure
function saveToStorage(transactions) { ... }
```

### 6. Validator

**JavaScript interface**:
```js
// Returns { valid: boolean, errors: object }
function validateForm(itemName, amountStr, category) { ... }
```

Validation rules:
- `itemName`: must be a non-empty string after trimming; max 100 characters.
- `amountStr`: must parse to a finite positive number; must not exceed 999,999,999.99; must have at most 2 decimal places (checked via regex `/^\d+(\.\d{1,2})?$/`).
- `category`: must be one of `["Food", "Transport", "Fun"]`.

### 7. Utility Functions

```js
// Formats a number as currency: "$1,234.56"
function formatCurrency(amount) { ... }

// Generates a unique id for each transaction
function generateId() { ... }  // uses crypto.randomUUID() with Date.now() fallback
```

---

## Data Models

### Transaction Object

```js
/**
 * @typedef {Object} Transaction
 * @property {string}  id        - Unique identifier (UUID or timestamp-based fallback)
 * @property {string}  name      - Item name (1–100 characters)
 * @property {number}  amount    - Positive number, ≤ 2 decimal places, ≤ 999,999,999.99
 * @property {string}  category  - One of "Food" | "Transport" | "Fun"
 * @property {number}  timestamp - Unix ms timestamp at time of creation
 */
```

**Example**:
```json
{
  "id": "a1b2c3d4-...",
  "name": "Lunch",
  "amount": 12.50,
  "category": "Food",
  "timestamp": 1712345678901
}
```

### localStorage Schema

- **Key**: `"expense-transactions"`
- **Value**: JSON-serialized `Transaction[]`

```json
[
  { "id": "...", "name": "Lunch", "amount": 12.50, "category": "Food", "timestamp": 1712345678901 },
  { "id": "...", "name": "Bus pass", "amount": 3.00, "category": "Transport", "timestamp": 1712345600000 }
]
```

**Validation on load** — a Transaction object is considered valid if and only if:
- `id` is a non-empty string
- `name` is a non-empty string (after trim), max 100 chars
- `amount` is a finite positive number, ≤ 999,999,999.99
- `category` is one of `"Food"`, `"Transport"`, `"Fun"`
- `timestamp` is a finite positive integer

Invalid entries are silently discarded; the valid subset is restored.

### Application State

```js
// Module-level state in app.js
let transactions = [];   // Transaction[]
let chartInstance = null; // Chart.js instance
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Add then retrieve round-trip

*For any* valid Transaction object added to the app, serializing the resulting transaction list to localStorage and then deserializing it back should produce a list that contains an entry with the same `id`, `name`, `amount`, `category`, and `timestamp` as the transaction that was added.

**Validates: Requirements 6.1, 6.3, 2.4**

---

### Property 2: Invalid inputs are rejected by the validator

*For any* input where the item name is composed entirely of whitespace characters (including the empty string), or where the amount string is non-positive, zero, non-numeric, exceeds 999,999,999.99, or has more than 2 decimal places, `validateForm` should return `valid: false` and the transaction list should remain unchanged after the attempted submission.

**Validates: Requirements 1.3, 1.4**

---

### Property 3: Balance equals the sum of all transaction amounts

*For any* array of transactions (including the empty array), the value rendered in the Balance_Display should equal the arithmetic sum of all `amount` fields in the array, formatted as a currency string with a symbol prefix and exactly 2 decimal places. For an empty array the result is always `"$0.00"`.

**Validates: Requirements 4.1, 4.4**

---

### Property 4: Pie chart segments are proportional and absent for empty categories

*For any* array of transactions, the data passed to the Chart.js instance should contain exactly one entry per category that has at least one transaction, with each entry's value equal to the sum of `amount` fields for that category. Categories with zero transactions must have no corresponding entry.

**Validates: Requirements 5.1, 5.7, 3.5**

---

### Property 5: Delete removes the target transaction from both state and storage

*For any* non-empty transaction array and any transaction `id` present in that array, after the delete handler runs the resulting in-memory array should not contain that `id`, the serialized localStorage value should not contain that `id`, and the array length should be exactly one less than before.

**Validates: Requirements 3.2, 6.2**

---

### Property 6: Storage round-trip discards invalid entries and preserves valid ones

*For any* raw array value that contains a mixture of valid and invalid Transaction objects, the validation filter applied during `loadFromStorage` should return a list whose length equals the count of valid entries, where every entry in the result satisfies all Transaction validation rules (non-empty string `id`, trimmed non-empty `name` ≤ 100 chars, finite positive `amount` ≤ 999,999,999.99, `category` in `["Food","Transport","Fun"]`, finite positive integer `timestamp`).

**Validates: Requirements 6.6, 2.4**

---

### Property 7: Currency formatting always produces exactly 2 decimal places with a symbol prefix

*For any* non-negative finite number, `formatCurrency` should return a string that starts with a currency symbol and whose decimal portion is exactly 2 digits (e.g. `formatCurrency(0)` → `"$0.00"`, `formatCurrency(1234.5)` → `"$1,234.50"`, `formatCurrency(0.999)` → `"$1.00"`).

**Validates: Requirements 2.1, 4.1**

---

### Property 8: Transaction list renders all items newest-first with required fields and delete buttons

*For any* non-empty array of transactions with distinct timestamps, `renderList` should produce a DOM structure where items appear in descending timestamp order, each item contains the transaction's `name`, the `formatCurrency(amount)` string, the `category` label, and exactly one delete button element with a `data-id` attribute matching the transaction's `id`.

**Validates: Requirements 2.1, 2.3, 3.1**

---

## Error Handling

### localStorage Write Failure (Requirement 6.5)

When `localStorage.setItem` throws (e.g., storage quota exceeded or private-browsing restrictions):
- The write is attempted first, before any DOM mutation.
- If it throws, the `transactions` array is **not** modified.
- An error message banner is displayed to the user (e.g. "Could not save your data. Please check your storage settings.").
- The UI remains in its previous valid state.

```js
function saveToStorage(transactions) {
  try {
    localStorage.setItem('expense-transactions', JSON.stringify(transactions));
  } catch (e) {
    throw new Error('StorageWriteError');
  }
}

function handleFormSubmit(event) {
  event.preventDefault();
  // ... validate ...
  const newTransaction = buildTransaction(...);
  const next = [newTransaction, ...transactions];
  try {
    saveToStorage(next);         // write first
  } catch {
    showErrorBanner('Could not save. Storage may be full.');
    return;                      // abort — DOM unchanged
  }
  transactions = next;           // commit to state
  renderAll(transactions);       // then update UI
}
```

### localStorage Read Failure (Requirement 2.6, 6.4)

On load, if `localStorage.getItem` returns `null` or `JSON.parse` throws:
- The app initializes with `transactions = []`.
- If the value was present but unparseable, an error message is shown to the user.
- Balance_Display shows `$0.00`, Transaction_List shows the empty-state message, Pie_Chart shows the no-data label.

### Invalid Transaction Objects in Storage (Requirement 6.6)

Each entry in the parsed array is individually validated. Invalid entries are filtered out silently; the valid subset is used to initialize state.

### Unsupported Browser Features (Requirement 7.6)

On load, before any initialization:
```js
if (typeof localStorage === 'undefined') {
  document.body.innerHTML = '<p class="fatal-error">This browser does not support localStorage. The app cannot run.</p>';
  return;
}
// Canvas / Chart.js check deferred until chart init
```

If Chart.js fails to load (CDN unreachable), the `<canvas>` element will not initialize and a fallback message is shown in the chart container.

### Validation Errors (Requirements 1.3, 1.4)

Inline error spans are shown adjacent to each invalid field. The form submission is prevented. Errors are cleared on the next successful submission or when the user corrects the field.

---

## Testing Strategy

### Overview

This feature is a client-side Vanilla JS application. The core logic (validation, balance calculation, storage serialization, currency formatting, chart data aggregation) consists of **pure functions** that are well-suited to property-based testing. UI rendering and Chart.js integration are better verified with example-based and snapshot tests.

### Dual Approach

| Layer | Approach |
|---|---|
| Pure logic (validator, formatCurrency, storage serialization, balance sum, chart data aggregation) | Property-based tests |
| UI rendering (DOM output of renderList, renderBalance) | Example-based unit tests |
| Chart.js integration | Example-based unit tests with Chart.js instance mocked |
| End-to-end (full add/delete flow in browser) | Manual smoke tests |

### Property-Based Testing

**Library**: [fast-check](https://fast-check.io/) — the leading property-based testing library for JavaScript.

Each property test runs a **minimum of 100 iterations** with randomly generated inputs.

Each test is tagged with a comment referencing the corresponding design property:
```
// Feature: expense-budget-visualizer, Property {N}: {property_text}
```

**Properties to implement as property-based tests:**

| Property | Function under test | Generator description |
|---|---|---|
| Property 1: Add then retrieve round-trip | `saveToStorage` / `loadFromStorage` | Arbitrary valid Transaction objects |
| Property 2: Invalid inputs rejected by validator | `validateForm` | Whitespace strings, negative/zero numbers, numbers with >2 dp, values > 999,999,999.99 |
| Property 3: Balance equals sum | balance aggregation logic | Arrays of valid Transaction objects (including empty array) |
| Property 4: Pie chart segments proportional, absent for empty categories | chart data aggregation function | Arrays of valid Transactions with varying category distributions, including single-entry categories |
| Property 5: Delete removes from state and storage | delete handler logic | Non-empty transaction arrays with a randomly chosen target id |
| Property 6: Mixed valid/invalid storage round-trip | `loadFromStorage` validation filter | Arrays mixing valid and invalid Transaction shapes |
| Property 7: Currency formatting produces exactly 2 decimal places | `formatCurrency` | Non-negative finite numbers: 0, integers, decimals, large values, values with >2 dp |
| Property 8: renderList renders items newest-first with required fields and delete buttons | `renderList` | Arrays of valid Transactions with distinct timestamps |

### Unit Tests (Example-Based)

- Input_Form renders with correct fields and default state.
- Submitting a valid form adds an item to the list.
- Submitting an empty form shows all three error messages.
- Deleting the last transaction in a category removes that segment from the chart data.
- On load with empty storage, the empty-state message is displayed.
- On load with corrupted storage, an error message is displayed and the list is empty.
- `formatCurrency(0)` → `"$0.00"`.
- `formatCurrency(1234567.89)` → `"$1,234,567.89"`.

### Manual / Smoke Tests

- Open `index.html` directly in Chrome, Firefox, Edge, and Safari — no server required.
- Add 5 transactions across all three categories; verify chart renders all three segments.
- Refresh the page; verify all 5 transactions are restored.
- Delete all transactions; verify empty-state message and chart no-data label appear.
- Resize viewport from 320px to 1440px; verify no horizontal scroll or overlapping elements.
- Fill localStorage to capacity (or use a stub) and attempt to add a transaction; verify error banner appears and no data is corrupted.
