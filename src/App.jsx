import { useEffect, useState } from 'react'

export default function App() {
  const [tab, setTab] = useState('now')
  const [data, setData] = useState(null)
  const [ticker, setTicker] = useState({ nifty: null, sensex: null })

  useEffect(() => {
    fetch(`/data/market.json?t=${Date.now()}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})

    const loadTicker = async () => {
      try {
        const r = await fetch('/api/ticker', { cache: 'no-store' })
        const d = await r.json()
        if (d.nifty) setTicker({ nifty: d.nifty, sensex: d.sensex })
      } catch (e) {
        console.log('ticker fail', e)
      }
    }

    loadTicker()
    const id = setInterval(loadTicker, 15000)
    return () => clearInterval(id)
  }, [])

  const formatPrice = (t) => {
    if (!t) return '--'
    const arrow = t.change >= 0 ? '▲' : '▼'
    return `${t.price.toFixed(2)} ${arrow} ${Math.abs(t.change).toFixed(2)}`
  }

  return (
    <div
      style={{
        maxWidth: 420,
        margin: '0 auto',
        padding: 0,
        paddingBottom: 'calc(72px + env(safe-area-inset-bottom, 0px))',
        fontFamily: 'system-ui',
        minHeight: '100vh',
      }}
    >
      <div
        style={{
          padding: '10px 0',
          display: 'flex',
          margin: '0 10px',
          justifyContent: 'space-between',
        }}
      >
        <span>TickerHappy</span>
      </div>
      <div
        style={{
          padding: '10px 0',
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 12,
          margin: '0 10px',
        }}
      >
        <span style={{ color: ticker.nifty?.change >= 0 ? 'var(--bullish)' : 'var(--bearish)' }}>
          NIFTY {ticker.nifty ? formatPrice(ticker.nifty) : '...'}
        </span>
        <span style={{ color: ticker.sensex?.change >= 0 ? 'var(--bullish)' : 'var(--bearish)' }}>
          SENSEX {ticker.sensex ? formatPrice(ticker.sensex) : '...'}
        </span>
      </div>

      {tab === 'now' && (
        <>
          {/* MARKET STATUS BANNER */}
          {data?.marketStatus?.message && (
            <div
              style={{
                margin: '0 10px 15px 10px',
                padding: '12px 14px',
                borderRadius: 'var(--border-smooth)',
                background: '#EF5350',
                fontSize: 12,
                fontWeight: 600,
                lineHeight: 1.4,
              }}
            >
              
              {data.marketStatus.message}
              
            </div>
          )}

          <div
            style={{
              background: 'var(--bg-card)',
              color: 'var(--text-light)',
              padding: 16,
              border: '1px solid var(--card-border)',
              borderRadius: 'var(--border-smooth)',
              margin: '0 10px 30px 10px',
            }}
          >
            <div style={{ marginBottom: 30, fontSize: 10, opacity: 0.7 }}>
              Last updated: {data?.updatedAt ? new Date(data.updatedAt).toLocaleString('en-IN') : 'LIVE'}
              {data?.dateChecked && ` • ${data.dateChecked}`}
            </div>
            <h2 style={{ margin: 0, fontSize: 22, lineHeight: 1.3, fontWeight: 600 }}>
              {data?.headline || 'Loading market pulse...'}
            </h2>
          </div>

          <div style={{ margin: '0 10px 30px 10px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: 14, color: 'var(--accent)', fontWeight: 500 }}>FUNDAMENTAL DRIVER</h4>
            <ul>
              {data?.why?.map((w, i) => (
                <li key={i} style={{ marginBottom: 12, background: 'var(--bg-card)', padding: '16px 16px 16px 0', border: '1px solid var(--card-border)', borderRadius: 'var(--border-smooth)', display: 'flex', alignItems: 'center', gap: 12, overflow: 'hidden' }}>
                  <span style={{ width: 10, height: 10, borderRadius: '0 50% 50% 0', background: 'var(--accent)', display: 'inline-block', flexShrink: 0 }} />
                  <span style={{ lineHeight: 1.5, fontSize: 14 }}>{w}</span>
                </li>
              )) || <li>Loading...</li>}
            </ul>
          </div>

          <div style={{ margin: '0 10px 30px 10px' }}>
  <h4
    style={{
      margin: '0 0 12px 0',
      fontSize: 14,
      color: 'var(--accent)',
      fontWeight: 500,
    }}
  >
    MAIN HIGHLIGHTS
  </h4>

  <div
    style={{
      background: 'var(--bg-card)',
      borderRadius: 'var(--border-smooth)',
      padding: '4px 16px',
      border: '1px solid var(--card-border)',
    }}
  >
    {data?.whatHappening?.map((w, i) => (
      <div
        key={i}
        style={{
          display: 'flex',
          gap: 14,
          padding: '14px 0',
          borderBottom:
            i < data.whatHappening.length - 1
              ? '1px solid var(--card-border)'
              : 'none',
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--accent)',
            opacity: 0.8,
            minWidth: 20,
            paddingTop: 2,
          }}
        >
          {String(i + 1).padStart(2, '0')}
        </span>

        <span
          style={{
            lineHeight: 1.5,
            fontSize: 14,
          }}
        >
          {w}
        </span>
      </div>
    )) || (
      <div style={{ padding: '14px 0', fontSize: 13 }}>
        Tracking live news...
      </div>
    )}
  </div>
</div>

          <div style={{ margin: '0 10px 30px 10px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: 14, color: 'var(--accent)', fontWeight: 500 }}>TRENDING STOCKS</h4>
            {data?.stocksInNews?.map((s, i) => (
              <div key={i} style={{ padding: 12, margin: '8px 0', borderRadius: 'var(--border-smooth)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--card-border)', borderLeft: `4px solid ${s.sentiment === 'Positive' ? 'var(--positive)' : s.sentiment === 'Negative' ? 'var(--negative)' : 'var(--neutral)'}` }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 13 }}>{s.symbol}</div>
                  <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>{s.sources}</div>
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, padding: '4px 8px', borderRadius: 'var(--border-smooth)', background: s.sentiment === 'Positive' ? 'var(--positive)' : s.sentiment === 'Negative' ? 'var(--negative)' : 'var(--neutral-pill)', color: 'var(--text-light)' }}>
                  {s.sentiment}
                </div>
              </div>
            )) || <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Loading stocks...</div>}
          </div>
          <div style={{ padding: 14, textAlign: 'center', fontSize: 12 }}>Before you pull the trigger, check the ticker.</div>
        </>
      )}

      {tab === 'future' && <div><h2>Future predictions</h2></div>}
      {tab === 'stats' && <div><h2>Stats</h2></div>}
    </div>
  )
}