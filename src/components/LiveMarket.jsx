import { useEffect } from "react";

export default function LiveMarket() {
  useEffect(() => {
    // Ticker Tape
    const tickerScript = document.createElement("script");
    tickerScript.src = "https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js";
    tickerScript.async = true;
    tickerScript.innerHTML = JSON.stringify({
      symbols: [
        { proName: "NSE:NIFTY", title: "NIFTY 50" },
        { proName: "BSE:SENSEX", title: "SENSEX" },
        { proName: "NSE:BANKNIFTY", title: "BANK NIFTY" },
        { proName: "NSE:RELIANCE", title: "RELIANCE" },
        { proName: "NSE:TCS", title: "TCS" },
        { proName: "NSE:INFY", title: "INFY" },
      ],
      showSymbolLogo: true,
      colorTheme: "dark",
      isTransparent: true,
      displayMode: "adaptive",
      locale: "in"
    });
    const tickerContainer = document.getElementById("ticker-tape");
    if (tickerContainer) {
      tickerContainer.innerHTML = "";
      tickerContainer.appendChild(tickerScript);
    }

    // NIFTY Chart
    const niftyScript = document.createElement("script");
    niftyScript.src = "https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js";
    niftyScript.async = true;
    niftyScript.innerHTML = JSON.stringify({
      symbol: "NSE:NIFTY",
      width: "100%",
      height: "220",
      locale: "in",
      dateRange: "1D",
      colorTheme: "dark",
      isTransparent: true,
      autosize: false,
    });
    const niftyContainer = document.getElementById("nifty-widget");
    if (niftyContainer) {
      niftyContainer.innerHTML = "";
      niftyContainer.appendChild(niftyScript);
    }

    // SENSEX Chart
    const sensexScript = document.createElement("script");
    sensexScript.src = "https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js";
    sensexScript.async = true;
    sensexScript.innerHTML = JSON.stringify({
      symbol: "BSE:SENSEX",
      width: "100%",
      height: "220",
      locale: "in",
      dateRange: "1D",
      colorTheme: "dark",
      isTransparent: true,
      autosize: false,
    });
    const sensexContainer = document.getElementById("sensex-widget");
    if (sensexContainer) {
      sensexContainer.innerHTML = "";
      sensexContainer.appendChild(sensexScript);
    }

  }, []);

  return (
    <div className="w-full space-y-4">
      {/* Top scrolling tape */}
      <div id="ticker-tape" className="tradingview-widget-container"></div>

      {/* NIFTY + SENSEX cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-zinc-900 rounded-xl p-2 border border-zinc-800">
          <div id="nifty-widget"></div>
        </div>
        <div className="bg-zinc-900 rounded-xl p-2 border border-zinc-800">
          <div id="sensex-widget"></div>
        </div>
      </div>
    </div>
  );
}