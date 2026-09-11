import type { Metadata } from 'next';
import { Montserrat, Syne, Work_Sans } from 'next/font/google';
import '../styles/globals.css';
import '../styles/layout.css';
import '../styles/components.css';
import '../styles/pages.css';

const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-montserrat',
  weight: ['500', '600', '700', '800'],
  display: 'swap',
});

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-syne',
  weight: ['500', '600', '700'],
  display: 'swap',
});

const workSans = Work_Sans({
  subsets: ['latin'],
  variable: '--font-work-sans',
  weight: ['400', '500', '600'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Innov8IT Payroll System',
  description: 'Enterprise payroll and human resources management platform for Innov8IT',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${montserrat.variable} ${syne.variable} ${workSans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
