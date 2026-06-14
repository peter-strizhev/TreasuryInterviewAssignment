import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'S.H.O.T — Smart Heuristic OCR and TTB Validator',
  description: 'S.H.O.T — Smart Heuristic OCR and TTB Validator for alcohol label compliance review',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
