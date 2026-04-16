import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Blocks, Hash, Activity, FileCode, ArrowRight } from 'lucide-react';

export default function BlockchainExplorer() {
  const { apiCall } = useAuth();
  const [stats, setStats] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [s, b, t] = await Promise.all([
        apiCall('get', '/blockchain/stats'),
        apiCall('get', '/blockchain/blocks?limit=15'),
        apiCall('get', '/blockchain/transactions?limit=20'),
      ]);
      setStats(s);
      setBlocks(b);
      setTransactions(t);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" /></div>;

  return (
    <div data-testid="blockchain-page" className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl sm:text-3xl font-medium tracking-tight" style={{ fontFamily: 'Cabinet Grotesk' }}>Blockchain Explorer</h1>
        <p className="text-sm text-slate-400 mt-1">E4N Testnet — Proof of Authority (Simulated)</p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Blocks', value: stats?.total_blocks || 0, icon: Blocks, color: '#00F298' },
          { label: 'Transactions', value: stats?.total_transactions || 0, icon: Activity, color: '#3B82F6' },
          { label: 'Contracts', value: stats?.total_contracts || 0, icon: FileCode, color: '#F59E0B' },
          { label: 'Chain ID', value: stats?.chain_id || 4444, icon: Hash, color: '#8B5CF6' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass-card rounded-xl p-4">
            <div className="flex items-start justify-between">
              <div><p className="text-xs uppercase tracking-[0.15em] text-slate-400 mb-1">{s.label}</p><p className="text-xl font-medium" style={{ fontFamily: 'Cabinet Grotesk' }}>{s.value}</p></div>
              <div className="p-2 rounded-lg" style={{ background: `${s.color}15` }}><s.icon className="w-4 h-4" style={{ color: s.color }} strokeWidth={1.5} /></div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Blocks */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card rounded-xl overflow-hidden">
        <div className="p-4 border-b border-white/5"><h3 className="text-sm font-medium flex items-center gap-2"><Blocks className="w-4 h-4 text-emerald-400" />Latest Blocks</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-white/10">
              {['Block', 'Hash', 'Txns', 'Gas', 'Type', 'Time'].map(h => <th key={h} className="text-left px-4 py-2.5 text-[10px] uppercase tracking-[0.2em] text-slate-400 font-medium">{h}</th>)}
            </tr></thead>
            <tbody>
              {blocks.map(block => (
                <tr key={block.index} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="px-4 py-2.5"><span className="text-sm font-medium text-emerald-400">#{block.index}</span></td>
                  <td className="px-4 py-2.5 text-xs text-slate-400 font-mono">{block.hash?.slice(0, 16)}...</td>
                  <td className="px-4 py-2.5 text-sm">{block.transaction_count}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-400">{block.gas_used?.toLocaleString()}</td>
                  <td className="px-4 py-2.5"><Badge variant="outline" className="text-[10px] border-white/10 text-slate-300">{block.block_type}</Badge></td>
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
