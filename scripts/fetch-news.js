import fs from 'fs';
import Parser from 'rss-parser';
import { GoogleGenAI } from '@google/genai';

const parser = new Parser();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// ============================================================
// NSE 2026 TRADING CALENDAR
// ============================================================
const NSE_HOLIDAYS_2026 = [
  '2026-01-26', // Republic Day
  '2026-02-19', // Chhatrapati Shivaji Maharaj Jayanti
  '2026-03-03', // Holi
  '2026-03-19', // Gudhi Padwa
  '2026-03-26', // Ram Navami
  '2026-03-31', // Mahavir Jayanti
  '2026-04-01', // Annual Bank Closing
  '2026-04-03', // Good Friday
  '2026-04-14', // Dr. Babasaheb Ambedkar Jayanti
  '2026-05-01', // Maharashtra Din / Buddha Pournima
  '2026-05-28', // Bakri ID
  '2026-06-26', // Muharram
  '2026-08-26', // Id-E-Milad
  '2026-09-14', // Ganesh Chaturthi
  '2026-10-02', // Mahatma Gandhi Jayanti
  '2026-10-20', // Dussehra
  '2026-11-10', // Diwali (Bali Pratipada)
  '2026-11-24', // Guru Nanak Jayanti
  '2026-12-25'  // Christmas
];

const MUHURAT_TRADING_DATES_2026 = [
  '2026-11-08'
];

function getMarketStatus() {
  const now = new Date();

  // IST date for getDay/getDate checks
  const ist = new Date(
    now.toLocaleString('en-US', {
      timeZone: 'Asia/Kolkata'
    })
  );

  const day = ist.getDay(); // 0 = Sunday, 6 = Saturday
  
  // FIX: get YYYY-MM-DD directly in IST timezone (not from ist.toISOString)
  const dateStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

  const isWeekend = day === 0 || day === 6;
  const isHoliday = NSE_HOLIDAYS_2026.includes(dateStr);
  const isMuhuratTrading = MUHURAT_TRADING_DATES_2026.includes(dateStr);

  const isClosed = !isMuhuratTrading && (isWeekend || isHoliday);

  let nextOpen = new Date(ist);

  do {
    nextOpen.setDate(nextOpen.getDate() + 1);

    const nextDay = nextOpen.getDay();
    // FIX: next date also in IST
    const nextDateStr = nextOpen.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

    const nextIsWeekend = nextDay === 0 || nextDay === 6;
    const nextIsHoliday = NSE_HOLIDAYS_2026.includes(nextDateStr);
    const nextIsMuhurat = MUHURAT_TRADING_DATES_2026.includes(nextDateStr);

    if (nextIsMuhurat || (!nextIsWeekend && !nextIsHoliday)) {
      break;
    }
  } while (true);

  const nextOpenFormatted = nextOpen.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Asia/Kolkata'
  });

  let marketMessage = '';

  if (isMuhuratTrading) {
    marketMessage =
      'Today is Diwali Laxmi Pujan. NSE will conduct Muhurat Trading. Exact trading timings are notified separately by NSE.';
  } else if (isHoliday) {
    marketMessage =
      `Market is closed for trading today due to an NSE holiday. It will reopen on ${nextOpenFormatted}.`;
  } else if (isWeekend) {
    marketMessage =
      `Market is closed today because it is a weekend. It will reopen on ${nextOpenFormatted}.`;
  } else {
    marketMessage = 'Market is open for trading today.';
  }

  return {
    isClosed,
    isWeekend,
    isHoliday,
    isMuhuratTrading,
    nextOpenFormatted,
    dateStr,
    message: marketMessage
  };
}

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
    } catch (e) {
      console.log(`✗ ${url} ${e.message}`);
    }
  }
  return [...new Set(all)].slice(0, 12);
}

async function generateWithRetry(prompt) {
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
          config: { temperature: 0.3, responseMimeType: "application/json" }
        });
        return response.text;
      } catch (e) {
        console.log(`Failed ${m}: ${e.message?.slice(0, 200)}`);
        if (e.message?.includes('404')) break;
        await new Promise(r => setTimeout(r, 2000 * attempt));
      }
    }
  }
  throw new Error("All models failed");
}

