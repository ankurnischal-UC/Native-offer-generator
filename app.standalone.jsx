// UC Native Offer Asset Generator — main app
// Replicates the 5 promotional asset templates with live preview + 4x JPEG export.

const { useState, useMemo, useEffect, useRef, useCallback } = React;

// ─── Indian rupee comma formatter (e.g. 4299 → 4,299) ──────────────────
const INR = (n) => {
  if (n === null || n === undefined || isNaN(n)) return "0";
  const num = Math.round(Number(n));
  return num.toLocaleString("en-IN");
};

// ─── Product catalog ──────────────────────────────────────────────────
const PRODUCTS = ["M2 Pro", "M2", "M1 Pro", "M1", "M0", "Lock Pro", "Lock Ultra"];

// ─── Template definitions ─────────────────────────────────────────────
const TEMPLATES = [
  { id: "T1", label: "Bank + Merch + Exchange + Same-day", w: 360, h: 540, fields: ["bank", "merch", "exchange"] },
  { id: "T2", label: "Bank + Merch + Exchange",            w: 360, h: 540, fields: ["bank", "merch", "exchange"] },
  { id: "T3", label: "Bank + Merch + Same-day",            w: 360, h: 540, fields: ["bank", "merch"] },
  { id: "T4", label: "Bank + Merch",                       w: 360, h: 360, fields: ["bank", "merch"] },
  { id: "T5", label: "Only Bank offers",                   w: 360, h: 170, fields: ["bank"] },
];

// ─── Bank logo SVG components (recreated as original glyphs, not branded) ──
// We deliberately do NOT recreate copyrighted bank marks — we render
// neutral placeholders so the layout reads correctly. Users supply real
// bank-logo PNGs by dropping them into /assets/banks/ if needed.
const BankCircle = ({ children, bg = "#fff", offset = 0 }) => (
  <div style={{
    position: "absolute", left: offset, top: 0, width: 28, height: 28,
    borderRadius: "50%", background: bg, border: "1.5px solid #E2E2E2",
    display: "flex", alignItems: "center", justifyContent: "center",
    overflow: "hidden", fontFamily: "'Open Sauce One', sans-serif",
    fontWeight: 800, fontSize: 12, color: "#9b1c4d",
  }}>
    {children}
  </div>
);

// Bank registry — keyed logos, used by both the picker and the asset
const BANKS = [
  { id: "axis", name: "Axis Bank", src: window.__resources.bankAxis },
  { id: "hdfc", name: "HDFC Bank", src: window.__resources.bankHdfc },
  { id: "hsbc", name: "HSBC",      src: window.__resources.bankHsbc },
  { id: "yes",  name: "Yes Bank",  src: window.__resources.bankYes  },
];

