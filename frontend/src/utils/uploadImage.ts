const API_BASE = import.meta.env.VITE_API_URL || ''

function compressImage(file: File, maxWidth = 1600, quality = 0.8): Promise<File> {
  return new Promise((resolve) => {
    // Skip non-image or already small files
    if (!file.type.startsWith('image/') || file.size < 200_000) {
      return resolve(file)
    }
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width)
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, w, h)
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }))
          } else {
            resolve(file)
          }
        },
        'image/jpeg',
        quality
      )
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
