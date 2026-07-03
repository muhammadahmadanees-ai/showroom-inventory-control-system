import { Product } from './db';

// Get notification recipients from local config or environment variable
export const getRecipientEmails = (): string[] => {
  if (typeof window !== 'undefined') {
    const local = localStorage.getItem('ics_alert_recipients');
    if (local) return JSON.parse(local);
  }
  const env = process.env.NEXT_PUBLIC_ALERT_RECIPIENT_EMAILS || 'admin@showroom.com';
  return env.split(',').map(e => e.trim()).filter(Boolean);
};

export const saveRecipientEmails = (emails: string[]) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('ics_alert_recipients', JSON.stringify(emails));
  }
};

// Check if Resend API key is configured
const getResendApiKey = (): string | null => {
  return process.env.NEXT_PUBLIC_RESEND_API_KEY || process.env.RESEND_API_KEY || null;
};

// Interface for mock notification logs
export interface MockNotification {
  id: string;
  sentAt: string;
  recipient: string;
  subject: string;
  body: string;
  type: 'email' | 'test';
}

const saveMockNotification = (recipient: string, subject: string, body: string, type: 'email' | 'test') => {
  if (typeof window !== 'undefined') {
    const existing = localStorage.getItem('ics_mock_notifications') || '[]';
    const alerts = JSON.parse(existing);
    alerts.unshift({
      id: 'alert-' + Math.random().toString(36).substring(2, 9),
      sentAt: new Date().toISOString(),
      recipient,
      subject,
      body,
      type
    });
    // Keep max 20 mock notifications
    localStorage.setItem('ics_mock_notifications', JSON.stringify(alerts.slice(0, 20)));
    // Notify the UI
    window.dispatchEvent(new Event('ics_new_mock_notification'));
  } else {
    console.log(`[MOCK EMAIL SENT TO ${recipient}]: ${subject}\nBody:\n${body}`);
  }
};

// Main email sender function
export const sendLowStockEmail = async (product: Product): Promise<boolean> => {
  const recipients = getRecipientEmails();
  if (recipients.length === 0) return false;

  const apiKey = getResendApiKey();
  const host = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  
  const subject = `⚠️ LOW STOCK WARNING: ${product.ref_code}`;
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #ef4444; margin-top: 0;">⚠️ Low Stock Threshold Crossed</h2>
      <p>The following product inventory has crossed below its minimum stock warning level:</p>
      
      <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
        <tr style="background-color: #f8fafc;">
          <td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold;">Product Name:</td>
          <td style="padding: 8px; border: 1px solid #e2e8f0;">${product.name}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold;">SKU / Reference Code:</td>
          <td style="padding: 8px; border: 1px solid #e2e8f0;"><code style="color: #10b981; font-weight: bold;">${product.ref_code}</code></td>
        </tr>
        <tr style="background-color: #f8fafc;">
          <td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold;">Current Boxes Available:</td>
          <td style="padding: 8px; border: 1px solid #e2e8f0; color: #ef4444; font-weight: bold;">${product.boxes_available} boxes</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold;">Minimum Stock Threshold:</td>
          <td style="padding: 8px; border: 1px solid #e2e8f0;">${product.min_stock_level} boxes</td>
        </tr>
        <tr style="background-color: #f8fafc;">
          <td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold;">Storage Location:</td>
          <td style="padding: 8px; border: 1px solid #e2e8f0;">${product.location?.name || 'Unknown'}</td>
        </tr>
        ${product.category?.name === 'Tiles' ? `
        <tr>
          <td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold;">Meters Available:</td>
          <td style="padding: 8px; border: 1px solid #e2e8f0;">${product.meters_available} m</td>
        </tr>` : ''}
      </table>
      
      <p style="margin-top: 20px;">
        <a href="${host}/admin/inventory?search=${product.ref_code}" style="background-color: #10b981; color: white; padding: 10px 15px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
          View in Showroom Dashboard
        </a>
      </p>
      
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin-top: 30px;" />
      <span style="font-size: 0.8rem; color: #64748b;">Showroom Desk Automated Stock Alert System.</span>
    </div>
  `;

  if (!apiKey) {
    // Save to mock inbox
    saveMockNotification(recipients.join(', '), subject, htmlBody, 'email');
    return true;
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Showroom Stock Alert <alerts@resend.dev>',
        to: recipients,
        subject: subject,
        html: htmlBody
      })
    });
    return res.ok;
  } catch (error) {
    console.error('Failed to dispatch live email alert:', error);
    return false;
  }
};

// Send a test email alert
export const sendTestEmail = async (targetEmail: string): Promise<boolean> => {
  const apiKey = getResendApiKey();
  const subject = '🔔 TEST ALERT: Showroom Inventory Control System';
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #10b981; margin-top: 0;">🔔 Notification Integration Successful</h2>
      <p>This is a test notification generated from your Showroom Inventory setup panel.</p>
      <p>If you are receiving this, your email delivery pipeline is configured and functioning correctly.</p>
      <p><strong>Configured Recipients:</strong> ${targetEmail}</p>
      <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin-top: 30px;" />
      <span style="font-size: 0.8rem; color: #64748b;">Showroom Desk Automated Test Notification.</span>
    </div>
  `;

  if (!apiKey) {
    saveMockNotification(targetEmail, subject, htmlBody, 'test');
    return true;
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Showroom Integration Test <alerts@resend.dev>',
        to: [targetEmail],
        subject: subject,
        html: htmlBody
      })
    });
    return res.ok;
  } catch (error) {
    console.error('Failed to send test email:', error);
    return false;
  }
};

// Check transitions and coordinate notification dispatch
export const checkAndTriggerAlert = async (
  productBefore: any,
  boxesAfter: number,
  updateAlertState: (id: string, alertSent: boolean) => Promise<void>
) => {
  const minStock = productBefore.min_stock_level;
  
  // If stock is replenished above threshold, reset the flag so it can alert again
  if (boxesAfter > minStock) {
    if (productBefore.alert_sent) {
      await updateAlertState(productBefore.id, false);
    }
    return;
  }

  // If stock crosses below or equal to threshold, alert once
  if (boxesAfter <= minStock) {
    if (productBefore.boxes_available > minStock && !productBefore.alert_sent) {
      const success = await sendLowStockEmail({
        ...productBefore,
        boxes_available: boxesAfter
      });
      if (success) {
        await updateAlertState(productBefore.id, true);
      }
    }
  }
};

