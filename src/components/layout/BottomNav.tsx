import { NavLink } from 'react-router-dom'
import { Home, Shirt, Sparkles, ScanLine, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { t } from '@/i18n'

const navItems = [
  { href: '/', label: t.nav.home, icon: Home },
  { href: '/wardrobe', label: t.nav.wardrobe, icon: Shirt },
  { href: '/outfits', label: t.nav.outfits, icon: Sparkles },
  { href: '/fit-check', label: t.nav.fitCheck, icon: ScanLine },
  { href: '/profile', label: t.nav.profile, icon: User },
] as const

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-md items-center justify-around px-2 pb-safe">
        {navItems.map(({ href, label, icon: Icon }) => (
          <NavLink
            key={href}
            to={href}
            end={href === '/'}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-1 rounded-lg px-2 py-2 text-xs font-medium transition-colors',
                'min-w-[52px]',
                isActive
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  className={cn('h-5 w-5 transition-all', isActive && 'scale-110')}
                  strokeWidth={isActive ? 2.5 : 1.75}
                />
                <span className="whitespace-nowrap text-[11px]">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