// Render the row of selected bank logos. Width = 28 + 23*(n-1); each
// circle overlaps the previous by 5px to match the figma layout.
const BankRow = ({ selected }) => {
  const ids = (selected && selected.length) ? selected : BANKS.map(b => b.id);
  const list = BANKS.filter(b => ids.includes(b.id));
  const total = list.length;
  const width = total === 0 ? 0 : 28 + 23 * (total - 1);
  return (
    <div style={{ position: "relative", width, height: 28 }}>
      {list.map((b, i) => (
        <div key={b.id} style={{
          position: "absolute", left: 23 * i, top: 0, width: 28, height: 28,
          borderRadius: "50%", background: "#fff",
          border: "1.5px solid #E2E2E2", overflow: "hidden",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <img src={b.src} alt={b.name} draggable="false"
            style={{ width: 26, height: 26, objectFit: "contain", display: "block" }}/>
        </div>
      ))}
    </div>
  );
};

// Picker UI — multi-select grid of bank logos
const BankPicker = ({ selected, onChange }) => {
  const toggle = (id) => {
    const set = new Set(selected);
    if (set.has(id)) set.delete(id); else set.add(id);
    onChange(Array.from(set));
  };
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
      {BANKS.map(b => {
        const on = selected.includes(b.id);
        return (
          <button key={b.id} type="button" onClick={() => toggle(b.id)}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "8px 10px", borderRadius: 8, cursor: "pointer",
              background: on ? "#fff" : "#FAFAF8",
              border: "1.5px solid " + (on ? "#0F0F0F" : "#E5E5E2"),
              fontFamily: "inherit", fontSize: 12, fontWeight: 400,
              color: on ? "#0F0F0F" : "#9aa0a6", textAlign: "left",
              transition: "all .12s",
            }}>
            <img src={b.src} alt="" draggable="false"
              style={{ width: 22, height: 22, objectFit: "contain",
                       opacity: on ? 1 : 0.45 }}/>
            <span style={{ flex: 1 }}>{b.name}</span>
            <span style={{
              width: 14, height: 14, borderRadius: 4,
              border: "1.5px solid " + (on ? "#0F0F0F" : "#D0D0D0"),
              background: on ? "#0F0F0F" : "transparent",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {on && <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                <path d="M1 4 L 3.2 6 L 7 1.5" stroke="#fff" strokeWidth="1.6"
                  strokeLinecap="round" strokeLinejoin="round"/>
              </svg>}
            </span>
          </button>
        );
      })}
    </div>
  );
};

// ─── Decorative orange underline (from figma Vector 561) ───────────────
const Underline = ({ left, top, width = 90 }) => (
  <svg
    width={width} height={width * (8 / 70)}
    viewBox="0 0 70 8" fill="none"
    xmlns="http://www.w3.org/2000/svg"
    preserveAspectRatio="none"
    style={{ position: "absolute", left, top, pointerEvents: "none",
             width: width === "auto" ? "100%" : width }}
  >
    <path
      d="M69.122 1.97377C37.1705 -0.337584 13.5052 1.08577 0.077474 2.47836C8.35444 2.16031 26.937 2.68146 35.0515 7.31052"
      stroke="#F45A00" strokeWidth="1.5" fill="none"
    />
  </svg>
);

// ─── Iconography ──────────────────────────────────────────────────────
const ExchangeIcon = ({ size = 28 }) => (
  <img src={window.__resources.exchangeSmall} alt="" draggable="false"
    style={{ width: size, height: size, display: "block",
             userSelect: "none", pointerEvents: "none" }}/>
);

const BoltIcon = ({ size = 24 }) => (
  <img src={window.__resources.samedaySmall} alt="" draggable="false"
    style={{ width: size, height: size, display: "block",
             userSelect: "none", pointerEvents: "none" }}/>
);

const BoltIconLarge = () => (
  <svg width="60" height="60" viewBox="0 0 24 24" fill="none">
    <path d="M14 2 L 5 13 H 11 L 9 22 L 19 10 H 13 Z" fill="#05945B"/>
  </svg>
);

// Real merch artwork (supplied by user). Scale via outer container.
const ToteBagIllustration = ({ scale = 1 }) => (
  <img src={window.__resources.merch} alt="" draggable="false"
    style={{ width: 117 * scale, height: 145 * scale, display: "block",
             userSelect: "none", pointerEvents: "none" }}/>
);

// Old RO illustration (boxy appliance) — for exchange visual
const ROApplianceIllustration = ({ scale = 1 }) => (
  <svg width={88 * scale} height={108 * scale} viewBox="0 0 88 108" fill="none">
    <rect x="2" y="2" width="60" height="100" rx="3" fill="#404040"/>
    <rect x="2" y="10" width="60" height="58" fill="#757575" opacity="0.5"/>
    {/* spout */}
    <rect x="22" y="68" width="20" height="20" fill="#262626" rx="1"/>
    <path d="M28 76 L 36 76 L 36 88 L 28 88 Z" fill="#404040"/>
    <rect x="28" y="74" width="8" height="2" fill="#262626"/>
    {/* button */}
    <rect x="32" y="92" width="4" height="3" rx="0.5" fill="#757575"/>
  </svg>
);

// ─── Lightning trailing bg pattern (for same-day card in T1 large variant) ──
const SameDayPattern = () => (
  <svg viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice"
    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.35 }}>
    {[0,1,2,3].map(i => (
      <path key={i}
        d={`M${130-i*8} ${50+i*4} L ${100-i*8} ${100+i*4} L ${118-i*8} ${100+i*4} L ${108-i*8} ${150+i*4} L ${145-i*8} ${90+i*4} L ${127-i*8} ${90+i*4} Z`}
        fill="none" stroke="#05945B" strokeWidth="0.8" opacity={0.5 - i*0.1}
      />
    ))}
  </svg>
);

