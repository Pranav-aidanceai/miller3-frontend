// app/providers.tsx
'use client'

import { Provider } from 'react-redux'
import { PersistGate } from 'redux-persist/integration/react'
import { store, persistor } from '@/store/store'
import { SessionGuard } from '@/components/SessionGuard'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <SessionGuard />
        {children}
      </PersistGate>
    </Provider>
  )
}