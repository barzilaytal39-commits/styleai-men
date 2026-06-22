// Client-side image normalization for wardrobe uploads (Phase 3C-1).
//
// Converts any browser-decodable image to WebP before upload, so Storage
// only ever holds formats the AI analyzer (and most consumers) accept.
// Formats the browser cannot decode (e.g. HEIC off iOS, AVIF on browsers
// without AVIF support) throw ImageConversionError, which the caller shows
// to the user.

const WEBP_QUALITY = 0.9

const UNSUPPORTED_MESSAGE =
  'Unsupported image format. Please upload JPG, PNG, or WEBP.'

export class ImageConversionError extends Error {
  constructor(message = UNSUPPORTED_MESSAGE) {
    super(message)
    this.name = 'ImageConversionError'
  }
}

/**
 * Decode `file` and re-encode it as a WebP File named `<original>.webp`.
 * Throws {@link ImageConversionError} if the image can't be decoded or
 * encoded (the caller surfaces the message to the user).
 */
export async function normalizeToWebp(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) {
    throw new ImageConversionError()
  }

  // Decode — throws for formats the browser can't read.
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new ImageConversionError()
  }

  try {
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new ImageConversionError()
    ctx.drawImage(bitmap, 0, 0)

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/webp', WEBP_QUALITY),
    )
    if (!blob) throw new ImageConversionError()

    const baseName = file.name.replace(/\.[^./\\]+$/, '') || 'image'
    return new File([blob], `${baseName}.webp`, { type: 'image/webp' })
  } finally {
    bitmap.close()
  }
}
