import type {Metadata} from 'next';
import './globals.css';
import { Providers } from '@/components/Providers';
import { AppSidebar } from '@/components/AppSidebar';

export const metadata: Metadata = {
  title: 'FinPlan Pro',
  description: 'Sistema completo de planejamento financeiro',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <Providers>
          <div className="flex min-h-screen w-full">
            <AppSidebar />
            <main className="flex-1 overflow-auto bg-background">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
