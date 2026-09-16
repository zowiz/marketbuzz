import fs from 'fs';
import Parser from 'rss-parser';
import { GoogleGenerativeAI } from '@google/generative-ai';

const parser = new Parser();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function getHeadlines() {
  const urls = [
    'https://pulse.zerodha.com/feed.php',
    'https://news.google.com/rss/search?q=Sensex+Nifty+Stock+Market+India&hl=en-IN&gl=IN&ceid=IN:en',
    'https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms'
  ];
  let all = [];
  for (const url of urls) {
    try {
      const feed = await parser.parseURL(url);
      all.push(...feed.items.slice(0, 8).map(i => i.title));
    } catch {}
  }
  return [...new Set(all)].slice(0, 12);
}

async function generateWithRetry(prompt) {
  const modelsToTry = [
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-1.5-flash-8b",
    "gemini-1.5-flash-002"
  ];

  for (const modelName of modelsToTry) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`Trying ${modelName} (attempt ${attempt})...`);
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: { temperature: 0.3, responseMimeType: "application/json" }
        });
        const result = await model.generateContent(prompt);
        return result.response.text();
      } catch (e) {
        console.log(`Failed ${modelName}: ${e.status} ${e.statusText}`);
        if (e.status === 503) {
          await new Promise(r => setTimeout(r, 3000 * attempt)); // wait 3s, 6s
        }
      }
    }
  }
  throw new Error("All Gemini models busy");
}

async function main() {
  let headlines = await getHeadlines();
  console.log(`Final headlines: ${headlines.length}`);
  if (headlines.length === 0) headlines = ["Sensex Nifty update", "Indian market today"];

  const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });
  const prompt = `
Today is ${today}. Headlines from Zerodha Pulse:
${headlines.join("\n")}
Generate JSON ONLY: {"headline":"...","why":["...","...","..."],"whatHappening":["...","...","...","..."],"stocksInNews":[{"symbol":"RELIANCE","sentiment":"Positive","sources":"..."},{"symbol":"TCS","sentiment":"Negative","sources":"..."},{"symbol":"HDFCBANK","sentiment":"Positive","sources":"..."},{"symbol":"INFY","sentiment":"Neutral","sources":"..."}],"summary":"..."}
`;

  const jsonText = await generateWithRetry(prompt);
  const data = JSON.parse(jsonText.replace(/```json|```/g, '').trim());
  data.updatedAt = new Date().toISOString();
  data.source = "zerodha-pulse";

  fs.mkdirSync('public/data', { recursive: true });
  fs.writeFileSync('public/data/market.json', JSON.stringify(data, null, 2));
  console.log("SUCCESS:", data.headline, data.updatedAt);
}

main().catch(e => { console.error(e); process.exit(1); });
