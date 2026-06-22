import type { ReactNode } from 'react'
import { Header } from './Header'
import { BottomNav } from './BottomNav'

interface AppLayoutProps {
  children: ReactNode
  title?: string
  hideHeader?: boolean
}

export function AppLayout({ children, title, hideHeader = false }: AppLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {!hideHeader && <Header title={title} />}
      <main className="mx-auto w-full max-w-md flex-1 px-4 pb-20 pt-4">{children}</main>
      <BottomNav />
    </div>
  )
}
