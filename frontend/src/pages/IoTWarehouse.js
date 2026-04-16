import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Warehouse, Thermometer, Droplets, Weight, Wind, MapPin } from 'lucide-react';

export default function IoTWarehouse() {
  const { apiCall } = useAuth();
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWh, setSelectedWh] = useState(null);
  const [sensors, setSensors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadWarehouses(); }, []);
  useEffect(() => { if (selectedWh) loadSensors(selectedWh); }, [selectedWh]);

  const loadWarehouses = async () => {
    try { const data = await apiCall('get', '/warehouses'); setWarehouses(data); if (data.length) setSelectedWh(data[0].id); } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const loadSensors = async (whId) => {
    try { setSensors(await apiCall('get', `/warehouses/${whId}/sensors`)); } catch (e) { console.error(e); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" /></div>;

  const currentWh = warehouses.find(w => w.id === selectedWh);
  const SENSOR_ICONS = { temperature: Thermometer, humidity: Droplets, weight: Weight, air_quality: Wind };
  const SENSOR_COLORS = { temperature: '#EF4444', humidity: '#3B82F6', weight: '#F59E0B', air_quality: '#00F298' };

  return (
    <div data-testid="iot-warehouse-page" className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl sm:text-3xl font-medium tracking-tight" style={{ fontFamily: 'Cabinet Grotesk' }}>IoT Warehouse Tokenization</h1>
        <p className="text-sm text-slate-400 mt-1">Real-time warehouse monitoring and asset tokenization</p>
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
          {/* Warehouse Details */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-xl p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.15em] text-slate-400 mb-1">Capacity</p>
                <p className="text-lg font-medium">{currentWh.capacity?.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.15em] text-slate-400 mb-1">Utilization</p>
                <p className="text-lg font-medium">{((currentWh.current_utilization / currentWh.capacity) * 100).toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.15em] text-slate-400 mb-1">Assets</p>
                <div className="flex gap-1">{currentWh.asset_types?.map(a => <Badge key={a} variant="outline" className="text-xs border-white/10">{a}</Badge>)}</div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.15em] text-slate-400 mb-1">Token</p>
                <p className="text-xs font-mono text-emerald-400">{currentWh.token_address?.slice(0, 16)}...</p>
              </div>
            </div>
            {/* Utilization bar */}
            <div className="mt-4">
              <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${(currentWh.current_utilization / currentWh.capacity * 100)}%`, background: 'linear-gradient(90deg, #00F298, #059669)' }} />
              </div>
            </div>
          </motion.div>

          {/* Sensors Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sensors.map((sensor, i) => {
              const Icon = SENSOR_ICONS[sensor.type] || Thermometer;
              const color = SENSOR_COLORS[sensor.type] || '#8E9EAD';
              return (
                <motion.div key={sensor.sensor_id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass-card rounded-xl p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg" style={{ background: `${color}15` }}><Icon className="w-5 h-5" style={{ color }} /></div>
                      <div>
                        <p className="text-sm font-medium capitalize">{sensor.type.replace(/_/g, ' ')}</p>
                        <p className="text-xs text-slate-500">{sensor.sensor_id}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className={`text-[10px] ${sensor.status === 'normal' ? 'border-emerald-500/20 text-emerald-400' : 'border-yellow-500/20 text-yellow-400'}`}>{sensor.status}</Badge>
                  </div>
                  <div className="text-center mb-4">
                    <p className="text-3xl font-medium" style={{ fontFamily: 'Cabinet Grotesk', color }}>{sensor.value}</p>
                    <p className="text-xs text-slate-500">{sensor.unit}</p>
                  </div>
                  <div className="h-24">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={sensor.history || []}>
                        <XAxis dataKey="timestamp" tick={false} axisLine={false} />
                        <YAxis tick={false} axisLine={false} domain={['auto', 'auto']} />
                        <Tooltip contentStyle={{ background: '#0B111A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '11px' }} labelFormatter={() => ''} formatter={v => [`${v} ${sensor.unit}`, sensor.type]} />
                        <Line type="monotone" dataKey="value" stroke={color} strokeWidth={1.5} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
