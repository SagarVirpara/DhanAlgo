export class StockAllocator {
  static allocate(stocks, budget) {
    const affordable = stocks
      .map((stock, index) => ({ price: stock.close, index }))
      .filter(stock => stock.price <= budget);

    if (affordable.length === 0) return { allocation: [], total: 0 };

    const perStockBudget = Math.floor(budget / affordable.length);
    const allocation = Array(stocks.length).fill(0);
    let totalSpent = 0;

    for (const stock of affordable) {
      const maxQty = Math.floor(perStockBudget / stock.price);
      allocation[stock.index] = maxQty;
      totalSpent += maxQty * stock.price;
    }

    let remaining = budget - totalSpent;
    const sortedByPrice = [...affordable].sort((a, b) => a.price - b.price);

    let didBuy = true;
    while (remaining >= Math.min(...affordable.map(s => s.price)) && didBuy) {
      didBuy = false;
      for (const stock of sortedByPrice) {
        if (remaining >= stock.price) {
          allocation[stock.index]++;
          remaining -= stock.price;
          totalSpent += stock.price;
          didBuy = true;
        }
      }
    }

    return {
      allocation,
      total: totalSpent,
    };
  }
}
