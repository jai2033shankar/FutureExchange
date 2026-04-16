import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { PieChart, Pie, Cell, AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Wallet, ArrowUpRight, ArrowDownRight, TrendingUp, BarChart2, Shield, Target, Activity, Zap } from 'lucide-react';

const CATEGORY_COLORS = { food: '#F59E0B', energy: '#3B82F6', water: '#06B6D4', carbon: '#00F298', settlement: '#8E9EAD' };
const PIE_COLORS = ['#00F298', '#3B82F6', '#F59E0B', '#EF4444', '#06B6D4', '#8B5CF6'];
const ATTR_COLORS = { trading_pnl: '#00F298', prediction_pnl: '#3B82F6', carbon_pnl: '#F59E0B' };

export default function Portfolio() {
  const { apiCall } = useAuth();
  const [portfolio, setPortfolio] = useState(null);
  const [risk, setRisk] = useState(null);
  const [perf, setPerf] = useState(null);
  const [valueHistory, setValueHistory] = useState([]);
  const [riskMetrics, setRiskMetrics] = useState(null);
  const [breakdown, setBreakdown] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [p, r, pf, vh, rm, bd] = await Promise.all([
        apiCall('get', '/portfolio'),
        apiCall('get', '/risk/score'),
        apiCall('get', '/portfolio/performance'),
        apiCall('get', '/portfolio/value-history'),
        apiCall('get', '/portfolio/risk-metrics'),
        apiCall('get', '/portfolio/product-breakdown'),
      ]);
      setPortfolio(p); setRisk(r); setPerf(pf);
      setValueHistory(vh); setRiskMetrics(rm); setBreakdown(bd);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" /></div>;

  const pieData = (portfolio?.holdings || []).filter(h => h.value > 0).map(h => ({ name: h.symbol, value: h.value }));
  const riskColor = risk?.risk_level === 'low' ? '#00F298' : risk?.risk_level === 'medium' ? '#F59E0B' : '#EF4444';
  const totalPnl = perf?.total_pnl || 0;
  const pnlPositive = totalPnl >= 0;

  return (
    <div data-testid="portfolio-page" className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl sm:text-3xl font-medium tracking-tight" style={{ fontFamily: 'Cabinet Grotesk' }}>Portfolio & Performance</h1>
        <p className="text-sm text-slate-400 mt-1">Unified P&L attribution across trading, predictions, and carbon credits</p>
      </motion.div>

      {/* Top KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Portfolio Value', value: `$${(perf?.current_value || 0).toLocaleString()}`, icon: Wallet, color: '#00F298' },
          { label: 'Total P&L', value: `${pnlPositive ? '+' : ''}$${totalPnl.toLocaleString()}`, icon: pnlPositive ? ArrowUpRight : ArrowDownRight, color: pnlPositive ? '#00F298' : '#EF4444' },
          { label: 'Sharpe Ratio', value: riskMetrics?.sharpe_ratio ?? '—', icon: Target, color: '#3B82F6' },
          { label: 'Max Drawdown', value: `${riskMetrics?.max_drawdown_pct ?? 0}%`, icon: Activity, color: '#EF4444' },
          { label: 'Total Trades', value: perf?.total_trades || 0, icon: Zap, color: '#F59E0B' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="glass-card rounded-xl p-4">
            <div className="flex items-start justify-between">
              <div><p className="text-[10px] uppercase tracking-[0.15em] text-slate-400 mb-1">{s.label}</p><p className="text-xl font-medium" style={{ fontFamily: 'Cabinet Grotesk', color: s.label === 'Total P&L' ? s.color : undefined }}>{s.value}</p></div>
              <div className="p-2 rounded-lg" style={{ background: `${s.color}15` }}><s.icon className="w-4 h-4" style={{ color: s.color }} strokeWidth={1.5} /></div>
            </div>
          </motion.div>
        ))}
      </div>

      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList className="bg-white/5 border border-white/10 rounded-xl p-1">
          <TabsTrigger value="performance" className="rounded-lg data-[state=active]:bg-white/10 text-xs">Performance</TabsTrigger>
          <TabsTrigger value="attribution" className="rounded-lg data-[state=active]:bg-white/10 text-xs">P&L Attribution</TabsTrigger>
          <TabsTrigger value="holdings" className="rounded-lg data-[state=active]:bg-white/10 text-xs">Holdings</TabsTrigger>
          <TabsTrigger value="risk" className="rounded-lg data-[state=active]:bg-white/10 text-xs">Risk</TabsTrigger>
        </TabsList>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Portfolio Value Chart */}
            <div className="lg:col-span-2 glass-card rounded-xl p-5">
              <h3 className="text-sm font-medium mb-4">Portfolio Value (60d)</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={valueHistory}>
                    <defs><linearGradient id="pvGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#00F298" stopOpacity={0.15} /><stop offset="95%" stopColor="#00F298" stopOpacity={0} /></linearGradient></defs>
                    <XAxis dataKey="date" tickFormatter={d => new Date(d).toLocaleDateString('en', { month: 'short', day: 'numeric' })} tick={{ fill: '#64748B', fontSize: 9 }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={v => `$${(v / 1000).toFixed(1)}K`} tick={{ fill: '#64748B', fontSize: 9 }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                    <Tooltip contentStyle={{ background: '#0B111A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '11px' }} formatter={v => [`$${v?.toLocaleString()}`, 'Value']} />
                    <Area type="monotone" dataKey="value" stroke="#00F298" fill="url(#pvGrad)" strokeWidth={1.5} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            {/* Performance Summary */}
            <div className="space-y-4">
              <div className="glass-card rounded-xl p-5">
                <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-3">Performance Metrics</p>
                <div className="space-y-2">
                  {[
                    { label: 'Annualized Return', value: `${riskMetrics?.annualized_return_pct}%`, color: (riskMetrics?.annualized_return_pct || 0) >= 0 ? '#00F298' : '#EF4444' },
                    { label: 'Volatility', value: `${riskMetrics?.annualized_volatility_pct}%` },
                    { label: 'Sharpe Ratio', value: riskMetrics?.sharpe_ratio },
                    { label: 'Sortino Ratio', value: riskMetrics?.sortino_ratio },
                    { label: 'Calmar Ratio', value: riskMetrics?.calmar_ratio },
                    { label: 'Profit Factor', value: `${riskMetrics?.profit_factor}x` },
                    { label: 'Win Rate', value: `${riskMetrics?.win_rate_pct}%` },
                    { label: 'Best Day', value: `+${riskMetrics?.best_day_pct}%`, color: '#00F298' },
                    { label: 'Worst Day', value: `${riskMetrics?.worst_day_pct}%`, color: '#EF4444' },
                  ].map(m => (
                    <div key={m.label} className="flex justify-between text-xs">
                      <span className="text-slate-400">{m.label}</span>
                      <span className="font-medium" style={{ color: m.color }}>{m.value}</span>
                    </div>
                  ))}
                </div>
              </div>
              {perf?.best_trade && (
                <div className="glass-card rounded-xl p-5">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-2">Best Trade</p>
                  <p className="text-sm font-medium">{perf.best_trade.asset}</p>
                  <p className="text-lg text-emerald-400" style={{ fontFamily: 'Cabinet Grotesk' }}>+${perf.best_trade.pnl?.toLocaleString()}</p>
                </div>
              )}
            </div>
          </div>

          {/* Daily Returns Heatmap */}
          <div className="glass-card rounded-xl p-5">
            <h3 className="text-sm font-medium mb-4">Daily Returns (60d)</h3>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={riskMetrics?.daily_returns || []}>
                  <XAxis dataKey="date" tickFormatter={d => new Date(d).getDate()} tick={{ fill: '#64748B', fontSize: 8 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={v => `${v}%`} tick={{ fill: '#64748B', fontSize: 8 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#0B111A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '11px' }} formatter={v => [`${v}%`, 'Return']} />
                  <Bar dataKey="return_pct" radius={[1, 1, 0, 0]}>
                    {(riskMetrics?.daily_returns || []).map((entry, i) => (
                      <Cell key={i} fill={entry.return_pct >= 0 ? '#00F29850' : '#EF444450'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </TabsContent>

        {/* P&L Attribution Tab */}
        <TabsContent value="attribution" className="space-y-4">
          {perf?.attribution && (
            <>
              {/* Attribution Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { key: 'trading', label: 'Spot Trading', icon: ArrowUpRight, color: '#00F298', pnl: perf.attribution.trading.pnl, trades: perf.attribution.trading.trades, extra: `Vol: $${perf.attribution.trading.volume?.toLocaleString()}`, winRate: perf.attribution.trading.win_rate },
                  { key: 'predictions', label: 'Prediction Markets', icon: TrendingUp, color: '#3B82F6', pnl: perf.attribution.predictions.pnl, trades: perf.attribution.predictions.positions, extra: `Wins: ${perf.attribution.predictions.wins}`, winRate: perf.attribution.predictions.win_rate },
                  { key: 'carbon', label: 'Carbon Credits', icon: BarChart2, color: '#F59E0B', pnl: perf.attribution.carbon.pnl, trades: perf.attribution.carbon.trades, extra: `Vol: $${perf.attribution.carbon.volume?.toLocaleString()}` },
                ].map((a, i) => (
                  <motion.div key={a.key} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass-card rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 rounded-lg" style={{ background: `${a.color}15` }}><a.icon className="w-4 h-4" style={{ color: a.color }} /></div>
                      <h3 className="text-sm font-medium">{a.label}</h3>
                    </div>
                    <p className="text-2xl font-medium mb-2" style={{ fontFamily: 'Cabinet Grotesk', color: a.pnl >= 0 ? '#00F298' : '#EF4444' }}>
                      {a.pnl >= 0 ? '+' : ''}${a.pnl?.toLocaleString()}
                    </p>
                    <div className="space-y-1 text-xs text-slate-400">
                      <div className="flex justify-between"><span>Trades</span><span>{a.trades}</span></div>
                      {a.winRate !== undefined && <div className="flex justify-between"><span>Win Rate</span><span>{a.winRate}%</span></div>}
                      <div className="flex justify-between"><span>{a.extra?.split(':')[0]}</span><span>{a.extra?.split(':')[1]}</span></div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Monthly Attribution Chart */}
              {breakdown?.monthly_attribution && (
                <div className="glass-card rounded-xl p-5">
                  <h3 className="text-sm font-medium mb-4">Monthly P&L Attribution</h3>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={breakdown.monthly_attribution}>
                        <XAxis dataKey="month" tick={{ fill: '#64748B', fontSize: 9 }} axisLine={false} tickLine={false} />
                        <YAxis tickFormatter={v => `$${v}`} tick={{ fill: '#64748B', fontSize: 9 }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ background: '#0B111A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '11px' }} formatter={v => [`$${v}`, '']} />
                        <Bar dataKey="trading_pnl" fill="#00F298" name="Trading" stackId="a" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="prediction_pnl" fill="#3B82F6" name="Predictions" stackId="a" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="carbon_pnl" fill="#F59E0B" name="Carbon" stackId="a" radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex gap-4 mt-2 text-[10px] text-slate-500">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" />Trading</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400" />Predictions</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400" />Carbon</span>
                  </div>
                </div>
              )}

              {/* Per-Asset Breakdown */}
              {breakdown?.by_asset?.length > 0 && (
                <div className="glass-card rounded-xl p-5">
                  <h3 className="text-sm font-medium mb-3">P&L by Asset</h3>
                  <div className="space-y-2">
                    {breakdown.by_asset.map(a => (
                      <div key={a.symbol} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-medium" style={{ background: `${CATEGORY_COLORS[a.symbol === 'CARBON' ? 'carbon' : a.symbol === 'KWH' ? 'energy' : 'food'] || '#8E9EAD'}15`, color: CATEGORY_COLORS[a.symbol === 'CARBON' ? 'carbon' : a.symbol === 'KWH' ? 'energy' : 'food'] || '#8E9EAD' }}>
                            {a.symbol?.slice(0, 2)}
                          </div>
                          <div><p className="text-sm font-medium">{a.symbol}</p><p className="text-[10px] text-slate-500">{a.trades} trades | ${a.volume?.toLocaleString()} vol</p></div>
                        </div>
                        <span className={`text-sm font-medium ${a.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{a.pnl >= 0 ? '+' : ''}${a.pnl?.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* Holdings Tab */}
        <TabsContent value="holdings" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Allocation Pie */}
            <div className="glass-card rounded-xl p-5">
              <h3 className="text-sm font-medium mb-2">Allocation</h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2} dataKey="value">
                      {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#0B111A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }} formatter={v => `$${v.toLocaleString()}`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-3 justify-center">
                {pieData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-1.5 text-xs text-slate-400">
                    <div className="w-2 h-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />{d.name}
                  </div>
                ))}
              </div>
            </div>
            {/* Holdings Table */}
            <div className="lg:col-span-2 glass-card rounded-xl overflow-hidden">
              <div className="p-4 border-b border-white/5"><h3 className="text-sm font-medium">Holdings</h3></div>
              <div className="overflow-x-auto">
                <table className="w-full" data-testid="holdings-table">
                  <thead><tr className="border-b border-white/10">
                    {['Asset', 'Qty', 'Price', 'Value', '24h'].map(h => <th key={h} className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-slate-400">{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {(portfolio?.holdings || []).map(h => (
                      <tr key={h.symbol} className="border-b border-white/5 hover:bg-white/[0.02]">
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-medium" style={{ background: `${CATEGORY_COLORS[h.category] || '#8E9EAD'}15`, color: CATEGORY_COLORS[h.category] || '#8E9EAD' }}>{h.symbol?.slice(0, 2)}</div>
                            <div><p className="text-sm font-medium">{h.symbol}</p><p className="text-[10px] text-slate-500 capitalize">{h.category}</p></div>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-sm">{h.quantity?.toLocaleString()}</td>
                        <td className="px-4 py-2.5 text-sm">${h.price > 1 ? h.price?.toFixed(2) : h.price?.toFixed(4)}</td>
                        <td className="px-4 py-2.5 text-sm font-medium">${h.value?.toLocaleString()}</td>
                        <td className="px-4 py-2.5"><span className={`text-sm ${(h.change_24h || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{(h.change_24h || 0) >= 0 ? '+' : ''}{h.change_24h?.toFixed(2)}%</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Risk Tab */}
        <TabsContent value="risk" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Drawdown Chart */}
            <div className="lg:col-span-2 glass-card rounded-xl p-5">
              <h3 className="text-sm font-medium mb-4">Drawdown Chart (60d)</h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={riskMetrics?.drawdown_chart || []}>
                    <defs><linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#EF4444" stopOpacity={0.2} /><stop offset="95%" stopColor="#EF4444" stopOpacity={0} /></linearGradient></defs>
                    <XAxis dataKey="date" tickFormatter={d => new Date(d).toLocaleDateString('en', { month: 'short', day: 'numeric' })} tick={{ fill: '#64748B', fontSize: 9 }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={v => `${v}%`} tick={{ fill: '#64748B', fontSize: 9 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: '#0B111A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '11px' }} formatter={v => [`${v}%`, 'Drawdown']} />
                    <Area type="monotone" dataKey="drawdown" stroke="#EF4444" fill="url(#ddGrad)" strokeWidth={1.5} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            {/* Risk Assessment */}
            <div className="space-y-4">
              <div className="glass-card rounded-xl p-5 text-center">
                <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-2">Risk Score</p>
                <div className="relative w-20 h-20 mx-auto">
                  <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 36 36">
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={riskColor} strokeWidth="3" strokeDasharray={`${risk?.risk_score || 0}, 100`} strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center"><span className="text-lg font-medium" style={{ color: riskColor }}>{risk?.risk_score || 0}</span></div>
                </div>
                <p className="text-sm font-medium capitalize mt-2" style={{ color: riskColor }}>{risk?.risk_level} Risk</p>
              </div>
              <div className="glass-card rounded-xl p-5 space-y-2">
                {[
                  { label: 'Max Drawdown', value: `${riskMetrics?.max_drawdown_pct}%`, color: '#EF4444' },
                  { label: 'Ann. Volatility', value: `${riskMetrics?.annualized_volatility_pct}%` },
                  { label: 'Avg Trade P&L', value: `$${riskMetrics?.avg_trade_pnl}` },
                  { label: 'Profit Factor', value: `${riskMetrics?.profit_factor}x` },
                ].map(m => (
                  <div key={m.label} className="flex justify-between text-xs">
                    <span className="text-slate-400">{m.label}</span>
                    <span style={{ color: m.color }}>{m.value}</span>
                  </div>
                ))}
              </div>
              <div className="glass-card rounded-xl p-5">
                <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-2">Recommendations</p>
                <div className="space-y-2">
                  {(risk?.recommendations || []).map((rec, i) => (
                    <p key={i} className="text-xs text-slate-400 flex items-start gap-2">
                      <span className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0" style={{ background: riskColor }} />{rec}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
