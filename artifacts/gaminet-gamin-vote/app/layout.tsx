import type { Metadata } from 'next';
import { Nunito_Sans } from 'next/font/google';
import './globals.css';

const nunito = Nunito_Sans({
  variable: '--font-nunito',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://gaminetgamin.ca'),
  title: 'Vote collection | Gaminet Gamin',
  description: 'Découvrez les nouveaux vêtements Gaminet Gamin et votez pour vos coups de cœur.',
  openGraph: {
    title: 'Votez pour la prochaine collection Gaminet Gamin',
    description: 'Des dessins d’enfants, des vêtements pleins de caractère — choisissez vos favoris.',
    images: ['/opengraph.jpg'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Votez pour la prochaine collection Gaminet Gamin',
    description: 'Choisissez les vêtements que vous aimeriez voir dans la prochaine collection.',
    images: ['/opengraph.jpg'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body className={`${nunito.variable} antialiased`}>{children}</body>
    </html>
  );
}
