// Expense & Budget Visualizer - Application Logic
// Populated in Tasks 2–10

// ─── Utility Functions ────────────────────────────────────────────────────────

/**
 * Generates a unique string ID.
 * Uses crypto.randomUUID() when available, falls back to Date.now().
 * @returns {string}
 */
function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Date.now().toString();
}

/**
 * Formats a number as a USD currency string with exactly 2 decimal places
 * and thousands separators. E.g. 1234.5 → "$1,234.50"
 * @param {number} amount
 * @returns {string}
 */
function formatCurrency(amount) {
  return '$' + amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ─── Storage Module ───────────────────────────────────────────────────────────

const STORAGE_KEY = 'expense-transactions';
const VALID_CATEGORIES = ['Food', 'Transport', 'Fun'];

/**
 * Returns true if the given object is a valid Transaction.
 * @param {*} t
 * @returns {boolean}
 */
function isValidTransaction(t) {
  if (!t || typeof t !== 'object') return false;
  if (typeof t.id !== 'string' || t.id.trim() === '') return false;
  if (typeof t.name !== 'string' || t.name.trim() === '' || t.name.trim().length > 100) return false;
  if (typeof t.amount !== 'number' || !isFinite(t.amount) || t.amount <= 0 || t.amount > 999999999.99) return false;
  if (!VALID_CATEGORIES.includes(t.category)) return false;
  if (typeof t.timestamp !== 'number' || !isFinite(t.timestamp) || t.timestamp <= 0 || !Number.isInteger(t.timestamp)) return false;
  return true;
}

/**
 * Reads Transaction data from localStorage.
 * Parses the stored JSON array and filters out any entries that do not satisfy
 * the Transaction validation rules. Returns an empty array if the key is absent,
 * the value cannot be parsed, or the parsed value is not an array.
 *
 * Validation rules per entry:
 * - id: non-empty string
 * - name: non-empty string after trim, max 100 characters
 * - amount: finite positive number, ≤ 999,999,999.99
 * - category: one of "Food", "Transport", "Fun"
 * - timestamp: finite positive integer
 *
 * @returns {Transaction[]} Array of valid Transaction objects (may be empty)
 */
function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidTransaction);
  } catch (e) {
    return [];
  }
}

/**
 * Serializes the given Transaction array and writes it to localStorage.
 * Throws an Error with message 'StorageWriteError' if the write fails
 * (e.g. storage quota exceeded or private-browsing restrictions).
 *
 * @param {Transaction[]} transactions
 * @throws {Error} 'StorageWriteError' on write failure
 */
function saveToStorage(transactions) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
  } catch (e) {
    throw new Error('StorageWriteError');
  }
}

// ─── Validator ────────────────────────────────────────────────────────────────

/**
 * Validates the three Input_Form fields before a transaction is created.
 *
 * Rules:
 * - itemName: non-empty after trimming, max 100 characters
 * - amountStr: matches /^\d+(\.\d{1,2})?$/, parses to a finite positive number
 *              no greater than 999,999,999.99
 * - category:  one of "Food", "Transport", "Fun"
 *
 * @param {string} itemName   - Raw value from the item-name input
 * @param {string} amountStr  - Raw string value from the amount input
 * @param {string} category   - Selected value from the category dropdown
 * @returns {{ valid: boolean, errors: { itemName?: string, amount?: string, category?: string } }}
 *
 * Requirements: 1.3, 1.4
 */
