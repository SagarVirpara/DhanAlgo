import { ChartinkScraperService } from "./src/services/ChartinkScraperService.js";
import { CSVService } from "./src/services/CSVService.js";
import { DhanService } from "./src/services/DhanService.js";
import { StockAllocator } from "./src/helpers/StockAllocator.js";
import { Utils } from "./src/helpers/Utils.js";
import { OrderExecutor } from "./src/services/OrderExecutor.js";
import dotenv from 'dotenv';

dotenv.config();

const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const DHAN_CLIENT_ID = process.env.DHAN_CLIENT_ID;
const CSV_FILE = './src/assets/api-scrip-master.csv';
const BUDGET = 50;
const ORDER_STATUS = {
    TRANSIT: 'TRANSIT',
    PENDING: 'PENDING',
    REJECTED: 'REJECTED',
    PART_TRADED: 'PART_TRADED',
    TRADED: 'TRADED',
    EXPIRED: 'EXPIRED'
}

async function main() {
    try {
        const dhanService = new DhanService(ACCESS_TOKEN);
        const orderExecutor = new OrderExecutor(dhanService, DHAN_CLIENT_ID);

        const funds = await dhanService.getFunds();
        if (funds && funds.availabelBalance) {
            console.log(`Available Balance: ₹${funds.availabelBalance}`);
        } else {
            console.error("Failed to fetch available balance.");
        }

        if (funds.availabelBalance < BUDGET) {
            console.error(`Insufficient funds.`);
            return;
        }

        const [stocks, csvData] = await Promise.all([
            ChartinkScraperService.fetchStocks(),
            CSVService.readCSV(CSV_FILE)
        ]);

        if (stocks.length === 0) {
            console.log('No stocks found.');
            return;
        }

        const filters = stocks;
        const results = csvData.filter(row =>
            filters.some(f => row.SEM_TRADING_SYMBOL === f.nsecode && row.SEM_EXM_EXCH_ID === 'NSE')
        );

        if (results.length === 0) {
            console.log('No matching row found.');
            return;
        }

        const stockAllocation = StockAllocator.allocate(stocks, BUDGET);

        console.log("Balanced Quantity Allocation:");
        for (const [i, qty] of stockAllocation.allocation.entries()) {
            if (qty > 0) {
                const stock = stocks[i];
                const matchingRow = results.find(r => r.SEM_TRADING_SYMBOL === stock.nsecode);

                const buyOrderResponse = await orderExecutor.placeBuyOrder(matchingRow.SEM_SMST_SECURITY_ID, qty);
                // const buyOrderResponse = { "orderId": "1125042823378", "orderStatus": "TRANSIT" 
                console.log(`Buy Order Response: ${JSON.stringify(buyOrderResponse)}`);

                const buyOrderStatus = await orderExecutor.getOrderStatus(buyOrderResponse.orderId);

                if (buyOrderStatus.orderStatus === ORDER_STATUS.TRADED) {
                    console.log(`Buy Order ${buyOrderStatus.orderId} has been successfully traded. | ${buyOrderStatus.omsErrorDescription} at ₹${buyOrderStatus.price}`);

                    const stoploss = buyOrderStatus.price - (0.05 * buyOrderStatus.price);
                    const roundedPrice = Utils.customTickRound(stoploss, matchingRow.SEM_TICK_SIZE);

                    const stopLossOrderResponse = await orderExecutor.placeStopLossOrder(matchingRow.SEM_SMST_SECURITY_ID, qty, stoploss, roundedPrice);
                    // const stopLossOrderResponse = { "orderId": "5125042822208", "orderStatus": "TRANSIT" }
                    console.log(`Stop Loss Order Response: ${JSON.stringify(stopLossOrderResponse)}`);
                    
                    const stopLossOrderStatus = await orderExecutor.getOrderStatus(stopLossOrderResponse.orderId);
                    console.log(`Stop Loss Order ${stopLossOrderStatus.orderId} has been successfully traded. | ${stopLossOrderStatus.omsErrorDescription}`);
                }
            }
        }
        console.log(`Total Spent: ₹${stockAllocation.total}`);
        console.log("Orders placed successfully.");
    } catch (error) {
        console.error("Error during execution:", error);
    }
}

main();
