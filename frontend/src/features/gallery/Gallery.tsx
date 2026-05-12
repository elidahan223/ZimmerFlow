import { useState, useEffect, useRef, type ReactNode } from 'react'
import { X, ChevronRight, ChevronLeft, PlayCircle } from 'lucide-react'

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
  videoUrl?: string
  rooms: Room[]
  images?: CompoundImage[]
}

interface Props {
  compoundId: string | null
}

const pad2 = (n: number) => String(n).padStart(2, '0')

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
      <div className="flex flex-col items-center justify-center h-64 gap-4" role="status" aria-live="polite">
        <div className="w-px h-12 bg-gold/50 animate-pulse" />
        <span className="label-airy text-[10px] text-muted">טוען</span>
      </div>
    )
  }

  if (!compound) {
    return (
      <div className="text-center py-24" dir="rtl">
        <span className="label-airy text-[10px] text-muted block mb-4">לא זמין</span>
        <div className="w-8 h-px bg-gold/60 mx-auto mb-4" />
        <p className="font-editorial text-2xl sm:text-3xl text-charcoal mb-2">אין מתחם להצגה</p>
        <p className="text-sm text-charcoal-soft/70 font-light">חזרו אלינו מאוחר יותר</p>
      </div>
    )
  }

  const yardImages = compound.images || []
  const heroImage = yardImages[0]?.url
  const roomsWithImages = compound.rooms.filter((r) => (r.images || []).length > 0)
  const totalSections = (yardImages.length > 0 ? 1 : 0) + roomsWithImages.length
  const showIndex = totalSections > 1

  return (
    <>
      {/* HERO */}
      {heroImage && (
        <div className="relative w-full h-[260px] sm:h-[520px] -mt-20 mb-10 sm:mb-16 overflow-hidden">
          <img
            src={heroImage}
            alt={`${compound.name} - תמונה ראשית`}
            className="absolute inset-0 w-full h-full object-cover"
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-charcoal/75 via-charcoal/15 to-transparent" />

          <div
            className="absolute inset-0 flex flex-col justify-end px-5 pb-8 sm:px-12 sm:pb-14"
            dir="rtl"
          >
            <span className="label-airy text-[10px] sm:text-xs text-bone/75 mb-3 sm:mb-4">
              BOUTIQUE STAY
            </span>
            <div className="w-10 h-px bg-gold mb-4 sm:mb-5" />
            <h1 className="font-editorial text-bone text-4xl sm:text-6xl lg:text-7xl leading-[1.05] max-w-[88%]">
              {compound.name}
            </h1>
            {compound.tagline && (
              <p className="text-bone/85 text-sm sm:text-lg font-light max-w-[80%] mt-4 leading-relaxed">
                {compound.tagline}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="w-full max-w-6xl mx-auto px-5 sm:px-8 lg:px-10 pb-16">
        {/* Editorial meta strip */}
        <section className="mb-12 sm:mb-16 pb-10 border-b border-divider" dir="rtl" aria-label="פרטי המתחם">
          <div className="grid grid-cols-3">
            <div className="pl-4 sm:pl-6 [&:not(:last-child)]:border-l [&:not(:last-child)]:border-divider/70">
              <div className="label-airy text-[9px] sm:text-[10px] text-muted mb-2">אורחים</div>
              <div className="font-editorial text-charcoal text-2xl sm:text-4xl leading-none">
                {compound.capacity}
              </div>
            </div>
            <div className="px-4 sm:px-6 [&:not(:last-child)]:border-l [&:not(:last-child)]:border-divider/70">
              <div className="label-airy text-[9px] sm:text-[10px] text-muted mb-2">חדרים</div>
              <div className="font-editorial text-charcoal text-2xl sm:text-4xl leading-none">
                {compound.rooms.length}
              </div>
            </div>
            <div className="pr-4 sm:pr-6">
              <div className="label-airy text-[9px] sm:text-[10px] text-muted mb-2">לילה</div>
              <div className="font-editorial text-charcoal text-2xl sm:text-4xl leading-none tabular-nums">
                ₪{parseFloat(compound.weekdayPrice).toLocaleString()}
              </div>
            </div>
          </div>

          {compound.videoUrl && (
            <a
              href={compound.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2.5 mt-8 text-charcoal-soft hover:text-charcoal transition-colors"
            >
              <PlayCircle className="w-4 h-4 text-gold" aria-hidden="true" />
              <span className="label-airy text-[10px] sm:text-xs border-b border-gold/40 group-hover:border-gold pb-px transition-colors">
                צפייה בסרטון
              </span>
            </a>
          )}
        </section>

        {/* Yard section */}
        {yardImages.length > 0 && (
          <SectionBlock
            sectionIdx={1}
            title="החצר"
            count={yardImages.length}
            showIndex={showIndex}
            dir="rtl"
          >
            <ImageRow
              images={yardImages}
              baseIdx={0}
              tileClass="w-[min(85vw,720px)] aspect-[3/2]"
              compoundName={compound.name}
              onOpen={setLightbox}
            />
          </SectionBlock>
        )}

        {/* Room sections */}
        {roomsWithImages.map((room, roomIdx) => {
          const yardCount = yardImages.length
          const roomStartIdx =
            yardCount +
            roomsWithImages
              .slice(0, roomIdx)
              .reduce((acc, r) => acc + (r.images || []).length, 0)
          const sectionIdx = (yardImages.length > 0 ? 1 : 0) + roomIdx + 1

          return (
            <SectionBlock
              key={room.id}
              sectionIdx={sectionIdx}
              title={room.name}
              count={(room.images || []).length}
              capacity={room.capacity}
              showIndex={showIndex}
              dir="rtl"
            >
              <ImageRow
                images={room.images || []}
                baseIdx={roomStartIdx}
                tileClass="w-64 sm:w-80 lg:w-96 aspect-[4/3]"
                compoundName={room.name}
                onOpen={setLightbox}
              />
            </SectionBlock>
          )
        })}
      </div>

      {/* Lightbox */}
      {lightbox !== null && (
        <div
          className="fixed inset-0 z-[100] bg-charcoal flex items-center justify-center"
          onClick={closeLightbox}
          role="dialog"
          aria-modal="true"
          aria-label="גלריית תמונות מוגדלת"
        >
          {/* Top bar — close + fraction */}
          <div
            className="absolute top-0 inset-x-0 flex items-center justify-between px-5 py-5 sm:px-10 sm:py-7 z-10"
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closeLightbox}
              aria-label="סגור גלריה"
              className="text-bone/60 hover:text-bone transition-colors p-2 -m-2"
            >
              <X className="w-6 h-6" aria-hidden="true" />
            </button>
            <span className="label-airy text-bone/70 text-xs sm:text-sm tabular-nums">
              {pad2(lightbox + 1)} / {pad2(allImages.length)}
            </span>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation()
              nextImage()
            }}
            aria-label="תמונה הבאה"
            className="absolute right-3 sm:right-10 top-1/2 -translate-y-1/2 text-bone/40 hover:text-bone transition-colors p-3 z-10"
          >
            <ChevronRight className="w-7 h-7 sm:w-9 sm:h-9" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation()
              prevImage()
            }}
            aria-label="תמונה קודמת"
            className="absolute left-3 sm:left-10 top-1/2 -translate-y-1/2 text-bone/40 hover:text-bone transition-colors p-3 z-10"
          >
            <ChevronLeft className="w-7 h-7 sm:w-9 sm:h-9" aria-hidden="true" />
          </button>

          <img
            src={allImages[lightbox]}
            alt={`${compound?.name || 'מתחם'} - תמונה ${lightbox + 1} מתוך ${allImages.length}`}
            className="max-h-[78vh] max-w-[92vw] sm:max-w-[82vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Bottom caption */}
          <div
            className="absolute bottom-6 sm:bottom-8 inset-x-0 text-center pointer-events-none"
            dir="rtl"
          >
            <div className="w-6 h-px bg-gold/70 mx-auto mb-3" />
            <span className="label-airy text-bone/55 text-[10px] sm:text-xs">
              {compound?.name}
            </span>
          </div>
        </div>
      )}
    </>
  )
}

