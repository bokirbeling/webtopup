import { useEffect, useState, useRef, useCallback } from 'react';
import { Search, Filter, X, ChevronRight, Loader2, AlertCircle, Menu, ShoppingCart } from 'lucide-react';
import { buildApiUrl, readApiError } from '../lib/api';
import Checkout from './Checkout';

type ProductMetadata = {
  type?: string;
  image_url?: string;
  description?: string;
};

type Product = {
  id: string;
  sku_digiflazz: string;
  name: string;
  category: string;
  provider: string;
  base_price_minor: number;
  final_price_minor: number;
  metadata?: ProductMetadata;
  main_category?: string;
  sub_category?: string;
  product_type?: string;
  image_url?: string;
  fallback_image_url?: string;
};

type CategoryCount = {
  category: string;
  count: number;
};

function formatRupiah(amountMinor: number) {
  return 'Rp ' + (amountMinor / 100).toLocaleString('id-ID');
}

interface ProductCatalogProps {
  initialCategory?: string;
}

const STATIC_CATEGORIES = [
  { category: 'Pulsa', label: 'Pulsa & Data' },
  { category: 'PLN', label: 'Listrik & Token' },
  { category: 'Games', label: 'Voucher Game' },
  { category: 'E-Money', label: 'Topup E-Wallet' },
  { category: 'Voucher', label: 'Voucher Lain' }
];

