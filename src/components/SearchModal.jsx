import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  X, 
  Building, 
  ClipboardList, 
  MessageSquare, 
  User, 
  CornerDownLeft,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import toast from 'react-hot-toast';
import { searchGlobal } from '../api/search';
import Spinner from './Spinner';

/**
 * SearchModal Component
 * Implements a premium, Spotlight-style global search overlay.
 * Handles instant search debouncing, keyboard arrows navigation, and shortcuts.
 */
const SearchModal = ({ isOpen, onClose, onSelectWorkspace }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all', 'workspaces', 'tasks', 'messages', 'users'
  const [results, setResults] = useState({ workspaces: [], tasks: [], messages: [], users: [] });
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const inputRef = useRef(null);
  const scrollContainerRef = useRef(null);

  // Auto-focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults({ workspaces: [], tasks: [], messages: [], users: [] });
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Debounced search logic
  useEffect(() => {
    if (!isOpen) return;
    if (!query.trim()) {
      setResults({ workspaces: [], tasks: [], messages: [], users: [] });
      return;
    }

    setLoading(true);
    const delayDebounce = setTimeout(async () => {
      try {
        const data = await searchGlobal(query, filterType, '', 1, 30);
        setResults(data.results);
        setSelectedIndex(0);
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [query, filterType, isOpen]);

  // Flatten results for keyboard arrow indexing
  const getFlatResults = () => {
    const list = [];
    
    if (results.workspaces) {
      results.workspaces.forEach(item => list.push({ ...item, searchCategory: 'workspace' }));
    }
    if (results.tasks) {
      results.tasks.forEach(item => list.push({ ...item, searchCategory: 'task' }));
    }
    if (results.messages) {
      results.messages.forEach(item => list.push({ ...item, searchCategory: 'message' }));
    }
    if (results.users) {
      results.users.forEach(item => list.push({ ...item, searchCategory: 'user' }));
    }

    return list;
  };

  const flatResults = getFlatResults();

  // Navigate to selected search result
  const handleItemClick = (item) => {
    onClose();
    if (item.searchCategory === 'workspace') {
      onSelectWorkspace(item._id, 'chat');
    } else if (item.searchCategory === 'task') {
      onSelectWorkspace(item.workspace?._id || item.workspace, 'kanban');
    } else if (item.searchCategory === 'message') {
      onSelectWorkspace(item.workspace?._id || item.workspace, 'chat');
    } else if (item.searchCategory === 'user') {
      navigate(`/profile/${item.username}`);
    }
  };

  // Keyboard navigation inside search results
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, flatResults.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (flatResults[selectedIndex]) {
          handleItemClick(flatResults[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, flatResults, selectedIndex]);

  // Scroll active item into view
  useEffect(() => {
    if (scrollContainerRef.current) {
      const activeEl = scrollContainerRef.current.querySelector('[data-active="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  const getBackendUrl = () => {
    return window.location.hostname === 'localhost' 
      ? 'http://localhost:5000' 
      : window.location.origin;
  };

  const getAvatarUrl = (avatarPath) => {
    if (!avatarPath) return null;
    if (avatarPath.startsWith('http://') || avatarPath.startsWith('https://')) {
      return avatarPath;
    }
    return `${getBackendUrl()}${avatarPath}`;
  };

  // Render Category Icon
  const getItemIcon = (category) => {
    switch (category) {
      case 'workspace':
        return <Building size={16} color="var(--color-accent-light)" />;
      case 'task':
        return <ClipboardList size={16} color="var(--color-success)" />;
      case 'message':
        return <MessageSquare size={16} color="var(--color-warning)" />;
      case 'user':
        return <User size={16} color="#ec4899" />;
      default:
        return <Search size={16} />;
    }
  };

  return (
    <div 
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(5, 5, 8, 0.75)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'start',
        justifyContent: 'center',
        paddingTop: '12vh',
        zIndex: 2000,
        paddingLeft: '1rem',
        paddingRight: '1rem'
      }}
    >
      {/* Modal Dialog Card */}
      <div 
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '650px',
          width: '100%',
          background: '#0d0f14',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg), var(--shadow-glow)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          animation: 'scaleUp 0.15s cubic-bezier(0.16, 1, 0.3, 1) both'
        }}
      >
        {/* Search Input field */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.875rem 1.25rem',
          borderBottom: '1px solid var(--color-border)'
        }}>
          <Search size={18} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
          <input 
            ref={inputRef}
            type="text"
            placeholder="Search workspaces, tasks, messages, coworkers..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              width: '100%',
              background: 'none',
              border: 'none',
              color: '#fff',
              fontSize: '0.9375rem',
              outline: 'none'
            }}
          />
          <button 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
              display: 'flex',
              padding: '0.25rem',
              borderRadius: '4px',
              transition: 'var(--transition-fast)'
            }}
            className="hover:bg-white/5 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        {/* Filters Tabs bar */}
        <div style={{
          display: 'flex',
          gap: '0.25rem',
          padding: '0.375rem 1rem',
          background: 'rgba(255,255,255,0.01)',
          borderBottom: '1px solid var(--color-border)',
          overflowX: 'auto'
        }}>
          {[
            { label: 'All Results', val: 'all' },
            { label: 'Workspaces', val: 'workspaces' },
            { label: 'Tasks', val: 'tasks' },
            { label: 'Chat Messages', val: 'messages' },
            { label: 'Teammates', val: 'users' }
          ].map(tab => (
            <button
              key={tab.val}
              onClick={() => setFilterType(tab.val)}
              style={{
                padding: '0.25rem 0.625rem',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                border: 'none',
                transition: 'all 0.15s ease',
                background: filterType === tab.val ? 'var(--color-accent-subtle)' : 'transparent',
                color: filterType === tab.val ? 'var(--color-accent-light)' : 'var(--color-text-muted)'
              }}
              className="hover:text-white"
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Results Container */}
        <div 
          ref={scrollContainerRef}
          style={{
            maxHeight: '360px',
            overflowY: 'auto',
            padding: '0.5rem 0'
          }}
        >
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '2.5rem 0' }}>
              <Spinner />
            </div>
          ) : query.trim() === '' ? (
            // Search Modal Welcome Empty State
            <div style={{
              padding: '2.5rem 1.5rem',
              textAlign: 'center',
              color: 'var(--color-text-muted)',
              fontSize: '0.8rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <Search size={22} style={{ opacity: 0.3 }} />
              <span>Search everything across your organization</span>
              <div style={{ 
                display: 'flex', 
                gap: '1rem', 
                marginTop: '1rem', 
                fontSize: '0.7rem', 
                color: 'var(--color-text-muted)',
                opacity: 0.8
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <kbd style={{ background: '#1c1f26', padding: '2px 5px', borderRadius: 4, border: '1px solid var(--color-border)' }}>↑↓</kbd> Navigate
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <kbd style={{ background: '#1c1f26', padding: '2px 5px', borderRadius: 4, border: '1px solid var(--color-border)' }}>Enter</kbd> Open
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <kbd style={{ background: '#1c1f26', padding: '2px 5px', borderRadius: 4, border: '1px solid var(--color-border)' }}>Esc</kbd> Close
                </span>
              </div>
            </div>
          ) : flatResults.length === 0 ? (
            // Search No Results State
            <div style={{
              padding: '2.5rem 1.5rem',
              textAlign: 'center',
              color: 'var(--color-text-muted)',
              fontSize: '0.8rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.35rem'
            }}>
              <span>No results found matching "<strong>{query}</strong>"</span>
              <span style={{ fontSize: '0.7rem' }}>Verify spelling or adjust filter scope tab criteria.</span>
            </div>
          ) : (
            // Results List
            flatResults.map((item, idx) => {
              const isSelected = selectedIndex === idx;
              
              // Extract display details based on search category
              let title = '';
              let desc = '';
              let categoryLabel = '';
              let avatarPath = null;

              if (item.searchCategory === 'workspace') {
                title = item.name;
                desc = item.description || 'No workspace description provided.';
                categoryLabel = 'Workspace';
              } else if (item.searchCategory === 'task') {
                title = item.title;
                desc = `In ${item.workspace?.name || 'Workspace'} • status: ${item.status}`;
                categoryLabel = 'Task';
              } else if (item.searchCategory === 'message') {
                title = item.sender?.profile?.nickname || item.sender?.username || 'Member';
                desc = item.text;
                categoryLabel = `Chat Message in ${item.workspace?.name || 'Room'}`;
                avatarPath = item.sender?.avatar;
              } else if (item.searchCategory === 'user') {
                title = item.profile?.nickname || item.username;
                desc = item.bio || item.email || 'Coworker Profile';
                categoryLabel = 'Teammate';
                avatarPath = item.avatar;
              }

              return (
                <div
                  key={item._id}
                  data-active={isSelected}
                  onClick={() => handleItemClick(item)}
                  style={{
                    padding: '0.75rem 1.25rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    transition: 'all 0.15s ease',
                    background: isSelected ? 'rgba(139, 92, 246, 0.08)' : 'transparent',
                    borderLeft: `3px solid ${isSelected ? 'var(--color-accent)' : 'transparent'}`
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', minWidth: 0, flex: 1 }}>
                    {/* Left Icon or Avatar */}
                    {avatarPath ? (
                      <img 
                        src={getAvatarUrl(avatarPath)} 
                        alt={title}
                        style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--color-border)', flexShrink: 0 }}
                      />
                    ) : (
                      <div style={{
                        width: 28,
                        height: 28,
                        borderRadius: '6px',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid var(--color-border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        {getItemIcon(item.searchCategory)}
                      </div>
                    )}

                    {/* Content text description */}
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {title}
                      </div>
                      <div style={{ 
                        fontSize: '0.75rem', 
                        color: 'var(--color-text-secondary)', 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis', 
                        whiteSpace: 'nowrap',
                        marginTop: '0.125rem' 
                      }}>
                        {desc}
                      </div>
                    </div>
                  </div>

                  {/* Right Action Hint / Category Label */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                    <span style={{ 
                      fontSize: '0.625rem', 
                      background: 'rgba(255,255,255,0.02)', 
                      border: '1px solid var(--color-border)', 
                      padding: '2px 6px', 
                      borderRadius: 4, 
                      color: 'var(--color-text-muted)' 
                    }}>
                      {categoryLabel}
                    </span>
                    {isSelected && (
                      <span style={{ color: 'var(--color-accent-light)', display: 'flex', alignItems: 'center' }}>
                        <CornerDownLeft size={12} />
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts hint panel */}
        <div style={{
          padding: '0.625rem 1.25rem',
          borderTop: '1px solid var(--color-border)',
          background: 'rgba(0,0,0,0.15)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.675rem',
          color: 'var(--color-text-muted)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <ArrowUp size={10} /> <ArrowDown size={10} /> Navigate
            </span>
            <span>•</span>
            <span><CornerDownLeft size={8} style={{ display: 'inline' }} /> Enter to select</span>
          </div>
          <span>Press ESC to exit</span>
        </div>
      </div>
    </div>
  );
};

export default SearchModal;