function validateForm(itemName, amountStr, category) {
  const errors = {};

  // ── Item name ──────────────────────────────────────────────────────────────
  if (typeof itemName !== 'string' || itemName.trim() === '') {
    errors.itemName = 'Item name is required.';
  } else if (itemName.trim().length > 100) {
    errors.itemName = 'Item name must be 100 characters or fewer.';
  }

  // ── Amount ─────────────────────────────────────────────────────────────────
  const AMOUNT_REGEX = /^\d+(\.\d{1,2})?$/;
  const MAX_AMOUNT = 999999999.99;

  if (typeof amountStr !== 'string' || amountStr.trim() === '') {
    errors.amount = 'Amount is required.';
  } else if (!AMOUNT_REGEX.test(amountStr.trim())) {
    // Covers: non-numeric, zero (fails positive check below), >2 decimal places,
    // negative numbers (leading minus fails the regex), empty-after-trim
    errors.amount = 'Amount must be a positive number with at most 2 decimal places.';
  } else {
    const parsed = parseFloat(amountStr.trim());
    if (!isFinite(parsed) || parsed <= 0) {
      errors.amount = 'Amount must be a positive number with at most 2 decimal places.';
    } else if (parsed > MAX_AMOUNT) {
      errors.amount = 'Amount must not exceed 999,999,999.99.';
    }
  }

  // ── Category ───────────────────────────────────────────────────────────────
  if (!VALID_CATEGORIES.includes(category)) {
    errors.category = 'Please select a category.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

// ─── Error Banner ─────────────────────────────────────────────────────────────

/**
 * Displays a dismissible error banner at the top of the page.
 * Reuses the #error-banner element already present in index.html.
 * @param {string} message
 */
function showErrorBanner(message) {
  const banner = document.getElementById('error-banner');
  const bannerMsg = document.getElementById('error-banner-message');
  const closeBtn = document.getElementById('error-banner-close');

  if (!banner || !bannerMsg) return;

  bannerMsg.textContent = message;
  banner.hidden = false;

  if (closeBtn) {
    // Replace any existing listener to avoid stacking handlers
    const newClose = closeBtn.cloneNode(true);
    closeBtn.parentNode.replaceChild(newClose, closeBtn);
    newClose.addEventListener('click', () => {
      banner.hidden = true;
    });
  }
}

// ─── Transaction List ─────────────────────────────────────────────────────────

/**
 * Re-renders the full Transaction_List from the given transactions array.
 *
 * - Sorts transactions by `timestamp` descending (newest first).
 * - Each <li> carries a `data-id` attribute and contains:
 *     <span class="item-name">, <span class="item-amount">,
 *     <span class="item-category">, <button class="delete-btn">
 * - When the array is empty, renders a single placeholder <li>.
 *
 * Requirements: 2.1, 2.2, 2.3, 2.5
 *
 * @param {Transaction[]} transactions
 */
function renderList(transactions) {
  const ul = document.getElementById('transaction-list');
  if (!ul) return;

  // Clear existing content
  ul.innerHTML = '';

  if (transactions.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'no-transactions';
    empty.textContent = 'No transactions recorded yet.';
    ul.appendChild(empty);
    return;
  }

  // Sort newest-first (descending timestamp)
  const sorted = transactions.slice().sort((a, b) => b.timestamp - a.timestamp);

  sorted.forEach((tx) => {
    const li = document.createElement('li');
    li.setAttribute('data-id', tx.id);

    const nameSpan = document.createElement('span');
    nameSpan.className = 'item-name';
    nameSpan.textContent = tx.name;

    const amountSpan = document.createElement('span');
    amountSpan.className = 'item-amount';
    amountSpan.textContent = formatCurrency(tx.amount);

    const categorySpan = document.createElement('span');
    categorySpan.className = 'item-category';
    categorySpan.textContent = tx.category;

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.setAttribute('aria-label', `Delete ${tx.name}`);
    deleteBtn.textContent = '✕';

    li.appendChild(nameSpan);
    li.appendChild(amountSpan);
    li.appendChild(categorySpan);
    li.appendChild(deleteBtn);

    ul.appendChild(li);
  });
}

// ─── Delete Handler ───────────────────────────────────────────────────────────

/**
 * Removes the transaction with the given `id` from the application state.
 *
 * Flow (write-before-render contract):
 *  1. Build `candidate` — a copy of `transactions` with the target id removed.
 *  2. Attempt `saveToStorage(candidate)`.
 *     - On failure: show error banner and return (no state or DOM mutation).
 *  3. On success: commit `transactions = candidate`.
 *  4. Re-render list, balance, and chart.
 *
 * Requirements: 3.2, 3.3, 3.4, 3.5, 6.2
 *
 * @param {string} id - The id of the transaction to delete
 */
function handleDelete(id) {
  const candidate = transactions.filter((tx) => tx.id !== id);

  try {
    saveToStorage(candidate);
  } catch (e) {
    showErrorBanner('Could not save your data. Please check your storage settings.');
    return; // Abort — state and DOM unchanged
  }

  // Commit state only after successful storage write
  transactions = candidate;

  renderList(transactions);

  if (typeof renderBalance === 'function') renderBalance(transactions);
  if (typeof renderChart === 'function') renderChart(transactions);
}

// ─── Balance Display ──────────────────────────────────────────────────────────

/**
 * Computes the total of all transaction amounts and updates the #balance-value
 * DOM element with the formatted currency string.
 *
 * - Sums all `tx.amount` values using reduce (initial value 0).
 * - Writes `formatCurrency(total)` into `#balance-value`.
 * - Returns early if the DOM element is not found.
 * - For an empty array, renders "$0.00".
 *
 * Requirements: 4.1, 4.4
 *
 * @param {Transaction[]} transactions
 */
function renderBalance(transactions) {
  const el = document.getElementById('balance-value');
  if (!el) return;

  const total = transactions.reduce((sum, tx) => sum + tx.amount, 0);
  el.textContent = formatCurrency(total);
}

// ─── Pie Chart ────────────────────────────────────────────────────────────────

// ─── Application State ────────────────────────────────────────────────────────

/** @type {Transaction[]} */
let transactions = [];

/** @type {Chart|null} */
let chartInstance = null;

/**
 * Fixed color map for the three categories.
 * @type {Object.<string, string>}
 */
const CATEGORY_COLORS = {
  Food: '#FF6384',
  Transport: '#36A2EB',
  Fun: '#FFCE56',
};

/**
 * Aggregates transaction amounts by category, returning only categories that
 * have at least one transaction.
 *
 * @param {Transaction[]} transactions
 * @returns {{ labels: string[], data: number[], colors: string[] }}
 *
 * Example:
 *   aggregateChartData([{ category: 'Food', amount: 10 }, { category: 'Food', amount: 5 }])
 *   // → { labels: ['Food'], data: [15], colors: ['#FF6384'] }
 */
function aggregateChartData(transactions) {
  const sums = {};

  transactions.forEach((tx) => {
    if (sums[tx.category] === undefined) {
      sums[tx.category] = 0;
    }
    sums[tx.category] += tx.amount;
  });

  const labels = [];
  const data = [];
  const colors = [];

  // Iterate in a stable order: the order they first appear in CATEGORY_COLORS
  VALID_CATEGORIES.forEach((cat) => {
    if (sums[cat] !== undefined) {
      labels.push(cat);
      data.push(sums[cat]);
      colors.push(CATEGORY_COLORS[cat]);
    }
  });

  return { labels, data, colors };
}

/**
 * Creates the Chart.js doughnut instance and stores it in `chartInstance`.
 * Must be called once after the DOM is ready.
 *
 * When there is no data the chart's built-in title plugin is used to show
 * "No spending data available" as a center label.
 *
 * Requirements: 5.4, 5.5, 5.6
 */
function initChart() {
  const canvas = document.getElementById('pie-chart');
  if (!canvas) return;

  const { labels, data, colors } = aggregateChartData([]);
  const isEmpty = data.length === 0;

  chartInstance = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [
        {
          data,
          backgroundColor: colors,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'bottom',
        },
        title: {
          display: isEmpty,
          text: 'No spending data available',
          position: 'bottom',
          padding: { top: 10 },
        },
      },
    },
  });
}

