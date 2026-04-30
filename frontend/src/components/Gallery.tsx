import { useState, useEffect } from 'react'
import { X, ChevronRight, ChevronLeft, Users, DoorOpen } from 'lucide-react'

interface CompoundImage {
  id: string
  url: string
  sortOrder: number
}

interface Room {
  id: string
  name: string
  description?: string
  capacity?: number
  images?: CompoundImage[]
}

interface Compound {
  id: string
  name: string
  tagline?: string
  description?: string
  capacity: number
  weekdayPrice: string
  rooms: Room[]
  images?: CompoundImage[]
}

interface Props {
  compoundId: string | null
}

export default function Gallery({ compoundId }: Props) {
  const [compound, setCompound] = useState<Compound | null>(null)
  const [loading, setLoading] = useState(true)
  const [lightbox, setLightbox] = useState<number | null>(null)

  useEffect(() => {
    if (!compoundId) {
      setLoading(false)
      return
    }
    setLoading(true)
    fetch(`/api/compounds/${compoundId}`)
      .then((r) => r.json())
      .then((data) => setCompound(data))
      .catch(() => setCompound(null))
      .finally(() => setLoading(false))
  }, [compoundId])

  function getAllImages(): string[] {
    if (!compound) return []
    const yardImages = (compound.images || []).map((img) => img.url)
    const roomImages = (compound.rooms || []).flatMap((room) =>
      (room.images || []).map((img) => img.url)
    )
    return [...yardImages, ...roomImages]
  }

  const allImages = getAllImages()

  function closeLightbox() {
    setLightbox(null)
  }

  function prevImage() {
    if (lightbox === null) return
    setLightbox((lightbox - 1 + allImages.length) % allImages.length)
  }

  function nextImage() {
    if (lightbox === null) return
    setLightbox((lightbox + 1) % allImages.length)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-neutral-300 border-t-neutral-800 rounded-full animate-spin" />
      </div>
    )
  }

  if (!compound) {
    return (
      <div className="text-center py-20 text-neutral-400">
        <p className="text-lg">אין מתחם להצגה</p>
      </div>
    )
  }

  const yardImages = compound.images || []

  return (
    <>
      <div className="w-full max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header */}
        <div className="mb-3 sm:mb-5" dir="rtl">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-neutral-900">
            {compound.name}
          </h2>
          {compound.tagline && (
            <p className="text-neutral-500 text-sm mt-0.5">{compound.tagline}</p>
          )}
          <div className="flex items-center gap-3 sm:gap-4 mt-2 text-xs sm:text-sm text-neutral-400">
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              עד {compound.capacity}
            </span>
            <span className="flex items-center gap-1">
              <DoorOpen className="w-3.5 h-3.5" />
              {compound.rooms.length} חדרים
            </span>
            <span className="text-neutral-700 font-semibold">
              ₪{parseFloat(compound.weekdayPrice).toLocaleString()}
              <span className="text-neutral-400 font-normal"> / לילה</span>
            </span>
          </div>
        </div>

        {/* Yard images */}
        {yardImages.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2 rounded-xl overflow-hidden">
            {yardImages.slice(0, 5).map((img, imgIdx) => (
              <div
                key={img.id}
                onClick={() => setLightbox(imgIdx)}
                className={`cursor-pointer overflow-hidden ${
                  imgIdx === 0 ? 'col-span-2 sm:col-span-2 sm:row-span-2' : ''
                }`}
              >
                <img
                  src={img.url}
                  alt={`${compound.name} ${imgIdx + 1}`}
                  className={`w-full object-cover hover:scale-[1.03] transition-transform duration-500 ease-out ${
                    imgIdx === 0
                      ? 'h-48 sm:h-[400px] lg:h-[480px]'
                      : 'h-32 sm:h-[196px] lg:h-[236px]'
                  }`}
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        )}

        {/* Room sections */}
        {compound.rooms
          .filter((room) => (room.images || []).length > 0)
          .map((room) => {
            const yardCount = yardImages.length
            const roomsWithImages = compound.rooms.filter((r) => (r.images || []).length > 0)
            const roomIdx = roomsWithImages.indexOf(room)
            const roomStartIdx =
              yardCount +
              roomsWithImages
                .slice(0, roomIdx)
                .reduce((acc, r) => acc + (r.images || []).length, 0)

            return (
              <div key={room.id} className="mt-6">
                <h3 className="text-base font-semibold text-neutral-700 mb-2" dir="rtl">
                  {room.name}
                  {room.capacity && (
                    <span className="text-sm font-normal text-neutral-400 mr-2">
                      (עד {room.capacity} אורחים)
                    </span>
                  )}
                </h3>

                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 snap-x snap-mandatory" dir="rtl">
                  {(room.images || []).map((img, imgIdx) => (
                    <div
                      key={img.id}
                      onClick={() => setLightbox(roomStartIdx + imgIdx)}
                      className="cursor-pointer overflow-hidden rounded-xl shrink-0 snap-start w-64 sm:w-72 lg:w-80"
                    >
                      <img
                        src={img.url}
                        alt={`${room.name} ${imgIdx + 1}`}
                        className="w-full h-44 sm:h-52 lg:h-56 object-cover hover:scale-[1.03] transition-transform duration-500 ease-out"
                        loading="lazy"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
      </div>

      {/* Lightbox */}
      {lightbox !== null && (
        <div
          className="fixed inset-0 z-[100] bg-black flex items-center justify-center"
          onClick={closeLightbox}
        >
          <button
            onClick={closeLightbox}
            className="absolute top-4 left-4 sm:top-6 sm:left-6 text-white/60 hover:text-white transition-colors z-10 p-2"
          >
            <X className="w-6 h-6" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation()
              nextImage()
            }}
            className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors z-10 p-2"
          >
            <ChevronRight className="w-8 h-8 sm:w-10 sm:h-10" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation()
              prevImage()
            }}
            className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors z-10 p-2"
          >
            <ChevronLeft className="w-8 h-8 sm:w-10 sm:h-10" />
          </button>

          <img
            src={allImages[lightbox]}
            alt=""
            className="max-h-[80vh] max-w-[95vw] sm:max-w-[85vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/50 text-sm">
            {lightbox + 1} / {allImages.length}
          </div>
        </div>
      )}
    </>
  )
}
