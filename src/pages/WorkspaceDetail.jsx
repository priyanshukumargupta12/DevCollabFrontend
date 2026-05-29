import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Users, 
  UserPlus, 
  Trash2, 
  LogOut, 
  ShieldAlert, 
  ShieldCheck, 
  UserMinus,
  Edit3,
  Check,
  Send,
  MessageSquare,
  Sparkles,
  ClipboardList,
  FolderOpen,
  Video,
  Calendar,
  Clock,
  FileText,
  Code2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { 
  getWorkspaceById, 
  updateWorkspace, 
  deleteWorkspace, 
  addMember, 
  removeMember, 
  updateMemberRole 
} from '../api/workspace';
import { useSocket } from '../context/SocketContext';
import Spinner from '../components/Spinner';
import { getBackendUrl } from '../api/axios';
import KanbanBoard from '../components/KanbanBoard';
import WorkspaceFiles from '../components/WorkspaceFiles';
import WorkspaceMeeting from '../components/WorkspaceMeeting';
import WorkspaceTimeline from '../components/WorkspaceTimeline';
import WorkspaceNotes from '../components/WorkspaceNotes';
import WorkspaceCalendar from '../components/WorkspaceCalendar';

/**
 * WorkspaceDetail Component
 * Refactored to include a premium tabbed layout with real-time Chat and Settings/Members tabs.
 */