/**
 * Updates the existing chart instance with the latest transaction data.
 * Mutates chart.data in place and calls chart.update() — never recreates
 * the Chart instance to avoid canvas flickering.
 *
 * Handles the case where chartInstance is null gracefully.
 *
 * Requirements: 5.1, 5.7
 *
 * @param {Transaction[]} transactions
 */
function renderChart(transactions) {
  if (!chartInstance) return;

  const { labels, data, colors } = aggregateChartData(transactions);
  const isEmpty = data.length === 0;

  chartInstance.data.labels = labels;
  chartInstance.data.datasets[0].data = data;
  chartInstance.data.datasets[0].backgroundColor = colors;

  // Toggle the "No spending data available" title based on whether data exists
  chartInstance.options.plugins.title.display = isEmpty;

  chartInstance.update();
}

// ─── Form Submit Handler ──────────────────────────────────────────────────────

/**
 * Handles the Input_Form submission event.
 *
 * Flow:
 *  1. Prevent the browser's default form submission.
 *  2. Read raw field values from the DOM.
 *  3. Run validateForm(); on failure populate inline error spans and return.
 *  4. Build a Transaction object and prepend it to a candidate array.
 *  5. Attempt saveToStorage(next); on failure show error banner and return.
 *  6. Commit state, re-render all three UI components, then reset the form.
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 6.1, 6.5, 8.1
 *
 * @param {Event} event
 */
