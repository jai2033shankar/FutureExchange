import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Calculator, Leaf, Zap, Car, Plane, Trash2, Download } from 'lucide-react';

const REGIONS = ['US', 'EU', 'APAC', 'AFRICA', 'LATAM'];
const PIE_COLORS = ['#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

export default function CarbonCalculator() {
  const { apiCall } = useAuth();
  const [form, setForm] = useState({ electricity_kwh: '', natural_gas_therms: '', vehicle_miles: '', flights_hours: '', waste_tonnes: '', employees: '1', region: 'US' });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleCalculate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await apiCall('post', '/carbon-calculator/calculate', {
        electricity_kwh: parseFloat(form.electricity_kwh) || 0,
        natural_gas_therms: parseFloat(form.natural_gas_therms) || 0,
        vehicle_miles: parseFloat(form.vehicle_miles) || 0,
        flights_hours: parseFloat(form.flights_hours) || 0,
        waste_tonnes: parseFloat(form.waste_tonnes) || 0,
        employees: parseInt(form.employees) || 1,
        region: form.region,
      });
      setResult(data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const pieData = result ? Object.entries(result.breakdown).filter(([_, v]) => v > 0).map(([k, v]) => ({ name: k.replace(/_/g, ' '), value: v })) : [];

  return (
    <div data-testid="carbon-calculator-page" className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl sm:text-3xl font-medium tracking-tight" style={{ fontFamily: 'Cabinet Grotesk' }}>Carbon Offset Calculator</h1>
        <p className="text-sm text-slate-400 mt-1">Calculate your organization's carbon footprint and find matching offsets</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Form */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card rounded-xl p-6">
          <h3 className="text-sm font-medium mb-4 flex items-center gap-2"><Calculator className="w-4 h-4 text-emerald-400" /> Emission Inputs</h3>
          <form onSubmit={handleCalculate} className="space-y-4">
            {[
              { key: 'electricity_kwh', label: 'Electricity (kWh/year)', icon: Zap, placeholder: '50000' },
              { key: 'natural_gas_therms', label: 'Natural Gas (therms/year)', icon: Zap, placeholder: '5000' },
              { key: 'vehicle_miles', label: 'Vehicle Miles (miles/year)', icon: Car, placeholder: '25000' },
              { key: 'flights_hours', label: 'Flight Hours (hours/year)', icon: Plane, placeholder: '100' },
              { key: 'waste_tonnes', label: 'Waste (tonnes/year)', icon: Trash2, placeholder: '10' },
            ].map(field => (
              <div key={field.key}>
                <label className="text-xs uppercase tracking-[0.15em] text-slate-400 mb-1.5 flex items-center gap-1.5">
                  <field.icon className="w-3 h-3" />{field.label}
                </label>
                <Input data-testid={`calc-${field.key}`} type="number" value={form[field.key]} onChange={e => setForm({ ...form, [field.key]: e.target.value })} placeholder={field.placeholder} className="glass-input bg-white/5 border-white/10 text-white placeholder:text-slate-600" />
              </div>
            ))}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs uppercase tracking-[0.15em] text-slate-400 mb-1.5 block">Employees</label>
                <Input data-testid="calc-employees" type="number" value={form.employees} onChange={e => setForm({ ...form, employees: e.target.value })} className="glass-input bg-white/5 border-white/10 text-white" />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.15em] text-slate-400 mb-1.5 block">Region</label>
                <Select value={form.region} onValueChange={v => setForm({ ...form, region: v })}>
                  <SelectTrigger className="glass-input bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#0B111A] border-white/10">
                    {REGIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button data-testid="calc-submit-btn" type="submit" disabled={loading} className="w-full rounded-xl" style={{ background: '#00F298', color: '#060B12' }}>
              {loading ? 'Calculating...' : 'Calculate Footprint'}
            </Button>
          </form>
        </motion.div>

        {/* Results */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-4">
          {result ? (
            <>
              <div className="glass-card-active rounded-xl p-6">
                <div className="text-center mb-4">
                  <Leaf className="w-8 h-8 mx-auto mb-2" style={{ color: '#00F298' }} />
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400 mb-1">Total Carbon Footprint</p>
                  <p className="text-4xl font-medium" style={{ fontFamily: 'Cabinet Grotesk', color: '#00F298' }}>{result.total_emissions_tco2e}</p>
                  <p className="text-sm text-slate-400">tCO2e per year</p>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="bg-white/[0.02] rounded-lg p-3 text-center">
                    <p className="text-xs text-slate-500">Offset Cost</p>
                    <p className="text-lg font-medium">${result.offset_cost_usd?.toLocaleString()}</p>
                  </div>
                  <div className="bg-white/[0.02] rounded-lg p-3 text-center">
                    <p className="text-xs text-slate-500">Per Employee</p>
                    <p className="text-lg font-medium">{result.per_employee_tco2e} tCO2e</p>
                  </div>
                </div>
              </div>

              {pieData.length > 0 && (
                <div className="glass-card rounded-xl p-5">
                  <h3 className="text-sm font-medium mb-3">Emission Breakdown</h3>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2} dataKey="value">
                        {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie><Tooltip contentStyle={{ background: '#0B111A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }} formatter={v => `${v} tCO2e`} /></PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center mt-2">
                    {pieData.map((d, i) => (
                      <span key={d.name} className="flex items-center gap-1 text-xs text-slate-400">
                        <span className="w-2 h-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />{d.name}: {d.value}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="glass-card rounded-xl p-5">
                <h3 className="text-sm font-medium mb-3">Recommendations</h3>
                {result.recommendations?.filter(Boolean).map((rec, i) => (
                  <p key={i} className="text-sm text-slate-300 py-1 flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />{rec}</p>
                ))}
              </div>
            </>
          ) : (
            <div className="glass-card rounded-xl p-12 text-center">
              <Calculator className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-500">Enter your emission data and click Calculate to see your carbon footprint breakdown and offset recommendations.</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
