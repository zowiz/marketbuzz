import { useEffect, useState } from 'react'
export default function App() {
  const [tab, setTab] = useState('now')
  const [data, setData] = useState(null)
  const [ticker, setTicker] = useState({ nifty: '--', sensex: '--' })
  useEffect(() => {
    fetch('/data/market.json').then(r=>r.json()).then(setData).catch(()=>{})
    const loadTicker = async () => {
      try {
        const proxy = "https://api.allorigins.win/raw?url=";
        const niftyUrl = encodeURIComponent("https://query1.finance.yahoo.com/v8/finance/chart/%5ENSEI");
        const sensexUrl = encodeURIComponent("https://query1.finance.yahoo.com/v8/finance/chart/%5EBSESN");
        const [niftyRes, sensexRes] = await Promise.all([
          fetch(proxy + niftyUrl).then(r=>r.json()),
          fetch(proxy + sensexUrl).then(r=>r.json())
        ]);
        setTicker({
          nifty: niftyRes.chart.result[0].meta.regularMarketPrice.toFixed(2),
          sensex: sensexRes.chart.result[0].meta.regularMarketPrice.toFixed(2)
        });
      } catch(e){ console.log("ticker fail", e) }
    }
    loadTicker(); const id=setInterval(loadTicker, 30000); return ()=>clearInterval(id)
  }, [])
  return (
    <div style={{maxWidth:420, margin:'auto', padding:12, paddingBottom:80}}>
      <h3>NIFTY {ticker.nifty} | SENSEX {ticker.sensex}</h3>
      <h2>{data?.headline}</h2>
      {tab==='now' && <><h4>Why</h4><ul>{data?.why?.map((w,i)=><li key={i}>{w}</li>)}</ul><h4>What Happening</h4><ul>{data?.whatHappening?.map((w,i)=><li key={i}>{w}</li>)}</ul></>}
      {tab==='next' && <><h4>Stocks In News</h4>{data?.stocksInNews?.map((s,i)=><div key={i} style={{padding:8,background:'#fff',margin:'6px 0',borderRadius:8}}>{s.symbol} - {s.sentiment} - {s.sources}</div>)}</>}
      <div style={{position:'fixed', bottom:0, left:0, right:0, display:'flex', borderTop:'1px solid #ccc', background:'#fff'}}>
        <button style={{flex:1, padding:16}} onClick={()=>setTab('now')}>Right Now</button>
        <button style={{flex:1, padding:16}} onClick={()=>setTab('next')}>Whats Next</button>
      </div>
    </div>
  )
}