function handleFormSubmit(event) {
  event.preventDefault();

  // ── Read raw values ────────────────────────────────────────────────────────
  const itemNameInput = document.getElementById('item-name');
  const amountInput   = document.getElementById('amount');
  const categoryInput = document.getElementById('category');

  const itemName   = itemNameInput  ? itemNameInput.value  : '';
  const amountStr  = amountInput    ? amountInput.value    : '';
  const category   = categoryInput  ? categoryInput.value  : '';

  // ── Validate ───────────────────────────────────────────────────────────────
  const { valid, errors } = validateForm(itemName, amountStr, category);

  // Always update every error span (clear or populate)
  const nameError     = document.getElementById('item-name-error');
  const amountError   = document.getElementById('amount-error');
  const categoryError = document.getElementById('category-error');

  if (nameError)     nameError.textContent     = errors.itemName  || '';
  if (amountError)   amountError.textContent   = errors.amount    || '';
  if (categoryError) categoryError.textContent = errors.category  || '';

  if (!valid) return;

  // ── Build transaction ──────────────────────────────────────────────────────
  const newTransaction = {
    id:        generateId(),
    name:      itemName.trim(),
    amount:    parseFloat(amountStr.trim()),
    category,
    timestamp: Date.now(),
  };

  const next = [newTransaction, ...transactions];

  // ── Persist first (write-before-render) ───────────────────────────────────
  try {
    saveToStorage(next);
  } catch (e) {
    showErrorBanner('Could not save your data. Storage may be full or restricted.');
    return; // Abort — state and DOM unchanged
  }

  // ── Commit state and re-render ─────────────────────────────────────────────
  transactions = next;

  renderList(transactions);
  renderBalance(transactions);
  renderChart(transactions);

  resetForm();
}

// ─── Reset Form ───────────────────────────────────────────────────────────────

/**
 * Clears all Input_Form field values and inline error spans.
 *
 * Requirements: 1.5
 */
function resetForm() {
  const itemNameInput = document.getElementById('item-name');
  const amountInput   = document.getElementById('amount');
  const categoryInput = document.getElementById('category');

  if (itemNameInput)  itemNameInput.value  = '';
  if (amountInput)    amountInput.value    = '';
  if (categoryInput)  categoryInput.value  = '';

  const nameError     = document.getElementById('item-name-error');
  const amountError   = document.getElementById('amount-error');
  const categoryError = document.getElementById('category-error');

  if (nameError)     nameError.textContent     = '';
  if (amountError)   amountError.textContent   = '';
  if (categoryError) categoryError.textContent = '';
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────

/**
 * Entry point — runs once after the DOM is fully parsed.
 * Loads persisted transactions, performs the initial render, and wires up
 * the form-submit and list-delete event listeners.
 *
 * Requirements: 8.1
 */
document.addEventListener('DOMContentLoaded', () => {
  // Guard: localStorage must be available
  if (typeof localStorage === 'undefined') {
    document.body.innerHTML =
      '<p class="fatal-error">This browser does not support localStorage. The app cannot run.</p>';
    return;
  }

  // Load persisted state
  transactions = loadFromStorage();

  // Initial render
  renderList(transactions);
  renderBalance(transactions);
  initChart();
  renderChart(transactions);

  // Wire up form submission
  const form = document.getElementById('expense-form');
  if (form) {
    form.addEventListener('submit', handleFormSubmit);
  }

  // Wire up delete buttons via event delegation on the list
  const list = document.getElementById('transaction-list');
  if (list) {
    list.addEventListener('click', (e) => {
      const btn = e.target.closest('.delete-btn');
      if (!btn) return;
      const li = btn.closest('li[data-id]');
      if (!li) return;
      handleDelete(li.getAttribute('data-id'));
    });
  }
});
