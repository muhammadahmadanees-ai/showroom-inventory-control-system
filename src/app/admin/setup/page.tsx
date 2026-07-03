'use client';

import React, { useState, useEffect } from 'react';
import { db, Category, Location } from '@/lib/db';
import { Plus, Trash2, Tag, MapPin, AlertCircle, CheckCircle2, RotateCcw, Bell, Send, Mail } from 'lucide-react';
import { getRecipientEmails, saveRecipientEmails, sendTestEmail } from '@/lib/alerts';

interface Toast {
  message: string;
  type: 'success' | 'error';
  visible: boolean;
}

export default function ShowroomSetupPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [newCatName, setNewCatName] = useState('');
  const [newLocName, setNewLocName] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Alerts configuration states
  const [recipientEmails, setRecipientEmails] = useState<string[]>([]);
  const [newEmailInput, setNewEmailInput] = useState('');
  const [testEmailTarget, setTestEmailTarget] = useState('');
  const [testLoading, setTestLoading] = useState(false);
  const [mockAlerts, setMockAlerts] = useState<any[]>([]);

  // Toast notifications
  const [toast, setToast] = useState<Toast>({ message: '', type: 'success', visible: false });

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type, visible: true });
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 4000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [cats, locs] = await Promise.all([
        db.getCategories(),
        db.getLocations()
      ]);
      setCategories(cats);
      setLocations(locs);
    } catch (err: any) {
      showToast(err.message || 'Failed to load configuration data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Load alert recipients
    setRecipientEmails(getRecipientEmails());

    // Load mock notifications
    const loadMockNotifications = () => {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('ics_mock_notifications');
        if (stored) {
          setMockAlerts(JSON.parse(stored));
        }
      }
    };
    loadMockNotifications();

    // Listen for new mock notifications
    const handleNewNotification = () => {
      loadMockNotifications();
    };
    window.addEventListener('ics_new_mock_notification', handleNewNotification);
    return () => {
      window.removeEventListener('ics_new_mock_notification', handleNewNotification);
    };
  }, []);

  const handleAddEmail = (e: React.FormEvent) => {
    e.preventDefault();
    const email = newEmailInput.trim();
    if (!email) return;
    if (recipientEmails.includes(email)) {
      showToast('Email address already subscribed.', 'error');
      return;
    }
    const updated = [...recipientEmails, email];
    setRecipientEmails(updated);
    saveRecipientEmails(updated);
    setNewEmailInput('');
    showToast(`Email ${email} added to alerts list.`, 'success');
  };

  const handleDeleteEmail = (email: string) => {
    const updated = recipientEmails.filter(e => e !== email);
    setRecipientEmails(updated);
    saveRecipientEmails(updated);
    showToast(`Email ${email} unsubscribed.`, 'success');
  };

  const handleSendTestAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = testEmailTarget.trim();
    if (!target) return;

    setTestLoading(true);
    try {
      const success = await sendTestEmail(target);
      if (success) {
        showToast(`Test alert successfully dispatched to ${target}!`, 'success');
        setTestEmailTarget('');
      } else {
        showToast('Failed to send test alert. Check configuration.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error occurred.', 'error');
    } finally {
      setTestLoading(false);
    }
  };

  const handleClearMockAlerts = () => {
    if (confirm('Are you sure you want to clear the Mock Alerts Inbox?')) {
      localStorage.removeItem('ics_mock_notifications');
      setMockAlerts([]);
      showToast('Mock Alerts Inbox cleared.', 'success');
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newCatName.trim();
    if (!name) return;

    setActionLoading(true);
    try {
      const newCat = await db.addCategory(name);
      setCategories([...categories, newCat]);
      setNewCatName('');
      showToast(`Category "${name}" added successfully!`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to add category.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the category "${name}"? This cannot be undone.`)) {
      return;
    }

    setActionLoading(true);
    try {
      await db.deleteCategory(id);
      setCategories(categories.filter(c => c.id !== id));
      showToast(`Category "${name}" deleted.`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete category. Check if products are using it.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newLocName.trim();
    if (!name) return;

    setActionLoading(true);
    try {
      const newLoc = await db.addLocation(name);
      setLocations([...locations, newLoc]);
      setNewLocName('');
      showToast(`Location "${name}" added successfully!`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to add location.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteLocation = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the location "${name}"? This cannot be undone.`)) {
      return;
    }

    setActionLoading(true);
    try {
      await db.deleteLocation(id);
      setLocations(locations.filter(l => l.id !== id));
      showToast(`Location "${name}" deleted.`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete location. Check if products are using it.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

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
          <h1 style={{ fontSize: '1.8rem', fontWeight: '700' }}>Showroom Setup & Attributes</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Manage dynamic categories and storage locations across your showroom database.
          </p>
        </div>
        <button onClick={loadData} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <RotateCcw size={16} />
          Refresh List
        </button>
      </div>

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
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
      ) : (
        <div className="grid grid-2">
          
          {/* Dynamic Categories Section */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem' }}>
              <Tag size={20} style={{ color: 'var(--color-accent)' }} />
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>Product Categories</h2>
            </div>

            {/* Category Form */}
            <form onSubmit={handleAddCategory} style={{ display: 'flex', gap: '0.75rem' }}>
              <input
                type="text"
                className="form-control"
                style={{ flex: 1 }}
                placeholder="New Category (e.g. Faucets, Marbles)"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                disabled={actionLoading}
                required
              />
              <button type="submit" className="btn btn-accent" disabled={actionLoading} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Plus size={16} />
                Add
              </button>
            </form>

            {/* Category Table List */}
            <div className="table-container" style={{ flex: 1, minHeight: '200px' }}>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Category Name</th>
                    <th style={{ width: '80px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.length === 0 ? (
                    <tr>
                      <td colSpan={2} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                        No categories defined yet.
                      </td>
                    </tr>
                  ) : (
                    categories.map((cat) => (
                      <tr key={cat.id}>
                        <td style={{ fontWeight: '500' }}>
                          <span className="badge badge-category">{cat.name}</span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            onClick={() => handleDeleteCategory(cat.id, cat.name)}
                            className="btn-icon"
                            style={{ color: 'var(--color-danger)' }}
                            disabled={actionLoading}
                            title={`Delete ${cat.name}`}
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Dynamic Locations Section */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem' }}>
              <MapPin size={20} style={{ color: 'var(--color-info)' }} />
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>Storage Locations</h2>
            </div>

            {/* Location Form */}
            <form onSubmit={handleAddLocation} style={{ display: 'flex', gap: '0.75rem' }}>
              <input
                type="text"
                className="form-control"
                style={{ flex: 1 }}
                placeholder="New Location (e.g. Floor 2, Shelf A)"
                value={newLocName}
                onChange={(e) => setNewLocName(e.target.value)}
                disabled={actionLoading}
                required
              />
              <button type="submit" className="btn btn-primary" disabled={actionLoading} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Plus size={16} />
                Add
              </button>
            </form>

            {/* Location Table List */}
            <div className="table-container" style={{ flex: 1, minHeight: '200px' }}>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Location Name</th>
                    <th style={{ width: '80px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {locations.length === 0 ? (
                    <tr>
                      <td colSpan={2} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                        No locations defined yet.
                      </td>
                    </tr>
                  ) : (
                    locations.map((loc) => (
                      <tr key={loc.id}>
                        <td style={{ fontWeight: '500' }}>
                          <span className="badge badge-location">{loc.name}</span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            onClick={() => handleDeleteLocation(loc.id, loc.name)}
                            className="btn-icon"
                            style={{ color: 'var(--color-danger)' }}
                            disabled={actionLoading}
                            title={`Delete ${loc.name}`}
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* Automated Stock Alerts Configuration & Test Console */}
      <div className="grid grid-2" style={{ marginTop: '2rem' }}>

        {/* Alert Recipients & Test console */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem' }}>
            <Bell size={20} style={{ color: 'var(--color-primary)' }} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>Low-Stock Alert Recipients</h2>
          </div>

          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Configure recipient email addresses that will receive real-time notifications when product quantities drop below warning thresholds.
          </p>

          {/* Email Form */}
          <form onSubmit={handleAddEmail} style={{ display: 'flex', gap: '0.75rem' }}>
            <input
              type="email"
              className="form-control"
              style={{ flex: 1 }}
              placeholder="Manager email (e.g. manager@showroom.com)"
              value={newEmailInput}
              onChange={(e) => setNewEmailInput(e.target.value)}
              disabled={actionLoading}
              required
            />
            <button type="submit" className="btn btn-primary" disabled={actionLoading} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Plus size={16} />
              Subscribe
            </button>
          </form>

          {/* Recipients List */}
          <div className="table-container" style={{ maxHeight: '180px', overflowY: 'auto' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Subscribed Recipients</th>
                  <th style={{ width: '80px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {recipientEmails.length === 0 ? (
                  <tr>
                    <td colSpan={2} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1.5rem' }}>
                      No email addresses subscribed. Using default (admin@showroom.com).
                    </td>
                  </tr>
                ) : (
                  recipientEmails.map((email) => (
                    <tr key={email}>
                      <td style={{ fontWeight: '500', fontSize: '0.85rem' }}>
                        <span className="badge badge-category" style={{ background: 'var(--color-primary-glow)', color: 'var(--color-primary)', textTransform: 'none' }}>
                          {email}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => handleDeleteEmail(email)}
                          className="btn-icon"
                          style={{ color: 'var(--color-danger)' }}
                          title={`Unsubscribe ${email}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Send Test Alert Form */}
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Send size={16} style={{ color: 'var(--color-accent)' }} />
              Send Manual Test Alert
            </h3>

            <form onSubmit={handleSendTestAlert} style={{ display: 'flex', gap: '0.75rem' }}>
              <input
                type="email"
                className="form-control"
                style={{ flex: 1 }}
                placeholder="Recipient email for test..."
                value={testEmailTarget}
                onChange={(e) => setTestEmailTarget(e.target.value)}
                disabled={testLoading}
                required
              />
              <button type="submit" className="btn btn-accent" disabled={testLoading}>
                {testLoading ? 'Sending...' : 'Trigger Test'}
              </button>
            </form>
          </div>
        </div>

        {/* Mock Alerts Inbox Log */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Mail size={20} style={{ color: 'var(--color-info)' }} />
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>Mock Alerts Inbox (Logs)</h2>
            </div>
            {mockAlerts.length > 0 && (
              <button
                type="button"
                onClick={handleClearMockAlerts}
                className="btn btn-secondary"
                style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: 'var(--color-danger)', borderColor: 'rgba(239, 68, 68, 0.15)' }}
              >
                Clear Inbox
              </button>
            )}
          </div>

          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            If no <strong>RESEND_API_KEY</strong> is set in your env configs, the system operates in local demonstration mode. Emails triggered by low-stock transitions will be logged here for easy verification.
          </p>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            maxHeight: '380px',
            overflowY: 'auto',
            paddingRight: '0.25rem'
          }}>
            {mockAlerts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3.5rem 0', color: 'var(--text-muted)', border: '1px dashed var(--border-subtle)', borderRadius: '8px' }}>
                <Mail size={32} style={{ marginBottom: '0.5rem', opacity: 0.3 }} />
                <p style={{ fontSize: '0.85rem' }}>Inbox is empty. Trigger a mock low-stock event or send a test alert to see logs.</p>
              </div>
            ) : (
              mockAlerts.map((alert) => (
                <div key={alert.id} style={{
                  background: 'hsla(222, 47%, 6%, 0.4)',
                  border: '1px solid var(--border-subtle)',
                  padding: '1rem',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className={`badge ${alert.type === 'test' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.65rem' }}>
                      {alert.type} alert
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                      {new Date(alert.sentAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <div>
                    <strong style={{ color: 'var(--text-main)' }}>To:</strong> <span style={{ color: 'var(--text-muted)' }}>{alert.recipient}</span>
                  </div>
                  <div>
                    <strong style={{ color: 'var(--text-main)' }}>Subject:</strong> <span style={{ color: 'var(--color-primary)' }}>{alert.subject}</span>
                  </div>

                  <div
                    style={{
                      marginTop: '0.5rem',
                      padding: '0.75rem',
                      background: 'var(--bg-app)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '6px',
                      overflowX: 'auto',
                      maxHeight: '180px',
                      overflowY: 'auto'
                    }}
                    dangerouslySetInnerHTML={{ __html: alert.body }}
                  />
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* System Policy & Supabase Migrations cards */}
      <div className="grid grid-2" style={{ marginTop: '2rem' }}>

        <div className="glass-card" style={{
          background: 'rgba(16, 185, 129, 0.02)',
          borderColor: 'rgba(16, 185, 129, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          padding: '1.5rem'
        }}>
          <h3 style={{ fontSize: '1rem', color: 'var(--color-primary)' }}>Integrity Constraints Policy</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: '1.5' }}>
            Deleting a category or location will only be allowed if there are no active products assigned to them. If a deletion is blocked, please check the main inventory panel, archive or edit the offending products to assign them to another category/location, and then try again.
          </p>
        </div>

        <div className="glass-card" style={{
          background: 'rgba(245, 158, 11, 0.02)',
          borderColor: 'rgba(245, 158, 11, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          padding: '1.5rem'
        }}>
          <h3 style={{ fontSize: '1rem', color: 'var(--color-accent)' }}>Supabase Database Setup</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: '1.5' }}>
            To enable database-level tracking of stock alerts in production, execute the following SQL migration in your Supabase project SQL Editor:
          </p>
          <pre style={{
            marginTop: '0.5rem',
            background: 'var(--bg-app)',
            padding: '0.5rem 0.75rem',
            borderRadius: '6px',
            border: '1px solid var(--border-subtle)',
            fontSize: '0.75rem',
            overflowX: 'auto',
            color: 'var(--color-primary)'
          }}>
{`ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS alert_sent BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS last_alert_sent_at TIMESTAMP WITH TIME ZONE;`}
          </pre>
        </div>

      </div>

    </div>
  );
}
