import fs from 'fs';
import Parser from 'rss-parser';
import { GoogleGenerativeAI } from '@google/generative-ai';

const parser = new Parser();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function getHeadlines() {
  // ZERODHA RSS FEEDS - these work on GitHub Actions
  const urls = [
    'https://pulse.zerodha.com/feed.php', // main pulse feed
    'https://news.google.com/rss/search?q=Sensex+Nifty+Stock+Market+India&hl=en-IN&gl=IN&ceid=IN:en', // backup
    'https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms'
  ];
  
  let all = [];
  for (const url of urls) {
    try {
      const feed = await parser.parseURL(url);
      const titles = feed.items.slice(0, 8).map(i => i.title);
      console.log(`✓ ${titles.length} from ${url}`);
      all.push(...titles);
    } catch (e) {
      console.log(`✗ Failed ${url}: ${e.message}`);
    }
  }
  return [...new Set(all)].slice(0, 12);
}

async function main() {
  let headlines = await getHeadlines();
  console.log("Final headlines:", headlines.length);

  if (headlines.length === 0) {
    headlines = ["Sensex Nifty volatile", "MarketBuzz daily update"]; // never exit
  }

  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    generationConfig: { temperature: 0.3, responseMimeType: "application/json" }
  });

  const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });

  const prompt = `
Today is ${today} (India). Use ZERODHA Pulse headlines below:

${headlines.join("\n")}

Generate MarketBuzz update. Output ONLY valid JSON:

{
  "headline": "One line market status, max 12 words",
  "why": ["reason 1", "reason 2", "reason 3"],
  "whatHappening": ["fact 1", "fact 2", "fact 3", "fact 4"],
  "stocksInNews": [
    {"symbol": "RELIANCE", "sentiment": "Positive", "sources": "News trigger"},
    {"symbol": "TCS", "sentiment": "Negative", "sources": "News trigger"},
    {"symbol": "HDFCBANK", "sentiment": "Positive", "sources": "FII buying"},
    {"symbol": "INFY", "sentiment": "Neutral", "sources": "Result awaited"}
  ],
  "summary": "2 line summary"
}
`;

  const result = await model.generateContent(prompt);
  const data = JSON.parse(result.response.text().replace(/```json|```/g, '').trim());
  data.updatedAt = new Date().toISOString();
  data.source = "zerodha-pulse";

  fs.mkdirSync('public/data', { recursive: true });
  fs.writeFileSync('public/data/market.json', JSON.stringify(data, null, 2));

  console.log("SUCCESS:", data.headline, data.updatedAt);
}

main().catch(e => { console.error(e); process.exit(1); });
