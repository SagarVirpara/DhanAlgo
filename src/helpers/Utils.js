export class Utils {
    static customTickRound(price, tickSize) {
      let rounded = price - (tickSize / 100)
      return Number(rounded.toFixed(2))
    }
  }
  