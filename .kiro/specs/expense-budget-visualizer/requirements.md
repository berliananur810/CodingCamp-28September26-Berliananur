# Requirements Document

## Introduction

The Expense & Budget Visualizer is a client-side web application that allows users to track personal expenses by category, view a running total balance, and gain visual insight into their spending distribution through an auto-updating pie chart. The application is built with plain HTML, CSS, and Vanilla JavaScript with no backend server. All data is persisted in the browser's Local Storage API.

---

## Glossary

- **App**: The Expense & Budget Visualizer web application running in the user's browser.
- **Transaction**: A single expense record consisting of an item name, an amount, and a category.
- **Transaction_List**: The scrollable UI component that displays all stored Transactions.
- **Input_Form**: The HTML form through which the user enters a new Transaction.
- **Balance_Display**: The UI element at the top of the page that shows the total of all Transaction amounts.
- **Pie_Chart**: The visual chart component that shows the spending distribution by category.
- **Local_Storage**: The browser's `localStorage` API used to persist Transaction data client-side.
- **Category**: One of three fixed labels assigned to a Transaction — Food, Transport, or Fun.
- **Validator**: The client-side logic that checks Input_Form fields before submission.
- **Chart_Library**: Chart.js (loaded via CDN) used to render the Pie_Chart.

---

## Requirements

### Requirement 1: Transaction Input

**User Story:** As a user, I want to enter expense details through a form, so that I can record what I spent, how much, and what category it belongs to.

#### Acceptance Criteria

1. THE Input_Form SHALL provide a text field for the item name (maximum 100 characters), a numeric field for the amount, and a dropdown selector with exactly the options: Food, Transport, and Fun.
2. WHEN the user submits the Input_Form with all fields filled and an amount that is a positive number with no more than 2 decimal places and no greater than 999,999,999.99, THE App SHALL add a new Transaction to the Transaction_List.
3. IF the user submits the Input_Form with one or more empty fields, THEN THE Validator SHALL prevent submission and display an inline error message identifying each empty field.
4. IF the user enters a non-positive number, a non-numeric value, a value exceeding 999,999,999.99, or a value with more than 2 decimal places in the amount field, THEN THE Validator SHALL prevent submission and display an inline error message on the amount field.
5. WHEN a Transaction is successfully added, THE Input_Form SHALL reset all fields to their default empty state, with the category dropdown showing no selected option.

---

### Requirement 2: Transaction List Display

**User Story:** As a user, I want to see all my recorded transactions in a scrollable list, so that I can review what I have entered.

#### Acceptance Criteria

1. THE Transaction_List SHALL display each Transaction as a list item showing the item name, the amount formatted as a currency value with a currency symbol prefix and exactly 2 decimal places, and the category label.
2. WHILE the number of Transactions exceeds the visible area of the Transaction_List, THE Transaction_List SHALL be scrollable to reveal all items.
3. THE Transaction_List SHALL display Transactions ordered by their creation timestamp, with the most recently added Transaction appearing at the top.
4. WHEN the App loads, THE Transaction_List SHALL restore and display all Transactions previously saved to Local_Storage.
5. WHEN no Transactions exist, THE Transaction_List SHALL display a message indicating that no transactions have been recorded.
6. IF Local_Storage data cannot be read or parsed on load, THEN THE App SHALL display an error message and initialize with an empty Transaction_List.

---

### Requirement 3: Transaction Deletion

**User Story:** As a user, I want to delete individual transactions, so that I can correct mistakes or remove entries I no longer need.

#### Acceptance Criteria

1. THE Transaction_List SHALL render a delete button for each Transaction list item.
2. WHEN the user activates the delete button on a Transaction and the Local_Storage write succeeds, THE App SHALL synchronously remove that Transaction from the Transaction_List and from Local_Storage.
3. WHEN a Transaction is deleted, THE Balance_Display SHALL synchronously update to reflect the new total.
4. WHEN a Transaction is deleted, THE Pie_Chart SHALL synchronously update to reflect the new category distribution.
5. WHEN a Transaction is deleted and it was the last Transaction in a category, THE Pie_Chart SHALL remove that category's segment entirely.

---

### Requirement 4: Total Balance Display

**User Story:** As a user, I want to see my total spending at the top of the page, so that I always know how much I have spent in total.

#### Acceptance Criteria

1. THE Balance_Display SHALL show the sum of all Transaction amounts formatted as a currency value with a currency symbol prefix and exactly 2 decimal places.
2. WHEN a new Transaction is added, THE Balance_Display SHALL update to reflect the new total within 1 second.
3. WHEN a Transaction is deleted, THE Balance_Display SHALL update to reflect the new total within 1 second.
4. WHEN no Transactions exist, THE Balance_Display SHALL show a formatted currency value of zero with a currency symbol prefix and exactly 2 decimal places.

