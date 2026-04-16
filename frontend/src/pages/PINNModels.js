import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ScatterChart, Scatter, CartesianGrid } from 'recharts';
import { Brain, TrendingUp, Activity, BarChart2, Zap } from 'lucide-react';

export default function PINNModels() {
  const { apiCall } = useAuth();
  const [models, setModels] = useState(null);
  const [selectedAsset, setSelectedAsset] = useState('CARBON');
  const [forecast, setForecast] = useState(null);
  const [equilibrium, setEquilibrium] = useState(null);
  const [volSurface, setVolSurface] = useState(null);
  const [carbonForecast, setCarbonForecast] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadModels(); }, []);
  useEffect(() => { if (selectedAsset) loadAssetModels(); }, [selectedAsset]);

  const loadModels = async () => {
    try { setModels(await apiCall('get', '/pinn/models')); } catch {} finally { setLoading(false); }
  };

  const loadAssetModels = async () => {
    try {
      const [f, e, v, c] = await Promise.all([
        apiCall('get', `/pinn/forecast/${selectedAsset}?horizon_days=30&scenarios=5`),
        apiCall('get', `/pinn/equilibrium/${selectedAsset}`),
        apiCall('get', `/pinn/volatility-surface/${selectedAsset}`),
        selectedAsset === 'CARBON' ? apiCall('get', '/pinn/carbon-forecast?horizon_days=60') : Promise.resolve(null),
      ]);
      setForecast(f); setEquilibrium(e); setVolSurface(v); setCarbonForecast(c);
    } catch (e) { console.error(e); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" /></div>;

  const SIGNAL_COLORS = { OVERVALUED: '#EF4444', UNDERVALUED: '#00F298', FAIR: '#3B82F6' };

  return (
    <div data-testid="pinn-models-page" className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-medium tracking-tight" style={{ fontFamily: 'Cabinet Grotesk' }}>PINN Deterministic Models</h1>
            <p className="text-sm text-slate-400 mt-1">Physics-Informed Neural Network price forecasting with bounded volatility</p>
          </div>
          <Select value={selectedAsset} onValueChange={setSelectedAsset}>
            <SelectTrigger data-testid="pinn-asset-select" className="w-40 glass-input bg-white/5 border-white/10 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#0B111A] border-white/10">
              {['CARBON', 'RICE', 'WHEAT', 'KWH', 'H2O'].map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </motion.div>

      {/* Model Cards */}
      {models && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {models.models.map((m, i) => (
            <motion.div key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass-card rounded-xl p-4">
              <Brain className="w-4 h-4 text-emerald-400 mb-2" />
              <h3 className="text-sm font-medium mb-1">{m.name}</h3>
              <p className="text-xs text-slate-500 mb-2">{m.type}</p>
              <Badge variant="outline" className="text-[9px] border-white/10 text-slate-400 font-mono">{m.pde}</Badge>
            </motion.div>
          ))}
        </div>
      )}

      <Tabs defaultValue="forecast" className="space-y-4">
        <TabsList className="bg-white/5 border border-white/10 rounded-xl p-1">
          <TabsTrigger value="forecast" className="rounded-lg data-[state=active]:bg-white/10 text-xs">Price Forecast</TabsTrigger>
          <TabsTrigger value="equilibrium" className="rounded-lg data-[state=active]:bg-white/10 text-xs">Equilibrium</TabsTrigger>
          <TabsTrigger value="volatility" className="rounded-lg data-[state=active]:bg-white/10 text-xs">Vol Surface</TabsTrigger>
          {selectedAsset === 'CARBON' && <TabsTrigger value="carbon" className="rounded-lg data-[state=active]:bg-white/10 text-xs">Carbon Policy</TabsTrigger>}
        </TabsList>

        {/* Forecast Tab */}
        <TabsContent value="forecast" className="space-y-4">
          {forecast && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              <div className="lg:col-span-3 glass-card rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium">{forecast.asset} — {forecast.model}</h3>
                  <Badge variant="outline" className="text-[10px] font-mono border-white/10">{forecast.parameters?.pde?.slice(0, 40)}</Badge>
                </div>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={forecast.forecast}>
                      <defs>
                        <linearGradient id="ciGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#00F298" stopOpacity={0.1} /><stop offset="95%" stopColor="#00F298" stopOpacity={0} /></linearGradient>
                      </defs>
                      <XAxis dataKey="date" tickFormatter={d => new Date(d).toLocaleDateString('en', { month: 'short', day: 'numeric' })} tick={{ fill: '#64748B', fontSize: 9 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#64748B', fontSize: 9 }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                      <Tooltip contentStyle={{ background: '#0B111A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '11px' }} />
                      <Area type="monotone" dataKey="ci_upper" stroke="transparent" fill="#00F298" fillOpacity={0.05} />
                      <Area type="monotone" dataKey="ci_lower" stroke="transparent" fill="transparent" />
                      <Line type="monotone" dataKey="bull" stroke="#00F298" strokeWidth={1} strokeDasharray="4 2" dot={false} opacity={0.4} />
                      <Line type="monotone" dataKey="bear" stroke="#EF4444" strokeWidth={1} strokeDasharray="4 2" dot={false} opacity={0.4} />
                      <Line type="monotone" dataKey="base" stroke="#00F298" strokeWidth={2} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center gap-4 mt-2 text-[10px] text-slate-500">
                  <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-emerald-400 rounded" />Base</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-emerald-400/40 rounded border-dashed" style={{ borderTop: '1px dashed #00F298' }} />Bull</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-red-400/40 rounded" style={{ borderTop: '1px dashed #EF4444' }} />Bear</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-emerald-400/5 rounded" />95% CI</span>
                </div>
              </div>
              {/* Summary panel */}
              <div className="space-y-4">
                <div className="glass-card rounded-xl p-5">
                  <p className="text-xs uppercase tracking-[0.15em] text-slate-400 mb-2">30-Day Target</p>
                  <p className="text-2xl font-medium" style={{ fontFamily: 'Cabinet Grotesk', color: '#00F298' }}>${forecast.summary?.target_price_30d}</p>
                  <p className={`text-sm mt-1 ${forecast.summary?.expected_return_pct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {forecast.summary?.expected_return_pct >= 0 ? '+' : ''}{forecast.summary?.expected_return_pct}%
                  </p>
                </div>
                <div className="glass-card rounded-xl p-5 space-y-2">
                  <div className="flex justify-between text-xs"><span className="text-slate-400">Upside</span><span className="text-emerald-400">+{forecast.summary?.max_upside_pct}%</span></div>
                  <div className="flex justify-between text-xs"><span className="text-slate-400">Downside</span><span className="text-red-400">{forecast.summary?.max_downside_pct}%</span></div>
                  <div className="flex justify-between text-xs"><span className="text-slate-400">Half-life</span><span>{forecast.summary?.mean_reversion_half_life_days}d</span></div>
                  <div className="flex justify-between text-xs"><span className="text-slate-400">kappa</span><span className="font-mono">{forecast.parameters?.mean_reversion_speed}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-slate-400">sigma</span><span className="font-mono">{forecast.parameters?.volatility}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-slate-400">Confidence</span><span>{forecast.summary?.model_confidence}</span></div>
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Equilibrium Tab */}
        <TabsContent value="equilibrium" className="space-y-4">
          {equilibrium && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 glass-card rounded-xl p-5">
                <h3 className="text-sm font-medium mb-4">Supply-Demand Equilibrium</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={equilibrium.curves}>
                      <XAxis dataKey="price" tick={{ fill: '#64748B', fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v > 1 ? v.toFixed(0) : v.toFixed(3)}`} />
                      <YAxis tick={{ fill: '#64748B', fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
                      <Tooltip contentStyle={{ background: '#0B111A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '11px' }} />
                      <Line type="monotone" dataKey="supply" stroke="#3B82F6" strokeWidth={2} dot={false} name="Supply" />
                      <Line type="monotone" dataKey="demand" stroke="#EF4444" strokeWidth={2} dot={false} name="Demand" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="space-y-4">
                <div className="glass-card rounded-xl p-5 text-center">
                  <p className="text-xs uppercase tracking-[0.15em] text-slate-400 mb-2">Fair Value</p>
                  <p className="text-3xl font-medium" style={{ fontFamily: 'Cabinet Grotesk' }}>${equilibrium.equilibrium_price > 1 ? equilibrium.equilibrium_price?.toFixed(2) : equilibrium.equilibrium_price?.toFixed(4)}</p>
                  <Badge className="mt-2 text-xs" style={{ background: `${SIGNAL_COLORS[equilibrium.price_signal]}15`, color: SIGNAL_COLORS[equilibrium.price_signal] }}>
                    {equilibrium.price_signal} ({equilibrium.deviation_from_equilibrium_pct > 0 ? '+' : ''}{equilibrium.deviation_from_equilibrium_pct}%)
                  </Badge>
                </div>
                <div className="glass-card rounded-xl p-5 space-y-2">
                  <div className="flex justify-between text-xs"><span className="text-slate-400">Current</span><span>${equilibrium.current_price > 1 ? equilibrium.current_price?.toFixed(2) : equilibrium.current_price?.toFixed(4)}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-slate-400">Eq. Quantity</span><span>{equilibrium.equilibrium_quantity?.toLocaleString()}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-slate-400">Supply Elast.</span><span>{equilibrium.supply_elasticity}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-slate-400">Demand Elast.</span><span>{equilibrium.demand_elasticity}</span></div>
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Volatility Surface Tab */}
        <TabsContent value="volatility" className="space-y-4">
          {volSurface && (
            <div className="glass-card rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium">Implied Volatility Surface</h3>
                <Badge variant="outline" className="text-[10px] border-white/10">ATM Vol: {volSurface.atm_vol}%</Badge>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider text-slate-400">Strike</th>
                      {volSurface.expiries?.map(e => <th key={e} className="text-center px-3 py-2 text-[10px] uppercase tracking-wider text-slate-400">{e}d</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {volSurface.strikes?.map(strike => (
                      <tr key={strike} className="border-b border-white/5">
                        <td className="px-3 py-2 text-xs font-mono">${strike > 1 ? strike.toFixed(2) : strike.toFixed(4)}</td>
                        {volSurface.expiries?.map(exp => {
                          const cell = volSurface.surface?.find(s => s.strike === strike && s.expiry_days === exp);
                          const vol = cell?.implied_vol || 0;
                          const intensity = Math.min(vol / (volSurface.atm_vol * 2), 1);
                          return (
                            <td key={exp} className="text-center px-3 py-2 text-xs" style={{ background: `rgba(0,242,152,${intensity * 0.15})`, color: intensity > 0.5 ? '#00F298' : '#8E9EAD' }}>
                              {vol.toFixed(1)}%
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Carbon Policy Tab */}
        {selectedAsset === 'CARBON' && carbonForecast && (
          <TabsContent value="carbon" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 glass-card rounded-xl p-5">
                <h3 className="text-sm font-medium mb-4">Carbon Price — Regime-Aware Forecast (60d)</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={carbonForecast.forecast}>
                      <defs><linearGradient id="carbonGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#00F298" stopOpacity={0.1} /><stop offset="95%" stopColor="#00F298" stopOpacity={0} /></linearGradient></defs>
                      <XAxis dataKey="date" tickFormatter={d => new Date(d).toLocaleDateString('en', { month: 'short', day: 'numeric' })} tick={{ fill: '#64748B', fontSize: 9 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#64748B', fontSize: 9 }} axisLine={false} tickLine={false} domain={['auto', 'auto']} tickFormatter={v => `$${v}`} />
                      <Tooltip contentStyle={{ background: '#0B111A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '11px' }} formatter={v => [`$${v?.toFixed(2)}`, '']} />
                      <Area type="monotone" dataKey="ci_upper" stroke="transparent" fill="#00F298" fillOpacity={0.05} />
                      <Area type="monotone" dataKey="ci_lower" stroke="transparent" fill="transparent" />
                      <Line type="monotone" dataKey="price" stroke="#00F298" strokeWidth={2} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="space-y-4">
                <div className="glass-card rounded-xl p-5">
                  <p className="text-xs uppercase tracking-[0.15em] text-slate-400 mb-2">Policy Regime</p>
                  <Badge className="text-xs bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">Tightening (+{((carbonForecast.regime_factor - 1) * 100).toFixed(0)}%)</Badge>
                  <p className="text-xs text-slate-500 mt-2">Target: ${carbonForecast.target_price}</p>
                </div>
                <div className="glass-card rounded-xl p-5">
                  <p className="text-xs uppercase tracking-[0.15em] text-slate-400 mb-3">Policy Scenarios</p>
                  {carbonForecast.policy_scenarios?.map(p => (
                    <div key={p.name} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
                      <div>
                        <p className="text-xs">{p.name}</p>
                        <p className="text-[10px] text-slate-500">{(p.probability * 100).toFixed(0)}% probability</p>
                      </div>
                      <span className={`text-xs font-medium ${p.direction === 'up' ? 'text-emerald-400' : 'text-red-400'}`}>
                        {p.price_impact_pct > 0 ? '+' : ''}{p.price_impact_pct}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
