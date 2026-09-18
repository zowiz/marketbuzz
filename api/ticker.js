export default async function handler(req, res) {
  try {
    const [niftyData, sensexData] = await Promise.all([
      fetch("https://query1.finance.yahoo.com/v8/finance/chart/%5ENSEI", { headers: { 'User-Agent': 'Mozilla/5.0' } }).then(r => r.json()),
      fetch("https://query1.finance.yahoo.com/v8/finance/chart/%5EBSESN", { headers: { 'User-Agent': 'Mozilla/5.0' } }).then(r => r.json())
    ]);
    const nifty = niftyData.chart.result[0];
    const sensex = sensexData.chart.result[0];
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({
      nifty: {
        price: nifty.meta.regularMarketPrice,
        change: nifty.meta.regularMarketPrice - nifty.meta.previousClose
      },
      sensex: {
        price: sensex.meta.regularMarketPrice,
        change: sensex.meta.regularMarketPrice - sensex.meta.previousClose
      },
      time: new Date().toISOString()
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}