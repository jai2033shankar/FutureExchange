import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight, ArrowLeftRight, Leaf, Shield, Zap, Globe, Lock,
  BarChart2, Blocks, Users, TrendingUp, CheckCircle, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const API = process.env.REACT_APP_BACKEND_URL;

export default function LandingPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetch(`${API}/api/platform/stats`).then(r => r.json()).then(setStats).catch(() => {});
  }, []);

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

          {/* 3D Glass Hero Cards */}
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.5 }}
            className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto perspective-1000">
            {[
              { label: 'CARBON', price: '$61.54', change: '+1.90%', up: true },
              { label: 'WHEAT', price: '$0.3912', change: '+3.21%', up: true },
              { label: 'ENERGY', price: '$0.1667', change: '-0.84%', up: false },
            ].map((card, i) => (
              <div key={card.label} className="group relative" style={{ transform: `rotateY(${(i - 1) * 5}deg) rotateX(2deg)`, transformStyle: 'preserve-3d' }}>
                <div className="absolute inset-0 rounded-2xl opacity-20 group-hover:opacity-30 transition-opacity" style={{ background: `linear-gradient(135deg, ${card.up ? '#00F298' : '#EF4444'}20, transparent)` }} />
                <div className="relative glass-card rounded-2xl p-6 hover:-translate-y-2 transition-all duration-500 group-hover:shadow-[0_20px_60px_rgba(0,242,152,0.1)]" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500 mb-2">{card.label}</p>
                  <p className="text-2xl font-medium mb-1" style={{ fontFamily: 'Cabinet Grotesk' }}>{card.price}</p>
                  <p className={`text-sm ${card.up ? 'text-emerald-400' : 'text-red-400'}`}>{card.change}</p>
                  <div className="mt-3 h-12 flex items-end gap-0.5">
                    {Array.from({ length: 20 }).map((_, j) => (
                      <div key={j} className="flex-1 rounded-sm transition-all" style={{
                        height: `${20 + Math.sin(j * 0.5 + i) * 15 + Math.random() * 10}px`,
                        background: card.up ? `rgba(0,242,152,${0.2 + j * 0.03})` : `rgba(239,68,68,${0.2 + j * 0.03})`,
                      }} />
                    ))}
                  </div>
                </div>
              </div>
            ))}
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
