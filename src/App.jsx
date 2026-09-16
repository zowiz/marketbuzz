import { useEffect, useState } from 'react'

export default function App() {
  const [tab, setTab] = useState('now')
  const [data, setData] = useState(null)
  const [ticker, setTicker] = useState({ nifty: null, sensex: null })

  useEffect(() => {
    fetch('/data/market.json').then(r=>r.json()).then(setData).catch(()=>{})

    // YOUR ticker - updates every 1 second from YOUR Vercel API
    const loadTicker = async () => {
      try {
        const r = await fetch('/api/ticker');
        const d = await r.json();
        if (d.nifty) {
          setTicker({ nifty: d.nifty, sensex: d.sensex });
        }
      } catch(e){ console.log("ticker fail", e) }
    }

    loadTicker();
    const id = setInterval(loadTicker, 1000); // every 1 second
    return () => clearInterval(id)
  }, [])

  const formatPrice = (t) => {
    if (!t) return '--';
    return `${t.price.toFixed(2)} ${t.change >= 0? '▲' : '▼'} ${Math.abs(t.change).toFixed(2)} (${t.changePercent.toFixed(2)}%)`;
  }

  return (
    <div style={{maxWidth:420, margin:'auto', padding:12, paddingBottom:80, fontFamily:'system-ui'}}>

      {/* YOUR TICKER */}
      <div style={{
        background:'#111',
        color:'#fff',
        padding:'8px 12px',
        borderRadius:10,
        marginBottom:12,
        fontSize:13,
        fontWeight:600,
        display:'flex',
        justifyContent:'space-between'
      }}>
        <span style={{color: ticker.nifty?.change >=0? '#4caf50' : '#ef5350'}}>
          NIFTY {ticker.nifty? formatPrice(ticker.nifty) : '--'}
        </span>
        <span style={{color: ticker.sensex?.change >=0? '#4caf50' : '#ef5350'}}>
          SENSEX {ticker.sensex? ticker.sensex.price.toFixed(2) : '--'}
        </span>
      </div>

      <h2 style={{fontSize:22, lineHeight:1.3}}>{data?.headline || "Loading..."}</h2>

      {tab==='now' && <>
        <h4>Why</h4>
        <ul>{data?.why?.map((w,i)=><li key={i}>{w}</li>)}</ul>
        <h4>What Happening</h4>
        <ul>{data?.whatHappening?.map((w,i)=><li key={i}>{w}</li>)}</ul>
      </>}

      {tab==='next' && <>
        <h4>Stocks In News</h4>
        {data?.stocksInNews?.map((s,i)=>
          <div key={i} style={{padding:8,background:'#fff',margin:'6px 0',borderRadius:8, border:'1px solid #eee'}}>
            {s.symbol} - {s.sentiment} - {s.sources}
          </div>
        )}
      </>}

      <div style={{position:'fixed', bottom:0, left:0, right:0, display:'flex', borderTop:'1px solid #ccc', background:'#fff', maxWidth:420, margin:'0 auto'}}>
        <button style={{flex:1, padding:16, border:'none', background: tab==='now'?'#111':'#fff', color: tab==='now'?'#fff':'#000'}} onClick={()=>setTab('now')}>Right Now</button>
        <button style={{flex:1, padding:16, border:'none', background: tab==='next'?'#111':'#fff', color: tab==='next'?'#fff':'#000'}} onClick={()=>setTab('next')}>Whats Next</button>
      </div>
    </div>
  )
}