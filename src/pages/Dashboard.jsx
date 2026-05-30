import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LogOut,
  Code2,
  GitBranch,
  Users,
  MessageSquare,
  FileCode,
  Shield,
  Clock,
  Plus,
  Building,
  ArrowRight,
  FolderPlus,
  ShieldCheck,
  UserCheck,
  Menu,
  X,
  Search,
  Activity,
  Home,
  User,
  ChevronRight,
  Sparkles,
  Video,
  Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { getWorkspaces, deleteWorkspace } from '../api/workspace';
import { getBackendUrl } from '../api/axios';
import { getNotifications, markAllAsRead, markAsRead } from '../api/notification';
import CreateWorkspaceModal from '../components/CreateWorkspaceModal';
import WorkspaceDetail from './WorkspaceDetail';
import Spinner from '../components/Spinner';
import NotificationDropdown from '../components/NotificationDropdown';
import SearchModal from '../components/SearchModal';
import Footer from '../components/Footer';

/**
 * Dashboard Page (Protected)
 * Refactored into a modern professional app shell featuring collapsible sidebar drawer,
 * horizontal breadcrumbs header, statistics widgets, workspaces grid, and recent activities.
 */
const Dashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // Navigation & Drawer States
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(null);
  const [initialWorkspaceTab, setInitialWorkspaceTab] = useState('chat');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const handleOpenWorkspace = (workspaceId, tab = 'chat') => {
    setInitialWorkspaceTab(tab);
    setActiveWorkspaceId(workspaceId);
  };

  // Keyboard shortcut listener for Ctrl+K global search trigger
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Data States
  const [workspaces, setWorkspaces] = useState([]);
  const [isLoadingWorkspaces, setIsLoadingWorkspaces] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(true);



  const getAvatarUrl = (avatarPath) => {
    if (!avatarPath) return null;
    if (avatarPath.startsWith('http://') || avatarPath.startsWith('https://')) {
      return avatarPath;
    }
    return `${getBackendUrl()}${avatarPath}`;
  };

  // ─── Fetch Workspaces List ─────────────────────────────────────────
  const fetchWorkspacesList = async (silent = false) => {
    if (!silent) setIsLoadingWorkspaces(true);
    try {
      const data = await getWorkspaces();
      setWorkspaces(data.workspaces || []);
    } catch {
      toast.error('Failed to load workspaces.');
    } finally {
      setIsLoadingWorkspaces(false);
    }
  };

  // ─── Fetch Recent Activities ───────────────────────────────────────
  const fetchRecentActivity = async (silent = false) => {
    if (!silent) setIsLoadingNotifications(true);
    try {
      const data = await getNotifications();
      setNotifications(data.notifications || []);
    } catch (err) {
      console.error('Failed to fetch activity feed:', err.message);
    } finally {
      setIsLoadingNotifications(false);
    }
  };

  useEffect(() => {
    fetchWorkspacesList();
    fetchRecentActivity();

    const handleInvitationAction = () => {
      fetchWorkspacesList(true);
      fetchRecentActivity(true);
    };

    window.addEventListener('workspace_invitation_action', handleInvitationAction);
    return () => {
      window.removeEventListener('workspace_invitation_action', handleInvitationAction);
    };
  }, []);

  // ─── Logout handler ────────────────────────────────────────────────
  const handleLogout = async () => {
    const toastId = toast.loading('Signing out…');
    await logout();
    toast.success('Signed out successfully', { id: toastId });
    navigate('/login');
  };

  // ─── Delete Workspace handler ──────────────────────────────────────
  const handleDeleteWorkspace = async (e, workspaceId, workspaceName) => {
    e.stopPropagation(); // Stop navigation to workspace details
    const confirmation = window.confirm(`Delete "${workspaceName}" forever?`);
    if (!confirmation) return;
    const toastId = toast.loading('Deleting workspace...');
    try {
      await deleteWorkspace(workspaceId);
      toast.success('Workspace deleted successfully.', { id: toastId });
      fetchWorkspacesList();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete workspace.', { id: toastId });
    }
  };

  // Mark all activities as read
  const handleMarkAllRead = async () => {
    try {
      await markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      toast.success("All activities marked as read! 🎉");
    } catch {
      toast.error("Failed to mark activities as read.");
    }
  };

  // ─── Avatar initials ───────────────────────────────────────────────
  const initials = user?.profile?.nickname
    ? user.profile.nickname.slice(0, 2).toUpperCase()
    : user?.username
    ? user.username.slice(0, 2).toUpperCase()
    : '??';

  // ─── Member since ──────────────────────────────────────────────────
  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      })
    : '—';

  // ─── Stats calculations ────────────────────────────────────────────
  const workspacesCount = workspaces.length;
  const workspacesOwnedCount = workspaces.filter(w => w.owner._id === user?._id).length;
  
  // Total unique collaborators across all workspaces
  const collaboratorIds = new Set();
  workspaces.forEach(w => {
    w.members.forEach(m => {
      if (m.user._id !== user?._id) {
        collaboratorIds.add(m.user._id);
      }
    });
  });

  const stats = [
    { icon: <GitBranch size={16} />, value: String(workspacesCount), label: 'Total Workspaces' },
    { icon: <UserCheck size={16} />, value: String(workspacesOwnedCount), label: 'Workspaces Owned' },
    { icon: <Users size={16} />, value: String(collaboratorIds.size), label: 'Collaborators' },
    { icon: <FileCode size={16} />, value: '0', label: 'Code Reviews' },
  ];

  // Callback when a workspace is created successfully
  const handleCreateSuccess = (newWorkspace) => {
    setWorkspaces((prev) => [newWorkspace, ...prev]);
  };

  // Get user role in a specific workspace
  const getUserWorkspaceRole = (workspace) => {
    if (workspace.owner._id === user?._id) return 'Owner';
    const memberRecord = workspace.members.find(m => m.user._id === user?._id);
    return memberRecord?.role === 'admin' ? 'Admin' : 'Member';
  };

  const getInitials = (name) => {
    return name ? name.slice(0, 2).toUpperCase() : '??';
  };

  // Format activity timestamps
  const formatActivityTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--color-bg-primary)', overflow: 'hidden' }}>
      
      {/* ─── Collapsible mobile sidebar overlay backdrop ─────────────────── */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 40,
            background: 'rgba(5, 5, 8, 0.4)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)'
          }}
          className="md:hidden"
        />
      )}

      {/* ─── Sidebar Navigation Container ────────────────────────────────── */}
      <aside 
        style={{
          position: 'fixed',
          top: 0,
          bottom: 0,
          left: isSidebarOpen ? 0 : '-260px',
          width: '260px',
          background: 'rgba(15, 17, 23, 0.95)',
          borderRight: '1px solid var(--color-border)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        className="md:translate-x-0 md:static md:flex"
      >
        {/* Sidebar Brand Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div 
            style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', cursor: 'pointer' }}
            onClick={() => { setActiveWorkspaceId(null); setIsSidebarOpen(false); }}
          >
            <div style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: 'var(--gradient-brand)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Code2 size={16} color="#fff" />
            </div>
            <span style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>DevCollab</span>
          </div>

          <button 
            onClick={() => setIsSidebarOpen(false)}
            style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', display: 'flex' }}
            className="md:hidden"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation items */}
        <div style={{ padding: '1rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <button
            onClick={() => { setActiveWorkspaceId(null); setIsSidebarOpen(false); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              width: '100%',
              padding: '0.625rem 0.875rem',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: activeWorkspaceId === null ? 700 : 500,
              background: activeWorkspaceId === null ? 'var(--color-accent-subtle)' : 'transparent',
              color: activeWorkspaceId === null ? 'var(--color-accent-light)' : 'var(--color-text-secondary)',
              textAlign: 'left',
              transition: 'var(--transition-fast)'
            }}
            className="hover:bg-[rgba(255,255,255,0.02)]"
          >
            <Home size={15} />
            Home Dashboard
          </button>

          <button
            onClick={() => { navigate('/profile'); setIsSidebarOpen(false); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              width: '100%',
              padding: '0.625rem 0.875rem',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 500,
              background: 'transparent',
              color: 'var(--color-text-secondary)',
              textAlign: 'left',
              transition: 'var(--transition-fast)'
            }}
            className="hover:bg-[rgba(255,255,255,0.02)]"
          >
            <User size={15} />
            My Profile
          </button>
        </div>

        {/* Workspaces list */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0 1rem 0.5rem 1.5rem',
            fontSize: '0.75rem',
            fontWeight: 700,
            color: 'var(--color-text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            <span>Workspaces</span>
            <button 
              onClick={() => setIsCreateModalOpen(true)}
              style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', display: 'flex', padding: '2px', borderRadius: '4px' }}
              className="hover:text-white hover:bg-[rgba(255,255,255,0.05)]"
              title="Create Workspace"
            >
              <Plus size={14} />
            </button>
          </div>

          <div style={{ padding: '0 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {workspaces.length === 0 ? (
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', padding: '0.5rem 0.75rem', fontStyle: 'italic' }}>
                No workspaces
              </span>
            ) : (
              workspaces.map((ws) => {
                const isActive = activeWorkspaceId === ws._id;
                const initials = ws.name.slice(0, 2).toUpperCase();
                return (
                  <button
                    key={ws._id}
                    onClick={() => { handleOpenWorkspace(ws._id, 'chat'); setIsSidebarOpen(false); }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      width: '100%',
                      padding: '0.5rem 0.75rem',
                      borderRadius: 'var(--radius-md)',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      fontWeight: isActive ? 600 : 500,
                      background: isActive ? 'rgba(255, 255, 255, 0.03)' : 'transparent',
                      color: isActive ? '#fff' : 'var(--color-text-secondary)',
                      textAlign: 'left',
                      transition: 'var(--transition-fast)',
                      borderLeft: isActive ? '3px solid var(--color-accent-light)' : '3px solid transparent',
                      paddingLeft: isActive ? 'calc(0.75rem - 3px)' : '0.75rem'
                    }}
                    className="hover:bg-[rgba(255,255,255,0.02)]"
                  >
                    <div style={{
                      width: 22,
                      height: 22,
                      borderRadius: 6,
                      background: isActive ? 'var(--gradient-brand)' : 'rgba(255,255,255,0.06)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.65rem',
                      fontWeight: 800,
                      color: '#fff',
                      flexShrink: 0
                    }}>
                      {initials}
                    </div>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                      {ws.name}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* User bar at bottom */}
        <div style={{
          padding: '1rem',
          borderTop: '1px solid var(--color-border)',
          background: 'rgba(10, 11, 15, 0.4)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          flexShrink: 0
        }}>
          <div 
            onClick={() => navigate('/profile')}
            style={{ position: 'relative', cursor: 'pointer', flexShrink: 0 }}
            title="View Profile"
          >
            {user?.avatar ? (
              <img 
                src={getAvatarUrl(user.avatar)} 
                alt={user.username} 
                style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--color-border)' }}
              />
            ) : (
              <div className="avatar-circle" style={{ width: 34, height: 34, fontSize: '0.75rem' }}>
                {initials}
              </div>
            )}
            <span style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              width: 9,
              height: 9,
              borderRadius: '50%',
              background: 'var(--color-success)',
              border: '1.5px solid #0f1117'
            }} />
          </div>

          <div 
            onClick={() => navigate('/profile')}
            style={{ flex: 1, minWidth: 0, cursor: 'pointer', textAlign: 'left' }}
            title="View Profile"
          >
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.profile?.nickname || user?.username}
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.email}
            </div>
          </div>

          <button 
            onClick={handleLogout}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
              padding: '0.25rem',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'var(--transition-fast)'
            }}
            className="hover:text-[var(--color-error)] hover:bg-[rgba(239,68,68,0.05)]"
            title="Log out"
          >
            <LogOut size={15} />
          </button>
        </div>
      </aside>

      {/* ─── Main Viewport ──────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, height: '100vh', overflow: 'hidden' }}>
        
        {/* Top Navbar Header */}
        <header style={{
          height: '60px',
          borderBottom: '1px solid var(--color-border)',
          background: 'rgba(10, 11, 15, 0.4)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 1.5rem',
          flexShrink: 0,
          zIndex: 30
        }}>
          {/* Breadcrumbs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button 
              onClick={() => setIsSidebarOpen(true)}
              style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', display: 'flex' }}
              className="md:hidden"
            >
              <Menu size={20} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>
              <span>DevCollab</span>
              <ChevronRight size={12} />
              {activeWorkspaceId ? (
                <>
                  <span style={{ cursor: 'pointer' }} className="hover:text-white" onClick={() => setActiveWorkspaceId(null)}>Workspaces</span>
                  <ChevronRight size={12} />
                  <span style={{ color: '#fff' }}>
                    {workspaces.find(w => w._id === activeWorkspaceId)?.name || 'Workspace details'}
                  </span>
                </>
              ) : (
                <span style={{ color: '#fff' }}>Dashboard</span>
              )}
            </div>
          </div>

          {/* Search + Alerts bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            {/* Search Input Box */}
            <div style={{ position: 'relative' }} className="hidden sm:block">
              <Search size={13} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
              <input 
                type="text" 
                placeholder="Search... (Ctrl+K)"
                readOnly
                onClick={() => setIsSearchOpen(true)}
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '16px',
                  padding: '0.35rem 1rem 0.35rem 2rem',
                  fontSize: '0.75rem',
                  color: '#fff',
                  width: '160px',
                  outline: 'none',
                  transition: 'var(--transition-normal)',
                  cursor: 'pointer'
                }}
              />
            </div>
            
            <NotificationDropdown onWorkspaceSelect={handleOpenWorkspace} />
          </div>
        </header>

        {/* Content Panel */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 2rem', display: 'flex', flexDirection: 'column' }}>
          
          {activeWorkspaceId ? (
            /* Workspace Detail Mode */
            <WorkspaceDetail 
              workspaceId={activeWorkspaceId} 
              initialTab={initialWorkspaceTab}
              onBack={() => { 
                setActiveWorkspaceId(null); 
                fetchWorkspacesList(true); 
              }} 
              onWorkspaceDeleted={() => {
                setActiveWorkspaceId(null);
                fetchWorkspacesList();
              }}
              currentUser={user}
            />
          ) : (
            <>
              {/* Dashboard Home Panel (Grid Layout) */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr',
                gap: '1.5rem',
              }} className="lg:grid-cols-3">
              
              {/* Left Side Column: Workspaces grid + Stats list */}
              <div className="lg:col-span-2" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                
                {/* Greetings Banner */}
                <div>
                  <h1 style={{
                    fontSize: '1.75rem',
                    fontWeight: 800,
                    color: 'var(--color-text-primary)',
                    letterSpacing: '-0.04em',
                    marginBottom: '0.375rem',
                  }}>
                    Welcome back,{' '}
                    <span style={{
                      background: 'var(--gradient-brand)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}>
                      {user?.profile?.nickname || user?.username}
                    </span>{' '}
                    👋
                  </h1>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                    Here is what is happening across your projects today.
                  </p>
                </div>

                {/* Platforms stats */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                  gap: '1rem'
                }}>
                  {stats.map((stat, idx) => (
                    <div key={idx} className="stat-card" style={{ padding: '1rem', minHeight: '90px' }}>
                      <div className="stat-icon" style={{ width: 28, height: 28, marginBottom: '0.5rem' }}>
                        {stat.icon}
                      </div>
                      <div className="stat-value" style={{ fontSize: '1.375rem', fontWeight: 800 }}>{stat.value}</div>
                      <div className="stat-label" style={{ fontSize: '0.7rem' }}>{stat.label}</div>
                    </div>
                  ))}
                </div>

                {/* Workspaces List Header */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: '1px solid var(--color-border)',
                  paddingBottom: '0.5rem',
                }}>
                  <h2 style={{
                    fontSize: '1.05rem',
                    fontWeight: 800,
                    color: '#fff',
                    letterSpacing: '-0.02em',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <Building size={16} color="var(--color-accent-light)" />
                    Shared Workspaces
                  </h2>
                  
                  <button
                    className="btn-primary"
                    onClick={() => setIsCreateModalOpen(true)}
                    style={{ width: 'auto', padding: '0.375rem 0.875rem', fontSize: '0.8rem' }}
                  >
                    <Plus size={14} />
                    New Workspace
                  </button>
                </div>

                {/* Workspaces list Grid cards */}
                {isLoadingWorkspaces ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3rem 0', gap: '1rem', color: 'var(--color-text-muted)' }}>
                    <Spinner />
                    <span>Loading workspaces...</span>
                  </div>
                ) : workspaces.length === 0 ? (
                  /* Empty state */
                  <div style={{
                    background: 'var(--color-bg-card)',
                    border: '1px dashed var(--color-border)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '3rem 2rem',
                    textAlign: 'center',
                  }}>
                    <FolderPlus size={32} style={{ margin: '0 auto 0.75rem', color: 'var(--color-text-muted)' }} />
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '0.25rem' }}>
                      No workspaces yet
                    </h3>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', maxWidth: 360, margin: '0 auto 1.25rem', lineHeight: 1.4 }}>
                      Create a workspace, invite collaborators, and start discussing issues.
                    </p>
                    <button
                      className="btn-primary"
                      onClick={() => setIsCreateModalOpen(true)}
                      style={{ width: 'auto', padding: '0.5rem 1rem', margin: '0 auto', fontSize: '0.8rem' }}
                    >
                      <Plus size={14} />
                      Create Workspace
                    </button>
                  </div>
                ) : (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                    gap: '1.25rem'
                  }}>
                    {workspaces.map((workspace) => {
                      const role = getUserWorkspaceRole(workspace);
                      const wsInitials = workspace.name.slice(0, 2).toUpperCase();

                      return (
                        <div 
                          key={workspace._id}
                          className="stat-card file-card-hover"
                          onClick={() => handleOpenWorkspace(workspace._id, 'chat')}
                          style={{
                            cursor: 'pointer',
                            padding: '1.25rem',
                            display: 'flex',
                            flexDirection: 'column',
                            minHeight: '150px',
                            justifyContent: 'space-between',
                            position: 'relative'
                          }}
                        >
                          <div>
                            {/* Card title & role */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.375rem' }}>
                              <h3 style={{
                                fontSize: '0.95rem',
                                fontWeight: 700,
                                color: '#fff',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                flex: 1
                              }}>
                                {workspace.name}
                              </h3>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                <span className="role-badge" style={
                                  role === 'Owner' 
                                    ? { background: 'rgba(245, 158, 11, 0.1)', borderColor: 'rgba(245, 158, 11, 0.3)', color: 'var(--color-warning)', fontSize: '0.625rem', padding: '0.1rem 0.4rem' }
                                    : role === 'Admin' 
                                    ? { background: 'rgba(139, 92, 246, 0.1)', borderColor: 'rgba(139, 92, 246, 0.3)', color: 'var(--color-accent-light)', fontSize: '0.625rem', padding: '0.1rem 0.4rem' }
                                    : { background: 'rgba(255, 255, 255, 0.03)', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)', fontSize: '0.625rem', padding: '0.1rem 0.4rem' }
                                }>
                                  {role === 'Owner' ? 'Owner' : role}
                                </span>
                                {role === 'Owner' && (
                                  <button
                                    onClick={(e) => handleDeleteWorkspace(e, workspace._id, workspace.name)}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      color: 'var(--color-text-muted)',
                                      cursor: 'pointer',
                                      padding: '2px',
                                      borderRadius: '4px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      transition: 'var(--transition-fast)'
                                    }}
                                    onMouseEnter={(e) => {
                                      e.stopPropagation();
                                      e.currentTarget.style.color = 'var(--color-error)';
                                      e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.stopPropagation();
                                      e.currentTarget.style.color = 'var(--color-text-muted)';
                                      e.currentTarget.style.background = 'transparent';
                                    }}
                                    title="Delete Workspace"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Description snippet */}
                            <p style={{
                              color: 'var(--color-text-muted)',
                              fontSize: '0.75rem',
                              lineHeight: 1.4,
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              marginBottom: '1rem',
                              height: '34px'
                            }}>
                              {workspace.description || 'No description provided.'}
                            </p>
                          </div>

                          {/* Collaborator circles stack */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            borderTop: '1px solid var(--color-border)',
                            paddingTop: '0.75rem',
                            fontSize: '0.7rem'
                          }}>
                            {/* Collaborator Avatars */}
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              {/* Owner */}
                              <div style={{ position: 'relative', zIndex: 10 }} title={`Owner: ${workspace.owner.username}`}>
                                {workspace.owner.avatar ? (
                                  <img 
                                    src={getAvatarUrl(workspace.owner.avatar)} 
                                    alt={workspace.owner.username} 
                                    style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover', border: '1.5px solid #0f1117' }}
                                  />
                                ) : (
                                  <div className="avatar-circle" style={{ width: 22, height: 22, fontSize: '0.55rem', border: '1.5px solid #0f1117' }}>
                                    {getInitials(workspace.owner.profile?.nickname || workspace.owner.username)}
                                  </div>
                                )}
                              </div>
                              
                              {/* Members */}
                              {workspace.members.slice(0, 3).map((m, mIdx) => {
                                const memberUser = m.user;
                                if (!memberUser) return null;
                                return (
                                  <div key={memberUser._id} style={{ position: 'relative', zIndex: 9 - mIdx, marginLeft: '-6px' }} title={`${m.role}: ${memberUser.username}`}>
                                    {memberUser.avatar ? (
                                      <img 
                                        src={getAvatarUrl(memberUser.avatar)} 
                                        alt={memberUser.username} 
                                        style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover', border: '1.5px solid #0f1117' }}
                                      />
                                    ) : (
                                      <div className="avatar-circle" style={{ width: 22, height: 22, fontSize: '0.55rem', border: '1.5px solid #0f1117', background: m.role === 'admin' ? 'var(--color-accent)' : 'rgba(255,255,255,0.06)' }}>
                                        {getInitials(memberUser.profile?.nickname || memberUser.username)}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}

                              {workspace.members.length > 3 && (
                                <span style={{
                                  fontSize: '0.625rem',
                                  color: 'var(--color-text-muted)',
                                  fontWeight: 700,
                                  marginLeft: '0.25rem',
                                  background: 'rgba(255,255,255,0.02)',
                                  padding: '0.05rem 0.25rem',
                                  borderRadius: '3px',
                                  border: '1px solid var(--color-border)',
                                  flexShrink: 0
                                }}>
                                  +{workspace.members.length - 3}
                                </span>
                              )}
                            </div>

                            {/* Arrow launcher link icon */}
                            <span style={{ color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center' }}>
                              <ArrowRight size={13} className="hover:text-white" />
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Right Side Column: Activity Feed panel */}
              <div className="lg:col-span-1" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                
                {/* Recent Activity Card */}
                <div style={{
                  background: 'var(--color-bg-card)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  minHeight: '260px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>
                    <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Activity size={14} color="var(--color-accent-light)" />
                      Recent Activity
                    </h3>
                    {notifications.some(n => !n.isRead) && (
                      <button 
                        onClick={handleMarkAllRead}
                        style={{ background: 'none', border: 'none', color: 'var(--color-accent-light)', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}
                        className="hover:underline"
                      >
                        Clear All
                      </button>
                    )}
                  </div>

                  {isLoadingNotifications ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem 0', flex: 1 }}>
                      <Spinner />
                    </div>
                  ) : notifications.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--color-text-muted)', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                      <Sparkles size={20} color="rgba(255,255,255,0.1)" />
                      <span>All caught up! No recent alerts.</span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                      {notifications.slice(0, 6).map((n) => {
                        const isUnread = !n.isRead;
                        return (
                          <div 
                            key={n._id} 
                            onClick={async () => {
                              if (isUnread) {
                                try {
                                  await markAsRead(n._id);
                                  setNotifications(prev => prev.map(notif => notif._id === n._id ? { ...notif, isRead: true } : notif));
                                } catch (err) {
                                  console.error("Failed to mark read:", err);
                                }
                              }
                              if (n.workspace) {
                                const workspaceId = typeof n.workspace === 'object' ? n.workspace._id : n.workspace;
                                const targetTab = n.type === 'meeting' ? 'meeting' : 'chat';
                                handleOpenWorkspace(workspaceId, targetTab);
                              }
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '0.75rem',
                              background: isUnread ? 'rgba(139, 92, 246, 0.02)' : 'transparent',
                              border: isUnread ? '1px dashed rgba(139, 92, 246, 0.15)' : '1px solid transparent',
                              borderRadius: 'var(--radius-md)',
                              padding: '0.5rem',
                              transition: 'var(--transition-fast)',
                              cursor: n.workspace ? 'pointer' : 'default'
                            }}
                          >
                            {/* Icon mapping */}
                            <div style={{
                              width: 28,
                              height: 28,
                              borderRadius: 8,
                              background: n.type === 'task_assignment' 
                                ? 'rgba(16, 185, 129, 0.1)' 
                                : n.type === 'mention' 
                                ? 'rgba(139, 92, 246, 0.1)' 
                                : n.type === 'meeting'
                                ? 'rgba(236, 72, 153, 0.1)'
                                : 'rgba(245, 158, 11, 0.1)',
                              color: n.type === 'task_assignment' 
                                ? 'var(--color-success)' 
                                : n.type === 'mention' 
                                ? 'var(--color-accent-light)' 
                                : n.type === 'meeting'
                                ? '#ec4899'
                                : 'var(--color-warning)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}>
                              {n.type === 'task_assignment' ? <UserCheck size={13} /> : n.type === 'mention' ? <MessageSquare size={13} /> : n.type === 'meeting' ? <Video size={13} /> : <Building size={13} />}
                            </div>

                            {/* Alert Details */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.5rem' }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {n.title}
                                </span>
                                <span style={{ fontSize: '0.625rem', color: 'var(--color-text-muted)', flexShrink: 0 }}>
                                  {formatActivityTime(n.createdAt)}
                                </span>
                              </div>
                              <p style={{
                                fontSize: '0.7rem',
                                color: 'var(--color-text-secondary)',
                                lineHeight: 1.3,
                                marginTop: '0.1rem',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden'
                              }} title={n.message}>
                                {n.message}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                
              </div>

              </div>
              <Footer />
            </>
          )}
          
        </div>
      </div>

      {/* Create workspace modal */}
      <CreateWorkspaceModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleCreateSuccess}
      />

      {/* Spotlight Search Modal */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectWorkspace={handleOpenWorkspace}
      />
    </div>
  );
};

export default Dashboard;
