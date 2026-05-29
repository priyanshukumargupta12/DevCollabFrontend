import { useState, useEffect, useRef, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Plus, Calendar, RefreshCw, ChevronLeft, ChevronRight, LayoutGrid, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

import { getEvents, createEvent, updateEvent, deleteEvent } from '../api/event';
import EventModal from './EventModal';
import Spinner from './Spinner';

/** Map backend event types to display colours */
const TYPE_COLORS = {
  meeting:  { bg: '#3b82f6', border: '#2563eb', text: '#fff' },
  event:    { bg: '#8b5cf6', border: '#7c3aed', text: '#fff' },
  other:    { bg: '#64748b', border: '#475569', text: '#fff' },
  deadline: { bg: '#ef4444', border: '#dc2626', text: '#fff' },
};

/** Convert a backend event → FullCalendar event object */
const toFCEvent = (ev) => {
  const typeColor = TYPE_COLORS[ev.type] || TYPE_COLORS.event;
  const customColor = ev.color ? { backgroundColor: ev.color, borderColor: ev.color } : {};
  return {
    id: String(ev._id),
    title: ev.title,
    start: ev.start,
    end: ev.end,
    allDay: ev.allDay,
    backgroundColor:  customColor.backgroundColor || typeColor.bg,
    borderColor:      customColor.borderColor     || typeColor.border,
    textColor:        typeColor.text,
    extendedProps: { ...ev },
  };
};

/**
 * WorkspaceCalendar — Full-featured FullCalendar integration.
 * Renders events, task deadlines, supports creation / editing / deletion,
 * and allows switching to meeting tab when a meeting event is clicked.
 */
const WorkspaceCalendar = ({ workspaceId, currentUser, workspace, onSwitchTab }) => {
  const calendarRef = useRef(null);
  const [fcEvents, setFcEvents]     = useState([]);
  const [rawEvents, setRawEvents]   = useState([]);   // keep full backend objects
  const [loading, setLoading]       = useState(true);
  const [currentView, setCurrentView] = useState('dayGridMonth');
  const [currentTitle, setCurrentTitle] = useState('');

  // Modal state
  const [modalOpen, setModalOpen]   = useState(false);
  const [activeEvent, setActiveEvent] = useState(null);    // null = new event
  const [defaultStart, setDefaultStart] = useState(null);
  const [defaultEnd,   setDefaultEnd]   = useState(null);
  const [defaultAllDay, setDefaultAllDay] = useState(false);
  const [isSaving, setIsSaving]     = useState(false);

  /* ── Fetch events ─────────────────────────────────────────────────────── */
  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getEvents(workspaceId);
      setRawEvents(data.events);
      setFcEvents(data.events.map(toFCEvent));
    } catch {
      toast.error('Failed to load calendar events.');
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  /* ── Sync FullCalendar title after render ─────────────────────────────── */
  const syncTitle = () => {
    const api = calendarRef.current?.getApi();
    if (api) setCurrentTitle(api.view.title);
  };

  /* ── View switcher ───────────────────────────────────────────────────── */
  const switchView = (view) => {
    calendarRef.current?.getApi()?.changeView(view);
    setCurrentView(view);
    setTimeout(syncTitle, 50);
  };

  const navigate = (dir) => {
    const api = calendarRef.current?.getApi();
    if (!api) return;
    dir === 'prev' ? api.prev() : api.next();
    setTimeout(syncTitle, 50);
  };

  const goToday = () => {
    calendarRef.current?.getApi()?.today();
    setTimeout(syncTitle, 50);
  };

  /* ── FullCalendar handlers ────────────────────────────────────────────── */
  const handleDateSelect = ({ start, end, allDay }) => {
    setActiveEvent(null);
    setDefaultStart(start);
    setDefaultEnd(end);
    setDefaultAllDay(allDay);
    setModalOpen(true);
  };

  const handleEventClick = ({ event }) => {
    const raw = rawEvents.find((e) => String(e._id) === event.id);
    if (!raw) return;

    // If it's a meeting, offer to open the Video Call tab
    if (raw.type === 'meeting' && !raw.isTaskDeadline) {
      setActiveEvent(raw);
      setModalOpen(true);
      return;
    }

    setActiveEvent(raw);
    setModalOpen(true);
  };

  /* Allow drag-to-reschedule if user is creator */
  const handleEventDrop = async ({ event, revert }) => {
    const raw = rawEvents.find((e) => String(e._id) === event.id);
    if (!raw) { revert(); return; }
    if (raw.isTaskDeadline) { revert(); toast.error('Task deadlines can only be changed from the Kanban Board.'); return; }
    if (raw.creator?._id !== currentUser._id && raw.creator !== currentUser._id) {
      revert(); toast.error('Only the event creator can reschedule it.'); return;
    }
    try {
      const data = await updateEvent(workspaceId, raw._id, {
        start: event.start.toISOString(),
        end: (event.end || event.start).toISOString(),
      });
      setRawEvents((prev) => prev.map((e) => String(e._id) === String(data.event._id) ? data.event : e));
      setFcEvents((prev) => prev.map((e) => e.id === String(data.event._id) ? toFCEvent(data.event) : e));
      toast.success('Event rescheduled!');
    } catch {
      revert();
      toast.error('Failed to reschedule event.');
    }
  };

  /* ── Modal save ──────────────────────────────────────────────────────── */
  const handleSave = async (formData) => {
    setIsSaving(true);
    const toastId = toast.loading(activeEvent ? 'Updating event…' : 'Creating event…');
    try {
      if (activeEvent && !activeEvent.isTaskDeadline) {
        // Update
        const data = await updateEvent(workspaceId, activeEvent._id, formData);
        setRawEvents((prev) => prev.map((e) => String(e._id) === String(data.event._id) ? data.event : e));
        setFcEvents((prev) => prev.map((e) => e.id === String(data.event._id) ? toFCEvent(data.event) : e));
        toast.success('Event updated! 🎉', { id: toastId });
      } else {
        // Create
        const data = await createEvent(workspaceId, formData);
        setRawEvents((prev) => [data.event, ...prev]);
        setFcEvents((prev) => [toFCEvent(data.event), ...prev]);
        toast.success('Event created! 🎉', { id: toastId });
      }
      setModalOpen(false);
      setActiveEvent(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed.', { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  /* ── Modal delete ────────────────────────────────────────────────────── */
  const handleDelete = async () => {
    if (!activeEvent) return;
    if (!window.confirm(`Delete "${activeEvent.title}"?`)) return;
    const toastId = toast.loading('Deleting event…');
    try {
      await deleteEvent(workspaceId, activeEvent._id);
      setRawEvents((prev) => prev.filter((e) => String(e._id) !== String(activeEvent._id)));
      setFcEvents((prev) => prev.filter((e) => e.id !== String(activeEvent._id)));
      toast.success('Event deleted.', { id: toastId });
      setModalOpen(false);
      setActiveEvent(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed.', { id: toastId });
    }
  };

  /* ── Legend config ───────────────────────────────────────────────────── */
  const LEGEND = [
    { label: 'Event',     color: '#8b5cf6' },
    { label: 'Meeting',   color: '#3b82f6' },
    { label: 'Other',     color: '#64748b' },
    { label: 'Deadline',  color: '#ef4444' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '1rem', animation: 'slideUp 0.3s ease both' }}>

      {/* ── Scoped FullCalendar styles ─────────────────────────────────── */}
      <style>{`
        .fc { font-family: var(--font-sans) !important; }
        .fc .fc-toolbar { display: none !important; }
        .fc .fc-daygrid-day { cursor: pointer; }
        .fc .fc-daygrid-day:hover { background: rgba(139,92,246,0.04) !important; }
        .fc .fc-daygrid-day-number { color: var(--color-text-secondary) !important; font-size: 0.75rem; padding: 4px 6px !important; }
        .fc .fc-col-header-cell { background: rgba(255,255,255,0.02) !important; border-color: rgba(255,255,255,0.07) !important; }
        .fc .fc-col-header-cell-cushion { color: var(--color-text-muted) !important; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; text-decoration: none !important; }
        .fc .fc-daygrid-day-frame { min-height: 80px; }
        .fc-theme-standard td, .fc-theme-standard th { border-color: rgba(255,255,255,0.07) !important; }
        .fc-theme-standard .fc-scrollgrid { border-color: rgba(255,255,255,0.07) !important; }
        .fc .fc-daygrid-day.fc-day-today { background: rgba(139,92,246,0.06) !important; }
        .fc .fc-daygrid-day.fc-day-today .fc-daygrid-day-number { color: var(--color-accent-light) !important; font-weight: 700; }
        .fc .fc-event { border-radius: 5px !important; font-size: 0.72rem !important; font-weight: 600 !important; padding: 1px 4px !important; cursor: pointer !important; }
        .fc .fc-event:hover { filter: brightness(1.12) !important; }
        .fc .fc-timegrid-slot { height: 32px !important; }
        .fc .fc-timegrid-slot-label-cushion { color: var(--color-text-muted) !important; font-size: 0.7rem; }
        .fc .fc-timegrid-now-indicator-line { border-color: var(--color-accent) !important; }
        .fc .fc-timegrid-now-indicator-arrow { border-top-color: var(--color-accent) !important; }
        .fc .fc-highlight { background: rgba(139,92,246,0.12) !important; }
        .fc .fc-more-link { color: var(--color-accent-light) !important; font-size: 0.68rem; }
        .fc .fc-daygrid-event-harness { margin-bottom: 1px; }
        .fc .fc-button { display: none !important; }
        .fc-scrollgrid-liquid { height: 100% !important; }
      `}</style>

      {/* ── Custom Top Toolbar ─────────────────────────────────────────── */}
      <div style={{
        background: 'var(--color-bg-card)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '0.875rem 1.25rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem',
      }}>
        {/* Left: Nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button onClick={() => navigate('prev')} style={navBtnStyle()}>
            <ChevronLeft size={16} />
          </button>
          <button onClick={goToday} style={navBtnStyle()}>Today</button>
          <button onClick={() => navigate('next')} style={navBtnStyle()}>
            <ChevronRight size={16} />
          </button>
          <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#fff', marginLeft: '0.25rem' }}>
            {currentTitle}
          </span>
        </div>

        {/* Center: View switcher */}
        <div style={{
          display: 'flex', background: 'rgba(255,255,255,0.03)',
          border: '1px solid var(--color-border)', borderRadius: 8, padding: '2px', gap: 0,
        }}>
          {[
            { id: 'dayGridMonth', label: 'Month', icon: <LayoutGrid size={13} /> },
            { id: 'timeGridWeek', label: 'Week',  icon: <Calendar size={13} /> },
            { id: 'timeGridDay',  label: 'Day',   icon: <Clock size={13} /> },
          ].map((v) => (
            <button
              key={v.id}
              onClick={() => switchView(v.id)}
              style={{
                padding: '0.3rem 0.75rem', borderRadius: 6, fontSize: '0.78rem', fontWeight: 600,
                border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                background: currentView === v.id ? 'var(--gradient-brand)' : 'transparent',
                color: currentView === v.id ? '#fff' : 'var(--color-text-secondary)',
                transition: 'all 0.15s ease',
              }}
            >
              {v.icon} {v.label}
            </button>
          ))}
        </div>

        {/* Right: Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button onClick={fetchEvents} style={navBtnStyle()} title="Refresh">
            <RefreshCw size={13} />
          </button>
          <button
            onClick={() => { setActiveEvent(null); setDefaultStart(new Date()); setDefaultEnd(new Date()); setDefaultAllDay(false); setModalOpen(true); }}
            style={{
              padding: '0.4rem 0.875rem', borderRadius: 8, border: 'none', background: 'var(--gradient-brand)',
              color: '#fff', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '0.375rem',
            }}
          >
            <Plus size={13} /> Add Event
          </button>
        </div>
      </div>

      {/* ── Legend ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', paddingLeft: '0.25rem', flexWrap: 'wrap' }}>
        {LEGEND.map((l) => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: l.color, display: 'inline-block' }} />
            {l.label}
          </div>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
          💡 Click a date to create • Drag events to reschedule
        </span>
      </div>

      {/* ── Calendar grid ──────────────────────────────────────────────── */}
      <div style={{
        flex: 1, background: 'var(--color-bg-secondary)',
        border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)',
        overflow: 'hidden', padding: '0.75rem',
        minHeight: 480, position: 'relative',
      }}>
        {loading && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(10,11,15,0.6)', borderRadius: 'var(--radius-lg)',
          }}>
            <Spinner />
          </div>
        )}
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={false}
          events={fcEvents}
          selectable
          selectMirror
          editable
          dayMaxEvents={3}
          nowIndicator
          height="100%"
          select={handleDateSelect}
          eventClick={handleEventClick}
          eventDrop={handleEventDrop}
          datesSet={syncTitle}
          eventContent={renderEventContent}
        />
      </div>

      {/* ── Event Modal ─────────────────────────────────────────────────── */}
      <EventModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setActiveEvent(null); }}
        onSave={handleSave}
        onDelete={activeEvent && !activeEvent.isTaskDeadline ? handleDelete : null}
        event={activeEvent}
        defaultStart={defaultStart}
        defaultEnd={defaultEnd}
        defaultAllDay={defaultAllDay}
        currentUser={currentUser}
        isSaving={isSaving}
      />

      {/* ── Meeting jump banner (shown only when a meeting event is active in modal) */}
      {modalOpen && activeEvent?.type === 'meeting' && !activeEvent.isTaskDeadline && onSwitchTab && (
        <div
          style={{
            position: 'fixed', bottom: '5rem', left: '50%', transform: 'translateX(-50%)',
            zIndex: 1001, background: 'rgba(59,130,246,0.12)',
            border: '1px solid rgba(59,130,246,0.4)', borderRadius: 12,
            padding: '0.625rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem',
            backdropFilter: 'blur(12px)',
          }}
        >
          <span style={{ fontSize: '0.8rem', color: '#93c5fd' }}>📹 This is a meeting event.</span>
          <button
            onClick={() => { setModalOpen(false); onSwitchTab('meeting'); }}
            style={{
              padding: '0.3rem 0.75rem', borderRadius: 6, border: 'none',
              background: '#3b82f6', color: '#fff', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
            }}
          >
            Join Video Call
          </button>
        </div>
      )}

    </div>
  );
};

/* ── Helpers ────────────────────────────────────────────────────────────── */
function navBtnStyle() {
  return {
    padding: '0.35rem 0.625rem', borderRadius: 7, fontSize: '0.78rem', fontWeight: 600,
    border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)',
    color: 'var(--color-text-secondary)', cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
    transition: 'all 0.15s ease',
  };
}

/** Custom event pill rendering */
function renderEventContent(eventInfo) {
  const { type } = eventInfo.event.extendedProps;
  const icon = type === 'meeting' ? '📹' : type === 'deadline' ? '📌' : '📅';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '3px', overflow: 'hidden', padding: '0 2px' }}>
      <span style={{ fontSize: '0.65rem', flexShrink: 0 }}>{icon}</span>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.7rem', fontWeight: 600 }}>
        {eventInfo.event.title}
      </span>
    </div>
  );
}

export default WorkspaceCalendar;