/* ---- Section header + image row helpers ---- */

interface SectionBlockProps {
  sectionIdx: number
  title: string
  count: number
  capacity?: number
  showIndex: boolean
  dir?: 'rtl' | 'ltr'
  children: ReactNode
}

function SectionBlock({
  sectionIdx,
  title,
  count,
  capacity,
  showIndex,
  dir = 'rtl',
  children,
}: SectionBlockProps) {
  return (
    <section className="mt-14 sm:mt-20 first:mt-0" dir={dir} aria-label={title}>
      <header className="flex items-baseline justify-between mb-3">
        <div className="flex items-baseline gap-3">
          <h2 className="font-editorial text-2xl sm:text-4xl text-charcoal leading-none">
            {title}
          </h2>
          {capacity && (
            <span className="label-airy text-[9px] sm:text-[10px] text-muted">
              עד {capacity} אורחים
            </span>
          )}
        </div>
        {showIndex && (
          <span className="label-airy text-[10px] sm:text-xs text-muted tabular-nums">
            פרק {pad2(sectionIdx)}
          </span>
        )}
      </header>
      <div className="flex items-center gap-3 mb-6">
        <span className="block w-8 h-px bg-gold" />
        <span className="label-airy text-[9px] sm:text-[10px] text-muted/80 tabular-nums">
          {pad2(count)} תמונות
        </span>
      </div>
      {children}
    </section>
  )
}

