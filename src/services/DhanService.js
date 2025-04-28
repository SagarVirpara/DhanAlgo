import { DhanHqClient } from "dhanhq";

export class DhanService {
  constructor(accessToken) {
    this.client = new DhanHqClient({
      accessToken,
      env: "PROD",
    });
  }

  getHoldings() {
    return this.client.getHoldings();
  }

  getFunds() {
    return this.client.getFundLimit();
  }

  placeOrder(orderPayload) {
    return this.client.placeOrder(orderPayload);
  }

  getOrderStatus(orderId) {
    return this.client.getOrderByOrderId(orderId);
  }

}
