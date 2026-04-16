import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Vote, Plus, Clock, Users, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function DAOGovernance() {
  const { apiCall } = useAuth();
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', category: 'general', duration_days: '7' });

  useEffect(() => { loadProposals(); }, []);

  const loadProposals = async () => {
    try { setProposals(await apiCall('get', '/governance/proposals')); } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await apiCall('post', '/governance/proposals', { ...form, duration_days: parseInt(form.duration_days) });
      toast.success('Proposal created');
      setShowCreate(false);
      setForm({ title: '', description: '', category: 'general', duration_days: '7' });
      loadProposals();
    } catch (e) { toast.error(e.message); }
  };

  const handleVote = async (proposalId, option) => {
    try {
      await apiCall('post', `/governance/proposals/${proposalId}/vote`, { option });
      toast.success(`Voted: ${option}`);
      loadProposals();
    } catch (e) { toast.error(e.message); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" /></div>;

  const CATEGORY_COLORS = { general: '#8E9EAD', regulation: '#3B82F6', fee_change: '#F59E0B', asset_listing: '#00F298' };

  return (
    <div data-testid="governance-page" className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-medium tracking-tight" style={{ fontFamily: 'Cabinet Grotesk' }}>DAO Governance</h1>
          <p className="text-sm text-slate-400 mt-1">Participate in decentralized decision-making</p>
        </div>
        <Button data-testid="create-proposal-btn" onClick={() => setShowCreate(!showCreate)} style={{ background: '#00F298', color: '#060B12' }} className="rounded-xl flex items-center gap-2">
          <Plus className="w-4 h-4" />New Proposal
        </Button>
      </motion.div>

      {showCreate && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="glass-card-active rounded-xl p-6">
          <h3 className="text-sm font-medium mb-4">Create Proposal</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="text-xs uppercase tracking-[0.15em] text-slate-400 mb-1.5 block">Title</label>
              <Input data-testid="proposal-title" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required className="glass-input bg-white/5 border-white/10 text-white" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.15em] text-slate-400 mb-1.5 block">Description</label>
              <Textarea data-testid="proposal-desc" value={form.description} onChange={e => setForm({...form, description: e.target.value})} required className="glass-input bg-white/5 border-white/10 text-white min-h-[80px]" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs uppercase tracking-[0.15em] text-slate-400 mb-1.5 block">Category</label>
                <Select value={form.category} onValueChange={v => setForm({...form, category: v})}>
                  <SelectTrigger className="glass-input bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#0B111A] border-white/10">
                    {['general', 'regulation', 'fee_change', 'asset_listing'].map(c => <SelectItem key={c} value={c}>{c.replace(/_/g, ' ')}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.15em] text-slate-400 mb-1.5 block">Duration (days)</label>
                <Input type="number" value={form.duration_days} onChange={e => setForm({...form, duration_days: e.target.value})} className="glass-input bg-white/5 border-white/10 text-white" />
              </div>
            </div>
            <div className="flex gap-3">
              <Button data-testid="submit-proposal-btn" type="submit" style={{ background: '#00F298', color: '#060B12' }} className="rounded-xl">Submit Proposal</Button>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)} className="rounded-xl border-white/10 text-slate-400 hover:bg-white/5">Cancel</Button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Proposals */}
      <div className="space-y-4">
        {proposals.map((p, i) => {
          const totalVotes = p.total_votes || 0;
          const isActive = p.status === 'active';
          return (
            <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className={`glass-card rounded-xl p-5 ${isActive ? 'hover:-translate-y-0.5 transition-transform' : 'opacity-70'}`}>
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-[10px] uppercase" style={{ borderColor: `${CATEGORY_COLORS[p.category]}30`, color: CATEGORY_COLORS[p.category] }}>{p.category?.replace(/_/g, ' ')}</Badge>
                    <Badge variant="outline" className={`text-[10px] ${isActive ? 'border-emerald-500/30 text-emerald-400' : 'border-white/10 text-slate-500'}`}>{p.status}</Badge>
                  </div>
                  <h3 className="text-base font-medium">{p.title}</h3>
                  <p className="text-sm text-slate-400 mt-1">{p.description}</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 flex-shrink-0">
                  <Clock className="w-3 h-3" />
                  {p.end_date ? `Ends ${new Date(p.end_date).toLocaleDateString()}` : ''}
                </div>
              </div>

              {/* Vote bars */}
              <div className="space-y-2 mb-4">
                {(p.options || []).map(opt => {
                  const count = p.vote_counts?.[opt] || 0;
                  const pct = totalVotes > 0 ? (count / totalVotes * 100) : 0;
                  const color = opt === 'For' ? '#00F298' : opt === 'Against' ? '#EF4444' : '#8E9EAD';
                  return (
                    <div key={opt}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-300">{opt}</span>
                        <span style={{ color }}>{count} votes ({pct.toFixed(0)}%)</span>
                      </div>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Users className="w-3 h-3" />{totalVotes} total votes
                  {p.proposer_name && <span>by {p.proposer_name}</span>}
                </div>
                {isActive && (
                  <div className="flex gap-2">
                    {(p.options || []).map(opt => (
                      <Button key={opt} data-testid={`vote-${p.id}-${opt.toLowerCase()}`} size="sm" onClick={() => handleVote(p.id, opt)}
                        className={`text-xs rounded-lg ${opt === 'For' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25' : opt === 'Against' ? 'bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25' : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'}`}>
                        {opt}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
