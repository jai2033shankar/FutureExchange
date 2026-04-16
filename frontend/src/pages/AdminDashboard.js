import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, ShoppingBag, Leaf, ShieldCheck, BarChart2, FileCheck, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminDashboard() {
  const { apiCall } = useAuth();
  const [reports, setReports] = useState(null);
  const [users, setUsers] = useState([]);
  const [trades, setTrades] = useState([]);
  const [pendingCredits, setPendingCredits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [reportsData, usersData, tradesData, creditsData] = await Promise.all([
        apiCall('get', '/admin/reports'),
        apiCall('get', '/admin/users'),
        apiCall('get', '/admin/trades'),
        apiCall('get', '/carbon-credits?status=pending'),
      ]);
      setReports(reportsData);
      setUsers(usersData);
      setTrades(tradesData);
      setPendingCredits(creditsData);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleVerifyCredit = async (creditId) => {
    try {
      await apiCall('put', `/carbon-credits/${creditId}/verify`);
      toast.success('Credit verified');
      loadData();
    } catch (e) { toast.error(e.message); }
  };

  const handleApproveUser = async (userId) => {
    try {
      await apiCall('put', `/admin/users/${userId}/compliance?status=verified`);
      toast.success('User compliance approved');
      loadData();
    } catch (e) { toast.error(e.message); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  const statCards = [
    { label: 'Total Users', value: reports?.total_users || 0, icon: Users, color: '#3B82F6' },
    { label: 'Total Trades', value: reports?.total_trades || 0, icon: ShoppingBag, color: '#00F298' },
    { label: 'Trade Volume', value: `$${(reports?.total_trade_volume || 0).toLocaleString()}`, icon: BarChart2, color: '#F59E0B' },
    { label: 'Pending Credits', value: reports?.pending_credits || 0, icon: AlertTriangle, color: '#EF4444' },
    { label: 'Verified Credits', value: reports?.verified_credits || 0, icon: ShieldCheck, color: '#00F298' },
    { label: 'Total Carbon Credits', value: reports?.total_carbon_credits || 0, icon: Leaf, color: '#06B6D4' },
  ];

  return (
    <div data-testid="admin-dashboard-page" className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl sm:text-3xl font-medium tracking-tight" style={{ fontFamily: 'Cabinet Grotesk' }}>Regulator Dashboard</h1>
        <p className="text-sm text-slate-400 mt-1">System overview, compliance monitoring, and user management</p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass-card rounded-xl p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.15em] text-slate-400 mb-1">{stat.label}</p>
                <p className="text-xl font-medium" style={{ fontFamily: 'Cabinet Grotesk' }}>{stat.value}</p>
              </div>
              <div className="p-2 rounded-lg" style={{ background: `${stat.color}15` }}>
                <stat.icon className="w-4 h-4" style={{ color: stat.color }} strokeWidth={1.5} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Pending Carbon Credits */}
      {pendingCredits.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card-active rounded-xl overflow-hidden">
          <div className="p-4 border-b border-emerald-500/10">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-400" />
              Pending Carbon Credit Verification ({pendingCredits.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  {['Project', 'Type', 'Region', 'Tonnes', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-slate-400 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pendingCredits.map(credit => (
                  <tr key={credit.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="px-4 py-3 text-sm">{credit.project_name}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">{credit.project_type?.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3"><Badge variant="outline" className="text-xs border-white/10">{credit.region}</Badge></td>
                    <td className="px-4 py-3 text-sm">{credit.quantity_tonnes?.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <Button
                        data-testid={`admin-verify-${credit.id}`}
                        onClick={() => handleVerifyCredit(credit.id)}
                        size="sm"
                        className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30"
                      >
                        <ShieldCheck className="w-3 h-3 mr-1" />Verify
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Users Table */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="glass-card rounded-xl overflow-hidden">
        <div className="p-4 border-b border-white/5">
          <h3 className="text-sm font-medium">Registered Users</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                {['Name', 'Email', 'Role', 'KYC Tier', 'Compliance', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-slate-400 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={u.email} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="px-4 py-3 text-sm">{u.name}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">{u.email}</td>
                  <td className="px-4 py-3"><Badge variant="outline" className="text-xs border-white/10 text-slate-300 capitalize">{u.role}</Badge></td>
                  <td className="px-4 py-3 text-sm">{u.kyc_tier}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs capitalize ${u.compliance_status === 'verified' ? 'text-emerald-400' : 'text-yellow-400'}`}>
                      {u.compliance_status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {u.compliance_status !== 'verified' && u.role !== 'regulator' && (
                      <Button
                        data-testid={`approve-user-${u.email}`}
                        onClick={() => handleApproveUser(u._id || u.id)}
                        size="sm"
                        variant="outline"
                        className="text-xs border-white/10 hover:bg-white/5"
                      >
                        Approve
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Recent Trades */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card rounded-xl p-5">
        <h3 className="text-sm font-medium mb-4">Recent System Trades</h3>
        <div className="space-y-2">
          {trades.slice(0, 15).map(trade => (
            <div key={trade.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
              <div className="flex items-center gap-3">
                <div className={`w-1.5 h-1.5 rounded-full ${trade.status === 'settled' ? 'bg-emerald-400' : 'bg-yellow-400'}`} />
                <span className="text-sm font-medium">{trade.asset_symbol}</span>
                <span className="text-xs text-slate-500">{trade.quantity} @ ${trade.price?.toFixed(4)}</span>
              </div>
              <div className="text-right">
                <p className="text-sm">${trade.total?.toFixed(2)}</p>
                <p className="text-[10px] text-slate-500">{trade.timestamp ? new Date(trade.timestamp).toLocaleString() : ''}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
