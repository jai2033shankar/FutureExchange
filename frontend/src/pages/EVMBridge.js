import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowLeftRight, Globe, Zap, FileCode, Fuel, CheckCircle2, Clock, XCircle, ArrowRight, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

const CHAIN_COLORS = { e4n_l2: '#00F298', ethereum: '#627EEA', arbitrum: '#28A0F0', avalanche: '#E84142' };
const STATUS_CONFIG = { completed: { color: '#00F298', icon: CheckCircle2 }, pending: { color: '#F59E0B', icon: Clock }, processing: { color: '#3B82F6', icon: Clock }, failed: { color: '#EF4444', icon: XCircle } };

export default function EVMBridge() {
  const { apiCall } = useAuth();
  const [chains, setChains] = useState([]);
  const [stats, setStats] = useState(null);
  const [gasOracle, setGasOracle] = useState(null);
  const [transfers, setTransfers] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [deployments, setDeployments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Bridge form
  const [srcChain, setSrcChain] = useState('e4n_l2');
  const [dstChain, setDstChain] = useState('ethereum');
  const [bridgeAsset, setBridgeAsset] = useState('CARBON');
  const [bridgeAmount, setBridgeAmount] = useState('100');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [c, s, g, t, tp, d] = await Promise.all([
        apiCall('get', '/evm/chains'),
        apiCall('get', '/evm/bridge/stats'),
        apiCall('get', '/evm/gas-oracle'),
        apiCall('get', '/evm/bridge/transfers/all'),
        apiCall('get', '/evm/contracts/templates'),
        apiCall('get', '/evm/contracts/deployments'),
      ]);
      setChains(c); setStats(s); setGasOracle(g);
      setTransfers(t); setTemplates(tp); setDeployments(d);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleBridge = async () => {
    if (!bridgeAmount || parseFloat(bridgeAmount) <= 0) return;
    try {
      const result = await apiCall('post', '/evm/bridge/transfer', {
        asset_symbol: bridgeAsset, amount: parseFloat(bridgeAmount),
        source_chain: srcChain, dest_chain: dstChain,
      });
      toast.success(`Bridge initiated: ${bridgeAmount} ${bridgeAsset} → ${result.dest_chain_name}`);
      loadData();
    } catch (e) { toast.error(e.message); }
  };

  const handleDeploy = async (contractType) => {
    try {
      const result = await apiCall('post', '/evm/contracts/deploy', { contract_type: contractType, chain: 'e4n_l2' });
      toast.success(`Deployed ${result.contract_name} at ${result.address?.slice(0, 14)}...`);
      loadData();
    } catch (e) { toast.error(e.message); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" /></div>;

  // Gas comparison chart data
  const gasChartData = gasOracle?.comparison?.map(c => ({
    operation: c.operation.replace(/_/g, ' '),
    E4N: c.e4n_l2?.usd || 0,
    Ethereum: c.ethereum?.usd || 0,
    Arbitrum: c.arbitrum?.usd || 0,
    Avalanche: c.avalanche?.usd || 0,
  })) || [];

  return (
    <div data-testid="evm-bridge-page" className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl sm:text-3xl font-medium tracking-tight" style={{ fontFamily: 'Cabinet Grotesk' }}>EVM Bridge & Contracts</h1>
        <p className="text-sm text-slate-400 mt-1">Cross-chain asset transfers, gas oracle, and smart contract deployment</p>
      </motion.div>

      {/* Chain Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {chains.map((c, i) => (
          <motion.div key={c.chain_id + c.name} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="glass-card rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full" style={{ background: CHAIN_COLORS[Object.keys(CHAIN_COLORS)[i]] || '#8E9EAD' }} />
              <span className="text-sm font-medium">{c.name}</span>
            </div>
            <div className="space-y-1 text-[10px] text-slate-400">
              <div className="flex justify-between"><span>Type</span><span className="text-slate-300">{c.type}</span></div>
              <div className="flex justify-between"><span>Block Time</span><span className="text-slate-300">{c.block_time}s</span></div>
              <div className="flex justify-between"><span>Finality</span><span className="text-slate-300">{c.finality} blocks</span></div>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {c.features?.slice(0, 2).map(f => <Badge key={f} variant="outline" className="text-[8px] border-white/5 text-slate-500">{f}</Badge>)}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Stats Bar */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Transfers', value: stats.total_transfers, color: '#00F298' },
            { label: 'Volume', value: `$${(stats.total_volume_usd / 1000).toFixed(0)}K`, color: '#3B82F6' },
            { label: 'Pending', value: stats.pending_transfers, color: '#F59E0B' },
            { label: 'Supported Assets', value: stats.supported_assets?.length || 0, color: '#8B5CF6' },
          ].map((s, i) => (
            <div key={s.label} className="glass-card rounded-xl p-3 flex items-center gap-3">
              <div className="w-1 h-8 rounded-full" style={{ background: s.color }} />
              <div><p className="text-[10px] uppercase tracking-wider text-slate-400">{s.label}</p><p className="text-lg font-medium" style={{ fontFamily: 'Cabinet Grotesk' }}>{s.value}</p></div>
            </div>
          ))}
        </div>
      )}

      <Tabs defaultValue="bridge" className="space-y-4">
        <TabsList className="bg-white/5 border border-white/10 rounded-xl p-1">
          <TabsTrigger value="bridge" className="rounded-lg data-[state=active]:bg-white/10 text-xs">Bridge</TabsTrigger>
          <TabsTrigger value="gas" className="rounded-lg data-[state=active]:bg-white/10 text-xs">Gas Oracle</TabsTrigger>
          <TabsTrigger value="contracts" className="rounded-lg data-[state=active]:bg-white/10 text-xs">Contracts ({deployments.length})</TabsTrigger>
          <TabsTrigger value="history" className="rounded-lg data-[state=active]:bg-white/10 text-xs">History ({transfers.length})</TabsTrigger>
        </TabsList>

        {/* Bridge Tab */}
        <TabsContent value="bridge">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Bridge Form */}
            <div className="glass-card-active rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-medium flex items-center gap-2"><ArrowLeftRight className="w-4 h-4 text-emerald-400" /> Cross-Chain Transfer</h3>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-slate-400 mb-1 block">Source Chain</label>
                <Select value={srcChain} onValueChange={setSrcChain}>
                  <SelectTrigger data-testid="bridge-src" className="glass-input bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#0B111A] border-white/10">
                    {Object.entries(CHAIN_COLORS).map(([k, c]) => <SelectItem key={k} value={k}><span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ background: c }} />{chains.find(ch => ch.name.toLowerCase().includes(k.replace('_', ' ')))?.name || k}</span></SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-center"><ChevronRight className="w-5 h-5 text-slate-500 rotate-90" /></div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-slate-400 mb-1 block">Destination Chain</label>
                <Select value={dstChain} onValueChange={setDstChain}>
                  <SelectTrigger data-testid="bridge-dst" className="glass-input bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#0B111A] border-white/10">
                    {Object.entries(CHAIN_COLORS).map(([k, c]) => <SelectItem key={k} value={k}><span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ background: c }} />{chains.find(ch => ch.name.toLowerCase().includes(k.replace('_', ' ')))?.name || k}</span></SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-slate-400 mb-1 block">Asset</label>
                <Select value={bridgeAsset} onValueChange={setBridgeAsset}>
                  <SelectTrigger data-testid="bridge-asset" className="glass-input bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#0B111A] border-white/10">
                    {['CARBON', 'RICE', 'WHEAT', 'KWH', 'H2O', 'USD'].map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-slate-400 mb-1 block">Amount</label>
                <Input data-testid="bridge-amount" type="number" value={bridgeAmount} onChange={e => setBridgeAmount(e.target.value)} className="glass-input bg-white/5 border-white/10 text-white" />
              </div>
              <Button data-testid="bridge-btn" onClick={handleBridge} className="w-full rounded-xl" style={{ background: '#00F298', color: '#060B12' }}>
                Bridge {bridgeAmount} {bridgeAsset}
              </Button>
            </div>

            {/* Transfer Steps Visualization */}
            <div className="lg:col-span-2">
              <div className="glass-card rounded-xl p-5">
                <h3 className="text-sm font-medium mb-4">Recent Transfers</h3>
                <div className="space-y-3">
                  {transfers.slice(0, 6).map((t, i) => {
                    const stCfg = STATUS_CONFIG[t.status] || STATUS_CONFIG.pending;
                    const StIcon = stCfg.icon;
                    return (
                      <motion.div key={t.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                        className="flex items-center gap-3 py-3 border-b border-white/5 last:border-0">
                        <StIcon className="w-4 h-4 flex-shrink-0" style={{ color: stCfg.color }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-sm font-medium">{t.amount?.toLocaleString()} {t.asset_symbol}</span>
                            <Badge variant="outline" className="text-[9px] border-white/5">${t.usd_value_total?.toLocaleString()}</Badge>
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-slate-400">
                            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full" style={{ background: CHAIN_COLORS[t.source_chain] }} />{t.source_chain_name}</span>
                            <ArrowRight className="w-3 h-3" />
                            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full" style={{ background: CHAIN_COLORS[t.dest_chain] }} />{t.dest_chain_name}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge className="text-[9px]" style={{ background: `${stCfg.color}15`, color: stCfg.color }}>{t.status}</Badge>
                          <p className="text-[10px] text-slate-500 mt-0.5">{t.user_name}</p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Gas Oracle Tab */}
        <TabsContent value="gas">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 glass-card rounded-xl p-5">
              <h3 className="text-sm font-medium mb-4">Gas Cost Comparison (USD per operation)</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={gasChartData} layout="vertical">
                    <XAxis type="number" tick={{ fill: '#64748B', fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v.toFixed(4)}`} />
                    <YAxis dataKey="operation" type="category" tick={{ fill: '#64748B', fontSize: 9 }} axisLine={false} tickLine={false} width={100} />
                    <Tooltip contentStyle={{ background: '#0B111A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '11px' }} formatter={v => [`$${v.toFixed(6)}`, '']} />
                    <Bar dataKey="Ethereum" fill="#627EEA" radius={[0, 2, 2, 0]} />
                    <Bar dataKey="Avalanche" fill="#E84142" radius={[0, 2, 2, 0]} />
                    <Bar dataKey="Arbitrum" fill="#28A0F0" radius={[0, 2, 2, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[10px] text-slate-500 mt-2">E4N L2 gas costs are near-zero and not visible at this scale.</p>
            </div>
            <div className="space-y-4">
              <div className="glass-card rounded-xl p-5">
                <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-2">E4N L2 Advantage</p>
                <p className="text-3xl font-medium text-emerald-400" style={{ fontFamily: 'Cabinet Grotesk' }}>~$0</p>
                <p className="text-xs text-slate-500 mt-1">Gas cost per transaction</p>
              </div>
              <div className="glass-card rounded-xl p-5">
                <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-2">Recommendation</p>
                <p className="text-xs text-slate-300 leading-relaxed">{gasOracle?.recommendation}</p>
              </div>
              {/* Per-chain gas price */}
              <div className="glass-card rounded-xl p-5">
                <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-3">Current Gas Prices</p>
                {gasOracle?.comparison?.[0] && Object.entries(CHAIN_COLORS).map(([k, c]) => {
                  const data = gasOracle.comparison[0][k];
                  return (
                    <div key={k} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
                      <span className="flex items-center gap-2 text-xs"><span className="w-2 h-2 rounded-full" style={{ background: c }} />{k.replace('_', ' ')}</span>
                      <span className="text-xs font-mono text-slate-300">{data?.gwei} gwei</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Contracts Tab */}
        <TabsContent value="contracts">
          <div className="space-y-4">
            {/* Templates */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((t, i) => (
                <motion.div key={t.type} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="glass-card rounded-xl p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <FileCode className="w-4 h-4 text-emerald-400 mb-2" />
                      <h3 className="text-sm font-medium">{t.name}</h3>
                      <p className="text-[10px] text-slate-500">v{t.version}</p>
                    </div>
                    <Button data-testid={`deploy-${t.type}`} size="sm" onClick={() => handleDeploy(t.type)} className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20">Deploy</Button>
                  </div>
                  <div className="space-y-1 mb-3">
                    {t.functions?.slice(0, 3).map(f => (
                      <div key={f.name} className="flex items-center gap-2 text-[10px]">
                        <span className="text-emerald-400 font-mono">fn</span>
                        <span className="text-slate-300">{f.name}</span>
                        <span className="text-slate-500">({f.inputs?.map(i => i.type).join(', ')})</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {t.events?.slice(0, 2).map(e => <Badge key={e} variant="outline" className="text-[8px] border-white/5 text-slate-500 font-mono">{e.split('(')[0]}</Badge>)}
                  </div>
                </motion.div>
              ))}
            </div>
            {/* Deployed Contracts Table */}
            <div className="glass-card rounded-xl overflow-hidden">
              <div className="p-4 border-b border-white/5"><h3 className="text-sm font-medium">Deployed Contracts ({deployments.length})</h3></div>
              <div className="overflow-x-auto">
                <table className="w-full" data-testid="deployments-table">
                  <thead><tr className="border-b border-white/10">
                    {['Contract', 'Chain', 'Address', 'Gas', 'Status', 'Date'].map(h => <th key={h} className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-slate-400">{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {deployments.slice(0, 12).map(d => (
                      <tr key={d.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                        <td className="px-4 py-2.5 text-sm">{d.contract_name}</td>
                        <td className="px-4 py-2.5"><Badge className="text-[10px]" style={{ background: `${CHAIN_COLORS[d.chain]}15`, color: CHAIN_COLORS[d.chain] }}>{d.chain_name}</Badge></td>
                        <td className="px-4 py-2.5 text-xs font-mono text-slate-400">{d.address?.slice(0, 14)}...</td>
                        <td className="px-4 py-2.5 text-xs">{d.gas_used?.toLocaleString()}</td>
                        <td className="px-4 py-2.5"><Badge variant="outline" className="text-[10px] border-emerald-500/20 text-emerald-400">{d.status}</Badge></td>
                        <td className="px-4 py-2.5 text-[10px] text-slate-500">{d.created_at ? new Date(d.created_at).toLocaleDateString() : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <div className="space-y-3">
            {transfers.map((t, i) => {
              const stCfg = STATUS_CONFIG[t.status] || STATUS_CONFIG.pending;
              return (
                <motion.div key={t.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                  className="glass-card rounded-xl p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">{t.amount?.toLocaleString()} {t.asset_symbol}</span>
                        <Badge variant="outline" className="text-[9px] border-white/10">${t.usd_value_total?.toLocaleString()}</Badge>
                        <Badge className="text-[9px]" style={{ background: `${stCfg.color}15`, color: stCfg.color }}>{t.status}</Badge>
                      </div>
                      <p className="text-[10px] text-slate-500">{t.user_name} | {t.created_at ? new Date(t.created_at).toLocaleString() : ''}</p>
                    </div>
                    <div className="text-right text-[10px] text-slate-500">
                      <p>Gas: ${t.gas_cost?.total_usd?.toFixed(4)}</p>
                      <p>Est: {t.estimated_time_seconds}s</p>
                    </div>
                  </div>
                  {/* Steps */}
                  <div className="flex items-center gap-1">
                    {t.steps?.map((step, si) => {
                      const sCfg = STATUS_CONFIG[step.status] || STATUS_CONFIG.pending;
                      return (
                        <React.Fragment key={si}>
                          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md" style={{ background: `${sCfg.color}08`, border: `1px solid ${sCfg.color}20` }}>
                            <div className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold" style={{ background: `${sCfg.color}20`, color: sCfg.color }}>{step.step}</div>
                            <span className="text-[10px]" style={{ color: sCfg.color }}>{step.name}</span>
                          </div>
                          {si < t.steps.length - 1 && <ArrowRight className="w-3 h-3 text-slate-600 flex-shrink-0" />}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
