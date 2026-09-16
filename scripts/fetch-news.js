import fs from 'fs';
import Parser from 'rss-parser';

const parser = new Parser();
const KEY = process.env.GEMINI_API_KEY;

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

async function callGemini(model, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, responseMimeType: "application/json" }
    })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`${res.status} ${data.error?.message}`);
  return data.candidates[0].content.parts[0].text;
}

async function generateWithRetry(prompt) {
  // Use v1 models that actually exist
const models = [
  "gemini-3.6-flash",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-3-flash"
];

  for (const m of models) {
    for (let i = 0; i < 2; i++) {
      try {
        console.log(`Trying ${m}...`);
        const text = await callGemini(m, prompt);
        console.log(`Success with ${m}`);
        return text;
      } catch (e) {
        console.log(`Failed ${m}: ${e.message}`);
        await new Promise(r => setTimeout(r, 2000));
      }
    }
  }
  throw new Error("All models failed");
}

async function main() {
  const headlines = await getHeadlines();
  console.log(`Final headlines: ${headlines.length}`, headlines);

  const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });

  const prompt = `Today is ${today}. Indian market headlines from Zerodha Pulse:
${headlines.join("\n")}

Generate valid JSON ONLY (no markdown) in this exact shape:
{
  "headline": "Sensex... (12 words max)",
  "why": ["reason1", "reason2", "reason3"],
  "whatHappening": ["fact1","fact2","fact3","fact4"],
  "stocksInNews": [
    {"symbol":"RELIANCE","sentiment":"Positive","sources":"trigger"},
    {"symbol":"TCS","sentiment":"Negative","sources":"trigger"},
    {"symbol":"HDFCBANK","sentiment":"Positive","sources":"trigger"},
    {"symbol":"INFY","sentiment":"Neutral","sources":"trigger"}
  ],
  "summary": "2 lines summary"
}`;

  const raw = await generateWithRetry(prompt);
  const json = JSON.parse(raw.replace(/```json|```/g, '').trim());
  json.updatedAt = new Date().toISOString();
  json.source = "zerodha-pulse";

  fs.mkdirSync('public/data', { recursive: true });
  fs.writeFileSync('public/data/market.json', JSON.stringify(json, null, 2));
  console.log("SUCCESS:", json.headline, json.updatedAt);
}

main().catch(e => { console.error(e); process.exit(1); });
