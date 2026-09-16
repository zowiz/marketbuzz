import fs from 'fs';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function fetchRSS(url) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const text = await res.text();
    const items = [...text.matchAll(/<title><!\[CDATA\[(.*?)\]\]><\/title>/g)].map(m => m[1]).slice(0, 5);
    return items;
  } catch { return []; }
}

async function main() {
  const rssUrls = [
    'https://www.moneycontrol.com/rss/MCtopnews.xml',
    'https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms'
  ];

  let headlines = [];
  for (const url of rssUrls) {
    const h = await fetchRSS(url);
    headlines.push(...h);
  }
  headlines = [...new Set(headlines)].slice(0, 12);

  if (headlines.length === 0) {
    console.log("No headlines found, keeping old file");
    return;
  }

  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    generationConfig: { temperature: 0.2, responseMimeType: "application/json" }
  });

  const prompt = `
You are MarketBuzz analyst for Indian stock market.
HEADLINES TODAY:
${headlines.join("\n")}

RULES: Output ONLY valid JSON, no markdown. Each point under 15 words.
FORMAT:
{
  "headline": "One line why market up/down today, max 12 words",
  "why": ["reason 1", "reason 2", "reason 3"],
  "whatHappening": ["fact 1", "fact 2", "fact 3", "fact 4"],
  "stocksInNews": [
    {"symbol": "RELIANCE", "sentiment": "Positive", "sources": "Q2 beat"},
    {"symbol": "TCS", "sentiment": "Negative", "sources": "US downgrade"}
  ],
  "summary": "2 line summary"
}
`;

  const result = await model.generateContent(prompt);
  const jsonText = result.response.text().replace(/```json|```/g, '').trim();
  const data = JSON.parse(jsonText);

  data.updatedAt = new Date().toISOString();

  fs.mkdirSync('public/data', { recursive: true });
  fs.writeFileSync('public/data/market.json', JSON.stringify(data, null, 2));
  fs.mkdirSync('data', { recursive: true });
  fs.writeFileSync('data/market.json', JSON.stringify(data, null, 2));

  console.log("Updated:", data.headline);
}

main().catch(e => { console.error(e); process.exit(1); });
