import { useState } from 'react'
import { X, ChevronRight, ChevronLeft, Users, Maximize2 } from 'lucide-react'

const cabins = [
  {
    id: '1',
    name: 'צימר האלון',
    tagline: 'מרווח ומפנק עם ג׳קוזי פרטי',
    capacity: 6,
    size: '75 מ״ר',
    price: '₪850',
    images: [
      'https://images.unsplash.com/photo-1587061949409-02df41d5e562?w=1200&h=800&fit=crop&q=85',
      'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=1200&h=800&fit=crop&q=85',
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=1200&h=800&fit=crop&q=85',
    ],
  },
  {
    id: '2',
    name: 'צימר הזית',
    tagline: 'אינטימי ומעוצב עם נוף לגבעות',
    capacity: 4,
    size: '55 מ״ר',
    price: '₪650',
    images: [
      'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=1200&h=800&fit=crop&q=85',
      'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=1200&h=800&fit=crop&q=85',
      'https://images.unsplash.com/photo-1564078516393-cf04bd96897b?w=1200&h=800&fit=crop&q=85',
    ],
  },
  {
    id: '3',
    name: 'צימר האורן',
    tagline: 'שני חדרי שינה ובריכה פרטית',
    capacity: 8,
    size: '95 מ״ר',
    price: '₪1,100',
    images: [
      'https://images.unsplash.com/photo-1510798831971-661eb04b3739?w=1200&h=800&fit=crop&q=85',
      'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=1200&h=800&fit=crop&q=85',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&h=800&fit=crop&q=85',
    ],
  },
]

export default function Gallery() {
  const [lightbox, setLightbox] = useState<{ cabinIdx: number; imgIdx: number } | null>(null)

  function closeLightbox() { setLightbox(null) }

  function prevImage() {
    if (!lightbox) return
    const len = cabins[lightbox.cabinIdx].images.length
    setLightbox({ ...lightbox, imgIdx: (lightbox.imgIdx - 1 + len) % len })
  }

  function nextImage() {
    if (!lightbox) return
    const len = cabins[lightbox.cabinIdx].images.length
    setLightbox({ ...lightbox, imgIdx: (lightbox.imgIdx + 1) % len })
  }

  return (
    <>
      <div className="w-full max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        {cabins.map((cabin, cabinIdx) => (
          <section key={cabin.id} className="mb-10 sm:mb-16">
            {/* Header */}
            <div className="mb-3 sm:mb-5">
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-neutral-900">
                {cabin.name}
              </h2>
              <p className="text-neutral-500 text-sm mt-0.5">{cabin.tagline}</p>
              <div className="flex items-center gap-3 sm:gap-4 mt-2 text-xs sm:text-sm text-neutral-400">
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  עד {cabin.capacity}
                </span>
                <span className="flex items-center gap-1">
                  <Maximize2 className="w-3.5 h-3.5" />
                  {cabin.size}
                </span>
                <span className="text-neutral-700 font-semibold">
                  {cabin.price}<span className="text-neutral-400 font-normal"> / לילה</span>
                </span>
              </div>
            </div>

            {/* Mobile: horizontal scroll gallery */}
            <div className="sm:hidden flex gap-2 overflow-x-auto no-scrollbar snap-x snap-mandatory -mx-3 px-3">
              {cabin.images.map((img, imgIdx) => (
                <div
                  key={imgIdx}
                  onClick={() => setLightbox({ cabinIdx, imgIdx })}
                  className="shrink-0 w-[85vw] snap-center cursor-pointer rounded-xl overflow-hidden"
                >
                  <img
                    src={img}
                    alt={`${cabin.name} ${imgIdx + 1}`}
                    className="w-full h-56 object-cover"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>

            {/* Desktop: grid gallery */}
            <div className="hidden sm:grid grid-cols-3 gap-2 rounded-xl overflow-hidden">
              {cabin.images.map((img, imgIdx) => (
                <div
                  key={imgIdx}
                  onClick={() => setLightbox({ cabinIdx, imgIdx })}
                  className={`cursor-pointer overflow-hidden ${
                    imgIdx === 0 ? 'col-span-2 row-span-2' : ''
                  }`}
                >
                  <img
                    src={img}
                    alt={`${cabin.name} ${imgIdx + 1}`}
                    className={`w-full object-cover hover:scale-[1.03] transition-transform duration-500 ease-out ${
                      imgIdx === 0 ? 'h-full min-h-[400px] lg:min-h-[480px]' : 'h-[196px] lg:h-[236px]'
                    }`}
                    loading="lazy"
                  />
                </div>
              ))}
            </div>

            {/* Scroll dots mobile */}
            <div className="sm:hidden flex justify-center gap-1.5 mt-3">
              {cabin.images.map((_, i) => (
                <span key={i} className="w-1.5 h-1.5 rounded-full bg-neutral-300" />
              ))}
            </div>

            {/* Divider */}
            {cabinIdx < cabins.length - 1 && (
              <div className="mt-8 sm:mt-12 border-b border-neutral-100" />
            )}
          </section>
        ))}
      </div>

      {/* Lightbox */}
      {lightbox && (
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
            onClick={(e) => { e.stopPropagation(); nextImage() }}
            className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors z-10 p-2"
          >
            <ChevronRight className="w-8 h-8 sm:w-10 sm:h-10" />
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); prevImage() }}
            className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors z-10 p-2"
          >
            <ChevronLeft className="w-8 h-8 sm:w-10 sm:h-10" />
          </button>

          <img
            src={cabins[lightbox.cabinIdx].images[lightbox.imgIdx]}
            alt=""
            className="max-h-[80vh] max-w-[95vw] sm:max-w-[85vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Image counter */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/50 text-sm">
            {lightbox.imgIdx + 1} / {cabins[lightbox.cabinIdx].images.length}
          </div>
        </div>
      )}
    </>
  )
}
