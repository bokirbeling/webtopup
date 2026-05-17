'use client';

import Image from 'next/image';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { buildApiUrl, readApiError } from '@/lib/api';

type CatalogProductResponse = Readonly<{
  product: Readonly<{
    id: string;
    sku_digiflazz: string;
    name: string;
    category: string;
    provider: string;
    metadata?: Record<string, unknown>;
  }>;
  final_price_minor: number;
  base_price_minor: number;
  role_type: string;
}>;

type CatalogResponse = Readonly<{
  products: CatalogProductResponse[];
}>;

type DisplayProduct = Readonly<{
  key: string;
  productId: string | null;
  code: string;
  name: string;
  category: string;
  provider: string;
  amountMinor: number;
  subtitle: string;
  image: string;
  popular: boolean;
}>;

type OrderResponse = Readonly<{
  order_id: string;
  invoice_code: string;
  status: string;
}>;

type PaymentResponse = Readonly<{
  payment_id: string;
  order_id: string;
  status: string;
  token: string;
  redirect_url: string;
}>;

const fallbackImages = [
  '/product-assets/mobile-legends.jpg',
  '/product-assets/free-fire.jpg',
  '/product-assets/pln-token.png',
  '/product-assets/gopay-emoney.png',
  '/product-assets/paket-data.png',
  '/product-assets/voucher-digital.png',
];

const imageRules = [
  { pattern: /mobile\s*legends|mlbb|ml-/i, image: '/product-assets/mobile-legends.jpg' },
  { pattern: /free\s*fire|\bff\b/i, image: '/product-assets/free-fire.jpg' },
  { pattern: /genshin/i, image: '/product-assets/genshin-impact.jpg' },
  { pattern: /pubg/i, image: '/product-assets/pubg-mobile.jpg' },
  { pattern: /pln|listrik/i, image: '/product-assets/pln-token.png' },
  { pattern: /gopay|go pay|e-money|emoney|wallet/i, image: '/product-assets/gopay-emoney.png' },
  { pattern: /data|telkomsel|internet/i, image: '/product-assets/paket-data.png' },
  { pattern: /voucher|google play/i, image: '/product-assets/voucher-digital.png' },
];

const demoProducts: DisplayProduct[] = [
  {
    key: 'demo-pln',
    productId: null,
    code: 'DEMO-PLN-20K',
    name: 'Token PLN 20.000',
    category: 'Listrik PLN',
    provider: 'digiflazz',
    amountMinor: 21500,
    subtitle: 'Demo fallback ketika database kosong',
    image: '/product-assets/pln-token.png',
    popular: true,
  },
  {
    key: 'demo-ml',
    productId: null,
    code: 'DEMO-ML-86',
    name: 'Mobile Legends 86 Diamonds',
    category: 'Game',
    provider: 'digiflazz',
    amountMinor: 21000,
    subtitle: 'Demo fallback ketika database kosong',
    image: '/product-assets/mobile-legends.jpg',
    popular: true,
  },
  {
    key: 'demo-data',
    productId: null,
    code: 'DEMO-TSEL-DATA-5GB',
    name: 'Telkomsel Data 5GB',
    category: 'Paket Data',
    provider: 'digiflazz',
    amountMinor: 51000,
    subtitle: 'Demo fallback ketika database kosong',
    image: '/product-assets/paket-data.png',
    popular: false,
  },
];

function formatRupiah(amountMinor: number) {
  return 'Rp ' + amountMinor.toLocaleString('id-ID');
}

function categoryIndex(category: string) {
  return Math.abs([...category].reduce((total, char) => total + char.charCodeAt(0), 0)) % fallbackImages.length;
}

function safeImageFromMetadata(metadata: Record<string, unknown> | undefined) {
  const imageUrl = typeof metadata?.image_url === 'string' ? metadata.image_url : null;
  const categoryImageUrl = typeof metadata?.category_image_url === 'string' ? metadata.category_image_url : null;
  return imageUrl ?? categoryImageUrl;
}

