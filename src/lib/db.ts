import { supabase } from './supabaseClient';
import { checkAndTriggerAlert } from './alerts';

export interface Category {
  id: string;
  name: string;
  created_at: string;
}

export interface Location {
  id: string;
  name: string;
  created_at: string;
}

export interface Product {
  id: string;
  ref_code: string;
  name: string;
  category_id: string;
  meters_available: number;
  boxes_available: number;
  buying_price_meter: number;
  buying_price_box: number;
  location_id: string;
  min_stock_level: number;
  is_archived: boolean;
  alert_sent?: boolean;
  last_alert_sent_at?: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  category?: Category;
  location?: Location;
}

export interface Sale {
  id: string;
  product_id: string | null;
  invoice_id: string;
  ref_code: string;
  product_name: string;
  meters_sold: number;
  boxes_sold: number;
  selling_price_meter: number;
  selling_price_box: number;
  buying_price_meter: number;
  buying_price_box: number;
  total_amount: number;
  profit: number;
  sold_by: string;
  salesman_name: string;
  sold_at: string;
}

export interface InventoryLog {
  id: string;
  product_id: string | null;
  ref_code: string | null;
  product_name: string | null;
  edited_by: string;
  action: 'create' | 'update' | 'archive' | 'restore';
  old_values: any;
  new_values: any;
  created_at: string;
}

// Check if Supabase is properly configured
export const isSupabaseConfigured = (): boolean => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  // Check if key is not empty and not the placeholder
  return key.trim() !== '' && !key.includes('anon');
};

// ==========================================
// LOCAL STORAGE MOCK DATABASE IMPLEMENTATION
// ==========================================

const MOCK_CATEGORIES_KEY = 'ics_mock_categories';
const MOCK_LOCATIONS_KEY = 'ics_mock_locations';
const MOCK_PRODUCTS_KEY = 'ics_mock_products';
const MOCK_SALES_KEY = 'ics_mock_sales';
const MOCK_LOGS_KEY = 'ics_mock_logs';

