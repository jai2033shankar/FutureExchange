import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileCode, Play, Layers, Clock, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';

export default function SmartContracts() {
  const { apiCall } = useAuth();
  const [contracts, setContracts] = useState([]);
  const [templates, setTemplates] = useState({});
  const [loading, setLoading] = useState(true);
  const [showDeploy, setShowDeploy] = useState(false);
  const [deployForm, setDeployForm] = useState({ name: '', contract_type: 'escrow' });
  const [execForm, setExecForm] = useState({});

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [c, t] = await Promise.all([apiCall('get', '/blockchain/contracts'), apiCall('get', '/blockchain/contracts/templates')]);
      setContracts(c);
      setTemplates(t);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleDeploy = async (e) => {
    e.preventDefault();
    try {
      await apiCall('post', '/blockchain/contracts/deploy', deployForm);
      toast.success('Contract deployed');
      setShowDeploy(false);
      setDeployForm({ name: '', contract_type: 'escrow' });
      loadData();
    } catch (e) { toast.error(e.message); }
  };

  const handleExecute = async (contractId, method) => {
    try {
      const result = await apiCall('post', `/blockchain/contracts/${contractId}/execute`, { method, args: {} });
      toast.success(`${method} executed - Gas: ${result.gas_used}`);
      loadData();
    } catch (e) { toast.error(e.message); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" /></div>;

  return (
    <div data-testid="smart-contracts-page" className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-medium tracking-tight" style={{ fontFamily: 'Cabinet Grotesk' }}>Smart Contracts</h1>
          <p className="text-sm text-slate-400 mt-1">Deploy and interact with simulated smart contracts</p>
        </div>
        <Button data-testid="deploy-contract-btn" onClick={() => setShowDeploy(!showDeploy)} style={{ background: '#00F298', color: '#060B12' }} className="rounded-xl flex items-center gap-2"><Plus className="w-4 h-4" />Deploy Contract</Button>
      </motion.div>

      {showDeploy && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card-active rounded-xl p-6">
          <h3 className="text-sm font-medium mb-4">Deploy New Contract</h3>
          <form onSubmit={handleDeploy} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs uppercase tracking-[0.15em] text-slate-400 mb-1.5 block">Contract Name</label>
              <Input data-testid="contract-name" value={deployForm.name} onChange={e => setDeployForm({...deployForm, name: e.target.value})} required className="glass-input bg-white/5 border-white/10 text-white" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.15em] text-slate-400 mb-1.5 block">Contract Type</label>
              <Select value={deployForm.contract_type} onValueChange={v => setDeployForm({...deployForm, contract_type: v})}>
                <SelectTrigger className="glass-input bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#0B111A] border-white/10">
                  {Object.entries(templates).map(([k, v]) => <SelectItem key={k} value={k}>{v.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <Button type="submit" style={{ background: '#00F298', color: '#060B12' }} className="rounded-xl">Deploy</Button>
              <Button type="button" variant="outline" onClick={() => setShowDeploy(false)} className="rounded-xl border-white/10 text-slate-400">Cancel</Button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Contracts List */}
      <div className="space-y-4">
        {contracts.map((c, i) => (
          <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass-card rounded-xl p-5">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <FileCode className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-base font-medium">{c.name}</h3>
                  <Badge variant="outline" className="text-[10px] border-emerald-500/20 text-emerald-400">{c.status}</Badge>
                </div>
                <p className="text-xs text-slate-500 font-mono">{c.address}</p>
                <p className="text-xs text-slate-400 mt-1">{c.template?.description}</p>
              </div>
              <div className="text-xs text-slate-500 flex items-center gap-1">
                <Clock className="w-3 h-3" />{c.deployed_at ? new Date(c.deployed_at).toLocaleDateString() : ''}
              </div>
            </div>

            {/* Methods */}
            <div className="flex flex-wrap gap-2 mb-3">
              {(c.template?.methods || []).map(method => (
                <Button key={method} data-testid={`exec-${c.id}-${method}`} size="sm" onClick={() => handleExecute(c.id, method)}
                  className="text-xs bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10 hover:border-emerald-500/20 rounded-lg flex items-center gap-1">
                  <Play className="w-3 h-3" />{method}
                </Button>
              ))}
            </div>

            {/* Execution Log */}
            {(c.execution_log || []).length > 0 && (
              <div className="mt-3 border-t border-white/5 pt-3">
                <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">Recent Executions</p>
                {c.execution_log.slice(-3).reverse().map((log, j) => (
                  <div key={j} className="flex items-center justify-between py-1 text-xs">
                    <span className="text-emerald-400 font-mono">{log.method}()</span>
                    <span className="text-slate-500">{log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : ''}</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
