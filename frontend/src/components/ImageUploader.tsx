import { useRef } from 'react'
import { Plus, X, ImageIcon } from 'lucide-react'
import type { ImageRecord } from './Settings'

export interface PendingFile {
  file: File
  preview: string
}

interface Props {
  existingImages: ImageRecord[]
  pendingFiles: PendingFile[]
  deletedImageIds: string[]
  onAddFiles: (files: File[]) => void
  onRemoveExisting: (imageId: string) => void
  onRemovePending: (index: number) => void
  maxImages?: number
  label?: string
}

export default function ImageUploader({
  existingImages,
  pendingFiles,
  deletedImageIds,
  onAddFiles,
  onRemoveExisting,
  onRemovePending,
  maxImages = 10,
  label,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  const visibleExisting = existingImages.filter((img) => !deletedImageIds.includes(img.id))
  const totalCount = visibleExisting.length + pendingFiles.length
  const canAdd = totalCount < maxImages

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    const allowed = files.filter((f) =>
      ['image/jpeg', 'image/png', 'image/webp', 'image/heic'].includes(f.type)
    )
    const space = maxImages - totalCount
    onAddFiles(allowed.slice(0, space))
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-neutral-700 mb-2">{label}</label>
      )}

      <div className="flex flex-wrap gap-2">
        {/* Existing images */}
        {visibleExisting.map((img) => (
          <div key={img.id} className="relative w-20 h-20 rounded-xl overflow-hidden group">
            <img src={img.url} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => onRemoveExisting(img.id)}
              className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}

        {/* Pending (new) files */}
        {pendingFiles.map((pf, i) => (
          <div key={`pending-${i}`} className="relative w-20 h-20 rounded-xl overflow-hidden group">
            <img src={pf.preview} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-emerald-500/10 pointer-events-none" />
            <button
              type="button"
              onClick={() => onRemovePending(i)}
              className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}

        {/* Add button */}
        {canAdd && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="w-20 h-20 rounded-xl border-2 border-dashed border-neutral-200 hover:border-neutral-400 flex flex-col items-center justify-center gap-1 text-neutral-400 hover:text-neutral-600 transition-colors"
          >
            {totalCount === 0 ? (
              <>
                <ImageIcon className="w-5 h-5" />
                <span className="text-[10px]">הוסף</span>
              </>
            ) : (
              <Plus className="w-5 h-5" />
            )}
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />

      {totalCount > 0 && (
        <p className="text-[11px] text-neutral-400 mt-1">
          {totalCount}/{maxImages} תמונות
        </p>
      )}
    </div>
  )
}
