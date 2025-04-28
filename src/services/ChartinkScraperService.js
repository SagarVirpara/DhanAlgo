import puppeteer from "puppeteer";

export class ChartinkScraperService {
  static async fetchStocks() {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    const targetRequestUrl = process.env.CHARTINK_PROCESS_URL;
    let targetResponse = null;

    page.on("response", async (response) => {
      if (response.url() === targetRequestUrl) {
        try {
          targetResponse = {
            body: await response.text(),
          };
        } catch (error) {
          console.error(`Error capturing response:`, error);
        }
      }
    });

    try {
      await page.goto(process.env.CHARTINK_URL, {
        waitUntil: "networkidle0",
      });
    } catch (error) {
      console.error("Error navigating to Chartink:", error);
      throw error;
    } finally {
      await browser.close();
    }

    if (!targetResponse) throw new Error("Failed to capture Chartink response.");

    const parsedData = JSON.parse(targetResponse.body);
    return parsedData.data;
  }
}
