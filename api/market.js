import { list } from '@vercel/blob';
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin','*');
  const { blobs } = await list({ prefix: 'market.json' });
  if(!blobs.length) return res.status(200).json({ headline: "Market loading..." });
  const data = await fetch(blobs[0].url).then(r=>r.json());
  res.status(200).json(data);
}
