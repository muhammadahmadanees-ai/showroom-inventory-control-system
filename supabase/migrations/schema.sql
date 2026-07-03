-- Create categories table
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create locations table
CREATE TABLE IF NOT EXISTS public.locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create products table (using buying prices as inventory assets)
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ref_code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    category_id UUID REFERENCES public.categories(id) ON DELETE RESTRICT NOT NULL,
    meters_available NUMERIC NOT NULL DEFAULT 0 CHECK (meters_available >= 0),
    boxes_available INTEGER NOT NULL DEFAULT 0 CHECK (boxes_available >= 0),
    buying_price_meter NUMERIC NOT NULL DEFAULT 0 CHECK (buying_price_meter >= 0),
    buying_price_box NUMERIC NOT NULL DEFAULT 0 CHECK (buying_price_box >= 0),
    location_id UUID REFERENCES public.locations(id) ON DELETE RESTRICT NOT NULL,
    min_stock_level INTEGER NOT NULL DEFAULT 10 CHECK (min_stock_level >= 0),
    is_archived BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create sales table (capturing transaction-specific cost, selling rate, revenue, and profit)
CREATE TABLE IF NOT EXISTS public.sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    invoice_id UUID NOT NULL,
    ref_code TEXT NOT NULL,
    product_name TEXT NOT NULL,
    meters_sold NUMERIC NOT NULL DEFAULT 0 CHECK (meters_sold >= 0),
    boxes_sold INTEGER NOT NULL DEFAULT 0 CHECK (boxes_sold >= 0),
    selling_price_meter NUMERIC NOT NULL DEFAULT 0 CHECK (selling_price_meter >= 0),
    selling_price_box NUMERIC NOT NULL DEFAULT 0 CHECK (selling_price_box >= 0),
    buying_price_meter NUMERIC NOT NULL DEFAULT 0 CHECK (buying_price_meter >= 0),
    buying_price_box NUMERIC NOT NULL DEFAULT 0 CHECK (buying_price_box >= 0),
    total_amount NUMERIC NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    profit NUMERIC NOT NULL DEFAULT 0, -- Revenue - Cost of Goods
    sold_by TEXT NOT NULL, -- Admin email
    salesman_name TEXT NOT NULL,
    sold_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create inventory_logs table for audit trail
CREATE TABLE IF NOT EXISTS public.inventory_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    ref_code TEXT,
    product_name TEXT,
    edited_by TEXT NOT NULL, -- Admin email
    action TEXT NOT NULL CHECK (action IN ('create', 'update', 'archive', 'restore')),
    old_values JSONB,
    new_values JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for all tables
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_logs ENABLE ROW LEVEL SECURITY;

-- Categories RLS Policies
DROP POLICY IF EXISTS "Allow public read-only access to categories" ON public.categories;
CREATE POLICY "Allow public read-only access to categories" ON public.categories
    FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Allow authenticated admins full access to categories" ON public.categories;
CREATE POLICY "Allow authenticated admins full access to categories" ON public.categories
    FOR ALL TO authenticated USING (true);

-- Locations RLS Policies
DROP POLICY IF EXISTS "Allow public read-only access to locations" ON public.locations;
CREATE POLICY "Allow public read-only access to locations" ON public.locations
    FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Allow authenticated admins full access to locations" ON public.locations;
CREATE POLICY "Allow authenticated admins full access to locations" ON public.locations
    FOR ALL TO authenticated USING (true);

-- Products RLS Policies (filtering out archived products for public, but allowing admins to see all)
DROP POLICY IF EXISTS "Allow public read-only access to active products" ON public.products;
CREATE POLICY "Allow public read-only access to active products" ON public.products
    FOR SELECT TO public USING (is_archived = false);

DROP POLICY IF EXISTS "Allow public updates to active products" ON public.products;
CREATE POLICY "Allow public updates to active products" ON public.products
    FOR UPDATE TO public USING (is_archived = false) WITH CHECK (is_archived = false);

DROP POLICY IF EXISTS "Allow authenticated admins full access to products" ON public.products;
CREATE POLICY "Allow authenticated admins full access to products" ON public.products
    FOR ALL TO authenticated USING (true);

-- Sales RLS Policies
DROP POLICY IF EXISTS "Allow public inserts to sales" ON public.sales;
CREATE POLICY "Allow public inserts to sales" ON public.sales
    FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated admins full access to sales" ON public.sales;
CREATE POLICY "Allow authenticated admins full access to sales" ON public.sales
    FOR ALL TO authenticated USING (true);

-- Inventory Logs RLS Policies
DROP POLICY IF EXISTS "Allow public inserts to inventory_logs" ON public.inventory_logs;
CREATE POLICY "Allow public inserts to inventory_logs" ON public.inventory_logs
    FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated admins full access to inventory_logs" ON public.inventory_logs;
CREATE POLICY "Allow authenticated admins full access to inventory_logs" ON public.inventory_logs
    FOR ALL TO authenticated USING (true);

-- Create trigger to automatically update the updated_at column on products
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_products_updated_at ON public.products;
CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Seed initial categories and locations if they don't exist
INSERT INTO public.categories (name) VALUES 
('Tiles'), 
('Sanitary')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.locations (name) VALUES 
('Warehouse'), 
('Basement'), 
('Display')
ON CONFLICT (name) DO NOTHING;
