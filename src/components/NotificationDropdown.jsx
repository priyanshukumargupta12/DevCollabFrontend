import { useState, useEffect, useRef } from 'react';
import { 
  Bell, 
  Check, 
  CheckCheck, 
  MessageSquare, 
  ClipboardList, 
  UserPlus, 
  Clock,
  Video
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useSocket } from '../context/SocketContext';
import { 
  getNotifications, 
  markAsRead, 
  markAllAsRead 
} from '../api/notification';
import { acceptInvitation, rejectInvitation } from '../api/workspace';

/**
 * NotificationDropdown Component
 * Implements a premium, real-time unread alerts dropdown.
 */
const NotificationDropdown = ({ onWorkspaceSelect }) => {
  const { socket } = useSocket();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [pulse, setPulse] = useState(false);
  const dropdownRef = useRef(null);

  // Fetch initial notifications
  const fetchNotifications = async () => {
    try {
      const data = await getNotifications();
      setNotifications(data.notifications);
      setUnreadCount(data.notifications.filter(n => !n.isRead).length);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  // Real-time socket event listener
  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (newNotification) => {
      setNotifications((prev) => [newNotification, ...prev]);
      setUnreadCount((prev) => prev + 1);
      
      // Trigger pulsing bell animation
      setPulse(true);
      setTimeout(() => setPulse(false), 1200);

      // Play soft notification sound or display visual toast alert
      toast.success(`🔔 ${newNotification.title}: ${newNotification.message}`, {
        duration: 4000,
        position: 'bottom-right',
        style: {
          background: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border)',
          color: '#fff',
          fontSize: '0.85rem'
        }
      });
    };

    socket.on('notification_received', handleNewNotification);

    return () => {
      socket.off('notification_received', handleNewNotification);
    };
  }, [socket]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleMarkAsRead = async (notification) => {
    const { _id, isRead, workspace, type } = notification;
    if (!isRead) {
      try {
        await markAsRead(_id);
        setNotifications(prev => 
          prev.map(n => n._id === _id ? { ...n, isRead: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch {
        toast.error('Failed to update notification status.');
      }
    }

    if (workspace && onWorkspaceSelect) {
      const workspaceId = typeof workspace === 'object' ? workspace._id : workspace;
      const targetTab = type === 'meeting' ? 'meeting' : 'chat';
      
      // Do not auto-navigate if it's a pending workspace invitation
      if (type === 'workspace_invite' && !isRead) {
        return;
      }
      
      onWorkspaceSelect(workspaceId, targetTab);
      setIsOpen(false);
    }
  };

  const handleAcceptInvite = async (notif) => {
    const workspaceId = typeof notif.workspace === 'object' ? notif.workspace._id : notif.workspace;
    const toastId = toast.loading('Accepting invitation...');
    try {
      await acceptInvitation(workspaceId);
      await markAsRead(notif._id);
      setNotifications(prev =>
        prev.map(n => n._id === notif._id ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
      toast.success('Invitation accepted successfully! 🎉', { id: toastId });
      
      // Dispatch custom action to refresh sidebar and dashboard list
      window.dispatchEvent(new Event('workspace_invitation_action'));
      
      if (onWorkspaceSelect) {
        onWorkspaceSelect(workspaceId, 'chat');
      }
      setIsOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to accept invitation.', { id: toastId });
    }
  };

  const handleDeclineInvite = async (notif) => {
    const workspaceId = typeof notif.workspace === 'object' ? notif.workspace._id : notif.workspace;
    const toastId = toast.loading('Declining invitation...');
    try {
      await rejectInvitation(workspaceId);
      await markAsRead(notif._id);
      setNotifications(prev =>
        prev.map(n => n._id === notif._id ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
      toast.success('Invitation declined.', { id: toastId });
      
      // Dispatch custom action to refresh sidebar and dashboard list
      window.dispatchEvent(new Event('workspace_invitation_action'));
      
      setIsOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to decline invitation.', { id: toastId });
    }
  };

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) return;
    const toastId = toast.loading('Marking all as read...');
    try {
      await markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast.success('All notifications marked as read.', { id: toastId });
    } catch {
      toast.error('Failed to update notifications.', { id: toastId });
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'task_assignment':
        return <ClipboardList size={14} color="#a78bfa" />;
      case 'mention':
        return <MessageSquare size={14} color="#f59e0b" />;
      case 'workspace_invite':
        return <UserPlus size={14} color="#10b981" />;
      case 'meeting':
        return <Video size={14} color="#ec4899" />;
      default:
        return <Bell size={14} color="var(--color-text-secondary)" />;
    }
  };

  const formatRelativeTime = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
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
    
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--color-border)',
          borderRadius: 10,
          width: 38,
          height: 38,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: isOpen ? '#fff' : 'var(--color-text-secondary)',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          outline: 'none',
          animation: pulse ? 'pulseBell 0.4s ease 3' : 'none'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
          e.currentTarget.style.color = '#fff';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--color-border)';
          e.currentTarget.style.color = isOpen ? '#fff' : 'var(--color-text-secondary)';
        }}
        title="Notifications"
      >
        <Bell size={18} />

        {/* Unread Counter Badge */}
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: -2,
            right: -2,
            background: 'var(--color-error)',
            color: '#fff',
            fontSize: '0.625rem',
            fontWeight: 800,
            borderRadius: '50%',
            minWidth: 16,
            height: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 4px',
            border: '2px solid var(--color-bg-primary)',
            boxShadow: '0 0 10px rgba(239, 68, 68, 0.5)'
          }}>
            {unreadCount}
          </span>
        )}
      </button>

      {/* CSS Keyframes for Pulsing Animation injected directly */}
      <style>{`
        @keyframes pulseBell {
          0% { transform: scale(1); }
          50% { transform: scale(1.15) rotate(15deg); }
          100% { transform: scale(1); }
        }
      `}</style>

      {/* Floating Dropdown Container */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          right: 0,
          top: 'calc(100% + 10px)',
          width: 320,
          background: '#0c0d12',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-lg), var(--shadow-glow)',
          zIndex: 1100,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: 400,
          animation: 'slideUp 0.2s ease both',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)'
        }}>
          
          {/* Header */}
          <div style={{
            padding: '0.75rem 1rem',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(255,255,255,0.01)'
          }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' }}>
              Notifications
            </span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-accent-light)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  padding: '2px 4px',
                  borderRadius: 4,
                  transition: 'var(--transition-fast)'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-accent-light)'}
              >
                <CheckCheck size={12} />
                Mark all read
              </button>
            )}
          </div>

          {/* List Area */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {notifications.length === 0 ? (
              <div style={{
                padding: '2.5rem 1rem',
                textAlign: 'center',
                color: 'var(--color-text-muted)',
                fontSize: '0.75rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <Bell size={24} style={{ opacity: 0.3 }} />
                <span>No notifications yet</span>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif._id}
                  onClick={() => handleMarkAsRead(notif)}
                  style={{
                    padding: '0.875rem 1rem',
                    borderBottom: '1px solid var(--color-border)',
                    background: notif.isRead ? 'transparent' : 'rgba(139, 92, 246, 0.02)',
                    cursor: notif.isRead ? 'default' : 'pointer',
                    display: 'flex',
                    gap: '0.75rem',
                    transition: 'var(--transition-fast)',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => {
                    if (!notif.isRead) {
                      e.currentTarget.style.background = 'rgba(139, 92, 246, 0.04)';
                    } else {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.01)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = notif.isRead ? 'transparent' : 'rgba(139, 92, 246, 0.02)';
                  }}
                >
                  {/* Icon Avatar */}
                  <div style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--color-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {getIcon(notif.type)}
                  </div>

                  {/* Body Text */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      color: notif.isRead ? 'var(--color-text-secondary)' : '#fff',
                      marginBottom: '0.125rem'
                    }}>
                      {notif.title}
                    </div>
                    <p style={{
                      fontSize: '0.75rem',
                      color: 'var(--color-text-secondary)',
                      lineHeight: 1.3,
                      marginBottom: '0.25rem',
                      wordBreak: 'break-word'
                    }}>
                      {notif.message}
                    </p>
                    <div style={{
                      fontSize: '0.65rem',
                      color: 'var(--color-text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}>
                      <Clock size={10} />
                      <span>{formatRelativeTime(notif.createdAt)}</span>
                    </div>

                    {notif.type === 'workspace_invite' && !notif.isRead && (
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }} onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleAcceptInvite(notif)}
                          style={{
                            background: 'linear-gradient(135deg,#10b981,#059669)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '4px 10px',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            boxShadow: '0 2px 5px rgba(16,185,129,0.2)',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleDeclineInvite(notif)}
                          style={{
                            background: 'rgba(239,68,68,0.1)',
                            border: '1px solid rgba(239,68,68,0.3)',
                            color: '#ef4444',
                            borderRadius: '6px',
                            padding: '4px 10px',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          Decline
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Unread dot indicator */}
                  {!notif.isRead && (
                    <div style={{
                      position: 'absolute',
                      right: 12,
                      top: 16,
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: 'var(--color-accent)'
                    }} />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