function toDisplayProduct(item: CatalogProductResponse): DisplayProduct {
  const searchKey = `${item.product.name} ${item.product.category} ${item.product.provider} ${item.product.sku_digiflazz}`;
  const uploadedImage = safeImageFromMetadata(item.product.metadata);
  const matchedImage = imageRules.find((entry) => entry.pattern.test(searchKey))?.image;
  const stock = typeof item.product.metadata?.stock === 'number' ? `${item.product.metadata.stock} stok` : 'Produk Digiflazz';

  return {
    key: item.product.id,
    productId: item.product.id,
    code: item.product.sku_digiflazz,
    name: item.product.name,
    category: item.product.category,
    provider: item.product.provider,
    amountMinor: item.final_price_minor,
    subtitle: `${item.product.provider} · ${stock}`,
    image: uploadedImage ?? matchedImage ?? fallbackImages[categoryIndex(item.product.category)],
    popular: item.role_type === 'seller' || item.final_price_minor <= 25000,
  };
}

function ProductImage({ product }: { product: DisplayProduct }) {
  if (product.image.startsWith('/')) {
    return <Image src={product.image} alt={product.name} fill sizes="(min-width: 1024px) 25vw, 50vw" className="object-cover" priority={product.popular} />;
  }

  return <img src={product.image} alt={product.name} loading="lazy" className="h-full w-full object-cover" />;
}

