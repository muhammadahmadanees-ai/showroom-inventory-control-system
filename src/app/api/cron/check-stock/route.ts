import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sendLowStockEmail } from '@/lib/alerts';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  const cronSecret = process.env.CRON_SECRET || 'ics_stock_cron_secret_2026';

  // Secure the cron endpoint
  if (token !== cronSecret) {
    return NextResponse.json(
      { error: 'Unauthorized. Invalid or missing secret token.' },
      { status: 401 }
    );
  }

  try {
    const products = await db.getProducts(false); // Only active products
    const triggeredSKUs: string[] = [];

    for (const product of products) {
      const isLow = product.boxes_available <= product.min_stock_level;
      
      // If stock is below min stock level and no alert has been dispatched yet
      if (isLow && !product.alert_sent) {
        const success = await sendLowStockEmail(product);
        if (success) {
          await db.updateProductAlertState(product.id, true);
          triggeredSKUs.push(product.ref_code);
        }
      } 
      // If stock is above min level but the alert_sent flag was still set
      else if (!isLow && product.alert_sent) {
        await db.updateProductAlertState(product.id, false);
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      triggered: triggeredSKUs,
      checkedCount: products.length
    });
  } catch (error: any) {
    console.error('Cron stock check error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal database query failure' },
      { status: 500 }
    );
  }
}
