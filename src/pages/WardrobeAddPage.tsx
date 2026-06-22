import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { ItemForm } from '@/components/wardrobe/ItemForm'
import { useWardrobe } from '@/hooks/useWardrobe'
import { useToast } from '@/components/ui/toaster'
import { t } from '@/i18n'
import type { WardrobeItemFormData } from '@/lib/validations'

export function WardrobeAddPage() {
  const navigate = useNavigate()
  const { createItem } = useWardrobe()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (
    data: WardrobeItemFormData,
    colors: string[],
    imageFile?: File
  ) => {
    setIsSubmitting(true)
    const { error } = await createItem(
      {
        name: data.name,
        category: data.category,
        subcategory: data.subcategory || null,
        brand: data.brand || null,
        size: data.size || null,
        notes: data.notes || null,
        color: colors,
      },
      imageFile
    )
    setIsSubmitting(false)

    if (error) {
      toast({ title: t.styleDna.saveFailed, description: error.message, variant: 'destructive' })
    } else {
      toast({ title: t.common.savedSuccess, description: data.name })
      navigate('/wardrobe')
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
          <h1 className="text-lg font-semibold">{t.wardrobe.addItem}</h1>
        </div>
      </div>

      <div className="pt-4 pb-6">
        <ItemForm
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          submitLabel={t.itemForm.addToWardrobe}
        />
      </div>
    </AppLayout>
  )
}
