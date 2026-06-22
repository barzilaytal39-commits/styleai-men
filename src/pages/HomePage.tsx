import { Shirt, Sparkles, TrendingUp } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card, CardContent } from '@/components/ui/card'
import { useAuthStore } from '@/store/authStore'

const statsCards = [
  { label: 'Wardrobe Items', value: '0', icon: Shirt, color: 'text-blue-500' },
  { label: 'Saved Outfits', value: '0', icon: Sparkles, color: 'text-purple-500' },
  { label: 'Style Score', value: '—', icon: TrendingUp, color: 'text-green-500' },
] as const

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export function HomePage() {
  const { profile, user } = useAuthStore()
  const firstName = profile?.full_name?.split(' ')[0] ?? user?.email?.split('@')[0] ?? 'there'

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Greeting */}
        <div>
          <p className="text-sm text-muted-foreground">{getGreeting()}</p>
          <h2 className="text-2xl font-bold tracking-tight">{firstName}</h2>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {statsCards.map(({ label, value, icon: Icon, color }) => (
            <Card key={label} className="overflow-hidden">
              <CardContent className="flex flex-col items-center gap-2 p-4 text-center">
                <Icon className={`h-5 w-5 ${color}`} />
                <span className="text-2xl font-bold">{value}</span>
                <span className="text-[10px] leading-tight text-muted-foreground">{label}</span>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Today's section placeholder */}
        <section>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Today&apos;s Pick
          </h3>
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Sparkles className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">No outfit suggested yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Add items to your wardrobe to get started
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Recent activity placeholder */}
        <section>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Recent Activity
          </h3>
          <Card className="border-dashed">
            <CardContent className="py-8 text-center">
              <p className="text-sm text-muted-foreground">No recent activity</p>
            </CardContent>
          </Card>
        </section>
      </div>
    </AppLayout>
  )
}
