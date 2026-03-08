# Database Migration Plan for Order Picker

## 1. Executive Summary
The current application uses a filesystem-based approach for storing data (JSON, CSV, and TXT files in the `orders/` directory). This plan outlines the steps to migrate to a relational database (e.g., SQLite for simple local deployments, or PostgreSQL for robust concurrent access) to eliminate race conditions, ensure data integrity, and improve scalability.

## 2. Phase 1: Database Selection & Schema Design
**Recommendation:** Start with **SQLite** using an ORM like `Prisma` or a query builder like `Knex.js`. SQLite is serverless and mimics the current local-file setup but provides ACID compliance and row-level locking.

### Proposed Relational Schema:
*   **`Orders` Table:**
    *   `id` (Primary Key, e.g., 'S24-001')
    *   `customerName`
    *   `status` (Pending, In Progress, Completed, Blocked)
    *   `assignedVolunteerId` (Foreign Key -> Volunteers, Nullable)
    *   `metadata` (JSON column for flexible extra data)
*   **`Items` Table:**
    *   `id` (Primary Key)
    *   `description`
    *   `totalQuantityRequired`
*   **`OrderItems` Table (Many-to-Many joining Orders and Items):**
    *   `orderId` (Foreign Key -> Orders)
    *   `itemId` (Foreign Key -> Items)
    *   `quantity`
    *   `picked` (Boolean)
*   **`Volunteers` Table:**
    *   `id` (Primary Key)
    *   `name`
    *   `active` (Boolean)
*   **`AuditLog / PickLine` Table:**
    *   `id` (Primary Key)
    *   `timestamp`
    *   `action` (e.g., 'ORDER_STARTED', 'ORDER_COMPLETED')
    *   `orderId`
    *   `volunteerId`

## 3. Phase 2: Create a Data Access Object (DAO) Layer
Before swapping the underlying data store, decouple the application logic from the filesystem.
1.  Create a new module (e.g., `scripts/db.js`).
2.  Define asynchronous interface methods for all current data operations.
    *   `getOrders()`
    *   `getOrderById(id)`
    *   `updateOrderStatus(id, status)`
    *   `assignVolunteerToOrder(orderId, volunteerId)`
    *   `logAction(actionData)`
3.  Initially, implement these methods using the *existing* filesystem logic. This ensures the app still works while you refactor the routes.

## 4. Phase 3: Refactor Server Endpoints
Update `scripts/server.js` to use the new DAO layer instead of calling `fs.readFileSync` and `fs.writeFileSync` directly.
*   **Current:** `let orderData = fs.readFileSync('orders/S24/order.csv');`
*   **New:** `let orderData = await db.getOrderById('S24');`
*   Ensure all Express route handlers become `async` to handle database promises.

## 5. Phase 4: Migration Script (`makeOrders.js`)
Refactor the initialization logic.
1.  Modify `scripts/makeOrders.js`. Instead of generating directories and files in `orders/`, it should connect to the new database.
2.  Parse the source `allOrders.csv` and execute `INSERT` statements to populate the `Orders`, `Items`, and `OrderItems` tables.

## 6. Phase 5: Implement Database Engine & Testing
1.  Swap the underlying implementation in `scripts/db.js` from the filesystem functions to actual SQL queries (using your chosen ORM/driver).
2.  Delete the now-obsolete `orders/` directory structure (excluding any necessary static backups).
3.  **Testing:**
    *   Run the new `makeOrders.js` to seed the DB.
    *   Start `server.js`.
    *   Test the end-to-end workflow (picking an item, assigning a volunteer, completing an order) to ensure concurrency issues are resolved and data persists correctly in the database.

## 7. Phase 6: Legacy Data Migration (File Uploads)
To transition smoothly, create a utility to migrate existing state (JSON, CSV, or TXT files currently in the `orders/` directory) directly into the SQLite database.
1.  **Migration Script/Endpoint:** Create a standalone CLI script (e.g., `scripts/migrateExisting.js`) or an admin-only API endpoint that accepts file uploads.
2.  **Data Parsing Strategy:**
    *   **JSON Files (e.g., `orders.json`):** Parse the configuration and metadata to populate the base `Orders` and `Items` tables.
    *   **CSV Files (e.g., `volunteers.csv`, individual order CSVs):** Use a parser library (like `csv-parser`) to read the rows. Map these rows to insert or update records in the `Volunteers`, `Orders`, and `OrderItems` tables.
    *   **TXT Files (e.g., blocked or active lists):** Read the files line-by-line to update the status column (e.g., marking specific IDs as 'Blocked') in the `Orders` table.
3.  **Idempotency (Upserts):** Implement `INSERT ON CONFLICT` (or `INSERT OR REPLACE` in SQLite) to ensure that running the migration tool multiple times safely updates existing records without creating duplicates.
4.  **Verification:** After running the migration tool, verify that the database row counts match the expected number of items from the legacy files.
