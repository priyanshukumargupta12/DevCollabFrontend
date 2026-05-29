import { useState, useEffect } from 'react';
import { X, Calendar, Clock, AlignLeft, Tag, Bell, Trash2, Save } from 'lucide-react';
import Spinner from './Spinner';

const REMINDER_OPTIONS = [
  { label: 'At event time', minutes: 0 },
  { label: '5 minutes before', minutes: 5 },
  { label: '15 minutes before', minutes: 15 },
  { label: '30 minutes before', minutes: 30 },
  { label: '1 hour before', minutes: 60 },
  { label: '2 hours before', minutes: 120 },
  { label: '1 day before', minutes: 1440 },
  { label: '1 week before', minutes: 10080 },
];

const EVENT_TYPES = [
  { value: 'event', label: '📅 Event', color: '#8b5cf6' },
  { value: 'meeting', label: '📹 Meeting', color: '#3b82f6' },
  { value: 'other', label: '🗂️ Other', color: '#64748b' },
];

const toLocalDatetimeString = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const toLocalDateString = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/**
 * EventModal — Create/Edit/View calendar events with reminders.
 */
const EventModal = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  event = null,          // null = create mode; object = edit mode
  defaultStart = null,   // pre-filled when clicking on a date slot
  defaultEnd = null,
  defaultAllDay = false,
  currentUser,
  isSaving = false,
}) => {
  const isEditMode = !!event && !event.isTaskDeadline;
  const isViewOnlyMode = !!event?.isTaskDeadline;
  const isCreator = !event || event.creator?._id === currentUser._id || event.creator === currentUser._id;

  const [form, setForm] = useState({
    title: '',
    description: '',
    start: '',
    end: '',
    allDay: false,
    type: 'event',
    reminders: [],
  });

  // Populate form when editing an existing event
  useEffect(() => {
    if (event) {
      const allDay = event.allDay ?? false;
      setForm({
        title: event.title || '',
        description: event.description || '',
        start: allDay ? toLocalDateString(event.start) : toLocalDatetimeString(event.start),
        end: allDay ? toLocalDateString(event.end) : toLocalDatetimeString(event.end),
        allDay,
        type: event.type || 'event',
        reminders: (event.reminders || []).map((r) => r.minutes),
      });
    } else {
      // New event — pre-fill from clicked date slot
      const allDay = defaultAllDay ?? false;
      setForm({
        title: '',
        description: '',
        start: allDay ? toLocalDateString(defaultStart) : toLocalDatetimeString(defaultStart),
        end: allDay ? toLocalDateString(defaultEnd || defaultStart) : toLocalDatetimeString(defaultEnd || defaultStart),
        allDay,
        type: 'event',
        reminders: [15], // default 15m reminder
      });
    }
  }, [event, defaultStart, defaultEnd, defaultAllDay, isOpen]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAllDayToggle = () => {
    const next = !form.allDay;
    setForm((prev) => ({
      ...prev,
      allDay: next,
      start: next ? toLocalDateString(prev.start) : prev.start,
      end: next ? toLocalDateString(prev.end) : prev.end,
    }));
  };

  const toggleReminder = (minutes) => {
    setForm((prev) => {
      const has = prev.reminders.includes(minutes);
      return {
        ...prev,
        reminders: has ? prev.reminders.filter((m) => m !== minutes) : [...prev.reminders, minutes],
      };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...form,
      reminders: form.reminders.map((m) => ({ minutes: m })),
    });
  };

  if (!isOpen) return null;

  const typeInfo = EVENT_TYPES.find((t) => t.value === (form.type || event?.type)) || EVENT_TYPES[0];

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
        animation: 'fadeIn 0.15s ease',
      }}
    >
      <style>{`@keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }`}</style>
      <div style={{
        width: '100%', maxWidth: 520,
        background: '#0f1117',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 20,
        boxShadow: '0 25px 60px rgba(0,0,0,0.7)',
        animation: 'slideUp 0.25s ease',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: `${typeInfo.color}22`,
              border: `1px solid ${typeInfo.color}44`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.9rem',
            }}>
              {typeInfo.label.split(' ')[0]}
            </div>
            <span style={{ fontWeight: 800, fontSize: '1rem', color: '#fff' }}>
              {isViewOnlyMode ? 'Task Deadline' : isEditMode ? 'Edit Event' : 'New Event'}
            </span>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 8, padding: '0.375rem', color: 'var(--color-text-muted)',
            cursor: 'pointer', display: 'flex',
          }}>
            <X size={16} />
          </button>
        </div>

        {/* View-only Task Deadline Mode */}
        {isViewOnlyMode ? (
          <div style={{ padding: '1.5rem' }}>
            <h3 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>{event.title}</h3>
            {event.description && (
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginBottom: '1rem' }}>{event.description}</p>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              <Clock size={13} />
              <span>Due: {new Date(event.start).toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
            <div style={{ marginTop: '1rem', padding: '0.625rem 0.875rem', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, fontSize: '0.75rem', color: 'var(--color-warning)' }}>
              📌 This is a task deadline. Edit it from the Kanban Board tab.
            </div>
          </div>
        ) : (
          /* Create/Edit Form */
          <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* Title */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <Tag size={11} /> Title *
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder="Event title..."
                required
                disabled={!isCreator}
                style={{
                  width: '100%', background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10,
                  padding: '0.625rem 0.875rem', color: '#fff', fontSize: '0.9rem',
                  outline: 'none', fontFamily: 'inherit',
                }}
                onFocus={(e) => e.target.style.borderColor = 'rgba(139,92,246,0.5)'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
              />
            </div>

            {/* Type Selector */}
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.375rem', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Type
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {EVENT_TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => handleChange('type', t.value)}
                    disabled={!isCreator}
                    style={{
                      flex: 1, padding: '0.5rem 0.25rem', borderRadius: 8, fontSize: '0.75rem', fontWeight: 600,
                      cursor: 'pointer', border: `1px solid ${form.type === t.value ? t.color + '66' : 'rgba(255,255,255,0.08)'}`,
                      background: form.type === t.value ? `${t.color}18` : 'rgba(255,255,255,0.02)',
                      color: form.type === t.value ? t.color : 'var(--color-text-muted)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* All-day toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={handleAllDayToggle}
                disabled={!isCreator}
                style={{
                  width: 40, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer', position: 'relative',
                  background: form.allDay ? 'var(--color-accent)' : 'rgba(255,255,255,0.08)',
                  transition: 'background 0.2s ease', flexShrink: 0,
                }}
              >
                <span style={{
                  position: 'absolute', top: 3,
                  left: form.allDay ? 20 : 3,
                  width: 16, height: 16, borderRadius: '50%',
                  background: '#fff', transition: 'left 0.2s ease',
                }} />
              </button>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>All-day event</span>
            </div>

            {/* Date/Time Range */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.25rem', textTransform: 'uppercase' }}>
                  Start {form.allDay ? 'Date' : 'Date & Time'}
                </label>
                <input
                  type={form.allDay ? 'date' : 'datetime-local'}
                  value={form.start}
                  onChange={(e) => handleChange('start', e.target.value)}
                  required
                  disabled={!isCreator}
                  style={{
                    width: '100%', background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10,
                    padding: '0.5rem 0.75rem', color: '#fff', fontSize: '0.8rem',
                    outline: 'none', colorScheme: 'dark',
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.25rem', textTransform: 'uppercase' }}>
                  End {form.allDay ? 'Date' : 'Date & Time'}
                </label>
                <input
                  type={form.allDay ? 'date' : 'datetime-local'}
                  value={form.end}
                  onChange={(e) => handleChange('end', e.target.value)}
                  required
                  disabled={!isCreator}
                  style={{
                    width: '100%', background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10,
                    padding: '0.5rem 0.75rem', color: '#fff', fontSize: '0.8rem',
                    outline: 'none', colorScheme: 'dark',
                  }}
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <AlignLeft size={11} /> Description
              </label>
              <textarea
                value={form.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Optional details..."
                rows={2}
                disabled={!isCreator}
                style={{
                  width: '100%', background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10,
                  padding: '0.625rem 0.875rem', color: '#fff', fontSize: '0.85rem',
                  outline: 'none', resize: 'none', fontFamily: 'inherit',
                }}
                onFocus={(e) => e.target.style.borderColor = 'rgba(139,92,246,0.5)'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
              />
            </div>

            {/* Reminders */}
            {isCreator && (
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <Bell size={11} /> Reminders
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                  {REMINDER_OPTIONS.map((opt) => {
                    const active = form.reminders.includes(opt.minutes);
                    return (
                      <button
                        key={opt.minutes}
                        type="button"
                        onClick={() => toggleReminder(opt.minutes)}
                        style={{
                          padding: '0.3rem 0.625rem', borderRadius: 6, fontSize: '0.7rem', fontWeight: 600,
                          cursor: 'pointer', border: `1px solid ${active ? 'rgba(139,92,246,0.5)' : 'rgba(255,255,255,0.08)'}`,
                          background: active ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.02)',
                          color: active ? 'var(--color-accent-light)' : 'var(--color-text-muted)',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Footer Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <div>
                {isEditMode && isCreator && onDelete && (
                  <button
                    type="button"
                    onClick={onDelete}
                    style={{
                      padding: '0.5rem 0.875rem', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600,
                      border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.06)',
                      color: 'var(--color-error)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.375rem',
                    }}
                  >
                    <Trash2 size={13} /> Delete
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', gap: '0.625rem' }}>
                <button
                  type="button" onClick={onClose}
                  style={{
                    padding: '0.5rem 1rem', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600,
                    border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)',
                    color: 'var(--color-text-secondary)', cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                {isCreator && (
                  <button
                    type="submit"
                    disabled={isSaving}
                    style={{
                      padding: '0.5rem 1.25rem', borderRadius: 8, fontSize: '0.8rem', fontWeight: 700,
                      border: 'none', background: 'var(--gradient-brand)',
                      color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.375rem',
                    }}
                  >
                    {isSaving ? <Spinner style={{ width: 12, height: 12 }} /> : <Save size={13} />}
                    {isEditMode ? 'Save Changes' : 'Create Event'}
                  </button>
                )}
              </div>
            </div>

          </form>
        )}
      </div>
    </div>
  );
};

export default EventModal;
