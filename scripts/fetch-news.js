import fs from 'fs';
import Parser from 'rss-parser';
import { GoogleGenAI } from '@google/genai';

const parser = new Parser();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function getHeadlines() {
  const urls = [
    'https://pulse.zerodha.com/feed.php',
    'https://news.google.com/rss/search?q=Sensex+Nifty+India+stock+market&hl=en-IN&gl=IN&ceid=IN:en'
  ];
  let all = [];
  for (const url of urls) {
    try {
      const feed = await parser.parseURL(url);
      all.push(...feed.items.slice(0, 8).map(i => i.title));
      console.log(`✓ ${feed.items.length} from ${url}`);
    } catch (e) {
      console.log(`✗ ${url} ${e.message}`);
    }
  }
  return [...new Set(all)].slice(0, 12);
}

async function generateWithRetry(prompt) {
  // 2026 models - these are the ones that exist NOW
  const models = [
    "gemini-3.6-flash",
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-3-flash-preview"
  ];

  for (const m of models) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`Trying ${m} (attempt ${attempt})...`);
        const response = await ai.models.generateContent({
          model: m,
          contents: prompt,
          config: {
            temperature: 0.3,
            responseMimeType: "application/json"
          }
        });
        console.log(`Success with ${m}`);
        return response.text;
      } catch (e) {
        console.log(`Failed ${m}: ${e.message?.slice(0, 200)}`);
        if (e.message?.includes('404')) break; // model doesn't exist, try next
        await new Promise(r => setTimeout(r, 2000 * attempt));
      }
    }
  }
  throw new Error("All models failed");
}

async function main() {
  const headlines = await getHeadlines();
  console.log(`Final headlines: ${headlines.length}`);

  const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });
  const prompt = `Today is ${today}. Indian market headlines from Zerodha Pulse:
${headlines.join("\n")}

Generate valid JSON ONLY in this shape:
{
  "headline": "Sensex... (12 words max)",
  "why": ["reason1","reason2","reason3","reason4"],
  "whatHappening": ["fact1","fact2","fact3","fact4"],
  "stocksInNews": [
    {"symbol":"RELIANCE","sentiment":"Positive","sources":"trigger"},
    {"symbol":"TCS","sentiment":"Negative","sources":"trigger"},
    {"symbol":"HDFCBANK","sentiment":"Positive","sources":"trigger"},
    {"symbol":"INFY","sentiment":"Neutral","sources":"trigger"},
    {"symbol":"ICICIBANK","sentiment":"Positive","sources":"trigger"},
    {"symbol":"SBIN","sentiment":"Positive","sources":"trigger"},
    {"symbol":"BHARTIARTL","sentiment":"Positive","sources":"trigger"},
    {"symbol":"ITC","sentiment":"Neutral","sources":"trigger"},
    {"symbol":"LT","sentiment":"Positive","sources":"trigger"},
    {"symbol":"MARUTI","sentiment":"Negative","sources":"trigger"}
  ],
  "summary": "3 lines summary"
}

Rules: MUST return exactly 10 stocks in stocksInNews, different symbols only.`;

  const raw = await generateWithRetry(prompt);
  const json = JSON.parse(raw.replace(/```json|```/g, '').trim());
  json.updatedAt = new Date().toISOString();
  json.source = "zerodha-pulse";

  fs.mkdirSync('public/data', { recursive: true });
  fs.writeFileSync('public/data/market.json', JSON.stringify(json, null, 2));
  console.log("SUCCESS:", json.headline, json.updatedAt);
}

main().catch(e => { console.error(e); process.exit(1); });
