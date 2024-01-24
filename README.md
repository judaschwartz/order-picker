# Order Picking Application

### Prep
To use this tool place a file named `allOrders.csv` in the `orders` dir, that file should have the orderIDs in the first column the last names in the second column and then the items in the order that they are laid out on the pickup line.
Run the `node makeOrders.js` script. This will create an `orders.json` file containing the ids and last names, as well as an <ORDER_ID>.csv file in the `orders` dir for each order.
### Running the Application
Once those files are created use the `node server.js` command to run the server, then any device on the same wifi network as the server can access the application by going in their browser to the IP in the output.
### Getting the Results
To create csv files summarizing the discrepancies of the picked orders vs the actual orders run the `node processDiffs.js` command and two files will be created named `resultsByItm.csv` and `resultsByUser.csv`