interface ImageRowProps {
  images: CompoundImage[]
  baseIdx: number
  tileClass: string
  compoundName: string
  onOpen: (idx: number) => void
}

function ImageRow({ images, baseIdx, tileClass, compoundName, onOpen }: ImageRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState({ atStart: true, atEnd: true })

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const update = () => {
      const { scrollLeft, scrollWidth, clientWidth } = el
      if (scrollWidth <= clientWidth + 1) {
        setEdges({ atStart: true, atEnd: true })
        return
      }
      // In RTL Chrome: scrollLeft is 0 at start, goes negative toward end
      const atStart = scrollLeft >= -1
      const atEnd = Math.abs(scrollLeft) >= scrollWidth - clientWidth - 1
      setEdges({ atStart, atEnd })
    }
    update()
    const timer = window.setTimeout(update, 400) // re-measure after images settle
    el.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.clearTimeout(timer)
      el.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [images.length])

  function scrollByDir(direction: 'next' | 'prev') {
    const el = scrollRef.current
    if (!el) return
    const delta = el.clientWidth * 0.85
    // RTL: 'next' (visually leftward) needs negative scrollLeft delta
    el.scrollBy({ left: direction === 'next' ? -delta : delta, behavior: 'smooth' })
  }

  return (
    <div className="relative group/row">
      <div
        ref={scrollRef}
        className="flex gap-3 sm:gap-4 overflow-x-auto snap-x snap-mandatory pb-2 -mx-5 sm:-mx-8 lg:-mx-10 px-5 sm:px-8 lg:px-10 no-scrollbar"
        dir="rtl"
      >
        {images.map((img, imgIdx) => (
          <button
            key={img.id}
            type="button"
            onClick={() => onOpen(baseIdx + imgIdx)}
            aria-label={`הגדל תמונה ${imgIdx + 1}`}
            className={`group/tile relative overflow-hidden flex-shrink-0 snap-start ${tileClass}`}
          >
            <img
              src={img.url}
              alt={`${compoundName} ${imgIdx + 1}`}
              className="w-full h-full object-cover transition-transform duration-[600ms] ease-out group-hover/tile:scale-[1.02]"
              loading="lazy"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gold scale-x-0 origin-right group-hover/tile:scale-x-100 transition-transform duration-500 ease-out"
            />
          </button>
        ))}
      </div>

      {/* Desktop hover arrows — appear on row hover, fade at edges */}
      <button
        type="button"
        onClick={() => scrollByDir('next')}
        aria-label="תמונה הבאה"
        disabled={edges.atEnd}
        className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-bone/95 backdrop-blur-sm border border-divider items-center justify-center text-charcoal-soft hover:text-charcoal hover:border-gold hover:shadow-[0_6px_16px_-4px_rgba(26,26,24,0.18)] transition-all duration-200 opacity-0 group-hover/row:opacity-100 disabled:opacity-0 disabled:pointer-events-none"
      >
        <ChevronLeft className="w-4 h-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={() => scrollByDir('prev')}
        aria-label="תמונה קודמת"
        disabled={edges.atStart}
        className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-bone/95 backdrop-blur-sm border border-divider items-center justify-center text-charcoal-soft hover:text-charcoal hover:border-gold hover:shadow-[0_6px_16px_-4px_rgba(26,26,24,0.18)] transition-all duration-200 opacity-0 group-hover/row:opacity-100 disabled:opacity-0 disabled:pointer-events-none"
      >
        <ChevronRight className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  )
}