// ═══════════════════════════════════════════════════════════════════════
// CARD primitives — reusable building blocks of the templates
// ═══════════════════════════════════════════════════════════════════════

const BankCard = ({ totalBankOff, selectedBanks, w = 328, h = 92 }) => (
  <div style={{
    position: "relative", width: w, height: h,
    borderRadius: 8, background: "#262626", overflow: "hidden",
    boxSizing: "border-box",
  }}>
    <div style={{
      position: "absolute", left: 16, top: h === 66 ? 14 : 26,
      fontFamily: "'Open Sauce One', sans-serif", fontWeight: 600,
      fontSize: 16, lineHeight: 1.4, color: "#E2E2E2",
    }}>Extra ₹{INR(totalBankOff)} off</div>
    <div style={{
      position: "absolute", left: 16, top: h === 66 ? 38 : 50,
      fontFamily: "'Open Sauce One', sans-serif", fontSize: 12,
      lineHeight: "20px", color: "#AFAFAF",
    }}>with bank offers</div>
    <div style={{
      position: "absolute", right: 16, top: h === 66 ? 19 : 32,
    }}>
      <BankRow selected={selectedBanks} />
    </div>
  </div>
);

const MerchCard = ({ merchValue, w = 328, h = 137, illustrationScale = 1 }) => (
  <div style={{
    position: "relative", width: w, height: h,
    borderRadius: 8, background: "#262626", overflow: "hidden",
  }}>
    <div style={{
      position: "absolute", left: 16, top: 20, width: 174,
      fontFamily: "'Open Sauce One', sans-serif", fontWeight: 600,
      fontSize: 16, lineHeight: 1.4, color: "#E2E2E2",
    }}>
      Free bottle &amp; tote bag<br/>worth ₹{INR(merchValue)}
    </div>
    <div style={{
      position: "absolute", left: 16, top: 80,
      width: 91, height: 32, borderRadius: 6,
      border: "1.2px solid #545454", background: "transparent",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Open Sauce One', sans-serif", fontWeight: 400,
      fontSize: 12, color: "#fff",
    }}>Know more</div>
    <div style={{
      position: "absolute", right: 14, top: h === 142 ? 10 : (h === 137 ? 8 : 18),
    }}>
      <ToteBagIllustration scale={illustrationScale} />
    </div>
  </div>
);

const ExchangeCardSmall = ({ exchangeValue }) => (
  <div style={{
    position: "relative", width: 160, height: 166,
    borderRadius: 8, background: "#262626", overflow: "hidden",
  }}>
    <div style={{ position: "absolute", left: 16, top: 16 }}>
      <ExchangeIcon />
    </div>
    <div style={{
      position: "absolute", left: 16, top: 56, width: 128,
      fontFamily: "'Open Sauce One', sans-serif", fontWeight: 600,
      fontSize: 16, lineHeight: "24px", color: "#E2E2E2",
    }}>
      Get ₹{INR(exchangeValue)} off<br/>on old RO exchange
    </div>
  </div>
);

