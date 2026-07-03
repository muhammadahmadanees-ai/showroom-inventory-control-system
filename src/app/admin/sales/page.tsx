'use client';

import React, { useState, useEffect, useRef } from 'react';
import { db, Sale } from '@/lib/db';
import { 
  History, 
  RotateCcw, 
  Search, 
  Calendar, 
  AlertCircle,
  CheckCircle2, 
  RefreshCw,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

interface Toast {
  message: string;
  type: 'success' | 'error';
  visible: boolean;
}

export default function SalesManagementPage() {
  // Database states
  const [sales, setSales] = useState<Sale[]>([]);
  const [adminEmail, setAdminEmail] = useState('admin@showroom.com');

  // Interface states
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // History filters
  const [filterQuery, setFilterQuery] = useState('');
  const [filterAdmin, setFilterAdmin] = useState('all');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // Pagination states
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Toast notifications
  const [toast, setToast] = useState<Toast>({ message: '', type: 'success', visible: false });

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type, visible: true });
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 4000);
  };

  // Load Admin Session and Data
  useEffect(() => {
    const loadSession = () => {
      if (db.isMock()) {
        const session = localStorage.getItem('ics_mock_admin_session');
        if (session) {
          setAdminEmail(JSON.parse(session).email);
        }
      }
    };
    loadSession();
    loadData();

    // Read initial page and limit from URL
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const p = parseInt(params.get('page') || '1', 10);
      const l = parseInt(params.get('limit') || '25', 10);
      if (!isNaN(p) && p > 0) setPage(p);
      if (!isNaN(l) && (l === 25 || l === 50 || l === 100)) setPageSize(l);
    }
  }, []);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    updateUrl(newPage, pageSize);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1);
    updateUrl(1, newPageSize);
  };

  const updateUrl = (newPage: number, newPageSize: number) => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('page', newPage.toString());
      url.searchParams.set('limit', newPageSize.toString());
      window.history.pushState({}, '', url.pathname + url.search);
    }
  };

  const isMounted = useRef(false);
  useEffect(() => {
    if (isMounted.current) {
      setPage(1);
      updateUrl(1, pageSize);
    } else {
      isMounted.current = true;
    }
  }, [filterQuery, filterAdmin, filterStartDate, filterEndDate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const salesData = await db.getSales();
      setSales(salesData);
    } catch (err: any) {
      showToast(err.message || 'Failed to load sales database.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Revert / Undo Sale
  const handleUndoSale = async (sale: Sale) => {
    const invoiceLabel = sale.invoice_id ? `invoice #${sale.invoice_id.substring(0, 8).toUpperCase()}` : 'transaction';
    if (!confirm(`Are you sure you want to undo and reverse the sale of "${sale.product_name}" (${sale.ref_code}) from ${invoiceLabel}? This will restore the sold stock back to the inventory.`)) {
      return;
    }

    setActionLoading(true);
    try {
      await db.undoSale(sale.id, adminEmail);
      showToast(`Transaction undone! Stock of ${sale.ref_code} restored.`, 'success');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to undo sale.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Filter Sales History
  const filteredSales = sales.filter((sale) => {
    const query = filterQuery.toLowerCase();
    const matchesQuery = 
      sale.product_name.toLowerCase().includes(query) || 
      sale.ref_code.toLowerCase().includes(query) ||
      (sale.invoice_id && sale.invoice_id.toLowerCase().includes(query));

    const matchesAdmin = filterAdmin === 'all' || sale.sold_by.toLowerCase() === filterAdmin.toLowerCase();

    let matchesDate = true;
    if (filterStartDate) {
      const start = new Date(filterStartDate);
      start.setHours(0,0,0,0);
      matchesDate = matchesDate && new Date(sale.sold_at) >= start;
    }
    if (filterEndDate) {
      const end = new Date(filterEndDate);
      end.setHours(23,59,59,999);
      matchesDate = matchesDate && new Date(sale.sold_at) <= end;
    }

    return matchesQuery && matchesAdmin && matchesDate;
  });

  const totalRows = filteredSales.length;
  const totalPages = Math.ceil(totalRows / pageSize);
  const currentPage = Math.max(1, Math.min(page, totalPages || 1));
  const startRow = totalRows === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endRow = Math.min(currentPage * pageSize, totalRows);
  const paginatedSales = filteredSales.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const uniqueAdmins = Array.from(new Set(sales.map(s => s.sold_by)));

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Toast Alert */}
      {toast.visible && (
        <div className={`toast toast-${toast.type}`}>
          {toast.type === 'success' ? <CheckCircle2 size={18} style={{ color: 'var(--color-primary)' }} /> : <AlertCircle size={18} style={{ color: 'var(--color-danger)' }} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Sales Ledger & Transactions
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            View showroom sales records, filter by invoice group, and reverse transactions.
          </p>
        </div>
        <button onClick={loadData} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <RefreshCw size={16} />
          Refresh Ledger
        </button>
      </div>

      {/* LEDGER: SALES HISTORY */}
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem' }}>
          <History size={20} style={{ color: 'var(--color-accent)' }} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>Transactional Sales Ledger</h2>
        </div>

        {/* Ledger Filter Panel */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', background: 'hsla(222, 47%, 6%, 0.4)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
          
          <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-control"
              style={{ paddingLeft: '2rem', paddingTop: '0.4rem', paddingBottom: '0.4rem', fontSize: '0.85rem', width: '100%' }}
              placeholder="Search product, ref code, or invoice ID..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
            />
          </div>

          <select
            className="form-control"
            style={{ paddingTop: '0.4rem', paddingBottom: '0.4rem', fontSize: '0.85rem' }}
            value={filterAdmin}
            onChange={(e) => setFilterAdmin(e.target.value)}
          >
            <option value="all">All Operators</option>
            {uniqueAdmins.map(email => <option key={email} value={email}>{email}</option>)}
          </select>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem' }}>
            <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
            <input
              type="date"
              className="form-control"
              style={{ padding: '0.4rem 0.5rem', fontSize: '0.85rem' }}
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>to</span>
            <input
              type="date"
              className="form-control"
              style={{ padding: '0.4rem 0.5rem', fontSize: '0.85rem' }}
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
            />
          </div>

          {(filterQuery || filterAdmin !== 'all' || filterStartDate || filterEndDate) && (
            <button 
              onClick={() => { setFilterQuery(''); setFilterAdmin('all'); setFilterStartDate(''); setFilterEndDate(''); }} 
              className="btn-icon" 
              title="Reset Filters"
              style={{ color: 'var(--color-danger)' }}
            >
              <RotateCcw size={14} />
            </button>
          )}

        </div>

        {/* Ledger Table */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem 0' }}>
            <div style={{
              border: '4px solid rgba(16, 185, 129, 0.1)',
              borderTop: '4px solid var(--color-primary)',
              borderRadius: '50%',
              width: '45px',
              height: '45px',
              animation: 'spin 1s linear infinite'
            }} />
          </div>
        ) : (
          <>
            <div className="table-container" style={{ minHeight: '350px' }}>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Date/Time</th>
                    <th>Invoice ID</th>
                    <th>Ref Code</th>
                    <th>Product</th>
                    <th>Salesman</th>
                    <th>Qty Sold</th>
                    <th>Selling Rate</th>
                    <th>Revenue</th>
                    <th>Net Margin</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedSales.length === 0 ? (
                    <tr>
                      <td colSpan={10} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '4rem' }}>
                        No sales records found in transactional ledger.
                      </td>
                    </tr>
                  ) : (
                    paginatedSales.map((sale) => {
                      const isProfit = sale.profit >= 0;
                      const truncatedInvId = sale.invoice_id ? `#${sale.invoice_id.substring(4, 9).toUpperCase()}` : 'N/A';
                      
                      return (
                        <tr key={sale.id}>
                          <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {new Date(sale.sold_at).toLocaleString()}
                          </td>
                          <td>
                            <code style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-info)' }} title={sale.invoice_id || ''}>
                              {truncatedInvId}
                            </code>
                          </td>
                          <td>
                            <code style={{ fontWeight: 'bold', color: 'var(--color-primary)' }}>{sale.ref_code}</code>
                          </td>
                          <td>
                            <span style={{ fontWeight: '600', fontSize: '0.85rem' }}>{sale.product_name}</span>
                          </td>
                          <td>
                            <span style={{ fontWeight: '500', fontSize: '0.85rem' }}>{sale.salesman_name || 'N/A'}</span>
                          </td>
                          <td style={{ fontSize: '0.85rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              {sale.meters_sold > 0 && <span>{sale.meters_sold} m</span>}
                              {sale.boxes_sold > 0 && <span>{sale.boxes_sold} boxes</span>}
                            </div>
                          </td>
                          <td style={{ fontSize: '0.8rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                              {sale.meters_sold > 0 && <span>M: Rs. {sale.selling_price_meter}</span>}
                              {sale.boxes_sold > 0 && <span>B: Rs. {sale.selling_price_box}</span>}
                            </div>
                          </td>
                          <td>
                            <strong style={{ color: 'var(--color-accent)' }}>Rs. {sale.total_amount.toLocaleString()}</strong>
                          </td>
                          <td>
                            <span className={`badge ${isProfit ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.7rem', padding: '0.2rem 0.4rem', fontWeight: 'bold' }}>
                              {isProfit ? <TrendingUp size={10} style={{ marginRight: '2px', display: 'inline' }} /> : <TrendingDown size={10} style={{ marginRight: '2px', display: 'inline' }} />}
                              {isProfit ? '+' : ''}Rs. {sale.profit.toLocaleString()}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              onClick={() => handleUndoSale(sale)}
                              className="btn-icon"
                              style={{ color: 'var(--color-danger)' }}
                              disabled={actionLoading}
                              title="Undo / Reverse Sale"
                            >
                              <RotateCcw size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalRows > 0 && (
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginTop: '1.5rem', 
                paddingTop: '1.25rem', 
                borderTop: '1px solid var(--border-subtle)',
                flexWrap: 'wrap',
                gap: '1rem'
              }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  Showing <strong style={{ color: 'var(--text-main)' }}>{startRow}–{endRow}</strong> of <strong style={{ color: 'var(--text-main)' }}>{totalRows.toLocaleString()}</strong> rows
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                  {/* Page Size Selector */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Rows per page:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                      className="form-control"
                      style={{ 
                        padding: '0.35rem 0.5rem', 
                        fontSize: '0.8rem', 
                        width: 'auto', 
                        height: 'auto',
                        background: 'var(--bg-app)',
                        border: '1px solid var(--border-subtle)'
                      }}
                    >
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>

                  {/* Navigation Buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="btn btn-secondary"
                      style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', minHeight: 'auto' }}
                    >
                      Previous
                    </button>

                    {/* Page Numbers */}
                    {(() => {
                      const pages = [];
                      const maxVisiblePages = 5;
                      let startPage = Math.max(1, currentPage - 2);
                      let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

                      if (endPage - startPage < maxVisiblePages - 1) {
                        startPage = Math.max(1, endPage - maxVisiblePages + 1);
                      }

                      if (startPage > 1) {
                        pages.push(
                          <button
                            key={1}
                            onClick={() => handlePageChange(1)}
                            className={`btn ${currentPage === 1 ? 'btn-primary' : 'btn-secondary'}`}
                            style={{ 
                              padding: '0.4rem 0.75rem', 
                              fontSize: '0.8rem', 
                              minHeight: 'auto',
                              background: currentPage === 1 ? 'var(--color-primary)' : 'var(--bg-app)',
                              borderColor: currentPage === 1 ? 'var(--color-primary)' : 'var(--border-subtle)',
                              color: currentPage === 1 ? '#fff' : 'var(--text-main)'
                            }}
                          >
                            1
                          </button>
                        );
                        if (startPage > 2) {
                          pages.push(<span key="dots-start" style={{ color: 'var(--text-muted)', padding: '0 0.25rem' }}>...</span>);
                        }
                      }

                      for (let i = startPage; i <= endPage; i++) {
                        pages.push(
                          <button
                            key={i}
                            onClick={() => handlePageChange(i)}
                            className={`btn ${currentPage === i ? 'btn-primary' : 'btn-secondary'}`}
                            style={{ 
                              padding: '0.4rem 0.75rem', 
                              fontSize: '0.8rem', 
                              minHeight: 'auto',
                              background: currentPage === i ? 'var(--color-primary)' : 'var(--bg-app)',
                              borderColor: currentPage === i ? 'var(--color-primary)' : 'var(--border-subtle)',
                              color: currentPage === i ? '#fff' : 'var(--text-main)'
                            }}
                          >
                            {i}
                          </button>
                        );
                      }

                      if (endPage < totalPages) {
                        if (endPage < totalPages - 1) {
                          pages.push(<span key="dots-end" style={{ color: 'var(--text-muted)', padding: '0 0.25rem' }}>...</span>);
                        }
                        pages.push(
                          <button
                            key={totalPages}
                            onClick={() => handlePageChange(totalPages)}
                            className={`btn ${currentPage === totalPages ? 'btn-primary' : 'btn-secondary'}`}
                            style={{ 
                              padding: '0.4rem 0.75rem', 
                              fontSize: '0.8rem', 
                              minHeight: 'auto',
                              background: currentPage === totalPages ? 'var(--color-primary)' : 'var(--bg-app)',
                              borderColor: currentPage === totalPages ? 'var(--color-primary)' : 'var(--border-subtle)',
                              color: currentPage === totalPages ? '#fff' : 'var(--text-main)'
                            }}
                          >
                            {totalPages}
                          </button>
                        );
                      }

                      return pages;
                    })()}

                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="btn btn-secondary"
                      style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', minHeight: 'auto' }}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

    </div>
  );
}
