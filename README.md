# Order Picking Application

### Preparation:
To utilize this tool, follow these steps:

1. Place a file named `allOrders.csv` in the `orders` directory.
2. Ensure the file includes headers in the top row with the names of the items. The orderIDs should be in the first column, last names in the second column, and then each item in the same sequence as they appear on the pickup line.
3. Run the `node makeOrders.js` script. This will generate an `orders.json` file with IDs and last names, along with an `<ORDER_ID>.csv` file in the `orders` directory for each order.
### Running the Application:
After creating the necessary files, execute the command `node server.js` to start the server. Once the server is running, any device on the same Wi-Fi network can access the application by entering the IP address from the output in their browser.
### Obtaining Results:
To generate CSV files summarizing discrepancies between picked and actual orders, execute the command node processDiffs.js. This will create two files: `resultsByItm.csv` and `resultsByUser.csv`
