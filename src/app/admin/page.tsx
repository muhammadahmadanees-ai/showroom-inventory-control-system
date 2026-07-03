'use client';

import React, { useState, useEffect } from 'react';
import { db, Product, Sale, Category } from '@/lib/db';
import { 
  TrendingUp, 
  DollarSign, 
  Package, 
  ShoppingCart, 
  Percent, 
  AlertTriangle, 
  ArrowRight, 
  FileSpreadsheet, 
  RefreshCw, 
  CheckCircle2,
  Calendar,
  Layers,
  Award,
  TrendingUp as ProfitIcon
} from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  subtext: string;
  glowColor?: string;
}

function MetricCard({ title, value, icon, subtext, glowColor = 'var(--color-primary-glow)' }: MetricCardProps) {
  return (
    <div className="glass-card" style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '0.75rem',
      padding: '1.5rem',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{ 
        position: 'absolute', 
        top: '-20px', 
        right: '-20px', 
        width: '80px', 
        height: '80px', 
        borderRadius: '50%', 
        background: glowColor, 
        filter: 'blur(20px)',
        zIndex: 0
      }} />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 1 }}>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {title}
        </span>
        <div style={{ color: 'var(--text-main)', opacity: 0.8 }}>{icon}</div>
      </div>
      
      <div style={{ zIndex: 1 }}>
        <h3 style={{ fontSize: '1.8rem', fontWeight: '800', letterSpacing: '-0.03em' }}>{value}</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.25rem' }}>{subtext}</p>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [timePeriod, setTimePeriod] = useState<'7days' | '4weeks' | '12months' | 'ytd'>('7days');

  // Stats states
  const [revenue, setRevenue] = useState(0);
  const [profit, setProfit] = useState(0);
  const [profitMargin, setProfitMargin] = useState(0);
  const [unitsSold, setUnitsSold] = useState(0);
  const [avgSaleValue, setAvgSaleValue] = useState(0);
  const [topProduct, setTopProduct] = useState({ name: 'N/A', amount: 0 });
  const [overallInventoryValue, setOverallInventoryValue] = useState(0);
  const [lowStockAlerts, setLowStockAlerts] = useState<Product[]>([]);

  // Chart data states
  const [salesTrendData, setSalesTrendData] = useState<Array<{ label: string; value: number }>>([]);
  const [bestSellersData, setBestSellersData] = useState<Array<{ label: string; qty: number; revenue: number }>>([]);
  const [velocityData, setVelocityData] = useState<Array<{ label: string; rate: number }>>([]);

  useEffect(() => {
    loadDashboardData();
  }, [timePeriod]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [salesData, productsData, categoriesData] = await Promise.all([
        db.getSales(),
        db.getProducts(),
        db.getCategories()
      ]);
      setSales(salesData);
      setProducts(productsData);
      setCategories(categoriesData);

      calculateMetrics(salesData, productsData, categoriesData);
    } catch (err) {
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateMetrics = (allSales: Sale[], allProducts: Product[], allCats: Category[]) => {
    // 1. Calculate overall inventory cost asset value (buying price valuation)
    const activeProducts = allProducts.filter(p => !p.is_archived);
    const totalInvVal = activeProducts.reduce((sum, p) => {
      const boxValue = p.boxes_available * p.buying_price_box;
      const meterValue = p.meters_available * p.buying_price_meter;
      return sum + boxValue + meterValue;
    }, 0);
    setOverallInventoryValue(totalInvVal);

    // 2. Identify low stock items
    const lowStock = activeProducts.filter(p => p.boxes_available <= p.min_stock_level);
    setLowStockAlerts(lowStock);

    // 3. Filter sales by selected time period
    const now = new Date();
    let periodStartDate = new Date();
    
    if (timePeriod === '7days') {
      periodStartDate.setDate(now.getDate() - 7);
    } else if (timePeriod === '4weeks') {
      periodStartDate.setDate(now.getDate() - 28);
    } else if (timePeriod === '12months') {
      periodStartDate.setMonth(now.getMonth() - 12);
    } else if (timePeriod === 'ytd') {
      periodStartDate = new Date(now.getFullYear(), 0, 1); // Jan 1st
    }

    const filteredSales = allSales.filter(s => new Date(s.sold_at) >= periodStartDate);

    // 4. Compute revenue and profit metrics for selected period
    const totalRev = filteredSales.reduce((sum, s) => sum + s.total_amount, 0);
    setRevenue(totalRev);

    const totalProfit = filteredSales.reduce((sum, s) => sum + s.profit, 0);
    setProfit(totalProfit);

    const margin = totalRev > 0 ? (totalProfit / totalRev) * 100 : 0;
    setProfitMargin(margin);

    const totalUnits = filteredSales.reduce((sum, s) => sum + s.boxes_sold + (s.meters_sold > 0 ? 1 : 0), 0);
    setUnitsSold(totalUnits);

    const avgVal = filteredSales.length > 0 ? totalRev / filteredSales.length : 0;
    setAvgSaleValue(avgVal);

    // 5. Determine Top Product by Revenue
    const productSalesMap = new Map<string, { name: string; revenue: number; qty: number }>();
    filteredSales.forEach(s => {
      const current = productSalesMap.get(s.ref_code) || { name: s.product_name, revenue: 0, qty: 0 };
      current.revenue += s.total_amount;
      current.qty += s.boxes_sold + s.meters_sold;
      productSalesMap.set(s.ref_code, current);
    });

    let topProdName = 'N/A';
    let topProdRev = 0;
    productSalesMap.forEach((val) => {
      if (val.revenue > topProdRev) {
        topProdRev = val.revenue;
        topProdName = val.name;
      }
    });
    setTopProduct({ name: topProdName, amount: topProdRev });

    // 6. Generate Sales Trend Chart Data
    const trendMap = new Map<string, number>();
    
    if (timePeriod === '7days') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        trendMap.set(d.toLocaleDateString(undefined, { weekday: 'short' }), 0);
      }
      filteredSales.forEach(s => {
        const key = new Date(s.sold_at).toLocaleDateString(undefined, { weekday: 'short' });
        if (trendMap.has(key)) {
          trendMap.set(key, (trendMap.get(key) || 0) + s.total_amount);
        }
      });
    } else if (timePeriod === '4weeks') {
      for (let i = 3; i >= 0; i--) {
        trendMap.set(`Week -${i}`, 0);
      }
      filteredSales.forEach(s => {
        const diffTime = Math.abs(now.getTime() - new Date(s.sold_at).getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const weekIdx = Math.min(3, Math.floor(diffDays / 7));
        const key = `Week -${weekIdx}`;
        trendMap.set(key, (trendMap.get(key) || 0) + s.total_amount);
      });
      const reversedMap = new Map<string, number>();
      Array.from(trendMap.keys()).reverse().forEach(k => {
        reversedMap.set(k, trendMap.get(k) || 0);
      });
      trendMap.clear();
      reversedMap.forEach((v, k) => trendMap.set(k, v));
    } else {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      if (timePeriod === '12months') {
        for (let i = 11; i >= 0; i--) {
          const d = new Date();
          d.setMonth(now.getMonth() - i);
          trendMap.set(monthNames[d.getMonth()], 0);
        }
      } else {
        const currentMonth = now.getMonth();
        for (let i = 0; i <= currentMonth; i++) {
          trendMap.set(monthNames[i], 0);
        }
      }
      filteredSales.forEach(s => {
        const m = new Date(s.sold_at).getMonth();
        const key = monthNames[m];
        if (trendMap.has(key)) {
          trendMap.set(key, (trendMap.get(key) || 0) + s.total_amount);
        }
      });
    }

    setSalesTrendData(Array.from(trendMap.entries()).map(([label, value]) => ({ label, value })));

    // 7. Generate Best Sellers Data
    const sortedProducts = Array.from(productSalesMap.entries())
      .map(([code, val]) => ({ label: val.name.substring(0, 18) + (val.name.length > 18 ? '..' : ''), qty: val.qty, revenue: val.revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
    setBestSellersData(sortedProducts);

    // 8. Product Velocity
    const velocityList = Array.from(productSalesMap.entries())
      .map(([code, val]) => {
        let days = 7;
        if (timePeriod === '4weeks') days = 28;
        if (timePeriod === '12months') days = 365;
        if (timePeriod === 'ytd') {
          const start = new Date(now.getFullYear(), 0, 1);
          days = Math.max(1, Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
        }
        return {
          label: code,
          rate: Number((val.qty / days).toFixed(2))
        };
      })
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 5);
    setVelocityData(velocityList);
  };

  // Export Sales History as CSV
  const handleExportCSV = () => {
    if (sales.length === 0) return;

    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'ID,Invoice ID,Date,Ref Code,Product Name,Meters Sold,Boxes Sold,Revenue,Costing,Net Profit,Sold By,Salesman Name\n';

    sales.forEach((s) => {
      const cost = s.total_amount - s.profit;
      const row = [
        s.id,
        `"${s.invoice_id || 'N/A'}"`,
        new Date(s.sold_at).toISOString(),
        `"${s.ref_code}"`,
        `"${s.product_name}"`,
        s.meters_sold,
        s.boxes_sold,
        s.total_amount,
        cost,
        s.profit,
        `"${s.sold_by}"`,
        `"${s.salesman_name || 'N/A'}"`
      ].join(',');
      csvContent += row + '\n';
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `sales_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const chartHeight = 180;
  const chartWidth = 450;
  const padding = 30;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Dashboard Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: '700' }}>Executive Dashboard</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Real-time sales tracking, low stock monitoring, and dynamic profit diagnostics.
          </p>
        </div>

        {/* Dashboard Controls */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          
          <div style={{ 
            display: 'flex', 
            background: 'var(--bg-surface-solid)', 
            border: '1px solid var(--border-subtle)', 
            borderRadius: '8px', 
            padding: '2px'
          }}>
            {(['7days', '4weeks', '12months', 'ytd'] as const).map((period) => (
              <button
                key={period}
                onClick={() => setTimePeriod(period)}
                style={{
                  background: timePeriod === period ? 'var(--color-primary-glow)' : 'transparent',
                  border: 'none',
                  borderRadius: '6px',
                  color: timePeriod === period ? 'var(--color-primary)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  padding: '0.5rem 0.85rem',
                  textTransform: 'uppercase',
                  transition: 'all var(--transition-fast)'
                }}
              >
                {period === '7days' ? '7 Days' : period === '4weeks' ? '4 Weeks' : period === '12months' ? '12 Months' : 'YTD'}
              </button>
            ))}
          </div>

          <button onClick={handleExportCSV} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileSpreadsheet size={16} />
            Export Ledger CSV
          </button>

          <button onClick={loadDashboardData} className="btn-icon" title="Refresh metrics">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '8rem 0' }}>
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
          {/* Metrics Cards Grid */}
          <div className="grid grid-4">
            
            <MetricCard 
              title="Total Revenue" 
              value={`Rs. ${revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              icon={<span style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--color-accent)' }}>Rs.</span>}
              subtext={`Total invoice sales in this period.`}
              glowColor="rgba(245, 158, 11, 0.12)"
            />

            <MetricCard 
              title="Net Profit" 
              value={`Rs. ${profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              icon={<TrendingUp style={{ color: 'var(--color-primary)' }} />}
              subtext={`${profitMargin.toFixed(1)}% margin | Avg: Rs. ${avgSaleValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
              glowColor="rgba(16, 185, 129, 0.15)"
            />

            <MetricCard 
              title="Invoices Issued" 
              value={unitsSold}
              icon={<ShoppingCart style={{ color: 'var(--color-info)' }} />}
              subtext={`Transactions logged in this period.`}
              glowColor="rgba(0, 180, 255, 0.12)"
            />

            <MetricCard 
              title="Top Selling Product" 
              value={topProduct.name !== 'N/A' ? (topProduct.name.length > 18 ? topProduct.name.substring(0,16) + '..' : topProduct.name) : 'No Sales'}
              icon={<Award style={{ color: 'var(--color-accent)' }} />}
              subtext={topProduct.amount > 0 ? `Earned Rs. ${topProduct.amount.toLocaleString()}` : 'No revenue recorded.'}
              glowColor="rgba(245, 158, 11, 0.15)"
            />

          </div>

          {/* Graphics & Charts Row */}
          <div className="grid grid-2">
            
            {/* Sales Trend (Line Chart) */}
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <TrendingUp size={18} style={{ color: 'var(--color-primary)' }} />
                Revenue Performance Trend (PKR)
              </h2>
              
              {salesTrendData.length === 0 ? (
                <div style={{ height: chartHeight, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                  No sales recorded in this period.
                </div>
              ) : (
                <div style={{ width: '100%', overflowX: 'auto' }}>
                  <svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`} style={{ overflow: 'visible' }}>
                    <defs>
                      <linearGradient id="lineGlow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    
                    <line x1={padding} y1={padding} x2={chartWidth - padding} y2={padding} stroke="var(--border-subtle)" strokeDasharray="4" />
                    <line x1={padding} y1={chartHeight - padding} x2={chartWidth - padding} y2={chartHeight - padding} stroke="var(--border-subtle)" />
                    
                    {(() => {
                      const maxVal = Math.max(...salesTrendData.map(d => d.value), 100);
                      const points = salesTrendData.map((d, i) => {
                        const x = padding + (i * (chartWidth - padding * 2)) / (salesTrendData.length - 1 || 1);
                        const y = chartHeight - padding - (d.value * (chartHeight - padding * 2)) / maxVal;
                        return { x, y, label: d.label, val: d.value };
                      });
                      
                      const pathD = points.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`, '');
                      const areaD = `${pathD} L ${points[points.length - 1].x} ${chartHeight - padding} L ${points[0].x} ${chartHeight - padding} Z`;

                      return (
                        <>
                          <path d={areaD} fill="url(#lineGlow)" />
                          <path d={pathD} fill="none" stroke="var(--color-primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                          
                          {points.map((p, idx) => (
                            <g key={idx} className="chart-node">
                              <circle cx={p.x} cy={p.y} r="4" fill="var(--bg-app)" stroke="var(--color-primary)" strokeWidth="2" />
                              <text x={p.x} y={chartHeight - 10} fill="var(--text-muted)" fontSize="9" textAnchor="middle">
                                {p.label}
                              </text>
                              <text x={p.x} y={p.y - 10} fill="var(--color-accent)" fontSize="9" fontWeight="bold" textAnchor="middle">
                                {p.val > 0 ? `Rs. ${p.val.toFixed(0)}` : ''}
                              </text>
                            </g>
                          ))}
                        </>
                      );
                    })()}
                  </svg>
                </div>
              )}
            </div>

            {/* Best Sellers (Bar Chart) */}
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Award size={18} style={{ color: 'var(--color-accent)' }} />
                Top Product Revenues (PKR)
              </h2>

              {bestSellersData.length === 0 ? (
                <div style={{ height: chartHeight, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                  No sales recorded in this period.
                </div>
              ) : (
                <div style={{ width: '100%', overflowX: 'auto' }}>
                  <svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`} style={{ overflow: 'visible' }}>
                    {(() => {
                      const maxVal = Math.max(...bestSellersData.map(d => d.revenue), 100);
                      const barWidth = 35;
                      const gap = (chartWidth - padding * 2 - bestSellersData.length * barWidth) / (bestSellersData.length - 1 || 1);
                      
                      return bestSellersData.map((d, i) => {
                        const x = padding + i * (barWidth + gap);
                        const h = ((chartHeight - padding * 2) * d.revenue) / maxVal;
                        const y = chartHeight - padding - h;
                        
                        return (
                          <g key={i}>
                            <rect 
                              x={x} 
                              y={y} 
                              width={barWidth} 
                              height={Math.max(2, h)} 
                              rx="4" 
                              fill="rgba(245, 158, 11, 0.75)" 
                              stroke="var(--color-accent)"
                              strokeWidth="1"
                            />
                            <text x={x + barWidth/2} y={y - 8} fill="var(--text-main)" fontSize="9" fontWeight="bold" textAnchor="middle">
                              Rs. {d.revenue.toFixed(0)}
                            </text>
                            <text x={x + barWidth/2} y={chartHeight - 10} fill="var(--text-muted)" fontSize="8" textAnchor="middle">
                              {d.label}
                            </text>
                          </g>
                        );
                      });
                    })()}
                  </svg>
                </div>
              )}
            </div>

          </div>

          {/* Lower Grid: Inventory Health & Alerts */}
          <div className="grid grid-3">
            
            {/* Low-Stock Alert List */}
            <div className="glass-card" style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertTriangle size={18} style={{ color: 'var(--color-danger)' }} />
                  Low Stock Monitoring ({lowStockAlerts.length})
                </h2>
                <span className="badge badge-danger" style={{ fontSize: '0.65rem' }}>Attention Required</span>
              </div>

              <div className="table-container" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                <table className="custom-table" style={{ fontSize: '0.85rem' }}>
                  <thead>
                    <tr>
                      <th>Ref Code</th>
                      <th>Product Name</th>
                      <th>Storage Location</th>
                      <th>Min Alert</th>
                      <th>Boxes Left</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowStockAlerts.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', color: 'var(--color-primary)', padding: '2rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                            <CheckCircle2 size={16} />
                            <span>All product inventory levels healthy.</span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      lowStockAlerts.map((prod) => (
                        <tr key={prod.id} style={{ background: 'rgba(239, 68, 68, 0.01)' }}>
                          <td><code style={{ fontWeight: 'bold', color: 'var(--color-primary)' }}>{prod.ref_code}</code></td>
                          <td style={{ fontWeight: '600' }}>{prod.name}</td>
                          <td><span className="badge badge-location" style={{ fontSize: '0.65rem' }}>{prod.location?.name}</span></td>
                          <td>{prod.min_stock_level} boxes</td>
                          <td>
                            <span className="badge badge-danger low-stock-alert" style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>
                              {prod.boxes_available} left
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Overall Inventory Financial Metrics */}
            <div className="glass-card" style={{ gridColumn: 'span 1', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Package size={18} style={{ color: 'var(--color-info)' }} />
                  Showroom Asset Summary
                </h2>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '0.5rem' }}>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed var(--border-subtle)', paddingBottom: '0.75rem' }}>
                  <div>
                    <strong style={{ fontSize: '1.05rem', color: 'var(--text-main)' }}>Dynamic Categories</strong>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>Active structural classes</p>
                  </div>
                  <span className="badge badge-category" style={{ fontSize: '1.1rem', padding: '0.4rem 0.8rem' }}>
                    {categories.length}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed var(--border-subtle)', paddingBottom: '0.75rem' }}>
                  <div>
                    <strong style={{ fontSize: '1.05rem', color: 'var(--text-main)' }}>Product Catalogue</strong>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>Active SKUs tracked</p>
                  </div>
                  <span className="badge badge-location" style={{ fontSize: '1.1rem', padding: '0.4rem 0.8rem' }}>
                    {products.filter(p => !p.is_archived).length}
                  </span>
                </div>

                <div>
                  <strong style={{ fontSize: '1.05rem', color: 'var(--text-main)' }}>Asset Valuation (Cost)</strong>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>Accumulated buying cost value of inventory</p>
                  
                  <h2 style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--color-primary)', marginTop: '0.75rem', display: 'flex', alignItems: 'center', letterSpacing: '-0.03em' }}>
                    <span style={{ fontSize: '1.2rem', fontWeight: '800', marginRight: '4px', color: 'var(--color-primary)' }}>Rs.</span>
                    {overallInventoryValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </h2>
                </div>

              </div>
            </div>

          </div>

        </>
      )}

    </div>
  );
}
