'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { db } from '@/lib/db';
import { useRouter } from 'next/navigation';
import { Lock, Mail, ArrowLeft, Database, KeyRound, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isDemoMode, setIsDemoMode] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsDemoMode(db.isMock());
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (db.isMock()) {
        // Mock authentication bypass
        if (email.toLowerCase() === 'admin@showroom.com' && password === 'admin123') {
          // Store session token in localStorage
          localStorage.setItem('ics_mock_admin_session', JSON.stringify({
            email: email.toLowerCase(),
            role: 'admin',
            expires: Date.now() + 2 * 60 * 60 * 1000 // 2 hours
          }));
          // Mock cookie creation via js
          document.cookie = 'ics_admin_logged_in=true; path=/; max-age=7200';
          
          router.push('/admin');
          router.refresh();
        } else {
          setError('Invalid demo credentials. Use admin@showroom.com / admin123 or click Auto-Login.');
        }
      } else {
        // Real Supabase Authentication
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (authError) throw authError;

        // Set a cookie so the Next.js middleware can read it for route protection
        if (data.session) {
          document.cookie = `ics_admin_logged_in=true; path=/; max-age=${data.session.expires_in}`;
          router.push('/admin');
          router.refresh();
        }
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleAutoFillDemo = () => {
    setEmail('admin@showroom.com');
    setPassword('admin123');
    setError('');
  };

  return (
    <div className="container" style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      flexDirection: 'column',
      gap: '1.5rem'
    }}>
      
      {/* Return Home Link */}
      <Link href="/" style={{ 
        color: 'var(--text-muted)', 
        textDecoration: 'none', 
        display: 'inline-flex', 
        alignItems: 'center', 
        gap: '0.5rem',
        alignSelf: 'center',
        fontSize: '0.9rem',
        transition: 'color var(--transition-fast)'
      }} className="no-print">
        <ArrowLeft size={16} />
        Back to Salesman Portal
      </Link>

      {/* Login Card */}
      <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '420px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '700', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <KeyRound style={{ color: 'var(--color-primary)' }} />
            Admin Portal
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
            Secure Inventory Control Sign-In
          </p>
        </div>

        {error && (
          <div style={{ 
            background: 'var(--color-danger-glow)', 
            border: '1px solid rgba(239, 68, 68, 0.2)', 
            borderRadius: '8px', 
            padding: '0.75rem 1rem', 
            marginBottom: '1.25rem',
            color: 'var(--color-danger)',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="form-group">
            <label htmlFor="email">Admin Email</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                id="email"
                type="email"
                className="form-control"
                style={{ paddingLeft: '2.5rem', width: '100%' }}
                placeholder="email@showroom.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                id="password"
                type="password"
                className="form-control"
                style={{ paddingLeft: '2.5rem', width: '100%' }}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={loading}
            style={{ width: '100%', padding: '0.85rem', marginTop: '0.5rem' }}
          >
            {loading ? 'Authenticating...' : 'Sign In as Admin'}
          </button>
        </form>

        {/* Demo Mode Guide */}
        {isDemoMode && (
          <div style={{ 
            marginTop: '1.5rem', 
            paddingTop: '1.25rem', 
            borderTop: '1px solid var(--border-subtle)', 
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--color-accent)' }}>
              <Database size={14} />
              <span>Demo Mode active: bypass login below</span>
            </div>
            <button 
              onClick={handleAutoFillDemo} 
              className="btn btn-secondary"
              style={{ width: '100%', padding: '0.5rem', fontSize: '0.85rem' }}
            >
              Fill Demo Credentials
            </button>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Credentials: <code>admin@showroom.com</code> / <code>admin123</code>
            </span>
          </div>
        )}
      </div>
      
      <footer style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '1.5rem' }}>
        Showroom Inventory Desk Security Layer
      </footer>
    </div>
  );
}
