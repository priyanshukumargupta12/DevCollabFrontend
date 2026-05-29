import { useState, useEffect, useRef } from 'react';
import { 
  Clock, 
  Building, 
  Edit3, 
  Trash2, 
  Plus, 
  ClipboardList, 
  UserPlus, 
  UserMinus, 
  Shield, 
  UploadCloud,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getWorkspaceActivities } from '../api/workspace';
import Spinner from './Spinner';
import { getBackendUrl } from '../api/axios';

/**
 * WorkspaceTimeline Component
 * Renders workspace activity logs in a premium, glassmorphic vertical timeline.
 * Employs IntersectionObserver for seamless infinite scrolling.
 */
const WorkspaceTimeline = ({ workspaceId }) => {
  const [activities, setActivities] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const observerTarget = useRef(null);

  // Fetch activities from API
  const fetchActivities = async (pageNum, isInit = false) => {
    setLoading(true);
    try {
      const data = await getWorkspaceActivities(workspaceId, pageNum, 12);
      if (isInit) {
        setActivities(data.activities);
      } else {
        setActivities(prev => [...prev, ...data.activities]);
      }
      setHasMore(data.pagination.hasMore);
    } catch (err) {
      console.error("Failed to load workspace activities:", err);
      toast.error("Failed to load activity logs.");
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  };

  // Reset page and reload activities if workspaceId changes
  useEffect(() => {
    setPage(1);
    setInitialLoading(true);
    fetchActivities(1, true);
  }, [workspaceId]);

  // Load subsequent pages when page number increments
  useEffect(() => {
    if (page > 1) {
      fetchActivities(page);
    }
  }, [page]);

  // Set up IntersectionObserver for infinite scroll trigger
  useEffect(() => {
    if (initialLoading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          setPage(prev => prev + 1);
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, loading, initialLoading]);

  // Date helper formatting
  const formatTimeAgo = (dateStr) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now - date;
    if (diffMs < 0) return 'Just now';

    const diffSecs = Math.floor(diffMs / 1000);
    if (diffSecs < 60) return 'Just now';

    const diffMins = Math.floor(diffSecs / 60);
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Icon & Theme mapping helper
  const getActionConfig = (action) => {
    switch (action) {
      case 'workspace_create':
        return { icon: <Building size={14} />, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)' };
      case 'workspace_update':
        return { icon: <Edit3 size={14} />, color: '#60a5fa', bg: 'rgba(96, 165, 250, 0.12)' };
      case 'workspace_delete':
        return { icon: <Trash2 size={14} />, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)' };
      case 'task_create':
        return { icon: <Plus size={14} />, color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' };
      case 'task_update':
        return { icon: <ClipboardList size={14} />, color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.12)' };
      case 'task_status_update':
        return { icon: <ArrowRight size={14} />, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' };
      case 'task_delete':
        return { icon: <Trash2 size={14} />, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)' };
      case 'member_join':
        return { icon: <UserPlus size={14} />, color: '#059669', bg: 'rgba(5, 150, 105, 0.12)' };
      case 'member_leave':
        return { icon: <UserMinus size={14} />, color: '#dc2626', bg: 'rgba(220, 38, 38, 0.12)' };
      case 'member_role_update':
        return { icon: <Shield size={14} />, color: '#eab308', bg: 'rgba(234, 179, 8, 0.12)' };
      case 'file_upload':
        return { icon: <UploadCloud size={14} />, color: '#ec4899', bg: 'rgba(236, 72, 153, 0.12)' };
      case 'file_delete':
        return { icon: <Trash2 size={14} />, color: '#dc2626', bg: 'rgba(220, 38, 38, 0.12)' };
      default:
        return { icon: <Clock size={14} />, color: 'var(--color-text-secondary)', bg: 'rgba(255, 255, 255, 0.05)' };
    }
  };

  // Avatar naming helper
  const getInitials = (name) => {
    return name ? name.slice(0, 2).toUpperCase() : '??';
  };



  const getAvatarUrl = (avatarPath) => {
    if (!avatarPath) return null;
    if (avatarPath.startsWith('http://') || avatarPath.startsWith('https://')) {
      return avatarPath;
    }
    return `${getBackendUrl()}${avatarPath}`;
  };

  // ─── RENDERING: LOADER ───────────────────────────────────────────────────
  if (initialLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '350px', gap: '0.75rem' }}>
        <Spinner />
        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Loading workspace activity timeline...</span>
      </div>
    );
  }

  // ─── RENDERING: EMPTY STATE ──────────────────────────────────────────────
  if (activities.length === 0) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '5rem 2rem',
        background: 'var(--color-bg-card)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        textAlign: 'center',
        maxWidth: '480px',
        margin: '2rem auto',
        gap: '1rem',
        animation: 'slideUp 0.3s ease both'
      }}>
        <div style={{
          width: 54,
          height: 54,
          borderRadius: 16,
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--color-text-muted)'
        }}>
          <Clock size={24} />
        </div>
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', marginBottom: '0.25rem' }}>No Activity Recorded</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
            Operations performed in this workspace (like task status updates, uploads, or membership edits) will show up here.
          </p>
        </div>
      </div>
    );
  }

  // ─── RENDERING: TIMELINE LIST ────────────────────────────────────────────
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      flex: 1,
      background: 'var(--color-bg-card)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      animation: 'slideUp 0.3s ease both',
      height: '100%',
      minHeight: '400px'
    }}>
      {/* Header */}
      <div style={{
        padding: '0.875rem 1.25rem',
        borderBottom: '1px solid var(--color-border)',
        background: 'rgba(255,255,255,0.01)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0
      }}>
        <div>
          <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            🕒 Workspace Activity Timeline
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            Real-time audit history of task boards, files, and memberships.
          </span>
        </div>
      </div>

      {/* Feed Container */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '2rem 1.5rem',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative'
      }}>
        {/* Vertical Center Line */}
        <div style={{
          position: 'absolute',
          left: '2.375rem',
          top: '2.5rem',
          bottom: '2.5rem',
          width: '2px',
          background: 'rgba(255,255,255,0.04)',
          zIndex: 0
        }}></div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', zIndex: 1 }}>
          {activities.map((act) => {
            const config = getActionConfig(act.action);
            const userNickname = act.user?.profile?.nickname || act.user?.username || 'Unknown User';
            const userInitials = getInitials(userNickname);
            
            return (
              <div 
                key={act._id} 
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '1rem',
                  position: 'relative'
                }}
              >
                {/* 1. Icon Circle Badge */}
                <div style={{
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  background: '#07080a',
                  border: `2px solid ${config.color}`,
                  color: config.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: `0 0 8px ${config.bg}`,
                  flexShrink: 0,
                  marginTop: '2px'
                }}>
                  {config.icon}
                </div>

                {/* 2. Content Box */}
                <div style={{
                  flex: 1,
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.875rem 1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  flexWrap: 'wrap'
                }}>
                  {/* Left Side: Avatar & Description */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {/* User Avatar */}
                    {act.user?.avatar ? (
                      <img 
                        src={getAvatarUrl(act.user.avatar)} 
                        alt={userNickname} 
                        style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--color-border)' }}
                      />
                    ) : (
                      <div className="avatar-circle" style={{
                        width: 28,
                        height: 28,
                        fontSize: '0.65rem',
                        background: 'rgba(255,255,255,0.05)'
                      }}>
                        {userInitials}
                      </div>
                    )}
                    
                    {/* Text Details */}
                    <div style={{ fontSize: '0.825rem', color: 'var(--color-text-secondary)' }}>
                      <span style={{ fontWeight: 700, color: '#fff', marginRight: '0.35rem' }}>
                        {userNickname}
                      </span>
                      <span>{act.details}</span>
                    </div>
                  </div>

                  {/* Right Side: Timestamp & action tag */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.75rem' }}>
                    <span style={{
                      padding: '0.15rem 0.45rem',
                      borderRadius: '4px',
                      background: config.bg,
                      color: config.color,
                      fontSize: '0.625rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.02em',
                      border: `1.5px solid ${config.color}20`
                    }}>
                      {act.action.replace('_', ' ')}
                    </span>
                    <span style={{ color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Clock size={11} />
                      {formatTimeAgo(act.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Dummy target element for IntersectionObserver infinite scroll */}
        <div 
          ref={observerTarget} 
          style={{ 
            height: '20px', 
            margin: '1.5rem 0 0.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              <Spinner style={{ width: 14, height: 14, borderWidth: 1.5 }} />
              <span>Loading more activities...</span>
            </div>
          )}
          {!hasMore && activities.length > 0 && !loading && (
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', opacity: 0.5 }}>
              • End of activity timeline •
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkspaceTimeline;
