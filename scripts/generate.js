import Parser from 'rss-parser';
import fs from 'fs';

const parser = new Parser();
console.log("Fetching RSS...");
const feed = await parser.parseURL('https://pulse.zerodha.com/feed.php');
const titles = feed.items.slice(0, 40).map(i => i.title).join('\n');

const prompt = 'Given these Indian stock market headlines:\n' + titles + '\n\nReturn ONLY valid JSON, no markdown: {"headline":"Sensex Rises 400 Points, Nifty Holds Above 23,200","why":["Reason 1","Reason 2","Reason 3","Reason 4"],"whatHappening":["Point 1","Point 2"],"stocksInNews":[{"symbol":"RELIANCE","sentiment":"Positive","sources":"7/10"},{"symbol":"TCS","sentiment":"Negative","sources":"6/10"}]}';

const MODELS = ['gemini-3.6-flash', 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];

let json = null;
let lastError = null;

for (const model of MODELS) {
  console.log(`Trying ${model}...`);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': process.env.GEMINI_API_KEY
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2 }
    })
  });

  json = await res.json();
  if (json.candidates) {
    console.log(`Success with ${model}`);
    break;
  }
  lastError = json;
  console.log(`Failed ${model}:`, json.error?.message);
  // if 503, try next model
  if (json.error?.code === 503 || json.error?.status === 'UNAVAILABLE') continue;
  // if 404, try next model
  if (json.error?.code === 404) continue;
  break;
}

if (!json?.candidates) {
  console.log("FULL ERROR:", JSON.stringify(lastError, null, 2));
  throw new Error("All Gemini models failed");
}

let text = json.candidates[0].content.parts.map(p => p.text || '').join('').trim();
text = text.replace(/```json/g, '').replace(/```/g, '').trim();

console.log("Gemini text:", text.slice(0, 1000));

let data;
try {
  data = JSON.parse(text);
} catch (e) {
  const match = text.match(/\{[\s\S]*\}/);
  if (match) data = JSON.parse(match[0]);
  else throw e;
}

data.updatedAt = new Date().toISOString();
fs.mkdirSync('public/data', { recursive: true });
fs.writeFileSync('public/data/market.json', JSON.stringify(data, null, 2));
console.log("Generated successfully:", data);