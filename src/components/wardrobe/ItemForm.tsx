import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ImageUpload } from '@/components/wardrobe/ImageUpload'
import { CATEGORIES, SUBCATEGORIES, SIZES_BY_CATEGORY, COLORS } from '@/lib/wardrobe-constants'
import { wardrobeItemSchema, type WardrobeItemFormData } from '@/lib/validations'
import { normalizeToWebp, ImageConversionError } from '@/lib/image'
import { useToast } from '@/components/ui/toaster'
import { cn } from '@/lib/utils'
import { t, categoryLabel, subcategoryLabel, colorLabel } from '@/i18n'
import type { WardrobeCategory } from '@/types'

interface ItemFormProps {
  defaultValues?: Partial<WardrobeItemFormData & { color: string[] }>
  defaultImageUrl?: string | null
  onSubmit: (data: WardrobeItemFormData, colors: string[], imageFile?: File) => Promise<void>
  isSubmitting: boolean
  submitLabel?: string
}

export function ItemForm({
  defaultValues,
  defaultImageUrl,
  onSubmit,
  isSubmitting,
  submitLabel = 'Save',
}: ItemFormProps) {
  const [imageFile, setImageFile] = useState<File | undefined>()
  const [imagePreview, setImagePreview] = useState<string | null>(defaultImageUrl ?? null)
  const [isConverting, setIsConverting] = useState(false)
  const [selectedColors, setSelectedColors] = useState<string[]>(defaultValues?.color ?? [])
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<WardrobeItemFormData>({
    resolver: zodResolver(wardrobeItemSchema),
    defaultValues: {
      name: defaultValues?.name ?? '',
      category: defaultValues?.category ?? '',
      subcategory: defaultValues?.subcategory ?? '',
      brand: defaultValues?.brand ?? '',
      size: defaultValues?.size ?? '',
      notes: defaultValues?.notes ?? '',
    },
  })

  const watchedCategory = watch('category') as WardrobeCategory | ''

  useEffect(() => {
    setValue('subcategory', '')
    setValue('size', '')
  }, [watchedCategory, setValue])

  const handleImageChange = async (file: File) => {
    setIsConverting(true)
    try {
      // Normalize every selected image to WebP before upload.
      const webp = await normalizeToWebp(file)
      setImageFile(webp)
      setImagePreview((prev) => {
        if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev)
        return URL.createObjectURL(webp)
      })
    } catch (err) {
      const message =
        err instanceof ImageConversionError ? err.message : t.itemForm.unsupportedImage
      toast({ title: t.itemForm.imageNotSupported, description: message, variant: 'destructive' })
    } finally {
      setIsConverting(false)
    }
  }

  const handleImageClear = () => {
    setImageFile(undefined)
    setImagePreview((prev) => {
      if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev)
      return null
    })
  }

  const toggleColor = (colorName: string) => {
    setSelectedColors((prev) =>
      prev.includes(colorName) ? prev.filter((c) => c !== colorName) : [...prev, colorName]
    )
  }

  const subcategoryOptions = watchedCategory ? SUBCATEGORIES[watchedCategory] : []
  const sizeOptions = watchedCategory ? SIZES_BY_CATEGORY[watchedCategory] : []

  const handleFormSubmit = async (data: WardrobeItemFormData) => {
    await onSubmit(data, selectedColors, imageFile)
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Image */}
      <ImageUpload
        preview={imagePreview}
        onChange={handleImageChange}
        onClear={handleImageClear}
        disabled={isSubmitting || isConverting}
      />

      {/* Basic details */}
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">
            {t.itemForm.name} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            placeholder={t.itemForm.namePlaceholder}
            error={errors.name?.message}
            {...register('name')}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Category */}
          <div className="space-y-1.5">
            <Label htmlFor="category">
              {t.itemForm.category} <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <select
                id="category"
                className={cn(
                  'h-9 w-full appearance-none rounded-md border border-input bg-transparent px-3 py-1 pr-8 text-sm shadow-sm',
                  'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                  errors.category && 'border-destructive'
                )}
                {...register('category')}
              >
                <option value="">{t.itemForm.select}</option>
                {CATEGORIES.map(({ id }) => (
                  <option key={id} value={id}>
                    {categoryLabel(id)}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                ▾
              </span>
            </div>
            {errors.category && (
              <p className="text-xs text-destructive">{errors.category.message}</p>
            )}
          </div>

          {/* Subcategory */}
          <div className="space-y-1.5">
            <Label htmlFor="subcategory">{t.itemForm.type}</Label>
            <div className="relative">
              <select
                id="subcategory"
                disabled={!watchedCategory || subcategoryOptions.length === 0}
                className="h-9 w-full appearance-none rounded-md border border-input bg-transparent px-3 py-1 pr-8 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                {...register('subcategory')}
              >
                <option value="">{t.itemForm.any}</option>
                {subcategoryOptions.map((sub) => (
                  <option key={sub} value={sub}>
                    {subcategoryLabel(sub)}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                ▾
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Brand */}
          <div className="space-y-1.5">
            <Label htmlFor="brand">{t.itemForm.brand}</Label>
            <Input id="brand" placeholder="לדוגמה: Ralph Lauren" {...register('brand')} />
          </div>

          {/* Size */}
          <div className="space-y-1.5">
            <Label htmlFor="size">{t.itemForm.size}</Label>
            <div className="relative">
              <select
                id="size"
                disabled={!watchedCategory || sizeOptions.length === 0}
                className="h-9 w-full appearance-none rounded-md border border-input bg-transparent px-3 py-1 pr-8 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                {...register('size')}
              >
                <option value="">—</option>
                {sizeOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                ▾
              </span>
            </div>
          </div>
        </div>

        {/* Color picker */}
        <div className="space-y-2">
          <Label>{t.itemForm.color}{selectedColors.length > 0 && ` (${selectedColors.length})`}</Label>
          <div className="flex flex-wrap gap-2">
            {COLORS.map(({ name, hex }) => {
              const isSelected = selectedColors.includes(name)
              return (
                <button
                  key={name}
                  type="button"
                  title={name}
                  onClick={() => toggleColor(name)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all',
                    isSelected
                      ? 'border-foreground bg-foreground text-background shadow-sm'
                      : 'border-border bg-background text-foreground hover:border-foreground/40'
                  )}
                >
                  <span
                    className="h-3 w-3 shrink-0 rounded-full border border-white/30 shadow-[0_0_0_1px_rgba(0,0,0,0.15)]"
                    style={{ backgroundColor: hex }}
                  />
                  {colorLabel(name)}
                </button>
              )
            })}
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <Label htmlFor="notes">{t.itemForm.notes}</Label>
          <Textarea
            id="notes"
            placeholder={t.itemForm.notesPlaceholder}
            error={errors.notes?.message}
            {...register('notes')}
          />
        </div>
      </div>

      {/* Submit */}
      <Button type="submit" className="w-full" isLoading={isSubmitting} disabled={isConverting}>
        {isSubmitting ? t.common.saving : isConverting ? t.itemForm.processingImage : submitLabel}
      </Button>
    </form>
  )
}
