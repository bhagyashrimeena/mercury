import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Mercury — Your next game starts here', description: 'Discover local sports sessions, find your people and make more time to play.', robots: { index: false, follow: false }, icons: { icon: '/assets/mark.svg' } };
export default function Layout({ children }: {
    children: React.ReactNode;
}) { return <html lang="en"><head><link rel="stylesheet" href="/styles.css"/><link rel="preconnect" href="https://fonts.googleapis.com"/><link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/><link href="https://fonts.googleapis.com/css2?family=Archivo:ital,wght@1,700;1,800;1,900&family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet"/></head><body>{children}</body></html>; }
