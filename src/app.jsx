import { useState, useEffect, useRef } from "react";

const PAIRS = [
  { symbol: "EUR/USD", price: 1.08542, change: +0.0023, pct: +0.21 },
  { symbol: "GBP/USD", price: 1.27381, change: -0.0041, pct: -0.32 },
  { symbol: "USD/JPY", price: 149.872, change: +0.342, pct: +0.23 },
  { symbol: "AUD/USD", price: 0.65124, change: -0.0018, pct: -0.27 },
  { symbol: "USD/CHF", price: 0.89734, change: +0.0012, pct: +0.13 },
  { symbol: "XAU/USD", price: 2341.5, change: +8.3, pct: +0.36 },
];

function generateCandles(base, count = 60) {
  let price = base;
  return Array.from({ length: count }, (_, i) => {
    const open = price;
    const move = (Math.random() - 0.48) * base * 0.003;
    const close = open + move;
    const high = Math.max(open, close) + Math.random() * base * 0.001;
    const low = Math.min(open, close) - Math.random() * base * 0.001;
    price = close;
    return { open, close, high, low, index: i };
  });
}

function CandleChart({ pair, width, height }) {
  const candles = useRef(generateCandles(pair.price));
  const [tick, setTick] = useState(0);

  useEffect(() => {
    candles.current = generateCandles(pair.price);
  }, [pair.symbol]);

  useEffect(() => {
    const id = setInterval(() => {
      const last = candles.current[candles.current.length - 1];
      const move = (Math.random() - 0.48) * last.close * 0.002;
      const newClose = last.close + move;
      candles.current[candles.current.length - 1] = {
        ...last,
        close: newClose,
        high: Math.max(last.high, newClose),
        low: Math.min(last.low, newClose),
      };
      setTick(t => t + 1);
    }, 900);
    return () => clearInterval(id);
  }, []);

  const data = candles.current;
  const visible = data.slice(-40);
  const prices = visible.flatMap(c => [c.high, c.low]);
  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);
  const range = maxP - minP || 1;
  const pad = { top: 12, bottom: 24, left: 4, right: 58 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;
  const cw = chartW / visible.length;
  const py = p => pad.top + chartH - ((p - minP) / range) * chartH;
  const px = i => pad.left + i * cw + cw / 2;
  const gridLines = 4;
  const isJPY = pair.symbol.includes("JPY");
  const isXAU = pair.symbol.includes("XAU");
  const dec = isJPY ? 3 : isXAU ? 2 : 5;

  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <defs>
        <clipPath id="cc">
          <rect x={pad.left} y={pad.top} width={chartW} height={chartH} />
        </clipPath>
      </defs>
      {Array.from({ length: gridLines }, (_, i) => {
        const y = pad.top + (i / (gridLines - 1)) * chartH;
        const val = maxP - (i / (gridLines - 1)) * range;
        return (
          <g key={i}>
            <line x1={pad.left} y1={y} x2={pad.left + chartW} y2={y}
              stroke="#1a2a3a" strokeWidth="1" strokeDasharray="3,4" />
            <text x={pad.left + chartW + 3} y={y + 3.5} fill="#3a5570"
              fontSize="8" fontFamily="monospace">
              {val.toFixed(dec)}
            </text>
          </g>
        );
      })}
      <g clipPath="url(#cc)">
        {visible.map((c, i) => {
          const bull = c.close >= c.open;
          const color = bull ? "#00e5a0" : "#ff4e6a";
          const bodyTop = py(Math.max(c.open, c.close));
          const bodyBot = py(Math.min(c.open, c.close));
          const bodyH = Math.max(1, bodyBot - bodyTop);
          return (
            <g key={i}>
              <line x1={px(i)} y1={py(c.high)} x2={px(i)} y2={py(c.low)}
                stroke={color} strokeWidth="0.8" opacity="0.7" />
              <rect x={px(i) - cw * 0.35} y={bodyTop} width={cw * 0.7}
                height={bodyH} fill={bull ? color : "transparent"}
                stroke={color} strokeWidth="0.8" opacity="0.9" />
            </g>
          );
        })}
      </g>
      {(() => {
        const last = visible[visible.length - 1];
        const y = py(last.close);
        return (
          <g>
            <line x1={pad.left} y1={y} x2={pad.left + chartW} y2={y}
              stroke="#f0c040" strokeWidth="0.8" strokeDasharray="3,3" opacity="0.7" />
            <rect x={pad.left + chartW} y={y - 8} width={56} height={16} rx="3" fill="#f0c040" />
            <text x={pad.left + chartW + 28} y={y + 4} fill="#050c18"
              fontSize="8.5" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
              {last.close.toFixed(dec)}
            </text>
          </g>
        );
      })()}
    </svg>
  );
}

