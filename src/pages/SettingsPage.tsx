import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, LogOut, Shield, Bell, Moon, Trash2, Sparkles } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ui/toaster'
import { t } from '@/i18n'

interface SettingRowProps {
  icon: React.ComponentType<{ className?: string }>
  label: string
  description?: string
  onClick?: () => void
  destructive?: boolean
}

function SettingRow({ icon: Icon, label, description, onClick, destructive }: SettingRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 py-3 text-left transition-colors hover:bg-muted/50 -mx-2 px-2 rounded-md"
    >
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${destructive ? 'bg-destructive/10' : 'bg-muted'}`}>
        <Icon className={`h-4 w-4 ${destructive ? 'text-destructive' : 'text-foreground'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${destructive ? 'text-destructive' : 'text-foreground'}`}>
          {label}
        </p>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
    </button>
  )
}

export function SettingsPage() {
  const { signOut, isLoading } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false)

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch {
      toast({ title: t.settings.error, description: t.settings.signOutError, variant: 'destructive' })
    }
  }

  return (
    <AppLayout title={t.settings.title}>
      <div className="space-y-6">
        {/* Personalization */}
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t.settings.personalization}
          </h3>
          <Card>
            <CardContent className="px-4 py-1">
              <SettingRow
                icon={Sparkles}
                label={t.settings.styleDna}
                description={t.settings.styleDnaDesc}
                onClick={() => navigate('/style-profile')}
              />
            </CardContent>
          </Card>
        </section>

        {/* Account */}
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t.settings.account}
          </h3>
          <Card>
            <CardContent className="px-4 py-1">
              <SettingRow
                icon={Shield}
                label={t.settings.changePassword}
                description={t.settings.changePasswordDesc}
                onClick={() => toast({ title: t.common.comingSoon })}
              />
              <Separator />
              <SettingRow
                icon={Bell}
                label={t.settings.notifications}
                description={t.settings.notificationsDesc}
                onClick={() => toast({ title: t.common.comingSoon })}
              />
            </CardContent>
          </Card>
        </section>

        {/* Appearance */}
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t.settings.appearance}
          </h3>
          <Card>
            <CardContent className="px-4 py-1">
              <SettingRow
                icon={Moon}
                label={t.settings.darkMode}
                description={t.common.comingSoon}
                onClick={() => toast({ title: t.common.comingSoon })}
              />
            </CardContent>
          </Card>
        </section>

        {/* Danger zone */}
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t.settings.dangerZone}
          </h3>
          <Card>
            <CardContent className="px-4 py-1">
              <SettingRow
                icon={Trash2}
                label={t.settings.deleteAccount}
                description={t.settings.deleteAccountDesc}
                destructive
                onClick={() => toast({ title: t.settings.contactSupport, description: t.settings.deleteEmail })}
              />
            </CardContent>
          </Card>
        </section>

        {/* Sign out */}
        {showSignOutConfirm ? (
          <Card className="border-destructive/30">
            <CardContent className="p-4">
              <p className="text-sm font-medium mb-3">{t.settings.signOutConfirm}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => setShowSignOutConfirm(false)}>
                  {t.common.cancel}
                </Button>
                <Button variant="destructive" size="sm" className="flex-1" onClick={handleSignOut} isLoading={isLoading}>
                  {t.settings.signOut}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Button
            variant="outline"
            className="w-full text-destructive border-destructive/30 hover:bg-destructive/5 hover:text-destructive"
            onClick={() => setShowSignOutConfirm(true)}
          >
            <LogOut className="h-4 w-4 me-2" />
            {t.settings.signOut}
          </Button>
        )}

        <p className="text-center text-xs text-muted-foreground pb-2">
          StyleAI Men v0.1.0
        </p>
      </div>
    </AppLayout>
  )
}
