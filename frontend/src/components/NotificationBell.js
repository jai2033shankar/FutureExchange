import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Bell, Check, X } from 'lucide-react';

export default function NotificationBell() {
  const { apiCall } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => { loadNotifications(); const interval = setInterval(loadNotifications, 15000); return () => clearInterval(interval); }, []);
  useEffect(() => {
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const loadNotifications = async () => {
    try {
      const data = await apiCall('get', '/notifications');
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count || 0);
    } catch {}
  };

  const markRead = async (id) => {
    try {
      await apiCall('put', `/notifications/${id}/read`);
      loadNotifications();
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await apiCall('post', '/notifications/mark-all-read');
      loadNotifications();
    } catch {}
  };

  const CATEGORY_COLORS = { order: '#3B82F6', kyc: '#F59E0B', security: '#8B5CF6', trade: '#00F298', carbon: '#06B6D4' };

  return (
    <div ref={ref} className="relative">
      <button data-testid="notification-bell" onClick={() => setOpen(!open)} className="relative p-2 rounded-lg hover:bg-white/5 transition-colors">
        <Bell className="w-5 h-5 text-slate-300" strokeWidth={1.5} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold" style={{ background: '#00F298', color: '#060B12' }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-80 glass-card rounded-xl overflow-hidden z-50" style={{ background: 'rgba(11, 17, 26, 0.98)' }}>
          <div className="flex items-center justify-between p-3 border-b border-white/5">
            <span className="text-sm font-medium">Notifications</span>
            {unreadCount > 0 && (
              <button data-testid="mark-all-read" onClick={markAllRead} className="text-xs text-emerald-400 hover:underline">Mark all read</button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.slice(0, 15).map(n => (
              <div key={n.id} className={`flex items-start gap-3 p-3 border-b border-white/5 hover:bg-white/[0.02] transition-colors ${!n.read ? 'bg-white/[0.02]' : ''}`}>
                <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: n.read ? 'transparent' : (CATEGORY_COLORS[n.category] || '#8E9EAD') }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-300 leading-relaxed">{n.message}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{n.created_at ? new Date(n.created_at).toLocaleString() : ''}</p>
                </div>
                {!n.read && (
                  <button onClick={() => markRead(n.id)} className="p-0.5 hover:bg-white/5 rounded flex-shrink-0">
                    <Check className="w-3 h-3 text-slate-500" />
                  </button>
                )}
              </div>
            ))}
            {notifications.length === 0 && (
              <div className="p-6 text-center text-slate-500 text-sm">No notifications</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
