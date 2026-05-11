import { useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { X, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import ImageUploader, { type PendingFile } from '../../shared/ImageUploader'
import type { Compound, ImageRecord } from './Settings'
import {
  uploadImageToS3,
  saveCompoundImage,
  saveRoomImage,
  deleteImage,
} from '../../utils/uploadImage'

interface Props {
  compound: Compound | null
  onClose: () => void
  onSaved: () => void
}

interface LocalRoom {
  id?: string
  name: string
  description: string
  capacity: string
  isNew?: boolean
  existingImages: ImageRecord[]
  pendingFiles: PendingFile[]
  deletedImageIds: string[]
  expanded?: boolean
}

export default function CompoundForm({ compound, onClose, onSaved }: Props) {
  const auth = useAuth()
  const isEdit = !!compound
  const [loading, setLoading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState('')
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name: compound?.name || '',
    description: compound?.description || '',
    tagline: compound?.tagline || '',
    yardDescription: compound?.yardDescription || '',
    videoUrl: compound?.videoUrl || '',
    capacity: compound?.capacity?.toString() || '4',
    weekdayPrice: compound?.weekdayPrice ? parseFloat(compound.weekdayPrice).toString() : '',
    weekendPrice: compound?.weekendPrice ? parseFloat(compound.weekendPrice).toString() : '',
    holidayPrice: compound?.holidayPrice ? parseFloat(compound.holidayPrice).toString() : '',
    status: compound?.status || 'ACTIVE',
  })

  // Compound yard images
  const [yardExistingImages] = useState<ImageRecord[]>(compound?.images || [])
  const [yardPendingFiles, setYardPendingFiles] = useState<PendingFile[]>([])
  const [yardDeletedIds, setYardDeletedIds] = useState<string[]>([])

  // Rooms
  const [rooms, setRooms] = useState<LocalRoom[]>(
    compound?.rooms?.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description || '',
      capacity: r.capacity?.toString() || '',
      existingImages: r.images || [],
      pendingFiles: [],
      deletedImageIds: [],
      expanded: false,
    })) || []
  )
  const [showAddRoom, setShowAddRoom] = useState(false)
  const [newRoom, setNewRoom] = useState({ name: '', description: '', capacity: '' })
  const [newRoomPendingFiles, setNewRoomPendingFiles] = useState<PendingFile[]>([])

  const set = (key: string, value: string) => setForm({ ...form, [key]: value })

  const inputClass =
    'w-full px-4 py-3 rounded-xl border border-neutral-200 bg-neutral-50 text-sm focus:outline-none focus:border-neutral-400 focus:ring-1 focus:ring-neutral-200 transition-all'

  // --- Yard image handlers ---
  function handleYardAddFiles(files: File[]) {
    const newPending = files.map((f) => ({ file: f, preview: URL.createObjectURL(f) }))
    setYardPendingFiles((prev) => [...prev, ...newPending])
  }
  function handleYardRemoveExisting(imageId: string) {
    setYardDeletedIds((prev) => [...prev, imageId])
  }
  function handleYardRemovePending(index: number) {
    setYardPendingFiles((prev) => {
      URL.revokeObjectURL(prev[index].preview)
      return prev.filter((_, i) => i !== index)
    })
  }

  // --- Room image handlers ---
  function updateRoom(index: number, update: Partial<LocalRoom>) {
    setRooms((prev) => prev.map((r, i) => (i === index ? { ...r, ...update } : r)))
  }

  function handleRoomAddFiles(roomIndex: number, files: File[]) {
    const newPending = files.map((f) => ({ file: f, preview: URL.createObjectURL(f) }))
    setRooms((prev) =>
      prev.map((r, i) =>
        i === roomIndex ? { ...r, pendingFiles: [...r.pendingFiles, ...newPending] } : r
      )
    )
  }
  function handleRoomRemoveExisting(roomIndex: number, imageId: string) {
    setRooms((prev) =>
      prev.map((r, i) =>
        i === roomIndex ? { ...r, deletedImageIds: [...r.deletedImageIds, imageId] } : r
      )
    )
  }
  function handleRoomRemovePending(roomIndex: number, fileIndex: number) {
    setRooms((prev) =>
      prev.map((r, i) => {
        if (i !== roomIndex) return r
        URL.revokeObjectURL(r.pendingFiles[fileIndex].preview)
        return { ...r, pendingFiles: r.pendingFiles.filter((_, fi) => fi !== fileIndex) }
      })
    )
  }

  function addLocalRoom() {
    if (!newRoom.name) return
    setRooms([
      ...rooms,
      {
        ...newRoom,
        isNew: true,
        existingImages: [],
        pendingFiles: newRoomPendingFiles,
        deletedImageIds: [],
        expanded: true,
      },
    ])
    setNewRoom({ name: '', description: '', capacity: '' })
    setNewRoomPendingFiles([])
    setShowAddRoom(false)
  }

  function removeLocalRoom(index: number) {
    const room = rooms[index]
    room.pendingFiles.forEach((pf) => URL.revokeObjectURL(pf.preview))
    setRooms(rooms.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name) {
      setError('שם המתחם הוא שדה חובה')
      return
    }
    if (!form.weekdayPrice || !form.weekendPrice) {
      setError('יש להזין מחיר יום חול וסוף שבוע')
      return
    }
    setError('')
    setLoading(true)

    try {
      const token = await auth.getValidToken()
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      }

      // 1. Save compound
      setUploadStatus('שומר מתחם...')
      const url = isEdit ? `/api/compounds/${compound!.id}` : '/api/compounds'
      const method = isEdit ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers, body: JSON.stringify(form) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const compoundId = data.id

      // 2. Delete removed compound images
      if (yardDeletedIds.length > 0) {
        setUploadStatus('מוחק תמונות ישנות...')
        await Promise.all(yardDeletedIds.map((id) => deleteImage('compound', id, token)))
      }

      // 3. Upload new compound images
      if (yardPendingFiles.length > 0) {
        setUploadStatus(`מעלה תמונות חצר (0/${yardPendingFiles.length})...`)
        const existingCount = yardExistingImages.filter(
          (img) => !yardDeletedIds.includes(img.id)
        ).length
        for (let i = 0; i < yardPendingFiles.length; i++) {
          setUploadStatus(`מעלה תמונות חצר (${i + 1}/${yardPendingFiles.length})...`)
          const publicUrl = await uploadImageToS3(
            yardPendingFiles[i].file,
            `compounds/${compoundId}`,
            token
          )
          await saveCompoundImage(compoundId, publicUrl, existingCount + i, token)
        }
      }

      // 4. Handle rooms - delete removed ones
      if (isEdit) {
        const existingIds = rooms.filter((r) => r.id).map((r) => r.id)
        const originalIds = compound!.rooms.map((r) => r.id)
        for (const id of originalIds) {
          if (!existingIds.includes(id)) {
            await fetch(`/api/compounds/rooms/${id}`, { method: 'DELETE', headers })
          }
        }
      }

      // 5. Create new rooms and collect their IDs
      setUploadStatus('שומר חדרים...')
      const roomIdMap: Map<number, string> = new Map()

      // Existing rooms keep their IDs
      rooms.forEach((r, i) => {
        if (r.id) roomIdMap.set(i, r.id)
      })

      // Create new rooms
      const newRooms = rooms.map((r, i) => ({ room: r, index: i })).filter((x) => x.room.isNew || !x.room.id)
      for (const { room: r, index } of newRooms) {
        const roomRes = await fetch(`/api/compounds/${compoundId}/rooms`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            name: r.name,
            description: r.description || undefined,
            capacity: r.capacity ? parseInt(r.capacity) : undefined,
            sortOrder: index,
          }),
        })
        const roomData = await roomRes.json()
        if (roomRes.ok) roomIdMap.set(index, roomData.id)
      }

      // 6. Handle room images (delete + upload) for all rooms
      for (let i = 0; i < rooms.length; i++) {
        const room = rooms[i]
        const roomId = roomIdMap.get(i)
        if (!roomId) continue

        // Delete removed room images
        if (room.deletedImageIds.length > 0) {
          await Promise.all(room.deletedImageIds.map((id) => deleteImage('room', id, token)))
        }

        // Upload new room images
        if (room.pendingFiles.length > 0) {
          setUploadStatus(`מעלה תמונות חדר "${room.name}"...`)
          const existingCount = room.existingImages.filter(
            (img) => !room.deletedImageIds.includes(img.id)
          ).length
          for (let j = 0; j < room.pendingFiles.length; j++) {
            const publicUrl = await uploadImageToS3(
              room.pendingFiles[j].file,
              `rooms/${roomId}`,
              token
            )
            await saveRoomImage(roomId, publicUrl, existingCount + j, token)
          }
        }
      }

      onSaved()
    } catch (err: any) {
      setError(err.message || 'שגיאה בשמירה')
    } finally {
      setLoading(false)
      setUploadStatus('')
    }
  }

  return (
    <div className="fixed inset-0 z-[80] bg-black/40 flex items-center justify-center p-6">
      <div
        className="bg-white rounded-2xl w-full max-w-xl max-h-[85vh] relative shadow-xl flex flex-col overflow-hidden"
        dir="rtl"
      >
        <button
          onClick={onClose}
          aria-label="סגור טופס"
          className="absolute top-4 left-4 text-neutral-400 hover:text-neutral-700 transition-colors z-10"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>

        <div className="overflow-y-auto flex-1" style={{ direction: 'ltr' }}>
          <div className="p-7" style={{ direction: 'rtl' }}>
            <h2 className="text-xl font-bold text-neutral-900 mb-6 text-center">
              {isEdit ? 'עריכת מתחם' : 'מתחם חדש'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* שם */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                  שם המתחם *
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  className={inputClass}
                  placeholder="למשל: הבקתה בהרים"
                />
              </div>

              {/* תגית */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">תגית</label>
                <input
                  type="text"
                  value={form.tagline}
                  onChange={(e) => set('tagline', e.target.value)}
                  className={inputClass}
                  placeholder="משפט קצר שמתאר את המתחם"
                />
              </div>

              {/* תיאור */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">תיאור</label>
                <textarea
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                  className={inputClass + ' h-20 resize-none'}
                  placeholder="תיאור מפורט של המתחם..."
                />
              </div>

              {/* תיאור חצר */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                  תיאור חצר
                </label>
                <textarea
                  value={form.yardDescription}
                  onChange={(e) => set('yardDescription', e.target.value)}
                  className={inputClass + ' h-16 resize-none'}
                  placeholder="בריכה, ג'קוזי, גינה..."
                />
              </div>

              {/* קישור לסרטון */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                  קישור לסרטון המתחם
                </label>
                <input
                  type="url"
                  value={form.videoUrl}
                  onChange={(e) => set('videoUrl', e.target.value)}
                  className={inputClass}
                  placeholder="https://youtu.be/... או כל קישור אחר"
                  dir="ltr"
                />
                <p className="text-[11px] text-neutral-400 mt-1">
                  לא חובה. אם תזין קישור, יופיע כפתור "צפייה בסרטון" בדף המתחם.
                </p>
              </div>

              {/* תמונות חצר */}
              <ImageUploader
                label="תמונות חצר"
                existingImages={yardExistingImages}
                pendingFiles={yardPendingFiles}
                deletedImageIds={yardDeletedIds}
                onAddFiles={handleYardAddFiles}
                onRemoveExisting={handleYardRemoveExisting}
                onRemovePending={handleYardRemovePending}
                maxImages={30}
              />

              {/* תפוסה + סטטוס */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                    תפוסה מקסימלית
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={form.capacity}
                    onChange={(e) => set('capacity', e.target.value)}
                    className={inputClass}
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                    סטטוס
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) => set('status', e.target.value)}
                    className={inputClass}
                  >
                    <option value="ACTIVE">פעיל</option>
                    <option value="INACTIVE">לא פעיל</option>
                    <option value="MAINTENANCE">בתחזוקה</option>
                  </select>
                </div>
              </div>

              {/* מחירים */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  מחירים (₪ ללילה)
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <span className="block text-xs text-neutral-400 mb-1">יום חול *</span>
                    <input
                      type="number"
                      required
                      min="0"
                      value={form.weekdayPrice}
                      onChange={(e) => set('weekdayPrice', e.target.value)}
                      className={inputClass}
                      dir="ltr"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <span className="block text-xs text-neutral-400 mb-1">סוף שבוע *</span>
                    <input
                      type="number"
                      required
                      min="0"
                      value={form.weekendPrice}
                      onChange={(e) => set('weekendPrice', e.target.value)}
                      className={inputClass}
                      dir="ltr"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <span className="block text-xs text-neutral-400 mb-1">חג</span>
                    <input
                      type="number"
                      min="0"
                      value={form.holidayPrice}
                      onChange={(e) => set('holidayPrice', e.target.value)}
                      className={inputClass}
                      dir="ltr"
                      placeholder="--"
                    />
                  </div>
                </div>
              </div>

              {/* חדרים */}
              <div className="border-t border-neutral-100 pt-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-neutral-700">חדרים</h3>
                  {!showAddRoom && (
                    <button
                      type="button"
                      onClick={() => setShowAddRoom(true)}
                      className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-800 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      הוסף חדר
                    </button>
                  )}
                </div>

                {rooms.length === 0 && !showAddRoom && (
                  <p className="text-sm text-neutral-400 text-center py-3">
                    אין חדרים עדיין - הוסף חדרים למתחם
                  </p>
                )}

                <div className="space-y-2">
                  {rooms.map((room, index) => (
                    <div
                      key={room.id || `new-${index}`}
                      className="bg-neutral-50 rounded-xl overflow-hidden"
                    >
                      {/* Room header */}
                      <div className="flex items-center justify-between px-4 py-3">
                        <button
                          type="button"
                          onClick={() => updateRoom(index, { expanded: !room.expanded })}
                          className="flex items-center gap-2 flex-wrap flex-1 text-right"
                        >
                          <span className="text-sm font-medium text-neutral-800">{room.name}</span>
                          {room.description && (
                            <span className="text-xs text-neutral-400">{room.description}</span>
                          )}
                          {room.capacity && (
                            <span className="text-xs text-neutral-400">
                              ({room.capacity} אורחים)
                            </span>
                          )}
                          {room.isNew && (
                            <span className="text-[10px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded-full">
                              חדש
                            </span>
                          )}
                          {room.expanded ? (
                            <ChevronUp className="w-3.5 h-3.5 text-neutral-400" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => removeLocalRoom(index)}
                          className="text-red-400 hover:text-red-600 transition-colors p-1 shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Room images (expanded) */}
                      {room.expanded && (
                        <div className="px-4 pb-3">
                          <ImageUploader
                            label="תמונות חדר"
                            existingImages={room.existingImages}
                            pendingFiles={room.pendingFiles}
                            deletedImageIds={room.deletedImageIds}
                            onAddFiles={(files) => handleRoomAddFiles(index, files)}
                            onRemoveExisting={(id) => handleRoomRemoveExisting(index, id)}
                            onRemovePending={(fi) => handleRoomRemovePending(index, fi)}
                            maxImages={20}
                          />
                        </div>
                      )}
                    </div>
                  ))}

                  {showAddRoom && (
                    <div className="bg-neutral-50 rounded-xl p-4 space-y-3">
                      <input
                        type="text"
                        placeholder="שם החדר *"
                        value={newRoom.name}
                        onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })}
                        className={inputClass}
                        autoFocus
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="text"
                          placeholder="תיאור"
                          value={newRoom.description}
                          onChange={(e) => setNewRoom({ ...newRoom, description: e.target.value })}
                          className={inputClass}
                        />
                        <input
                          type="number"
                          placeholder="קיבולת"
                          value={newRoom.capacity}
                          onChange={(e) => setNewRoom({ ...newRoom, capacity: e.target.value })}
                          className={inputClass}
                          dir="ltr"
                        />
                      </div>
                      {/* תמונות חדר חדש */}
                      <ImageUploader
                        label="תמונות חדר"
                        existingImages={[]}
                        pendingFiles={newRoomPendingFiles}
                        deletedImageIds={[]}
                        onAddFiles={(files) => {
                          const newPending = files.map((f) => ({ file: f, preview: URL.createObjectURL(f) }))
                          setNewRoomPendingFiles((prev) => [...prev, ...newPending])
                        }}
                        onRemoveExisting={() => {}}
                        onRemovePending={(i) => {
                          setNewRoomPendingFiles((prev) => {
                            URL.revokeObjectURL(prev[i].preview)
                            return prev.filter((_, fi) => fi !== i)
                          })
                        }}
                        maxImages={20}
                      />

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={addLocalRoom}
                          disabled={!newRoom.name}
                          className="bg-neutral-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-neutral-700 transition-colors disabled:opacity-40"
                        >
                          הוסף
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowAddRoom(false)
                            setNewRoom({ name: '', description: '', capacity: '' })
                            newRoomPendingFiles.forEach((pf) => URL.revokeObjectURL(pf.preview))
                            setNewRoomPendingFiles([])
                          }}
                          className="text-sm text-neutral-500 px-4 py-2 rounded-lg hover:bg-neutral-100 transition-colors"
                        >
                          ביטול
                        </button>
                      </div>
                    </div>
                  )}

                  {/* כפתור הוספת חדר נוסף - מוצג כשאין טופס פתוח ויש כבר חדרים */}
                  {!showAddRoom && rooms.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowAddRoom(true)}
                      className="w-full flex items-center justify-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-800 py-2.5 rounded-xl border border-dashed border-neutral-200 hover:border-neutral-400 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      הוסף חדר נוסף
                    </button>
                  )}
                </div>
              </div>

              {error && <p className="text-red-500 text-sm text-center">{error}</p>}

              <button
                type="submit"
                disabled={loading || !form.name || !form.weekdayPrice || !form.weekendPrice}
                className="w-full bg-neutral-900 text-white font-medium py-3 rounded-xl hover:bg-neutral-700 transition-colors disabled:opacity-40"
              >
                {loading
                  ? uploadStatus || 'שומר...'
                  : isEdit
                    ? 'שמירת שינויים'
                    : 'יצירת מתחם'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
