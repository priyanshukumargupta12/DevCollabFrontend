import { useState, useEffect } from 'react';
import { X, Calendar, ClipboardList, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import Spinner from './Spinner';

/**
 * TaskModal Component
 * Serves both Creating and Editing tasks.
 * Auto-populates fields with initial values when a task object is supplied.
 */
const TaskModal = ({ isOpen, onClose, onSubmit, task = null, members = [] }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    dueDate: '',
    labels: '',
    assignedUser: '',
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (task) {
      // If editing task, populate form fields
      setFormData({
        title: task.title || '',
        description: task.description || '',
        status: task.status || 'todo',
        priority: task.priority || 'medium',
        dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
        labels: task.labels ? task.labels.join(', ') : '',
        assignedUser: task.assignedUser?._id || task.assignedUser || '',
      });
    } else {
      // Clear form
      setFormData({
        title: '',
        description: '',
        status: 'todo',
        priority: 'medium',
        dueDate: '',
        labels: '',
        assignedUser: '',
      });
    }
    setError('');
  }, [task, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setError('Task title is required');
      return;
    }
    if (formData.title.trim().length < 3) {
      setError('Task title must be at least 3 charaters');
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        status: formData.status,
        priority: formData.priority,
        dueDate: formData.dueDate || null,
        labels: formData.labels,
        assignedUser: formData.assignedUser || null,
      };
      
      await onSubmit(payload);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to submit task.');
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
      <div 
        className="auth-card" 
        style={{
          width: '100%',
          maxWidth: '520px',
          maxHeight: '90vh',
          overflowY: 'auto',
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
          paddingBottom: '0.875rem'
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
              <ClipboardList size={18} />
            </div>
            <h2 style={{
              fontSize: '1.2rem',
              fontWeight: 800,
              color: '#fff',
              letterSpacing: '-0.02em',
            }}>
              {task ? 'Edit Task' : 'Create New Task'}
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
              display: 'flex',
              transition: 'var(--transition-fast)'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-muted)'}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate>
          {error && (
            <div style={{
              padding: '0.75rem 1rem',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 8,
              color: 'var(--color-error)',
              fontSize: '0.85rem',
              marginBottom: '1.25rem'
            }}>
              {error}
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="task-title">Title</label>
            <input
              id="task-title"
              name="title"
              type="text"
              className="form-input"
              placeholder="e.g. Implement API route"
              value={formData.title}
              onChange={handleChange}
              disabled={isLoading}
              style={{ paddingLeft: '1rem' }}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="task-desc">Description</label>
            <textarea
              id="task-desc"
              name="description"
              className="form-input"
              placeholder="Details about this task..."
              value={formData.description}
              onChange={handleChange}
              disabled={isLoading}
              rows={3}
              style={{
                paddingLeft: '1rem',
                resize: 'none',
                height: '74px',
                fontFamily: 'var(--font-sans)',
              }}
            />
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1rem',
            marginBottom: '1rem'
          }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="task-priority">Priority</label>
              <select
                id="task-priority"
                name="priority"
                className="form-input"
                value={formData.priority}
                onChange={handleChange}
                disabled={isLoading}
                style={{ paddingLeft: '1rem', background: '#0f1117', cursor: 'pointer' }}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="task-status">Status</label>
              <select
                id="task-status"
                name="status"
                className="form-input"
                value={formData.status}
                onChange={handleChange}
                disabled={isLoading}
                style={{ paddingLeft: '1rem', background: '#0f1117', cursor: 'pointer' }}
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="review">Review</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="task-assignee">Assign User</label>
            <select
              id="task-assignee"
              name="assignedUser"
              className="form-input"
              value={formData.assignedUser}
              onChange={handleChange}
              disabled={isLoading}
              style={{ paddingLeft: '1rem', background: '#0f1117', cursor: 'pointer' }}
            >
              <option value="">Unassigned</option>
              {members.map((member) => (
                <option key={member._id} value={member._id}>
                  {member.username} ({member.email})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="task-due">Due Date</label>
            <div className="input-wrapper">
              <Calendar className="input-icon" size={15} style={{ left: '0.875rem' }} />
              <input
                id="task-due"
                name="dueDate"
                type="date"
                className="form-input"
                value={formData.dueDate}
                onChange={handleChange}
                disabled={isLoading}
                style={{ cursor: 'pointer' }}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="task-labels">Labels (comma-separated)</label>
            <input
              id="task-labels"
              name="labels"
              type="text"
              className="form-input"
              placeholder="e.g. backend, bug, critical"
              value={formData.labels}
              onChange={handleChange}
              disabled={isLoading}
              style={{ paddingLeft: '1rem' }}
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
              {isLoading ? <Spinner /> : <Check size={16} />}
              {isLoading ? 'Saving...' : task ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskModal;
