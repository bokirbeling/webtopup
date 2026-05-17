'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import InvoiceStatus from '@/components/InvoiceStatus';

function InvoiceContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get('code') ?? 'INV-TEST-0001';
  
  return <InvoiceStatus invoiceCode={code} />;
}

export default function InvoicePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-100 flex items-center justify-center"><p>Loading...</p></div>}>
      <InvoiceContent />
    </Suspense>
  );
}
