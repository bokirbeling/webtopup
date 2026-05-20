import { useEffect, useState } from 'react';
import { ArrowLeft, Search, Loader2, AlertCircle } from 'lucide-react';
import { buildApiUrl, readApiError } from '../lib/api';

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
  metadata?: ProductMetadata;
  main_category?: string;
  sub_category?: string;
  product_type?: string;
};

type ProductListProps = {
  category: string;
  onBack: () => void;
};

function formatRupiah(amountMinor: number) {
  return 'Rp ' + (amountMinor / 100).toLocaleString('id-ID');
}

export default function ProductList({ category, onBack }: ProductListProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function fetchProducts() {
      try {
        setLoading(true);
        setError(null);

        const url = buildApiUrl(`/catalog/products?category=${encodeURIComponent(category)}`);
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(await readApiError(response));
        }
        
        const data = await response.json();
        setProducts(data.products || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load products');
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, [category]);

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.provider.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedProducts = filteredProducts.reduce((acc, product) => {
    const provider = product.provider || 'Other';
    if (!acc[provider]) {
      acc[provider] = [];
    }
    acc[provider].push(product);
    return acc;
  }, {} as Record<string, Product[]>);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Kembali</span>
            </button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-slate-900">{category}</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                {products.length} produk tersedia
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari produk atau provider..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-amber-600 animate-spin" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <p className="text-slate-600">{error}</p>
            </div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-slate-500">Tidak ada produk ditemukan</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedProducts).map(([provider, providerProducts]) => (
              <div key={provider}>
                <h2 className="text-lg font-bold text-slate-900 mb-4">{provider}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {providerProducts.map((product) => (
                    <button
                      key={product.id}
                      className="group bg-white rounded-xl border border-slate-200 hover:border-amber-300 hover:shadow-lg transition-all p-4 text-left"
                    >
                      {product.metadata?.image_url && (
                        <div className="aspect-video rounded-lg overflow-hidden mb-3 bg-slate-100">
                          <img
                            src={product.metadata.image_url}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        </div>
                      )}
                      <h3 className="font-semibold text-slate-900 mb-1 line-clamp-2">
                        {product.name}
                      </h3>
                      {product.metadata?.description && product.metadata.description !== '-' && (
                        <p className="text-xs text-slate-500 mb-2 line-clamp-1">
                          {product.metadata.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                        <span className="text-lg font-bold text-amber-600">
                          {formatRupiah(product.base_price_minor)}
                        </span>
                        <span className="text-xs text-slate-500">
                          {product.product_type || product.metadata?.type || 'Umum'}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