const seedMockDatabase = () => {
  if (typeof window === 'undefined') return;

  // 1. Categories
  if (!localStorage.getItem(MOCK_CATEGORIES_KEY)) {
    const cats: Category[] = [
      { id: 'cat-1', name: 'Tiles', created_at: new Date().toISOString() },
      { id: 'cat-2', name: 'Sanitary', created_at: new Date().toISOString() }
    ];
    localStorage.setItem(MOCK_CATEGORIES_KEY, JSON.stringify(cats));
  }

  // 2. Locations
  if (!localStorage.getItem(MOCK_LOCATIONS_KEY)) {
    const locs: Location[] = [
      { id: 'loc-1', name: 'Warehouse', created_at: new Date().toISOString() },
      { id: 'loc-2', name: 'Basement', created_at: new Date().toISOString() },
      { id: 'loc-3', name: 'Display', created_at: new Date().toISOString() }
    ];
    localStorage.setItem(MOCK_LOCATIONS_KEY, JSON.stringify(locs));
  }

  // 3. Products (using buying_price instead of unit_price)
  if (!localStorage.getItem(MOCK_PRODUCTS_KEY)) {
    const prods: Product[] = [
      {
        id: 'prod-1',
        ref_code: 'TL-MARBLE-01',
        name: 'Carrara White Marble Tile 60x60',
        category_id: 'cat-1',
        meters_available: 120.5,
        boxes_available: 80,
        buying_price_meter: 35.0, // Buying cost
        buying_price_box: 52.5,
        location_id: 'loc-1',
        min_stock_level: 15,
        is_archived: false,
        created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'prod-2',
        ref_code: 'TL-WOOD-08',
        name: 'Oak Wood Finish Porcelain Tile 15x90',
        category_id: 'cat-1',
        meters_available: 8.4,
        boxes_available: 6,
        buying_price_meter: 24.0, // Buying cost
        buying_price_box: 33.6,
        location_id: 'loc-2',
        min_stock_level: 12,
        is_archived: false,
        created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'prod-3',
        ref_code: 'SN-TOILET-02',
        name: 'Wall-Hung Smart Toilet Suite',
        category_id: 'cat-2',
        meters_available: 0,
        boxes_available: 24,
        buying_price_meter: 0,
        buying_price_box: 280.0, // Buying cost
        location_id: 'loc-3',
        min_stock_level: 5,
        is_archived: false,
        created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'prod-4',
        ref_code: 'SN-BASIN-15',
        name: 'Matte Black Ceramic Vessel Basin',
        category_id: 'cat-2',
        meters_available: 0,
        boxes_available: 3,
        buying_price_meter: 0,
        buying_price_box: 95.0, // Buying cost
        location_id: 'loc-1',
        min_stock_level: 8,
        is_archived: false,
        created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];
    localStorage.setItem(MOCK_PRODUCTS_KEY, JSON.stringify(prods));
  }

  // 4. Sales (capturing dynamic selling prices and profits)
  if (!localStorage.getItem(MOCK_SALES_KEY)) {
    const sales: Sale[] = [
      {
        id: 'sale-1',
        product_id: 'prod-1',
        invoice_id: 'invoice-1',
        ref_code: 'TL-MARBLE-01',
        product_name: 'Carrara White Marble Tile 60x60',
        meters_sold: 15,
        boxes_sold: 10,
        selling_price_meter: 45.0, // Sold at margin
        selling_price_box: 67.5,
        buying_price_meter: 35.0,  // Cost
        buying_price_box: 52.5,
        total_amount: 1350.0, // 15*45 + 10*67.5
        profit: 300.0,        // 1350 - (15*35 + 10*52.5) = 1350 - 1050 = 300
        sold_by: 'admin@showroom.com',
        salesman_name: 'System',
        sold_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'sale-2',
        product_id: 'prod-3',
        invoice_id: 'invoice-2',
        ref_code: 'SN-TOILET-02',
        product_name: 'Wall-Hung Smart Toilet Suite',
        meters_sold: 0,
        boxes_sold: 2,
        selling_price_meter: 0,
        selling_price_box: 380.0, // Sold at
        buying_price_meter: 0,
        buying_price_box: 280.0,  // Cost
        total_amount: 760.0,
        profit: 200.0,        // 760 - 560 = 200
        sold_by: 'admin@showroom.com',
        salesman_name: 'System',
        sold_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'sale-3',
        product_id: 'prod-2',
        invoice_id: 'invoice-3',
        ref_code: 'TL-WOOD-08',
        product_name: 'Oak Wood Finish Porcelain Tile 15x90',
        meters_sold: 22.4,
        boxes_sold: 16,
        selling_price_meter: 32.0,
        selling_price_box: 44.8,
        buying_price_meter: 24.0,
        buying_price_box: 33.6,
        total_amount: 1433.6, // 22.4*32 + 16*44.8
        profit: 358.4,        // 1433.6 - (22.4*24 + 16*33.6) = 1433.6 - 1075.2 = 358.4
        sold_by: 'demo@showroom.com',
        salesman_name: 'System',
        sold_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
      }
    ];
    localStorage.setItem(MOCK_SALES_KEY, JSON.stringify(sales));
  }

  // 5. Logs
  if (!localStorage.getItem(MOCK_LOGS_KEY)) {
    const logs: InventoryLog[] = [
      {
        id: 'log-1',
        product_id: 'prod-1',
        ref_code: 'TL-MARBLE-01',
        product_name: 'Carrara White Marble Tile 60x60',
        edited_by: 'system@showroom.com',
        action: 'create',
        old_values: null,
        new_values: { name: 'Carrara White Marble Tile 60x60', ref_code: 'TL-MARBLE-01', boxes_available: 90 },
        created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];
    localStorage.setItem(MOCK_LOGS_KEY, JSON.stringify(logs));
  }
};

// Helpers for localStorage
const getLocal = <T>(key: string): T[] => {
  seedMockDatabase();
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
};

const setLocal = <T>(key: string, data: T[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(data));
};

// ==========================================
// DB SERVICE INTERFACE (DISPATCHER)
// ==========================================

export const db = {
  // Check backend mode
  isMock: (): boolean => {
    return !isSupabaseConfigured();
  },

  // CATEGORIES
  getCategories: async (): Promise<Category[]> => {
    if (db.isMock()) {
      return getLocal<Category>(MOCK_CATEGORIES_KEY);
    }
    const { data, error } = await supabase.from('categories').select('*').order('name');
    if (error) throw error;
    return data;
  },

  addCategory: async (name: string): Promise<Category> => {
    const trimmed = name.trim();
    if (!trimmed) throw new Error('Category name cannot be empty');

    if (db.isMock()) {
      const cats = getLocal<Category>(MOCK_CATEGORIES_KEY);
      if (cats.some(c => c.name.toLowerCase() === trimmed.toLowerCase())) {
        throw new Error('Category already exists');
      }
      const newCat: Category = {
        id: 'cat-' + Math.random().toString(36).substring(2, 9),
        name: trimmed,
        created_at: new Date().toISOString()
      };
      cats.push(newCat);
      setLocal(MOCK_CATEGORIES_KEY, cats);
      return newCat;
    }

    const { data, error } = await supabase.from('categories').insert([{ name: trimmed }]).select().single();
    if (error) {
      if (error.code === '23505') throw new Error('Category already exists');
      throw error;
    }
    return data;
  },

  deleteCategory: async (id: string): Promise<void> => {
    if (db.isMock()) {
      const prods = getLocal<Product>(MOCK_PRODUCTS_KEY);
      if (prods.some(p => p.category_id === id && !p.is_archived)) {
        throw new Error('Cannot delete category because it is actively used by products');
      }
      const cats = getLocal<Category>(MOCK_CATEGORIES_KEY).filter(c => c.id !== id);
      setLocal(MOCK_CATEGORIES_KEY, cats);
      return;
    }
    
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) {
      if (error.code === '23503') throw new Error('Cannot delete category because it is actively used by products');
      throw error;
    }
  },

  // LOCATIONS
  getLocations: async (): Promise<Location[]> => {
    if (db.isMock()) {
      return getLocal<Location>(MOCK_LOCATIONS_KEY);
    }
    const { data, error } = await supabase.from('locations').select('*').order('name');
    if (error) throw error;
    return data;
  },

  addLocation: async (name: string): Promise<Location> => {
    const trimmed = name.trim();
    if (!trimmed) throw new Error('Location name cannot be empty');

    if (db.isMock()) {
      const locs = getLocal<Location>(MOCK_LOCATIONS_KEY);
      if (locs.some(l => l.name.toLowerCase() === trimmed.toLowerCase())) {
        throw new Error('Location already exists');
      }
      const newLoc: Location = {
        id: 'loc-' + Math.random().toString(36).substring(2, 9),
        name: trimmed,
        created_at: new Date().toISOString()
      };
      locs.push(newLoc);
      setLocal(MOCK_LOCATIONS_KEY, locs);
      return newLoc;
    }

    const { data, error } = await supabase.from('locations').insert([{ name: trimmed }]).select().single();
    if (error) {
      if (error.code === '23505') throw new Error('Location already exists');
      throw error;
    }
    return data;
  },

  deleteLocation: async (id: string): Promise<void> => {
    if (db.isMock()) {
      const prods = getLocal<Product>(MOCK_PRODUCTS_KEY);
      if (prods.some(p => p.location_id === id && !p.is_archived)) {
        throw new Error('Cannot delete location because it is actively used by products');
      }
      const locs = getLocal<Location>(MOCK_LOCATIONS_KEY).filter(l => l.id !== id);
      setLocal(MOCK_LOCATIONS_KEY, locs);
      return;
    }

    const { error } = await supabase.from('locations').delete().eq('id', id);
    if (error) {
      if (error.code === '23503') throw new Error('Cannot delete location because it is actively used by products');
      throw error;
    }
  },

  // PRODUCTS
  getProducts: async (includeArchived = false): Promise<Product[]> => {
    if (db.isMock()) {
      const prods = getLocal<Product>(MOCK_PRODUCTS_KEY);
      const cats = getLocal<Category>(MOCK_CATEGORIES_KEY);
      const locs = getLocal<Location>(MOCK_LOCATIONS_KEY);

      return prods
        .filter(p => includeArchived || !p.is_archived)
        .map(p => ({
          ...p,
          category: cats.find(c => c.id === p.category_id),
          location: locs.find(l => l.id === p.location_id)
        }))
        .sort((a, b) => b.created_at.localeCompare(a.created_at));
    }

    let query = supabase.from('products').select('*, category:categories(*), location:locations(*)');
    if (!includeArchived) {
      query = query.eq('is_archived', false);
    }
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    
    // Enrich with local storage alert flags if they are client-side only
    return data.map(p => {
      const localAlertKey = `ics_alert_sent_${p.id}`;
      const localAlertSent = typeof window !== 'undefined' ? localStorage.getItem(localAlertKey) : null;
      return {
        ...p,
        alert_sent: p.alert_sent !== undefined ? p.alert_sent : (localAlertSent !== null),
        last_alert_sent_at: p.last_alert_sent_at !== undefined ? p.last_alert_sent_at : (localAlertSent || undefined)
      };
    });
  },

  getProductByRefCode: async (refCode: string): Promise<Product | null> => {
    const cleanedCode = refCode.trim().toUpperCase();
    if (!cleanedCode) return null;

    if (db.isMock()) {
      const prods = getLocal<Product>(MOCK_PRODUCTS_KEY);
      const cats = getLocal<Category>(MOCK_CATEGORIES_KEY);
      const locs = getLocal<Location>(MOCK_LOCATIONS_KEY);

      const p = prods.find(p => p.ref_code.toUpperCase() === cleanedCode && !p.is_archived);
      if (!p) return null;

      return {
        ...p,
        category: cats.find(c => c.id === p.category_id),
        location: locs.find(l => l.id === p.location_id)
      };
    }

    const { data, error } = await supabase
      .from('products')
      .select('*, category:categories(*), location:locations(*)')
      .eq('ref_code', cleanedCode)
      .eq('is_archived', false)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;
    
    const localAlertKey = `ics_alert_sent_${data.id}`;
    const localAlertSent = typeof window !== 'undefined' ? localStorage.getItem(localAlertKey) : null;
    return {
      ...data,
      alert_sent: data.alert_sent !== undefined ? data.alert_sent : (localAlertSent !== null),
      last_alert_sent_at: data.last_alert_sent_at !== undefined ? data.last_alert_sent_at : (localAlertSent || undefined)
    };
  },

  createProduct: async (
    productData: Omit<Product, 'id' | 'is_archived' | 'created_at' | 'updated_at'>,
    editedBy: string
  ): Promise<Product> => {
    const ref_code = productData.ref_code.trim().toUpperCase();
    const name = productData.name.trim();

    if (!ref_code || !name) {
      throw new Error('Reference code and Product name are required');
    }

    if (db.isMock()) {
      const prods = getLocal<Product>(MOCK_PRODUCTS_KEY);
      if (prods.some(p => p.ref_code.toUpperCase() === ref_code && !p.is_archived)) {
        throw new Error(`Product with Reference Code "${ref_code}" already exists`);
      }

      const archivedIndex = prods.findIndex(p => p.ref_code.toUpperCase() === ref_code && p.is_archived);
      if (archivedIndex !== -1) {
        prods.splice(archivedIndex, 1);
      }

      const newProduct: Product = {
        ...productData,
        id: 'prod-' + Math.random().toString(36).substring(2, 9),
        ref_code,
        name,
        is_archived: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      prods.push(newProduct);
      setLocal(MOCK_PRODUCTS_KEY, prods);

      // Log Audit
      const logs = getLocal<InventoryLog>(MOCK_LOGS_KEY);
      logs.push({
        id: 'log-' + Math.random().toString(36).substring(2, 9),
        product_id: newProduct.id,
        ref_code: newProduct.ref_code,
        product_name: newProduct.name,
        edited_by: editedBy,
        action: 'create',
        old_values: null,
        new_values: newProduct,
        created_at: new Date().toISOString()
      });
      setLocal(MOCK_LOGS_KEY, logs);

      // Trigger Alert Check
      const dummyOld = { ...newProduct, boxes_available: 99999, alert_sent: false };
      setTimeout(() => {
        checkAndTriggerAlert(dummyOld, newProduct.boxes_available, db.updateProductAlertState);
      }, 0);

      return newProduct;
    }

    // Supabase Write
    const { data, error } = await supabase
      .from('products')
      .insert([{ ...productData, ref_code, name, is_archived: false }])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') throw new Error(`Product with Reference Code "${ref_code}" already exists`);
      throw error;
    }

    await supabase.from('inventory_logs').insert([
      {
        product_id: data.id,
        ref_code: data.ref_code,
        product_name: data.name,
        edited_by: editedBy,
        action: 'create',
        old_values: null,
        new_values: data
      }
    ]);

    // Trigger Alert Check
    const dummyOld = { ...data, boxes_available: 99999, alert_sent: false };
    setTimeout(() => {
      checkAndTriggerAlert(dummyOld, data.boxes_available, db.updateProductAlertState);
    }, 0);

    return data;
  },

  updateProduct: async (
    id: string,
    productData: Partial<Omit<Product, 'id' | 'created_at' | 'updated_at'>>,
    editedBy: string
  ): Promise<Product> => {
    if (db.isMock()) {
      const prods = getLocal<Product>(MOCK_PRODUCTS_KEY);
      const idx = prods.findIndex(p => p.id === id);
      if (idx === -1) throw new Error('Product not found');

      const oldProduct = { ...prods[idx] };
      
      if (productData.ref_code) {
        const ref_code = productData.ref_code.trim().toUpperCase();
        if (prods.some(p => p.id !== id && p.ref_code.toUpperCase() === ref_code && !p.is_archived)) {
          throw new Error(`Another active product already uses Reference Code "${ref_code}"`);
        }
        productData.ref_code = ref_code;
      }

      const updatedProduct: Product = {
        ...oldProduct,
        ...productData,
        updated_at: new Date().toISOString()
      } as Product;

      prods[idx] = updatedProduct;
      setLocal(MOCK_PRODUCTS_KEY, prods);

      // Audit Log
      const logs = getLocal<InventoryLog>(MOCK_LOGS_KEY);
      logs.push({
        id: 'log-' + Math.random().toString(36).substring(2, 9),
        product_id: id,
        ref_code: updatedProduct.ref_code,
        product_name: updatedProduct.name,
        edited_by: editedBy,
        action: 'update',
        old_values: oldProduct,
        new_values: updatedProduct,
        created_at: new Date().toISOString()
      });
      setLocal(MOCK_LOGS_KEY, logs);

      // Trigger Alert Check
      setTimeout(() => {
        checkAndTriggerAlert(oldProduct, updatedProduct.boxes_available, db.updateProductAlertState);
      }, 0);

      return updatedProduct;
    }

    const { data: oldData, error: fetchError } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();
    if (fetchError) throw fetchError;

    if (productData.ref_code) {
      productData.ref_code = productData.ref_code.trim().toUpperCase();
    }

    const { data: updatedData, error: updateError } = await supabase
      .from('products')
      .update(productData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      if (updateError.code === '23505') throw new Error(`Another active product already uses Reference Code "${productData.ref_code}"`);
      throw updateError;
    }

    await supabase.from('inventory_logs').insert([
      {
        product_id: id,
        ref_code: updatedData.ref_code,
        product_name: updatedData.name,
        edited_by: editedBy,
        action: 'update',
        old_values: oldData,
        new_values: updatedData
      }
    ]);

    // Trigger Alert Check
    const dataEnrichedOld = {
      ...oldData,
      alert_sent: oldData.alert_sent || (typeof window !== 'undefined' && localStorage.getItem(`ics_alert_sent_${oldData.id}`) !== null)
    };
    setTimeout(() => {
      checkAndTriggerAlert(dataEnrichedOld, updatedData.boxes_available, db.updateProductAlertState);
    }, 0);

    return updatedData;
  },

  archiveProduct: async (id: string, editedBy: string): Promise<void> => {
    if (db.isMock()) {
      const prods = getLocal<Product>(MOCK_PRODUCTS_KEY);
      const idx = prods.findIndex(p => p.id === id);
      if (idx === -1) throw new Error('Product not found');

      const oldProduct = { ...prods[idx] };
      prods[idx].is_archived = true;
      prods[idx].updated_at = new Date().toISOString();
      setLocal(MOCK_PRODUCTS_KEY, prods);

      const logs = getLocal<InventoryLog>(MOCK_LOGS_KEY);
      logs.push({
        id: 'log-' + Math.random().toString(36).substring(2, 9),
        product_id: id,
        ref_code: oldProduct.ref_code,
        product_name: oldProduct.name,
        edited_by: editedBy,
        action: 'archive',
        old_values: oldProduct,
        new_values: { is_archived: true },
        created_at: new Date().toISOString()
      });
      setLocal(MOCK_LOGS_KEY, logs);
      return;
    }

    const { data: oldData, error: fetchError } = await supabase.from('products').select('*').eq('id', id).single();
    if (fetchError) throw fetchError;

    const { error: updateError } = await supabase.from('products').update({ is_archived: true }).eq('id', id);
    if (updateError) throw updateError;

    await supabase.from('inventory_logs').insert([
      {
        product_id: id,
        ref_code: oldData.ref_code,
        product_name: oldData.name,
        edited_by: editedBy,
        action: 'archive',
        old_values: oldData,
        new_values: { is_archived: true }
      }
    ]);
  },

  // RECORD SALE (now capturing dynamic selling prices and invoice IDs)
  recordSale: async (
    refCode: string,
    metersSold: number,
    boxesSold: number,
    sellingPriceMeter: number,
    sellingPriceBox: number,
    soldBy: string,
    salesmanName: string,
    invoiceId: string
  ): Promise<Sale> => {
    const cleanedCode = refCode.trim().toUpperCase();
    if (metersSold <= 0 && boxesSold <= 0) {
      throw new Error('Must sell at least some quantity (meters and/or boxes)');
    }

    if (db.isMock()) {
      const prods = getLocal<Product>(MOCK_PRODUCTS_KEY);
      const idx = prods.findIndex(p => p.ref_code.toUpperCase() === cleanedCode && !p.is_archived);
      if (idx === -1) throw new Error(`Product with reference code "${cleanedCode}" not found`);

      const product = prods[idx];

      // Validate stock
      if (metersSold > 0 && product.meters_available < metersSold) {
        throw new Error(`Insufficient stock in meters. Available: ${product.meters_available} m, Requested: ${metersSold} m`);
      }
      if (boxesSold > 0 && product.boxes_available < boxesSold) {
        throw new Error(`Insufficient stock in boxes. Available: ${product.boxes_available} boxes, Requested: ${boxesSold} boxes`);
      }

      // Deduct stock
      const oldProduct = { ...product };
      product.meters_available = Number((product.meters_available - metersSold).toFixed(2));
      product.boxes_available = product.boxes_available - boxesSold;
      product.updated_at = new Date().toISOString();
      
      prods[idx] = product;
      setLocal(MOCK_PRODUCTS_KEY, prods);

      // Calculate Revenue & Cost & Profit
      const total_amount = Number((metersSold * sellingPriceMeter + boxesSold * sellingPriceBox).toFixed(2));
      const cost_amount = Number((metersSold * product.buying_price_meter + boxesSold * product.buying_price_box).toFixed(2));
      const profit = Number((total_amount - cost_amount).toFixed(2));

      const newSale: Sale = {
        id: 'sale-' + Math.random().toString(36).substring(2, 9),
        product_id: product.id,
        invoice_id: invoiceId,
        ref_code: product.ref_code,
        product_name: product.name,
        meters_sold: metersSold,
        boxes_sold: boxesSold,
        selling_price_meter: sellingPriceMeter,
        selling_price_box: sellingPriceBox,
        buying_price_meter: product.buying_price_meter,
        buying_price_box: product.buying_price_box,
        total_amount,
        profit,
        sold_by: soldBy,
        salesman_name: salesmanName,
        sold_at: new Date().toISOString()
      };

      const sales = getLocal<Sale>(MOCK_SALES_KEY);
      sales.push(newSale);
      setLocal(MOCK_SALES_KEY, sales);

      // Write Audit Log for inventory deduction
      const logs = getLocal<InventoryLog>(MOCK_LOGS_KEY);
      logs.push({
        id: 'log-' + Math.random().toString(36).substring(2, 9),
        product_id: product.id,
        ref_code: product.ref_code,
        product_name: product.name,
        edited_by: soldBy,
        action: 'update',
        old_values: oldProduct,
        new_values: {
          meters_available: product.meters_available,
          boxes_available: product.boxes_available
        },
        created_at: new Date().toISOString()
      });
      setLocal(MOCK_LOGS_KEY, logs);

      // Trigger Alert Check
      setTimeout(() => {
        checkAndTriggerAlert(oldProduct, product.boxes_available, db.updateProductAlertState);
      }, 0);

      return newSale;
    }

    // Live Supabase Transaction
    const { data: product, error: fetchError } = await supabase
      .from('products')
      .select('*')
      .eq('ref_code', cleanedCode)
      .eq('is_archived', false)
      .single();

    if (fetchError) throw new Error(`Product with reference code "${cleanedCode}" not found`);

    if (metersSold > 0 && product.meters_available < metersSold) {
      throw new Error(`Insufficient stock in meters. Available: ${product.meters_available} m, Requested: ${metersSold} m`);
    }
    if (boxesSold > 0 && product.boxes_available < boxesSold) {
      throw new Error(`Insufficient stock in boxes. Available: ${product.boxes_available} boxes, Requested: ${boxesSold} boxes`);
    }

    const newMeters = Number((product.meters_available - metersSold).toFixed(2));
    const newBoxes = product.boxes_available - boxesSold;

    // Update product stock
    const { error: updateError } = await supabase
      .from('products')
      .update({
        meters_available: newMeters,
        boxes_available: newBoxes
      })
      .eq('id', product.id);

    if (updateError) throw updateError;

    // Record sale
    const total_amount = Number((metersSold * sellingPriceMeter + boxesSold * sellingPriceBox).toFixed(2));
    const cost_amount = Number((metersSold * product.buying_price_meter + boxesSold * product.buying_price_box).toFixed(2));
    const profit = Number((total_amount - cost_amount).toFixed(2));

    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .insert([
        {
          product_id: product.id,
          invoice_id: invoiceId,
          ref_code: product.ref_code,
          product_name: product.name,
          meters_sold: metersSold,
          boxes_sold: boxesSold,
          selling_price_meter: sellingPriceMeter,
          selling_price_box: sellingPriceBox,
          buying_price_meter: product.buying_price_meter,
          buying_price_box: product.buying_price_box,
          total_amount,
          profit,
          sold_by: soldBy,
          salesman_name: salesmanName
        }
      ])
      .select()
      .single();

    if (saleError) throw saleError;

    // Log Audit
    await supabase.from('inventory_logs').insert([
      {
        product_id: product.id,
        ref_code: product.ref_code,
        product_name: product.name,
        edited_by: soldBy,
        action: 'update',
        old_values: { meters_available: product.meters_available, boxes_available: product.boxes_available },
        new_values: { meters_available: newMeters, boxes_available: newBoxes }
      }
    ]);

    // Trigger Alert Check
    const dataEnrichedOld = {
      ...product,
      alert_sent: product.alert_sent || (typeof window !== 'undefined' && localStorage.getItem(`ics_alert_sent_${product.id}`) !== null)
    };
    setTimeout(() => {
      checkAndTriggerAlert(dataEnrichedOld, newBoxes, db.updateProductAlertState);
    }, 0);

    return sale;
  },

  // SALES HISTORY
  getSales: async (): Promise<Sale[]> => {
    if (db.isMock()) {
      return getLocal<Sale>(MOCK_SALES_KEY).sort((a, b) => b.sold_at.localeCompare(a.sold_at));
    }
    const { data, error } = await supabase.from('sales').select('*').order('sold_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  // UNDO LAST SALE
  undoSale: async (saleId: string, editedBy: string): Promise<void> => {
    if (db.isMock()) {
      const sales = getLocal<Sale>(MOCK_SALES_KEY);
      const saleIdx = sales.findIndex(s => s.id === saleId);
      if (saleIdx === -1) throw new Error('Sale record not found');

      const sale = sales[saleIdx];
      
      if (sale.product_id) {
        const prods = getLocal<Product>(MOCK_PRODUCTS_KEY);
        const prodIdx = prods.findIndex(p => p.id === sale.product_id);
        if (prodIdx !== -1) {
          const product = prods[prodIdx];
          const oldProduct = { ...product };

          product.meters_available = Number((product.meters_available + sale.meters_sold).toFixed(2));
          product.boxes_available = product.boxes_available + sale.boxes_sold;
          product.updated_at = new Date().toISOString();

          prods[prodIdx] = product;
          setLocal(MOCK_PRODUCTS_KEY, prods);

          // Write Audit Log
          const logs = getLocal<InventoryLog>(MOCK_LOGS_KEY);
          logs.push({
            id: 'log-' + Math.random().toString(36).substring(2, 9),
            product_id: product.id,
            ref_code: product.ref_code,
            product_name: product.name,
            edited_by: editedBy,
            action: 'update',
            old_values: oldProduct,
            new_values: {
              meters_available: product.meters_available,
              boxes_available: product.boxes_available,
              note: `Restored stock due to undone sale ${saleId}`
            },
            created_at: new Date().toISOString()
          });
          setLocal(MOCK_LOGS_KEY, logs);

          // Trigger Alert Check
          setTimeout(() => {
            checkAndTriggerAlert(oldProduct, product.boxes_available, db.updateProductAlertState);
          }, 0);
        }
      }

      sales.splice(saleIdx, 1);
      setLocal(MOCK_SALES_KEY, sales);
      return;
    }

    // Supabase Undo Transaction
    const { data: sale, error: fetchError } = await supabase
      .from('sales')
      .select('*')
      .eq('id', saleId)
      .single();
    if (fetchError) throw new Error('Sale record not found');

    if (sale.product_id) {
      const { data: product, error: prodFetchError } = await supabase
        .from('products')
        .select('*')
        .eq('id', sale.product_id)
        .single();

      if (!prodFetchError) {
        const newMeters = Number((product.meters_available + sale.meters_sold).toFixed(2));
        const newBoxes = product.boxes_available + sale.boxes_sold;

        await supabase.from('products').update({
          meters_available: newMeters,
          boxes_available: newBoxes
        }).eq('id', product.id);

        // Audit Log
        await supabase.from('inventory_logs').insert([
          {
            product_id: product.id,
            ref_code: product.ref_code,
            product_name: product.name,
            edited_by: editedBy,
            action: 'update',
            old_values: { meters_available: product.meters_available, boxes_available: product.boxes_available },
            new_values: { meters_available: newMeters, boxes_available: newBoxes, note: `Undone sale ${saleId}` }
          }
        ]);

        // Trigger Alert Check
        const dataEnrichedOld = {
          ...product,
          alert_sent: product.alert_sent || (typeof window !== 'undefined' && localStorage.getItem(`ics_alert_sent_${product.id}`) !== null)
        };
        setTimeout(() => {
          checkAndTriggerAlert(dataEnrichedOld, newBoxes, db.updateProductAlertState);
        }, 0);
      }
    }

    const { error: deleteError } = await supabase.from('sales').delete().eq('id', saleId);
    if (deleteError) throw deleteError;
  },

  // BULK IMPORT
  bulkImportProducts: async (
    importRows: Array<{
      ref_code: string;
      name: string;
      category_name: string;
      meters_available: number;
      boxes_available: number;
      buying_price_meter: number; // Cost
      buying_price_box: number;
      location_name: string;
      min_stock_level: number;
    }>,
    editedBy: string
  ): Promise<{ inserted: number; errors: string[] }> => {
    let inserted = 0;
    const errors: string[] = [];

    const categories = await db.getCategories();
    const locations = await db.getLocations();

    const catMap = new Map(categories.map(c => [c.name.toLowerCase(), c.id]));
    const locMap = new Map(locations.map(l => [l.name.toLowerCase(), l.id]));

    for (let i = 0; i < importRows.length; i++) {
      const row = importRows[i];
      const lineNum = i + 2; 

      try {
        const ref_code = row.ref_code.trim().toUpperCase();
        const name = row.name.trim();

        if (!ref_code) throw new Error(`Line ${lineNum}: Reference code is required`);
        if (!name) throw new Error(`Line ${lineNum}: Product name is required`);

        let category_id = catMap.get(row.category_name.trim().toLowerCase());
        if (!category_id && row.category_name.trim()) {
          const newCat = await db.addCategory(row.category_name.trim());
          category_id = newCat.id;
          catMap.set(newCat.name.toLowerCase(), newCat.id);
        }
        if (!category_id) throw new Error(`Line ${lineNum}: Category name is empty or invalid`);

        let location_id = locMap.get(row.location_name.trim().toLowerCase());
        if (!location_id && row.location_name.trim()) {
          const newLoc = await db.addLocation(row.location_name.trim());
          location_id = newLoc.id;
          locMap.set(newLoc.name.toLowerCase(), newLoc.id);
        }
        if (!location_id) throw new Error(`Line ${lineNum}: Location name is empty or invalid`);

        await db.createProduct({
          ref_code,
          name,
          category_id,
          meters_available: Number(row.meters_available) || 0,
          boxes_available: Math.max(0, Math.floor(Number(row.boxes_available) || 0)),
          buying_price_meter: Number(row.buying_price_meter) || 0,
          buying_price_box: Number(row.buying_price_box) || 0,
          location_id,
          min_stock_level: Math.max(0, Math.floor(Number(row.min_stock_level) || 0))
        }, editedBy);

        inserted++;
      } catch (err: any) {
        errors.push(err.message || `Line ${lineNum}: Unknown validation error`);
      }
    }

    return { inserted, errors };
  },

  // AUDIT LOGS
  getAuditLogs: async (): Promise<InventoryLog[]> => {
    if (db.isMock()) {
      return getLocal<InventoryLog>(MOCK_LOGS_KEY).sort((a, b) => b.created_at.localeCompare(a.created_at));
    }
    const { data, error } = await supabase.from('inventory_logs').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  // UPDATE PRODUCT ALERT STATE (to prevent spam)
  updateProductAlertState: async (id: string, alertSent: boolean): Promise<void> => {
    if (db.isMock()) {
      const prods = getLocal<Product>(MOCK_PRODUCTS_KEY);
      const idx = prods.findIndex(p => p.id === id);
      if (idx !== -1) {
        prods[idx].alert_sent = alertSent;
        prods[idx].last_alert_sent_at = alertSent ? new Date().toISOString() : undefined;
        setLocal(MOCK_PRODUCTS_KEY, prods);
      }
      return;
    }

    try {
      const { error } = await supabase
        .from('products')
        .update({
          alert_sent: alertSent,
          last_alert_sent_at: alertSent ? new Date().toISOString() : null
        })
        .eq('id', id);

      if (error) {
        // Fallback to client-side localStorage state if column doesn't exist
        const key = `ics_alert_sent_${id}`;
        if (alertSent) {
          localStorage.setItem(key, new Date().toISOString());
        } else {
          localStorage.removeItem(key);
        }
      }
    } catch (err) {
      const key = `ics_alert_sent_${id}`;
      if (alertSent) {
        localStorage.setItem(key, new Date().toISOString());
      } else {
        localStorage.removeItem(key);
      }
    }
  }
};