---

### Requirement 5: Spending Distribution Pie Chart

**User Story:** As a user, I want to see a pie chart of my spending by category, so that I can understand how my expenses are distributed across Food, Transport, and Fun.

#### Acceptance Criteria

1. THE Pie_Chart SHALL display one segment per Category that has at least one Transaction, where each segment's arc size is proportional to that Category's sum of Transaction amounts divided by the total sum of all Transaction amounts.
2. WHEN a new Transaction is added, THE Pie_Chart SHALL update to reflect the new category distribution within 1 second.
3. WHEN a Transaction is deleted, THE Pie_Chart SHALL update to reflect the new category distribution within 1 second.
4. WHEN no Transactions exist, THE Pie_Chart SHALL display a visible text label stating that no spending data is available.
5. THE Pie_Chart SHALL render using the Chart_Library loaded from a CDN without requiring a local install or build step.
6. THE Pie_Chart SHALL assign a unique fixed color to each Category (Food, Transport, Fun), where no two categories share the same color and the color for each category remains the same across all renders.
7. WHEN a Transaction is deleted and it was the last Transaction in its Category, THE Pie_Chart SHALL remove that Category's segment from the chart.

---

### Requirement 6: Data Persistence

**User Story:** As a user, I want my transactions to be saved automatically, so that my data is still available when I revisit the page or refresh the browser.

#### Acceptance Criteria

1. WHEN a Transaction is added, THE App SHALL serialize the full Transaction_List as a JSON array and write it to Local_Storage before updating the Transaction_List state in the UI.
2. WHEN a Transaction is deleted, THE App SHALL serialize the updated Transaction_List as a JSON array and write it to Local_Storage before updating the Transaction_List state in the UI.
3. WHEN the App loads, THE App SHALL read Transaction data from Local_Storage and restore the Transaction_List, Balance_Display, and Pie_Chart to the state that reflects the persisted data.
4. IF Local_Storage is empty or does not contain a parseable JSON array of Transaction objects on load, THEN THE App SHALL initialize with an empty Transaction_List, a zero Balance_Display, and an empty Pie_Chart.
5. IF a Local_Storage write fails during an add or delete operation, THEN THE App SHALL cancel the operation, preserve the previous Transaction_List state, and display an error message to the user.
6. IF Local_Storage data on load contains a mix of valid and invalid Transaction objects, THEN THE App SHALL discard only the invalid entries and restore the Transaction_List from the valid subset.

---

### Requirement 7: Technical Constraints

**User Story:** As a developer, I want the application to use only approved technologies and a clean file structure, so that the project is maintainable and works in all target environments without a build step.

#### Acceptance Criteria

1. THE App SHALL be implemented using only HTML, CSS, and Vanilla JavaScript with no JavaScript frameworks or libraries other than Chart_Library.
2. THE App SHALL function correctly in the latest stable versions of Chrome, Firefox, Edge, and Safari without requiring any browser extensions or plugins.
3. THE App SHALL require no backend server; all functionality SHALL operate entirely within the browser using only browser-native APIs and localStorage.
4. THE App SHALL include exactly one HTML entry point file, exactly one CSS file located in a `css/` directory, and exactly one JavaScript file located in a `js/` directory.
5. THE App SHALL load and run without any build tooling, compilation, or package manager setup by opening the HTML entry point file directly in a browser.
6. IF the browser does not support a feature required by the App (such as localStorage or Canvas API), THEN THE App SHALL display an error message indicating the unsupported feature and that the application cannot run in the current browser.

---

### Requirement 8: Performance and Visual Design

**User Story:** As a user, I want the app to feel fast and look clean, so that using it is a pleasant and frictionless experience.

#### Acceptance Criteria

1. WHEN the user adds or deletes a Transaction, THE App SHALL update the Transaction_List, Balance_Display, and Pie_Chart within 100 milliseconds of the user action, measured from the time of interaction to visible UI change.
2. THE App SHALL render the Input_Form, Transaction_List, Balance_Display, and Pie_Chart as visually distinct sections, each separated by visible spacing of at least 16px or a visible border, with no two sections overlapping.
3. THE App SHALL use readable typography with a font size of at least 14px for body text and at least 16px for headings and the Balance_Display value.
4. THE App SHALL be responsive across viewport widths from 320px to 1440px, producing no horizontal scrollbar or overflow, no overlapping elements, and keeping all four sections — Input_Form, Transaction_List, Balance_Display, and Pie_Chart — visible and reachable via vertical scroll.
