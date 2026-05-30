import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LogOut,
  Code2,
  GitBranch,
  Users,
  Plus,
  Menu,
  X,
  ChevronRight,
  Gamepad2,
  Trophy,
  Volume2,
  VolumeX,
  Home,
  User,
  Activity,
  Target,
  Keyboard,
  Brain,
  Play
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { getWorkspaces } from '../api/workspace';
import { getBackendUrl } from '../api/axios';
import NotificationDropdown from '../components/NotificationDropdown';
import SearchModal from '../components/SearchModal';
import Footer from '../components/Footer';

// Game Component imports
import BugHunter from '../components/arcade/games/BugHunter';
import DevSnake from '../components/arcade/games/DevSnake';
import MemoryMatch from '../components/arcade/games/MemoryMatch';
import TypingSprint from '../components/arcade/games/TypingSprint';
import GitMergePuzzle from '../components/arcade/games/GitMergePuzzle';
import ArcadeStats from '../components/arcade/ArcadeStats';

import { playClickSound } from '../components/arcade/utils/audio';

const DevArcade = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // App Shell States
  const [workspaces, setWorkspaces] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Arcade Specific States
  const [activeTab, setActiveTab] = useState('games'); // 'games' or 'stats'
  const [activeGame, setActiveGame] = useState(null); // 'bughunter', 'snake', 'memory', 'typing', 'git' or null
  const [soundEnabled, setSoundEnabled] = useState(
    localStorage.getItem('arcade_sound_enabled') !== 'false'
  );

  // Keyboard shortcut listener for Ctrl+K global search
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

  // Fetch workspaces for the sidebar compatibility
  const fetchWorkspaces = async () => {
    try {
      const data = await getWorkspaces();
      setWorkspaces(data.workspaces || []);
    } catch {
      // Fail silently for secondary components
    }
  };

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  // Handle Logout
  const handleLogout = async () => {
    const toastId = toast.loading('Signing out…');
    await logout();
    toast.success('Signed out successfully', { id: toastId });
    navigate('/login');
  };

  const getAvatarUrl = (avatarPath) => {
    if (!avatarPath) return null;
    if (avatarPath.startsWith('http://') || avatarPath.startsWith('https://')) {
      return avatarPath;
    }
    return `${getBackendUrl()}${avatarPath}`;
  };

  const initials = user?.profile?.nickname
    ? user.profile.nickname.slice(0, 2).toUpperCase()
    : user?.username
    ? user.username.slice(0, 2).toUpperCase()
    : '??';

  const toggleSound = () => {
    const newState = !soundEnabled;
    setSoundEnabled(newState);
    localStorage.setItem('arcade_sound_enabled', String(newState));
    playClickSound();
  };

  // Launch a game
  const launchGame = (gameId) => {
    setActiveGame(gameId);
    playClickSound();
  };

  // Callback when a game completes to update total play stats
  const handleGameScoreSubmit = (gameId, score) => {
    // 1. Increment total games played count
    const totalPlayed = parseInt(localStorage.getItem('arcade_total_played_count') || '0', 10);
    localStorage.setItem('arcade_total_played_count', String(totalPlayed + 1));
    
    // 2. Alert achievements updates
    toast.success(`Game finished! Score: ${score} points registered.`);
  };

  const renderActiveGame = () => {
    switch (activeGame) {
      case 'bughunter':
        return <BugHunter onBack={() => setActiveGame(null)} onScoreSubmit={handleGameScoreSubmit} />;
      case 'snake':
        return <DevSnake onBack={() => setActiveGame(null)} onScoreSubmit={handleGameScoreSubmit} />;
      case 'memory':
        return <MemoryMatch onBack={() => setActiveGame(null)} onScoreSubmit={handleGameScoreSubmit} />;
      case 'typing':
        return <TypingSprint onBack={() => setActiveGame(null)} onScoreSubmit={handleGameScoreSubmit} />;
      case 'git':
        return <GitMergePuzzle onBack={() => setActiveGame(null)} onScoreSubmit={handleGameScoreSubmit} />;
      default:
        return null;
    }
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
            onClick={() => navigate('/dashboard')}
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
            onClick={() => navigate('/dashboard')}
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
            <Home size={15} />
            Home Dashboard
          </button>

          <button
            onClick={() => navigate('/profile')}
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

          <button
            onClick={() => setIsSidebarOpen(false)}
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
              fontWeight: 700,
              background: 'var(--color-accent-subtle)',
              color: 'var(--color-accent-light)',
              textAlign: 'left',
              transition: 'var(--transition-fast)'
            }}
          >
            <Gamepad2 size={15} />
            Dev Arcade
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
          </div>

          <div style={{ padding: '0 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {workspaces.map((ws) => {
              const initials = ws.name.slice(0, 2).toUpperCase();
              return (
                <button
                  key={ws._id}
                  onClick={() => navigate('/dashboard')}
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
                    fontWeight: 500,
                    background: 'transparent',
                    color: 'var(--color-text-secondary)',
                    textAlign: 'left',
                    transition: 'var(--transition-fast)',
                  }}
                  className="hover:bg-[rgba(255,255,255,0.02)]"
                >
                  <div style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    background: 'rgba(255,255,255,0.06)',
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
            })}
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
          <div onClick={() => navigate('/profile')} style={{ position: 'relative', cursor: 'pointer', flexShrink: 0 }} title="View Profile">
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

          <div onClick={() => navigate('/profile')} style={{ flex: 1, minWidth: 0, cursor: 'pointer', textAlign: 'left' }} title="View Profile">
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
              <span style={{ cursor: 'pointer' }} className="hover:text-white" onClick={() => { setActiveGame(null); setActiveTab('games'); }}>
                Dev Arcade
              </span>
              {activeGame && (
                <>
                  <ChevronRight size={12} />
                  <span style={{ color: '#fff', textTransform: 'capitalize' }}>
                    {activeGame === 'bughunter' ? 'Bug Hunter' : activeGame === 'snake' ? 'Dev Snake' : activeGame === 'memory' ? 'Memory Match' : activeGame === 'typing' ? 'Typing Sprint' : 'Git Merge Puzzle'}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Audio options */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <button onClick={toggleSound} className="btn-logout" style={{ padding: '0.5rem', borderRadius: '50%' }} title="Toggle Sound">
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
            <NotificationDropdown onWorkspaceSelect={() => navigate('/dashboard')} />
          </div>
        </header>

        {/* Content Panel */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 2rem', display: 'flex', flexDirection: 'column' }}>
          
          {activeGame ? (
            /* A game is active - render its viewport */
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'slideUp 0.3s ease both' }}>
              {renderActiveGame()}
            </div>
          ) : (
            /* Dashboard view (Games list OR stats tabs) */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', animation: 'slideUp 0.3s ease both' }}>
              
              {/* Header Title & Tab selectors */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.04em', marginBottom: '0.375rem' }}>
                    🎮 Dev Arcade
                  </h1>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                    Take a break and test your developer reflexes, typing speed, memory, and git knowledge!
                  </p>
                </div>

                {/* Sub Tab buttons */}
                <div style={{ display: 'flex', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '3px' }}>
                  <button
                    onClick={() => { setActiveTab('games'); playClickSound(); }}
                    className={activeTab === 'games' ? 'btn-primary' : 'btn-logout'}
                    style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.8rem', borderRadius: '9px', border: 'none', background: activeTab === 'games' ? 'var(--gradient-brand)' : 'transparent' }}
                  >
                    Arcade Games
                  </button>
                  <button
                    onClick={() => { setActiveTab('stats'); playClickSound(); }}
                    className={activeTab === 'stats' ? 'btn-primary' : 'btn-logout'}
                    style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.8rem', borderRadius: '9px', border: 'none', background: activeTab === 'stats' ? 'var(--gradient-brand)' : 'transparent' }}
                  >
                    Stats & Badges
                  </button>
                </div>
              </div>

              {activeTab === 'games' ? (
                /* ─── GAMES LIST GRID ───────────────────────────────────── */
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: '1.25rem',
                  marginTop: '0.5rem',
                }}>
                  {/* Game 1: Bug Hunter */}
                  <div className="stat-card file-card-hover" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyBetween: 'space-between', minHeight: '190px' }}>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                      <div style={{ width: 38, height: 38, borderRadius: '10px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>
                        🎯
                      </div>
                      <div style={{ textAlign: 'left' }}>
                        <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#fff' }}>Bug Hunter</h3>
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', lineHeight: 1.4, marginTop: '0.25rem' }}>
                          Squash the crawling bugs before the time runs out! Watch out for ant, spider, and ladybug speeds.
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                        Best: <span style={{ color: '#fff', fontWeight: 700 }}>{localStorage.getItem('arcade_bughunter_highscore') || 0} pts</span>
                      </span>
                      <button onClick={() => launchGame('bughunter')} className="btn-primary" style={{ width: 'auto', padding: '0.35rem 0.875rem', fontSize: '0.75rem', gap: '0.25rem' }}>
                        <Play size={11} fill="#fff" /> Play Now
                      </button>
                    </div>
                  </div>

                  {/* Game 2: Dev Snake */}
                  <div className="stat-card file-card-hover" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyBetween: 'space-between', minHeight: '190px' }}>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                      <div style={{ width: 38, height: 38, borderRadius: '10px', background: 'rgba(139,92,246,0.1)', color: 'var(--color-accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>
                        🐍
                      </div>
                      <div style={{ textAlign: 'left' }}>
                        <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#fff' }}>Dev Snake</h3>
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', lineHeight: 1.4, marginTop: '0.25rem' }}>
                          Guide the neon snake to eat programming icons (JS, Python, TS, Go, Rust) and grow without crashing.
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                        Best: <span style={{ color: '#fff', fontWeight: 700 }}>{localStorage.getItem('arcade_snake_highscore') || 0} pts</span>
                      </span>
                      <button onClick={() => launchGame('snake')} className="btn-primary" style={{ width: 'auto', padding: '0.35rem 0.875rem', fontSize: '0.75rem', gap: '0.25rem' }}>
                        <Play size={11} fill="#fff" /> Play Now
                      </button>
                    </div>
                  </div>

                  {/* Game 3: Memory Match */}
                  <div className="stat-card file-card-hover" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyBetween: 'space-between', minHeight: '190px' }}>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                      <div style={{ width: 38, height: 38, borderRadius: '10px', background: 'rgba(16,185,129,0.1)', color: 'var(--color-success)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>
                        🧠
                      </div>
                      <div style={{ textAlign: 'left' }}>
                        <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#fff' }}>Memory Match</h3>
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', lineHeight: 1.4, marginTop: '0.25rem' }}>
                          Flip and match matching developer tags (React, Node, MongoDB, Git). Available in Easy and Hard grids.
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                        Best: <span style={{ color: '#fff', fontWeight: 700 }}>{localStorage.getItem('arcade_memory_highscore') || 0} pts</span>
                      </span>
                      <button onClick={() => launchGame('memory')} className="btn-primary" style={{ width: 'auto', padding: '0.35rem 0.875rem', fontSize: '0.75rem', gap: '0.25rem' }}>
                        <Play size={11} fill="#fff" /> Play Now
                      </button>
                    </div>
                  </div>

                  {/* Game 4: Typing Sprint */}
                  <div className="stat-card file-card-hover" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyBetween: 'space-between', minHeight: '190px' }}>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                      <div style={{ width: 38, height: 38, borderRadius: '10px', background: 'rgba(59,130,246,0.1)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>
                        ⌨️
                      </div>
                      <div style={{ textAlign: 'left' }}>
                        <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#fff' }}>Typing Sprint</h3>
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', lineHeight: 1.4, marginTop: '0.25rem' }}>
                          Test your coding speed! Type monospaced React components, async fetch calls, and python helpers.
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                        Best: <span style={{ color: '#fff', fontWeight: 700 }}>{localStorage.getItem('arcade_typing_highscore') || 0} WPM</span>
                      </span>
                      <button onClick={() => launchGame('typing')} className="btn-primary" style={{ width: 'auto', padding: '0.35rem 0.875rem', fontSize: '0.75rem', gap: '0.25rem' }}>
                        <Play size={11} fill="#fff" /> Play Now
                      </button>
                    </div>
                  </div>

                  {/* Game 5: Git Merge Puzzle */}
                  <div className="stat-card file-card-hover" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyBetween: 'space-between', minHeight: '190px' }}>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                      <div style={{ width: 38, height: 38, borderRadius: '10px', background: 'rgba(245,158,11,0.1)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>
                        🌳
                      </div>
                      <div style={{ textAlign: 'left' }}>
                        <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#fff' }}>Git Merge Puzzle</h3>
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', lineHeight: 1.4, marginTop: '0.25rem' }}>
                          Resolve real-world git merge conflicts between main and features. Teaches Helmet, CORS, and Vercel routing rules.
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                        Best: <span style={{ color: '#fff', fontWeight: 700 }}>{localStorage.getItem('arcade_git_highscore') || 0} pts</span>
                      </span>
                      <button onClick={() => launchGame('git')} className="btn-primary" style={{ width: 'auto', padding: '0.35rem 0.875rem', fontSize: '0.75rem', gap: '0.25rem' }}>
                        <Play size={11} fill="#fff" /> Play Now
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* ─── ARCADE STATS & ACHIEVEMENTS PANEL ─────────────────── */
                <ArcadeStats />
              )}
            </div>
          )}

          {/* Global Footer */}
          {!activeGame && <div style={{ marginTop: '3rem' }}><Footer /></div>}
        </div>
      </div>

      {/* Spotlight Search Modal */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectWorkspace={() => navigate('/dashboard')}
      />
    </div>
  );
};

export default DevArcade;