export default function ProductCatalog({ initialCategory }: ProductCatalogProps = {}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory || 'Semua');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);

  // Pagination states
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalProducts, setTotalProducts] = useState(0);

  const fetchProducts = useCallback(async (pageNum: number, isAppend = false) => {
    try {
      if (pageNum === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);

      // Build url with params
      let url = buildApiUrl(`/catalog/products?page=${pageNum}&limit=24`);
      if (selectedCategory !== 'Semua') {
        url += `&category=${encodeURIComponent(selectedCategory)}`;
      }
      if (searchQuery.trim() !== '') {
        url += `&search=${encodeURIComponent(searchQuery)}`;
      }

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(await readApiError(response, 'Gagal mengambil katalog produk.'));
      }

      const data = await response.json();
      const productList = data.products || [];
      const pagination = data.pagination || { total: 0, totalPages: 1 };

      if (isAppend) {
        setProducts(prev => [...prev, ...productList]);
      } else {
        setProducts(productList);
      }

      setTotalProducts(pagination.total);
      setHasMore(pageNum < pagination.totalPages);
    } catch (err: any) {
      setError(err.message || 'Gagal memuat produk.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [selectedCategory, searchQuery]);

  // Trigger fetch when category or search changes (Reset to page 1)
  useEffect(() => {
    setPage(1);
    fetchProducts(1, false);
  }, [selectedCategory, searchQuery, fetchProducts]);

  const loadNextPage = () => {
    if (hasMore && !loadingMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchProducts(nextPage, true);
    }
  };

  const handleProductSelect = (product: Product) => {
    // Map property format for Checkout component
    const mappedProduct = {
      ...product,
      basePriceMinor: product.base_price_minor,
      skuDigiflazz: product.sku_digiflazz
    };
    setSelectedProduct(mappedProduct as any);
    setShowCheckout(true);
  };

  const getProductImage = (product: Product) => {
    const provider = (product.provider || 'unknown').toLowerCase().replace(/[^a-z0-9]/g, '-');
    return `/product-images/${provider}.png`;
  };

  const getCategoryCount = (catName: string) => {
    if (catName === 'Semua') return totalProducts;
    return totalProducts; // Server returns count of filtered category as total
  };

  return (
    <div className="min-h-screen pt-20 bg-slate-50 flex">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:block w-64 bg-white border-r border-slate-200 p-6 flex-shrink-0">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Kategori</h3>
        <div className="space-y-1.5">
          <button
            onClick={() => setSelectedCategory('Semua')}
            className={`w-full text-left px-3 py-2 rounded-xl text-sm font-bold transition-all flex items-center justify-between ${
              selectedCategory === 'Semua'
                ? 'bg-amber-500 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>Semua Produk</span>
          </button>

          {STATIC_CATEGORIES.map((cat) => (
            <button
              key={cat.category}
              onClick={() => setSelectedCategory(cat.category)}
              className={`w-full text-left px-3 py-2 rounded-xl text-sm font-bold transition-all flex items-center justify-between ${
                selectedCategory === cat.category
                  ? 'bg-amber-500 text-white shadow-md'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
        {/* Search & Filter Header */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari voucher, pulsa, token, game..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 focus:border-amber-500 rounded-2xl pl-11 pr-4 py-3 text-sm text-slate-900 placeholder-slate-400 transition-all outline-none shadow-sm"
            />
          </div>

          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden flex items-center justify-center gap-2 py-3 px-5 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
          >
            <Filter size={16} />
            Filter
          </button>
        </div>

        {/* Catalog List / Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl shadow-sm border border-slate-100">
            <Loader2 size={36} className="animate-spin text-amber-500 mb-4" />
            <p className="text-slate-500 text-sm">Menyelaraskan data katalog produk...</p>
          </div>
        ) : error ? (
          <div className="p-6 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 flex items-start gap-3 shadow-sm">
            <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Gagal memuat katalog</p>
              <p className="text-sm mt-0.5">{error}</p>
            </div>
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl shadow-sm border border-slate-100 text-center px-4">
            <p className="text-slate-800 font-bold text-lg">Produk tidak ditemukan</p>
            <p className="text-slate-500 text-sm mt-1">Coba gunakan kata kunci pencarian yang lain.</p>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map((product) => (
                <div
                  key={product.id}
                  onClick={() => handleProductSelect(product)}
                  className="bg-white border border-slate-100 hover:border-amber-400 rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all p-4 cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    {/* Image / Icon container */}
                    <div className="aspect-video w-full rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-3 overflow-hidden p-2">
                      <img 
                        src={getProductImage(product)} 
                        alt={product.provider}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = product.fallback_image_url || '/product-images/unknown.png';
                        }}
                        className="h-10 object-contain"
                      />
                    </div>

                    <h4 className="font-bold text-slate-800 text-sm line-clamp-2 h-10 tracking-tight leading-tight">
                      {product.name}
                    </h4>
                    <p className="text-slate-400 text-xs mt-1 font-medium">{product.provider} - {product.category}</p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between">
                    <div>
                      <p className="text-slate-400 text-[10px] uppercase font-semibold">Harga</p>
                      <p className="font-extrabold text-slate-900 text-sm mt-0.5">
                        {formatRupiah(product.final_price_minor)}
                      </p>
                    </div>
                    <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-colors">
                      <ChevronRight size={16} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Load More Button */}
            {hasMore && (
              <div className="flex justify-center pt-4">
                <button
                  onClick={loadNextPage}
                  disabled={loadingMore}
                  className="px-8 py-3 bg-white border border-slate-200 hover:border-amber-500 text-slate-700 hover:text-amber-600 font-bold rounded-2xl text-sm transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Memuat produk...
                    </>
                  ) : (
                    'Muat Lebih Banyak'
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mobile Drawer Filter */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="relative w-80 max-w-full bg-white h-full p-6 shadow-2xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-slate-950 text-lg">Filter Kategori</h3>
                <button onClick={() => setSidebarOpen(false)} className="p-1 text-slate-400 hover:text-slate-800">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-1.5">
                <button
                  onClick={() => { setSelectedCategory('Semua'); setSidebarOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-between ${
                    selectedCategory === 'Semua'
                      ? 'bg-amber-500 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span>Semua Produk</span>
                </button>

                {STATIC_CATEGORIES.map((cat) => (
                  <button
                    key={cat.category}
                    onClick={() => { setSelectedCategory(cat.category); setSidebarOpen(false); }}
                    className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-between ${
                      selectedCategory === cat.category
                        ? 'bg-amber-500 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {showCheckout && selectedProduct && (
        <Checkout
          product={selectedProduct as any}
          onClose={() => {
            setShowCheckout(false);
            setSelectedProduct(null);
          }}
        />
      )}
    </div>
  );
}
