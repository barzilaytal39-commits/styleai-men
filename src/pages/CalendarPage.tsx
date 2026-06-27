import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, CalendarDays, MapPin } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { useCalendarEvents, type CalendarEventForm } from '@/hooks/useCalendarEvents'
import { useToast } from '@/components/ui/toaster'
import { classifyEvent, dressCodeForType } from '@/lib/calendar-intelligence'
import { t, eventTypeLabel, dressCodeLabel } from '@/i18n'
import type { CalendarEventRow } from '@/types'

// ISO ↔ <input type="datetime-local"> ('YYYY-MM-DDTHH:mm', local time).
function isoToLocalInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
function localInputToIso(local: string): string | null {
  if (!local) return null
  const d = new Date(local)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}
function fmt(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleString('he-IL', { dateStyle: 'medium', timeStyle: 'short' })
}

const EMPTY = { title: '', description: '', start: '', end: '', location: '' }

export function CalendarPage() {
  const { fetchEvents, createEvent, updateEvent, deleteEvent, isSaving } = useCalendarEvents()
  const { toast } = useToast()
  const [events, setEvents] = useState<CalendarEventRow[]>([])
  const [loaded, setLoaded] = useState(false)
  const [editing, setEditing] = useState<CalendarEventRow | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ ...EMPTY })
  const [deleting, setDeleting] = useState<CalendarEventRow | null>(null)

  const load = async () => {
    const { data } = await fetchEvents()
    setEvents(data)
    setLoaded(true)
  }
  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const openAdd = () => {
    setEditing(null)
    setForm({ ...EMPTY })
    setShowForm(true)
  }
  const openEdit = (e: CalendarEventRow) => {
    setEditing(e)
    setForm({
      title: e.title,
      description: e.description ?? '',
      start: isoToLocalInput(e.start_at),
      end: isoToLocalInput(e.end_at),
      location: e.location ?? '',
    })
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast({ title: t.calendar.titleRequired, variant: 'destructive' })
      return
    }
    const startIso = localInputToIso(form.start)
    if (!startIso) {
      toast({ title: t.calendar.startRequired, variant: 'destructive' })
      return
    }
    const payload: CalendarEventForm = {
      title: form.title.trim(),
      description: form.description,
      start_at: startIso,
      end_at: localInputToIso(form.end),
      location: form.location,
    }
    const { error } = editing ? await updateEvent(editing.id, payload) : await createEvent(payload)
    if (error) {
      toast({ title: t.calendar.saveFailed, description: error.message, variant: 'destructive' })
      return
    }
    setShowForm(false)
    toast({ title: t.calendar.saved })
    await load()
  }

  const handleDelete = async () => {
    if (!deleting) return
    const { error } = await deleteEvent(deleting.id)
    setDeleting(null)
    if (error) {
      toast({ title: t.calendar.saveFailed, description: error.message, variant: 'destructive' })
    } else {
      toast({ title: t.calendar.deleted })
      await load()
    }
  }

  return (
    <AppLayout title={t.calendar.title}>
      <div className="space-y-4 pb-6">
        <Button className="w-full" onClick={openAdd}>
          <Plus className="h-4 w-4" />
          {t.calendar.addEvent}
        </Button>

        {!loaded ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
          </div>
        ) : events.length === 0 ? (
          <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <CalendarDays className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="font-semibold">{t.calendar.empty}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((e) => {
              const type = classifyEvent({ title: e.title, notes: e.description, location: e.location })
              return (
                <div key={e.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{e.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{fmt(e.start_at)}</p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(e)}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-muted hover:bg-muted/80"
                      >
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">{t.common.edit}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleting(e)}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-destructive hover:bg-muted/80"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">{t.common.delete}</span>
                      </button>
                    </div>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{eventTypeLabel(type)}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {t.calendar.dressCode}: {dressCodeLabel(dressCodeForType(type))}
                    </span>
                  </div>

                  {e.location && (
                    <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" />
                      {e.location}
                    </p>
                  )}
                  {e.description && (
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{e.description}</p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add / edit form */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogTitle>{editing ? t.calendar.editEvent : t.calendar.newEvent}</DialogTitle>
          <div className="mt-4 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="ev-title">{t.calendar.eventTitle}</Label>
              <Input
                id="ev-title"
                value={form.title}
                placeholder={t.calendar.titlePlaceholder}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ev-start">{t.calendar.start}</Label>
                <Input
                  id="ev-start"
                  type="datetime-local"
                  value={form.start}
                  onChange={(e) => setForm((f) => ({ ...f, start: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ev-end">{t.calendar.end}</Label>
                <Input
                  id="ev-end"
                  type="datetime-local"
                  value={form.end}
                  onChange={(e) => setForm((f) => ({ ...f, end: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ev-loc">{t.calendar.location}</Label>
              <Input
                id="ev-loc"
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ev-desc">{t.calendar.description}</Label>
              <Textarea
                id="ev-desc"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
          </div>
          <div className="mt-6 flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)} disabled={isSaving}>
              {t.common.cancel}
            </Button>
            <Button className="flex-1" onClick={handleSave} isLoading={isSaving}>
              {t.common.save}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent>
          <DialogTitle>{t.calendar.deleteConfirm}</DialogTitle>
          <DialogDescription>{t.calendar.deleteWarn}</DialogDescription>
          <div className="mt-6 flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setDeleting(null)}>
              {t.common.cancel}
            </Button>
            <Button variant="destructive" className="flex-1" onClick={handleDelete}>
              {t.common.delete}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}
