export class Utils {
  static customTickRound(input, tickSize) {
    const tick = tickSize / 100; // Convert tickSize to decimal step (e.g., 5 -> 0.05)

    // Subtract one tick
    const reduced = input - tick;

    // Find the nearest lower multiple of tick
    const multiplier = Math.floor(reduced / tick);
    const base = multiplier * tick;

    // Round to 2 decimal places to handle floating point precision
    return parseFloat(base.toFixed(2));
  }
}
