'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { db } from '@/lib/db';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  Layers, 
  User,
  Database,
  Receipt
} from 'lucide-react';
import Link from 'next/link';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [adminEmail, setAdminEmail] = useState('admin@showroom.com');
  const [isDemoMode, setIsDemoMode] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setIsDemoMode(db.isMock());
    
    const fetchSession = async () => {
      if (db.isMock()) {
        const localSession = localStorage.getItem('ics_mock_admin_session');
        if (localSession) {
          const session = JSON.parse(localSession);
          setAdminEmail(session.email);
        }
      } else {
        const { data } = await supabase.auth.getSession();
        if (data.session?.user) {
          setAdminEmail(data.session.user.email || 'admin@showroom.com');
        }
      }
    };

    fetchSession();
  }, [pathname]);

  const handleLogout = async () => {
    try {
      if (db.isMock()) {
        localStorage.removeItem('ics_mock_admin_session');
      } else {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      // Clear auth cookie
      document.cookie = 'ics_admin_logged_in=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      router.push('/login');
      router.refresh();
    }
  };

  const navItems = [
    { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { name: 'Inventory', path: '/admin/inventory', icon: Package },
    { name: 'Create Invoice', path: '/admin/invoice', icon: Receipt },
    { name: 'Sales Ledger', path: '/admin/sales', icon: ShoppingCart },
    { name: 'Showroom Setup', path: '/admin/setup', icon: Settings },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-app)' }}>
      
      {/* Mobile Top Header Bar */}
      <header className="no-print" style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '60px',
        background: 'var(--bg-surface-solid)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'none', // toggled in CSS/JS layout
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 1.25rem',
        zIndex: 100,
      }} id="mobile-nav-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Layers size={22} style={{ color: 'var(--color-primary)' }} />
          <strong style={{ fontFamily: 'var(--font-heading)' }}>IcS Admin</strong>
        </div>
        <button 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="btn-icon"
          style={{ color: 'var(--text-main)' }}
        >
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Sidebar Navigation Panel */}
      <aside className={`no-print ${sidebarOpen ? 'open' : ''}`} style={{
        width: 'var(--sidebar-width)',
        background: 'var(--bg-surface-solid)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0,
        bottom: 0,
        left: 0,
        zIndex: 90,
        transition: 'transform var(--transition-normal)',
      }} id="admin-sidebar">
        
        {/* Logo Section */}
        <div style={{ 
          padding: '1.5rem', 
          borderBottom: '1px solid var(--border-subtle)', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.75rem' 
        }}>
          <Layers style={{ color: 'var(--color-primary)' }} size={26} />
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', letterSpacing: '-0.02em' }}>IcS Showroom</h2>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Management Suite
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav style={{ padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
          {navItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                onClick={() => setSidebarOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.85rem 1rem',
                  borderRadius: '8px',
                  color: isActive ? 'var(--color-primary)' : 'var(--text-muted)',
                  textDecoration: 'none',
                  fontWeight: isActive ? '600' : '500',
                  fontSize: '0.95rem',
                  background: isActive ? 'var(--color-primary-glow)' : 'transparent',
                  border: '1px solid',
                  borderColor: isActive ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                  transition: 'all var(--transition-fast)'
                }}
              >
                <IconComponent size={18} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Backend Connection status */}
        <div style={{ padding: '1rem', borderTop: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.02)' }}>
          {isDemoMode ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--color-accent)' }}>
              <Database size={12} />
              <span>Running Local Demo</span>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--color-primary)' }}>
              <Database size={12} />
              <span>Connected to Supabase</span>
            </div>
          )}
        </div>

        {/* User Info & Sign-Out */}
        <div style={{ 
          padding: '1.25rem 1rem', 
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ 
              width: '32px', 
              height: '32px', 
              borderRadius: '50%', 
              background: 'var(--color-primary-glow)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              border: '1px solid rgba(16, 185, 129, 0.2)'
            }}>
              <User size={16} style={{ color: 'var(--color-primary)' }} />
            </div>
            <div style={{ overflow: 'hidden' }}>
              <p style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-main)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {adminEmail}
              </p>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Administrator</span>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="btn btn-secondary" 
            style={{ 
              width: '100%', 
              padding: '0.6rem', 
              fontSize: '0.85rem', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '0.5rem',
              color: 'var(--color-danger)',
              borderColor: 'rgba(239,68,68,0.1)'
            }}
          >
            <LogOut size={14} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div style={{ 
        flex: 1, 
        marginLeft: 'var(--sidebar-width)', 
        minHeight: '100vh', 
        display: 'flex', 
        flexDirection: 'column',
        transition: 'margin var(--transition-normal)'
      }} id="admin-main-content">
        <main style={{ flex: 1, padding: '2rem' }}>
          {children}
        </main>
      </div>

      {/* Global CSS Inject to handle Sidebar responsive layouts in CSS */}
      <style jsx global>{`
        @media (max-width: 900px) {
          #admin-sidebar {
            transform: translateX(-100%);
          }
          #admin-sidebar.open {
            transform: translateX(0);
          }
          #admin-main-content {
            margin-left: 0 !important;
            padding-top: 60px !important;
          }
          #mobile-nav-header {
            display: flex !important;
          }
        }
      `}</style>

    </div>
  );
}
