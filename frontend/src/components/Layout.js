import React, { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import AIChat from '@/components/AIChat';
import { Menu, MessageCircle, X } from 'lucide-react';

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <div className="flex min-h-screen" style={{ background: '#060B12' }}>
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 glass-card border-b border-white/5">
          <button
            data-testid="mobile-menu-btn"
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-white/5 transition-colors"
          >
            <Menu className="w-5 h-5 text-slate-300" />
          </button>
          <span className="text-sm font-medium tracking-wider text-emerald-400" style={{ fontFamily: 'Cabinet Grotesk' }}>E4N</span>
          <button
            data-testid="mobile-chat-btn"
            onClick={() => setChatOpen(!chatOpen)}
            className="p-2 rounded-lg hover:bg-white/5 transition-colors"
          >
            <MessageCircle className="w-5 h-5 text-slate-300" />
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>

      {/* AI Chat Panel - Desktop */}
      <div className="hidden lg:block fixed bottom-6 right-6 z-50">
        {chatOpen ? (
          <div className="w-96 h-[560px] glass-card rounded-2xl overflow-hidden flex flex-col" style={{ background: 'rgba(11, 17, 26, 0.95)' }}>
            <div className="flex items-center justify-between p-4 border-b border-white/5">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                <span className="text-sm font-medium">E4N AI Assistant</span>
              </div>
              <button data-testid="close-chat-btn" onClick={() => setChatOpen(false)} className="p-1 rounded hover:bg-white/5">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <AIChat />
          </div>
        ) : (
          <button
            data-testid="open-chat-btn"
            onClick={() => setChatOpen(true)}
            className="w-14 h-14 rounded-full flex items-center justify-center btn-glow transition-all hover:scale-105"
            style={{ background: '#00F298' }}
          >
            <MessageCircle className="w-6 h-6" style={{ color: '#060B12' }} />
          </button>
        )}
      </div>

      {/* AI Chat Panel - Mobile */}
      {chatOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col" style={{ background: 'rgba(6, 11, 18, 0.98)' }}>
          <div className="flex items-center justify-between p-4 border-b border-white/5">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-sm font-medium">E4N AI Assistant</span>
            </div>
            <button data-testid="close-chat-mobile-btn" onClick={() => setChatOpen(false)} className="p-2 rounded hover:bg-white/5">
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
          <AIChat />
        </div>
      )}
    </div>
  );
}
