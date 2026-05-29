import { useState, useEffect, useRef } from 'react';
import { 
  FileText, 
  Plus, 
  Search, 
  Share2, 
  Trash2, 
  Save, 
  Eye, 
  Edit, 
  User, 
  Globe, 
  Lock, 
  CheckCircle, 
  AlertCircle 
} from 'lucide-react';
import toast from 'react-hot-toast';
import { marked } from 'marked';
import Prism from 'prismjs';

// Import Prism theme & standard language support
import 'prismjs/themes/prism-tomorrow.css';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-json';

import { 
  getNotes, 
  createNote, 
  updateNote, 
  deleteNote 
} from '../api/note';
import Spinner from './Spinner';

// Configure marked options
marked.setOptions({
  breaks: true,
  gfm: true
});

const WorkspaceNotes = ({ workspaceId, currentUser, workspace }) => {
  const [notes, setNotes] = useState([]);
  const [activeNote, setActiveNote] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // all, my-notes, shared, drafts
  const [loading, setLoading] = useState(true);

  // Local editor buffer state to avoid input lag
  const [titleInput, setTitleInput] = useState('');
  const [contentInput, setContentInput] = useState('');
  
  // Save status states
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [saveStatus, setSaveStatus] = useState('saved'); // saved, unsaved, saving

  const autoSaveTimeoutRef = useRef(null);
  const activeNoteIdRef = useRef(null);

  // Load all workspace notes
  const fetchNotes = async (selectNoteId = null) => {
    try {
      const data = await getNotes(workspaceId);
      setNotes(data.notes);
      
      if (selectNoteId) {
        const found = data.notes.find(n => n._id === selectNoteId);
        if (found) {
          selectNote(found);
        }
      } else if (data.notes.length > 0 && !activeNote) {
        // Default to first note if none is active
        selectNote(data.notes[0]);
      }
    } catch (err) {
      toast.error('Failed to load notes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (workspaceId) {
      setLoading(true);
      fetchNotes();
    }
    // Cleanup pending auto-saves on unmount or workspace change
    return () => {
      if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
    };
  }, [workspaceId]);

  // Run Prism highlighting when content rendering changes
  useEffect(() => {
    Prism.highlightAll();
  }, [contentInput, activeNote]);

  // Handle active note selection
  const selectNote = (note) => {
    // If there are unsaved changes, save them immediately before switching
    if (hasChanges && activeNote) {
      saveNoteImmediately(activeNote._id, titleInput, contentInput);
    }

    if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);

    setActiveNote(note);
    activeNoteIdRef.current = note._id;
    setTitleInput(note.title);
    setContentInput(note.content || '');
    setHasChanges(false);
    setSaveStatus('saved');
  };

  // Helper: Immediate Save
  const saveNoteImmediately = async (noteId, title, content) => {
    try {
      const data = await updateNote(workspaceId, noteId, {
        title: title,
        content: content,
        isDraft: false // saving manually/auto-saving marks it as fully saved draft details
      });
      // Update notes list inline
      setNotes(prev => prev.map(n => n._id === noteId ? data.note : n));
    } catch (err) {
      console.error('Failed immediate save:', err);
    }
  };

  // Triggered on Editor Inputs Change
  const handleTitleChange = (e) => {
    const val = e.target.value;
    setTitleInput(val);
    setHasChanges(true);
    setSaveStatus('unsaved');
    triggerAutoSave(val, contentInput);
  };

  const handleContentChange = (e) => {
    const val = e.target.value;
    setContentInput(val);
    setHasChanges(true);
    setSaveStatus('unsaved');
    triggerAutoSave(titleInput, val);
  };

  // Debounced Auto-Save
  const triggerAutoSave = (title, content) => {
    if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);

    setSaveStatus('unsaved');
    autoSaveTimeoutRef.current = setTimeout(async () => {
      if (!activeNoteIdRef.current) return;
      
      setSaveStatus('saving');
      try {
        const data = await updateNote(workspaceId, activeNoteIdRef.current, {
          title: title.trim() || 'Untitled Note',
          content: content,
        });

        // Update active note in memory and list
        setNotes(prev => prev.map(n => n._id === activeNoteIdRef.current ? data.note : n));
        
        // Only update activeNote object if the ID hasn't switched during the async call
        if (activeNoteIdRef.current === data.note._id) {
          setActiveNote(data.note);
          setHasChanges(false);
          setSaveStatus('saved');
        }
      } catch (err) {
        setSaveStatus('unsaved');
        console.error('Auto-save error:', err);
      }
    }, 1500); // 1.5 second debounce delay
  };

  // Manual Save handler
  const handleManualSave = async () => {
    if (!activeNote) return;
    if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);

    setIsSaving(true);
    setSaveStatus('saving');
    const toastId = toast.loading('Saving note...');
    try {
      const data = await updateNote(workspaceId, activeNote._id, {
        title: titleInput.trim() || 'Untitled Note',
        content: contentInput,
        isDraft: false, // Save draft makes it a published/finalized note state
      });
      
      setNotes(prev => prev.map(n => n._id === activeNote._id ? data.note : n));
      setActiveNote(data.note);
      setTitleInput(data.note.title);
      setHasChanges(false);
      setSaveStatus('saved');
      toast.success('Note saved successfully! 🎉', { id: toastId });
    } catch (err) {
      setSaveStatus('unsaved');
      toast.error(err.response?.data?.message || 'Failed to save note.', { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle Sharing
  const handleToggleShare = async () => {
    if (!activeNote) return;
    const nextShareState = !activeNote.isShared;
    const toastId = toast.loading(nextShareState ? 'Sharing note with workspace...' : 'Making note private...');
    try {
      const data = await updateNote(workspaceId, activeNote._id, {
        isShared: nextShareState
      });
      setNotes(prev => prev.map(n => n._id === activeNote._id ? data.note : n));
      setActiveNote(data.note);
      toast.success(
        nextShareState 
          ? 'Shared! Now anyone in this workspace can view and edit this note. 👥' 
          : 'Note is now private to you. 🔒', 
        { id: toastId }
      );
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to toggle share state.', { id: toastId });
    }
  };

  // Create Note
  const handleCreateNote = async () => {
    const toastId = toast.loading('Creating draft note...');
    try {
      const data = await createNote(workspaceId, {
        title: 'Untitled Note',
        content: '# Untitled Note\n\nStart writing in markdown...',
        isDraft: true,
        isShared: false
      });
      
      // Prepend to notes list
      setNotes(prev => [data.note, ...prev]);
      selectNote(data.note);
      toast.success('New draft note created! 📝', { id: toastId });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create note.', { id: toastId });
    }
  };

  // Delete Note
  const handleDeleteNote = async () => {
    if (!activeNote) return;
    const confirmation = window.confirm(`Delete the note "${activeNote.title}"?`);
    if (!confirmation) return;

    const toastId = toast.loading('Deleting note...');
    try {
      await deleteNote(workspaceId, activeNote._id);
      toast.success('Note deleted.', { id: toastId });
      
      // Update list and clear active selection
      const remainingNotes = notes.filter(n => n._id !== activeNote._id);
      setNotes(remainingNotes);
      
      if (remainingNotes.length > 0) {
        selectNote(remainingNotes[0]);
      } else {
        setActiveNote(null);
        setTitleInput('');
        setContentInput('');
        activeNoteIdRef.current = null;
        setHasChanges(false);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete note.', { id: toastId });
    }
  };

  // Filter notes based on active sidebar tab
  const getFilteredNotes = () => {
    let result = [...notes];
    
    // Apply search filter
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        n => n.title.toLowerCase().includes(query) || 
             (n.content && n.content.toLowerCase().includes(query))
      );
    }

    // Apply sidebar tab filters
    switch (activeFilter) {
      case 'my-notes':
        result = result.filter(n => n.creator._id === currentUser._id);
        break;
      case 'shared':
        result = result.filter(n => n.isShared);
        break;
      case 'drafts':
        result = result.filter(n => n.isDraft);
        break;
      default:
        break;
    }

    return result;
  };

  // Markdown parsing helper
  const getParsedMarkdown = () => {
    try {
      return { __html: marked.parse(contentInput) };
    } catch (e) {
      return { __html: '<p style="color:var(--color-error)">Markdown compilation error</p>' };
    }
  };

  const filteredNotes = getFilteredNotes();

  // Helper to format date relative
  const formatNoteDate = (updatedAt) => {
    if (!updatedAt) return '';
    const date = new Date(updatedAt);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '260px 1fr',
      gap: '1.25rem',
      flex: 1,
      minHeight: '480px',
      height: 'calc(100vh - 200px)',
      animation: 'slideUp 0.3s ease both'
    }}>
      
      {/* ─── SCOPED PREVIEW STYLES ──────────────────────────────────── */}
      <style>{`
        .markdown-preview h1 {
          font-size: 1.6rem;
          font-weight: 800;
          color: #ffffff;
          margin-top: 1.25rem;
          margin-bottom: 0.75rem;
          border-bottom: 1px solid var(--color-border);
          padding-bottom: 0.3rem;
        }
        .markdown-preview h2 {
          font-size: 1.3rem;
          font-weight: 700;
          color: #ffffff;
          margin-top: 1.25rem;
          margin-bottom: 0.5rem;
        }
        .markdown-preview h3 {
          font-size: 1.15rem;
          font-weight: 600;
          color: #ffffff;
          margin-top: 1rem;
          margin-bottom: 0.5rem;
        }
        .markdown-preview p {
          margin-bottom: 0.875rem;
          color: var(--color-text-primary);
          font-size: 0.875rem;
          line-height: 1.6;
        }
        .markdown-preview code {
          font-family: Consolas, Monaco, 'Andale Mono', monospace;
          background: rgba(255,255,255,0.06);
          padding: 0.15rem 0.35rem;
          border-radius: 4px;
          font-size: 0.85em;
          color: var(--color-accent-light);
        }
        .markdown-preview pre {
          background: #14161f !important;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          padding: 0.875rem;
          margin-bottom: 1rem;
          overflow-x: auto;
        }
        .markdown-preview pre code {
          background: transparent;
          padding: 0;
          color: inherit;
          font-size: 0.825rem;
        }
        .markdown-preview ul, .markdown-preview ol {
          margin-bottom: 0.875rem;
          padding-left: 1.25rem;
        }
        .markdown-preview ul {
          list-style-type: disc;
        }
        .markdown-preview ol {
          list-style-type: decimal;
        }
        .markdown-preview li {
          margin-bottom: 0.25rem;
          font-size: 0.875rem;
        }
        .markdown-preview blockquote {
          border-left: 3px solid var(--color-accent);
          padding-left: 0.875rem;
          color: var(--color-text-secondary);
          font-style: italic;
          margin: 0.875rem 0;
          background: rgba(255,255,255,0.01);
          padding-top: 0.25rem;
          padding-bottom: 0.25rem;
        }
        .markdown-preview table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 1rem;
          font-size: 0.825rem;
        }
        .markdown-preview th, .markdown-preview td {
          border: 1px solid var(--color-border);
          padding: 0.4rem 0.6rem;
          text-align: left;
        }
        .markdown-preview th {
          background: rgba(255,255,255,0.02);
          color: #ffffff;
          font-weight: 600;
        }
        .markdown-preview hr {
          border: 0;
          height: 1px;
          background: var(--color-border);
          margin: 1.5rem 0;
        }
      `}</style>

      {/* ─── SIDEBAR: NOTES DIRECTORY ─────────────────────────────────── */}
      <div style={{
        background: 'var(--color-bg-secondary)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Sidebar Header: Action button */}
        <div style={{ padding: '1rem', borderBottom: '1px solid var(--color-border)' }}>
          <button
            onClick={handleCreateNote}
            className="btn-primary"
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.8rem',
              gap: '0.375rem',
              borderRadius: 'var(--radius-md)',
              width: '100%'
            }}
          >
            <Plus size={14} />
            New Note
          </button>
        </div>

        {/* Search Notes bar */}
        <div style={{ padding: '0.75rem 1rem', position: 'relative' }}>
          <Search size={13} style={{ position: 'absolute', left: '1.5rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
          <input
            type="text"
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              background: 'rgba(0,0,0,0.2)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              padding: '0.35rem 0.75rem 0.35rem 1.875rem',
              fontSize: '0.75rem',
              color: '#fff',
              outline: 'none',
              transition: 'var(--transition-fast)'
            }}
          />
        </div>

        {/* Sidebar Tab filters */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          padding: '0 0.5rem',
          borderBottom: '1px solid var(--color-border)',
          fontSize: '0.675rem',
          textAlign: 'center',
          color: 'var(--color-text-muted)'
        }}>
          {['all', 'my-notes', 'shared', 'drafts'].map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              style={{
                padding: '0.5rem 0',
                borderBottom: activeFilter === f ? '2px solid var(--color-accent-light)' : '2px solid transparent',
                color: activeFilter === f ? '#fff' : 'var(--color-text-secondary)',
                fontWeight: activeFilter === f ? 700 : 500,
                cursor: 'pointer',
                background: 'none',
                borderTop: 'none',
                borderLeft: 'none',
                borderRight: 'none',
                textTransform: 'capitalize'
              }}
            >
              {f === 'my-notes' ? 'mine' : f}
            </button>
          ))}
        </div>

        {/* Notes Items List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }} className="scrollbar">
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem 0' }}>
              <Spinner style={{ width: 18, height: 18 }} />
            </div>
          ) : filteredNotes.length === 0 ? (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
              No notes found.
            </div>
          ) : (
            filteredNotes.map(n => {
              const isActive = activeNote && activeNote._id === n._id;
              
              return (
                <div
                  key={n._id}
                  onClick={() => selectNote(n)}
                  style={{
                    padding: '0.75rem 0.875rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    marginBottom: '0.375rem',
                    background: isActive ? 'var(--color-accent-subtle)' : 'transparent',
                    border: isActive ? '1px solid rgba(139,92,246,0.2)' : '1px solid transparent',
                    transition: 'var(--transition-fast)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.25rem'
                  }}
                  className={!isActive ? 'file-card-hover' : ''}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <span style={{ 
                      fontSize: '0.8rem', 
                      fontWeight: isActive ? 700 : 600, 
                      color: isActive ? '#fff' : 'var(--color-text-primary)',
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis', 
                      whiteSpace: 'nowrap',
                      flex: 1
                    }}>
                      {n.title || 'Untitled Note'}
                    </span>
                    <span style={{ fontSize: '0.6rem', color: 'var(--color-text-muted)', flexShrink: 0 }}>
                      {formatNoteDate(n.updatedAt)}
                    </span>
                  </div>
                  
                  {/* Truncated Body Snippet */}
                  <span style={{ 
                    fontSize: '0.675rem', 
                    color: 'var(--color-text-secondary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {n.content ? n.content.replace(/[#*`_\-\[\]]/g, '') : 'No additional content.'}
                  </span>

                  {/* Badges Footer */}
                  <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.125rem' }}>
                    {n.isShared ? (
                      <span style={{
                        fontSize: '0.55rem',
                        padding: '0.05rem 0.35rem',
                        background: 'rgba(16,185,129,0.1)',
                        border: '1px solid rgba(16,185,129,0.3)',
                        borderRadius: '4px',
                        color: 'var(--color-success)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.15rem'
                      }}>
                        <Globe size={7} /> Shared
                      </span>
                    ) : (
                      <span style={{
                        fontSize: '0.55rem',
                        padding: '0.05rem 0.35rem',
                        background: 'rgba(100,116,139,0.1)',
                        border: '1px solid rgba(100,116,139,0.2)',
                        borderRadius: '4px',
                        color: 'var(--color-text-secondary)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.15rem'
                      }}>
                        <Lock size={7} /> Private
                      </span>
                    )}

                    {n.isDraft && (
                      <span style={{
                        fontSize: '0.55rem',
                        padding: '0.05rem 0.35rem',
                        background: 'rgba(245,158,11,0.1)',
                        border: '1px solid rgba(245,158,11,0.3)',
                        borderRadius: '4px',
                        color: 'var(--color-warning)'
                      }}>
                        Draft
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ─── MAIN WORKSPACE: EDITOR & LIVE PREVIEW ──────────────────── */}
      <div style={{
        background: 'var(--color-bg-card)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {!activeNote ? (
          /* Empty Workspace Detail state */
          <div style={{
            margin: 'auto',
            textAlign: 'center',
            color: 'var(--color-text-muted)',
            maxWidth: '300px',
            padding: '2rem'
          }}>
            <FileText size={42} color="var(--color-accent-light)" style={{ margin: '0 auto 1rem', opacity: 0.7 }} />
            <h3 style={{ color: '#fff', fontSize: '1rem', fontWeight: 800, marginBottom: '0.5rem' }}>Select a Note</h3>
            <p style={{ fontSize: '0.8rem', lineHeight: 1.5 }}>
              Choose an existing note from the sidebar directory, or click **"New Note"** to launch the editor.
            </p>
          </div>
        ) : (
          /* Editor Workstation Container */
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            
            {/* Editor Action Header Bar */}
            <div style={{
              padding: '0.75rem 1.25rem',
              borderBottom: '1px solid var(--color-border)',
              background: 'rgba(255,255,255,0.01)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem'
            }}>
              
              {/* Note Ownership & Title details */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                <FileText size={16} color="var(--color-accent-light)" />
                <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                  Created by <strong style={{ color: 'var(--color-text-secondary)' }}>{activeNote.creator.profile?.nickname || activeNote.creator.username}</strong>
                </span>
                
                {/* Auto-Save status badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.675rem' }}>
                  {saveStatus === 'saved' && (
                    <span style={{ color: 'var(--color-success)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                      <CheckCircle size={10} /> Saved
                    </span>
                  )}
                  {saveStatus === 'unsaved' && (
                    <span style={{ color: 'var(--color-warning)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                      <AlertCircle size={10} /> Unsaved edits
                    </span>
                  )}
                  {saveStatus === 'saving' && (
                    <span style={{ color: 'var(--color-text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                      <span className="spinner" style={{ width: 8, height: 8, borderWidth: 1 }}></span> Auto-saving...
                    </span>
                  )}
                </div>
              </div>

              {/* Note actions toolbar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                
                {/* Share note button (Only available to note creator) */}
                {activeNote.creator._id === currentUser._id && (
                  <button
                    onClick={handleToggleShare}
                    style={{
                      padding: '0.35rem 0.75rem',
                      background: activeNote.isShared ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.03)',
                      border: activeNote.isShared ? '1px solid rgba(16,185,129,0.3)' : '1px solid var(--color-border)',
                      borderRadius: '8px',
                      color: activeNote.isShared ? 'var(--color-success)' : 'var(--color-text-primary)',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      transition: 'var(--transition-fast)'
                    }}
                    title={activeNote.isShared ? "Stop sharing this note with others" : "Allow everyone in this workspace to read and edit this note"}
                  >
                    <Share2 size={12} />
                    {activeNote.isShared ? 'Shared' : 'Share'}
                  </button>
                )}

                {/* Manual Save changes button */}
                <button
                  onClick={handleManualSave}
                  disabled={isSaving || !hasChanges}
                  style={{
                    padding: '0.35rem 0.75rem',
                    background: hasChanges ? 'var(--gradient-brand)' : 'rgba(255,255,255,0.02)',
                    border: 'none',
                    borderRadius: '8px',
                    color: hasChanges ? '#fff' : 'var(--color-text-muted)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: hasChanges ? 'pointer' : 'not-allowed',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    transition: 'var(--transition-fast)'
                  }}
                  title="Save note updates manually"
                >
                  <Save size={12} />
                  Save Note
                </button>

                {/* Delete note button (Allowed for creator or workspace admin) */}
                {(activeNote.creator._id === currentUser._id || workspace.owner === currentUser._id) && (
                  <button
                    onClick={handleDeleteNote}
                    style={{
                      padding: '0.35rem',
                      background: 'rgba(239, 68, 68, 0.05)',
                      border: '1px solid rgba(239, 68, 68, 0.1)',
                      borderRadius: '8px',
                      color: 'var(--color-error)',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'var(--transition-fast)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                      e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(239, 68, 68, 0.05)';
                      e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.1)';
                    }}
                    title="Delete Note"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            </div>

            {/* Note title editable header */}
            <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--color-border)' }}>
              <input
                type="text"
                value={titleInput}
                onChange={handleTitleChange}
                placeholder="Note Title..."
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  fontSize: '1.2rem',
                  fontWeight: 800,
                  color: '#fff',
                  outline: 'none',
                  padding: 0
                }}
              />
            </div>

            {/* Split Editor + Live Preview screen panes */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', flex: 1, overflow: 'hidden' }}>
              
              {/* LEFT SIDE: TEXT EDITOR */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                borderRight: '1px solid var(--color-border)',
                overflow: 'hidden'
              }}>
                <div style={{
                  padding: '0.35rem 0.75rem',
                  background: 'rgba(255,255,255,0.01)',
                  borderBottom: '1px solid var(--color-border)',
                  fontSize: '0.675rem',
                  color: 'var(--color-text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}>
                  <Edit size={10} /> Editor (Markdown)
                </div>
                <textarea
                  value={contentInput}
                  onChange={handleContentChange}
                  placeholder="Start writing markdown content... (Use # for title, **bold**, *italic*, ```lang for code blocks, etc.)"
                  style={{
                    width: '100%',
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    resize: 'none',
                    padding: '1.25rem',
                    fontSize: '0.875rem',
                    fontFamily: "Consolas, Monaco, 'Andale Mono', monospace",
                    color: '#e2e8f0',
                    outline: 'none',
                    lineHeight: 1.6,
                    overflowY: 'auto'
                  }}
                  className="scrollbar"
                />
              </div>

              {/* RIGHT SIDE: LIVE PREVIEW */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
              }}>
                <div style={{
                  padding: '0.35rem 0.75rem',
                  background: 'rgba(255,255,255,0.01)',
                  borderBottom: '1px solid var(--color-border)',
                  fontSize: '0.675rem',
                  color: 'var(--color-text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}>
                  <Eye size={10} /> Preview (Live Render)
                </div>
                <div
                  dangerouslySetInnerHTML={getParsedMarkdown()}
                  style={{
                    flex: 1,
                    padding: '1.25rem',
                    overflowY: 'auto',
                    background: 'rgba(0,0,0,0.1)'
                  }}
                  className="markdown-preview scrollbar"
                />
              </div>

            </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default WorkspaceNotes;
