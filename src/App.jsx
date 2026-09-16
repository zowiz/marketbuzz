import { useEffect, useState } from 'react'

export default function App() {
  const [tab, setTab] = useState('now')
  const [data, setData] = useState(null)

  useEffect(() => {
    fetch('/data/market.json')
      .then(r => r.json())
      .then(setData)
      .catch(() => {})

    // --- TradingView Ticker Tape (Live NIFTY/SENSEX) ---
    const addTradingViewTicker = () => {
      const container = document.getElementById("tradingview-ticker");
      if (!container) return;
      container.innerHTML = "";
      const script = document.createElement("script");
      script.src = "https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js";
      script.async = true;
      script.innerHTML = JSON.stringify({
        symbols: [
          { proName: "NSE:NIFTY", title: "NIFTY 50" },
          { proName: "BSE:SENSEX", title: "SENSEX" },
          { proName: "NSE:BANKNIFTY", title: "BANK NIFTY" },
          { proName: "NSE:RELIANCE", title: "RELIANCE" },
          { proName: "NSE:TCS", title: "TCS" },
          { proName: "NSE:INFY", title: "INFOSYS" },
        ],
        showSymbolLogo: true,
        colorTheme: "light",
        isTransparent: false,
        displayMode: "adaptive",
        locale: "in"
      });
      container.appendChild(script);
    };

    addTradingViewTicker();
  }, [])

  return (
    <div style={{maxWidth:420, margin:'auto', background:'#f6f6f6', minHeight:'100vh', paddingBottom:80}}>
      
      {/* LIVE TICKER - This never fails */}
      <div id="tradingview-ticker" className="tradingview-widget-container" style={{background:'#fff'}}></div>

      <div style={{padding:12}}>
        {/* Headline Card */}
        <div style={{background:'#111', color:'#fff', padding:16, borderRadius:16, marginBottom:12}}>
          <div style={{fontSize:11, opacity:0.6, letterSpacing:1, marginBottom:6}}>
            {data?.updatedAt ? new Date(data.updatedAt).toLocaleString('en-IN') : 'LIVE'} • MARKETBUZZ
          </div>
          <h2 style={{margin:0, fontSize:22, lineHeight:1.25, fontWeight:800}}>
            {data?.headline || "Markets loading live data..."}
          </h2>
          <div style={{marginTop:8, fontSize:12, opacity:0.7}}>
            {data?.summary || ""}
          </div>
        </div>

        {/* Tabs Content */}
        {tab === 'now' && (
          <>
            <div style={{background:'#fff', padding:14, borderRadius:14, marginBottom:10}}>
              <h4 style={{margin:'0 0 8px 0'}}>Why is market like this today?</h4>
              <ul style={{margin:0, paddingLeft:18, fontSize:14, lineHeight:1.6}}>
                {data?.why?.map((w,i)=><li key={i}>{w}</li>) || <li>Loading insights...</li>}
              </ul>
            </div>
            <div style={{background:'#fff', padding:14, borderRadius:14, marginBottom:10}}>
              <h4 style={{margin:'0 0 8px 0'}}>What is Happening</h4>
              <ul style={{margin:0, paddingLeft:18, fontSize:14, lineHeight:1.6}}>
                {data?.whatHappening?.map((w,i)=><li key={i}>{w}</li>) || <li>Tracking live news...</li>}
              </ul>
            </div>
          </>
        )}

        {tab === 'next' && (
          <div style={{background:'#fff', padding:14, borderRadius:14}}>
            <h4 style={{margin:'0 0 12px 0'}}>Stocks In News</h4>
            {data?.stocksInNews?.map((s,i)=>
              <div key={i} style={{
                padding:12, 
                background: s.sentiment === 'Positive' ? '#e8f5e9' : s.sentiment === 'Negative' ? '#ffebee' : '#f5f5f5',
                margin:'8px 0', 
                borderRadius:10,
                display:'flex',
                justifyContent:'space-between',
                alignItems:'center',
                borderLeft: `4px solid ${s.sentiment === 'Positive' ? '#2e7d32' : s.sentiment === 'Negative' ? '#c62828' : '#999'}`
              }}>
                <div>
                  <div style={{fontWeight:800, fontSize:14}}>{s.symbol}</div>
                  <div style={{fontSize:12, opacity:0.7}}>{s.sources}</div>
                </div>
                <div style={{
                  fontSize:12, 
                  fontWeight:700,
                  padding:'4px 8px',
                  borderRadius:20,
                  background: s.sentiment === 'Positive' ? '#2e7d32' : s.sentiment === 'Negative' ? '#c62828' : '#616161',
                  color:'#fff'
                }}>
                  {s.sentiment}
                </div>
              </div>
            ) || <div>Loading stocks...</div>}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div style={{position:'fixed', bottom:0, left:0, right:0, display:'flex', borderTop:'1px solid #e0e0e0', background:'#fff', maxWidth:420, margin:'0 auto'}}>
        <button 
          style={{flex:1, padding:16, border:'none', background: tab==='now' ? '#111' : '#fff', color: tab==='now' ? '#fff' : '#111', fontWeight:700}} 
          onClick={()=>setTab('now')}>
          Right Now
        </button>
        <button 
          style={{flex:1, padding:16, border:'none', background: tab==='next' ? '#111' : '#fff', color: tab==='next' ? '#fff' : '#111', fontWeight:700}} 
          onClick={()=>setTab('next')}>
          Whats Next
        </button>
      </div>
    </div>
  )
}