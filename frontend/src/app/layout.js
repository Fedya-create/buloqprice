import './globals.css';
import { Toaster } from 'react-hot-toast';

export const metadata = {
  title: 'BuloqPrice - Dorilar B2B Platformasi',
  description: 'Dorixonalar va distribyutorlar uchun yagona dori narxlarini solishtirish va buyurtma berish platformasi',
};

export default function RootLayout({ children }) {
  return (
    <html lang="uz">
      <body>
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