const SameDayCardSmall = () => (
  <div style={{
    position: "relative", width: 160, height: 166,
    borderRadius: 8, background: "#262626", overflow: "hidden",
  }}>
    <div style={{ position: "absolute", left: 16, top: 16 }}>
      <BoltIcon />
    </div>
    <div style={{
      position: "absolute", left: 16, top: 56, width: 128,
      fontFamily: "'Open Sauce One', sans-serif", fontWeight: 600,
      fontSize: 16, lineHeight: "24px", color: "#E2E2E2",
    }}>
      Free same-day delivery &amp; installation
    </div>
    <div style={{
      position: "absolute", left: 16, top: 132, width: 144,
      fontFamily: "'Open Sauce One', sans-serif", fontSize: 10,
      lineHeight: "14px", color: "#AFAFAF", whiteSpace: "nowrap",
    }}>Orders before 2:00 PM</div>
  </div>
);

const ExchangeCardWide = ({ exchangeValue }) => (
  <div style={{
    position: "relative", width: 328, height: 131,
    borderRadius: 8, background: "#262626", overflow: "hidden",
  }}>
    <div style={{
      position: "absolute", left: 16, top: 31, width: 200,
      fontFamily: "'Open Sauce One', sans-serif", fontWeight: 600,
      fontSize: 16, lineHeight: "24px", color: "#E2E2E2",
    }}>
      Get ₹{INR(exchangeValue)} off<br/>on old RO exchange
    </div>
    <div style={{ position: "absolute", right: 16, top: 29 }}>
      <img src={window.__resources.exchangeBig} alt="" draggable="false"
        style={{ width: 91, height: 73, display: "block",
                 userSelect: "none", pointerEvents: "none" }}/>
    </div>
  </div>
);

