const API_BASE = import.meta.env.VITE_API_URL || ''

function compressImage(file: File, maxWidth = 1200, quality = 0.7): Promise<File> {
  return new Promise((resolve) => {
    // Skip non-image or already small files
    if (!file.type.startsWith('image/') || file.size < 100_000) {
      return resolve(file)
    }
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, maxWidth / Math.max(img.width, img.height))
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, w, h)

      // Try progressively lower quality until under 500KB
      const tryCompress = (q: number) => {
        canvas.toBlob(
          (blob) => {
            if (blob && (blob.size < 500_000 || q <= 0.3)) {
              resolve(new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }))
            } else if (blob && q > 0.3) {
              tryCompress(q - 0.1)
            } else {
              resolve(file)
            }
          },
          'image/jpeg',
          q
        )
      }
      tryCompress(quality)
    }
    img.onerror = () => resolve(file)
    img.src = URL.createObjectURL(file)
  })
}

export async function uploadImageToS3(
  file: File,
  folder: string,
  accessToken: string
): Promise<string> {
  const compressed = await compressImage(file)
  const ext = compressed.name.split('.').pop() || 'jpg'

  const res = await fetch(`${API_BASE}/api/images/presign`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      contentType: compressed.type,
      folder,
      fileExtension: ext,
    }),
  })

  if (!res.ok) throw new Error('שגיאה ביצירת קישור העלאה')

  const { uploadUrl, publicUrl } = await res.json()

  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': compressed.type },
    body: compressed,
  })

  if (!uploadRes.ok) throw new Error('שגיאה בהעלאת הקובץ')

  return publicUrl
}

export async function saveCompoundImage(
  compoundId: string,
  url: string,
  sortOrder: number,
  accessToken: string
) {
  const res = await fetch(`${API_BASE}/api/images/compound/${compoundId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ url, sortOrder }),
  })
  if (!res.ok) throw new Error('שגיאה בשמירת תמונת מתחם')
  return res.json()
}

export async function saveRoomImage(
  roomId: string,
  url: string,
  sortOrder: number,
  accessToken: string
) {
  const res = await fetch(`${API_BASE}/api/images/room/${roomId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ url, sortOrder }),
  })
  if (!res.ok) throw new Error('שגיאה בשמירת תמונת חדר')
  return res.json()
}

export async function deleteImage(
  type: 'compound' | 'room',
  imageId: string,
  accessToken: string
) {
  const res = await fetch(`${API_BASE}/api/images/${type}/${imageId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error('שגיאה במחיקת תמונה')
}