export default function ProductCatalog() {
  const [catalogProducts, setCatalogProducts] = useState<DisplayProduct[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [selectedProductKey, setSelectedProductKey] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [searchTerm, setSearchTerm] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [orderResult, setOrderResult] = useState<OrderResponse | null>(null);
  const [paymentResult, setPaymentResult] = useState<PaymentResponse | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadCatalog() {
      setCatalogLoading(true);
      setCatalogError(null);

      try {
        const response = await fetch(buildApiUrl('/api/catalog/products'));
        if (!response.ok) {
          throw new Error(await readApiError(response, 'Gagal memuat katalog produk.'));
        }

        const body = (await response.json()) as CatalogResponse;
        const mapped = Array.isArray(body.products) ? body.products.map(toDisplayProduct) : [];

        if (mounted) {
          setCatalogProducts(mapped);
          setSelectedProductKey((current) => current ?? mapped[0]?.key ?? null);
        }
      } catch (error) {
        if (mounted) {
          setCatalogError(error instanceof Error ? error.message : 'Produk belum dapat dimuat.');
        }
      } finally {
        if (mounted) {
          setCatalogLoading(false);
        }
      }
    }

    void loadCatalog();

    return () => {
      mounted = false;
    };
  }, []);

  const products = catalogProducts.length > 0 ? catalogProducts : demoProducts;
  const categories = useMemo(() => ['Semua', ...Array.from(new Set(products.map((product) => product.category))).sort()], [products]);
  const filteredProducts = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return products.filter((product) => {
      const matchesCategory = selectedCategory === 'Semua' || product.category === selectedCategory;
      const matchesSearch =
        normalizedSearch.length === 0 ||
        product.name.toLowerCase().includes(normalizedSearch) ||
        product.code.toLowerCase().includes(normalizedSearch) ||
        product.provider.toLowerCase().includes(normalizedSearch);

      return matchesCategory && matchesSearch;
    });
  }, [products, searchTerm, selectedCategory]);

  const selectedProduct = products.find((product) => product.key === selectedProductKey) ?? filteredProducts[0] ?? products[0];

  const getCustomerIdPlaceholder = (category: string): string => {
    const lowerCategory = category.toLowerCase();
    if (lowerCategory.includes('pln') || lowerCategory.includes('listrik')) return 'Nomor Pelanggan PLN';
    if (lowerCategory.includes('pulsa') || lowerCategory.includes('paket')) return 'Nomor HP';
    if (lowerCategory.includes('game') || lowerCategory.includes('mobile legends') || lowerCategory.includes('free fire')) return 'User ID / Game ID';
    if (lowerCategory.includes('voucher') || lowerCategory.includes('google play')) return 'Email / User ID';
    if (lowerCategory.includes('emoney') || lowerCategory.includes('gopay') || lowerCategory.includes('ovo')) return 'Nomor HP / Email';
    return 'ID Pelanggan / Nomor Tujuan';
  };

  async function submitCheckout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setOrderResult(null);
    setPaymentResult(null);

    try {
      const orderResponse = await fetch(buildApiUrl('/api/orders'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_ref: customerId.trim(),
          product_id: selectedProduct.productId ?? undefined,
          product_code: selectedProduct.code,
          provider: selectedProduct.provider,
          amount_minor: selectedProduct.amountMinor,
          currency: 'IDR',
          metadata: {
            source: 'next_checkout',
            product_name: selectedProduct.name,
            product_category: selectedProduct.category,
            sku_digiflazz: selectedProduct.code,
            customer_email: email.trim() || undefined,
          },
        }),
      });

      if (!orderResponse.ok) {
        throw new Error(await readApiError(orderResponse, 'Gagal membuat order.'));
      }

      const orderBody = (await orderResponse.json()) as OrderResponse;
      setOrderResult(orderBody);

      const paymentResponse = await fetch(buildApiUrl('/api/payments/midtrans'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderBody.order_id }),
      });

      if (!paymentResponse.ok) {
        throw new Error(await readApiError(paymentResponse, 'Order dibuat, tetapi pembayaran gagal dimulai.'));
      }

      const paymentBody = (await paymentResponse.json()) as PaymentResponse;
      setPaymentResult(paymentBody);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Checkout gagal diproses.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="bg-slate-950 py-16 text-white">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.35em] text-cyan-300">Katalog Produk Digiflazz</p>
                <h2 className="mt-3 text-3xl font-black sm:text-5xl">Produk by kategori, mudah dicari.</h2>
                <p className="mt-3 max-w-2xl text-slate-300">Data utama dari backend/database. Jika kosong, UI tampilkan demo fallback tanpa menjadikan hardcode sebagai sumber truth.</p>
              </div>
              <div className="rounded-2xl bg-white/10 px-4 py-3 text-sm text-slate-200">
                {catalogLoading ? 'Memuat katalog...' : catalogProducts.length > 0 ? `${catalogProducts.length} produk live` : 'Mode demo'}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-[1fr_220px]">
              <label className="block">
                <span className="sr-only">Cari produk</span>
                <input
                  data-testid="catalog-search"
                  className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-slate-400 focus:border-cyan-300"
                  placeholder="Cari produk, SKU, provider..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </label>
              <label className="block">
                <span className="sr-only">Kategori</span>
                <select
                  data-testid="catalog-category-select"
                  className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-cyan-300"
                  value={selectedCategory}
                  onChange={(event) => setSelectedCategory(event.target.value)}
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </label>
            </div>

            {catalogError ? <div className="rounded-2xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">{catalogError}</div> : null}

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredProducts.map((product) => (
                <button
                  key={product.key}
                  type="button"
                  onClick={() => setSelectedProductKey(product.key)}
                  className={`overflow-hidden rounded-3xl border text-left transition hover:-translate-y-1 hover:border-cyan-300 ${selectedProduct.key === product.key ? 'border-cyan-300 bg-cyan-300/10' : 'border-white/10 bg-white/5'}`}
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-slate-800">
                    <ProductImage product={product} />
                    <span className="absolute left-3 top-3 rounded-full bg-slate-950/80 px-3 py-1 text-xs font-bold">{product.category}</span>
                  </div>
                  <div className="space-y-2 p-4">
                    <h3 className="font-black">{product.name}</h3>
                    <p className="text-xs text-slate-300">{product.subtitle}</p>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-lg font-black text-cyan-200">{formatRupiah(product.amountMinor)}</span>
                      <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold">{product.code}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={submitCheckout} className="h-fit rounded-[2rem] border border-white/10 bg-white p-6 text-slate-950 shadow-2xl">
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-cyan-700">Checkout cepat</p>
            <h3 className="mt-3 text-2xl font-black">{selectedProduct.name}</h3>
            <p className="mt-2 text-sm text-slate-500">{selectedProduct.category} · {selectedProduct.code}</p>
            <p className="mt-4 text-3xl font-black text-slate-950">{formatRupiah(selectedProduct.amountMinor)}</p>

            <div className="mt-6 space-y-3">
              <input required className="w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder={getCustomerIdPlaceholder(selectedProduct.category)} value={customerId} onChange={(event) => setCustomerId(event.target.value)} />
              <input type="email" className="w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder="Email invoice (opsional)" value={email} onChange={(event) => setEmail(event.target.value)} />
            </div>

            <button disabled={isSubmitting} className="mt-5 w-full rounded-2xl bg-slate-950 px-5 py-4 font-black text-white disabled:cursor-not-allowed disabled:opacity-60">
              {isSubmitting ? 'Memproses...' : 'Buat order'}
            </button>

            {errorMessage ? <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</div> : null}
            {orderResult ? <div className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Order dibuat: {orderResult.invoice_code} ({paymentResult?.status ?? orderResult.status})</div> : null}
          </form>
        </div>
      </div>
    </section>
  );
}
