import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Shirt } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { ItemForm } from '@/components/wardrobe/ItemForm'
import { Button } from '@/components/ui/button'
import { useWardrobe } from '@/hooks/useWardrobe'
import { useToast } from '@/components/ui/toaster'
import { t } from '@/i18n'
import type { WardrobeItemFormData } from '@/lib/validations'

export function WardrobeEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { items, isLoaded, fetchItems, editItem } = useWardrobe()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!isLoaded) {
      void fetchItems()
    }
  }, [isLoaded, fetchItems])

  const item = items.find((i) => i.id === id)

  if (!isLoaded) {
    return (
      <AppLayout hideHeader>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
        </div>
      </AppLayout>
    )
  }

  if (!item) {
    return (
      <AppLayout hideHeader>
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
          <Shirt className="h-12 w-12 text-muted-foreground" strokeWidth={1.25} />
          <div>
            <p className="font-semibold">{t.wardrobe.notFound}</p>
            <p className="text-sm text-muted-foreground">{t.wardrobe.notFoundHint}</p>
          </div>
          <Button variant="outline" onClick={() => navigate('/wardrobe')}>
            {t.wardrobe.backToWardrobe}
          </Button>
        </div>
      </AppLayout>
    )
  }

  const handleSubmit = async (
    data: WardrobeItemFormData,
    colors: string[],
    imageFile?: File
  ) => {
    setIsSubmitting(true)
    const { error } = await editItem(
      item.id,
      {
        name: data.name,
        category: data.category,
        subcategory: data.subcategory || null,
        brand: data.brand || null,
        size: data.size || null,
        notes: data.notes || null,
        color: colors,
        image_url: item.image_url,
      },
      imageFile
    )
    setIsSubmitting(false)

    if (error) {
      toast({ title: t.profile.updateFailed, description: error.message, variant: 'destructive' })
    } else {
      toast({ title: t.common.savedSuccess })
      navigate(`/wardrobe/${item.id}`)
    }
  }

  return (
    <AppLayout hideHeader>
      {/* Custom header */}
      <div className="sticky top-0 z-30 -mx-4 bg-background/95 backdrop-blur pb-3 pt-4 px-4 supports-[backdrop-filter]:bg-background/80">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-foreground hover:bg-muted/80 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">{t.common.back}</span>
          </button>
          <div>
            <h1 className="text-lg font-semibold">{t.wardrobe.editItem}</h1>
            <p className="text-xs text-muted-foreground">{item.name}</p>
          </div>
        </div>
      </div>

      <div className="pt-4 pb-6">
        <ItemForm
          defaultValues={{
            name: item.name,
            category: item.category,
            subcategory: item.subcategory ?? '',
            brand: item.brand ?? '',
            size: item.size ?? '',
            notes: item.notes ?? '',
            color: item.color,
          }}
          defaultImageUrl={item.image_url}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          submitLabel={t.itemForm.saveChanges}
        />
      </div>
    </AppLayout>
  )
}
