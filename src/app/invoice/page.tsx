'use client';

import React, { useState, useEffect } from 'react';
import { db, Product, Sale } from '@/lib/db';
import { 
  Plus, 
  Trash2, 
  Search, 
  Printer, 
  AlertTriangle, 
  CheckCircle2, 
  Layers, 
  ArrowRight, 
  Database,
  RefreshCw,
  FileText,
  User,
  ShoppingBag
} from 'lucide-react';
import Link from 'next/link';

interface InvoiceRow {
  key: string;
  refCode: string;
  product: Product | null;
  lookupError: string;
  metersSold: number | '';
  boxesSold: number | '';
  sellingPriceMeter: number | '';
  sellingPriceBox: number | '';
}

// Helper to generate a valid RFC 4122 version 4 UUID
const generateUUID = (): string => {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export default function PublicInvoiceBuilderPage() {
  const [salesmanName, setSalesmanName] = useState('');
  const [rows, setRows] = useState<InvoiceRow[]>([
    { key: 'row-0', refCode: '', product: null, lookupError: '', metersSold: '', boxesSold: '', sellingPriceMeter: '', sellingPriceBox: '' }
  ]);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');
  
  // Printable receipt state
  const [printedInvoice, setPrintedInvoice] = useState<{
    invoiceId: string;
    salesmanName: string;
    date: string;
    items: Array<{
      refCode: string;
      name: string;
      category: string;
      meters: number;
      boxes: number;
      rateMeter: number;
      rateBox: number;
      total: number;
    }>;
    total: number;
  } | null>(null);

  useEffect(() => {
    setIsDemoMode(db.isMock());
  }, []);

  const handleAddRow = () => {
    const newKey = `row-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    setRows([
      ...rows,
      { key: newKey, refCode: '', product: null, lookupError: '', metersSold: '', boxesSold: '', sellingPriceMeter: '', sellingPriceBox: '' }
    ]);
  };

  const handleRemoveRow = (key: string) => {
    if (rows.length === 1) {
      // Keep at least one row
      setRows([
        { key: 'row-0', refCode: '', product: null, lookupError: '', metersSold: '', boxesSold: '', sellingPriceMeter: '', sellingPriceBox: '' }
      ]);
      return;
    }
    setRows(rows.filter(r => r.key !== key));
  };

  const handleRefCodeChange = async (index: number, val: string) => {
    const updatedRows = [...rows];
    updatedRows[index].refCode = val;
    setRows(updatedRows);
    
    const code = val.trim().toUpperCase();
    if (!code) {
      updatedRows[index].product = null;
      updatedRows[index].lookupError = '';
      updatedRows[index].sellingPriceMeter = '';
      updatedRows[index].sellingPriceBox = '';
      setRows(updatedRows);
      return;
    }
    
    try {
      const prod = await db.getProductByRefCode(code);
      if (prod) {
        updatedRows[index].product = prod;
        updatedRows[index].lookupError = '';
        // Pre-fill selling prices with default cost baselines
        updatedRows[index].sellingPriceMeter = prod.buying_price_meter;
        updatedRows[index].sellingPriceBox = prod.buying_price_box;
      } else {
        updatedRows[index].product = null;
        updatedRows[index].lookupError = 'Product not found.';
        updatedRows[index].sellingPriceMeter = '';
        updatedRows[index].sellingPriceBox = '';
      }
      setRows(updatedRows);
    } catch (err) {
      updatedRows[index].product = null;
      updatedRows[index].lookupError = 'Lookup failed.';
      setRows(updatedRows);
    }
  };

  const handleRowValueChange = (index: number, field: keyof InvoiceRow, value: any) => {
    const updatedRows = [...rows];
    (updatedRows[index] as any)[field] = value;
    setRows(updatedRows);
  };

  const calculateRowTotal = (row: InvoiceRow) => {
    const meters = Number(row.metersSold) || 0;
    const boxes = Number(row.boxesSold) || 0;
    const rateMeter = Number(row.sellingPriceMeter) || 0;
    const rateBox = Number(row.sellingPriceBox) || 0;
    return Number((meters * rateMeter + boxes * rateBox).toFixed(2));
  };

  const calculateInvoiceTotal = () => {
    return rows.reduce((sum, row) => sum + calculateRowTotal(row), 0);
  };

  const handleRecordInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    setSubmitSuccess('');
    setPrintedInvoice(null);

    const salesman = salesmanName.trim();
    if (!salesman) {
      setSubmitError('Salesman Name is required.');
      return;
    }

    // Validations
    if (rows.length === 0) {
      setSubmitError('Invoice must contain at least one product.');
      return;
    }

    // Validate rows
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const lineNum = i + 1;
      const ref = row.refCode.trim().toUpperCase();

      if (!ref) {
        setSubmitError(`Row ${lineNum}: Product Reference Code is required.`);
        return;
      }
      if (!row.product) {
        setSubmitError(`Row ${lineNum}: Reference "${ref}" is invalid or not loaded.`);
        return;
      }

      const meters = Number(row.metersSold) || 0;
      const boxes = Number(row.boxesSold) || 0;
      const rateMeter = Number(row.sellingPriceMeter) || 0;
      const rateBox = Number(row.sellingPriceBox) || 0;

      if (meters <= 0 && boxes <= 0) {
        setSubmitError(`Row ${lineNum}: Quantity sold in meters and/or boxes must be entered.`);
        return;
      }

      // Stock boundaries check
      if (meters > 0 && row.product.meters_available < meters) {
        setSubmitError(`Row ${lineNum} (${row.product.name}): Insufficient meters stock. Available: ${row.product.meters_available} m, Requested: ${meters} m.`);
        return;
      }
      if (boxes > 0 && row.product.boxes_available < boxes) {
        setSubmitError(`Row ${lineNum} (${row.product.name}): Insufficient boxes stock. Available: ${row.product.boxes_available} boxes, Requested: ${boxes} boxes.`);
        return;
      }

      if (meters > 0 && rateMeter <= 0) {
        setSubmitError(`Row ${lineNum}: Selling Price per Meter must be greater than 0.`);
        return;
      }
      if (boxes > 0 && rateBox <= 0) {
        setSubmitError(`Row ${lineNum}: Selling Price per Box must be greater than 0.`);
        return;
      }
    }

    setActionLoading(true);
    
    // Generate a single Invoice ID (UUID)
    const invoiceId = generateUUID();
    
    try {
      const recordedItems: any[] = [];
      
      // Save all rows sequentially
      for (const row of rows) {
        const meters = Number(row.metersSold) || 0;
        const boxes = Number(row.boxesSold) || 0;
        const rateMeter = Number(row.sellingPriceMeter) || 0;
        const rateBox = Number(row.sellingPriceBox) || 0;

        await db.recordSale(
          row.refCode.trim().toUpperCase(),
          meters,
          boxes,
          rateMeter,
          rateBox,
          'salesman_portal@showroom.com',
          salesman,
          invoiceId
        );

        recordedItems.push({
          refCode: row.refCode.trim().toUpperCase(),
          name: row.product!.name,
          category: row.product!.category?.name || 'Sanitary',
          meters,
          boxes,
          rateMeter,
          rateBox,
          total: calculateRowTotal(row)
        });
      }

      const totalAmount = calculateInvoiceTotal();

      // Set print details
      setPrintedInvoice({
        invoiceId,
        salesmanName: salesman,
        date: new Date().toLocaleString(),
        items: recordedItems,
        total: totalAmount
      });

      setSubmitSuccess(`Invoice recorded successfully! Total: Rs. ${totalAmount.toLocaleString()}`);
      
      // Reset rows to single empty item
      setRows([
        { key: 'row-0', refCode: '', product: null, lookupError: '', metersSold: '', boxesSold: '', sellingPriceMeter: '', sellingPriceBox: '' }
      ]);
      
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to record invoice. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  // Trigger print dialogue automatically when printedInvoice state loads
  useEffect(() => {
    if (printedInvoice) {
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          window.print();
        }
      }, 500);
    }
  }, [printedInvoice]);

  return (
    <div className="container animate-fade-in" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', paddingBottom: '3rem' }}>
      
      {/* Sleek Persistent Navbar */}
      <nav className="glass-card no-print" style={{ 
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
            color: 'var(--text-muted)',
            textDecoration: 'none',
            fontWeight: '500',
            fontSize: '0.9rem',
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            transition: 'color var(--transition-fast)'
          }} onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-main)'} onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}>
            Search Stock
          </Link>
          <Link href="/invoice" style={{
            color: 'var(--color-primary)',
            textDecoration: 'none',
            fontWeight: '600',
            fontSize: '0.9rem',
            background: 'var(--color-primary-glow)',
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            border: '1px solid rgba(16, 185, 129, 0.15)'
          }}>
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
      {isDemoMode && !printedInvoice && (
        <div className="glass-card no-print" style={{ 
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

      {/* Main Billing Panel */}
      <main className="no-print" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '900px', margin: '0 auto', width: '100%' }}>
        
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', padding: '2rem' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShoppingBag size={22} style={{ color: 'var(--color-primary)' }} />
                Create Customer Invoice
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                Bill multiple products under a single transaction. Stocks deduct automatically.
              </p>
            </div>
          </div>

          {submitError && (
            <div style={{ background: 'var(--color-danger-glow)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '0.85rem', borderRadius: '8px', color: 'var(--color-danger)', fontSize: '0.85rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <AlertTriangle size={18} />
              <span>{submitError}</span>
            </div>
          )}

          {submitSuccess && (
            <div style={{ background: 'var(--color-primary-glow)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '0.85rem', borderRadius: '8px', color: 'var(--color-primary)', fontSize: '0.85rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <CheckCircle2 size={18} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span>{submitSuccess}</span>
                {printedInvoice && (
                  <button onClick={() => { if (typeof window !== 'undefined') window.print(); }} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.5rem', fontSize: '0.75rem', alignSelf: 'flex-start', marginTop: '0.25rem' }}>
                    <Printer size={12} />
                    Re-Print Thermal Slip
                  </button>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleRecordInvoice} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Salesman Name input */}
            <div className="form-group" style={{ maxWidth: '400px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <User size={14} />
                Salesman Name*
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="Enter your name (e.g. Ali)"
                value={salesmanName}
                onChange={(e) => setSalesmanName(e.target.value)}
                required
                disabled={actionLoading}
              />
            </div>

            {/* Invoicing Rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', borderBottom: '1px dashed var(--border-subtle)', paddingBottom: '0.5rem' }}>
                Invoice Items
              </span>
              
              {rows.map((row, index) => {
                const isTile = !row.product || row.product.category?.name === 'Tiles';
                
                return (
                  <div key={row.key} style={{ 
                    background: 'hsla(222, 47%, 6%, 0.3)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '12px',
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                    position: 'relative'
                  }} className="animate-fade-in">
                    
                    {/* Row Header with Item Number & Trash */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>Item #{index + 1}</span>
                      <button 
                        type="button" 
                        onClick={() => handleRemoveRow(row.key)}
                        className="btn-icon" 
                        style={{ color: 'var(--color-danger)', padding: '4px' }}
                        title="Remove Product"
                        disabled={actionLoading}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {/* Form Fields Grid */}
                    <div className="grid grid-3" style={{ gap: '1rem' }}>
                      
                      {/* Ref Code Input */}
                      <div className="form-group" style={{ gridColumn: 'span 1', marginBottom: 0 }}>
                        <label>Ref Code (Unique)*</label>
                        <input
                          type="text"
                          className="form-control"
                          style={{ textTransform: 'uppercase', fontWeight: 'bold' }}
                          placeholder="e.g. TL-MARBLE-01"
                          value={row.refCode}
                          onChange={(e) => handleRefCodeChange(index, e.target.value)}
                          required
                          disabled={actionLoading}
                        />
                        
                        {/* Real-time details lookup block */}
                        {row.product ? (
                          <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <span style={{ color: 'var(--text-main)', fontWeight: '600' }}>{row.product.name}</span>
                            <span style={{ color: 'var(--text-muted)' }}>
                              Stock: {isTile ? `${row.product.meters_available} m | ` : ''}
                              <strong>{row.product.boxes_available} boxes</strong> at <span className="badge badge-location" style={{ fontSize: '0.65rem', padding: '0.1rem 0.3rem' }}>{row.product.location?.name}</span>
                            </span>
                          </div>
                        ) : row.lookupError ? (
                          <span style={{ color: 'var(--color-danger)', fontSize: '0.7rem', marginTop: '0.25rem', display: 'block' }}>
                            {row.lookupError}
                          </span>
                        ) : null}
                      </div>

                      {/* Meters Sold & Price per Meter (Dynamic) */}
                      {isTile ? (
                        <div className="form-group" style={{ gridColumn: 'span 2', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: 0 }}>
                          <div>
                            <label>Meters Sold</label>
                            <input
                              type="number"
                              step="0.01"
                              className="form-control"
                              placeholder="0.00 m"
                              value={row.metersSold}
                              onChange={(e) => handleRowValueChange(index, 'metersSold', e.target.value !== '' ? Number(e.target.value) : '')}
                              disabled={actionLoading}
                            />
                            {row.product && Number(row.metersSold) > row.product.meters_available && (
                              <span style={{ color: 'var(--color-danger)', fontSize: '0.65rem', marginTop: '0.25rem', display: 'block' }}>Exceeds stock</span>
                            )}
                          </div>
                          <div>
                            <label>Selling Rate (M)*</label>
                            <input
                              type="number"
                              step="0.01"
                              className="form-control"
                              placeholder="Rs. / Meter"
                              value={row.sellingPriceMeter}
                              onChange={(e) => handleRowValueChange(index, 'sellingPriceMeter', e.target.value !== '' ? Number(e.target.value) : '')}
                              required={Number(row.metersSold) > 0}
                              disabled={actionLoading}
                            />
                          </div>
                        </div>
                      ) : (
                        // Placeholder block to maintain grid spacing if not Tile category
                        <div style={{ gridColumn: 'span 2' }} />
                      )}

                      {/* Boxes Sold & Price per Box */}
                      <div className="form-group" style={{ gridColumn: 'span 1', marginBottom: 0 }}>
                        <label>Boxes Sold</label>
                        <input
                          type="number"
                          className="form-control"
                          placeholder="0 boxes"
                          value={row.boxesSold}
                          onChange={(e) => handleRowValueChange(index, 'boxesSold', e.target.value !== '' ? Number(e.target.value) : '')}
                          disabled={actionLoading}
                        />
                        {row.product && Number(row.boxesSold) > row.product.boxes_available && (
                          <span style={{ color: 'var(--color-danger)', fontSize: '0.65rem', marginTop: '0.25rem', display: 'block' }}>Exceeds stock</span>
                        )}
                      </div>

                      <div className="form-group" style={{ gridColumn: 'span 1', marginBottom: 0 }}>
                        <label>Selling Rate (Box)*</label>
                        <input
                          type="number"
                          step="0.01"
                          className="form-control"
                          placeholder="Rs. / Box"
                          value={row.sellingPriceBox}
                          onChange={(e) => handleRowValueChange(index, 'sellingPriceBox', e.target.value !== '' ? Number(e.target.value) : '')}
                          required={Number(row.boxesSold) > 0}
                          disabled={actionLoading}
                        />
                      </div>

                      {/* Row Subtotal */}
                      <div className="form-group" style={{ gridColumn: 'span 1', marginBottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'flex-end' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Subtotal:</span>
                        <strong style={{ fontSize: '1.15rem', color: 'var(--color-accent)' }}>
                          Rs. {calculateRowTotal(row).toLocaleString()}
                        </strong>
                      </div>

                    </div>

                  </div>
                );
              })}
            </div>

            {/* Add row CTA */}
            <button
              type="button"
              onClick={handleAddRow}
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem' }}
              disabled={actionLoading}
            >
              <Plus size={16} />
              Add Another Product
            </button>

            {/* Summary Card (Strictly hiding profits) */}
            <div style={{ 
              background: 'hsla(222, 47%, 6%, 0.5)', 
              border: '1px solid var(--border-subtle)', 
              borderRadius: '12px', 
              padding: '1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '1rem',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              <div>
                <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 'bold', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
                  Total Invoice Summary
                </span>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  Billing {rows.filter(r => r.product).length} items | Total Quantities: {rows.reduce((sum, r) => sum + (Number(r.boxesSold) || 0), 0)} boxes
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-end', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Net Billing Amount:</span>
                <strong style={{ fontSize: '1.8rem', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '0.25rem', letterSpacing: '-0.03em' }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: 'normal' }}>Rs.</span>
                  {calculateInvoiceTotal().toLocaleString()}
                </strong>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="btn btn-primary"
              style={{ padding: '1rem', fontSize: '1rem', fontWeight: '600' }}
              disabled={actionLoading}
            >
              {actionLoading ? 'Recording Invoice...' : 'Record Invoice & Open Print Preview'}
            </button>

          </form>

        </div>

      </main>

      {/* =======================================
          PRINT-ONLY MULTI-ITEM THERMAL RECEIPT
          ======================================= */}
      {printedInvoice && (
        <div className="print-slip" style={{ display: 'none' }}>
          <h2>SHOWROOM SALES INVOICE</h2>
          <div style={{ textAlign: 'center', fontSize: '8pt', marginBottom: '15px', color: '#555' }}>
            Showroom Billing & Stock Despatch<br />
            Invoice ID: <strong>{printedInvoice.invoiceId.toUpperCase()}</strong><br />
            Date/Time: {printedInvoice.date}
          </div>

          <div style={{ borderBottom: '1px dashed #333', paddingBottom: '8px', marginBottom: '10px', fontSize: '9pt' }}>
            <span>SALESMAN:</span> <strong>{printedInvoice.salesmanName}</strong>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8pt', marginBottom: '15px' }}>
            <thead>
              <tr style={{ borderBottom: '1px dashed #333', textAlign: 'left' }}>
                <th style={{ padding: '4px 0' }}>Item/Ref</th>
                <th style={{ padding: '4px 0', textAlign: 'right' }}>Qty</th>
                <th style={{ padding: '4px 0', textAlign: 'right' }}>Rate</th>
                <th style={{ padding: '4px 0', textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {printedInvoice.items.map((item, idx) => (
                <React.Fragment key={idx}>
                  <tr style={{ fontWeight: 'bold' }}>
                    <td colSpan={4} style={{ padding: '6px 0 2px 0' }}>
                      {idx + 1}. {item.name}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px dotted #ccc', color: '#333' }}>
                    <td style={{ padding: '2px 0 6px 0', color: '#666' }}><code>{item.refCode}</code></td>
                    <td style={{ padding: '2px 0 6px 0', textAlign: 'right' }}>
                      {item.meters > 0 && <div>{item.meters} m</div>}
                      {item.boxes > 0 && <div>{item.boxes} b</div>}
                    </td>
                    <td style={{ padding: '2px 0 6px 0', textAlign: 'right' }}>
                      {item.meters > 0 && <div>Rs. {item.rateMeter}</div>}
                      {item.boxes > 0 && <div>Rs. {item.rateBox}</div>}
                    </td>
                    <td style={{ padding: '2px 0 6px 0', textAlign: 'right', fontWeight: 'bold' }}>
                      Rs. {item.total.toLocaleString()}
                    </td>
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
          </table>

          <div style={{ 
            borderTop: '1px dashed #333', 
            paddingTop: '8px', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            fontSize: '10pt',
            fontWeight: 'bold'
          }}>
            <span>TOTAL AMOUNT:</span>
            <span>Rs. {printedInvoice.total.toLocaleString()}</span>
          </div>

          <div className="print-slip-footer" style={{ marginTop: '30px', borderTop: '1px dotted #999', paddingTop: '10px' }}>
            Thank you for your business!<br />
            Warehouse Copy. Please return signed copy to billing desk.
          </div>
        </div>
      )}

      {/* Footer Branding */}
      <footer className="no-print" style={{ textAlign: 'center', padding: '2rem 0', marginTop: 'auto', color: 'var(--text-muted)', fontSize: '0.8rem', borderTop: '1px solid var(--border-subtle)' }}>
        &copy; {new Date().getFullYear()} Showroom Inventory Desk. All rights reserved.
      </footer>

    </div>
  );
}
