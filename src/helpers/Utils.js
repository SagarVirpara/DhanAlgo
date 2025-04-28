export class Utils {
    static customTickRound(price, tickSize) {
      let effectiveTickSize = tickSize;
  
      if (tickSize < 5) {
        const decimals = tickSize.toString().split('.')[1]?.length || 0;
        const step = 5 / Math.pow(10, decimals + 1);
        effectiveTickSize = step;
      }
  
      const roundedPrice = Math.floor(price / effectiveTickSize) * effectiveTickSize;
      return Number(roundedPrice.toFixed(2));
    }
  }
  