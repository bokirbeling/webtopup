import { useEffect, useState } from 'react';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import TransaksiPage from './components/TransaksiPage';

import Header from './components/Header';
import Hero from './components/Hero';
import PromoCarousel from './components/PromoCarousel';
import Categories from './components/Categories';
import HotDeals from './components/HotDeals';
import GameTopUp from './components/GameTopUp';
import Stats from './components/Stats';
import Features from './components/Features';
import Footer from './components/Footer';
import InvoiceStatusPage from './components/InvoiceStatusPage';
import AuthDashboard from './components/AuthDashboard';
import AdminDashboard from './components/AdminDashboard';
import ProductList from './components/ProductList';
import ProductCatalog from './components/ProductCatalog';
import VoucherManagement from './components/admin/VoucherManagement';

function getInvoiceCodeFromPath(pathname: string) {
  const match = /^\/invoice\/([^/]+)\/?$/.exec(pathname);

  return match ? decodeURIComponent(match[1]) : null;
}

function getCategoryFromPath(pathname: string) {
  const match = /^\/products\/([^/]+)\/?$/.exec(pathname);

  return match ? decodeURIComponent(match[1]) : null;
}

function getCategoryFilterFromPath(pathname: string) {
  const match = /^\/category\/([^/]+)\/?$/.exec(pathname);
  
  if (!match) return null;
  
  const slug = match[1];
  const categoryMap: Record<string, string> = {
    'pulsa-data': 'Pulsa,Data',
    'listrik-air': 'PLN',
    'games': 'Games',
    'e-wallet': 'E-Money'
  };
  
  return categoryMap[slug] || null;
}

function getRouteFromPath(pathname: string) {
  const invoiceCode = getInvoiceCodeFromPath(pathname);

  if (invoiceCode !== null) {
    return { page: 'invoice' as const, invoiceCode, category: null };
  }

  const category = getCategoryFromPath(pathname);

  if (category !== null) {
    return { page: 'products' as const, invoiceCode: null, category };
  }

  const categoryFilter = getCategoryFilterFromPath(pathname);

  if (categoryFilter !== null) {
    return { page: 'category-filter' as const, invoiceCode: null, category: categoryFilter };
  }

  if (/^\/login\/?$/.test(pathname)) {
    return { page: 'login' as const, invoiceCode: null, category: null };
  }

  if (/^\/register\/?$/.test(pathname)) {
    return { page: 'register' as const, invoiceCode: null, category: null };
  }

  if (/^\/catalog\/?$/.test(pathname)) {
    return { page: 'catalog' as const, invoiceCode: null, category: null };
  }

  if (/^\/dashboard\/?$/.test(pathname)) {
    return { page: 'dashboard' as const, invoiceCode: null, category: null };
  }

  if (/^\/transaksi\/?$/.test(pathname)) {
    return { page: 'transaksi' as const, invoiceCode: null, category: null };
  }

  if (/^\/admin\/?$/.test(pathname)) {
    return { page: 'admin' as const, invoiceCode: null, category: null };
  }

  if (/^\/admin\/vouchers\/?$/.test(pathname)) {
    return { page: 'admin-vouchers' as const, invoiceCode: null, category: null };
  }

  return { page: 'landing' as const, invoiceCode: null, category: null };
}

function App() {
  const [route, setRoute] = useState(() => getRouteFromPath(window.location.pathname));

  useEffect(() => {
    const syncRoute = () => setRoute(getRouteFromPath(window.location.pathname));

    window.addEventListener('popstate', syncRoute);
    window.addEventListener('bayarku:navigate', syncRoute);
    return () => {
      window.removeEventListener('popstate', syncRoute);
      window.removeEventListener('bayarku:navigate', syncRoute);
    };
  }, []);

  const handleCategoryClick = (category: string) => {
    const path = `/products/${encodeURIComponent(category)}`;
    window.history.pushState({}, '', path);
    window.dispatchEvent(new Event('bayarku:navigate'));
  };

  const handleBackToHome = () => {
    window.history.pushState({}, '', '/');
    window.dispatchEvent(new Event('bayarku:navigate'));
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <Header />
      {route.page === 'login' ? (
        <LoginPage onNavigate={(path) => {
          window.history.pushState({}, '', path);
          window.dispatchEvent(new Event('bayarku:navigate'));
        }} />
      ) : route.page === 'register' ? (
        <RegisterPage onNavigate={(path) => {
          window.history.pushState({}, '', path);
          window.dispatchEvent(new Event('bayarku:navigate'));
        }} />
      ) : route.page === 'transaksi' ? (
        <TransaksiPage onNavigate={(path) => {
          window.history.pushState({}, '', path);
          window.dispatchEvent(new Event('bayarku:navigate'));
        }} />
      ) : route.page === 'invoice' ? (
        <InvoiceStatusPage invoiceCode={route.invoiceCode} />
      ) : route.page === 'dashboard' ? (
        <AuthDashboard />
      ) : route.page === 'admin' ? (
        <AdminDashboard />
      ) : route.page === 'admin-vouchers' ? (
        <VoucherManagement />
      ) : route.page === 'products' ? (
        <ProductList category={route.category!} onBack={handleBackToHome} />
      ) : route.page === 'category-filter' ? (
        <ProductCatalog initialCategory={route.category!} />
      ) : route.page === 'catalog' ? (
        <ProductCatalog />
      ) : (
        <main>
          <Hero />
          <PromoCarousel />
          <Categories onCategoryClick={handleCategoryClick} />
          <HotDeals />
          <Stats />
          <Features />
        </main>
      )}
      <Footer />
    </div>
  );
}

export default App;
