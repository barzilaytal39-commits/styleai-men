import { useRef } from 'react'
import { Camera, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { t } from '@/i18n'

interface ImageUploadProps {
  preview: string | null
  onChange: (file: File) => void
  onClear: () => void
  disabled?: boolean
}

export function ImageUpload({ preview, onChange, onClear, disabled }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) onChange(file)
    e.target.value = ''
  }

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'relative mx-auto flex aspect-[4/3] w-full max-w-sm items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-input bg-muted/50 transition-colors',
          'hover:border-foreground/40 hover:bg-muted active:scale-[0.99]',
          disabled && 'pointer-events-none opacity-50'
        )}
      >
        {preview ? (
          <img src={preview} alt="Preview" className="h-full w-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-2.5 text-muted-foreground">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <Camera className="h-7 w-7" strokeWidth={1.5} />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">{t.itemForm.addPhoto}</p>
              <p className="text-xs">{t.itemForm.tapToChoose}</p>
            </div>
          </div>
        )}
      </button>

      {preview && (
        <button
          type="button"
          onClick={onClear}
          className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-background/90 shadow-sm backdrop-blur-sm hover:bg-background"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Remove photo</span>
        </button>
      )}

      {preview && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-background/90 px-3 py-1.5 text-xs font-medium shadow-sm backdrop-blur-sm hover:bg-background"
        >
          <Camera className="h-3.5 w-3.5" />
          {t.itemForm.change}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  )
}
