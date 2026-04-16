import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Warehouse, Thermometer, Droplets, Weight, Wind, MapPin, Coins, Package, ShieldCheck, AlertTriangle, TrendingUp, ArrowUpRight, ArrowDownRight, Clock } from 'lucide-react';
import { toast } from 'sonner';

const SENSOR_ICONS = { temperature: Thermometer, humidity: Droplets, weight: Weight, air_quality: Wind };
const SENSOR_COLORS = { temperature: '#EF4444', humidity: '#3B82F6', weight: '#F59E0B', air_quality: '#00F298' };
const SEVERITY_COLORS = { critical: '#EF4444', warning: '#F59E0B', info: '#3B82F6' };
const GRADE_COLORS = { A: '#00F298', B: '#3B82F6', C: '#F59E0B' };

export default function IoTWarehouse() {
  const { apiCall } = useAuth();
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWh, setSelectedWh] = useState(null);
  const [sensors, setSensors] = useState([]);
  const [tokenInfo, setTokenInfo] = useState(null);
  const [inventory, setInventory] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [compliance, setCompliance] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadWarehouses(); }, []);
  useEffect(() => { if (selectedWh) loadAll(selectedWh); }, [selectedWh]);

  const loadWarehouses = async () => {
    try {
      const data = await apiCall('get', '/warehouses');
      setWarehouses(data);
      if (data.length) setSelectedWh(data[0].id);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const loadAll = async (whId) => {
    try {
      const [s, t, inv, al, comp, an] = await Promise.all([
        apiCall('get', `/warehouses/${whId}/sensors`),
        apiCall('get', `/warehouses/${whId}/token-info`),
        apiCall('get', `/warehouses/${whId}/inventory`),
        apiCall('get', `/warehouses/${whId}/alerts`),
        apiCall('get', `/warehouses/${whId}/compliance`),
        apiCall('get', `/warehouses/${whId}/analytics`),
      ]);
      setSensors(s); setTokenInfo(t); setInventory(inv);
      setAlerts(al); setCompliance(comp); setAnalytics(an);
    } catch (e) { console.error(e); }
  };

  const handleMint = async (amount) => {
    try {
      await apiCall('post', '/warehouses/tokens/mint', { warehouse_id: selectedWh, amount: parseFloat(amount), reason: 'inventory_deposit' });
      toast.success(`Minted ${amount} receipt tokens`);
      loadAll(selectedWh);
    } catch (e) { toast.error(e.message); }
  };

  const handleBurn = async (amount) => {
    try {
      await apiCall('post', '/warehouses/tokens/burn', { warehouse_id: selectedWh, amount: parseFloat(amount), reason: 'inventory_withdrawal' });
      toast.success(`Burned ${amount} receipt tokens`);
      loadAll(selectedWh);
    } catch (e) { toast.error(e.message); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" /></div>;

  const currentWh = warehouses.find(w => w.id === selectedWh);

  return (
    <div data-testid="iot-warehouse-page" className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl sm:text-3xl font-medium tracking-tight" style={{ fontFamily: 'Cabinet Grotesk' }}>IoT Warehouse Tokenization</h1>
        <p className="text-sm text-slate-400 mt-1">Real-time monitoring, inventory management, and receipt token lifecycle</p>
      </motion.div>

      {/* Warehouse Selector */}
      <div className="flex flex-wrap gap-3">
        {warehouses.map(wh => (
          <button key={wh.id} data-testid={`wh-${wh.id}`} onClick={() => setSelectedWh(wh.id)}
            className={`px-4 py-3 rounded-xl text-left transition-all ${selectedWh === wh.id ? 'glass-card-active' : 'glass-card hover:bg-white/[0.04]'}`}>
            <div className="flex items-center gap-2 mb-1">
              <Warehouse className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-medium">{wh.name}</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-slate-500"><MapPin className="w-3 h-3" />{wh.location}</div>
          </button>
        ))}
      </div>

      {currentWh && (
        <>
          {/* Top Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { label: 'Utilization', value: `${((currentWh.current_utilization / currentWh.capacity) * 100).toFixed(1)}%`, icon: TrendingUp, color: '#00F298' },
              { label: 'Token Supply', value: tokenInfo?.total_supply?.toLocaleString() || '0', icon: Coins, color: '#F59E0B' },
              { label: 'Inventory Lots', value: inventory?.inventory?.length || 0, icon: Package, color: '#3B82F6' },
              { label: 'Compliance', value: `${compliance?.compliance_score || 0}%`, icon: ShieldCheck, color: '#8B5CF6' },
              { label: 'Active Alerts', value: alerts.filter(a => !a.resolved).length, icon: AlertTriangle, color: '#EF4444' },
            ].map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="glass-card rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <div><p className="text-[10px] uppercase tracking-[0.15em] text-slate-400 mb-1">{s.label}</p><p className="text-xl font-medium" style={{ fontFamily: 'Cabinet Grotesk' }}>{s.value}</p></div>
                  <div className="p-2 rounded-lg" style={{ background: `${s.color}15` }}><s.icon className="w-4 h-4" style={{ color: s.color }} strokeWidth={1.5} /></div>
                </div>
              </motion.div>
            ))}
          </div>

          <Tabs defaultValue="sensors" className="space-y-4">
            <TabsList className="bg-white/5 border border-white/10 rounded-xl p-1">
              <TabsTrigger value="sensors" className="rounded-lg data-[state=active]:bg-white/10 text-xs">Sensors</TabsTrigger>
              <TabsTrigger value="tokens" className="rounded-lg data-[state=active]:bg-white/10 text-xs">Tokens</TabsTrigger>
              <TabsTrigger value="inventory" className="rounded-lg data-[state=active]:bg-white/10 text-xs">Inventory</TabsTrigger>
              <TabsTrigger value="alerts" className="rounded-lg data-[state=active]:bg-white/10 text-xs">Alerts ({alerts.length})</TabsTrigger>
              <TabsTrigger value="compliance" className="rounded-lg data-[state=active]:bg-white/10 text-xs">Compliance</TabsTrigger>
              <TabsTrigger value="analytics" className="rounded-lg data-[state=active]:bg-white/10 text-xs">Analytics</TabsTrigger>
            </TabsList>

            {/* Sensors Tab */}
            <TabsContent value="sensors">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sensors.map((sensor, i) => {
                  const Icon = SENSOR_ICONS[sensor.type] || Thermometer;
                  const color = SENSOR_COLORS[sensor.type] || '#8E9EAD';
                  return (
                    <motion.div key={sensor.sensor_id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass-card rounded-xl p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg" style={{ background: `${color}15` }}><Icon className="w-5 h-5" style={{ color }} /></div>
                          <div><p className="text-sm font-medium capitalize">{sensor.type.replace(/_/g, ' ')}</p><p className="text-[10px] text-slate-500 font-mono">{sensor.sensor_id}</p></div>
                        </div>
                        <Badge variant="outline" className={`text-[10px] ${sensor.status === 'normal' ? 'border-emerald-500/20 text-emerald-400' : 'border-yellow-500/20 text-yellow-400'}`}>{sensor.status}</Badge>
                      </div>
                      <p className="text-3xl font-medium text-center mb-3" style={{ fontFamily: 'Cabinet Grotesk', color }}>{sensor.value} <span className="text-sm text-slate-500">{sensor.unit}</span></p>
                      <div className="h-20">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={sensor.history || []}>
                            <XAxis dataKey="timestamp" tick={false} axisLine={false} />
                            <YAxis tick={false} axisLine={false} domain={['auto', 'auto']} />
                            <Tooltip contentStyle={{ background: '#0B111A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '11px' }} labelFormatter={() => ''} />
                            <Line type="monotone" dataKey="value" stroke={color} strokeWidth={1.5} dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </TabsContent>

            {/* Tokens Tab */}
            <TabsContent value="tokens">
              {tokenInfo && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-2 space-y-4">
                    {/* Token Overview */}
                    <div className="glass-card rounded-xl p-5">
                      <h3 className="text-sm font-medium mb-4">Receipt Token — {tokenInfo.token_symbol}</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div><p className="text-[10px] uppercase tracking-wider text-slate-400">Total Supply</p><p className="text-lg font-medium" style={{ fontFamily: 'Cabinet Grotesk' }}>{tokenInfo.total_supply?.toLocaleString()}</p></div>
                        <div><p className="text-[10px] uppercase tracking-wider text-slate-400">Circulating</p><p className="text-lg font-medium text-emerald-400">{tokenInfo.circulating_supply?.toLocaleString()}</p></div>
                        <div><p className="text-[10px] uppercase tracking-wider text-slate-400">Locked</p><p className="text-lg font-medium text-yellow-400">{tokenInfo.locked_supply?.toLocaleString()}</p></div>
                        <div><p className="text-[10px] uppercase tracking-wider text-slate-400">Market Cap</p><p className="text-lg font-medium">${tokenInfo.market_cap?.toLocaleString()}</p></div>
                      </div>
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden flex">
                        <div className="h-full" style={{ width: `${(tokenInfo.circulating_supply / tokenInfo.total_supply * 100)}%`, background: '#00F298' }} />
                        <div className="h-full" style={{ width: `${(tokenInfo.locked_supply / tokenInfo.total_supply * 100)}%`, background: '#F59E0B' }} />
                      </div>
                      <div className="flex gap-4 mt-2 text-[10px] text-slate-500">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" />Circulating</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400" />Locked</span>
                      </div>
                    </div>
                    {/* Holders */}
                    <div className="glass-card rounded-xl p-5">
                      <h3 className="text-sm font-medium mb-3">Token Holders</h3>
                      <div className="space-y-2">
                        {tokenInfo.holders?.map((h, i) => (
                          <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                            <div className="flex items-center gap-3">
                              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-medium" style={{ background: '#14223A', color: '#00F298' }}>{i + 1}</div>
                              <div><p className="text-sm">{h.name}</p><p className="text-[10px] font-mono text-slate-500">{h.address?.slice(0, 14)}...</p></div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium">{h.balance?.toLocaleString()}</p>
                              <p className="text-[10px] text-slate-500">{tokenInfo.total_supply > 0 ? (h.balance / tokenInfo.total_supply * 100).toFixed(1) : 0}%</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  {/* Mint/Burn + Events */}
                  <div className="space-y-4">
                    <TokenActionPanel onMint={handleMint} onBurn={handleBurn} />
                    <div className="glass-card rounded-xl p-5">
                      <h3 className="text-sm font-medium mb-3">Recent Events</h3>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {tokenInfo.recent_events?.map(e => (
                          <div key={e.id} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                            <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold ${e.type === 'mint' ? 'bg-emerald-500/15 text-emerald-400' : e.type === 'burn' ? 'bg-red-500/15 text-red-400' : 'bg-blue-500/15 text-blue-400'}`}>
                              {e.type === 'mint' ? '+' : e.type === 'burn' ? '-' : '→'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs truncate">{e.type.toUpperCase()} {e.amount?.toLocaleString()}</p>
                              <p className="text-[10px] text-slate-500">{e.by_user}</p>
                            </div>
                            <p className="text-[10px] font-mono text-slate-500">{e.tx_hash?.slice(0, 10)}...</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Inventory Tab */}
            <TabsContent value="inventory">
              {inventory && (
                <div className="space-y-4">
                  {/* Summary Cards */}
                  <div className="flex flex-wrap gap-3">
                    {inventory.summary?.map(s => (
                      <div key={s.asset_symbol} className="glass-card rounded-xl px-5 py-4">
                        <p className="text-[10px] uppercase tracking-wider text-slate-400">{s.asset_symbol}</p>
                        <p className="text-lg font-medium" style={{ fontFamily: 'Cabinet Grotesk' }}>{s.total_quantity?.toLocaleString()}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className="text-[9px]" style={{ background: `${GRADE_COLORS[s.primary_grade]}15`, color: GRADE_COLORS[s.primary_grade] }}>Grade {s.primary_grade}</Badge>
                          <span className="text-[10px] text-slate-500">{s.lots} lots</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Inventory Table */}
                  <div className="glass-card rounded-xl overflow-hidden">
                    <div className="p-4 border-b border-white/5"><h3 className="text-sm font-medium">Inventory Lots</h3></div>
                    <div className="overflow-x-auto">
                      <table className="w-full" data-testid="inventory-table">
                        <thead><tr className="border-b border-white/10">
                          {['Lot #', 'Asset', 'Qty', 'Grade', 'Value', 'Deposited By', 'Date', 'Status'].map(h => <th key={h} className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-slate-400">{h}</th>)}
                        </tr></thead>
                        <tbody>
                          {inventory.inventory?.map(inv => (
                            <tr key={inv.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                              <td className="px-4 py-2.5 text-xs font-mono">{inv.lot_number}</td>
                              <td className="px-4 py-2.5"><Badge variant="outline" className="text-xs border-white/10">{inv.asset_symbol}</Badge></td>
                              <td className="px-4 py-2.5 text-sm">{inv.quantity?.toLocaleString()}</td>
                              <td className="px-4 py-2.5"><Badge className="text-[10px]" style={{ background: `${GRADE_COLORS[inv.grade] || '#8E9EAD'}15`, color: GRADE_COLORS[inv.grade] || '#8E9EAD' }}>Grade {inv.grade}</Badge></td>
                              <td className="px-4 py-2.5 text-sm">${inv.value?.toLocaleString()}</td>
                              <td className="px-4 py-2.5 text-xs text-slate-400">{inv.deposited_by}</td>
                              <td className="px-4 py-2.5 text-[10px] text-slate-500">{inv.deposit_date ? new Date(inv.deposit_date).toLocaleDateString() : ''}</td>
                              <td className="px-4 py-2.5">
                                <Badge variant="outline" className={`text-[10px] ${inv.status === 'stored' ? 'border-emerald-500/20 text-emerald-400' : 'border-slate-500/20 text-slate-400'}`}>{inv.tokenized ? 'Tokenized' : inv.status}</Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Alerts Tab */}
            <TabsContent value="alerts">
              <div className="space-y-3">
                {alerts.map((a, i) => (
                  <motion.div key={a.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                    className="glass-card rounded-xl p-4 flex items-start gap-4">
                    <div className="p-2 rounded-lg" style={{ background: `${SEVERITY_COLORS[a.severity]}15` }}>
                      <AlertTriangle className="w-4 h-4" style={{ color: SEVERITY_COLORS[a.severity] }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className="text-[9px]" style={{ background: `${SEVERITY_COLORS[a.severity]}15`, color: SEVERITY_COLORS[a.severity] }}>{a.severity}</Badge>
                        <span className="text-xs capitalize text-slate-400">{a.type}</span>
                      </div>
                      <p className="text-sm">{a.message}</p>
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-500">
                        <span>{a.timestamp ? new Date(a.timestamp).toLocaleString() : ''}</span>
                        {a.tx_hash && <span className="font-mono">TX: {a.tx_hash?.slice(0, 12)}...</span>}
                      </div>
                    </div>
                    <Badge variant="outline" className={`text-[10px] ${a.resolved ? 'border-emerald-500/20 text-emerald-400' : 'border-red-500/20 text-red-400'}`}>
                      {a.resolved ? 'Resolved' : 'Open'}
                    </Badge>
                  </motion.div>
                ))}
                {alerts.length === 0 && <div className="text-center py-12 text-slate-500 text-sm">No alerts recorded</div>}
              </div>
            </TabsContent>

            {/* Compliance Tab */}
            <TabsContent value="compliance">
              {compliance && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-2 space-y-4">
                    <div className="glass-card rounded-xl p-5">
                      <h3 className="text-sm font-medium mb-4">Certifications</h3>
                      <div className="space-y-3">
                        {compliance.certifications?.map((c, i) => (
                          <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                            <div className="flex items-center gap-3">
                              <ShieldCheck className="w-4 h-4 text-emerald-400" />
                              <span className="text-sm">{c.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[10px] border-emerald-500/20 text-emerald-400">{c.status}</Badge>
                              <span className="text-[10px] text-slate-500">Exp: {c.expires}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="glass-card rounded-xl p-5 text-center">
                      <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-2">Compliance Score</p>
                      <p className="text-4xl font-medium" style={{ fontFamily: 'Cabinet Grotesk', color: compliance.compliance_score >= 90 ? '#00F298' : '#F59E0B' }}>{compliance.compliance_score}%</p>
                    </div>
                    <div className="glass-card rounded-xl p-5 space-y-2">
                      <div className="flex justify-between text-xs"><span className="text-slate-400">Region</span><span>{compliance.region}</span></div>
                      <div className="flex justify-between text-xs"><span className="text-slate-400">Last Audit</span><span>{compliance.last_audit ? new Date(compliance.last_audit).toLocaleDateString() : ''}</span></div>
                      <div className="flex justify-between text-xs"><span className="text-slate-400">Next Audit</span><span>{compliance.next_audit ? new Date(compliance.next_audit).toLocaleDateString() : ''}</span></div>
                      <div className="flex justify-between text-xs"><span className="text-slate-400">Insurance</span><span className="text-emerald-400">{compliance.insurance_coverage}</span></div>
                      <div className="flex justify-between text-xs"><span className="text-slate-400">Fire Safety</span><span>{compliance.fire_safety_rating}</span></div>
                      <div className="flex justify-between text-xs"><span className="text-slate-400">Pest Control</span><span className="text-emerald-400">{compliance.pest_control_status}</span></div>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics">
              {analytics && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="glass-card rounded-xl p-5">
                    <h3 className="text-sm font-medium mb-4">Utilization Trend (30d)</h3>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={analytics.utilization_trend}>
                          <defs><linearGradient id="utilGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#00F298" stopOpacity={0.15} /><stop offset="95%" stopColor="#00F298" stopOpacity={0} /></linearGradient></defs>
                          <XAxis dataKey="date" tickFormatter={d => new Date(d).toLocaleDateString('en', { month: 'short', day: 'numeric' })} tick={{ fill: '#64748B', fontSize: 9 }} axisLine={false} tickLine={false} />
                          <YAxis tickFormatter={v => `${v}%`} tick={{ fill: '#64748B', fontSize: 9 }} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={{ background: '#0B111A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '11px' }} />
                          <Area type="monotone" dataKey="utilization_pct" stroke="#00F298" fill="url(#utilGrad)" strokeWidth={1.5} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="glass-card rounded-xl p-5">
                    <h3 className="text-sm font-medium mb-4">Token Value Trend (30d)</h3>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={analytics.value_trend}>
                          <XAxis dataKey="date" tickFormatter={d => new Date(d).toLocaleDateString('en', { month: 'short', day: 'numeric' })} tick={{ fill: '#64748B', fontSize: 9 }} axisLine={false} tickLine={false} />
                          <YAxis tickFormatter={v => `$${v.toFixed(2)}`} tick={{ fill: '#64748B', fontSize: 9 }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                          <Tooltip contentStyle={{ background: '#0B111A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '11px' }} />
                          <Line type="monotone" dataKey="token_price" stroke="#F59E0B" strokeWidth={1.5} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="glass-card rounded-xl p-5 lg:col-span-2">
                    <h3 className="text-sm font-medium mb-4">Deposit / Withdrawal Activity (14d)</h3>
                    <div className="h-40">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analytics.activity}>
                          <XAxis dataKey="date" tickFormatter={d => new Date(d).toLocaleDateString('en', { day: 'numeric' })} tick={{ fill: '#64748B', fontSize: 9 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: '#64748B', fontSize: 9 }} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={{ background: '#0B111A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '11px' }} />
                          <Bar dataKey="deposits" fill="#00F298" radius={[2, 2, 0, 0]} />
                          <Bar dataKey="withdrawals" fill="#EF4444" radius={[2, 2, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

function TokenActionPanel({ onMint, onBurn }) {
  const [mintAmt, setMintAmt] = useState('100');
  const [burnAmt, setBurnAmt] = useState('50');
  return (
    <div className="glass-card-active rounded-xl p-5 space-y-4">
      <h3 className="text-sm font-medium">Token Actions</h3>
      <div>
        <label className="text-[10px] uppercase tracking-wider text-slate-400 mb-1 block">Mint Tokens</label>
        <div className="flex gap-2">
          <Input data-testid="mint-amount" type="number" value={mintAmt} onChange={e => setMintAmt(e.target.value)} className="glass-input bg-white/5 border-white/10 text-white flex-1" />
          <Button data-testid="mint-btn" onClick={() => onMint(mintAmt)} size="sm" className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30"><ArrowUpRight className="w-4 h-4" /></Button>
        </div>
      </div>
      <div>
        <label className="text-[10px] uppercase tracking-wider text-slate-400 mb-1 block">Burn Tokens</label>
        <div className="flex gap-2">
          <Input data-testid="burn-amount" type="number" value={burnAmt} onChange={e => setBurnAmt(e.target.value)} className="glass-input bg-white/5 border-white/10 text-white flex-1" />
          <Button data-testid="burn-btn" onClick={() => onBurn(burnAmt)} size="sm" className="bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30"><ArrowDownRight className="w-4 h-4" /></Button>
        </div>
      </div>
    </div>
  );
}