const WorkspaceDetail = ({ workspaceId, onBack, onWorkspaceDeleted, currentUser, initialTab = 'chat' }) => {
  const { socket, onlineUsers } = useSocket();
  const navigate = useNavigate();
  
  const [workspace, setWorkspace] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Workspace Edit States (Settings tab)
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', description: '' });
  const [isSavingDetails, setIsSavingDetails] = useState(false);

  // Invitation States (Settings tab)
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [isInviting, setIsInviting] = useState(false);

  // Real-Time Chat States (Chat tab)
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [typingUsers, setTypingUsers] = useState({}); // userId -> username
  const [isLocalTyping, setIsLocalTyping] = useState(false);

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Fetch workspace details
  const fetchWorkspaceDetails = async () => {
    setIsLoading(true);
    try {
      const data = await getWorkspaceById(workspaceId);
      setWorkspace(data.workspace);
      setEditForm({
        name: data.workspace.name,
        description: data.workspace.description || '',
      });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to fetch workspace details.');
      onBack();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (workspaceId) {
      fetchWorkspaceDetails();
    }
  }, [workspaceId]);

  // ─── Socket.io Chat Room Setup ─────────────────────────────────────
  useEffect(() => {
    if (!socket || !workspace) return;

    const roomId = workspace._id;

    // Join the workspace chat room
    socket.emit('join_workspace', { workspaceId: roomId, userId: currentUser._id });

    // Listen for chat history
    socket.on('workspace_history', (history) => {
      setMessages(history);
    });

    // Listen for new incoming messages
    socket.on('receive_message', (newMessage) => {
      setMessages((prev) => [...prev, newMessage]);
    });

    // Listen for other users typing
    socket.on('user_typing', ({ userId: typingUserId, username, isTyping }) => {
      setTypingUsers((prev) => {
        const next = { ...prev };
        if (isTyping) {
          next[typingUserId] = username;
        } else {
          delete next[typingUserId];
        }
        return next;
      });
    });

    // Cleanup listeners on room change or unmount
    return () => {
      socket.emit('typing', { workspaceId: roomId, userId: currentUser._id, username: currentUser.username, isTyping: false });
      socket.off('workspace_history');
      socket.off('receive_message');
      socket.off('user_typing');
    };
  }, [socket, workspace, currentUser]);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers, activeTab]);

  if (isLoading) {
    return (
      <div className="page-loader">
        <Spinner />
        <span>Loading workspace details...</span>
      </div>
    );
  }

  if (!workspace) return null;

  // Permissions helper
  const isOwner = workspace.owner._id === currentUser._id;
  const currentMemberRecord = workspace.members.find(m => m.user._id === currentUser._id);
  const isAdmin = currentMemberRecord?.role === 'admin';
  const hasEditAccess = isOwner || isAdmin;

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

  // Check if a specific user is currently online
  const isUserOnline = (userId) => {
    return onlineUsers.includes(userId);
  };

  // ─── Chat Send handler ─────────────────────────────────────────────
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim() || !socket) return;

    // Send via socket
    socket.emit('send_message', {
      workspaceId: workspace._id,
      senderId: currentUser._id,
      text: inputText.trim(),
    });

    setInputText('');

    // Clear typing indicator immediately
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    setIsLocalTyping(false);
    socket.emit('typing', {
      workspaceId: workspace._id,
      userId: currentUser._id,
      username: currentUser.username,
      isTyping: false,
    });
  };

  // ─── Handle Chat Input Typing ──────────────────────────────────────
  const handleChatInputChange = (e) => {
    setInputText(e.target.value);
    if (!socket) return;

    // Emit typing true
    if (!isLocalTyping) {
      setIsLocalTyping(true);
      socket.emit('typing', {
        workspaceId: workspace._id,
        userId: currentUser._id,
        username: currentUser.username,
        isTyping: true,
      });
    }

    // Debounce typing false
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsLocalTyping(false);
      socket.emit('typing', {
        workspaceId: workspace._id,
        userId: currentUser._id,
        username: currentUser.username,
        isTyping: false,
      });
    }, 1500);
  };

  // ─── Settings CRUD Handlers ─────────────────────────────────────────
  const handleSaveDetails = async (e) => {
    e.preventDefault();
    if (!editForm.name.trim()) {
      toast.error('Workspace name is required');
      return;
    }
    setIsSavingDetails(true);
    const toastId = toast.loading('Saving details...');
    try {
      const data = await updateWorkspace(workspace._id, {
        name: editForm.name.trim(),
        description: editForm.description.trim(),
      });
      setWorkspace(data.workspace);
      setIsEditing(false);
      toast.success('Workspace details updated! 🎉', { id: toastId });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update details.', { id: toastId });
    } finally {
      setIsSavingDetails(false);
    }
  };

  const handleDeleteWorkspace = async () => {
    const confirmation = window.confirm(`Delete "${workspace.name}" forever?`);
    if (!confirmation) return;
    const toastId = toast.loading('Deleting workspace...');
    try {
      await deleteWorkspace(workspace._id);
      toast.success('Workspace deleted.', { id: toastId });
      onWorkspaceDeleted();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete.', { id: toastId });
    }
  };

  const handleLeaveWorkspace = async () => {
    const confirmation = window.confirm('Are you sure you want to leave?');
    if (!confirmation) return;
    const toastId = toast.loading('Leaving workspace...');
    try {
      await removeMember(workspace._id, currentUser._id);
      toast.success('You left the workspace.', { id: toastId });
      onWorkspaceDeleted();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to leave.', { id: toastId });
    }
  };

  const handleInviteMember = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !/^\S+@\S+\.\S+$/.test(inviteEmail)) {
      toast.error('Please enter a valid email.');
      return;
    }
    setIsInviting(true);
    const toastId = toast.loading(`Inviting ${inviteEmail}...`);
    try {
      const data = await addMember(workspace._id, inviteEmail.toLowerCase().trim(), inviteRole);
      setWorkspace(data.workspace);
      setInviteEmail('');
      toast.success('Collaborator added! 🎉', { id: toastId });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to invite.', { id: toastId });
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveMember = async (userId, username) => {
    const confirmation = window.confirm(`Remove ${username}?`);
    if (!confirmation) return;
    const toastId = toast.loading(`Removing ${username}...`);
    try {
      const data = await removeMember(workspace._id, userId);
      setWorkspace(data.workspace);
      toast.success(`${username} removed.`, { id: toastId });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove.', { id: toastId });
    }
  };

  const handleChangeRole = async (userId, username, newRole) => {
    const toastId = toast.loading(`Updating role...`);
    try {
      const data = await updateMemberRole(workspace._id, userId, newRole);
      setWorkspace(data.workspace);
      toast.success(`${username} promoted to ${newRole}.`, { id: toastId });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update role.', { id: toastId });
    }
  };

  // Format message sending timestamp
  const formatMsgTime = (timeString) => {
    if (!timeString) return '';
    const date = new Date(timeString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={{ animation: 'slideUp 0.3s ease both', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
      
      {/* ─── Top Controls & Navigation Bar ────────────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid var(--color-border)',
        paddingBottom: '0.875rem',
        marginBottom: '1rem',
        flexWrap: 'wrap',
        gap: '0.75rem',
      }}>
        <button
          onClick={onBack}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'none',
            border: 'none',
            color: 'var(--color-text-secondary)',
            fontSize: '0.9rem',
            fontWeight: 500,
            cursor: 'pointer',
            padding: '0.375rem 0.75rem 0.375rem 0.5rem',
            borderRadius: 'var(--radius-sm)',
            transition: 'var(--transition-fast)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#fff';
            e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--color-text-secondary)';
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <ArrowLeft size={16} />
          <span>Workspaces</span>
        </button>

        {/* ─── Premium Tab Selector ───────────────────────────────── */}
        <div style={{
          display: 'flex',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid var(--color-border)',
          borderRadius: 10,
          padding: '2px',
        }}>
          <button
            onClick={() => setActiveTab('chat')}
            style={{
              padding: '0.375rem 1rem',
              borderRadius: 8,
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.375rem',
              transition: 'var(--transition-fast)',
              background: activeTab === 'chat' ? 'var(--gradient-brand)' : 'transparent',
              color: activeTab === 'chat' ? '#fff' : 'var(--color-text-secondary)',
            }}
          >
            <MessageSquare size={14} />
            Chat Room
          </button>
          <button
            onClick={() => setActiveTab('kanban')}
            style={{
              padding: '0.375rem 1rem',
              borderRadius: 8,
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.375rem',
              transition: 'var(--transition-fast)',
              background: activeTab === 'kanban' ? 'var(--gradient-brand)' : 'transparent',
              color: activeTab === 'kanban' ? '#fff' : 'var(--color-text-secondary)',
            }}
          >
            <ClipboardList size={14} />
            Kanban Board
          </button>
          <button
            onClick={() => setActiveTab('files')}
            style={{
              padding: '0.375rem 1rem',
              borderRadius: 8,
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.375rem',
              transition: 'var(--transition-fast)',
              background: activeTab === 'files' ? 'var(--gradient-brand)' : 'transparent',
              color: activeTab === 'files' ? '#fff' : 'var(--color-text-secondary)',
            }}
          >
            <FolderOpen size={14} />
            Shared Files
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            style={{
              padding: '0.375rem 1rem',
              borderRadius: 8,
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.375rem',
              transition: 'var(--transition-fast)',
              background: activeTab === 'notes' ? 'var(--gradient-brand)' : 'transparent',
              color: activeTab === 'notes' ? '#fff' : 'var(--color-text-secondary)',
            }}
          >
            <FileText size={14} />
            Notes
          </button>
          <button
            onClick={() => setActiveTab('calendar')}
            style={{
              padding: '0.375rem 1rem',
              borderRadius: 8,
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.375rem',
              transition: 'var(--transition-fast)',
              background: activeTab === 'calendar' ? 'var(--gradient-brand)' : 'transparent',
              color: activeTab === 'calendar' ? '#fff' : 'var(--color-text-secondary)',
            }}
          >
            <Calendar size={14} />
            Calendar
          </button>
          <button
            onClick={() => setActiveTab('meeting')}
            style={{
              padding: '0.375rem 1rem',
              borderRadius: 8,
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.375rem',
              transition: 'var(--transition-fast)',
              background: activeTab === 'meeting' ? 'var(--gradient-brand)' : 'transparent',
              color: activeTab === 'meeting' ? '#fff' : 'var(--color-text-secondary)',
            }}
          >
            <Video size={14} />
            Video Call
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            style={{
              padding: '0.375rem 1rem',
              borderRadius: 8,
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.375rem',
              transition: 'var(--transition-fast)',
              background: activeTab === 'activity' ? 'var(--gradient-brand)' : 'transparent',
              color: activeTab === 'activity' ? '#fff' : 'var(--color-text-secondary)',
            }}
          >
            <Clock size={14} />
            Activity Log
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            style={{
              padding: '0.375rem 1rem',
              borderRadius: 8,
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.375rem',
              transition: 'var(--transition-fast)',
              background: activeTab === 'settings' ? 'var(--gradient-brand)' : 'transparent',
              color: activeTab === 'settings' ? '#fff' : 'var(--color-text-secondary)',
            }}
          >
            <Users size={14} />
            Members & Config
          </button>
          {/* Code Editor tab — navigates to full-screen editor page */}
          <button
            onClick={() => navigate(`/workspace/${workspaceId}/editor`)}
            style={{
              padding: '0.375rem 1rem',
              borderRadius: 8,
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.375rem',
              transition: 'var(--transition-fast)',
              background: 'linear-gradient(135deg, #10b981, #3b82f6)',
              color: '#fff',
              boxShadow: '0 0 12px rgba(59,130,246,0.3)',
            }}
            title="Open collaborative code editor"
          >
            <Code2 size={14} />
            Code Editor
          </button>
        </div>

        {/* Title display */}
        <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', display: 'none' }} className="md:block">
          {workspace.name}
        </h2>
      </div>

      {/* ─── TAB CONTENT: CHAT DISCUSSION ROOM ────────────────────────── */}
      {activeTab === 'chat' && (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          flex: 1, 
          background: 'var(--color-bg-card)', 
          border: '1px solid var(--color-border)', 
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          position: 'relative'
        }}>
          {/* Room Header */}
          <div style={{
            padding: '0.875rem 1.25rem',
            borderBottom: '1px solid var(--color-border)',
            background: 'rgba(255,255,255,0.01)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                💬 Group Discussion Room
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                Collaborate with workspace admins and members in real-time.
              </span>
            </div>
            {/* Active Members Online count */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: 'var(--color-success)' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-success)', display: 'inline-block', boxShadow: '0 0 10px var(--color-success)' }}></span>
              <span>
                {1 + workspace.members.filter(m => isUserOnline(m.user._id)).length} Active
              </span>
            </div>
          </div>

          {/* Messages Scroll Area */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}>
            {messages.length === 0 ? (
              /* Chat Empty State */
              <div style={{
                margin: 'auto',
                textAlign: 'center',
                color: 'var(--color-text-muted)',
                maxWidth: '280px',
                padding: '2rem 1rem'
              }}>
                <Sparkles size={28} color="var(--color-accent-light)" style={{ margin: '0 auto 0.75rem' }} />
                <h4 style={{ color: '#fff', fontSize: '0.9375rem', fontWeight: 700, marginBottom: '0.25rem' }}>Beginning of Discussion</h4>
                <p style={{ fontSize: '0.8rem', lineHeight: 1.4 }}>
                  No messages have been sent in this workspace yet. Send a hello to get things started!
                </p>
              </div>
            ) : (
              /* Message Bubbles list */
              messages.map((msg, index) => {
                const isMyMessage = msg.sender._id === currentUser._id;
                const online = isUserOnline(msg.sender._id);
                
                return (
                  <div 
                    key={msg._id || index}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.75rem',
                      alignSelf: isMyMessage ? 'flex-end' : 'flex-start',
                      maxWidth: '75%',
                      flexDirection: isMyMessage ? 'row-reverse' : 'row'
                    }}
                  >
                    {/* Sender Avatar with Online Indicator */}
                    <div 
                      style={{ position: 'relative', flexShrink: 0, cursor: 'pointer' }}
                      onClick={() => navigate(`/profile/${msg.sender.username}`)}
                      title={`View ${msg.sender.username}'s profile`}
                    >
                      {msg.sender.avatar ? (
                        <img 
                          src={getAvatarUrl(msg.sender.avatar)} 
                          alt={msg.sender.username} 
                          style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--color-border)' }}
                        />
                      ) : (
                        <div className="avatar-circle" style={{
                          width: 34,
                          height: 34,
                          fontSize: '0.75rem',
                          background: isMyMessage ? 'var(--color-accent)' : 'rgba(255,255,255,0.08)'
                        }}>
                          {getInitials(msg.sender.profile?.nickname || msg.sender.username)}
                        </div>
                      )}
                      <span style={{
                        position: 'absolute',
                        bottom: 0,
                        right: 0,
                        width: 9,
                        height: 9,
                        borderRadius: '50%',
                        background: online ? 'var(--color-success)' : 'var(--color-text-muted)',
                        border: '1.5px solid var(--color-bg-primary)',
                        display: 'block'
                      }} />
                    </div>

                    {/* Message Bubble Container */}
                    <div>
                      {/* Name + Timestamp Header */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.375rem',
                        marginBottom: '0.2rem',
                        fontSize: '0.75rem',
                        color: 'var(--color-text-muted)',
                        justifyContent: isMyMessage ? 'flex-end' : 'flex-start'
                      }}>
                        <span 
                          onClick={() => navigate(`/profile/${msg.sender.username}`)}
                          style={{ fontWeight: 600, color: '#94a3b8', cursor: 'pointer', transition: 'var(--transition-fast)' }}
                          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-accent-light)'}
                          onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
                          title={`View ${msg.sender.username}'s profile`}
                        >
                          {isMyMessage ? (currentUser.profile?.nickname || 'You') : (msg.sender.profile?.nickname || msg.sender.username)}
                        </span>
                        <span>•</span>
                        <span>{formatMsgTime(msg.createdAt)}</span>
                      </div>

                      {/* Bubble Text */}
                      <div style={{
                        padding: '0.625rem 0.875rem',
                        borderRadius: isMyMessage ? '14px 2px 14px 14px' : '2px 14px 14px 14px',
                        background: isMyMessage ? 'var(--gradient-brand)' : 'rgba(255, 255, 255, 0.04)',
                        border: isMyMessage ? 'none' : '1px solid var(--color-border)',
                        color: '#f1f5f9',
                        fontSize: '0.875rem',
                        lineHeight: 1.5,
                        wordBreak: 'break-word',
                        whiteSpace: 'pre-wrap'
                      }}>
                        {msg.text}
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {/* Typing Indicator Bubble */}
            {Object.keys(typingUsers).length > 0 && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                alignSelf: 'flex-start',
                padding: '0.25rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--color-border)',
                fontSize: '0.75rem',
                color: 'var(--color-text-muted)'
              }}>
                <span className="spinner" style={{ width: 10, height: 10, borderWidth: 1 }}></span>
                <span>
                  {Object.values(typingUsers).join(', ')} {Object.keys(typingUsers).length === 1 ? 'is' : 'are'} typing...
                </span>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Form Input box */}
          <form onSubmit={handleSendMessage} style={{
            padding: '1rem',
            borderTop: '1px solid var(--color-border)',
            background: 'rgba(255,255,255,0.01)',
            display: 'flex',
            gap: '0.75rem',
            alignItems: 'center'
          }}>
            <input
              type="text"
              placeholder={`Message # ${workspace.name}...`}
              value={inputText}
              onChange={handleChatInputChange}
              style={{
                flex: 1,
                padding: '0.75rem 1rem',
                background: 'rgba(0, 0, 0, 0.25)',
                border: '1px solid var(--color-border)',
                borderRadius: 12,
                color: '#fff',
                fontSize: '0.875rem',
                outline: 'none',
                transition: 'var(--transition-normal)'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--color-border-focus)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--color-border)'}
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: inputText.trim() ? 'var(--gradient-brand)' : 'rgba(255,255,255,0.02)',
                border: 'none',
                color: '#fff',
                cursor: inputText.trim() ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'var(--transition-normal)'
              }}
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}

      {/* ─── TAB CONTENT: KANBAN BOARD ────────────────────────────── */}
      {activeTab === 'kanban' && (
        <KanbanBoard 
          workspaceId={workspace._id} 
          members={[workspace.owner, ...workspace.members.map(m => m.user)]} 
          currentUser={currentUser} 
        />
      )}

      {/* ─── TAB CONTENT: SHARED FILES ─────────────────────────────────── */}
      {activeTab === 'files' && (
        <WorkspaceFiles
          workspaceId={workspace._id}
          isAdmin={hasEditAccess}
          currentUser={currentUser}
          workspace={workspace}
        />
      )}

      {/* ─── TAB CONTENT: WORKSPACE NOTES ───────────────────────────────── */}
      {activeTab === 'notes' && (
        <WorkspaceNotes
          workspaceId={workspace._id}
          currentUser={currentUser}
          workspace={workspace}
        />
      )}

      {/* ─── TAB CONTENT: TEAM CALENDAR ─────────────────────────────────── */}
      {activeTab === 'calendar' && (
        <WorkspaceCalendar
          workspaceId={workspace._id}
          currentUser={currentUser}
          workspace={workspace}
          onSwitchTab={setActiveTab}
        />
      )}

      {/* ─── TAB CONTENT: VIDEO MEETING ─────────────────────────────────── */}
      {activeTab === 'meeting' && (
        <WorkspaceMeeting
          workspaceId={workspace._id}
          currentUser={currentUser}
          workspace={workspace}
        />
      )}

      {/* ─── TAB CONTENT: WORKSPACE ACTIVITY TIMELINE ─────────────────────── */}
      {activeTab === 'activity' && (
        <WorkspaceTimeline
          workspaceId={workspace._id}
        />
      )}

      {/* ─── TAB CONTENT: MEMBERS & WORKSPACE CONFIG ─────────────────────── */}
      {activeTab === 'settings' && (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          
          {/* Top Info Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1.5rem',
            flexWrap: 'wrap',
            gap: '1rem',
          }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
              Configure workspace settings, link members, and view administrative credentials.
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {!isOwner && (
                <button onClick={handleLeaveWorkspace} className="btn-logout" style={{ padding: '0.4rem 0.875rem', fontSize: '0.8rem' }}>
                  <LogOut size={13} />
                  Leave Workspace
                </button>
              )}
              {isOwner && (
                <button onClick={handleDeleteWorkspace} className="btn-logout" style={{ padding: '0.4rem 0.875rem', fontSize: '0.8rem' }}>
                  <Trash2 size={13} />
                  Delete Workspace
                </button>
              )}
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: '2rem',
          }} className="lg:grid-cols-3">
            
            {/* Column 1 & 2: Details & members lists */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }} className="lg:col-span-2">
              
              {/* Workspace Details Card */}
              <div style={{
                background: 'var(--color-bg-card)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                padding: '2rem',
              }}>
                {!isEditing ? (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                      <h2 style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.02em' }}>
                        {workspace.name}
                      </h2>
                      {hasEditAccess && (
                        <button
                          onClick={() => setIsEditing(true)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--color-text-muted)',
                            cursor: 'pointer',
                            padding: '0.375rem',
                            borderRadius: '6px',
                            display: 'flex',
                            transition: 'var(--transition-fast)'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = '#fff';
                            e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = 'var(--color-text-muted)';
                            e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          <Edit3 size={15} />
                        </button>
                      )}
                    </div>
                    <p style={{
                      color: workspace.description ? 'var(--color-text-secondary)' : 'var(--color-text-muted)',
                      fontSize: '0.9rem',
                      lineHeight: 1.5,
                      marginBottom: '1.25rem'
                    }}>{workspace.description || 'No description provided.'}</p>
                    
                    <div style={{
                      borderTop: '1px solid var(--color-border)',
                      paddingTop: '0.875rem',
                      fontSize: '0.75rem',
                      color: 'var(--color-text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      <span>Created by:</span>
                      <strong style={{ color: 'var(--color-text-secondary)' }}>{workspace.owner.username}</strong>
                      <span>•</span>
                      <span>Members: {workspace.members.length + 1}</span>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSaveDetails}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>Edit Workspace</h3>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditing(false);
                            setEditForm({ name: workspace.name, description: workspace.description || '' });
                          }}
                          className="btn-logout"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isSavingDetails}
                          style={{
                            padding: '0.25rem 0.75rem',
                            background: 'var(--gradient-brand)',
                            border: 'none',
                            borderRadius: 'var(--radius-sm)',
                            color: '#fff',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}
                        >
                          {isSavingDetails ? <Spinner /> : <Check size={12} />}
                          Save
                        </button>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Name</label>
                      <input
                        type="text"
                        className="form-input"
                        value={editForm.name}
                        onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                        style={{ paddingLeft: '1rem' }}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Description</label>
                      <textarea
                        className="form-input"
                        value={editForm.description}
                        onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                        rows={2}
                        style={{ paddingLeft: '1rem', resize: 'none', height: '60px', fontFamily: 'var(--font-sans)' }}
                      />
                    </div>
                  </form>
                )}
              </div>

              {/* Members List */}
              <div style={{
                background: 'var(--color-bg-card)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                padding: '2rem',
              }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', marginBottom: '1.25rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
                  Workspace Members
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  
                  {/* Owner Display */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.875rem',
                    padding: '0.75rem 1rem',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                  }}>
                    <div 
                      style={{ position: 'relative', cursor: 'pointer' }}
                      onClick={() => navigate(`/profile/${workspace.owner.username}`)}
                      title={`View ${workspace.owner.username}'s profile`}
                    >
                      {workspace.owner.avatar ? (
                        <img 
                          src={getAvatarUrl(workspace.owner.avatar)} 
                          alt={workspace.owner.username} 
                          style={{ width: 38, height: 38, borderRadius: '30%', objectFit: 'cover', border: '1px solid var(--color-border)' }}
                        />
                      ) : (
                        <div className="avatar-circle" style={{ width: 38, height: 38, fontSize: '0.8rem' }}>
                          {getInitials(workspace.owner.profile?.nickname || workspace.owner.username)}
                        </div>
                      )}
                      <span style={{
                        position: 'absolute',
                        bottom: 0,
                        right: 0,
                        width: 9,
                        height: 9,
                        borderRadius: '50%',
                        background: isUserOnline(workspace.owner._id) ? 'var(--color-success)' : 'var(--color-text-muted)',
                        border: '1.5px solid var(--color-bg-primary)'
                      }} />
                    </div>
                    <div 
                      style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
                      onClick={() => navigate(`/profile/${workspace.owner.username}`)}
                      title={`View ${workspace.owner.username}'s profile`}
                    >
                      <div 
                        style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', transition: 'var(--transition-fast)' }}
                        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-accent-light)'}
                        onMouseLeave={(e) => e.currentTarget.style.color = '#fff'}
                      >
                        {workspace.owner.profile?.nickname || workspace.owner.username} {workspace.owner._id === currentUser._id && <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 'normal' }}>(You)</span>}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {workspace.owner.email}
                      </div>
                    </div>
                    <span className="role-badge" style={{ background: 'rgba(245, 158, 11, 0.1)', borderColor: 'rgba(245, 158, 11, 0.3)', color: 'var(--color-warning)' }}>
                      <ShieldAlert size={9} />
                      Owner
                    </span>
                  </div>

                  {/* Members loop */}
                  {workspace.members.map((member) => {
                    const mUser = member.user;
                    const isSelf = mUser._id === currentUser._id;
                    const online = isUserOnline(mUser._id);

                    return (
                      <div key={mUser._id} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.875rem',
                        padding: '0.75rem 1rem',
                        background: 'rgba(255, 255, 255, 0.01)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                      }}>
                        <div 
                          style={{ position: 'relative', cursor: 'pointer' }}
                          onClick={() => navigate(`/profile/${mUser.username}`)}
                          title={`View ${mUser.username}'s profile`}
                        >
                          {mUser.avatar ? (
                            <img 
                              src={getAvatarUrl(mUser.avatar)} 
                              alt={mUser.username} 
                              style={{ width: 38, height: 38, borderRadius: '30%', objectFit: 'cover', border: '1px solid var(--color-border)' }}
                            />
                          ) : (
                            <div className="avatar-circle" style={{ width: 38, height: 38, fontSize: '0.8rem', background: member.role === 'admin' ? 'var(--color-accent)' : 'rgba(255,255,255,0.06)' }}>
                              {getInitials(mUser.profile?.nickname || mUser.username)}
                            </div>
                          )}
                          <span style={{
                            position: 'absolute',
                            bottom: 0,
                            right: 0,
                            width: 9,
                            height: 9,
                            borderRadius: '50%',
                            background: online ? 'var(--color-success)' : 'var(--color-text-muted)',
                            border: '1.5px solid var(--color-bg-primary)'
                          }} />
                        </div>
                        <div 
                          style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
                          onClick={() => navigate(`/profile/${mUser.username}`)}
                          title={`View ${mUser.username}'s profile`}
                        >
                          <div 
                            style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', transition: 'var(--transition-fast)' }}
                            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-accent-light)'}
                            onMouseLeave={(e) => e.currentTarget.style.color = '#fff'}
                          >
                            {mUser.profile?.nickname || mUser.username} {isSelf && <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 'normal' }}>(You)</span>}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {mUser.email}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {isOwner && !isSelf ? (
                            <select
                              value={member.role}
                              onChange={(e) => handleChangeRole(mUser._id, mUser.username, e.target.value)}
                              style={{
                                background: '#0f1117',
                                border: '1px solid var(--color-border)',
                                borderRadius: 'var(--radius-sm)',
                                color: member.role === 'admin' ? 'var(--color-accent-light)' : 'var(--color-text-secondary)',
                                fontSize: '0.7rem',
                                fontWeight: 600,
                                padding: '0.2rem 0.4rem',
                                outline: 'none',
                                cursor: 'pointer'
                              }}
                            >
                              <option value="member">MEMBER</option>
                              <option value="admin">ADMIN</option>
                            </select>
                          ) : (
                            <span className="role-badge" style={
                              member.role === 'admin' 
                                ? { background: 'rgba(139, 92, 246, 0.1)', borderColor: 'rgba(139, 92, 246, 0.3)', color: 'var(--color-accent-light)' }
                                : { background: 'rgba(255, 255, 255, 0.03)', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }
                            }>
                              {member.role === 'admin' ? <ShieldCheck size={9} /> : <Users size={9} />}
                              {member.role}
                            </span>
                          )}

                          {((isOwner && !isSelf) || (isAdmin && member.role === 'member' && !isSelf)) && (
                            <button
                              onClick={() => handleRemoveMember(mUser._id, mUser.username)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--color-text-muted)',
                                cursor: 'pointer',
                                padding: '0.25rem',
                                borderRadius: '4px',
                                display: 'flex',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.color = 'var(--color-error)';
                                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.color = 'var(--color-text-muted)';
                                e.currentTarget.style.background = 'transparent';
                              }}
                            >
                              <UserMinus size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Column 3: Invite collaborator */}
            <div>
              {hasEditAccess ? (
                <div style={{
                  background: 'var(--color-bg-card)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '2rem',
                }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', marginBottom: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
                    Invite Collaborator
                  </h3>
                  <form onSubmit={handleInviteMember} noValidate>
                    <div className="form-group">
                      <label className="form-label">Email Address</label>
                      <input
                        type="email"
                        className="form-input"
                        placeholder="collaborator@example.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        disabled={isInviting}
                        style={{ paddingLeft: '1rem' }}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                      <label className="form-label">Role</label>
                      <select
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value)}
                        disabled={isInviting}
                        className="form-input"
                        style={{ paddingLeft: '1rem', background: '#0f1117', cursor: 'pointer' }}
                      >
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    <button type="submit" className="btn-primary" disabled={isInviting}>
                      {isInviting ? <Spinner /> : <UserPlus size={14} />}
                      Invite
                    </button>
                  </form>
                </div>
              ) : (
                <div style={{
                  background: 'var(--color-bg-card)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '2rem',
                  textAlign: 'center',
                  color: 'var(--color-text-muted)'
                }}>
                  <ShieldAlert size={30} style={{ margin: '0 auto 0.75rem' }} />
                  <h4 style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.25rem' }}>Read-only Access</h4>
                  <p style={{ fontSize: '0.8rem', lineHeight: 1.4 }}>Only owners and admins can invite members or modify workspace configuration.</p>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default WorkspaceDetail;
