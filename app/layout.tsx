import { publicLaunch, siteOrigin } from '../lib/site-config';
import type { Metadata } from 'next';
export function generateMetadata(): Metadata { return { metadataBase: new URL(siteOrigin()), title: 'Mercury — Your next game starts here', description: 'Find sports tournaments, leagues and camps around Mumbai. Check the details and register with the organizer.', robots: { index: publicLaunch(), follow: publicLaunch() }, openGraph: { title: 'Mercury — Your next game starts here', description: 'More playing. Less planning. Discover events around Mumbai.', images: ['/opengraph-image'], type: 'website' }, icons: { icon: '/assets/mercury-icon.png', apple: '/assets/mercury-icon.png' } }; }
export default function Layout({ children }: {
    children: React.ReactNode;
}) { return <html lang="en"><head><link rel="stylesheet" href="/styles.css"/><link rel="preconnect" href="https://fonts.googleapis.com"/><link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/><link href="https://fonts.googleapis.com/css2?family=Archivo:ital,wght@1,700;1,800;1,900&family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet"/></head><body>{children}</body></html>; }
