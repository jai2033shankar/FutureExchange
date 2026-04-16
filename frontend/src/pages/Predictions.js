import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Clock, BarChart2, DollarSign, Users, Plus, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';

const CAT_COLORS = { carbon_climate: '#00F298', commodities: '#F59E0B', regulation: '#3B82F6', macro_economic: '#8B5CF6', supply_chain: '#06B6D4' };

export default function PredictionsV2() {
  const { apiCall } = useAuth();
  const [markets, setMarkets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState(null);
  const [positions, setPositions] = useState([]);
  const [selectedCat, setSelectedCat] = useState('all');
  const [selectedMarket, setSelectedMarket] = useState(null);
  const [loading, setLoading] = useState(true);

  // Trade form
  const [tradeSide, setTradeSide] = useState('yes');
  const [tradePrice, setTradePrice] = useState('');
  const [tradeQty, setTradeQty] = useState('10');

  useEffect(() => { loadData(); }, [selectedCat]);

  const loadData = async () => {
    try {
      const catParam = selectedCat !== 'all' ? `?category=${selectedCat}` : '';
      const [m, c, s, p] = await Promise.all([
        apiCall('get', `/markets${catParam}`),
        apiCall('get', '/markets/categories'),
        apiCall('get', '/markets/stats'),
        apiCall('get', '/markets/positions'),
      ]);
      setMarkets(m); setCategories(c); setStats(s); setPositions(p);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleTrade = async () => {
    if (!selectedMarket || !tradeQty) return;
    const price = parseFloat(tradePrice) || (tradeSide === 'yes' ? selectedMarket.yes_price : selectedMarket.no_price);
    try {
      const result = await apiCall('post', '/markets/trade', {
        market_id: selectedMarket.id, side: tradeSide, price, quantity: parseInt(tradeQty),
      });
      toast.success(`${tradeSide.toUpperCase()} ${tradeQty} contracts @ $${price.toFixed(2)} — Cost: $${result.cost}`);
      loadData();
      // Refresh selected market
      const updated = await apiCall('get', `/markets/${selectedMarket.id}`);
      setSelectedMarket(updated);
    } catch (e) { toast.error(e.message); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" /></div>;

  return (
    <div data-testid="predictions-v2-page" className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl sm:text-3xl font-medium tracking-tight" style={{ fontFamily: 'Cabinet Grotesk' }}>Prediction Markets</h1>
        <p className="text-sm text-slate-400 mt-1">Trade event contracts on carbon, commodities, regulation, and macro outcomes</p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active Markets', value: stats?.active_markets || 0, icon: BarChart2, color: '#00F298' },
          { label: 'Total Volume', value: `$${((stats?.total_volume || 0) / 1000).toFixed(0)}K`, icon: DollarSign, color: '#3B82F6' },
          { label: 'Total Trades', value: stats?.total_trades || 0, icon: TrendingUp, color: '#F59E0B' },
          { label: 'Open Positions', value: stats?.open_positions || 0, icon: Users, color: '#8B5CF6' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass-card rounded-xl p-4">
            <div className="flex items-start justify-between">
              <div><p className="text-xs uppercase tracking-[0.15em] text-slate-400 mb-1">{s.label}</p><p className="text-xl font-medium" style={{ fontFamily: 'Cabinet Grotesk' }}>{s.value}</p></div>
              <div className="p-2 rounded-lg" style={{ background: `${s.color}15` }}><s.icon className="w-4 h-4" style={{ color: s.color }} strokeWidth={1.5} /></div>
            </div>
          </motion.div>
        ))}
      </div>

      <Tabs defaultValue="browse" className="space-y-4">
        <TabsList className="bg-white/5 border border-white/10 rounded-xl p-1">
          <TabsTrigger value="browse" className="rounded-lg data-[state=active]:bg-white/10 text-xs">Browse Markets</TabsTrigger>
          <TabsTrigger value="positions" className="rounded-lg data-[state=active]:bg-white/10 text-xs">My Positions ({positions.filter(p => p.status === 'open').length})</TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="space-y-4">
          {/* Category Filter */}
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setSelectedCat('all')} className={`px-3 py-1.5 rounded-lg text-xs transition-all ${selectedCat === 'all' ? 'bg-white/10 text-white border border-white/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>All</button>
            {categories.map(c => (
              <button key={c.key} onClick={() => setSelectedCat(c.key)} className={`px-3 py-1.5 rounded-lg text-xs transition-all flex items-center gap-1.5 ${selectedCat === c.key ? 'bg-white/10 text-white border border-white/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                <span className="w-2 h-2 rounded-full" style={{ background: CAT_COLORS[c.key] }} />
                {c.label} ({c.active_markets})
              </button>
            ))}
          </div>

          {/* Markets Grid + Detail */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Market List */}
            <div className="lg:col-span-2 space-y-3">
              {markets.map((m, i) => {
                const isSelected = selectedMarket?.id === m.id;
                return (
                  <motion.div key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                    onClick={() => { setSelectedMarket(m); setTradePrice(m.yes_price.toString()); }}
                    className={`glass-card rounded-xl p-4 cursor-pointer transition-all hover:-translate-y-0.5 ${isSelected ? 'border-emerald-500/20 bg-white/[0.04]' : ''}`}>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="w-2 h-2 rounded-full" style={{ background: CAT_COLORS[m.category] }} />
                          <Badge variant="outline" className="text-[9px] border-white/10 text-slate-400">{m.category_info?.label}</Badge>
                          {m.tags?.slice(0, 2).map(t => <Badge key={t} variant="outline" className="text-[9px] border-white/5 text-slate-500">{t}</Badge>)}
                        </div>
                        <h3 className="text-sm font-medium leading-snug">{m.title}</h3>
                      </div>
                    </div>
                    {/* Price bar */}
                    <div className="mb-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-emerald-400 font-medium">YES ${m.yes_price?.toFixed(2)}</span>
                        <span className="text-red-400 font-medium">NO ${m.no_price?.toFixed(2)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-red-500/20 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${m.yes_price * 100}%`, background: '#00F298' }} />
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-[10px] text-slate-500">
                      <span>${m.total_volume?.toLocaleString()} vol</span>
                      <span>{m.total_trades?.toLocaleString()} trades</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{m.resolution_date ? new Date(m.resolution_date).toLocaleDateString() : ''}</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Trade Panel */}
            <div className="space-y-4">
              {selectedMarket ? (
                <>
                  <div className="glass-card-active rounded-xl p-5">
                    <h3 className="text-sm font-medium mb-1">{selectedMarket.title}</h3>
                    <p className="text-xs text-slate-400 mb-4">{selectedMarket.description}</p>

                    {/* Mini chart */}
                    {selectedMarket.price_history?.length > 0 && (
                      <div className="h-24 mb-4">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={selectedMarket.price_history}>
                            <defs><linearGradient id="pmGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#00F298" stopOpacity={0.15} /><stop offset="95%" stopColor="#00F298" stopOpacity={0} /></linearGradient></defs>
                            <XAxis dataKey="timestamp" tick={false} axisLine={false} />
                            <YAxis domain={[0, 1]} tick={false} axisLine={false} />
                            <Tooltip contentStyle={{ background: '#0B111A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '11px' }} formatter={v => [`$${v?.toFixed(2)}`, 'YES Price']} labelFormatter={() => ''} />
                            <Area type="monotone" dataKey="price" stroke="#00F298" fill="url(#pmGrad)" strokeWidth={1.5} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    )}

                    {/* Buy YES / NO */}
                    <div className="flex gap-2 mb-3">
                      <button data-testid="pm-buy-yes" onClick={() => { setTradeSide('yes'); setTradePrice(selectedMarket.yes_price.toString()); }}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${tradeSide === 'yes' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-white/[0.02] text-slate-400 border border-white/5'}`}>
                        YES ${selectedMarket.yes_price?.toFixed(2)}
                      </button>
                      <button data-testid="pm-buy-no" onClick={() => { setTradeSide('no'); setTradePrice(selectedMarket.no_price.toString()); }}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${tradeSide === 'no' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-white/[0.02] text-slate-400 border border-white/5'}`}>
                        NO ${selectedMarket.no_price?.toFixed(2)}
                      </button>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="text-xs uppercase tracking-[0.15em] text-slate-400 mb-1 block">Price ($0.01 - $0.99)</label>
                        <Input data-testid="pm-price" type="number" step="0.01" min="0.01" max="0.99" value={tradePrice} onChange={e => setTradePrice(e.target.value)} className="glass-input bg-white/5 border-white/10 text-white" />
                      </div>
                      <div>
                        <label className="text-xs uppercase tracking-[0.15em] text-slate-400 mb-1 block">Contracts</label>
                        <Input data-testid="pm-quantity" type="number" min="1" value={tradeQty} onChange={e => setTradeQty(e.target.value)} className="glass-input bg-white/5 border-white/10 text-white" />
                      </div>
                      <div className="py-2 px-3 rounded-lg bg-white/[0.02] border border-white/5 flex justify-between text-sm">
                        <span className="text-slate-400">Cost</span>
                        <span className="font-medium">${(parseFloat(tradePrice || 0) * parseInt(tradeQty || 0)).toFixed(2)}</span>
                      </div>
                      <div className="py-2 px-3 rounded-lg bg-white/[0.02] border border-white/5 flex justify-between text-sm">
                        <span className="text-slate-400">Potential payout</span>
                        <span className="font-medium text-emerald-400">${parseInt(tradeQty || 0).toFixed(2)}</span>
                      </div>
                      <Button data-testid="pm-trade-btn" onClick={handleTrade} className="w-full rounded-xl" style={{ background: tradeSide === 'yes' ? '#00F298' : '#EF4444', color: tradeSide === 'yes' ? '#060B12' : '#fff' }}>
                        Buy {tradeSide.toUpperCase()} {tradeQty} contracts
                      </Button>
                    </div>

                    <div className="mt-3 text-[10px] text-slate-500">
                      <p>Resolution: {selectedMarket.resolution_source}</p>
                      <p>Expires: {selectedMarket.resolution_date ? new Date(selectedMarket.resolution_date).toLocaleDateString() : 'N/A'}</p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="glass-card rounded-xl p-8 text-center">
                  <ShoppingCart className="w-8 h-8 text-slate-600 mx-auto mb-3" />
                  <p className="text-sm text-slate-500">Select a market to trade</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Positions Tab */}
        <TabsContent value="positions" className="space-y-4">
          <div className="glass-card rounded-xl overflow-hidden">
            <div className="p-4 border-b border-white/5"><h3 className="text-sm font-medium">Open Positions</h3></div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b border-white/10">
                  {['Market', 'Side', 'Qty', 'Avg Price', 'Current', 'P&L', 'Status'].map(h => <th key={h} className="text-left px-4 py-2.5 text-[10px] uppercase tracking-[0.2em] text-slate-400">{h}</th>)}
                </tr></thead>
                <tbody>
                  {positions.map(p => (
                    <tr key={p.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="px-4 py-2.5 text-sm max-w-[200px] truncate">{p.market_title}</td>
                      <td className="px-4 py-2.5"><Badge className={`text-xs ${p.side === 'yes' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>{p.side?.toUpperCase()}</Badge></td>
                      <td className="px-4 py-2.5 text-sm">{p.quantity}</td>
                      <td className="px-4 py-2.5 text-sm">${p.avg_price?.toFixed(2)}</td>
                      <td className="px-4 py-2.5 text-sm">${p.current_price?.toFixed(2) || '-'}</td>
                      <td className="px-4 py-2.5">
                        {p.unrealized_pnl !== undefined ? (
                          <span className={`text-sm ${p.unrealized_pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {p.unrealized_pnl >= 0 ? '+' : ''}${p.unrealized_pnl?.toFixed(2)} ({p.pnl_pct}%)
                          </span>
                        ) : <span className="text-sm text-slate-500">${p.pnl?.toFixed(2) || '0'}</span>}
                      </td>
                      <td className="px-4 py-2.5"><Badge variant="outline" className="text-[10px] border-white/10">{p.status}</Badge></td>
                    </tr>
                  ))}
                  {positions.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500 text-sm">No positions yet. Trade a market to get started.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
