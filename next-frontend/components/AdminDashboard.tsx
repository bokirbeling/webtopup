'use client';

import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { bearerHeaders, readJsonApi } from '@/lib/api';

type AuthUserRole = 'admin' | 'seller' | 'pengguna';
type ResellerStatus = 'none' | 'requested' | 'approved' | 'rejected';
type PricingScopeType = 'global' | 'category' | 'product';

type AuthUser = Readonly<{
  id: string;
  email: string;
  role: AuthUserRole;
  is_reseller_active: boolean;
  reseller_status: ResellerStatus;
  email_verified: boolean;
  email_verified_at: string | null;
  created_at: string;
  updated_at: string;
}>;

type AuthSession = Readonly<{ user: AuthUser; token: string; expires_in: string }>;
type AccountResponse = Readonly<{ user: AuthUser }>;
type AdminUsersResponse = Readonly<{ users: AuthUser[] }>;

type AdminProduct = Readonly<{
  id: string;
  sku_digiflazz: string;
  name: string;
  category: string;
  provider: string;
  base_price_minor: number;
  is_active: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}>;

type AdminProductsResponse = Readonly<{ products: AdminProduct[] }>;
type AdminProductResponse = Readonly<{ product: AdminProduct }>;

type PerformanceCurve = Readonly<{
  user_id: string;
  period: string;
  total_transactions: number;
  total_commission_minor: number;
  tier: string;
}>;

type PricingRule = Readonly<{
  id: string;
  scope_type: PricingScopeType;
  product_id: string | null;
  category: string | null;
  role_type: AuthUserRole;
  markup_fixed: number;
  markup_percentage: number;
  priority: number;
  is_active: boolean;
}>;

type PricingRulesResponse = Readonly<{ pricing_rules: PricingRule[] }>;

type AdminMonitoringResponse = Readonly<{
  transactions: ReadonlyArray<Readonly<{ order_id: string; invoice_code: string; status: string; product_code: string; amount_minor: number; user_id: string | null }>>;
  webhooks: ReadonlyArray<Readonly<{ webhook_id: string; provider: string; event_type: string; processing_state: string; received_at: string }>>;
  summary: Readonly<{ transaction_count: number; webhook_count: number; failed_webhook_count: number }>;
}>;

type DigiflazzOperationsResponse = Readonly<{
  balance: Readonly<{ deposit: number | null; rc: string | null; message: string | null }>;
  catalog: Readonly<{ product_count: number; active_count: number; inactive_count: number; last_synced_at: string | null }>;
  webhooks: Readonly<{ recent_count: number; failed_count: number }>;
}>;

type DigiflazzSyncResponse = Readonly<{ product_count: number; active_count: number; inactive_count: number }>;

const storageKey = 'bayarku.auth.session';

function formatRupiah(amountMinor: number | null) {
  if (amountMinor === null) return 'Belum tersedia';
  return 'Rp ' + amountMinor.toLocaleString('id-ID');
}

function readStoredSession(): AuthSession | null {
  try {
    const value = window.localStorage.getItem(storageKey);
    if (value === null) return null;
    const parsed = JSON.parse(value) as Partial<AuthSession>;
    if (typeof parsed.token !== 'string' || typeof parsed.user?.email !== 'string') return null;
    return parsed as AuthSession;
  } catch {
    return null;
  }
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => (typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('File tidak valid.')));
    reader.onerror = () => reject(new Error('Gagal membaca file.'));
    reader.readAsDataURL(file);
  });
}

