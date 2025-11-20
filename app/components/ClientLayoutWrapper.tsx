'use client';

import { SessionProvider } from 'next-auth/react';
import ClientLayout from './ClientLayout';
import { CurrencyProvider } from '@/app/contexts/CurrencyContext';
import { WeightLabelProvider } from '@/app/contexts/WeightLabelContext';

export default function ClientLayoutWrapper({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <CurrencyProvider>
        <WeightLabelProvider>
          <ClientLayout>{children}</ClientLayout>
        </WeightLabelProvider>
      </CurrencyProvider>
    </SessionProvider>
  );
}