const SameDayCardWide = () => (
  <div style={{
    position: "relative", width: 328, height: 131,
    borderRadius: 8, background: "#262626", overflow: "hidden",
  }}>
    <img src={window.__resources.samedayBig} alt="" draggable="false"
      style={{ position: "absolute", right: 0, top: 0,
               height: "100%", width: "auto", display: "block",
               userSelect: "none", pointerEvents: "none" }}/>
    <div style={{
      position: "absolute", left: 16, top: 31, width: 180,
      fontFamily: "'Open Sauce One', sans-serif", fontWeight: 600,
      fontSize: 16, lineHeight: "24px", color: "#E2E2E2",
    }}>
      Free same-day delivery &amp; installation
    </div>
    <div style={{
      position: "absolute", left: 16, top: 86, width: 200,
      fontFamily: "'Open Sauce One', sans-serif", fontSize: 10,
      lineHeight: "14px", color: "#AFAFAF", whiteSpace: "nowrap",
    }}>Orders before 2:00 PM</div>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════
// HEADER (UC APP EXCLUSIVE + total benefits headline)
// ═══════════════════════════════════════════════════════════════════════
const AssetHeader = ({ totalBenefits }) => (
  <>
    <div style={{
      position: "absolute", left: 16, top: 24,
      fontFamily: "'Open Sauce One', sans-serif", fontWeight: 600,
      fontSize: 12, lineHeight: "16px", color: "#FF6F1A",
      letterSpacing: 0.2,
    }}>UC APP EXCLUSIVE</div>
    <div style={{
      position: "absolute", left: 16, top: 42, right: 16,
      fontFamily: "'Open Sauce One', sans-serif", fontWeight: 600,
      fontSize: 20, lineHeight: "28px", color: "#fff",
      whiteSpace: "nowrap",
    }}>
      <span style={{ position: "relative", display: "inline-block" }}>
        ₹{INR(totalBenefits)}
        <svg
          width="100%" height={8}
          viewBox="0 0 70 8" fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
          style={{ position: "absolute", left: 0, top: 24,
                   width: "100%", pointerEvents: "none" }}
        >
          <path
            d="M69.122 1.97377C37.1705 -0.337584 13.5052 1.08577 0.077474 2.47836C8.35444 2.16031 26.937 2.68146 35.0515 7.31052"
            stroke="#F45A00" strokeWidth="1.5" fill="none"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </span>
      {" "}worth of extra benefits
    </div>
  </>
);

// ═══════════════════════════════════════════════════════════════════════
// 5 TEMPLATES — pixel-faithful to the figma reference
// ═══════════════════════════════════════════════════════════════════════

const Frame = ({ w, h, children, frameRef }) => (
  <div ref={frameRef} className="asset-frame" style={{
    position: "relative", width: w, height: h,
    background: "#0F0F0F", overflow: "hidden",
  }}>
    {children}
  </div>
);

// T1: Bank + Merch + Exchange + Same-day — 360×540 (small exchange + same-day, side-by-side)
const Template1 = ({ totalBenefits, totalBankOff, merchValue, exchangeValue, selectedBanks, frameRef }) => (
  <Frame w={360} h={540} frameRef={frameRef}>
    <AssetHeader totalBenefits={totalBenefits} />
    <div style={{ position: "absolute", left: 16, top: 94 }}>
      <BankCard totalBankOff={totalBankOff} selectedBanks={selectedBanks} />
    </div>
    <div style={{ position: "absolute", left: 16, top: 194, width: 328, height: 137 }}>
      <MerchCard merchValue={merchValue} />
    </div>
    <div style={{ position: "absolute", left: 16, top: 339 }}>
      <ExchangeCardSmall exchangeValue={exchangeValue} />
    </div>
    <div style={{ position: "absolute", left: 184, top: 339 }}>
      <SameDayCardSmall />
    </div>
  </Frame>
);

// T2: Bank + Merch + Exchange — 360×540 (wide exchange card, no same-day)
const Template2 = ({ totalBenefits, totalBankOff, merchValue, exchangeValue, selectedBanks, frameRef }) => (
  <Frame w={360} h={540} frameRef={frameRef}>
    <AssetHeader totalBenefits={totalBenefits} />
    <div style={{ position: "absolute", left: 16, top: 94 }}>
      <BankCard totalBankOff={totalBankOff} selectedBanks={selectedBanks} />
    </div>
    <div style={{ position: "absolute", left: 16, top: 194, width: 328, height: 172 }}>
      <MerchCard merchValue={merchValue} h={172} />
    </div>
    <div style={{ position: "absolute", left: 16, top: 374 }}>
      <ExchangeCardWide exchangeValue={exchangeValue} />
    </div>
  </Frame>
);

// T3: Bank + Merch + Same-day — 360×540 (wide same-day card, no exchange)
const Template3 = ({ totalBenefits, totalBankOff, merchValue, selectedBanks, frameRef }) => (
  <Frame w={360} h={540} frameRef={frameRef}>
    <AssetHeader totalBenefits={totalBenefits} />
    <div style={{ position: "absolute", left: 16, top: 94 }}>
      <BankCard totalBankOff={totalBankOff} selectedBanks={selectedBanks} />
    </div>
    <div style={{ position: "absolute", left: 16, top: 194, width: 328, height: 172 }}>
      <MerchCard merchValue={merchValue} h={172} />
    </div>
    <div style={{ position: "absolute", left: 16, top: 374 }}>
      <SameDayCardWide />
    </div>
  </Frame>
);

// T4: Bank + Merch — 360×360
const Template4 = ({ totalBenefits, totalBankOff, merchValue, selectedBanks, frameRef }) => (
  <Frame w={360} h={360} frameRef={frameRef}>
    <AssetHeader totalBenefits={totalBenefits} />
    <div style={{ position: "absolute", left: 16, top: 94 }}>
      <BankCard totalBankOff={totalBankOff} selectedBanks={selectedBanks} />
    </div>
    <div style={{ position: "absolute", left: 16, top: 194, width: 328, height: 142 }}>
      <MerchCard merchValue={merchValue} h={142} illustrationScale={0.7} />
    </div>
  </Frame>
);

// T5: Only Bank — 360×170
const Template5 = ({ totalBenefits, totalBankOff, selectedBanks, frameRef }) => (
  <Frame w={360} h={170} frameRef={frameRef}>
    <AssetHeader totalBenefits={totalBenefits} />
    <div style={{ position: "absolute", left: 16, top: 86 }}>
      <BankCard totalBankOff={totalBankOff} selectedBanks={selectedBanks} h={66} />
    </div>
  </Frame>
);

// ═══════════════════════════════════════════════════════════════════════
// LEFT-PANEL: input form
// ═══════════════════════════════════════════════════════════════════════

const Field = ({ label, hint, children }) => (
  <label style={{ display: "block", marginBottom: 18 }}>
    <div style={{
      fontFamily: "'Open Sauce One', sans-serif", fontWeight: 400,
      fontSize: 13, color: "#262626", marginBottom: 6,
    }}>{label}</div>
    {children}
    {hint && <div style={{
      fontFamily: "'Open Sauce One', sans-serif", fontSize: 11,
      color: "#9aa0a6", marginTop: 4,
    }}>{hint}</div>}
  </label>
);

const TextInput = ({ value, onChange, placeholder, type = "text", prefix, suffix, disabled }) => (
  <div style={{
    position: "relative", display: "flex", alignItems: "center",
    background: disabled ? "#F4F4F4" : "#fff",
    border: "1.2px solid " + (disabled ? "#E5E5E5" : "#D0D0D0"),
    borderRadius: 6, height: 38, paddingLeft: prefix ? 28 : 12,
    paddingRight: suffix ? 28 : 12,
    transition: "border-color .12s",
  }}
  onFocus={(e) => e.currentTarget.style.borderColor = "#262626"}
  onBlur={(e) => e.currentTarget.style.borderColor = "#D0D0D0"}>
    {prefix && <span style={{
      position: "absolute", left: 12, color: "#545454",
      fontFamily: "'Open Sauce One', sans-serif", fontSize: 14,
    }}>{prefix}</span>}
    <input type={type} value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} disabled={disabled}
      style={{
        flex: 1, border: "none", outline: "none", height: "100%",
        background: "transparent", fontFamily: "'Open Sauce One', sans-serif",
        fontSize: 14, color: "#0F0F0F", width: "100%",
      }}/>
    {suffix && <span style={{
      position: "absolute", right: 12, color: "#545454",
      fontFamily: "'Open Sauce One', sans-serif", fontSize: 14,
    }}>{suffix}</span>}
  </div>
);

