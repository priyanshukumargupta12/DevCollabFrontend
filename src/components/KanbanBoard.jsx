import { useState, useEffect } from 'react';
import { 
  Plus, 
  Calendar, 
  Trash2, 
  Edit3, 
  AlertCircle,
  Clock,
  Sparkles,
  ClipboardList
} from 'lucide-react';
import toast from 'react-hot-toast';
import { 
  getTasks, 
  createTask, 
  updateTask, 
  updateTaskStatus, 
  deleteTask 
} from '../api/task';
import { useSocket } from '../context/SocketContext';
import TaskModal from './TaskModal';
import Spinner from './Spinner';

/**
 * KanbanBoard Component
 * Implements a Trello-like board using native HTML5 Drag and Drop APIs.
 * Supports optimistic UI updates, responsive design, and due date alerts.
 */
const KanbanBoard = ({ workspaceId, members = [], currentUser }) => {
  const { onlineUsers } = useSocket();
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTask, setActiveTask] = useState(null); // Set when editing

  // Column definitions
  const columns = [
    { id: 'todo', title: 'To Do', color: 'rgba(99, 102, 241, 0.1)', borderColor: 'rgba(99, 102, 241, 0.25)', accent: '#6366f1' },
    { id: 'in_progress', title: 'In Progress', color: 'rgba(139, 92, 246, 0.1)', borderColor: 'rgba(139, 92, 246, 0.25)', accent: '#8b5cf6' },
    { id: 'review', title: 'Review', color: 'rgba(245, 158, 11, 0.1)', borderColor: 'rgba(245, 158, 11, 0.25)', accent: '#f59e0b' },
    { id: 'completed', title: 'Completed', color: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.25)', accent: '#10b981' },
  ];

  // Fetch tasks
  const fetchTasksList = async () => {
    setIsLoading(true);
    try {
      const data = await getTasks(workspaceId);
      setTasks(data.tasks);
    } catch {
      toast.error('Failed to load tasks for this workspace.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (workspaceId) {
      fetchTasksList();
    }
  }, [workspaceId]);

  // ─── Native Drag & Drop Handlers ─────────────────────────────────────
  const handleDragStart = (e, taskId) => {
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault(); // Required to allow drop!
  };

  const handleDragEnter = (e, colId) => {
    e.preventDefault();
    const colElement = e.currentTarget;
    colElement.style.background = 'rgba(139, 92, 246, 0.04)';
    colElement.style.borderColor = 'rgba(139, 92, 246, 0.35)';
  };

  const handleDragLeave = (e, colId) => {
    const colElement = e.currentTarget;
    // Restore default column styles
    const column = columns.find(c => c.id === colId);
    colElement.style.background = 'rgba(255, 255, 255, 0.01)';
    colElement.style.borderColor = 'var(--color-border)';
  };

  const handleDrop = async (e, targetStatus) => {
    e.preventDefault();
    const colElement = e.currentTarget;
    colElement.style.background = 'rgba(255, 255, 255, 0.01)';
    colElement.style.borderColor = 'var(--color-border)';

    const taskId = e.dataTransfer.getData('text/plain');
    if (!taskId) return;

    // Find the task in the list
    const originalTask = tasks.find(t => t._id === taskId);
    if (!originalTask || originalTask.status === targetStatus) return;

    // ── Optimistic UI Update ──
    setTasks(prev => 
      prev.map(t => t._id === taskId ? { ...t, status: targetStatus } : t)
    );

    try {
      await updateTaskStatus(workspaceId, taskId, targetStatus);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status.');
      // Revert state on API failure
      setTasks(prev => 
        prev.map(t => t._id === taskId ? { ...t, status: originalTask.status } : t)
      );
    }
  };

  // ─── Modal Task Submissions ─────────────────────────────────────────
  const handleTaskSubmit = async (payload) => {
    const toastId = toast.loading(activeTask ? 'Updating task...' : 'Creating task...');
    try {
      if (activeTask) {
        // Edit Mode
        const data = await updateTask(workspaceId, activeTask._id, payload);
        setTasks(prev => prev.map(t => t._id === activeTask._id ? data.task : t));
        toast.success('Task details updated! 🎉', { id: toastId });
      } else {
        // Create Mode
        const data = await createTask(workspaceId, payload);
        setTasks(prev => [data.task, ...prev]);
        toast.success('New task created successfully! 🎉', { id: toastId });
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Failed to save task.';
      toast.error(errMsg, { id: toastId });
      throw new Error(errMsg);
    }
  };

  const handleDeleteTask = async (taskId, title) => {
    const confirmation = window.confirm(`Delete task "${title}"?`);
    if (!confirmation) return;

    const toastId = toast.loading('Deleting task...');
    try {
      await deleteTask(workspaceId, taskId);
      setTasks(prev => prev.filter(t => t._id !== taskId));
      toast.success('Task deleted.', { id: toastId });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete task.', { id: toastId });
    }
  };

  // ─── Render Helpers ────────────────────────────────────────────────
  const getInitials = (name) => {
    return name ? name.slice(0, 2).toUpperCase() : '??';
  };

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

  const isUserOnline = (userId) => {
    return onlineUsers.includes(userId);
  };

  // Checks if a task is overdue (if due date is in the past and status is not completed)
  const isOverdue = (dueDate, status) => {
    if (!dueDate || status === 'completed') return false;
    const today = new Date();
    today.setHours(0,0,0,0);
    return new Date(dueDate) < today;
  };

  const formatDueDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '5rem 0', gap: '1rem', color: 'var(--color-text-muted)' }}>
        <Spinner />
        <span>Loading Kanban board...</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      
      {/* Board Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
          Drag cards to move them between columns. Changes save in real-time.
        </div>
        <button
          className="btn-primary"
          onClick={() => { setActiveTask(null); setIsModalOpen(true); }}
          style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.875rem' }}
        >
          <Plus size={16} />
          Add Task
        </button>
      </div>

      {/* Columns Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '1.25rem',
        alignItems: 'stretch',
        flex: 1,
        overflowX: 'auto',
        paddingBottom: '1rem'
      }}>
        {columns.map((col) => {
          const colTasks = tasks.filter(t => t.status === col.id);
          
          return (
            <div
              key={col.id}
              onDragOver={handleDragOver}
              onDragEnter={(e) => handleDragEnter(e, col.id)}
              onDragLeave={(e) => handleDragLeave(e, col.id)}
              onDrop={(e) => handleDrop(e, col.id)}
              style={{
                background: 'rgba(255, 255, 255, 0.01)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                padding: '1.25rem 1rem',
                display: 'flex',
                flexDirection: 'column',
                minHeight: '400px',
                transition: 'all 0.2s ease',
              }}
            >
              {/* Column Header */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
                borderBottom: '2px solid ' + col.borderColor,
                paddingBottom: '0.5rem'
              }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: col.accent }} />
                  {col.title}
                </span>
                <span className="role-badge" style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', border: '1px solid var(--color-border)' }}>
                  {colTasks.length}
                </span>
              </div>

              {/* Tasks List Container */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.875rem',
                flex: 1,
                overflowY: 'auto'
              }}>
                {colTasks.length === 0 ? (
                  <div style={{
                    margin: 'auto',
                    textAlign: 'center',
                    padding: '2.5rem 1rem',
                    color: 'var(--color-text-muted)',
                    fontSize: '0.75rem',
                    border: '1px dashed var(--color-border)',
                    borderRadius: 'var(--radius-md)'
                  }}>
                    No tasks here
                  </div>
                ) : (
                  colTasks.map((task) => {
                    const overdue = isOverdue(task.dueDate, task.status);
                    
                    return (
                      <div
                        key={task._id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task._id)}
                        className="stat-card"
                        style={{
                          cursor: 'grab',
                          padding: '1rem',
                          background: 'rgba(255, 255, 255, 0.02)',
                          borderColor: overdue ? 'rgba(239, 68, 68, 0.25)' : 'var(--color-border)',
                          transition: 'all 0.2s ease',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.625rem',
                          position: 'relative'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = overdue ? 'rgba(239,68,68,0.5)' : 'rgba(139,92,246,0.3)';
                          // Display action buttons
                          const editBtn = e.currentTarget.querySelector('.task-actions');
                          if (editBtn) editBtn.style.opacity = '1';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = overdue ? 'rgba(239,68,68,0.25)' : 'var(--color-border)';
                          // Hide action buttons
                          const editBtn = e.currentTarget.querySelector('.task-actions');
                          if (editBtn) editBtn.style.opacity = '0';
                        }}
                      >
                        {/* Task Card Header: Title + Hover Controls */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                          <h4 style={{
                            fontSize: '0.875rem',
                            fontWeight: 700,
                            color: '#fff',
                            lineHeight: 1.3
                          }}>
                            {task.title}
                          </h4>
                          
                          {/* Hover action icons */}
                          <div className="task-actions" style={{
                            display: 'flex',
                            gap: '0.25rem',
                            opacity: 0,
                            transition: 'opacity 0.15s ease',
                            flexShrink: 0
                          }}>
                            <button
                              onClick={() => { setActiveTask(task); setIsModalOpen(true); }}
                              style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: '2px', borderRadius: '4px' }}
                              onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
                              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-muted)'}
                              title="Edit Task"
                            >
                              <Edit3 size={13} />
                            </button>
                            <button
                              onClick={() => handleDeleteTask(task._id, task.title)}
                              style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: '2px', borderRadius: '4px' }}
                              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-error)'}
                              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-muted)'}
                              title="Delete Task"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        {/* Priority indicator */}
                        <div>
                          <span className="role-badge" style={
                            task.priority === 'high'
                              ? { background: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)', color: 'var(--color-error)', fontSize: '0.65rem' }
                              : task.priority === 'medium'
                              ? { background: 'rgba(245, 158, 11, 0.1)', borderColor: 'rgba(245, 158, 11, 0.3)', color: 'var(--color-warning)', fontSize: '0.65rem' }
                              : { background: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.3)', color: 'var(--color-success)', fontSize: '0.65rem' }
                          }>
                            {task.priority}
                          </span>
                        </div>

                        {/* Description snippet */}
                        {task.description && (
                          <p style={{
                            fontSize: '0.75rem',
                            color: 'var(--color-text-muted)',
                            lineHeight: 1.4,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden'
                          }}>
                            {task.description}
                          </p>
                        )}

                        {/* Labels row */}
                        {task.labels && task.labels.length > 0 && (
                          <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                            {task.labels.map((label, idx) => (
                              <span key={idx} style={{
                                fontSize: '0.625rem',
                                fontWeight: 500,
                                padding: '0.1rem 0.375rem',
                                borderRadius: 4,
                                background: 'rgba(255, 255, 255, 0.04)',
                                border: '1px solid var(--color-border)',
                                color: 'var(--color-text-secondary)',
                                textTransform: 'lowercase'
                              }}>
                                {label}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Card Footer: Date Alert + Assignee */}
                        {(task.dueDate || task.assignedUser) && (
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            borderTop: '1px solid var(--color-border)',
                            paddingTop: '0.625rem',
                            marginTop: '0.25rem'
                          }}>
                            {/* Date Badge */}
                            {task.dueDate ? (
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                fontSize: '0.7rem',
                                fontWeight: 500,
                                color: overdue ? 'var(--color-error)' : 'var(--color-text-muted)'
                              }}>
                                {overdue ? <AlertCircle size={10} /> : <Clock size={10} />}
                                {formatDueDate(task.dueDate)}
                              </span>
                            ) : <span />}

                            {/* Assignee Avatar */}
                            {task.assignedUser && (
                              <div style={{ position: 'relative' }} title={`Assigned to ${task.assignedUser.profile?.nickname || task.assignedUser.username}`}>
                                {task.assignedUser.avatar ? (
                                  <img 
                                    src={getAvatarUrl(task.assignedUser.avatar)} 
                                    alt={task.assignedUser.username} 
                                    style={{ 
                                      width: 24, 
                                      height: 24, 
                                      borderRadius: '50%', 
                                      objectFit: 'cover', 
                                      border: '1px solid var(--color-border)' 
                                    }}
                                  />
                                ) : (
                                  <div className="avatar-circle" style={{
                                    width: 24,
                                    height: 24,
                                    fontSize: '0.6rem',
                                    background: isUserOnline(task.assignedUser._id) ? 'var(--color-accent)' : 'rgba(255, 255, 255, 0.08)'
                                  }}>
                                    {getInitials(task.assignedUser.profile?.nickname || task.assignedUser.username)}
                                  </div>
                                )}
                                <span style={{
                                  position: 'absolute',
                                  bottom: -1,
                                  right: -1,
                                  width: 7,
                                  height: 7,
                                  borderRadius: '50%',
                                  background: isUserOnline(task.assignedUser._id) ? 'var(--color-success)' : 'var(--color-text-muted)',
                                  border: '1.5px solid var(--color-bg-primary)'
                                }} />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Task Creation & Editing Modal */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setActiveTask(null); }}
        onSubmit={handleTaskSubmit}
        task={activeTask}
        members={members}
      />
    </div>
  );
};

export default KanbanBoard;
