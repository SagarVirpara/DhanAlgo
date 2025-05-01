export class OrderExecutor {
    constructor(dhanService, clientId) {
      this.dhanService = dhanService;
      this.clientId = clientId;
    }
  
    async placeBuyOrder(securityId, quantity) {
      const payload = {
        dhanClientId: this.clientId.toString(),
        transactionType: "BUY",
        exchangeSegment: "NSE_EQ",
        productType: "CNC",
        orderType: "MARKET",
        validity: "DAY",
        securityId,
        quantity,
        price: 0,
      };
      console.log('Placing buy order:', payload);
      return this.dhanService.placeOrder(payload);
    }
  
    async placeStopLossOrder(securityId, quantity, triggerPrice) {
      const payload = {
        dhanClientId: this.clientId.toString(),
        transactionType: "SELL",
        exchangeSegment: "NSE_EQ",
        productType: "CNC",
        orderType: "STOP_LOSS_MARKET",
        validity: "DAY",
        securityId,
        quantity,
        triggerPrice
      };
      console.log('Placing stoploss order:', payload);
      return this.dhanService.placeOrder(payload);
    }

    async getOrderStatus(orderId) {
      return this.dhanService.getOrderStatus(orderId);
    }
  }
  