export default function AdminDashboard() {
  const [session] = useState<AuthSession | null>(() => readStoredSession());
  const [adminUser, setAdminUser] = useState<AuthUser | null>(null);
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([]);
  const [monitoring, setMonitoring] = useState<AdminMonitoringResponse | null>(null);
  const [digiflazzOps, setDigiflazzOps] = useState<DigiflazzOperationsResponse | null>(null);
  const [category, setCategory] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isLoading, setIsLoading] = useState(Boolean(session));
  const [isSavingImage, setIsSavingImage] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const token = session?.token ?? null;
  const categories = useMemo(() => Array.from(new Set(products.map((product) => product.category))).sort(), [products]);

  const [performance, setPerformance] = useState<PerformanceCurve[]>([]);

  const loadAdminData = useCallback(async (activeToken: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const mePayload = await readJsonApi<AccountResponse>('/api/auth/me', { headers: bearerHeaders(activeToken) });
      if (mePayload.user.role !== 'admin') {
        setAdminUser(mePayload.user);
        setUsers([]);
        setProducts([]);
        setPricingRules([]);
        setMonitoring(null);
        setDigiflazzOps(null);
        setPerformance([]);
        return;
      }

      const [usersPayload, productsPayload, pricingPayload, monitoringPayload, opsPayload, perfPayload] = await Promise.all([
        readJsonApi<AdminUsersResponse>('/api/admin/users', { headers: bearerHeaders(activeToken) }),
        readJsonApi<AdminProductsResponse>('/api/admin/catalog/products', { headers: bearerHeaders(activeToken) }),
        readJsonApi<PricingRulesResponse>('/api/admin/catalog/pricing-rules', { headers: bearerHeaders(activeToken) }),
        readJsonApi<AdminMonitoringResponse>('/api/admin/monitoring', { headers: bearerHeaders(activeToken) }),
        readJsonApi<DigiflazzOperationsResponse>('/api/admin/digiflazz/operations', { headers: bearerHeaders(activeToken) }),
        readJsonApi<{ curves: PerformanceCurve[] }>('/api/admin/commission/performance', { headers: bearerHeaders(activeToken) }),
      ]);

      setAdminUser(mePayload.user);
      setUsers(usersPayload.users);
      setProducts(productsPayload.products);
      setPricingRules(pricingPayload.pricing_rules);
      setMonitoring(monitoringPayload);
      setDigiflazzOps(opsPayload);
      setPerformance(perfPayload.curves || []);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Admin data gagal dimuat.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token === null) {
      setIsLoading(false);
      return;
    }
    void loadAdminData(token);
  }, [loadAdminData, token]);

  async function syncDigiflazzCatalog() {
    if (token === null) return;
    setIsSyncing(true);
    setErrorMessage(null);
    try {
      const result = await readJsonApi<DigiflazzSyncResponse>('/api/admin/catalog/digiflazz/price-list/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...bearerHeaders(token) },
        body: JSON.stringify({}),
      });
      setNotice(`Sinkron Digiflazz selesai: ${result.product_count} produk, ${result.active_count} aktif, ${result.inactive_count} nonaktif.`);
      await loadAdminData(token);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Sinkron Digiflazz gagal.');
    } finally {
      setIsSyncing(false);
    }
  }

  async function handleImageFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setImageUrl(await fileToDataUrl(file));
  }

  async function uploadCategoryImage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (token === null || category.trim().length === 0 || imageUrl.trim().length === 0) return;
    setIsSavingImage(true);
    setErrorMessage(null);
    try {
      const categoryProducts = products.filter((product) => product.category === category);
      const updatedProducts = await Promise.all(
        categoryProducts.map((product) =>
          readJsonApi<AdminProductResponse>(`/api/admin/catalog/products/${product.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', ...bearerHeaders(token) },
            body: JSON.stringify({
              metadata: {
                ...product.metadata,
                image_url: imageUrl.trim(),
                category_image_url: imageUrl.trim(),
                image_source: 'admin_category_upload_next',
              },
            }),
          })
        )
      );
      const updatedById = new Map(updatedProducts.map((payload) => [payload.product.id, payload.product]));
      setProducts((current) => current.map((product) => updatedById.get(product.id) ?? product));
      setNotice(`Gambar kategori ${category} diterapkan ke ${updatedProducts.length} produk.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Upload gambar kategori gagal.');
    } finally {
      setIsSavingImage(false);
    }
  }

  async function approveReseller(userId: string) {
    if (token === null) return;
    await readJsonApi<AccountResponse>(`/api/admin/users/${userId}/reseller/approve`, { method: 'POST', headers: bearerHeaders(token) });
    await loadAdminData(token);
  }

  if (token === null) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-16 text-white">
        <section className="mx-auto max-w-3xl rounded-[2rem] border border-white/10 bg-white/5 p-8" data-testid="admin-forbidden">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-red-300">Admin only</p>
          <h1 className="mt-3 text-4xl font-black">Login admin dibutuhkan.</h1>
          <p className="mt-4 text-slate-300">Masuk lewat dashboard, lalu buka kembali /admin.</p>
        </section>
      </main>
    );
  }

  if (!isLoading && adminUser?.role !== 'admin') {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-16 text-white">
        <section className="mx-auto max-w-3xl rounded-[2rem] border border-white/10 bg-white/5 p-8" data-testid="admin-forbidden">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-red-300">Akses ditolak</p>
          <h1 className="mt-3 text-4xl font-black">Role admin diperlukan.</h1>
          <p className="mt-4 text-slate-300">Akun aktif: {adminUser?.email ?? session?.user.email}</p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-16 text-slate-950">
      <section className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-[2rem] bg-slate-950 p-8 text-white shadow-xl">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-300">Adnanpay Admin</p>
          <h1 className="mt-3 text-4xl font-black">Operasional produk, reseller, dan Digiflazz.</h1>
          <p className="mt-3 text-slate-300">Semua data sensitif tetap backend-only. UI hanya tampilkan ringkasan aman.</p>
        </header>

        {isLoading ? <div className="rounded-3xl bg-white p-8 text-center font-bold">Memuat admin...</div> : null}
        {errorMessage ? <div className="rounded-3xl bg-red-50 p-4 text-sm text-red-700">{errorMessage}</div> : null}
        {notice ? <div className="rounded-3xl bg-emerald-50 p-4 text-sm text-emerald-700">{notice}</div> : null}

        {!isLoading ? (
          <>
            <div className="grid gap-4 md:grid-cols-4">
              <article className="rounded-3xl bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase text-slate-400">Produk</p><p className="mt-2 text-3xl font-black">{products.length}</p></article>
              <article className="rounded-3xl bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase text-slate-400">Users</p><p className="mt-2 text-3xl font-black">{users.length}</p></article>
              <article className="rounded-3xl bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase text-slate-400">Saldo Digiflazz</p><p className="mt-2 text-2xl font-black" data-testid="digiflazz-balance">{formatRupiah(digiflazzOps?.balance.deposit ?? null)}</p></article>
              <article className="rounded-3xl bg-white p-5 shadow-sm overflow-hidden flex flex-col">
                <p className="text-xs font-bold uppercase text-slate-400">Total Komisi (30d)</p>
                {performance.length > 0 ? (
                  <div className="mt-2 flex flex-1 items-end gap-0.5 h-8">
                    {(() => {
                      const maxComm = Math.max(...performance.map(p => p.total_commission_minor), 1);
                      return performance.slice(-14).map((p, i) => (
                        <div key={i} className="flex-1 bg-cyan-500/50 rounded-t-sm" style={{ height: `${Math.max((p.total_commission_minor / maxComm) * 100, 10)}%` }}></div>
                      ));
                    })()}
                  </div>
                ) : <p className="mt-2 text-3xl font-black">Rp 0</p>}
              </article>
            </div>

            <section className="rounded-[2rem] bg-white p-6 shadow-sm" data-testid="digiflazz-ops-panel">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-2xl font-black">Digiflazz Buyer Operations</h2>
                  <p className="mt-1 text-sm text-slate-500">Saldo, katalog sync, dan ringkasan webhook tanpa menampilkan API key/signature.</p>
                </div>
                <button type="button" onClick={syncDigiflazzCatalog} disabled={isSyncing} className="rounded-2xl bg-slate-950 px-5 py-3 font-black text-white disabled:bg-slate-300" data-testid="digiflazz-sync-button">
                  {isSyncing ? 'Sinkron...' : 'Sync Produk Digiflazz'}
                </button>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase text-slate-400">Produk aktif/nonaktif</p><p className="mt-2 font-black" data-testid="digiflazz-active-count">{digiflazzOps?.catalog.active_count ?? 0} / {digiflazzOps?.catalog.inactive_count ?? 0}</p></div>
                <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase text-slate-400">Total produk</p><p className="mt-2 font-black" data-testid="digiflazz-product-count">{digiflazzOps?.catalog.product_count ?? products.length}</p></div>
                <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase text-slate-400">Last sync</p><p className="mt-2 font-black" data-testid="digiflazz-last-sync">{digiflazzOps?.catalog.last_synced_at ?? 'Belum ada'}</p></div>
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
              <form onSubmit={uploadCategoryImage} className="rounded-[2rem] bg-white p-6 shadow-sm" data-testid="admin-category-image-form">
                <h2 className="text-2xl font-black">Upload gambar kategori</h2>
                <p className="mt-1 text-sm text-slate-500">Gambar diterapkan ke metadata semua produk dalam kategori terpilih.</p>
                <select required value={category} onChange={(event) => setCategory(event.target.value)} className="mt-5 w-full rounded-2xl border border-slate-200 px-4 py-3">
                  <option value="">Pilih kategori</option>
                  {categories.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleImageFile} className="mt-3 w-full rounded-2xl border border-slate-200 px-4 py-3" />
                <input value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="Atau tempel URL/data image" className="mt-3 w-full rounded-2xl border border-slate-200 px-4 py-3" />
                <button disabled={isSavingImage} className="mt-4 w-full rounded-2xl bg-cyan-400 px-5 py-3 font-black text-slate-950 disabled:opacity-60" data-testid="admin-category-image-save">{isSavingImage ? 'Menyimpan...' : 'Simpan gambar kategori'}</button>
              </form>

              <section className="rounded-[2rem] bg-white p-6 shadow-sm">
                <h2 className="text-2xl font-black">Produk</h2>
                <div className="mt-4 max-h-[520px] space-y-3 overflow-auto pr-2">
                  {products.map((product) => (
                    <article key={product.id} className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4">
                      <div>
                        <h3 className="font-bold">{product.name}</h3>
                        <p className="text-xs text-slate-500">{product.category} · {product.sku_digiflazz}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${product.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>{product.is_active ? 'Aktif' : 'Nonaktif'}</span>
                    </article>
                  ))}
                </div>
              </section>
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
              <section className="rounded-[2rem] bg-white p-6 shadow-sm">
                <h2 className="text-2xl font-black">User & reseller</h2>
                <div className="mt-4 space-y-3">
                  {users.slice(0, 8).map((user) => (
                    <article key={user.id} className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4">
                      <div><h3 className="font-bold">{user.email}</h3><p className="text-xs text-slate-500">{user.role} · {user.reseller_status}</p></div>
                      <button type="button" onClick={() => void approveReseller(user.id)} className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-bold text-white">Approve</button>
                    </article>
                  ))}
                </div>
              </section>

              <section className="rounded-[2rem] bg-white p-6 shadow-sm" data-testid="admin-monitoring">
                <h2 className="text-2xl font-black">Transaksi & webhook</h2>
                <p className="mt-2 text-sm text-slate-500">Transaksi: {monitoring?.summary.transaction_count ?? 0}. Webhook: {monitoring?.summary.webhook_count ?? 0}.</p>
                <div className="mt-4 space-y-3">
                  {monitoring?.transactions.slice(0, 5).map((transaction) => (
                    <article key={transaction.order_id} className="rounded-2xl bg-slate-50 p-4">
                      <h3 className="font-bold">{transaction.invoice_code}</h3>
                      <p className="text-xs text-slate-500">{transaction.product_code} · {transaction.status} · {formatRupiah(transaction.amount_minor)}</p>
                    </article>
                  ))}
                </div>
              </section>
            </section>

            <section className="rounded-[2rem] bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-black">Pricing rules</h2>
              <p className="mt-2 text-sm text-slate-500">{pricingRules.length} aturan pricing aktif/nonaktif tersedia untuk task UI lanjutan.</p>
            </section>
          </>
        ) : null}
      </section>
    </main>
  );
}
