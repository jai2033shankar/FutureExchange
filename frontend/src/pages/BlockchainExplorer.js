import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Blocks, Hash, Activity, FileCode, Cpu, Fuel, Users, Pickaxe, Zap } from 'lucide-react';
import { toast } from 'sonner';

export default function BlockchainExplorer() {
  const { apiCall } = useAuth();
  const [stats, setStats] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [gasOracle, setGasOracle] = useState(null);
  const [mempool, setMempool] = useState(null);
  const [validators, setValidators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mining, setMining] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [s, b, t, gas, mem, val] = await Promise.all([
        apiCall('get', '/blockchain/stats'),
        apiCall('get', '/blockchain/blocks?limit=10'),
        apiCall('get', '/blockchain/transactions?limit=15'),
        apiCall('get', '/blockchain/gas-oracle'),
        apiCall('get', '/blockchain/mempool'),
        apiCall('get', '/blockchain/validators'),
      ]);
      setStats(s); setBlocks(b); setTransactions(t);
      setGasOracle(gas); setMempool(mem); setValidators(val);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleMine = async () => {
    setMining(true);
    try {
      const data = await apiCall('post', '/blockchain/mine');
      toast.success(data.message);
      loadData();
    } catch (e) { toast.error(e.message); } finally { setMining(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" /></div>;

  return (
    <div data-testid="blockchain-page" className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-medium tracking-tight" style={{ fontFamily: 'Cabinet Grotesk' }}>Blockchain Explorer</h1>
            <p className="text-sm text-slate-400 mt-1">E4N Testnet — Chain ID: {stats?.chain_id} | Difficulty: {stats?.difficulty} | {stats?.protocol_version}</p>
          </div>
          <Button data-testid="mine-block-btn" onClick={handleMine} disabled={mining} style={{ background: '#00F298', color: '#060B12' }} className="rounded-xl flex items-center gap-2 text-sm">
            <Pickaxe className="w-4 h-4" />{mining ? 'Mining...' : 'Mine Block'}
          </Button>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Blocks', value: stats?.total_blocks || 0, icon: Blocks, color: '#00F298' },
          { label: 'Transactions', value: stats?.total_transactions || 0, icon: Activity, color: '#3B82F6' },
          { label: 'Smart Contracts', value: stats?.total_contracts || 0, icon: FileCode, color: '#F59E0B' },
          { label: 'TPS', value: stats?.tps || 0, icon: Zap, color: '#8B5CF6' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass-card rounded-xl p-4">
            <div className="flex items-start justify-between">
              <div><p className="text-xs uppercase tracking-[0.15em] text-slate-400 mb-1">{s.label}</p><p className="text-xl font-medium" style={{ fontFamily: 'Cabinet Grotesk' }}>{s.value}</p></div>
              <div className="p-2 rounded-lg" style={{ background: `${s.color}15` }}><s.icon className="w-4 h-4" style={{ color: s.color }} strokeWidth={1.5} /></div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Gas Oracle + Mempool + Validators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Gas Oracle */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2"><Fuel className="w-4 h-4 text-yellow-400" />Gas Oracle</h3>
          {gasOracle && (
            <div className="space-y-2">
              {['slow', 'standard', 'fast', 'instant'].map(tier => (
                <div key={tier} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
                  <div>
                    <span className="text-sm capitalize">{tier}</span>
                    <span className="text-xs text-slate-500 ml-2">{gasOracle[tier]?.estimated_time}</span>
                  </div>
                  <span className="text-sm font-mono" style={{ color: tier === 'instant' ? '#00F298' : tier === 'fast' ? '#3B82F6' : '#8E9EAD' }}>{gasOracle[tier]?.price} Gwei</span>
                </div>
              ))}
              <div className="text-xs text-slate-500 mt-2">Base Fee: {gasOracle.base_fee} Gwei | Utilization: {gasOracle.block_utilization}</div>
            </div>
          )}
        </motion.div>

        {/* Mempool */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2"><Cpu className="w-4 h-4 text-blue-400" />Mempool ({mempool?.pending_count || 0} pending)</h3>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {(mempool?.transactions || []).map(tx => (
              <div key={tx.tx_id} className="flex items-center justify-between py-1 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
                  <span className="font-mono text-slate-400">{tx.tx_id?.slice(0, 14)}...</span>
                </div>
                <span className="text-slate-500">{tx.age_seconds}s</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Validators */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2"><Users className="w-4 h-4 text-emerald-400" />Validators ({validators.length})</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {validators.map(v => (
              <div key={v.address} className="flex items-center justify-between py-1">
                <div>
                  <p className="text-xs font-medium">{v.name}</p>
                  <p className="text-[10px] text-slate-500 font-mono">{v.address?.slice(0, 16)}...</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-emerald-400">{v.uptime}</p>
                  <p className="text-[10px] text-slate-500">{v.blocks_validated} blocks</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Blocks */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card rounded-xl overflow-hidden">
        <div className="p-4 border-b border-white/5"><h3 className="text-sm font-medium flex items-center gap-2"><Blocks className="w-4 h-4 text-emerald-400" />Latest Blocks</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-white/10">
              {['Block', 'Hash', 'Merkle Root', 'Txns', 'Gas', 'Difficulty', 'Miner', 'Time'].map(h => <th key={h} className="text-left px-4 py-2.5 text-[10px] uppercase tracking-[0.2em] text-slate-400 font-medium">{h}</th>)}
            </tr></thead>
            <tbody>
              {blocks.map(block => (
                <tr key={block.index} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="px-4 py-2.5"><span className="text-sm font-medium text-emerald-400">#{block.index}</span></td>
                  <td className="px-4 py-2.5 text-xs text-slate-400 font-mono">{block.hash?.slice(0, 12)}...</td>
                  <td className="px-4 py-2.5 text-xs text-slate-500 font-mono">{block.merkle_root?.slice(0, 10) || 'N/A'}...</td>
                  <td className="px-4 py-2.5 text-sm">{block.transaction_count}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-400">{block.gas_used?.toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-400">{block.difficulty || '-'}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-500 font-mono">{block.miner?.slice(0, 10) || 'N/A'}...</td>
                  <td className="px-4 py-2.5 text-xs text-slate-500">{block.timestamp ? new Date(block.timestamp).toLocaleTimeString() : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Transactions */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card rounded-xl overflow-hidden">
        <div className="p-4 border-b border-white/5"><h3 className="text-sm font-medium flex items-center gap-2"><Activity className="w-4 h-4 text-blue-400" />Recent Transactions</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-white/10">
              {['Tx Hash', 'Type', 'From', 'To', 'Gas', 'Time'].map(h => <th key={h} className="text-left px-4 py-2.5 text-[10px] uppercase tracking-[0.2em] text-slate-400 font-medium">{h}</th>)}
            </tr></thead>
            <tbody>
              {transactions.map(tx => (
                <tr key={tx.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="px-4 py-2.5 text-xs font-mono text-emerald-400">{tx.id?.slice(0, 16)}...</td>
                  <td className="px-4 py-2.5"><Badge variant="outline" className="text-[10px] border-white/10 text-slate-300">{tx.type}</Badge></td>
                  <td className="px-4 py-2.5 text-xs text-slate-400 font-mono">{tx.from?.slice(0, 10)}...</td>
                  <td className="px-4 py-2.5 text-xs text-slate-400 font-mono">{tx.to?.slice(0, 10)}...</td>
                  <td className="px-4 py-2.5 text-xs text-slate-400">{tx.gas?.toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-500">{tx.timestamp ? new Date(tx.timestamp).toLocaleTimeString() : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
