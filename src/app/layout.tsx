import type { Metadata } from 'next';
import './globals.css';
import { ToastProvider } from '@/hooks/useToast';
import { ServiceWorkerRegistrar } from '@/components/ServiceWorkerRegistrar';

export const metadata: Metadata = {
  title: 'BabyPOS',
  description: 'Sistem Kasir & Inventaris UMKM',
  manifest: '/manifest.json',
  themeColor: '#4f46e5',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="BabyPOS" />
      </head>
      <body>
        <ToastProvider>
          {children}
        </ToastProvider>
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
