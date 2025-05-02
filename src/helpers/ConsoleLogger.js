// Simple console logger with color codes for terminal
const ConsoleLogger = {
    // ANSI color codes for terminal output
    colors: {
      reset: "\x1b[0m",
      bright: "\x1b[1m",
      dim: "\x1b[2m",
      underscore: "\x1b[4m",
      blink: "\x1b[5m",
      reverse: "\x1b[7m",
      hidden: "\x1b[8m",
      
      // Foreground colors
      fg: {
        black: "\x1b[30m",
        red: "\x1b[31m",
        green: "\x1b[32m",
        yellow: "\x1b[33m",
        blue: "\x1b[34m",
        magenta: "\x1b[35m",
        cyan: "\x1b[36m",
        white: "\x1b[37m",
        crimson: "\x1b[38m"
      },
      
      // Background colors
      bg: {
        black: "\x1b[40m",
        red: "\x1b[41m",
        green: "\x1b[42m",
        yellow: "\x1b[43m",
        blue: "\x1b[44m",
        magenta: "\x1b[45m",
        cyan: "\x1b[46m",
        white: "\x1b[47m",
        crimson: "\x1b[48m"
      }
    },
    
    // Formatted timestamp
    timestamp() {
      const now = new Date();
      return now.toISOString().replace('T', ' ').substring(0, 19);
    },
    
    // Log level methods
    info(message, data = null) {
      const timestamp = this.timestamp();
      console.log(`${this.colors.fg.blue}[INFO] ${timestamp} - ${message}${this.colors.reset}`);
      if (data) this.prettyPrint(data);
    },
    
    success(message, data = null) {
      const timestamp = this.timestamp();
      console.log(`${this.colors.fg.green}[SUCCESS] ${timestamp} - ${message}${this.colors.reset}`);
      if (data) this.prettyPrint(data);
    },
    
    warn(message, data = null) {
      const timestamp = this.timestamp();
      console.log(`${this.colors.fg.yellow}[WARNING] ${timestamp} - ${message}${this.colors.reset}`);
      if (data) this.prettyPrint(data);
    },
    
    error(message, data = null) {
      const timestamp = this.timestamp();
      console.log(`${this.colors.fg.red}[ERROR] ${timestamp} - ${message}${this.colors.reset}`);
      if (data) this.prettyPrint(data, 'error');
    },
    
    debug(message, data = null) {
      const timestamp = this.timestamp();
      console.log(`${this.colors.fg.cyan}[DEBUG] ${timestamp} - ${message}${this.colors.reset}`);
      if (data) this.prettyPrint(data);
    },
    
    // Trading-specific logging
    startApp() {
      const line = '='.repeat(80);
      console.log(`\n${this.colors.bright}${this.colors.fg.cyan}${line}`);
      console.log(`${this.colors.bg.cyan}${this.colors.fg.black}               TRADING APPLICATION STARTED               ${this.colors.reset}`);
      console.log(`${this.colors.bright}${this.colors.fg.cyan}${line}${this.colors.reset}\n`);
    },
    
    endApp(success = true) {
      const line = '='.repeat(80);
      const color = success ? this.colors.fg.green : this.colors.fg.red;
      const bgColor = success ? this.colors.bg.green : this.colors.bg.red;
      const textColor = success ? this.colors.fg.black : this.colors.fg.white;
      const message = success ? 'TRADING APPLICATION COMPLETED SUCCESSFULLY' : 'TRADING APPLICATION TERMINATED WITH ERRORS';
      
      console.log(`\n${this.colors.bright}${color}${line}`);
      console.log(`${bgColor}${textColor}               ${message}               ${this.colors.reset}`);
      console.log(`${this.colors.bright}${color}${line}${this.colors.reset}\n`);
    },
    
    funds(available, allocated) {
      console.log(`${this.colors.fg.magenta}[FUNDS] Available: ₹${available.toFixed(2)}, Allocated: ₹${allocated.toFixed(2)}${this.colors.reset}`);
    },
    
    orderPlaced(type, symbol, quantity, price) {
      console.log(`${this.colors.fg.green}[ORDER PLACED] ${type} ORDER: ${symbol} x${quantity} @ ₹${price}${this.colors.reset}`);
    },
    
    orderStatus(orderId, status, price = null) {
      let colorCode;
      switch (status) {
        case 'TRADED':
          colorCode = this.colors.fg.green;
          break;
        case 'PENDING':
        case 'TRANSIT':
          colorCode = this.colors.fg.yellow;
          break;
        case 'REJECTED':
          colorCode = this.colors.fg.red;
          break;
        default:
          colorCode = this.colors.fg.white;
      }
      
      const priceStr = price ? ` @ ₹${price}` : '';
      console.log(`${colorCode}[ORDER STATUS] Order ${orderId}: ${status}${priceStr}${this.colors.reset}`);
    },
    
    stocksFiltered(count, symbols = []) {
      console.log(`${this.colors.fg.yellow}[STOCKS] Filtered ${count} stocks for trading${this.colors.reset}`);
      if (symbols.length > 0) {
        console.log(`${this.colors.fg.yellow}  └─ Symbols: ${symbols.join(', ')}${this.colors.reset}`);
      }
    },
    
    allocation(data) {
      console.log(`${this.colors.fg.cyan}[ALLOCATION] Stock allocation details:${this.colors.reset}`);
      console.table(data);
    },
    
    // Helper for data display
    prettyPrint(data, level = 'info') {
      let colorCode;
      switch (level) {
        case 'error':
          colorCode = this.colors.fg.red;
          break;
        case 'warn':
          colorCode = this.colors.fg.yellow;
          break;
        default:
          colorCode = this.colors.fg.blue;
      }
      
      if (typeof data === 'object') {
        console.log(`${colorCode}  └─ ${JSON.stringify(data, null, 2)}${this.colors.reset}`);
      } else {
        console.log(`${colorCode}  └─ ${data}${this.colors.reset}`);
      }
    }
  };
  
  export default ConsoleLogger;