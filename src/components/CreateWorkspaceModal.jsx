import { useState } from 'react';
import { X, FolderPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { createWorkspace } from '../api/workspace';
import Spinner from './Spinner';

/**
 * CreateWorkspaceModal Component
 * Opens a dialog to create a new workspace.
 * Uses shared theme styles for a premium glassmorphic appearance.
 */
const CreateWorkspaceModal = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Workspace name is required');
      return;
    }
    if (formData.name.trim().length < 3) {
      setError('Workspace name must be at least 3 characters');
      return;
    }

    setIsLoading(true);
    const toastId = toast.loading('Creating workspace...');
    try {
      const data = await createWorkspace({
        name: formData.name.trim(),
        description: formData.description.trim(),
      });
      toast.success('Workspace created successfully! 🎉', { id: toastId });
      setFormData({ name: '', description: '' });
      onSuccess(data.workspace);
      onClose();
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Failed to create workspace.';
      toast.error(errMsg, { id: toastId });
      setError(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
      background: 'rgba(5, 5, 8, 0.85)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
    }}>
      {/* Modal Container */}
      <div 
        className="auth-card" 
        style={{
          width: '100%',
          maxWidth: '480px',
          animation: 'slideUp 0.3s ease both',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
          borderBottom: '1px solid var(--color-border)',
          paddingBottom: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: 'var(--color-accent-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-accent-light)'
            }}>
              <FolderPlus size={18} />
            </div>
            <h2 style={{
              fontSize: '1.25rem',
              fontWeight: 800,
              color: 'var(--color-text-primary)',
              letterSpacing: '-0.02em',
            }}>
              Create Workspace
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
              padding: '0.25rem',
              borderRadius: '6px',
              transition: 'var(--transition-fast)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-muted)'}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="workspace-name">Workspace Name</label>
            <input
              id="workspace-name"
              name="name"
              type="text"
              className="form-input"
              placeholder="e.g. My Project Team"
              value={formData.name}
              onChange={handleChange}
              disabled={isLoading}
              style={{ paddingLeft: '1rem' }} // override icons padding
              autoFocus
            />
            {error && <span style={{ fontSize: '0.8125rem', color: 'var(--color-error)' }}>{error}</span>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="workspace-desc">Description (Optional)</label>
            <textarea
              id="workspace-desc"
              name="description"
              className="form-input"
              placeholder="Brief summary of what your team will build..."
              value={formData.description}
              onChange={handleChange}
              disabled={isLoading}
              rows={3}
              style={{
                paddingLeft: '1rem',
                resize: 'none',
                height: '90px',
                fontFamily: 'var(--font-sans)',
              }}
            />
          </div>

          {/* Action buttons */}
          <div style={{
            display: 'flex',
            gap: '0.75rem',
            justifyContent: 'flex-end',
            marginTop: '2rem',
            borderTop: '1px solid var(--color-border)',
            paddingTop: '1.25rem'
          }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              style={{
                padding: '0.75rem 1.25rem',
                background: 'transparent',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-text-secondary)',
                fontSize: '0.9rem',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'var(--transition-fast)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                e.currentTarget.style.color = '#fff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-border)';
                e.currentTarget.style.color = 'var(--color-text-secondary)';
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isLoading}
              style={{ width: 'auto', padding: '0.75rem 1.5rem' }}
            >
              {isLoading ? <Spinner /> : <FolderPlus size={16} />}
              {isLoading ? 'Creating...' : 'Create Workspace'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateWorkspaceModal;
