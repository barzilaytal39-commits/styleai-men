import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface AuthLayoutProps {
  children: ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div className="mb-8 text-center">
        <Link to="/" className="inline-flex items-center gap-2">
          <span className="text-2xl font-bold tracking-tight">StyleAI</span>
          <span className="rounded-sm bg-foreground px-1.5 py-0.5 text-xs font-semibold uppercase text-background">
            Men
          </span>
        </Link>
        <p className="mt-1 text-sm text-muted-foreground">Your personal style assistant</p>
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  )
}
