import { Construction } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card, CardContent } from '@/components/ui/card'

interface PlaceholderPageProps {
  title: string
}

export function PlaceholderPage({ title }: PlaceholderPageProps) {
  return (
    <AppLayout title={title}>
      <Card className="border-dashed mt-8">
        <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <Construction className="h-7 w-7 text-muted-foreground" />
          </div>
          <div>
            <p className="font-semibold">{title} coming soon</p>
            <p className="mt-1 text-sm text-muted-foreground max-w-[200px]">
              This feature is under construction and will be available in the next update.
            </p>
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  )
}
