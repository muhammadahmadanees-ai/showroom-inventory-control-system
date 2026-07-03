'use client';

import React, { useState, useEffect, useRef } from 'react';
import { db, Product, Category, Location, InventoryLog } from '@/lib/db';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Archive, 
  Search, 
  FileSpreadsheet, 
  History, 
  Filter, 
  ArrowUpDown, 
  AlertTriangle, 
  AlertCircle,
  CheckCircle2, 
  X, 
  RotateCcw,
  BookOpen,
  ArrowRightLeft
} from 'lucide-react';

interface Toast {
  message: string;
  type: 'success' | 'error';
  visible: boolean;
}

export default function InventoryCRUDPage() {
  // Database states
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [auditLogs, setAuditLogs] = useState<InventoryLog[]>([]);
  
  // Interface states
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterLocation, setFilterLocation] = useState('all');
  const [sortBy, setSortBy] = useState<keyof Product>('updated_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [adminEmail, setAdminEmail] = useState('admin@showroom.com');

  // Pagination states
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Modals / Drawer toggles
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  
  // Selected items for Edit / Audit Logs
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedHistoryLogs, setSelectedHistoryLogs] = useState<InventoryLog[]>([]);

  // Form states for Add / Edit
  const [formRefCode, setFormRefCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formMeters, setFormMeters] = useState(0);
  const [formBoxes, setFormBoxes] = useState(0);
  const [formPriceMeter, setFormPriceMeter] = useState(0); // Buying Price per Meter
  const [formPriceBox, setFormPriceBox] = useState(0);   // Buying Price per Box
  const [formLocationId, setFormLocationId] = useState('');
  const [formMinStock, setFormMinStock] = useState(10);
  const [formError, setFormError] = useState('');
  
  // Bulk import states
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importSummary, setImportSummary] = useState<{ inserted: number; errors: string[] } | null>(null);
  const [importLoading, setImportLoading] = useState(false);

  // Toast notifications
  const [toast, setToast] = useState<Toast>({ message: '', type: 'success', visible: false });

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type, visible: true });
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 4000);
  };

  // Load active admin session
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
    loadAllData();

    // Read initial page and limit from URL
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const p = parseInt(params.get('page') || '1', 10);
      const l = parseInt(params.get('limit') || '25', 10);
      if (!isNaN(p) && p > 0) setPage(p);
      if (!isNaN(l) && (l === 25 || l === 50 || l === 100)) setPageSize(l);
    }
  }, [showArchived]);

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
  }, [searchTerm, filterCategory, filterLocation, sortBy, sortDirection]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [prods, cats, locs, logs] = await Promise.all([
        db.getProducts(showArchived),
        db.getCategories(),
        db.getLocations(),
        db.getAuditLogs()
      ]);
      setProducts(prods);
      setCategories(cats);
      setLocations(locs);
      setAuditLogs(logs);

      // Pre-fill form dropdown defaults
      if (cats.length > 0) setFormCategoryId(cats[0].id);
      if (locs.length > 0) setFormLocationId(locs[0].id);
    } catch (err: any) {
      showToast(err.message || 'Failed to load inventory data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Form Reset Helper
  const resetForm = () => {
    setFormRefCode('');
    setFormName('');
    if (categories.length > 0) setFormCategoryId(categories[0].id);
    setFormMeters(0);
    setFormBoxes(0);
    setFormPriceMeter(0);
    setFormPriceBox(0);
    if (locations.length > 0) setFormLocationId(locations[0].id);
    setFormMinStock(10);
    setFormError('');
  };

  // Open Edit Modal and Prefill
  const openEditModal = (prod: Product) => {
    setSelectedProduct(prod);
    setFormRefCode(prod.ref_code);
    setFormName(prod.name);
    setFormCategoryId(prod.category_id);
    setFormMeters(prod.meters_available);
    setFormBoxes(prod.boxes_available);
    setFormPriceMeter(prod.buying_price_meter);
    setFormPriceBox(prod.buying_price_box);
    setFormLocationId(prod.location_id);
    setFormMinStock(prod.min_stock_level);
    setFormError('');
    setIsEditModalOpen(true);
  };

  // Open History Drawer
  const openHistoryDrawer = (prod: Product) => {
    setSelectedProduct(prod);
    const prodLogs = auditLogs.filter(log => log.product_id === prod.id || log.ref_code === prod.ref_code);
    setSelectedHistoryLogs(prodLogs);
    setIsHistoryDrawerOpen(true);
  };

  // Sort logic
  const handleSort = (field: keyof Product) => {
    const isAsc = sortBy === field && sortDirection === 'asc';
    setSortDirection(isAsc ? 'desc' : 'asc');
    setSortBy(field);
  };

  // CRUD Operations
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const ref_code = formRefCode.trim().toUpperCase();
    const name = formName.trim();

    if (!ref_code || !name) {
      setFormError('Reference Code and Product Name are required.');
      return;
    }

    if (products.some(p => p.ref_code.toUpperCase() === ref_code && !p.is_archived)) {
      setFormError(`Product with Reference Code "${ref_code}" already exists.`);
      return;
    }

    try {
      const newProd = await db.createProduct({
        ref_code,
        name,
        category_id: formCategoryId,
        meters_available: Number(formMeters) || 0,
        boxes_available: Math.max(0, Math.floor(Number(formBoxes) || 0)),
        buying_price_meter: Number(formPriceMeter) || 0,
        buying_price_box: Number(formPriceBox) || 0,
        location_id: formLocationId,
        min_stock_level: Math.max(0, Math.floor(Number(formMinStock) || 0))
      }, adminEmail);

      showToast(`Product "${name}" successfully added to inventory!`, 'success');
      setIsAddModalOpen(false);
      resetForm();
      loadAllData();
    } catch (err: any) {
      setFormError(err.message || 'An error occurred while creating the product.');
    }
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    setFormError('');

    const ref_code = formRefCode.trim().toUpperCase();
    const name = formName.trim();

    if (!ref_code || !name) {
      setFormError('Reference Code and Product Name are required.');
      return;
    }

    try {
      await db.updateProduct(selectedProduct.id, {
        ref_code,
        name,
        category_id: formCategoryId,
        meters_available: Number(formMeters) || 0,
        boxes_available: Math.max(0, Math.floor(Number(formBoxes) || 0)),
        buying_price_meter: Number(formPriceMeter) || 0,
        buying_price_box: Number(formPriceBox) || 0,
        location_id: formLocationId,
        min_stock_level: Math.max(0, Math.floor(Number(formMinStock) || 0))
      }, adminEmail);

      showToast(`Product "${name}" successfully updated!`, 'success');
      setIsEditModalOpen(false);
      setSelectedProduct(null);
      resetForm();
      loadAllData();
    } catch (err: any) {
      setFormError(err.message || 'An error occurred while updating the product.');
    }
  };

  const handleArchiveProduct = async (prod: Product) => {
    const actionText = prod.is_archived ? 'restore' : 'archive';
    if (!confirm(`Are you sure you want to ${actionText} the product "${prod.name}" (${prod.ref_code})?`)) {
      return;
    }

    try {
      if (prod.is_archived) {
        await db.updateProduct(prod.id, { is_archived: false }, adminEmail);
        showToast(`Product "${prod.name}" has been restored.`, 'success');
      } else {
        await db.archiveProduct(prod.id, adminEmail);
        showToast(`Product "${prod.name}" has been archived.`, 'success');
      }
      loadAllData();
    } catch (err: any) {
      showToast(err.message || `Failed to ${actionText} product.`, 'error');
    }
  };

  // CSV Bulk Import Handler (adapted for buying_price columns)
  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportLoading(true);
    setImportSummary(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (!text) {
        showToast('CSV file is empty or could not be read.', 'error');
        setImportLoading(false);
        return;
      }

      try {
        const lines = text.split(/\r?\n/);
        if (lines.length <= 1) {
          showToast('CSV file does not contain rows to import.', 'error');
          setImportLoading(false);
          return;
        }

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/^"|"$/g, ''));
        const requiredHeaders = ['ref_code', 'name', 'category_name', 'meters_available', 'boxes_available', 'buying_price_meter', 'buying_price_box', 'location_name', 'min_stock_level'];
        
        const missingHeaders = requiredHeaders.filter(rh => !headers.includes(rh));
        if (missingHeaders.length > 0) {
          throw new Error(`CSV is missing columns: ${missingHeaders.join(', ')}`);
        }

        const rows: any[] = [];
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          const values: string[] = [];
          let insideQuote = false;
          let currentVal = '';
          
          for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"') {
              insideQuote = !insideQuote;
            } else if (char === ',' && !insideQuote) {
              values.push(currentVal.trim().replace(/^"|"$/g, ''));
              currentVal = '';
            } else {
              currentVal += char;
            }
          }
          values.push(currentVal.trim().replace(/^"|"$/g, ''));

          if (values.length === headers.length) {
            const obj: any = {};
            headers.forEach((header, idx) => {
              obj[header] = values[idx];
            });
            rows.push({
              ref_code: obj.ref_code,
              name: obj.name,
              category_name: obj.category_name,
              meters_available: Number(obj.meters_available) || 0,
              boxes_available: Number(obj.boxes_available) || 0,
              buying_price_meter: Number(obj.buying_price_meter) || 0,
              buying_price_box: Number(obj.buying_price_box) || 0,
              location_name: obj.location_name,
              min_stock_level: Number(obj.min_stock_level) || 10
            });
          }
        }

        const summary = await db.bulkImportProducts(rows, adminEmail);
        setImportSummary(summary);
        showToast(`Bulk Import complete! Successfully added ${summary.inserted} products.`, summary.errors.length > 0 ? 'error' : 'success');
        loadAllData();
      } catch (err: any) {
        showToast(err.message || 'CSV Import failed. Check formatting.', 'error');
      } finally {
        setImportLoading(false);
      }
    };
    reader.readAsText(file);
  };

  const triggerCSVUpload = () => {
    fileInputRef.current?.click();
  };

  // Export Inventory as CSV
  const handleExportCSV = () => {
    if (filteredProducts.length === 0) return;

    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'ID,Reference Code,Product Name,Category,Meters Available,Boxes Available,Buying Price Meter,Buying Price Box,Storage Location,Min Stock Level,Is Archived,Last Updated\n';

    filteredProducts.forEach((p) => {
      const row = [
        p.id,
        `"${p.ref_code}"`,
        `"${p.name}"`,
        `"${p.category?.name || 'Unknown'}"`,
        p.meters_available,
        p.boxes_available,
        p.buying_price_meter,
        p.buying_price_box,
        `"${p.location?.name || 'Unknown'}"`,
        p.min_stock_level,
        p.is_archived ? 'Yes' : 'No',
        new Date(p.updated_at).toISOString()
      ].join(',');
      csvContent += row + '\n';
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `inventory_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter and Search Pipeline
  const filteredProducts = products
    .filter((p) => {
      const search = searchTerm.toLowerCase();
      const matchesSearch = 
        p.name.toLowerCase().includes(search) || 
        p.ref_code.toLowerCase().includes(search);
      
      const matchesCategory = filterCategory === 'all' || p.category_id === filterCategory;
      const matchesLocation = filterLocation === 'all' || p.location_id === filterLocation;

      return matchesSearch && matchesCategory && matchesLocation;
    })
    .sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];

      if (typeof valA === 'string') {
        return sortDirection === 'asc' 
          ? (valA as string).localeCompare(valB as string)
          : (valB as string).localeCompare(valA as string);
      }
      
      if (typeof valA === 'number') {
        return sortDirection === 'asc'
          ? (valA as number) - (valB as number)
          : (valB as number) - (valA as number);
      }
      
      return 0;
    });

  const totalRows = filteredProducts.length;
  const totalPages = Math.ceil(totalRows / pageSize);
  const currentPage = Math.max(1, Math.min(page, totalPages || 1));
  const startRow = totalRows === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endRow = Math.min(currentPage * pageSize, totalRows);
  const paginatedProducts = filteredProducts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Toast Alert */}
      {toast.visible && (
        <div className={`toast toast-${toast.type}`}>
          {toast.type === 'success' ? <CheckCircle2 size={18} style={{ color: 'var(--color-primary)' }} /> : <AlertCircle size={18} style={{ color: 'var(--color-danger)' }} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header Panel */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Showroom Inventory Management
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Configure tiles and sanitary wear stock levels, audit buying costs, and bulk import records.
          </p>
        </div>
        
        {/* Header CTA Actions */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button 
            onClick={() => setShowArchived(!showArchived)} 
            className={`btn ${showArchived ? 'btn-accent' : 'btn-secondary'}`}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Archive size={16} />
            {showArchived ? 'Hide Archived' : 'Show Archived'}
          </button>
          <button 
            onClick={triggerCSVUpload} 
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            disabled={importLoading}
          >
            <FileSpreadsheet size={16} />
            {importLoading ? 'Importing...' : 'Bulk Import CSV'}
          </button>
          <button 
            onClick={handleExportCSV} 
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <FileSpreadsheet size={16} />
            Export Inventory CSV
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleCSVImport} 
            style={{ display: 'none' }} 
            accept=".csv"
          />
          <button 
            onClick={() => { resetForm(); setIsAddModalOpen(true); }} 
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Plus size={18} />
            Add New Product
          </button>
        </div>
      </div>

      {/* Filter and Search Bar Card */}
      <div className="glass-card" style={{ padding: '1.25rem 1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-control"
            style={{ paddingLeft: '2.5rem', width: '100%' }}
            placeholder="Search by name or reference code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={14} style={{ color: 'var(--text-muted)' }} />
            <select
              className="form-control"
              style={{ padding: '0.5rem 1rem' }}
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="all">All Categories</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <select
            className="form-control"
            style={{ padding: '0.5rem 1rem' }}
            value={filterLocation}
            onChange={(e) => setFilterLocation(e.target.value)}
          >
            <option value="all">All Locations</option>
            {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>

          <button onClick={loadAllData} className="btn-icon" title="Refresh Table">
            <RotateCcw size={16} />
          </button>
        </div>

      </div>

      {/* Main Inventory Table */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem 0' }}>
          <div style={{
            border: '4px solid rgba(16, 185, 129, 0.1)',
            borderTop: '4px solid var(--color-primary)',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            animation: 'spin 1s linear infinite'
          }} />
        </div>
      ) : (
        <>
          <div className="table-container animate-fade-in">
            <table className="custom-table">
              <thead>
                <tr>
                  <th style={{ cursor: 'pointer' }} onClick={() => handleSort('ref_code')}>
                    Ref Code <ArrowUpDown size={12} />
                  </th>
                  <th style={{ cursor: 'pointer' }} onClick={() => handleSort('name')}>
                    Product Name <ArrowUpDown size={12} />
                  </th>
                  <th>Category</th>
                  <th style={{ cursor: 'pointer' }} onClick={() => handleSort('meters_available')}>
                    Meters <ArrowUpDown size={12} />
                  </th>
                  <th style={{ cursor: 'pointer' }} onClick={() => handleSort('boxes_available')}>
                    Boxes <ArrowUpDown size={12} />
                  </th>
                  <th>Location</th>
                  <th>Buying Cost</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedProducts.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>
                      No products found matching filters.
                    </td>
                  </tr>
                ) : (
                  paginatedProducts.map((prod) => {
                    const isLowStock = prod.boxes_available <= prod.min_stock_level;
                    const isTile = prod.category?.name === 'Tiles';
                    return (
                      <tr key={prod.id} style={{ 
                        opacity: prod.is_archived ? 0.5 : 1,
                        background: isLowStock && !prod.is_archived ? 'rgba(239, 68, 68, 0.02)' : 'transparent'
                      }}>
                        <td>
                          <code style={{ fontWeight: 'bold', color: 'var(--color-primary)' }}>{prod.ref_code}</code>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: '600' }}>{prod.name}</span>
                            {prod.is_archived && <span style={{ fontSize: '0.7rem', color: 'var(--color-danger)', fontWeight: 'bold', textTransform: 'uppercase' }}>Archived</span>}
                          </div>
                        </td>
                        <td>
                          <span className="badge badge-category">{prod.category?.name || 'Unknown'}</span>
                        </td>
                        <td>
                          {isTile ? `${prod.meters_available} m` : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <strong style={{ color: isLowStock && !prod.is_archived ? 'var(--color-danger)' : 'inherit' }}>
                              {prod.boxes_available}
                            </strong>
                            {isLowStock && !prod.is_archived && (
                              <span className="badge badge-danger low-stock-alert" style={{ padding: '0.1rem 0.3rem', fontSize: '0.65rem' }}>
                                Low Stock
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <span className="badge badge-location">{prod.location?.name || 'Unknown'}</span>
                        </td>
                        <td>
                          <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                            {isTile && <span>M: <strong style={{ color: 'var(--color-accent)' }}>Rs. {prod.buying_price_meter.toLocaleString()}</strong></span>}
                            <span>B: <strong style={{ color: 'var(--color-accent)' }}>Rs. {prod.buying_price_box.toLocaleString()}</strong></span>
                          </div>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '0.25rem' }}>
                            <button 
                              onClick={() => openHistoryDrawer(prod)}
                              className="btn-icon" 
                              title="View Edit History"
                            >
                              <History size={16} />
                            </button>
                            {!prod.is_archived && (
                              <button 
                                onClick={() => openEditModal(prod)}
                                className="btn-icon" 
                                title="Edit Product"
                                style={{ color: 'var(--color-accent)' }}
                              >
                                <Edit2 size={16} />
                              </button>
                            )}
                            <button 
                              onClick={() => handleArchiveProduct(prod)}
                              className="btn-icon" 
                              title={prod.is_archived ? 'Restore Product' : 'Archive Product'}
                              style={{ color: prod.is_archived ? 'var(--color-primary)' : 'var(--color-danger)' }}
                            >
                              {prod.is_archived ? <RotateCcw size={16} /> : <Trash2 size={16} />}
                            </button>
                          </div>
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
                          style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', minHeight: 'auto' }}
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
                          style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', minHeight: 'auto' }}
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

      {/* ====================================
          MODAL: ADD PRODUCT (Buying Price Costing)
          ==================================== */}
      {isAddModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in">
            <div className="modal-header">
              <h2 style={{ fontSize: '1.25rem' }}>Add New Product (Cost Valuation)</h2>
              <button className="btn-icon" onClick={() => setIsAddModalOpen(false)}><X size={20} /></button>
            </div>
            
            <form onSubmit={handleAddProduct}>
              <div className="modal-body">
                {formError && (
                  <div style={{ background: 'var(--color-danger-glow)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '0.75rem', borderRadius: '8px', color: 'var(--color-danger)', fontSize: '0.85rem', marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <AlertTriangle size={16} />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="grid grid-2">
                  <div className="form-group" style={{ gridColumn: 'span 1' }}>
                    <label>Ref Code (Unique)*</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      style={{ textTransform: 'uppercase' }} 
                      placeholder="e.g. TL-MARBLE-01"
                      value={formRefCode}
                      onChange={(e) => setFormRefCode(e.target.value)}
                      required 
                    />
                  </div>
                  
                  <div className="form-group" style={{ gridColumn: 'span 1' }}>
                    <label>Category*</label>
                    <select 
                      className="form-control"
                      value={formCategoryId}
                      onChange={(e) => setFormCategoryId(e.target.value)}
                      required
                    >
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label>Product Name*</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="e.g. Carrara White Glossy Tile 60x60" 
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      required 
                    />
                  </div>

                  <div className="form-group">
                    <label>Stock (Meters)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      className="form-control" 
                      value={formMeters}
                      onChange={(e) => setFormMeters(Number(e.target.value))}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Stock (Boxes)*</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      value={formBoxes}
                      onChange={(e) => setFormBoxes(Number(e.target.value))}
                      required 
                    />
                  </div>

                  <div className="form-group">
                    <label>Buying Price (per Meter)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      className="form-control" 
                      placeholder="Cost price"
                      value={formPriceMeter}
                      onChange={(e) => setFormPriceMeter(Number(e.target.value))}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Buying Price (per Box)*</label>
                    <input 
                      type="number" 
                      step="0.01"
                      className="form-control" 
                      placeholder="Cost price"
                      value={formPriceBox}
                      onChange={(e) => setFormPriceBox(Number(e.target.value))}
                      required 
                    />
                  </div>

                  <div className="form-group">
                    <label>Storage Location*</label>
                    <select 
                      className="form-control"
                      value={formLocationId}
                      onChange={(e) => setFormLocationId(e.target.value)}
                      required
                    >
                      {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label>Min Stock Level Alert (Boxes)</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      value={formMinStock}
                      onChange={(e) => setFormMinStock(Number(e.target.value))}
                      required 
                    />
                  </div>
                </div>
              </div>
              
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsAddModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Product</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================
          MODAL: EDIT PRODUCT (Buying Price Costing)
          ==================================== */}
      {isEditModalOpen && selectedProduct && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in">
            <div className="modal-header">
              <h2 style={{ fontSize: '1.25rem' }}>Edit Product Cost Details</h2>
              <button className="btn-icon" onClick={() => { setIsEditModalOpen(false); setSelectedProduct(null); }}><X size={20} /></button>
            </div>
            
            <form onSubmit={handleUpdateProduct}>
              <div className="modal-body">
                {formError && (
                  <div style={{ background: 'var(--color-danger-glow)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '0.75rem', borderRadius: '8px', color: 'var(--color-danger)', fontSize: '0.85rem', marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <AlertTriangle size={16} />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="grid grid-2">
                  <div className="form-group">
                    <label>Ref Code (Unique)*</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      style={{ textTransform: 'uppercase' }}
                      value={formRefCode}
                      onChange={(e) => setFormRefCode(e.target.value)}
                      required 
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Category*</label>
                    <select 
                      className="form-control"
                      value={formCategoryId}
                      onChange={(e) => setFormCategoryId(e.target.value)}
                      required
                    >
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label>Product Name*</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      required 
                    />
                  </div>

                  <div className="form-group">
                    <label>Stock (Meters)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      className="form-control" 
                      value={formMeters}
                      onChange={(e) => setFormMeters(Number(e.target.value))}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Stock (Boxes)*</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      value={formBoxes}
                      onChange={(e) => setFormBoxes(Number(e.target.value))}
                      required 
                    />
                  </div>

                  <div className="form-group">
                    <label>Buying Price (per Meter)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      className="form-control" 
                      value={formPriceMeter}
                      onChange={(e) => setFormPriceMeter(Number(e.target.value))}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Buying Price (per Box)*</label>
                    <input 
                      type="number" 
                      step="0.01"
                      className="form-control" 
                      value={formPriceBox}
                      onChange={(e) => setFormPriceBox(Number(e.target.value))}
                      required 
                    />
                  </div>

                  <div className="form-group">
                    <label>Storage Location*</label>
                    <select 
                      className="form-control"
                      value={formLocationId}
                      onChange={(e) => setFormLocationId(e.target.value)}
                      required
                    >
                      {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label>Min Stock Level Alert (Boxes)</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      value={formMinStock}
                      onChange={(e) => setFormMinStock(Number(e.target.value))}
                      required 
                    />
                  </div>
                </div>
              </div>
              
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => { setIsEditModalOpen(false); setSelectedProduct(null); }}>Cancel</button>
                <button type="submit" className="btn btn-accent">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================
          DRAWER: AUDIT / EDIT HISTORY
          ==================================== */}
      {isHistoryDrawerOpen && selectedProduct && (
        <div className="drawer-overlay" onClick={() => { setIsHistoryDrawerOpen(false); setSelectedProduct(null); }}>
          <div className="drawer-content animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <div>
                <h2 style={{ fontSize: '1.2rem' }}>Product Audit Log</h2>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{selectedProduct.name} ({selectedProduct.ref_code})</span>
              </div>
              <button className="btn-icon" onClick={() => { setIsHistoryDrawerOpen(false); setSelectedProduct(null); }}><X size={20} /></button>
            </div>
            
            <div className="drawer-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {selectedHistoryLogs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
                  <History size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                  <p>No audit logs recorded for this product yet.</p>
                </div>
              ) : (
                selectedHistoryLogs.map((log) => {
                  let actionBadge = 'badge-location';
                  if (log.action === 'create') actionBadge = 'badge-success';
                  if (log.action === 'archive') actionBadge = 'badge-danger';
                  return (
                    <div key={log.id} style={{ 
                      background: 'hsla(222, 47%, 6%, 0.4)', 
                      padding: '1rem', 
                      borderRadius: '8px', 
                      border: '1px solid var(--border-subtle)',
                      fontSize: '0.85rem'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span className={`badge ${actionBadge}`} style={{ fontSize: '0.65rem' }}>{log.action}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p style={{ color: 'var(--text-muted)' }}>
                        User: <strong style={{ color: 'var(--text-main)' }}>{log.edited_by}</strong>
                      </p>
                      
                      {log.action === 'update' && log.old_values && log.new_values && (
                        <div style={{ marginTop: '0.75rem', borderTop: '1px dashed var(--border-subtle)', paddingTop: '0.5rem', fontSize: '0.8rem' }}>
                          <span style={{ color: 'var(--text-muted)', fontWeight: 'bold' }}>Changes Made:</span>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.25rem' }}>
                            {Object.keys(log.new_values).map((key) => {
                              if (key === 'updated_at' || log.old_values[key] === log.new_values[key]) return null;
                              return (
                                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                                  <span style={{ color: 'var(--text-muted)' }}>{key}:</span>
                                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                    <code style={{ textDecoration: 'line-through', opacity: 0.6 }}>{String(log.old_values[key])}</code>
                                    <ArrowRightLeft size={10} />
                                    <code style={{ color: 'var(--color-primary)' }}>{String(log.new_values[key])}</code>
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ====================================
          MODAL: BULK IMPORT CSV SUMMARY
          ==================================== */}
      {importSummary && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2 style={{ fontSize: '1.25rem', color: 'var(--color-primary)' }}>Bulk Import Finished</h2>
              <button className="btn-icon" onClick={() => setImportSummary(null)}><X size={20} /></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', background: 'var(--color-primary-glow)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '1rem', borderRadius: '8px', fontSize: '0.95rem' }}>
                <span>Successfully Imported Products:</span>
                <strong>{importSummary.inserted}</strong>
              </div>
              
              {importSummary.errors.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <span style={{ color: 'var(--color-danger)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <AlertTriangle size={16} />
                    Import Validation Errors ({importSummary.errors.length})
                  </span>
                  <div style={{ 
                    maxHeight: '200px', 
                    overflowY: 'auto', 
                    background: 'hsla(222, 47%, 6%, 0.6)', 
                    border: '1px solid var(--border-subtle)', 
                    padding: '0.75rem', 
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.4rem'
                  }}>
                    {importSummary.errors.map((err, idx) => (
                      <div key={idx} style={{ color: 'var(--color-danger)', borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '0.25rem' }}>
                        {err}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => setImportSummary(null)}>Close Summary</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
