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
  
    async placeForeverOrder(securityId, quantity, triggerPrice) {
      const payload = {
        dhanClientId: this.clientId.toString(),
        orderFlag: "SINGLE",
        transactionType: "SELL",
        exchangeSegment: "NSE_EQ",
        productType: "CNC",
        orderType: "MARKET",
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
  