import { useEffect, useState } from 'react'

export default function App() {
  const [tab, setTab] = useState('now')
  const [data, setData] = useState(null)
  const [ticker, setTicker] = useState({ nifty: null, sensex: null })

  useEffect(() => {
    fetch(`/data/market.json?t=${Date.now()}`)
     .then(r => r.json())
     .then(setData)
     .catch(() => {})

    const loadTicker = async () => {
      try {
        const r = await fetch('/api/ticker', { cache: 'no-store' })
        const d = await r.json()
        if (d.nifty) setTicker({ nifty: d.nifty, sensex: d.sensex })
      } catch (e) {
        console.log("ticker fail", e)
      }
    }

    loadTicker()
    const id = setInterval(loadTicker, 1000)
    return () => clearInterval(id)
  }, [])

  const formatPrice = (t) => {
    if (!t) return '--'
    const arrow = t.change >= 0? '▲' : '▼'
    return `${t.price.toFixed(2)} ${arrow} ${Math.abs(t.change).toFixed(2)} (${Math.abs(t.changePercent).toFixed(2)}%)`
  }

  return (
    <div style={{
      maxWidth: 420,
      margin: '0 auto',
      padding: 12,
      paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
      fontFamily: 'system-ui',
      background: '#f6f6f6',
      minHeight: '100vh'
    }}>

      {/* YOUR TICKER - 1 sec */}
      <div style={{
        background: '#111',
        color: '#fff',
        padding: '10px 12px',
        borderRadius: 12,
        marginBottom: 12,
        fontSize: 12.5,
        fontWeight: 700,
        display: 'flex',
        justifyContent: 'space-between'
      }}>
        <span style={{ color: ticker.nifty?.change >= 0? '#4caf50' : '#ef5350' }}>
          NIFTY {ticker.nifty? formatPrice(ticker.nifty) : '...'}
        </span>
        <span style={{ color: ticker.sensex?.change >= 0? '#4caf50' : '#ef5350' }}>
          SENSEX {ticker.sensex? formatPrice(ticker.sensex) : '...'}
        </span>
      </div>

      {/* Headline */}
      <div style={{ background: '#111', color: '#fff', padding: 16, borderRadius: 16, marginBottom: 12 }}>
        <div style={{ fontSize: 10, opacity: 0.6, letterSpacing: 1, marginBottom: 6 }}>
          {data?.updatedAt? new Date(data.updatedAt).toLocaleString('en-IN') : 'LIVE'} • MARKETBUZZ
        </div>
        <h2 style={{ margin: 0, fontSize: 21, lineHeight: 1.3, fontWeight: 800 }}>
          {data?.headline || "Loading market pulse..."}
        </h2>
      </div>

      {tab === 'now' && (
        <>
          <div style={{ background: '#fff', padding: 14, borderRadius: 14, marginBottom: 10, border: '1px solid #eee' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: 14 }}>Why is market like this?</h4>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, lineHeight: 1.6, color: '#333' }}>
              {data?.why?.map((w, i) => <li key={i} style={{ marginBottom: 4 }}>{w}</li>) || <li>Loading...</li>}
            </ul>
          </div>
          <div style={{ background: '#fff', padding: 14, borderRadius: 14, marginBottom: 10, border: '1px solid #eee' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: 14 }}>What is Happening</h4>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, lineHeight: 1.6, color: '#333' }}>
              {data?.whatHappening?.map((w, i) => <li key={i} style={{ marginBottom: 4 }}>{w}</li>) || <li>Tracking live news...</li>}
            </ul>
          </div>
        </>
      )}

      {tab === 'next' && (
        <div style={{ background: '#fff', padding: 14, borderRadius: 14, border: '1px solid #eee' }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: 14 }}>Stocks In News</h4>
          {data?.stocksInNews?.map((s, i) =>
            <div key={i} style={{
              padding: 12,
              background: s.sentiment === 'Positive'? '#e8f5e9' : s.sentiment === 'Negative'? '#ffebee' : '#f5f5f5',
              margin: '8px 0',
              borderRadius: 10,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderLeft: `4px solid ${s.sentiment === 'Positive'? '#2e7d32' : s.sentiment === 'Negative'? '#c62828' : '#999'}`
            }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 13 }}>{s.symbol}</div>
                <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>{s.sources}</div>
              </div>
              <div style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '4px 8px',
                borderRadius: 20,
                background: s.sentiment === 'Positive'? '#2e7d32' : s.sentiment === 'Negative'? '#c62828' : '#616161',
                color: '#fff'
              }}>
                {s.sentiment}
              </div>
            </div>
          ) || <div style={{ fontSize: 13, color: '#777' }}>Loading stocks...</div>}
        </div>
      )}

      {/* Bottom Nav */}
      <div style={{
        position: 'fixed',
        bottom: 'env(safe-area-inset-bottom, 0px)',
        left: 0,
        right: 0,
        display: 'flex',
        borderTop: '1px solid #e0e0e0',
        background: '#fff',
        maxWidth: 420,
        margin: '0 auto',
        zIndex: 10
      }}>
        <button style={{ flex: 1, padding: 16, border: 'none', background: tab === 'now'? '#111' : '#fff', color: tab === 'now'? '#fff' : '#000', fontWeight: 700, fontSize: 14 }} onClick={() => setTab('now')}>Right Now</button>
        <button style={{ flex: 1, padding: 16, border: 'none', background: tab === 'next'? '#111' : '#fff', color: tab === 'next'? '#fff' : '#000', fontWeight: 700, fontSize: 14 }} onClick={() => setTab('next')}>Whats Next</button>
      </div>
    </div>
  )
}