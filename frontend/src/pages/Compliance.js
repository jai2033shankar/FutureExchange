import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, AlertTriangle, Globe, FileCheck, Scale } from 'lucide-react';

const SEVERITY_COLORS = { critical: '#EF4444', high: '#F59E0B', medium: '#3B82F6', low: '#8E9EAD' };

export default function Compliance() {
  const { apiCall, user } = useAuth();
  const [rules, setRules] = useState([]);
  const [status, setStatus] = useState(null);
  const [selectedRegion, setSelectedRegion] = useState('');
  const [regions, setRegions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, [selectedRegion]);

  const loadData = async () => {
    try {
      let rulesUrl = '/compliance/rules';
      if (selectedRegion) rulesUrl += `?region=${selectedRegion}`;
      const [rulesData, statusData, regionsData] = await Promise.all([
        apiCall('get', rulesUrl),
        apiCall('get', '/compliance/status'),
        apiCall('get', '/compliance/regions'),
      ]);
      setRules(rulesData);
      setStatus(statusData);
      setRegions(regionsData);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  const complianceColor = status?.compliance_status === 'verified' ? '#00F298' : status?.compliance_status === 'pending' ? '#F59E0B' : '#EF4444';

  return (
    <div data-testid="compliance-page" className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl sm:text-3xl font-medium tracking-tight" style={{ fontFamily: 'Cabinet Grotesk' }}>
          Compliance & Regulations
        </h1>
        <p className="text-sm text-slate-400 mt-1">Region-based regulatory framework and compliance status</p>
      </motion.div>

      {/* User Compliance Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl" style={{ background: `${complianceColor}15` }}>
              <ShieldCheck className="w-5 h-5" style={{ color: complianceColor }} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.15em] text-slate-400 mb-1">Your Status</p>
              <p className="text-lg font-medium capitalize" style={{ color: complianceColor }}>{status?.compliance_status || 'Unknown'}</p>
              <p className="text-xs text-slate-500 mt-1">KYC Tier: {status?.kyc_tier || 0}</p>
            </div>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-blue-500/10">
              <Globe className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.15em] text-slate-400 mb-1">Your Region</p>
              <p className="text-lg font-medium">{status?.region || 'US'}</p>
              <p className="text-xs text-slate-500 mt-1">{status?.region_rules?.name || 'Regional Rules'}</p>
            </div>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-yellow-500/10">
              <FileCheck className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.15em] text-slate-400 mb-1">Total Trades</p>
              <p className="text-lg font-medium">{status?.total_trades || 0}</p>
              <p className="text-xs text-slate-500 mt-1">Last checked: {status?.last_checked ? new Date(status.last_checked).toLocaleTimeString() : 'N/A'}</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Region Filter */}
      <div className="flex items-center gap-4">
        <Select value={selectedRegion} onValueChange={setSelectedRegion}>
          <SelectTrigger data-testid="compliance-region-filter" className="w-48 glass-input bg-white/5 border-white/10 text-white text-sm">
            <SelectValue placeholder="All Regions" />
          </SelectTrigger>
          <SelectContent className="bg-[#0B111A] border-white/10">
            <SelectItem value="all">All Regions</SelectItem>
            {regions.map(r => <SelectItem key={r.region} value={r.region}>{r.region} - {r.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Region Cards */}
      <div className="space-y-4">
        {rules.map((ruleSet, idx) => (
          <motion.div
            key={ruleSet.region}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + idx * 0.05 }}
            className={`glass-card rounded-xl overflow-hidden ${status?.region === ruleSet.region ? 'border-emerald-500/20' : ''}`}
          >
            <div className="p-5 border-b border-white/5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-white/5">
                    <Scale className="w-4 h-4 text-slate-400" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="text-base font-medium" style={{ fontFamily: 'Cabinet Grotesk' }}>{ruleSet.name}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <Badge variant="outline" className="text-xs border-white/10 text-slate-300">{ruleSet.region}</Badge>
                      {status?.region === ruleSet.region && (
                        <Badge className="text-xs" style={{ background: '#00F29815', color: '#00F298', border: '1px solid #00F29830' }}>Your Region</Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-4 text-sm">
                  <div>
                    <span className="text-xs text-slate-500">Carbon Tax:</span>
                    <span className="ml-1 font-medium">{((ruleSet.carbon_tax_rate || 0) * 100).toFixed(1)}%</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500">Max Transaction:</span>
                    <span className="ml-1 font-medium">{(ruleSet.max_transaction_limit || 0).toLocaleString()} tCO2e</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-5">
              <div className="space-y-3">
                {(ruleSet.rules || []).map(rule => (
                  <div key={rule.id} className="flex items-start gap-3">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: SEVERITY_COLORS[rule.severity] }} strokeWidth={1.5} />
                    <div className="flex-1">
                      <p className="text-sm text-slate-300">{rule.rule}</p>
                      <Badge variant="outline" className="text-[10px] mt-1 border-white/5" style={{ color: SEVERITY_COLORS[rule.severity] }}>
                        {rule.severity}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        ))}
        {rules.length === 0 && (
          <div className="glass-card rounded-xl p-8 text-center">
            <p className="text-slate-500">No compliance rules found for the selected region.</p>
          </div>
        )}
      </div>
    </div>
  );
}
