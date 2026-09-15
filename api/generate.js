import { put } from '@vercel/blob';
import Parser from 'rss-parser';

export default async function handler(req, res) {
  try {
    // 1. Fetch Zerodha Pulse
    const parser = new Parser();
    const feed = await parser.parseURL('https://pulse.zerodha.com/feed.php');
    const titles = feed.items.slice(0, 50).map(i => i.title).join('\n');

    // 2. Call Gemini
    const prompt = `Given these headlines:\n${titles}\n\nReturn ONLY JSON like:
    {"headline":"Market down by 1%","why":["Crude got expensive","War fear volatility up","Nasdaq fell last night","FII pulling out"],"whatHappening":["IT sector down the most","Banks holding up"],"stocksInNews":[{"symbol":"INFY","sentiment":"Positive","sources":"7/10"},{"symbol":"TCS","sentiment":"Negative","sources":"6/10"}]}`;

    const gemRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({contents:[{parts:[{text: prompt}]}]})
    });
    const gemJson = await gemRes.json();
    let text = gemJson.candidates[0].content.parts[0].text;
    text = text.replace(/```json|```/g,'').trim();
    const data = JSON.parse(text);
    data.updatedAt = new Date().toISOString();

    // 3. Save to Vercel Blob
    await put('market.json', JSON.stringify(data), { access: 'public', addRandomSuffix: false });

    res.status(200).json({ ok: true, data });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
