import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight, ArrowLeftRight, Leaf, Shield, Zap, Globe, Lock,
  BarChart2, Blocks, Users, TrendingUp, CheckCircle, ChevronRight,
  Play, ArrowUpRight, ArrowDownRight, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const API = process.env.REACT_APP_BACKEND_URL;
const WS_URL = API.replace('https://', 'wss://').replace('http://', 'ws://');

export default function LandingPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [livePrices, setLivePrices] = useState({});
  const [priceFlash, setPriceFlash] = useState({});
  const [demoActive, setDemoActive] = useState(false);
  const [demoStep, setDemoStep] = useState(0);
  const [demoResults, setDemoResults] = useState([]);
  const [demoRunning, setDemoRunning] = useState(false);
  const wsRef = useRef(null);

  // Fetch initial stats + assets
  useEffect(() => {
    fetch(`${API}/api/platform/stats`).then(r => r.json()).then(setStats).catch(() => {});
    fetch(`${API}/api/assets`).then(r => r.json()).then(assets => {
      const prices = {};
      assets.forEach(a => { if (a.symbol !== 'USD') prices[a.symbol] = { price: a.current_price, change: a.price_change_24h }; });
      setLivePrices(prices);
    }).catch(() => {});
  }, []);

  // WebSocket connection for live prices
  useEffect(() => {
    let ws;
    let reconnectTimer;
    const connect = () => {
      try {
        ws = new WebSocket(`${WS_URL}/ws/prices`);
        wsRef.current = ws;
        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'price_update' && msg.data) {
              const flashes = {};
              const updated = { ...livePrices };
              msg.data.forEach(u => {
                updated[u.symbol] = { price: u.price, change: livePrices[u.symbol]?.change || 0 };
                flashes[u.symbol] = u.direction;
              });
              setLivePrices(updated);
              setPriceFlash(flashes);
              setTimeout(() => setPriceFlash({}), 600);
            }
          } catch {}
        };
        ws.onclose = () => { reconnectTimer = setTimeout(connect, 5000); };
        ws.onerror = () => { ws.close(); };
      } catch {}
    };
    connect();
    return () => { ws?.close(); clearTimeout(reconnectTimer); };
  }, []);

  // Demo script scenarios
  const demoScenarios = [
    { id: 1, title: 'Retail Login', desc: 'Authenticate as retail trader Alex Chen', icon: Users, action: async () => {
      const r = await fetch(`${API}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'retail_user_1@e4n.com', password: 'Test@123' }) });
      const d = await r.json(); return { success: r.ok, detail: `Logged in as ${d.name} (${d.role})`, token: d.token };
    }},
    { id: 2, title: 'View Portfolio', desc: 'Fetch wallet balances and holdings', icon: BarChart2, action: async (ctx) => {
      const r = await fetch(`${API}/api/portfolio`, { headers: { Authorization: `Bearer ${ctx.token}` } });
      const d = await r.json(); return { success: r.ok, detail: `Portfolio: $${d.total_value?.toLocaleString()} across ${d.holdings?.length} assets` };
    }},
    { id: 3, title: 'Check Carbon Prices', desc: 'Get live CARBON asset data', icon: Leaf, action: async (ctx) => {
      const r = await fetch(`${API}/api/assets/CARBON`, { headers: { Authorization: `Bearer ${ctx.token}` } });
      const d = await r.json(); return { success: r.ok, detail: `CARBON: $${d.current_price?.toFixed(2)} | Supply: ${d.supply?.toLocaleString()}` };
    }},
    { id: 4, title: 'Place Buy Order', desc: 'Buy 10 CARBON tokens at market price', icon: ArrowLeftRight, action: async (ctx) => {
      const r = await fetch(`${API}/api/orders`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ctx.token}` }, body: JSON.stringify({ asset_symbol: 'CARBON', order_type: 'market', side: 'buy', quantity: 10, settlement_token: 'USD' }) });
      const d = await r.json(); return { success: r.ok, detail: r.ok ? `Order placed: BUY 10 CARBON @ $${d.price?.toFixed(2)}` : d.detail };
    }},
    { id: 5, title: 'Concentration Check', desc: 'Verify anti-hoarding guard for RICE', icon: Shield, action: async (ctx) => {
      const r = await fetch(`${API}/api/guards/concentration/RICE`, { headers: { Authorization: `Bearer ${ctx.token}` } });
      const d = await r.json(); return { success: r.ok, detail: `RICE ownership: ${d.ownership_pct}% | Status: ${d.status} | Cap: ${d.ownership_cap_pct}%` };
    }},
    { id: 6, title: 'Carbon Calculator', desc: 'Calculate emissions for a 50-employee company', icon: BarChart2, action: async (ctx) => {
      const r = await fetch(`${API}/api/carbon-calculator/calculate`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ctx.token}` }, body: JSON.stringify({ electricity_kwh: 50000, vehicle_miles: 25000, flights_hours: 100, employees: 50, region: 'US' }) });
      const d = await r.json(); return { success: r.ok, detail: `Footprint: ${d.total_emissions_tco2e} tCO2e | Offset: $${d.offset_cost_usd?.toLocaleString()}` };
    }},
    { id: 7, title: 'ESG Trade Footprint', desc: 'Calculate logistics carbon footprint', icon: Leaf, action: async (ctx) => {
      const r = await fetch(`${API}/api/esg/trade-footprint?distance_km=1200&transport_mode=sea&weight_tonnes=500`, { method: 'POST', headers: { Authorization: `Bearer ${ctx.token}` } });
      const d = await r.json(); return { success: r.ok, detail: `Logistics: ${d.footprint_kg_co2} kg CO2 (sea, 1200km) | Offset: $${d.offset_cost_usd}` };
    }},
    { id: 8, title: 'Mine Block', desc: 'Trigger mining on the E4N testnet', icon: Blocks, action: async (ctx) => {
      const r = await fetch(`${API}/api/blockchain/mine`, { method: 'POST', headers: { Authorization: `Bearer ${ctx.token}` } });
      const d = await r.json(); return { success: r.ok, detail: d.message };
    }},
    { id: 9, title: 'DAO Governance', desc: 'View active governance proposals', icon: Users, action: async (ctx) => {
      const r = await fetch(`${API}/api/governance/proposals`, { headers: { Authorization: `Bearer ${ctx.token}` } });
      const d = await r.json(); return { success: r.ok, detail: `${d.length} active proposals | Total votes: ${d.reduce((s, p) => s + (p.total_votes || 0), 0)}` };
    }},
    { id: 10, title: 'Compliance Check', desc: 'Verify regional compliance status', icon: Shield, action: async (ctx) => {
      const r = await fetch(`${API}/api/compliance/status`, { headers: { Authorization: `Bearer ${ctx.token}` } });
      const d = await r.json(); return { success: r.ok, detail: `Region: ${d.region} | Status: ${d.compliance_status} | KYC Tier: ${d.kyc_tier}` };
    }},
    { id: 11, title: 'Send Email Alerts', desc: 'Trigger simulated email notifications', icon: Zap, action: async (ctx) => {
      const r = await fetch(`${API}/api/emails/test-send`, { method: 'POST', headers: { Authorization: `Bearer ${ctx.token}` } });
      const d = await r.json(); return { success: r.ok, detail: d.message };
    }},
    { id: 12, title: 'AI Assistant', desc: 'Ask about carbon credit market outlook', icon: Globe, action: async (ctx) => {
      const r = await fetch(`${API}/api/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ctx.token}` }, body: JSON.stringify({ message: 'What is the current outlook for carbon credits in the EU market?' }) });
      const d = await r.json(); return { success: r.ok, detail: d.response?.slice(0, 120) + '...' };
    }},
  ];

  const runDemo = async () => {
    setDemoRunning(true);
    setDemoResults([]);
    setDemoStep(0);
    const ctx = {};
    for (let i = 0; i < demoScenarios.length; i++) {
      setDemoStep(i);
      try {
        const result = await demoScenarios[i].action(ctx);
        if (result.token) ctx.token = result.token;
        setDemoResults(prev => [...prev, { ...demoScenarios[i], result }]);
      } catch (e) {
        setDemoResults(prev => [...prev, { ...demoScenarios[i], result: { success: false, detail: e.message } }]);
      }
      await new Promise(r => setTimeout(r, 800));
    }
    setDemoRunning(false);
  };

  const features = [
    { icon: ArrowLeftRight, title: 'Instant Settlement', desc: 'Atomic DvP execution with sub-3-second finality. No counterparty risk.', color: '#00F298' },
    { icon: Leaf, title: 'Carbon Credit Exchange', desc: 'Full MRV lifecycle — issue, verify, exchange, and retire credits across 5 global regions.', color: '#06B6D4' },
    { icon: Shield, title: 'Compliance-First', desc: 'Region-aware regulatory engine covering EU ETS, US SEC, APAC, LATAM, and ACMI standards.', color: '#F59E0B' },
    { icon: Blocks, title: 'Blockchain-Native', desc: 'Simulated L1 with merkle trees, smart contracts, DAO governance, and proof-of-authority consensus.', color: '#8B5CF6' },
    { icon: Lock, title: 'Anti-Hoarding Guards', desc: 'Protocol-level concentration caps, storage fees, and whale detection for market integrity.', color: '#EF4444' },
    { icon: Globe, title: 'Multi-Asset Tokenization', desc: 'Trade food, water, energy, and carbon credits as fractional, composable tokens.', color: '#3B82F6' },
  ];

  const howItWorks = [
    { step: '01', title: 'Onboard & Verify', desc: 'Complete multi-tier KYC with document upload. Unlock trading limits based on verification level.' },
    { step: '02', title: 'Deposit & Tokenize', desc: 'Fund your wallet with USD stablecoins. Tokenize physical assets into tradeable necessity tokens.' },
    { step: '03', title: 'Trade & Settle', desc: 'Execute limit, market, RFQ, or basket orders. Atomic settlement in under 3 seconds.' },
    { step: '04', title: 'Report & Offset', desc: 'Generate compliance reports, calculate carbon footprints, and retire credits for ESG impact.' },
  ];

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: '#060B12' }}>
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 px-6 py-4" style={{ background: 'rgba(6,11,18,0.8)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#00F298' }}>
              <ArrowLeftRight className="w-5 h-5" style={{ color: '#060B12' }} />
            </div>
            <span className="text-lg font-bold tracking-tight" style={{ fontFamily: 'Cabinet Grotesk' }}>E4N</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-slate-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
            <a href="#impact" className="hover:text-white transition-colors">Impact</a>
            <a href="#demo" className="hover:text-emerald-400 transition-colors font-medium flex items-center gap-1">
              <Play className="w-3 h-3" />Live Demo
            </a>
          </div>
          <div className="flex items-center gap-3">
            <Button data-testid="landing-login-btn" onClick={() => navigate('/auth')} variant="outline" className="rounded-xl border-white/10 text-slate-300 hover:bg-white/5 text-sm px-5">
              Sign In
            </Button>
            <Button data-testid="landing-signup-btn" onClick={() => navigate('/auth')} className="rounded-xl text-sm px-5 btn-glow" style={{ background: '#00F298', color: '#060B12' }}>
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 px-6">
        {/* Decorative orbs */}
        <div className="absolute top-20 left-1/4 w-96 h-96 rounded-full opacity-[0.06]" style={{ background: 'radial-gradient(circle, #00F298, transparent 70%)' }} />
        <div className="absolute top-40 right-1/4 w-72 h-72 rounded-full opacity-[0.04]" style={{ background: 'radial-gradient(circle, #3B82F6, transparent 70%)' }} />

        <div className="max-w-7xl mx-auto text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6" style={{ background: 'rgba(0,242,152,0.08)', border: '1px solid rgba(0,242,152,0.15)' }}>
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-emerald-400 tracking-wider uppercase">Live on E4N Testnet</span>
            </div>
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-7xl font-medium tracking-tight leading-[1.1] mb-6" style={{ fontFamily: 'Cabinet Grotesk' }}>
            The Sovereign Exchange<br />
            <span style={{ color: '#00F298' }}>for Essential Goods</span>
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
            className="text-base lg:text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Trade tokenized commodities, exchange carbon credits, and settle instantly — with institutional-grade compliance, anti-hoarding protections, and deterministic AI pricing.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button data-testid="hero-get-started-btn" onClick={() => navigate('/auth')} className="rounded-xl text-sm px-8 py-3 btn-glow flex items-center gap-2" style={{ background: '#00F298', color: '#060B12' }}>
              Launch Exchange <ArrowRight className="w-4 h-4" />
            </Button>
            <Button onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })} variant="outline" className="rounded-xl text-sm px-8 py-3 border-white/10 text-slate-300 hover:bg-white/5">
              Explore Features
            </Button>
          </motion.div>

          {/* 3D Glass Hero Cards — Live WebSocket Prices */}
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.5 }}
            className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {['CARBON', 'WHEAT', 'KWH'].map((symbol, i) => {
              const data = livePrices[symbol] || {};
              const price = data.price || 0;
              const change = data.change || 0;
              const up = change >= 0;
              const flash = priceFlash[symbol];
              return (
                <div key={symbol} className="group relative" style={{ transform: `rotateY(${(i - 1) * 5}deg) rotateX(2deg)`, transformStyle: 'preserve-3d' }}>
                  <div className="absolute inset-0 rounded-2xl opacity-20 group-hover:opacity-30 transition-opacity" style={{ background: `linear-gradient(135deg, ${up ? '#00F298' : '#EF4444'}20, transparent)` }} />
                  <div className={`relative glass-card rounded-2xl p-6 hover:-translate-y-2 transition-all duration-500 group-hover:shadow-[0_20px_60px_rgba(0,242,152,0.1)] ${flash === 'up' ? 'price-up' : flash === 'down' ? 'price-down' : ''}`} style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{symbol}</p>
                      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Live" />
                    </div>
                    <p className="text-2xl font-medium mb-1" style={{ fontFamily: 'Cabinet Grotesk' }}>
                      ${price > 1 ? price.toFixed(2) : price.toFixed(4)}
                    </p>
                    <p className={`text-sm flex items-center gap-1 ${up ? 'text-emerald-400' : 'text-red-400'}`}>
                      {up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {Math.abs(change).toFixed(2)}%
                    </p>
                    <div className="mt-3 h-12 flex items-end gap-0.5">
                      {Array.from({ length: 20 }).map((_, j) => (
                        <div key={j} className="flex-1 rounded-sm transition-all" style={{
                          height: `${20 + Math.sin(j * 0.5 + i + (price * 10 % 5)) * 15 + (j * 0.8)}px`,
                          background: up ? `rgba(0,242,152,${0.15 + j * 0.035})` : `rgba(239,68,68,${0.15 + j * 0.035})`,
                        }} />
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* Live Stats Bar */}
      {stats && (
        <section className="py-8 px-6" style={{ background: 'rgba(255,255,255,0.01)', borderTop: '1px solid rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
          <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 text-center">
            {[
              { label: 'Total Trades', value: stats.total_trades?.toLocaleString() },
              { label: 'Trade Volume', value: `$${(stats.total_volume_usd / 1000).toFixed(0)}K` },
              { label: 'Carbon Offset', value: `${(stats.carbon_tonnes_traded / 1000).toFixed(0)}K tCO2e` },
              { label: 'Settlement', value: stats.settlement_speed },
              { label: 'Uptime', value: stats.uptime },
            ].map(s => (
              <div key={s.label}>
                <p className="text-xl md:text-2xl font-medium" style={{ fontFamily: 'Cabinet Grotesk', color: '#00F298' }}>{s.value}</p>
                <p className="text-xs uppercase tracking-[0.15em] text-slate-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Features */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <p className="text-xs uppercase tracking-[0.3em] text-emerald-400 mb-3">Why E4N</p>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-medium tracking-tight" style={{ fontFamily: 'Cabinet Grotesk' }}>
              Built for Resilience.<br />Designed for Impact.
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div key={f.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                className="group glass-card rounded-2xl p-7 hover:-translate-y-1 transition-all duration-500 hover:shadow-[0_16px_48px_rgba(0,0,0,0.3)]"
                style={{ border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-5 transition-transform group-hover:scale-110 duration-300" style={{ background: `${f.color}12` }}>
                  <f.icon className="w-5 h-5" style={{ color: f.color }} strokeWidth={1.5} />
                </div>
                <h3 className="text-base font-medium mb-2" style={{ fontFamily: 'Cabinet Grotesk' }}>{f.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 px-6" style={{ background: 'rgba(255,255,255,0.01)' }}>
        <div className="max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <p className="text-xs uppercase tracking-[0.3em] text-emerald-400 mb-3">Get Started</p>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-medium tracking-tight" style={{ fontFamily: 'Cabinet Grotesk' }}>Four Steps to Impact</h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {howItWorks.map((step, i) => (
              <motion.div key={step.step} initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="glass-card rounded-2xl p-7 flex gap-5" style={{ border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'Cabinet Grotesk', color: 'rgba(0,242,152,0.15)' }}>{step.step}</div>
                <div>
                  <h3 className="text-base font-medium mb-1" style={{ fontFamily: 'Cabinet Grotesk' }}>{step.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Business Impact */}
      <section id="impact" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <p className="text-xs uppercase tracking-[0.3em] text-emerald-400 mb-3">Impact</p>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-medium tracking-tight" style={{ fontFamily: 'Cabinet Grotesk' }}>Measurable Outcomes</h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { metric: '95%', label: 'Settlement Time Reduction', desc: 'From T+2 days to under 3 seconds with atomic DvP execution.' },
              { metric: '40%', label: 'Compliance Cost Savings', desc: 'Automated region-aware regulatory reporting eliminates manual overhead.' },
              { metric: '100%', label: 'Carbon Credit Traceability', desc: 'Full MRV chain from issuance to retirement, verified on-chain.' },
            ].map((impact, i) => (
              <motion.div key={impact.label} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="glass-card rounded-2xl p-8 text-center group hover:-translate-y-1 transition-all duration-500" style={{ border: '1px solid rgba(255,255,255,0.05)' }}>
                <p className="text-5xl font-bold mb-3" style={{ fontFamily: 'Cabinet Grotesk', color: '#00F298' }}>{impact.metric}</p>
                <h3 className="text-sm font-medium mb-2">{impact.label}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{impact.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive Demo */}
      <section id="demo" className="py-24 px-6" style={{ background: 'rgba(255,255,255,0.01)' }}>
        <div className="max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
            <p className="text-xs uppercase tracking-[0.3em] text-emerald-400 mb-3">Interactive Demo</p>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-medium tracking-tight mb-3" style={{ fontFamily: 'Cabinet Grotesk' }}>
              See E4N in Action
            </h2>
            <p className="text-sm text-slate-400 max-w-lg mx-auto">
              Run a live 12-step demo that walks through authentication, trading, carbon credits, blockchain, compliance, and AI — all hitting real APIs.
            </p>
          </motion.div>

          {!demoActive ? (
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center">
              <Button data-testid="start-demo-btn" onClick={() => { setDemoActive(true); runDemo(); }}
                className="rounded-xl text-sm px-10 py-4 btn-glow flex items-center gap-3 mx-auto" style={{ background: '#00F298', color: '#060B12' }}>
                <Play className="w-5 h-5" /> Run Live Demo
              </Button>
              <p className="text-xs text-slate-500 mt-3">Takes ~15 seconds. No sign-up required.</p>
            </motion.div>
          ) : (
            <div className="space-y-3">
              {/* Progress bar */}
              <div className="glass-card rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${demoRunning ? 'bg-emerald-400 animate-pulse' : 'bg-emerald-400'}`} />
                  <span className="text-sm font-medium">
                    {demoRunning ? `Running step ${demoStep + 1} of ${demoScenarios.length}...` : `Demo complete — ${demoResults.filter(r => r.result?.success).length}/${demoResults.length} passed`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {!demoRunning && (
                    <Button size="sm" onClick={() => { setDemoResults([]); runDemo(); }} variant="outline" className="rounded-lg border-white/10 text-xs">
                      Rerun
                    </Button>
                  )}
                  <Button size="sm" onClick={() => { setDemoActive(false); setDemoResults([]); setDemoRunning(false); }} variant="outline" className="rounded-lg border-white/10 text-xs">
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              {/* Progress track */}
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <motion.div className="h-full rounded-full" style={{ background: '#00F298' }}
                  animate={{ width: `${(demoResults.length / demoScenarios.length) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>

              {/* Scenario cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {demoScenarios.map((scenario, i) => {
                  const result = demoResults.find(r => r.id === scenario.id);
                  const isActive = demoRunning && demoStep === i;
                  const isPending = !result && !isActive;
                  return (
                    <motion.div key={scenario.id}
                      initial={{ opacity: 0.4 }}
                      animate={{ opacity: result || isActive ? 1 : 0.4 }}
                      className={`glass-card rounded-xl p-4 transition-all duration-300 ${isActive ? 'ring-1 ring-emerald-500/40 bg-white/[0.03]' : ''} ${result?.result?.success ? 'border-emerald-500/10' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          result?.result?.success ? 'bg-emerald-500/15' : result ? 'bg-red-500/15' : isActive ? 'bg-emerald-500/10' : 'bg-white/5'
                        }`}>
                          {isActive ? (
                            <div className="w-4 h-4 border-2 border-emerald-400/50 border-t-emerald-400 rounded-full animate-spin" />
                          ) : result?.result?.success ? (
                            <CheckCircle className="w-4 h-4 text-emerald-400" />
                          ) : result ? (
                            <X className="w-4 h-4 text-red-400" />
                          ) : (
                            <scenario.icon className="w-4 h-4 text-slate-500" strokeWidth={1.5} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500 font-mono">#{scenario.id.toString().padStart(2, '0')}</span>
                            <p className="text-sm font-medium">{scenario.title}</p>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">{scenario.desc}</p>
                          {result?.result?.detail && (
                            <p className={`text-xs mt-1.5 leading-relaxed ${result.result.success ? 'text-emerald-400/80' : 'text-red-400/80'}`}>
                              {result.result.detail}
                            </p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="glass-card rounded-3xl p-12 relative overflow-hidden" style={{ border: '1px solid rgba(0,242,152,0.1)' }}>
            <div className="absolute inset-0 opacity-[0.03]" style={{ background: 'radial-gradient(circle at center, #00F298, transparent 70%)' }} />
            <div className="relative z-10">
              <h2 className="text-2xl sm:text-3xl font-medium tracking-tight mb-4" style={{ fontFamily: 'Cabinet Grotesk' }}>
                Ready to trade with purpose?
              </h2>
              <p className="text-slate-400 mb-8 max-w-md mx-auto">
                Join the sovereign-grade exchange for essential goods. Start trading in under 2 minutes.
              </p>
              <Button data-testid="cta-get-started-btn" onClick={() => navigate('/auth')} className="rounded-xl text-sm px-10 py-3 btn-glow" style={{ background: '#00F298', color: '#060B12' }}>
                Launch Exchange <ArrowRight className="w-4 h-4 ml-2 inline" />
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6" style={{ borderTop: '1px solid rgba(255,255,255,0.03)' }}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: '#00F298' }}>
              <ArrowLeftRight className="w-3 h-3" style={{ color: '#060B12' }} />
            </div>
            <span className="text-sm font-medium" style={{ fontFamily: 'Cabinet Grotesk' }}>E4N Exchange</span>
          </div>
          <p className="text-xs text-slate-600">Exchange for Necessities. Built for resilience. Settled with certainty.</p>
        </div>
      </footer>
    </div>
  );
}
