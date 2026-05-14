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

function getInvoiceCodeFromPath(pathname: string) {
  const match = /^\/invoice\/([^/]+)\/?$/.exec(pathname);

  return match ? decodeURIComponent(match[1]) : null;
}

function App() {
  const invoiceCode = getInvoiceCodeFromPath(window.location.pathname);

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <Header />
      {invoiceCode ? (
        <InvoiceStatusPage invoiceCode={invoiceCode} />
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
