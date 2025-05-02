import dotenv from 'dotenv';
import { ChartinkScraperService } from "./src/services/ChartinkScraperService.js";
import { CSVService } from "./src/services/CSVService.js";
import { DhanService } from "./src/services/DhanService.js";
import { StockAllocator } from "./src/helpers/StockAllocator.js";
import { Utils } from "./src/helpers/Utils.js";
import { OrderExecutor } from "./src/services/OrderExecutor.js";
import logger from "./src/helpers/ConsoleLogger.js";

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
  logger.info(`Initializing services with client ID: ${DHAN_CLIENT_ID}`);
  
  const dhanService = new DhanService(ACCESS_TOKEN);
  const orderExecutor = new OrderExecutor(dhanService, DHAN_CLIENT_ID);
  
  logger.success('Services initialized successfully');
  return { dhanService, orderExecutor };
}

async function validateFunds(dhanService) {
  logger.info('Fetching and validating available funds');
  
  const funds = await dhanService.getFunds();

  if (!funds || !funds.availabelBalance) {
    logger.error('Failed to fetch available balance');
    throw new Error("Failed to fetch available balance.");
  }

  logger.funds(funds.availabelBalance, CONFIG.BUDGET);

  if (funds.availabelBalance < CONFIG.BUDGET) {
    logger.error(`Insufficient funds: Required ₹${CONFIG.BUDGET}, Available ₹${funds.availabelBalance}`);
    throw new Error(`Insufficient funds.`);
  }
  
  logger.success('Funds validation successful');
}

async function fetchFilteredStocks() {
  logger.info('Fetching stocks from Chartink and filtering with CSV data');
  
  const [stocks, csvData] = await Promise.all([
    ChartinkScraperService.fetchStocks(),
    CSVService.readCSV(CONFIG.CSV_FILE)
  ]);

  if (!stocks.length) {
    logger.error('No stocks found from ChartinkScraperService');
    throw new Error('No stocks found.');
  }
  
  logger.debug(`Found ${stocks.length} stocks from Chartink`);

  const filteredResults = csvData.filter(row =>
    stocks.some(stock => row.SEM_TRADING_SYMBOL === stock.nsecode && row.SEM_EXM_EXCH_ID === 'NSE')
  );

  if (!filteredResults.length) {
    logger.error('No matching stocks found in CSV data');
    throw new Error('No matching row found.');
  }

  const symbols = filteredResults.map(s => s.SEM_TRADING_SYMBOL);
  logger.stocksFiltered(filteredResults.length, symbols);

  return { stocks, filteredResults };
}

async function placeOrders(orderExecutor, stocks, filteredResults) {
  logger.info(`Calculating stock allocation with budget ₹${CONFIG.BUDGET}`);
  
  const stockAllocation = StockAllocator.allocate(stocks, CONFIG.BUDGET);
  
  const allocationDetails = [];
  
  for (const [index, quantity] of stockAllocation.allocation.entries()) {
    if (quantity <= 0) continue;

    const stock = stocks[index];
    
    allocationDetails.push({
      symbol: stock.nsecode,
      quantity,
      price: stock.close,
      allocated: quantity * stock.close
    });
  }
  
  // Display allocation table
  logger.allocation(allocationDetails);
  logger.info(`Total allocation: ₹${stockAllocation.total.toFixed(2)}`);

  // Place orders for each allocated stock
  for (const allocation of allocationDetails) {
    try {
      const matchingRow = filteredResults.find(row => row.SEM_TRADING_SYMBOL === allocation.symbol);
      const buyOrder = await executeBuyOrder(orderExecutor, matchingRow, allocation.quantity);
      await placeStopLoss(orderExecutor, buyOrder, matchingRow, allocation.quantity);
    } catch (error) {
      logger.error(`Failed to execute orders for ${allocation.symbol}`, error.message);
    }
  }
  
  logger.success(`Total spent: ₹${stockAllocation.total.toFixed(2)}`);
}

async function executeBuyOrder(orderExecutor, stockRow, quantity) {
  const symbol = stockRow.SEM_TRADING_SYMBOL;
  
  logger.info(`Placing buy order for ${symbol} x${quantity}`);
  
  const response = await orderExecutor.placeBuyOrder(stockRow.SEM_SMST_SECURITY_ID, quantity);
  
  logger.orderPlaced('BUY', symbol, quantity, 'MARKET');
  logger.debug(`Buy order response:`, response);

  const maxRetries = 5;
  const retryDelay = 500; // 0.5 second
  let attempt = 0;
  let status;

  while (attempt < maxRetries) {
    status = await orderExecutor.getOrderStatus(response.orderId);
    
    logger.orderStatus(response.orderId, status.orderStatus, status.price);
    logger.debug(`Attempt ${attempt + 1} for order ${response.orderId}`, status);

    if (status.orderStatus === ORDER_STATUS.TRADED) {
      logger.success(`Buy order ${response.orderId} successfully traded at ₹${status.price}`);
      return status;
    } else if (status.orderStatus !== ORDER_STATUS.PENDING && status.orderStatus !== ORDER_STATUS.TRANSIT) {
      logger.error(`Buy order ${response.orderId} failed with status ${status.orderStatus}`);
      throw new Error(`Buy Order ${status.orderId} failed with status ${status.orderStatus}.`);
    }

    attempt++;
    await new Promise(resolve => setTimeout(resolve, retryDelay));
  }

  logger.error(`Buy order ${response.orderId} still in ${status.orderStatus} after ${maxRetries} retries`);
  throw new Error(`Buy Order ${response.orderId} still in ${status.orderStatus} after ${maxRetries} retries.`);
}

async function placeStopLoss(orderExecutor, buyOrderStatus, stockRow, quantity) {
  const symbol = stockRow.SEM_TRADING_SYMBOL;
  const stoplossPrice = buyOrderStatus.price - (0.05 * buyOrderStatus.price);
  const roundedStoploss = Utils.customTickRound(stoplossPrice, stockRow.SEM_TICK_SIZE);

  logger.info(`Placing stop-loss order for ${symbol} x${quantity} @ ₹${roundedStoploss}`);
  logger.debug(`Stop-loss calculated at 5% below buy price of ₹${buyOrderStatus.price}`);

  const stopLossResponse = await orderExecutor.placeStopLossOrder(
    stockRow.SEM_SMST_SECURITY_ID,
    quantity,
    roundedStoploss
  );

  logger.orderPlaced('STOP-LOSS', symbol, quantity, roundedStoploss);
  logger.debug(`Stop-loss order response:`, stopLossResponse);

  const stopLossStatus = await orderExecutor.getOrderStatus(stopLossResponse.orderId);

  logger.orderStatus(stopLossStatus.orderId, stopLossStatus.orderStatus);
  logger.info(`Stop-loss order ${stopLossStatus.orderId} processed: ${stopLossStatus.omsErrorDescription || 'No errors'}`);
}

async function main() {
  logger.startApp();
  
  try {
    logger.info(`Starting trading application with budget: ₹${CONFIG.BUDGET}`);

    const { dhanService, orderExecutor } = await initializeServices();

    await validateFunds(dhanService);

    const { stocks, filteredResults } = await fetchFilteredStocks();

    await placeOrders(orderExecutor, stocks, filteredResults);

    logger.endApp(true);
  } catch (error) {
    logger.error("Trading application failed", error.message || error);
    logger.endApp(false);
  }
}

main();