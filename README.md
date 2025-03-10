# Order Picking Application

### Preparing the Data:
1. Place `allOrders.csv` in the `orders` directory.
   - Each row should be another order, ensure the file includes headers with items named as the name should appear in picking app. The first column is the order ID, the second column is persons name, followed by a column for each item in the same sequence as they are on the order form.
2. Place `nameSlot.csv` in the `orders` directory.
   - Ensure the file includes `pick seq,slot,name,ss` headers. `pick seq` is the sequential number for picking, `slot` is the item ID, `name` is the item name, and `ss` indicates if the item is in a side slot.
3. Run `npm run init` to generate `orders/orders.json` and `<ORDER_ID>.csv` files in the `orders/gen` dir.

### Running the Application:
1. Run `npm run main` to start the server.
2. Access the application on any device on the same Wi-Fi network using the IP address printed in the console.

**Note:** While picking an order the picker may skip to the order confirmation page at any point by entering a quantity of `998` for the current item.

### Admin Console:
- Navigate to `<URL>:<PORT>/admin` to add alerts or popups for specific items (e.g., "Out of Stock"). There are also some sortable tables providing admin info for the current session.
- Completed picks are also saved to `orders/completed-orders.csv`.

### Volunteer Sign-Up:
- Navigate to `<URL>:<PORT>/volunteer` to register volunteers. Each volunteer will be assigned a sequential number.
- The list of volunteers is also saved in `orders/volunteers.csv`.

**Note:** There is always a default admin volunteer #998.

### Obtaining Results:
- Run `npm run results` to generate `resultsByItm.csv` and `resultsByUser.csv`, summarizing discrepancies between what was picked and actual orders.