export default function App() {
  const [selectedPair, setSelectedPair] = useState(PAIRS[0]);
  const [side, setSide] = useState("buy");
  const [lots, setLots] = useState("0.10");
  const [tp, setTp] = useState("");
  const [sl, setSl] = useState("");
  const [balance, setBalance] = useState(10000);
  const [equity, setEquity] = useState(10000);
  const [positions, setPositions] = useState([]);
  const [prices, setPrices] = useState(PAIRS.map(p => ({ ...p })));
  const [notification, setNotification] = useState(null);
  const [activeScreen, setActiveScreen] = useState("chart");

  useEffect(() => {
    const id = setInterval(() => {
      setPrices(prev => prev.map(p => {
        const move = (Math.random() - 0.49) * p.price * 0.0003;
        const newPrice = p.price + move;
        const newChange = p.change + move;
        return { ...p, price: newPrice, change: newChange, pct: (newChange / p.price) * 100 };
      }));
    }, 1200);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const found = prices.find(p => p.symbol === selectedPair.symbol);
    if (found) setSelectedPair(found);
  }, [prices]);

  useEffect(() => {
    const pnl = positions.reduce((acc, pos) => {
      const current = prices.find(p => p.symbol === pos.symbol)?.price || pos.openPrice;
      const diff = pos.side === "buy" ? current - pos.openPrice : pos.openPrice - current;
      return acc + diff * pos.lots * 100000 * (pos.symbol.includes("XAU") ? 0.01 : 1);
    }, 0);
    setEquity(balance + pnl);
  }, [prices, positions, balance]);

  const showNotif = (msg, type = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 2800);
  };

  const currentPair = prices.find(p => p.symbol === selectedPair.symbol) || selectedPair;
  const isJPY = currentPair.symbol.includes("JPY");
  const isXAU = currentPair.symbol.includes("XAU");
  const dec = isJPY ? 3 : isXAU ? 2 : 5;
  const spread = currentPair.price * 0.0002;
  const ask = currentPair.price + spread / 2;
  const bid = currentPair.price - spread / 2;

  const placeOrder = () => {
    const lotNum = parseFloat(lots);
    if (!lotNum || lotNum <= 0) return;
    const pos = {
      id: Date.now(),
      symbol: currentPair.symbol,
      side,
      lots: lotNum,
      openPrice: currentPair.price,
      tp: tp ? parseFloat(tp) : null,
      sl: sl ? parseFloat(sl) : null,
      time: new Date().toLocaleTimeString(),
    };
    setPositions(prev => [...prev, pos]);
    showNotif(`${side.toUpperCase()} ${lotNum} lots ${currentPair.symbol}`);
    setActiveScreen("positions");
  };

  const closePosition = (id) => {
    const pos = positions.find(p => p.id === id);
    const current = prices.find(p => p.symbol === pos.symbol)?.price || pos.openPrice;
    const diff = pos.side === "buy" ? current - pos.openPrice : pos.openPrice - current;
    const pnl = diff * pos.lots * 100000 * (pos.symbol.includes("XAU") ? 0.01 : 1);
    setBalance(b => b + pnl);
    setPositions(prev => prev.filter(p => p.id !== id));
    showNotif(`Fermé | P&L: ${pnl >= 0 ? "+" : ""}${pnl.toFixed(2)} $`, pnl >= 0 ? "success" : "error");
  };

  const pnlTotal = equity - balance;

  return (
    <div style={{ fontFamily: "'DM Mono', 'Courier New', monospace", background: "#060d18", color: "#c8d8e8", height: "100dvh", display: "flex", flexDirection: "column", overflow: "hidden", maxWidth: 480, margin: "0 auto" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
        body { background: #060d18; }
        input, select { outline: none; }
        button { cursor: pointer; border: none; }
        @keyframes slideDown { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
      `}</style>

      {notification && (
        <div style={{ position: "fixed", top: 60, left: "50%", transform: "translateX(-50%)", zIndex: 999, whiteSpace: "nowrap", background: notification.type === "success" ? "rgba(0,229,160,0.15)" : "rgba(255,78,106,0.15)", border: `1px solid ${notification.type === "success" ? "#00e5a0" : "#ff4e6a"}`, borderRadius: 8, padding: "8px 16px", fontSize: 11, color: notification.type === "success" ? "#00e5a0" : "#ff4e6a", backdropFilter: "blur(12px)", animation: "slideDown 0.2s ease" }}>{notification.msg}</div>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", background: "#080f1e", borderBottom: "1px solid #0f2035", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: "linear-gradient(135deg, #00e5a0, #0090ff)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#060d18", fontFamily: "sans-serif" }}>FX</div>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#e8f2ff", fontFamily: "sans-serif" }}>NEXUS TRADE</span>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 9, color: "#3a5570" }}>ÉQUITÉ</div>
          <div style={{ fontSize: 14, color: equity >= balance ? "#00e5a0" : "#ff4e6a", fontWeight: 500 }}>${equity.toFixed(2)}</div>
        </div>
      </div>

      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {activeScreen === "chart" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", animation: "fadeIn 0.2s ease" }}>
            <div style={{ display: "flex", overflowX: "auto", padding: "8px 12px", gap: 6, borderBottom: "1px solid #0f2035", flexShrink: 0 }}>
              {prices.map(p => (
                <button key={p.symbol} onClick={() => setSelectedPair(p)} style={{ padding: "5px 10px", borderRadius: 6, flexShrink: 0, background: selectedPair.symbol === p.symbol ? "#0d2540" : "#0a1220", border: `1px solid ${selectedPair.symbol === p.symbol ? "#1a4070" : "#0f2035"}`, color: selectedPair.symbol === p.symbol ? "#e8f2ff" : "#4a6080", fontSize: 10 }}>
                  <div>{p.symbol}</div>
                  <div style={{ color: p.pct >= 0 ? "#00e5a0" : "#ff4e6a", fontSize: 9, marginTop: 1 }}>{p.pct >= 0 ? "+" : ""}{p.pct.toFixed(2)}%</div>
                </button>
              ))}
            </div>
            <div style={{ padding: "10px 16px", borderBottom: "1px solid #0f2035", flexShrink: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span style={{ fontSize: 13, color: "#6080a0" }}>{currentPair.symbol}</span>
                  <div style={{ fontSize: 26, color: currentPair.change >= 0 ? "#00e5a0" : "#ff4e6a", fontWeight: 500 }}>{currentPair.price.toFixed(dec)}</div>
                </div>
                <div style={{ textAlign: "right", fontSize: 10 }}>
                  <div style={{ color: "#3a5570", marginBottom: 2 }}>BID / ASK</div>
                  <div><span style={{ color: "#ff4e6a" }}>{bid.toFixed(dec)}</span> <span style={{ color: "#3a5570" }}>/</span> <span style={{ color: "#00e5a0" }}>{ask.toFixed(dec)}</span></div>
                  <div style={{ color: "#f0c040", marginTop: 2 }}>Spread: {(spread * 10000).toFixed(1)} pts</div>
                </div>
              </div>
            </div>
            <div style={{ flex: 1, background: "#070d1a", minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CandleChart pair={currentPair} width={Math.min(window.innerWidth, 480)} height={220} />
            </div>
            <div style={{ padding: "10px 14px", display: "flex", gap: 8, borderTop: "1px solid #0f2035", flexShrink: 0 }}>
              <button onClick={() => { setSide("buy"); setActiveScreen("trade"); }} style={{ flex: 1, padding: "12px 0", borderRadius: 8, background: "linear-gradient(135deg, #00e5a0, #00b87a)", color: "#050c18", fontSize: 13, fontWeight: 700, fontFamily: "sans-serif" }}>▲ ACHETER</button>
              <button onClick={() => { setSide("sell"); setActiveScreen("trade"); }} style={{ flex: 1, padding: "12px 0", borderRadius: 8, background: "linear-gradient(135deg, #ff4e6a, #cc2244)", color: "#fff", fontSize: 13, fontWeight: 700, fontFamily: "sans-serif" }}>▼ VENDRE</button>
            </div>
          </div>
        )}

        {activeScreen === "trade" && (
          <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px", animation: "fadeIn 0.2s ease" }}>
            <div style={{ marginBottom: 14, fontSize: 13, color: "#6080a0" }}>Passer un ordre — <span style={{ color: "#e8f2ff" }}>{currentPair.symbol}</span></div>
            <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", border: "1px solid #0f2035", marginBottom: 14 }}>
              {["buy", "sell"].map(s => (
                <button key={s} onClick={() => setSide(s)} style={{ flex: 1, padding: "12px 0", fontSize: 12, fontWeight: 600, background: side === s ? (s === "buy" ? "rgba(0,229,160,0.2)" : "rgba(255,78,106,0.2)") : "transparent", color: side === s ? (s === "buy" ? "#00e5a0" : "#ff4e6a") : "#4a6080", fontFamily: "'DM Mono', monospace" }}>
                  {s === "buy" ? "▲ ACHAT" : "▼ VENTE"}
                </button>
              ))}
            </div>
            <div style={{ background: "#0a1220", borderRadius: 8, padding: "10px 14px", border: "1px solid #0f2035", marginBottom: 14, display: "flex", justifyContent: "space-between" }}>
              <div style={{ textAlign: "center" }}><div style={{ fontSize: 9, color: "#ff4e6a", marginBottom: 4 }}>VENTE</div><div style={{ fontSize: 16, color: "#ff4e6a" }}>{bid.toFixed(dec)}</div></div>
              <div style={{ textAlign: "center" }}><div style={{ fontSize: 9, color: "#f0c040", marginBottom: 4 }}>SPREAD</div><div style={{ fontSize: 14, color: "#f0c040" }}>{(spread * 10000).toFixed(1)}</div></div>
              <div style={{ textAlign: "center" }}><div style={{ fontSize: 9, color: "#00e5a0", marginBottom: 4 }}>ACHAT</div><div style={{ fontSize: 16, color: "#00e5a0" }}>{ask.toFixed(dec)}</div></div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 9, color: "#4a6080", marginBottom: 6 }}>VOLUME (LOTS)</div>
              <div style={{ display: "flex" }}>
                <button onClick={() => setLots(l => Math.max(0.01, parseFloat(l) - 0.01).toFixed(2))} style={{ background: "#0d2540", color: "#7ab8f0", border: "1px solid #1a4070", borderRadius: "6px 0 0 6px", padding: "10px 16px", fontSize: 18 }}>−</button>
                <input value={lots} onChange={e => setLots(e.target.value)} style={{ flex: 1, background: "#060d18", border: "1px solid #0f2035", borderLeft: 0, borderRight: 0, color: "#e8f2ff", textAlign: "center", fontSize: 16, fontFamily: "'DM Mono', monospace" }} />
                <button onClick={() => setLots(l => (parseFloat(l) + 0.01).toFixed(2))} style={{ background: "#0d2540", color: "#7ab8f0", border: "1px solid #1a4070", borderRadius: "0 6px 6px 0", padding: "10px 16px", fontSize: 18 }}>+</button>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
              {[{ label: "TAKE PROFIT", val: tp, set: setTp, color: "#00e5a0" }, { label: "STOP LOSS", val: sl, set: setSl, color: "#ff4e6a" }].map(({ label, val, set, color }) => (
                <div key={label} style={{ flex: 1 }}>
                  <div style={{ fontSize: 8, color: "#4a6080", marginBottom: 5 }}>{label}</div>
                  <input value={val} onChange={e => set(e.target.value)} placeholder="Optionnel" style={{ width: "100%", background: "#060d18", border: `1px solid ${val ? color + "55" : "#0f2035"}`, color: val ? color : "#6080a0", padding: "9px 10px", borderRadius: 6, fontSize: 12, fontFamily: "'DM Mono', monospace", textAlign: "center" }} />
                </div>
              ))}
            </div>
            <button onClick={placeOrder} style={{ width: "100%", padding: "14px 0", borderRadius: 10, background: side === "buy" ? "linear-gradient(135deg, #00e5a0, #00b87a)" : "linear-gradient(135deg, #ff4e6a, #cc2244)", color: side === "buy" ? "#050c18" : "#fff", fontSize: 15, fontWeight: 700, fontFamily: "sans-serif" }}>
              {side === "buy" ? "▲ CONFIRMER L'ACHAT" : "▼ CONFIRMER LA VENTE"}
            </button>
          </div>
        )}

        {activeScreen === "positions" && (
          <div style={{ flex: 1, overflowY: "auto", animation: "fadeIn 0.2s ease" }}>
            <div style={{ display: "flex", padding: "10px 14px", gap: 8, borderBottom: "1px solid #0f2035" }}>
              {[{ label: "Solde", val: `$${balance.toFixed(2)}`, color: "#e8f2ff" }, { label: "P&L", val: `${pnlTotal >= 0 ? "+" : ""}$${pnlTotal.toFixed(2)}`, color: pnlTotal >= 0 ? "#00e5a0" : "#ff4e6a" }, { label: "Positions", val: positions.length, color: "#7ab8f0" }].map(({ label, val, color }) => (
                <div key={label} style={{ flex: 1, background: "#0a1220", borderRadius: 8, padding: "8px 10px", border: "1px solid #0f2035", textAlign: "center" }}>
                  <div style={{ fontSize: 8, color: "#3a5570", marginBottom: 3 }}>{label}</div>
                  <div style={{ fontSize: 13, color, fontWeight: 500 }}>{val}</div>
                </div>
              ))}
            </div>
            {positions.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px", color: "#2a4060" }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>📊</div>
                <div style={{ fontSize: 13 }}>Aucune position ouverte</div>
                <button onClick={() => setActiveScreen("chart")} style={{ marginTop: 16, padding: "10px 22px", borderRadius: 8, background: "#0d2540", color: "#7ab8f0", border: "1px solid #1a4070", fontSize: 12 }}>Commencer à trader</button>
              </div>
            ) : positions.map(pos => {
              const cur = prices.find(p => p.symbol === pos.symbol)?.price || pos.openPrice;
              const diff = pos.side === "buy" ? cur - pos.openPrice : pos.openPrice - cur;
              const pnl = diff * pos.lots * 100000 * (pos.symbol.includes("XAU") ? 0.01 : 1);
              const d = pos.symbol.includes("JPY") ? 3 : pos.symbol.includes("XAU") ? 2 : 5;
              return (
                <div key={pos.id} style={{ margin: "10px 12px", background: "#0a1220", borderRadius: 10, border: "1px solid #0f2035" }}>
                  <div style={{ padding: "10px 14px", display: "flex", justifyContent: "space-between", borderBottom: "1px solid #0f2035" }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 600, background: pos.side === "buy" ? "rgba(0,229,160,0.15)" : "rgba(255,78,106,0.15)", color: pos.side === "buy" ? "#00e5a0" : "#ff4e6a" }}>{pos.side.toUpperCase()}</span>
                      <span style={{ color: "#e8f2ff", fontSize: 13 }}>{pos.symbol}</span>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: pnl >= 0 ? "#00e5a0"
