import { Code2, Heart } from 'lucide-react';

const GithubIcon = ({ size = 18, ...props }) => (
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

const LinkedinIcon = ({ size = 18, ...props }) => (
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
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect width="4" height="12" x="2" y="9" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

const TwitterIcon = ({ size = 18, ...props }) => (
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
    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
  </svg>
);

const Footer = () => {
  return (
    <footer style={{
      borderTop: '1px solid var(--color-border)',
      background: 'rgba(10, 11, 15, 0.2)',
      padding: '3rem 2rem 2rem',
      marginTop: 'auto',
      width: '100%',
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '2.5rem',
        marginBottom: '3rem'
      }}>
        {/* Brand Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'var(--gradient-brand)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Code2 size={16} color="#fff" />
            </div>
            <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>DevCollab</span>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', lineHeight: 1.5, maxWidth: '240px' }}>
            A premium real-time collaboration workspace for modern developer teams. Code, coordinate, and deliver.
          </p>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
            <a href="https://github.com" target="_blank" rel="noreferrer" style={{ color: 'var(--color-text-muted)', transition: 'color 0.2s' }} className="hover:text-white">
              <GithubIcon size={18} />
            </a>
            <a href="https://linkedin.com" target="_blank" rel="noreferrer" style={{ color: 'var(--color-text-muted)', transition: 'color 0.2s' }} className="hover:text-white">
              <LinkedinIcon size={18} />
            </a>
            <a href="https://twitter.com" target="_blank" rel="noreferrer" style={{ color: 'var(--color-text-muted)', transition: 'color 0.2s' }} className="hover:text-white">
              <TwitterIcon size={18} />
            </a>
          </div>
        </div>

        {/* Links: Platform */}
        <div>
          <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Platform</h4>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.8rem' }}>
            <li><a href="#workspaces" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', transition: 'color 0.2s' }} className="hover:text-white">Workspaces</a></li>
            <li><a href="#editor" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', transition: 'color 0.2s' }} className="hover:text-white">Real-Time Editor</a></li>
            <li><a href="#meetings" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', transition: 'color 0.2s' }} className="hover:text-white">Video Meetings</a></li>
            <li><a href="#kanban" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', transition: 'color 0.2s' }} className="hover:text-white">Kanban Boards</a></li>
          </ul>
        </div>

        {/* Links: Resources */}
        <div>
          <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Resources</h4>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.8rem' }}>
            <li><a href="#docs" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', transition: 'color 0.2s' }} className="hover:text-white">Documentation</a></li>
            <li><a href="#api" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', transition: 'color 0.2s' }} className="hover:text-white">API Reference</a></li>
            <li><a href="#support" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', transition: 'color 0.2s' }} className="hover:text-white">Help Center</a></li>
            <li><a href="#status" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', transition: 'color 0.2s' }} className="hover:text-white">System Status</a></li>
          </ul>
        </div>

        {/* Links: Company */}
        <div>
          <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Company</h4>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.8rem' }}>
            <li><a href="#about" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', transition: 'color 0.2s' }} className="hover:text-white">About Us</a></li>
            <li><a href="#blog" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', transition: 'color 0.2s' }} className="hover:text-white">Blog</a></li>
            <li><a href="#careers" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', transition: 'color 0.2s' }} className="hover:text-white">Careers</a></li>
            <li><a href="#privacy" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', transition: 'color 0.2s' }} className="hover:text-white">Privacy Policy</a></li>
          </ul>
        </div>
      </div>

      {/* Bottom Bar */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        borderTop: '1px solid var(--color-border)',
        paddingTop: '1.5rem',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1rem',
        fontSize: '0.75rem',
        color: 'var(--color-text-muted)'
      }}>
        <span>© {new Date().getFullYear()} DevCollab. All rights reserved.</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
          Made with <Heart size={12} color="#ef4444" fill="#ef4444" /> for developers everywhere.
        </span>
      </div>
    </footer>
  );
};

export default Footer;
