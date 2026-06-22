import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Camera, Pencil, Check, X, Sparkles, ChevronRight, Settings } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { useProfile } from '@/hooks/useProfile'
import { useToast } from '@/components/ui/toaster'
import { profileSchema, type ProfileFormData } from '@/lib/validations'
import { getInitials, formatDate } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { t } from '@/i18n'

const STYLE_PREFERENCES = [
  'Casual', 'Business', 'Streetwear', 'Formal', 'Athleisure',
  'Minimalist', 'Vintage', 'Smart Casual', 'Preppy', 'Techwear',
]

export function ProfilePage() {
  const [isEditing, setIsEditing] = useState(false)
  const [selectedStyles, setSelectedStyles] = useState<string[]>([])
  const { profile, isUpdating, fetchProfile, updateProfile, uploadAvatar } = useProfile()
  const { user } = useAuthStore()
  const { toast } = useToast()

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  useEffect(() => {
    if (profile?.style_preferences) {
      setSelectedStyles(profile.style_preferences)
    }
  }, [profile])

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    values: {
      fullName: profile?.full_name ?? '',
      username: profile?.username ?? '',
      bio: profile?.bio ?? '',
      heightCm: profile?.height_cm ?? undefined,
      weightKg: profile?.weight_kg ?? undefined,
    },
  })

  const onSubmit = async (data: ProfileFormData) => {
    const { error } = await updateProfile({
      full_name: data.fullName,
      username: data.username || null,
      bio: data.bio || null,
      height_cm: data.heightCm ?? null,
      weight_kg: data.weightKg ?? null,
      style_preferences: selectedStyles,
    })

    if (error) {
      toast({ title: t.profile.updateFailed, description: error.message, variant: 'destructive' })
    } else {
      toast({ title: t.profile.updated })
      setIsEditing(false)
    }
  }

  const onCancel = () => {
    reset()
    setSelectedStyles(profile?.style_preferences ?? [])
    setIsEditing(false)
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const { error } = await uploadAvatar(file)
    if (error) {
      toast({ title: t.profile.uploadFailed, description: error.message, variant: 'destructive' })
    } else {
      toast({ title: t.profile.avatarUpdated })
    }
  }

  const toggleStyle = (style: string) => {
    setSelectedStyles((prev) =>
      prev.includes(style) ? prev.filter((s) => s !== style) : [...prev, style]
    )
  }

  return (
    <AppLayout title={t.profile.title}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Settings entry */}
        <div className="flex justify-end">
          <Link
            to="/settings"
            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <Settings className="h-4 w-4" />
            {t.profile.settings}
          </Link>
        </div>

        {/* Avatar section */}
        <div className="flex flex-col items-center gap-3 py-4">
          <div className="relative">
            <Avatar className="h-24 w-24 ring-4 ring-background shadow-md">
              <AvatarImage src={profile?.avatar_url ?? undefined} alt={profile?.full_name ?? 'User'} />
              <AvatarFallback className="text-2xl">
                {getInitials(profile?.full_name)}
              </AvatarFallback>
            </Avatar>
            {isEditing && (
              <label
                htmlFor="avatar-upload"
                className="absolute -bottom-1 -right-1 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-foreground text-background shadow-sm hover:bg-foreground/90"
              >
                <Camera className="h-3.5 w-3.5" />
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </label>
            )}
          </div>
          {!isEditing && (
            <div className="text-center">
              <p className="font-semibold">{profile?.full_name ?? 'Your Name'}</p>
              {profile?.username && (
                <p className="text-sm text-muted-foreground">@{profile.username}</p>
              )}
              {user?.email && (
                <p className="text-xs text-muted-foreground mt-0.5">{user.email}</p>
              )}
            </div>
          )}
        </div>

        {/* Edit / Save actions */}
        <div className="flex justify-end gap-2">
          {isEditing ? (
            <>
              <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
                <X className="h-4 w-4 me-1" /> {t.common.cancel}
              </Button>
              <Button type="submit" size="sm" isLoading={isUpdating}>
                <Check className="h-4 w-4 me-1" /> {t.common.save}
              </Button>
            </>
          ) : (
            <Button type="button" variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              <Pencil className="h-4 w-4 me-1" /> {t.profile.editProfile}
            </Button>
          )}
        </div>

        {/* Style DNA entry point */}
        <Link
          to="/style-profile"
          className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-sm transition-colors hover:bg-accent/40"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-foreground text-background">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{t.profile.styleDna}</p>
            <p className="text-xs text-muted-foreground">{t.profile.styleDnaHint}</p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        </Link>

        {/* Basic info */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              {t.profile.basicInfo}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="fullName">{t.profile.fullName}</Label>
              {isEditing ? (
                <Input id="fullName" error={errors.fullName?.message} {...register('fullName')} />
              ) : (
                <p className="text-sm py-1">{profile?.full_name || '—'}</p>
              )}
            </div>
            <Separator />
            <div className="space-y-1.5">
              <Label htmlFor="username">{t.profile.username}</Label>
              {isEditing ? (
                <Input
                  id="username"
                  placeholder="your_handle"
                  error={errors.username?.message}
                  {...register('username')}
                />
              ) : (
                <p className="text-sm py-1">{profile?.username ? `@${profile.username}` : '—'}</p>
              )}
            </div>
            <Separator />
            <div className="space-y-1.5">
              <Label htmlFor="bio">{t.profile.bio}</Label>
              {isEditing ? (
                <Input
                  id="bio"
                  placeholder="A short bio..."
                  error={errors.bio?.message}
                  {...register('bio')}
                />
              ) : (
                <p className="text-sm py-1">{profile?.bio || '—'}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Physical details */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              {t.profile.physical}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="heightCm">{t.profile.heightCm}</Label>
                {isEditing ? (
                  <Input
                    id="heightCm"
                    type="number"
                    placeholder="175"
                    error={errors.heightCm?.message}
                    {...register('heightCm', { valueAsNumber: true })}
                  />
                ) : (
                  <p className="text-sm py-1">{profile?.height_cm ? `${profile.height_cm} cm` : '—'}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="weightKg">{t.profile.weightKg}</Label>
                {isEditing ? (
                  <Input
                    id="weightKg"
                    type="number"
                    placeholder="75"
                    error={errors.weightKg?.message}
                    {...register('weightKg', { valueAsNumber: true })}
                  />
                ) : (
                  <p className="text-sm py-1">{profile?.weight_kg ? `${profile.weight_kg} kg` : '—'}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Style preferences */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              {t.profile.stylePrefs}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {STYLE_PREFERENCES.map((style) => {
                const isSelected = selectedStyles.includes(style)
                return isEditing ? (
                  <button
                    key={style}
                    type="button"
                    onClick={() => toggleStyle(style)}
                    className="focus:outline-none"
                  >
                    <Badge variant={isSelected ? 'default' : 'outline'}>{style}</Badge>
                  </button>
                ) : isSelected ? (
                  <Badge key={style} variant="secondary">{style}</Badge>
                ) : null
              })}
              {!isEditing && selectedStyles.length === 0 && (
                <p className="text-sm text-muted-foreground">{t.profile.noPrefs}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Account info */}
        {!isEditing && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                {t.profile.account}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">{t.profile.email}</p>
                <p className="text-sm">{user?.email}</p>
              </div>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground">{t.profile.memberSince}</p>
                <p className="text-sm">{profile?.created_at ? formatDate(profile.created_at) : '—'}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </form>
    </AppLayout>
  )
}
