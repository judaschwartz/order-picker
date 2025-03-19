# Order Picking Application

### Preparing the Data:
1. Create a new in the `orders` directory. (e.g. `orders/P25`)
2. Place `allOrders.csv` in the `orders/P25` directory.
- Each row should be another order, ensure the file includes headers with items named as the name should appear in picking app. The first column is the order ID, the second column is persons name, followed by a column for each item in the same sequence as they are on the order form.
3. Place `nameSlot.csv` in the `orders/P25` directory.
- Ensure the file includes `pick seq,slot,name,ss` headers. `pick seq` is the sequential number for picking, `slot` is the item ID, `name` is the item name, and `ss` indicates if the item is in a side slot.
4. Run `npm run init` to generate `orders/P25/orders.json` and `<ORDER_ID>.csv` files in the `orders/P25/gen` dir.
- By default the dir will be the most Recent `P25` (or `S26` ect..) directory to run the script on another directory set the env var `ORDER_PREFIX=customeDir`

### Running the Application:
1. Run `npm run main` to start the server.
- Set the directory same as above
2. Access the application on any device on the same Wi-Fi network using the IP address printed in the console.
- After all orders are picked there is a page to confrim that the order is done when it is confirmed a copy of the order is sent to the printer set the env var `SKIP_PRINT=true` to run the app without printing orders
>**Note:** While picking an order the picker may skip to the order confirmation page at any point by entering a quantity of `998` for the current item.

### Admin Console:
Navigate to `<URL>:<PORT>/kadmin` there is a menu of admin pages that includes:
- Volunteers
- Product Alerts
- Combine two orders
- Print an order
- Orders in progress
- All orders
- Items Picked

#### Volunteer Sign-Up:
Registered volunteers will be assigned a sequential number.
- The list of volunteers is also saved in `orders/P25/volunteers.csv`.
>**Note:** There is always a default admin volunteer #998.

#### Alerts
Use slot ID to add alerts or popups to display in app when a picker reaches a specific item (e.g., "Out of Stock").

#### Managing stock
On the "Items Picked" page, an admin can update the quantity of an item currently available on the picking floor. This number will be updated automatically with each pick, allowing the admin to monitor inventory levels and determine when to move more items onto the picking floor.

### Obtaining Results:
Run `npm run results` to generate `resultsByItm.csv` and `resultsByUser.csv`, summarizing discrepancies between what was picked and actual orders.
- Set the directory same as above
- A list of completed picks are also saved to `orders/completed-orders.csv`.
