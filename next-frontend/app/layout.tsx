import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Adnanpay — Next.js Migration',
  description: 'Adnanpay Next.js App Router scaffold. Backend remains Express at /ppob-api.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
