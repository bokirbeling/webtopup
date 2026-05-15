import { useEffect, useState } from 'react';

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

function getInvoiceCodeFromPath(pathname: string) {
  const match = /^\/invoice\/([^/]+)\/?$/.exec(pathname);

  return match ? decodeURIComponent(match[1]) : null;
}

function getRouteFromPath(pathname: string) {
  const invoiceCode = getInvoiceCodeFromPath(pathname);

  if (invoiceCode !== null) {
    return { page: 'invoice' as const, invoiceCode };
  }

  if (/^\/dashboard\/?$/.test(pathname)) {
    return { page: 'dashboard' as const, invoiceCode: null };
  }

  if (/^\/admin\/?$/.test(pathname)) {
    return { page: 'admin' as const, invoiceCode: null };
  }

  return { page: 'landing' as const, invoiceCode: null };
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

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <Header />
      {route.page === 'invoice' ? (
        <InvoiceStatusPage invoiceCode={route.invoiceCode} />
      ) : route.page === 'dashboard' ? (
        <AuthDashboard />
      ) : route.page === 'admin' ? (
        <AdminDashboard />
      ) : (
        <main>
          <Hero />
          <PromoCarousel />
          <Categories />
          <HotDeals />
          <GameTopUp />
          <Stats />
          <Features />
        </main>
      )}
      <Footer />
    </div>
  );
}

export default App;
