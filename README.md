# Order Picking Application

### Preparing the data:
To utilize this tool, follow these steps:

1. Place a file named `allOrders.csv` in the `orders` directory.
Ensure the file includes headers in the top row with the names of the items. The orderIDs should be in the first column, last names in the second column, and then each item in the same sequence as they appear on the order form.
2. Place a file named `nameSlot.csv` in the `orders` directory.
Ensure the file includes `pick seq,slot,name,ss` headers in the top row and ordered in the same order as the order form `pick seq` should be the sequential number that the item should be picked at, `slot` is the ID of the item, `name` is the name of item, and `ss` is if this item is in a slot on the opposite side.
3. From the command line execute `npm run init`. This will generate an `orders/orders.json` file with IDs and last names, as well as all the `<ORDER_ID>.csv` files in the `orders/gen` directory for each order. <del>As well as two test orders 998 for test1 and 999 for test2</del>
### Running the Application:
After creating the necessary files, execute the command `npm run main` to start the server. Once the server is running, any device on the same Wi-Fi network can now access the picking application by going to the IP address that is printed the console output in their browser.

**Note:** If a picker wants to end the pick before getting to the last item they can enter a qty of `998` on whatever item they are up to and that will skip them straight to the end of the order confirmation page

Adding the `DEBUG=true` env var to the command will add debug logging to the console.
### Admin console
To see what is being currently picked navigate to `<URL>:<PORT>/admin` the admin can also add an alert to pop up or be displayed on the page of a specific item during picking (like "Out of Stock"). Additionally the file of completed picks can be found at `orders/completed-orders.csv`
### Volunteer sign up
To add volunteers who will be picking the orders navigate to `<URL>:<PORT>/volunteers` there new volunteers can sign up and they will assigned a sequential volunteer number there will be the list of already signed up volunteers. Additionally the file of the volunteers can be found at `orders/volunteers.csv`

There is a default admin volunteer that is not listed on the volunteer list to pick with it enter volunteer # `990`
### Obtaining Results:
To generate CSV files summarizing discrepancies between picked and actual orders, execute the command `npm run results` This will create two files: `resultsByItm.csv` and `resultsByUser.csv`