async function main() {
  const headlines = await getHeadlines();
  const market = getMarketStatus();

  console.log(
    `Market closed? ${market.isClosed} | Holiday? ${market.isHoliday} | Muhurat? ${market.isMuhuratTrading} | Next: ${market.nextOpenFormatted} | Date: ${market.dateStr}`
  );

  const today = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Kolkata'
  });

  let holidayInstruction = "";

  if (market.isClosed) {
    holidayInstruction = `
IMPORTANT: Today ${today} the NSE market is CLOSED for trading.
Reason: ${market.isHoliday ? 'NSE trading holiday' : 'Weekend'}
Market message: "${market.message}"

1. In JSON, add:
"marketStatus": {
  "isClosed": true,
  "isMuhuratTrading": false,
  "message": "${market.message}",
  "nextOpen": "${market.nextOpenFormatted}"
}
2. Headline MUST be about the LAST trading day.
3. Start the headline with: "Last session:" or "On last trading day..."
4. why and whatHappening should describe the LAST trading day's performance.
5. Do NOT pretend that today's market is trading.
`;
  } else if (market.isMuhuratTrading) {
    holidayInstruction = `
IMPORTANT: Today ${today} is Diwali Laxmi Pujan / MUHURAT TRADING.
Market status: "${market.message}"
In JSON, add:
"marketStatus": {
  "isClosed": false,
  "isMuhuratTrading": true,
  "message": "${market.message}",
  "nextOpen": "${market.nextOpenFormatted}"
}
Do NOT describe today as a normal trading day.
`;
  } else {
    holidayInstruction = `
Market is OPEN today.
Add:
"marketStatus": {
  "isClosed": false,
  "isMuhuratTrading": false,
  "message": "Market is open for trading today.",
  "nextOpen": ""
}
`;
  }

  const prompt = `Today is ${today}.
Indian market headlines from Zerodha Pulse:
${headlines.join("\n")}

${holidayInstruction}

Generate valid JSON ONLY in this shape:
{
  "headline": "Sensex... (20 words max)",
  "marketStatus": { "isClosed": false, "isMuhuratTrading": false, "message": "", "nextOpen": "" },
  "why": ["reason1","reason2","reason3","reason4"],
  "whatHappening": ["fact1","fact2","fact3","fact4"],
  "stocksInNews": [
    {"symbol":"RELIANCE","sentiment":"Positive","sources": "Recommended by 7/10 sources"},
    {"symbol":"TCS","sentiment":"Negative","sources": "Recommended by 7/10 sources"},
    {"symbol":"HDFCBANK","sentiment":"Positive","sources": "Recommended by 7/10 sources"},
    {"symbol":"INFY","sentiment":"Neutral","sources": "Recommended by 7/10 sources"},
    {"symbol":"ICICIBANK","sentiment":"Positive","sources": "Recommended by 7/10 sources"},
    {"symbol":"SBIN","sentiment":"Positive","sources": "Recommended by 7/10 sources"},
    {"symbol":"BHARTIARTL","sentiment":"Positive","sources": "Recommended by 7/10 sources"},
    {"symbol":"ITC","sentiment":"Neutral","sources": "Recommended by 7/10 sources"},
    {"symbol":"LT","sentiment":"Positive","sources": "Recommended by 7/10 sources"},
    {"symbol":"MARUTI","sentiment":"Negative","sources": "Recommended by 7/10 sources"}
  ],
  "summary": "3 lines summary"
}
Rules:
- MUST return exactly 10 stocks in stocksInNews.
- Every stock symbol must be different.
- Do not invent news that is not supported by the supplied headlines.
- Return valid JSON only.
`;

  const raw = await generateWithRetry(prompt);
  const json = JSON.parse(raw.replace(/```json|```/g, '').trim());
  json.updatedAt = new Date().toISOString();
  json.source = "zerodha-pulse";
  json.dateChecked = market.dateStr;

  fs.mkdirSync('public/data', { recursive: true });
  fs.writeFileSync('public/data/market.json', JSON.stringify(json, null, 2));
  console.log("SUCCESS:", json.headline, json.marketStatus);
}

main().catch(e => { console.error(e); process.exit(1); });