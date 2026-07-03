'use client';

import React, { useState, useEffect, useRef } from 'react';
import { db, Product } from '@/lib/db';
import { 
  Search, 
  Printer, 
  AlertTriangle, 
  CheckCircle2, 
  Warehouse, 
  Package, 
  Layers, 
  ArrowRight, 
  Database,
  History,
  Trash2
} from 'lucide-react';
import Link from 'next/link';

export default function PublicSearchPage() {
  const [query, setQuery] = useState('');
  const [product, setProduct] = useState<Product | null>(null);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');
  const [recentLookups, setRecentLookups] = useState<string[]>([]);
  const [isDemoMode, setIsDemoMode] = useState(false);
  
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load backend mode and recent searches from localStorage on mount
  useEffect(() => {
    setIsDemoMode(db.isMock());
    const history = localStorage.getItem('ics_public_search_history');
    if (history) {
      setRecentLookups(JSON.parse(history));
    }
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  const handleSearch = async (searchCode: string) => {
    const code = searchCode.trim().toUpperCase();
    if (!code) return;

    setError('');
    setProduct(null);
    setSearched(true);

    try {
      const result = await db.getProductByRefCode(code);
      if (result) {
        setProduct(result);
        
        // Update Search History
        const updatedHistory = [code, ...recentLookups.filter(h => h !== code)].slice(0, 5);
        setRecentLookups(updatedHistory);
        localStorage.setItem('ics_public_search_history', JSON.stringify(updatedHistory));
      } else {
        setError(`Reference Code "${code}" not found in inventory.`);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while searching.');
    }
  };

  const handleClearHistory = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRecentLookups([]);
    localStorage.removeItem('ics_public_search_history');
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div className="container animate-fade-in" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', paddingBottom: '3rem' }}>
      
      {/* Sleek Persistent Navbar */}
      <nav className="glass-card" style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: '1rem 2rem', 
        margin: '1.5rem 0 2.5rem 0', 
        borderRadius: '12px',
        flexWrap: 'wrap',
        gap: '1rem',
        border: '1px solid var(--border-subtle)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Layers style={{ color: 'var(--color-primary)' }} size={24} />
          <div>
            <span style={{ fontWeight: '700', fontSize: '1.2rem', letterSpacing: '-0.02em', display: 'block' }}>Showroom Desk</span>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginTop: '-0.1rem' }}>
              Salesman Portal
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <Link href="/" style={{
            color: 'var(--color-primary)',
            textDecoration: 'none',
            fontWeight: '600',
            fontSize: '0.9rem',
            background: 'var(--color-primary-glow)',
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            border: '1px solid rgba(16, 185, 129, 0.15)'
          }}>
            Search Stock
          </Link>
          <Link href="/invoice" style={{
            color: 'var(--text-muted)',
            textDecoration: 'none',
            fontWeight: '500',
            fontSize: '0.9rem',
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            transition: 'color var(--transition-fast)'
          }} onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-main)'} onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}>
            Create Invoice
          </Link>
          <span style={{ color: 'var(--border-subtle)', height: '20px', width: '1px', display: 'inline-block' }} />
          <Link href="/login" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
            Admin Login
            <ArrowRight size={14} />
          </Link>
        </div>
      </nav>

      {/* Demo Banner */}
      {isDemoMode && (
        <div className="glass-card" style={{ 
          background: 'rgba(245, 158, 11, 0.05)', 
          borderLeft: '4px solid var(--color-accent)', 
          padding: '1rem 1.5rem', 
          marginBottom: '2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          borderTop: '1px solid var(--border-subtle)',
          borderRight: '1px solid var(--border-subtle)',
          borderBottom: '1px solid var(--border-subtle)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Database size={20} style={{ color: 'var(--color-accent)' }} />
            <div>
              <strong style={{ color: 'var(--color-accent)' }}>Running in Local Demo Mode</strong>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                No Supabase API keys detected in `.env.local`. App is utilizing local browser storage.
              </p>
            </div>
          </div>
          <span className="badge badge-category" style={{ fontSize: '0.7rem' }}>Local DB</span>
        </div>
      )}

      {/* Main Search Panel */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '700px', margin: '0 auto', width: '100%' }}>
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1.75rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>Search Product Reference</h2>
          
          <form onSubmit={(e) => { e.preventDefault(); handleSearch(query); }} style={{ display: 'flex', gap: '0.75rem' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search 
                size={20} 
                style={{ 
                  position: 'absolute', 
                  left: '12px', 
                  top: '50%', 
                  transform: 'translateY(-50%)', 
                  color: 'var(--text-muted)' 
                }} 
              />
              <input
                ref={searchInputRef}
                type="text"
                className="form-control"
                style={{ paddingLeft: '2.75rem', width: '100%', textTransform: 'uppercase' }}
                placeholder="Enter Reference Code (e.g., TL-MARBLE-01)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-primary">
              Lookup
            </button>
          </form>

          {/* Recent Lookups */}
          {recentLookups.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <History size={14} />
                Recent:
              </span>
              {recentLookups.map((code) => (
                <button
                  key={code}
                  onClick={() => { setQuery(code); handleSearch(code); }}
                  className="badge badge-location"
                  style={{ 
                    cursor: 'pointer', 
                    background: 'hsla(217, 30%, 60%, 0.08)', 
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-main)'
                  }}
                >
                  {code}
                </button>
              ))}
              <button 
                onClick={handleClearHistory}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: 'var(--color-danger)', 
                  cursor: 'pointer', 
                  fontSize: '0.75rem',
                  marginLeft: 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}
                title="Clear History"
              >
                <Trash2 size={12} />
                Clear
              </button>
            </div>
          )}
        </div>

        {/* Results Area */}
        {searched && (
          <div className="animate-fade-in">
            {error && (
              <div className="glass-card" style={{ 
                borderLeft: '4px solid var(--color-danger)', 
                background: 'rgba(239, 68, 68, 0.05)',
                display: 'flex', 
                alignItems: 'center', 
                gap: '1rem',
                padding: '1.5rem'
              }}>
                <AlertTriangle style={{ color: 'var(--color-danger)', flexShrink: 0 }} size={24} />
                <div>
                  <h3 style={{ fontSize: '1.05rem', color: 'var(--text-main)' }}>Search Failed</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>{error}</p>
                </div>
              </div>
            )}

            {product && (
              <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', padding: '2rem' }}>
                
                {/* Product Header Info */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <span className="badge badge-category" style={{ marginBottom: '0.5rem' }}>
                      {product.category?.name || 'Product'}
                    </span>
                    <h3 style={{ fontSize: '1.4rem', fontWeight: '700' }}>{product.name}</h3>
                    <code style={{ fontSize: '0.9rem', color: 'var(--color-primary)', marginTop: '0.25rem', display: 'inline-block', fontWeight: 'bold' }}>
                      {product.ref_code}
                    </code>
                  </div>
                  {product.boxes_available <= product.min_stock_level ? (
                    <div className="badge badge-danger low-stock-alert" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <AlertTriangle size={14} />
                      Low Stock Alert
                    </div>
                  ) : (
                    <div className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <CheckCircle2 size={14} />
                      In Stock
                    </div>
                  )}
                </div>

                {/* Details Grid (Hiding Buying Price for confidential safety) */}
                <div className="grid grid-2">
                  
                  {/* Stock Levels */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'hsla(222, 47%, 6%, 0.4)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                      <Package size={18} style={{ color: 'var(--color-primary)' }} />
                      <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.05em' }}>Inventory Quantities</span>
                    </div>
                    <div>
                      {product.category?.name === 'Tiles' && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', borderBottom: '1px dashed var(--border-subtle)', paddingBottom: '0.5rem' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Meters:</span>
                          <strong style={{ fontSize: '1.1rem', color: 'var(--color-primary)' }}>{product.meters_available} m</strong>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Boxes:</span>
                        <strong style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>{product.boxes_available} boxes</strong>
                      </div>
                    </div>
                  </div>

                  {/* Storage Location */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'hsla(222, 47%, 6%, 0.4)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                      <Warehouse size={18} style={{ color: 'var(--color-info)' }} />
                      <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.05em' }}>Storage Details</span>
                    </div>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', borderBottom: '1px dashed var(--border-subtle)', paddingBottom: '0.5rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Location:</span>
                        <span className="badge badge-location">{product.location?.name || 'Unknown'}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Min Alert Level:</span>
                        <span style={{ fontWeight: '600' }}>{product.min_stock_level} boxes</span>
                      </div>
                    </div>
                  </div>

                  {/* Price Quoting Notice (Public) */}
                  <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'rgba(255,255,255,0.01)', padding: '1rem', borderRadius: '8px', border: '1px dashed var(--border-subtle)', textAlign: 'center' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      Pricing: Variable / Refer to Invoice Builder for custom quotations.
                    </span>
                  </div>

                </div>

                {/* Print Control */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem' }}>
                  <button onClick={handlePrint} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Printer size={16} />
                    Print Picking Slip
                  </button>
                </div>

                {/* Print-only layout container (Confidential slip - no pricing) */}
                <div className="print-slip" style={{ display: 'none' }}>
                  <h2>WAREHOUSE PICKING SLIP</h2>
                  <div style={{ textAlign: 'center', fontSize: '8pt', marginBottom: '15px' }}>
                    Showroom Stock Despatch<br />
                    Printed on: {new Date().toLocaleString()}
                  </div>
                  
                  <div className="print-slip-row">
                    <span>REF CODE:</span>
                    <strong>{product.ref_code}</strong>
                  </div>
                  <div className="print-slip-row">
                    <span>PRODUCT:</span>
                    <strong>{product.name}</strong>
                  </div>
                  <div className="print-slip-row">
                    <span>CATEGORY:</span>
                    <strong>{product.category?.name || 'N/A'}</strong>
                  </div>
                  <div className="print-slip-row">
                    <span>STORAGE LOCATION:</span>
                    <strong>{product.location?.name || 'N/A'}</strong>
                  </div>
                  {product.category?.name === 'Tiles' && (
                    <div className="print-slip-row">
                      <span>METERS REQUESTED:</span>
                      <strong>{product.meters_available} m</strong>
                    </div>
                  )}
                  <div className="print-slip-row">
                    <span>BOXES REQUESTED:</span>
                    <strong>{product.boxes_available} boxes</strong>
                  </div>
                  
                  <div className="print-slip-footer">
                    Warehouse Copy.<br />
                    Please return signed copy to billing desk.
                  </div>
                </div>

              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer Branding */}
      <footer style={{ textAlign: 'center', padding: '2rem 0', marginTop: 'auto', color: 'var(--text-muted)', fontSize: '0.8rem', borderTop: '1px solid var(--border-subtle)' }}>
        &copy; {new Date().getFullYear()} Showroom Inventory Desk. All rights reserved.
      </footer>
    </div>
  );
}