const Select = ({ value, onChange, options }) => (
  <div style={{ position: "relative" }}>
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{
        width: "100%", height: 38, padding: "0 36px 0 12px",
        background: "#fff", border: "1.2px solid #D0D0D0",
        borderRadius: 6, fontFamily: "'Open Sauce One', sans-serif",
        fontSize: 14, color: "#0F0F0F", appearance: "none",
        cursor: "pointer", outline: "none",
      }}>
      {options.map(o => <option key={o.value || o} value={o.value || o}>{o.label || o}</option>)}
    </select>
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      style={{ position: "absolute", right: 12, top: 12, pointerEvents: "none" }}>
      <path d="M6 9 L 12 15 L 18 9" stroke="#545454" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════════

const App = () => {
  const [product, setProduct] = useState("M2 Pro");
  const [sellingPrice, setSellingPrice] = useState("21999");
  const [combo, setCombo] = useState("T1");
  const [bankPct, setBankPct] = useState("7");
  const [bankCap, setBankCap] = useState("1500"); // ₹1500 default cap
  const [selectedBanks, setSelectedBanks] = useState(BANKS.map(b => b.id));
  const [merchValue, setMerchValue] = useState("1799");
  const [exchangeValue, setExchangeValue] = useState("1000");
  const [downloading, setDownloading] = useState(false);
  const [toast, setToast] = useState(null);

  const frameRef = useRef(null);
  const tpl = TEMPLATES.find(t => t.id === combo);

  // ─── Calculation engine ─────────────────────────────────────────────
  const calc = useMemo(() => {
    const sp = Math.max(0, Number(sellingPrice) || 0);
    const pct = Math.max(0, Number(bankPct) || 0);
    const capRaw = Number(bankCap);
    const cap = capRaw > 0 ? capRaw : Infinity;
    let bankOff = Math.round((sp * pct) / 100);
    if (cap > 0 && isFinite(cap)) bankOff = Math.min(bankOff, Math.round(cap));
    const m = tpl.fields.includes("merch")    ? (Number(merchValue) || 0)    : 0;
    const ex = tpl.fields.includes("exchange") ? (Number(exchangeValue) || 0) : 0;
    return {
      bankOff,
      merchValue: m,
      exchangeValue: ex,
      total: bankOff + m + ex,
    };
  }, [sellingPrice, bankPct, bankCap, merchValue, exchangeValue, tpl]);

  // ─── Validation: are required fields filled for current template? ──
  const validation = useMemo(() => {
    const errors = [];
    if (!Number(sellingPrice)) errors.push("Selling price");
    if (!Number(bankPct))      errors.push("Bank offer %");
    if (tpl.fields.includes("merch")    && !Number(merchValue))    errors.push("Merch value");
    if (tpl.fields.includes("exchange") && !Number(exchangeValue)) errors.push("Exchange value");
    return errors;
  }, [sellingPrice, bankPct, merchValue, exchangeValue, tpl]);

  // ─── Render the active template ─────────────────────────────────────
  const renderTemplate = () => {
    const props = {
      totalBenefits: calc.total,
      totalBankOff: calc.bankOff,
      merchValue: calc.merchValue,
      exchangeValue: calc.exchangeValue,
      selectedBanks,
      frameRef,
    };
    switch (combo) {
      case "T1": return <Template1 {...props} />;
      case "T2": return <Template2 {...props} />;
      case "T3": return <Template3 {...props} />;
      case "T4": return <Template4 {...props} />;
      case "T5": return <Template5 {...props} />;
      default:   return null;
    }
  };

  // ─── Download as 4× JPEG via html-to-image ──────────────────────────
  const download = useCallback(async () => {
    if (validation.length || !frameRef.current) return;
    setDownloading(true);
    try {
      const dataUrl = await window.htmlToImage.toJpeg(frameRef.current, {
        pixelRatio: 4,
        quality: 0.95,
        backgroundColor: "#0F0F0F",
        cacheBust: true,
      });
      const a = document.createElement("a");
      const fileName =
        `UC-${product.replace(/\s+/g, "")}-${combo}-₹${INR(calc.total)}.jpg`;
      a.href = dataUrl;
      a.download = fileName;
      a.click();
      setToast({ ok: true, msg: `Downloaded at ${tpl.w * 4}×${tpl.h * 4}px` });
    } catch (e) {
      console.error(e);
      setToast({ ok: false, msg: "Could not export. " + (e?.message || "") });
    } finally {
      setDownloading(false);
      setTimeout(() => setToast(null), 3500);
    }
  }, [combo, calc.total, product, tpl, validation.length]);

  // ─── Layout ────────────────────────────────────────────────────────
  return (
    <div className="app">
      {/* Top bar */}
      <header className="topbar">
        <div className="brand">
          <div className="brand-logo" style={{display:"flex", alignItems:"center"}}>
            <img src={window.__resources.nativeLogo} alt="Native"
              style={{height: 14, width: "auto", display: "block",
                      filter: "invert(1) brightness(2)"}}/>
          </div>
          <span className="brand-divider"/>
          <span className="brand-tool">Offer asset generator</span>
        </div>
        <div className="topbar-meta">Internal tool · v1.0</div>
      </header>

      <main className="main">
        {/* LEFT — input panel */}
        <aside className="panel">
          <h2 className="panel-title">Configure asset</h2>
          <p className="panel-sub">Fill in the latest values and the preview updates live.</p>

          <section className="section">
            <div className="section-label">Product details</div>
            <Field label="Product">
              <Select value={product} onChange={setProduct}
                options={PRODUCTS} />
            </Field>
            <Field label="Selling price">
              <TextInput type="number" value={sellingPrice}
                onChange={setSellingPrice} prefix="₹" placeholder="21,999"/>
            </Field>
          </section>

          <div className="divider"/>

          <section className="section">
            <div className="section-label">UC app benefits</div>
            <Field label="Benefit combination"
              hint="Determines the template size and layout">
              <Select value={combo} onChange={setCombo}
                options={TEMPLATES.map(t => ({
                  value: t.id, label: `${t.id.replace('T','')}. ${t.label}`,
                }))} />
            </Field>

            <Field label="Bank offer">
              <TextInput type="number" value={bankPct}
                onChange={setBankPct} suffix="%" placeholder="7"/>
            </Field>

            <Field label="Applicable banks" hint="Logos shown on the asset reflect this selection.">
              <BankPicker selected={selectedBanks} onChange={setSelectedBanks}/>
            </Field>

            <Field label="Max bank discount cap" hint="Caps the calculated bank discount. Defaults to ₹1,500.">
              <TextInput type="number" value={bankCap}
                onChange={setBankCap} prefix="₹" placeholder="1,500"/>
            </Field>

            <Field label="Merch value" hint={!tpl.fields.includes("merch") ? "Not used in this template" : null}>
              <TextInput type="number" value={merchValue}
                onChange={setMerchValue} prefix="₹" placeholder="1,799"
                disabled={!tpl.fields.includes("merch")}/>
            </Field>

            <Field label="Exchange offer value" hint={!tpl.fields.includes("exchange") ? "Not used in this template" : null}>
              <TextInput type="number" value={exchangeValue}
                onChange={setExchangeValue} prefix="₹" placeholder="1,000"
                disabled={!tpl.fields.includes("exchange")}/>
            </Field>
          </section>

          <div className="divider"/>

          {/* Calc summary */}
          <section className="summary">
            <div className="summary-row"><span>Bank discount</span>
              <span>₹{INR(calc.bankOff)}</span></div>
            {tpl.fields.includes("merch") && <div className="summary-row">
              <span>Merch value</span><span>₹{INR(calc.merchValue)}</span></div>}
            {tpl.fields.includes("exchange") && <div className="summary-row">
              <span>Exchange offer</span><span>₹{INR(calc.exchangeValue)}</span></div>}
            <div className="summary-row total">
              <span>Total extra benefits</span>
              <span>₹{INR(calc.total)}</span>
            </div>
          </section>

          <button className={"download-btn" + (validation.length ? " disabled" : "")}
            onClick={download} disabled={!!validation.length || downloading}>
            {downloading ? (
              <><span className="spinner"/>Generating…</>
            ) : validation.length ? (
              `Fill: ${validation.join(", ")}`
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M12 4v12m0 0l-5-5m5 5l5-5M4 20h16" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Download asset · 4× JPEG
              </>
            )}
          </button>
          <div className="export-note">Exports at {tpl.w * 4}×{tpl.h * 4}px (4× resolution)</div>
        </aside>

        {/* RIGHT — preview */}
        <section className="preview-area">
          <div className="preview-header">
            <div>
              <div className="preview-label">Live preview</div>
              <div className="preview-meta">
                {tpl.label.replace(/^[0-9]\.\s*/, '')} · {tpl.w}×{tpl.h}px
              </div>
            </div>
            <div className="preview-chips">
              <span className="chip">UC APP EXCLUSIVE</span>
              <span className="chip chip-product">{product}</span>
            </div>
          </div>

          <div className="canvas-bg">
            <div className="canvas-grid"/>
            <div className="canvas-stage">
              {renderTemplate()}
            </div>
            {toast && (
              <div className={"toast " + (toast.ok ? "toast-ok" : "toast-err")}>
                {toast.ok ? "✓ " : "✕ "}{toast.msg}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
