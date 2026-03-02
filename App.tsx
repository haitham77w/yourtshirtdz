import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import ProductsPage from './pages/Products';
import ProductDetails from './pages/ProductDetails';
import Checkout from './pages/Checkout';
import About from './pages/About';
import ThankYou from './pages/ThankYou';
import CartDrawer from './components/CartDrawer';
import { Product, CartItem, Category } from './types';
import { Facebook, Instagram, Twitter, Loader2 } from 'lucide-react';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import { supabase } from './lib/supabase';
import { cacheGet, cacheSet, CACHE_KEYS } from './lib/cache';

function AppContent() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const { t, language } = useLanguage();
  const { settings } = useSettings();

  // سنقوم الآن بجلب المنتجات المميزة مباشرة من جدول featured_products

  useEffect(() => {
    const mapCategories = (data: any[]) =>
      data.map((c: any) => ({
        id: c.id,
        nameAr: c.name_ar,
        nameEn: c.name_en,
        image: c.image_url
      }));

    const mapProducts = (data: any[]) =>
      data.map((p: any) => ({
        id: p.id,
        categoryId: p.category_id,
        nameAr: p.name_ar,
        nameEn: p.name_en,
        descriptionAr: p.description_ar,
        descriptionEn: p.description_en,
        price: p.price,
        originalPrice: p.original_price,
        image: p.image_url,
        category: p.category ? p.category.name_en : 'Uncategorized',
        isFeatured: !!p.is_featured,
        variants: (p.variants || []).map((v: any) => ({
          id: v.id,
          size: v.size,
          color: v.color,
          quantity: v.quantity,
          sku: v.sku
        }))
      }));

    const fetchFromDb = async () => {
      console.log('Fetching from DB...');
      const [catRes, prodRes, featRes] = await Promise.all([
        supabase.from('categories').select('*').order('id'),
        supabase
          .from('products')
          .select(`*, variants:product_variants(*), category:categories(name_en)`),
        supabase.from('featured_products').select('*')
      ]);

      if (catRes.error) console.error('Error fetching categories:', catRes.error);
      if (prodRes.error) console.error('Error fetching products:', prodRes.error);

      // لا نعتبر خطأ featRes عائقاً كبيراً، قد لا يكون الجدول موجوداً
      if (featRes.error) console.warn('Note: featured_products table fetch issue:', featRes.error);

      if (!catRes.error && catRes.data) {
        const mapped = mapCategories(catRes.data);
        setCategories(mapped);
        cacheSet(CACHE_KEYS.CATEGORIES, mapped);
      }

      let currentProducts: Product[] = [];
      if (!prodRes.error && prodRes.data) {
        currentProducts = mapProducts(prodRes.data);
      }

      // جلب المعرفات من جدول featured_products إن وجد
      const extraFeaturedIds = featRes.data
        ? featRes.data.map((f: any) => String(f.product_id || f.id || '')).filter(Boolean)
        : [];

      // مزامنة ودمج المصدرين: عمود is_featured و جدول featured_products
      const updatedProducts = currentProducts.map(p => ({
        ...p,
        isFeatured: p.isFeatured || extraFeaturedIds.includes(String(p.id))
      }));

      console.log('Total products:', updatedProducts.length);
      console.log('Products marked as isFeatured in DB:', updatedProducts.filter(p => p.isFeatured).length);
      console.log('Featured IDs from separate table:', extraFeaturedIds);

      setProducts(updatedProducts);
      cacheSet(CACHE_KEYS.PRODUCTS, updatedProducts);

      const combinedFeatured = updatedProducts.filter(p => p.isFeatured);
      console.log('Final combined featured products count:', combinedFeatured.length);

      setFeaturedProducts(combinedFeatured);
      cacheSet(CACHE_KEYS.FEATURED_PRODUCTS, combinedFeatured);
    };

    const loadWithCache = async () => {
      try {
        setLoading(true);

        const cachedCategories = cacheGet<Category[]>(CACHE_KEYS.CATEGORIES);
        const cachedProducts = cacheGet<Product[]>(CACHE_KEYS.PRODUCTS);
        const cachedFeatured = cacheGet<Product[]>(CACHE_KEYS.FEATURED_PRODUCTS);

        const hasValidCache = Array.isArray(cachedCategories) &&
          Array.isArray(cachedProducts) &&
          Array.isArray(cachedFeatured);

        if (hasValidCache) {
          setCategories(cachedCategories);
          setProducts(cachedProducts);
          setFeaturedProducts(cachedFeatured);
          setLoading(false);
          // تحديث في الخلفية (stale-while-revalidate) لتحديث الكاش دون انتظار
          fetchFromDb();
          return;
        }

        await fetchFromDb();
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadWithCache();
  }, []);

  const addToCart = (product: Product, size: string, color: string, quantity: number) => {
    const selectedVariant = product.variants.find(v => v.size === size && v.color === color);
    const selectedVariantId = selectedVariant ? selectedVariant.id : 'unknown';

    const newItem: CartItem = {
      ...product,
      selectedVariantId: String(selectedVariantId),
      selectedSize: size,
      selectedColor: color,
      quantity,
      cartId: `${product.id}-${size}-${color}-${Date.now()}`
    };

    setCart(prev => [...prev, newItem]);
    setIsCartOpen(true);
  };

  const removeFromCart = (cartId: string) => {
    setCart(prev => prev.filter(item => item.cartId !== cartId));
  };

  const clearCart = () => {
    setCart([]);
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-10 h-10 animate-spin text-brand-yellow" />
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen flex flex-col font-sans text-brand-black">
        <Navbar cartCount={cart.length} onOpenCart={() => setIsCartOpen(true)} />

        <CartDrawer
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
          items={cart}
          onRemove={removeFromCart}
          total={cartTotal}
        />

        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Home products={products} categories={categories} featuredProducts={featuredProducts} />} />
            <Route path="/products" element={<ProductsPage products={products} categories={categories} />} />
            <Route path="/category/:categoryId" element={<ProductsPage products={products} categories={categories} />} />
            <Route path="/product/:id" element={<ProductDetails products={products} onAddToCart={addToCart} />} />
            <Route path="/checkout" element={
              <Checkout
                cart={cart}
                total={cartTotal}
                onClearCart={clearCart}
              />
            } />
            <Route path="/thank-you" element={<ThankYou />} />
            <Route path="/about-us" element={<About />} />
          </Routes>
        </main>

        <footer className="bg-black text-white py-12">
          <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <h3 className="text-2xl font-black mb-4">
                {settings?.siteName.split('DZ')[0] || 'YourTshirt'}<span className="text-brand-yellow">DZ</span>
              </h3>
              <p className="text-gray-400 max-w-sm">
                {language === 'ar' ? settings?.aboutDescriptionAr : settings?.aboutDescriptionEn || t('aboutText')}
              </p>
            </div>
            <div>
              <h4 className="font-bold text-lg mb-4">{t('quickLinks')}</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link to="/about-us" className="hover:text-brand-yellow">{t('aboutUs')}</Link></li>
                <li><a href="#" className="hover:text-brand-yellow">{t('deliveryPolicy')}</a></li>
                <li><a href="#" className="hover:text-brand-yellow">{t('faq')}</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-lg mb-4">{t('contactUs')}</h4>
              <div className="flex gap-4">
                <a href="#" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-brand-yellow hover:text-black transition-colors">
                  <Instagram className="w-5 h-5" />
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-brand-yellow hover:text-black transition-colors">
                  <Facebook className="w-5 h-5" />
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-brand-yellow hover:text-black transition-colors">
                  <Twitter className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>
          <div className="text-center text-gray-600 mt-12 pt-8 border-t border-gray-800">
            {t('rights')}
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default function App() {
  return (
    <SettingsProvider>
      <LanguageProvider>
        <AppContent />
      </LanguageProvider>
    </SettingsProvider>
  );
}