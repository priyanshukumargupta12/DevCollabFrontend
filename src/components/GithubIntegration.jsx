import { useState, useEffect } from 'react';
import { 
  GitBranch, 
  Search, 
  Star, 
  ExternalLink, 
  TrendingUp, 
  Link, 
  Unlink 
} from 'lucide-react';

const Github = ({ size = 24, ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);
import toast from 'react-hot-toast';
import { 
  getGithubConfig, 
  connectGithub, 
  disconnectGithub, 
  getGithubProfile, 
  getGithubRepos, 
  searchGithubRepos, 
  getGithubContributions 
} from '../api/github';
import Spinner from './Spinner';

/**
 * GithubIntegration Component
 * Renders GitHub user profile, contributions heatmap, and searchable repositories grid.
 * Integrates directly inside the user's profile dashboard.
 */
const GithubIntegration = ({ currentUser, onUserUpdate }) => {
  const [profile, setProfile] = useState(null);
  const [repos, setRepos] = useState([]);
  const [calendar, setCalendar] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [searching, setSearching] = useState(false);

  const isConnected = !!(profile || currentUser?.githubUsername);

  // Fetch all GitHub related data if connected
  const fetchGithubData = async () => {
    setLoading(true);
    try {
      const [profData, repoData, contribData] = await Promise.all([
        getGithubProfile(),
        getGithubRepos(),
        getGithubContributions()
      ]);
      setProfile(profData.profile);
      setRepos(repoData.repos);
      setCalendar(contribData.calendar);
    } catch (err) {
      console.warn("Failed loading GitHub linked data:", err.message);
    } finally {
      setLoading(false);
    }
  };

  // Check URL query parameters for OAuth callback code on mount
  useEffect(() => {
    const handleOAuthCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      if (code) {
        setConnecting(true);
        const toastId = toast.loading('Connecting your GitHub account...');
        try {
          // Remove code from URL immediately to keep it clean
          window.history.replaceState({}, document.title, window.location.pathname);
          
          const data = await connectGithub(code);
          toast.success(data.message || 'GitHub linked successfully! 🎉', { id: toastId });
          if (onUserUpdate && data.user) {
            onUserUpdate(data.user);
          }
          await fetchGithubData();
        } catch (err) {
          toast.error(err.response?.data?.message || 'OAuth linking failed.', { id: toastId });
        } finally {
          setConnecting(false);
        }
      } else if (currentUser?.githubUsername) {
        fetchGithubData();
      } else {
        setLoading(false);
      }
    };

    handleOAuthCallback();
  }, [currentUser]);

  // Handle OAuth Redirect or Demo Connection
  const handleConnect = async () => {
    setConnecting(true);
    try {
      const config = await getGithubConfig();
      const clientId = config.clientId;

      if (!clientId || clientId.includes('placeholder')) {
        // Enforce demo mode if keys are placeholders
        const toastId = toast.loading('Connecting in Demo mode...');
        const data = await connectGithub('demo-code');
        toast.success(data.message || 'GitHub connected (Demo Mode)! 🎉', { id: toastId });
        if (onUserUpdate && data.user) {
          onUserUpdate(data.user);
        }
        setConnecting(false);
        return;
      }

      // Redirect to GitHub OAuth Authorization Page
      const redirectUri = `${window.location.origin}${window.location.pathname}`;
      const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=read:user,repo&redirect_uri=${encodeURIComponent(redirectUri)}`;
      window.location.href = authUrl;
    } catch (err) {
      toast.error('Failed to connect with GitHub.');
      setConnecting(false);
    }
  };

  // Handle Disconnect
  const handleDisconnect = async () => {
    if (!window.confirm('Are you sure you want to disconnect your GitHub account?')) return;
    setConnecting(true);
    const toastId = toast.loading('Disconnecting GitHub...');
    try {
      const data = await disconnectGithub();
      toast.success(data.message || 'GitHub account disconnected.', { id: toastId });
      setProfile(null);
      setRepos([]);
      setCalendar(null);
      if (onUserUpdate && data.user) {
        onUserUpdate(data.user);
      }
    } catch (err) {
      toast.error('Failed to disconnect GitHub account.', { id: toastId });
    } finally {
      setConnecting(false);
    }
  };

  // Debounced/instant query search on repositories list
  useEffect(() => {
    if (!isConnected) return;
    if (searchQuery.trim() === '') {
      // Reload base repositories
      getGithubRepos().then(data => setRepos(data.repos)).catch(() => {});
      return;
    }

    setSearching(true);
    const delayDebounce = setTimeout(async () => {
      try {
        const data = await searchGithubRepos(searchQuery.trim());
        setRepos(data.repos);
      } catch (err) {
        console.error("Repository search failed:", err);
      } finally {
        setSearching(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  // Color mapping helper for repository languages
  const getLangColor = (lang) => {
    switch (lang?.toLowerCase()) {
      case 'javascript': return '#f1e05a';
      case 'typescript': return '#3178c6';
      case 'html': return '#e34c26';
      case 'css': return '#563d7c';
      case 'python': return '#3572a5';
      case 'go': return '#00add8';
      default: return '#8b949e';
    }
  };

  // ─── RENDERING: LOADING STATE ──────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '220px', gap: '0.75rem' }}>
        <Spinner />
        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Fetching GitHub integration status...</span>
      </div>
    );
  }

  // ─── RENDERING: DISCONNECTED STATE ───────────────────────────────────────
  if (!isConnected) {
    return (
      <div style={{
        background: 'var(--color-bg-card)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '2.5rem 2rem',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1.25rem',
        animation: 'slideUp 0.3s ease both'
      }}>
        <div style={{
          width: 50,
          height: 50,
          borderRadius: 14,
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--color-text-muted)'
        }}>
          <Github size={24} />
        </div>
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', marginBottom: '0.35rem' }}>Connect GitHub Profile</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', lineHeight: 1.5, maxWidth: '420px', margin: '0 auto' }}>
            Showcase your open source repositories, language distributions, and contribution activity heatmap directly on your collaborator dashboard.
          </p>
        </div>
        <button
          onClick={handleConnect}
          disabled={connecting}
          className="btn-primary"
          style={{ padding: '0.625rem 1.25rem', fontSize: '0.8rem', gap: '0.5rem' }}
        >
          {connecting ? <Spinner style={{ width: 14, height: 14 }} /> : <Link size={14} />}
          {connecting ? 'Linking Account...' : 'Link GitHub Account'}
        </button>
      </div>
    );
  }

  // ─── RENDERING: CONNECTED VIEWPORT ───────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', animation: 'slideUp 0.3s ease both' }}>
      
      {/* 1. Profile Header Overview Card */}
      <div style={{
        background: 'var(--color-bg-card)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1.25rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: 0 }}>
          {/* GitHub Avatar */}
          <img 
            src={profile?.avatar_url || 'https://github.com/identicons/placeholder.png'} 
            alt={profile?.login} 
            style={{ width: 52, height: 52, borderRadius: '50%', border: '2px solid var(--color-border)', objectFit: 'cover' }}
          />

          {/* Profile Details */}
          <div style={{ minWidth: 0 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>{profile?.name || profile?.login}</span>
              <a 
                href={profile?.html_url} 
                target="_blank" 
                rel="noreferrer" 
                style={{ color: 'var(--color-text-muted)', display: 'inline-flex' }} 
                className="hover:text-white"
              >
                <ExternalLink size={12} />
              </a>
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>@{profile?.login}</span>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {profile?.bio || 'MERN Platform Developer linked with GitHub.'}
            </p>
          </div>
        </div>

        {/* Stats Stacks & Disconnect action */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 800, color: '#fff', fontSize: '0.9rem' }}>{profile?.public_repos || 0}</div>
              <span>Repositories</span>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 800, color: '#fff', fontSize: '0.9rem' }}>{profile?.followers || 0}</div>
              <span>Followers</span>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 800, color: '#fff', fontSize: '0.9rem' }}>{profile?.following || 0}</div>
              <span>Following</span>
            </div>
          </div>
          
          <button
            onClick={handleDisconnect}
            disabled={connecting}
            className="btn-logout"
            style={{ padding: '0.5rem 1rem', fontSize: '0.75rem', gap: '0.375rem' }}
          >
            <Unlink size={12} />
            Disconnect
          </button>
        </div>
      </div>

      {/* 2. Contributions Calendar Activity heatmaps */}
      {calendar && (
        <div style={{
          background: 'var(--color-bg-card)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TrendingUp size={14} color="var(--color-success)" />
            <span>GitHub Contribution Calendar</span>
            <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--color-text-muted)' }}>
              ({calendar.totalContributions || 0} contributions in the last year)
            </span>
          </h4>

          {/* Grid Layout Heatmap */}
          <div style={{ overflowX: 'auto', paddingBottom: '0.5rem' }}>
            <div style={{ display: 'flex', gap: '3px', minWidth: '720px' }}>
              {calendar.weeks?.map((week, wIdx) => (
                <div key={wIdx} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  {week.contributionDays?.map((day, dIdx) => (
                    <div
                      key={dIdx}
                      style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '2px',
                        background: day.color,
                        border: '1px solid rgba(255,255,255,0.01)'
                      }}
                      title={`${day.contributionCount} contributions on ${day.date}`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.375rem', fontSize: '0.675rem', color: 'var(--color-text-muted)' }}>
            <span>Less</span>
            {['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353'].map(col => (
              <span key={col} style={{ width: 9, height: 9, borderRadius: 2, background: col }} />
            ))}
            <span>More</span>
          </div>
        </div>
      )}

      {/* 3. Repositories search list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <GitBranch size={14} color="var(--color-accent-light)" />
            <span>GitHub Repositories</span>
          </h4>

          {/* Repo Search Bar */}
          <div style={{ position: 'relative', width: '220px' }}>
            {searching ? (
              <Spinner style={{ width: 12, height: 12, position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
            ) : (
              <Search size={12} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
            )}
            <input
              type="text"
              placeholder="Search repositories..."
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
                outline: 'none'
              }}
            />
          </div>
        </div>

        {repos.length === 0 ? (
          <div style={{
            background: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '2.5rem 1rem',
            textAlign: 'center',
            color: 'var(--color-text-muted)',
            fontSize: '0.8rem'
          }}>
            No repositories found.
          </div>
        ) : (
          /* Repos Grid */
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: '1rem'
          }} className="md:grid-cols-2">
            {repos.slice(0, 10).map(repo => (
              <div 
                key={repo.id}
                style={{
                  background: 'var(--color-bg-card)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '0.875rem',
                  transition: 'var(--transition-fast)'
                }}
                className="file-card-hover"
              >
                {/* Repo Info Header */}
                <div>
                  <h5 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', justifyBetween: 'space-between', gap: '0.5rem' }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{repo.name}</span>
                    <a 
                      href={repo.html_url} 
                      target="_blank" 
                      rel="noreferrer" 
                      style={{ color: 'var(--color-text-muted)', flexShrink: 0 }}
                      className="hover:text-white"
                      title="Open on GitHub"
                    >
                      <ExternalLink size={12} />
                    </a>
                  </h5>
                  <p style={{
                    fontSize: '0.75rem',
                    color: 'var(--color-text-secondary)',
                    lineHeight: 1.4,
                    marginTop: '0.35rem',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    minHeight: '34px'
                  }} title={repo.description}>
                    {repo.description || 'No description provided.'}
                  </p>
                </div>

                {/* Repo Tags Stats Footer */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                  {/* Lang details */}
                  {repo.language ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: getLangColor(repo.language) }} />
                      <span>{repo.language}</span>
                    </div>
                  ) : (
                    <span>Unknown Lang</span>
                  )}

                  {/* Stars detail */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Star size={11} fill="rgba(255,255,255,0.05)" />
                    <span>{repo.stargazers_count || 0}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default GithubIntegration;
