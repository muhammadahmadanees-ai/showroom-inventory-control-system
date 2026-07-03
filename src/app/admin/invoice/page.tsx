'use client';

import React, { useState, useEffect } from 'react';
import { db, Product, Sale } from '@/lib/db';
import { 
  Plus, 
  Trash2, 
  Printer, 
  AlertTriangle, 
  CheckCircle2, 
  ShoppingBag, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Percent,
  User
} from 'lucide-react';

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

export default function AdminInvoiceBuilderPage() {
  const [salesmanName, setSalesmanName] = useState('Admin');
  const [rows, setRows] = useState<InvoiceRow[]>([
    { key: 'row-0', refCode: '', product: null, lookupError: '', metersSold: '', boxesSold: '', sellingPriceMeter: '', sellingPriceBox: '' }
  ]);
  const [adminEmail, setAdminEmail] = useState('admin@showroom.com');
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

  // Load Admin Session
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

  const calculateRowCost = (row: InvoiceRow) => {
    if (!row.product) return 0;
    const meters = Number(row.metersSold) || 0;
    const boxes = Number(row.boxesSold) || 0;
    return Number((meters * row.product.buying_price_meter + boxes * row.product.buying_price_box).toFixed(2));
  };

  const calculateInvoiceTotal = () => {
    return rows.reduce((sum, row) => sum + calculateRowTotal(row), 0);
  };

  const calculateInvoiceCost = () => {
    return rows.reduce((sum, row) => sum + calculateRowCost(row), 0);
  };

  const calculateInvoiceProfit = () => {
    return calculateInvoiceTotal() - calculateInvoiceCost();
  };

  const calculateInvoiceMargin = () => {
    const total = calculateInvoiceTotal();
    const profit = calculateInvoiceProfit();
    return total > 0 ? (profit / total) * 100 : 0;
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
          adminEmail,
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

  const invoiceTotal = calculateInvoiceTotal();
  const invoiceProfit = calculateInvoiceProfit();
  const invoiceMargin = calculateInvoiceMargin();
  const isProfitHealthy = invoiceMargin >= 15;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Executive Invoice Builder
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Bill multiple items with real-time profit and margin metrics. Stocks deduct automatically.
          </p>
        </div>
      </div>

      {submitError && (
        <div className="no-print" style={{ background: 'var(--color-danger-glow)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '0.85rem', borderRadius: '8px', color: 'var(--color-danger)', fontSize: '0.85rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <AlertTriangle size={18} />
          <span>{submitError}</span>
        </div>
      )}

      {submitSuccess && (
        <div className="no-print" style={{ background: 'var(--color-primary-glow)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '0.85rem', borderRadius: '8px', color: 'var(--color-primary)', fontSize: '0.85rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
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

      {/* Main Billing Form */}
      <div className="glass-card no-print" style={{ padding: '2rem' }}>
        
        <form onSubmit={handleRecordInvoice} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="grid grid-2" style={{ gap: '1.5rem', maxWidth: '800px' }}>
            {/* Salesman Name */}
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <User size={14} />
                Salesman Name*
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="Enter salesman name"
                value={salesmanName}
                onChange={(e) => setSalesmanName(e.target.value)}
                required
                disabled={actionLoading}
              />
            </div>

            {/* Operator info (admin email) */}
            <div className="form-group">
              <label>Logging Operator</label>
              <input
                type="text"
                className="form-control"
                value={adminEmail}
                disabled
              />
            </div>
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

                    {/* Row Subtotal & Costing info (Admin Privileged) */}
                    <div className="form-group" style={{ gridColumn: 'span 1', marginBottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'flex-end' }}>
                      {row.product && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.1rem' }}>
                          Buying Cost: Rs. {calculateRowCost(row).toLocaleString()}
                        </span>
                      )}
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

            {/* Summary Card (With admin cost, profit, and margin analytics) */}
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
              gap: '2rem'
            }}>
              <div>
                <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 'bold', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
                  Invoice Margin Diagnostic
                </span>
                <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                  <div style={{ fontSize: '0.8rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Accumulated Cost: </span>
                    <strong style={{ color: 'var(--text-main)' }}>Rs. {calculateInvoiceCost().toLocaleString()}</strong>
                  </div>
                  <div style={{ fontSize: '0.8rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Net Profit: </span>
                    <strong style={{ color: invoiceProfit >= 0 ? 'var(--color-primary)' : 'var(--color-danger)' }}>
                      Rs. {invoiceProfit.toLocaleString()}
                    </strong>
                  </div>
                  <div style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Profit Margin: </span>
                    <span className={`badge ${isProfitHealthy ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', fontWeight: 'bold' }}>
                      {invoiceProfit >= 0 ? <TrendingUp size={10} style={{ marginRight: '2px', display: 'inline' }} /> : <TrendingDown size={10} style={{ marginRight: '2px', display: 'inline' }} />}
                      {invoiceMargin.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-end', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Net Invoice Total:</span>
                <strong style={{ fontSize: '1.8rem', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '0.25rem', letterSpacing: '-0.03em' }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: 'normal' }}>Rs.</span>
                  {invoiceTotal.toLocaleString()}
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

    </div>
  );
}
