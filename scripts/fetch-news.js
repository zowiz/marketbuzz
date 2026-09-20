import fs from 'fs';
import Parser from 'rss-parser';
import { GoogleGenAI } from '@google/genai';

const parser = new Parser({
  customFields: {
    item: [
      ['source', 'source'],
      ['creator', 'creator']
    ]
  }
});

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

// ============================================================
// NSE 2026 TRADING CALENDAR
// ============================================================

const NSE_HOLIDAYS_2026 = [
  '2026-01-26',
  '2026-02-19',
  '2026-03-03',
  '2026-03-19',
  '2026-03-26',
  '2026-03-31',
  '2026-04-01',
  '2026-04-03',
  '2026-04-14',
  '2026-05-01',
  '2026-05-28',
  '2026-06-26',
  '2026-08-26',
  '2026-09-14',
  '2026-10-02',
  '2026-10-20',
  '2026-11-10',
  '2026-11-24',
  '2026-12-25'
];

const MUHURAT_TRADING_DATES_2026 = [
  '2026-11-08'
];

// ============================================================
// MARKET STATUS
// ============================================================

function getMarketStatus() {
  const now = new Date();

  const ist = new Date(
    now.toLocaleString('en-US', {
      timeZone: 'Asia/Kolkata'
    })
  );

  const day = ist.getDay();

  const dateStr = now.toLocaleDateString('en-CA', {
    timeZone: 'Asia/Kolkata'
  });

  const isWeekend = day === 0 || day === 6;
  const isHoliday = NSE_HOLIDAYS_2026.includes(dateStr);
  const isMuhuratTrading =
    MUHURAT_TRADING_DATES_2026.includes(dateStr);

  const isClosed =
    !isMuhuratTrading && (isWeekend || isHoliday);

  let nextOpen = new Date(ist);

  do {
    nextOpen.setDate(nextOpen.getDate() + 1);

    const nextDay = nextOpen.getDay();

    const nextDateStr = nextOpen.toLocaleDateString('en-CA', {
      timeZone: 'Asia/Kolkata'
    });

    const nextIsWeekend =
      nextDay === 0 || nextDay === 6;

    const nextIsHoliday =
      NSE_HOLIDAYS_2026.includes(nextDateStr);

    const nextIsMuhurat =
      MUHURAT_TRADING_DATES_2026.includes(nextDateStr);

    if (
      nextIsMuhurat ||
      (!nextIsWeekend && !nextIsHoliday)
    ) {
      break;
    }
  } while (true);

  const nextOpenFormatted =
    nextOpen.toLocaleDateString('en-IN', {
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
    marketMessage =
      'Market is open for trading today.';
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

// ============================================================
// NORMALIZE TEXT
// ============================================================

function normalizeText(text = '') {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ============================================================
// GET RSS NEWS
// ============================================================

async function getHeadlines() {
  const feeds = [
    {
      url: 'https://pulse.zerodha.com/feed.php',
      fallbackSource: 'Zerodha Pulse'
    },
    {
      url: 'https://news.google.com/rss/search?q=Sensex+Nifty+India+stock+market&hl=en-IN&gl=IN&ceid=IN:en',
      fallbackSource: 'Google News'
    }
  ];

  let all = [];

  for (const feedInfo of feeds) {
    try {
      const feed = await parser.parseURL(feedInfo.url);

      const articles = feed.items
        .slice(0, 10)
        .map(item => {
          let source = feedInfo.fallbackSource;

          if (item.source) {
            if (typeof item.source === 'string') {
              source = item.source;
            } else if (item.source.name) {
              source = item.source.name;
            }
          }

          if (
            source === 'Google News' &&
            item.creator
          ) {
            source = item.creator;
          }

          return {
            title: item.title?.trim() || '',
            source,
            link: item.link || '',
            publishedAt: item.pubDate || '',
            key: normalizeText(item.title || '')
          };
        })
        .filter(article => article.title);

      all.push(...articles);

      console.log(
        `✓ ${feedInfo.fallbackSource}: ${articles.length} articles`
      );
    } catch (e) {
      console.log(
        `✗ ${feedInfo.url}: ${e.message}`
      );
    }
  }

  // Deduplicate identical headlines
  const unique = [];

  for (const article of all) {
    const exists = unique.some(
      existing => existing.key === article.key
    );

    if (!exists) {
      unique.push(article);
    }
  }

  return unique.slice(0, 20);
}

// ============================================================
// LOAD PREVIOUS DATA
// ============================================================

function loadPreviousData() {
  const path = 'public/data/market.json';

  if (!fs.existsSync(path)) {
    return null;
  }

  try {
    return JSON.parse(
      fs.readFileSync(path, 'utf8')
    );
  } catch (e) {
    console.log(
      `Could not read previous market.json: ${e.message}`
    );

    return null;
  }
}

// ============================================================
// CHECK FOR NEW NEWS
// ============================================================

function getNewArticles(articles, previousData) {
  if (
    !previousData ||
    !Array.isArray(previousData.articleKeys)
  ) {
    return articles;
  }

  const previousKeys =
    new Set(previousData.articleKeys);

  return articles.filter(
    article => !previousKeys.has(article.key)
  );
}

// ============================================================
// GEMINI
// ============================================================

async function generateWithRetry(prompt) {
  const models = [
    'gemini-3.6-flash',
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-3-flash-preview'
  ];

  for (const model of models) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(
          `Trying ${model} (attempt ${attempt})...`
        );

        const response =
          await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
              temperature: 0.3,
              responseMimeType: 'application/json'
            }
          });

        return response.text;
      } catch (e) {
        console.log(
          `Failed ${model}: ${e.message?.slice(0, 200)}`
        );

        if (e.message?.includes('404')) {
          break;
        }

        await new Promise(resolve =>
          setTimeout(resolve, 2000 * attempt)
        );
      }
    }
  }

  throw new Error('All models failed');
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  const articles = await getHeadlines();

  const previousData =
    loadPreviousData();

  const market =
    getMarketStatus();

  console.log(
    `Market closed? ${market.isClosed} | ` +
    `Holiday? ${market.isHoliday} | ` +
    `Muhurat? ${market.isMuhuratTrading} | ` +
    `Date: ${market.dateStr}`
  );

  console.log(
    `Total articles found: ${articles.length}`
  );

  const newArticles =
    getNewArticles(
      articles,
      previousData
    );

  console.log(
    `New articles: ${newArticles.length}`
  );

  // ==========================================================
  // NO NEW NEWS → SKIP GEMINI
  // ==========================================================

  if (
    previousData &&
    newArticles.length === 0
  ) {
    console.log(
      'No new articles. Skipping Gemini.'
    );

    process.exit(0);
  }

  // ==========================================================
  // TODAY
  // ==========================================================

  const today =
    new Date().toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'Asia/Kolkata'
    });

  // ==========================================================
  // MARKET STATUS INSTRUCTION
  // ==========================================================

  let marketInstruction = '';

  if (market.isClosed) {
    marketInstruction = `
IMPORTANT:

Today ${today} the NSE market is CLOSED for trading.

Reason:
${market.isHoliday ? 'NSE trading holiday' : 'Weekend'}

Market message:
"${market.message}"

The headline must describe the LAST TRADING SESSION.

Do not pretend today's market is trading.

Use:
"Last session:" or
"On last trading day..."
when appropriate.
`;
  } else if (market.isMuhuratTrading) {
    marketInstruction = `
IMPORTANT:

Today ${today} is Diwali Laxmi Pujan / MUHURAT TRADING.

Market message:
"${market.message}"

Do not describe today as a normal trading day.
`;
  } else {
    marketInstruction = `
The NSE market is OPEN today.

Market message:
"Market is open for trading today."
`;
  }

  // ==========================================================
  // PREPARE ARTICLES FOR GEMINI
  // ==========================================================

  const articleData =
    articles.map((article, index) => ({
      id: index,
      title: article.title,
      source: article.source,
      publishedAt: article.publishedAt
    }));

  // ==========================================================
  // GEMINI PROMPT
  // ==========================================================

  const prompt = `
Today is ${today}.

You are analyzing Indian stock-market news.

${marketInstruction}

Here are the actual articles collected from RSS feeds:

${JSON.stringify(articleData, null, 2)}

IMPORTANT RULES:

1. Use ONLY information contained in the supplied articles.

2. Do NOT invent facts, companies, prices, events, recommendations,
or reasons.

3. A stock should appear in stocksInNews ONLY if it is actually
supported by one or more supplied articles.

4. Identify the Indian stock symbols mentioned or clearly associated
with the supplied articles.

5. Sentiment must be based on the actual context of the articles.

6. Do NOT create fake source counts.

7. For every stock, return the IDs of the articles that support
that stock in "articleIds".

8. "articleIds" must contain only IDs from the supplied articles.

9. Do not include a stock simply because it is a large or popular
Indian company.

10. Prefer stocks with actual news coverage.

11. If fewer than 10 stocks are supported by the supplied articles,
return fewer than 10. Never invent stocks just to reach 10.

12. A source means the publisher/source field attached to an article.

13. Different articles from the SAME publisher count as ONE source.

14. The backend will calculate source counts from articleIds.
You must NOT calculate or write the count yourself.

Return JSON ONLY.

Use exactly this structure:

{
  "headline": "Short market headline, maximum 20 words",

  "marketStatus": {
    "isClosed": false,
    "isMuhuratTrading": false,
    "message": "",
    "nextOpen": ""
  },

  "why": [
    "reason 1",
    "reason 2",
    "reason 3",
    "reason 4"
  ],

  "whatHappening": [
    "fact 1",
    "fact 2",
    "fact 3",
    "fact 4"
  ],

  "stocksInNews": [
    {
      "symbol": "RELIANCE",
      "sentiment": "Positive",
      "articleIds": [0, 3]
    }
  ],

  "summary": "Short 3-line market summary"
}

Allowed sentiment values:

Positive
Negative
Neutral

Return valid JSON only.
`;

  // ==========================================================
  // CALL GEMINI
  // ==========================================================

  const raw =
    await generateWithRetry(prompt);

  const json =
    JSON.parse(
      raw
        .replace(/```json|```/g, '')
        .trim()
    );

  // ==========================================================
  // CALCULATE REAL SOURCE COUNTS
  // ==========================================================

  const sourceList =
    articles.map(article =>
      article.source
    );

  const totalSources =
    new Set(sourceList).size;

  const stocks =
    Array.isArray(json.stocksInNews)
      ? json.stocksInNews
      : [];

  const processedStocks =
    stocks
      .map(stock => {
        const articleIds =
          Array.isArray(stock.articleIds)
            ? stock.articleIds
            : [];

        const validArticleIds =
          articleIds.filter(
            id =>
              Number.isInteger(id) &&
              id >= 0 &&
              id < articles.length
          );

        const sources =
          new Set(
            validArticleIds.map(
              id => articles[id].source
            )
          );

        const sourceCount =
          sources.size;

        return {
          symbol: stock.symbol,
          sentiment: stock.sentiment,
          sources:
            `Mentioned by ${sourceCount}/${totalSources} sources`,
          articleIds: validArticleIds
        };
      })
      .filter(stock =>
        stock.symbol &&
        stock.articleIds.length > 0
      )
      .slice(0, 10);

  // ==========================================================
  // STORE DATA
  // ==========================================================

  json.stocksInNews =
    processedStocks;

  json.updatedAt =
    new Date().toISOString();

  json.source =
    'zerodha-pulse';

  json.dateChecked =
    market.dateStr;

  // Store the article keys so the next 30-minute run
  // can determine whether anything new appeared.

  json.articleKeys =
    articles.map(article =>
      article.key
    );

  // Also store the actual article metadata.
  // Useful for debugging and future source-count improvements.

  json.articles =
    articles.map(article => ({
      title: article.title,
      source: article.source,
      link: article.link,
      publishedAt: article.publishedAt
    }));

  fs.mkdirSync(
    'public/data',
    { recursive: true }
  );

  fs.writeFileSync(
    'public/data/market.json',
    JSON.stringify(
      json,
      null,
      2
    )
  );

  console.log(
    'SUCCESS:',
    json.headline
  );

  console.log(
    `Sources detected: ${totalSources}`
  );

  console.log(
    `Stocks detected: ${processedStocks.length}`
  );
}

// ============================================================
// RUN
// ============================================================

main().catch(error => {
  console.error(error);
  process.exit(1);
});