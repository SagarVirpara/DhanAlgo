import dotenv from 'dotenv';
import { ChartinkScraperService } from "./src/services/ChartinkScraperService.js";
import { CSVService } from "./src/services/CSVService.js";
import { DhanService } from "./src/services/DhanService.js";
import { StockAllocator } from "./src/helpers/StockAllocator.js";
import { Utils } from "./src/helpers/Utils.js";
import { OrderExecutor } from "./src/services/OrderExecutor.js";

dotenv.config();

const {
  ACCESS_TOKEN,
  DHAN_CLIENT_ID
} = process.env;

const CONFIG = {
  CSV_FILE: './src/assets/api-scrip-master.csv',
  BUDGET: 10000 // Example budget
};

const ORDER_STATUS = {
  TRANSIT: 'TRANSIT',
  PENDING: 'PENDING',
  REJECTED: 'REJECTED',
  PART_TRADED: 'PART_TRADED',
  TRADED: 'TRADED',
  EXPIRED: 'EXPIRED'
};

async function initializeServices() {
  const dhanService = new DhanService(ACCESS_TOKEN);
  const orderExecutor = new OrderExecutor(dhanService, DHAN_CLIENT_ID);
  return { dhanService, orderExecutor };
}

async function validateFunds(dhanService) {
  const funds = await dhanService.getFunds();

  if (!funds || !funds.availabelBalance) {
    throw new Error("Failed to fetch available balance.");
  }

  console.log(`Available Balance: ₹${funds.availabelBalance}`);

  if (funds.availabelBalance < CONFIG.BUDGET) {
    throw new Error(`Insufficient funds.`);
  }
}

async function fetchFilteredStocks() {
  const [stocks, csvData] = await Promise.all([
    ChartinkScraperService.fetchStocks(),
    CSVService.readCSV(CONFIG.CSV_FILE)
  ]);

  if (!stocks.length) {
    throw new Error('No stocks found.');
  }

  const filteredResults = csvData.filter(row =>
    stocks.some(stock => row.SEM_TRADING_SYMBOL === stock.nsecode && row.SEM_EXM_EXCH_ID === 'NSE')
  );

  if (!filteredResults.length) {
    throw new Error('No matching row found.');
  }

  return { stocks, filteredResults };
}

async function placeOrders(orderExecutor, stocks, filteredResults) {
  const stockAllocation = StockAllocator.allocate(stocks, CONFIG.BUDGET);

  console.log("Balanced Quantity Allocation:");

  for (const [index, quantity] of stockAllocation.allocation.entries()) {
    if (quantity <= 0) continue;

    const stock = stocks[index];
    const matchingRow = filteredResults.find(row => row.SEM_TRADING_SYMBOL === stock.nsecode);

    const buyOrder = await executeBuyOrder(orderExecutor, matchingRow, quantity);
    await placeStopLoss(orderExecutor, buyOrder, matchingRow, quantity);
  }

  console.log(`Total Spent: ₹${stockAllocation.total}`);
}

async function executeBuyOrder(orderExecutor, stockRow, quantity) {
    const response = await orderExecutor.placeBuyOrder(stockRow.SEM_SMST_SECURITY_ID, quantity);
    console.log(`Buy Order Response: ${JSON.stringify(response)}`);
  
    const maxRetries = 5;
    const retryDelay = 500; // 0.5 second
    let attempt = 0;
    let status;
  
    while (attempt < maxRetries) {
      status = await orderExecutor.getOrderStatus(response.orderId);
      console.log(`Attempt ${attempt + 1}: Buy Order status ${JSON.stringify(status)}`);
  
      if (status.orderStatus === ORDER_STATUS.TRADED) {
        console.log(`Buy Order ${status.orderId} successfully traded at ₹${status.price}.`);
        return status;
      } else if (status.orderStatus !== ORDER_STATUS.TRANSIT) {
        throw new Error(`Buy Order ${status.orderId} failed with status ${status.orderStatus}.`);
      }
  
      attempt++;
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  
    throw new Error(`Buy Order ${response.orderId} still in TRANSIT after ${maxRetries} retries.`);
  }
  

async function placeStopLoss(orderExecutor, buyOrderStatus, stockRow, quantity) {
  const stoplossPrice = buyOrderStatus.price - (0.05 * buyOrderStatus.price);
  const roundedStoploss = Utils.customTickRound(stoplossPrice, stockRow.SEM_TICK_SIZE);

  const stopLossResponse = await orderExecutor.placeStopLossOrder(
    stockRow.SEM_SMST_SECURITY_ID,
    quantity,
    roundedStoploss
  );

  console.log(`Stop Loss Order Response: ${JSON.stringify(stopLossResponse)}`);

  const stopLossStatus = await orderExecutor.getOrderStatus(stopLossResponse.orderId);

  console.log(`Stop Loss Order ${stopLossStatus.orderId} processed: ${stopLossStatus.omsErrorDescription}`);
}

async function main() {
  try {
    const { dhanService, orderExecutor } = await initializeServices();

    await validateFunds(dhanService);

    const { stocks, filteredResults } = await fetchFilteredStocks();

    await placeOrders(orderExecutor, stocks, filteredResults);

    console.log("Orders placed successfully.");

  } catch (error) {
    console.error("Error during execution:", error.message || error);
  }
}

main();
