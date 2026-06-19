import type { Metadata } from 'next';
import './globals.css';
import { ToastProvider } from '@/hooks/useToast';

export const metadata: Metadata = {
  title: 'BabyPOS',
  description: 'Sistem Kasir & Inventaris UMKM',
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
      </head>
      <body>
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
