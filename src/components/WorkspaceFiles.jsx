import { useState, useEffect, useRef } from 'react';
import { 
  UploadCloud, 
  FileText, 
  Download, 
  Trash2, 
  Image as ImageIcon,
  FolderOpen,
  Eye,
  FileCheck
} from 'lucide-react';
import toast from 'react-hot-toast';
import { uploadFile, getFiles, deleteFile } from '../api/file';
import Spinner from './Spinner';

/**
 * WorkspaceFiles Component
 * Provides a secure, interactive file uploader & shared file gallery.
 */
const WorkspaceFiles = ({ workspaceId, isAdmin, currentUser, workspace }) => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dragActive, setDragActive] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const fileInputRef = useRef(null);

  // Fetch workspace files
  const fetchFiles = async () => {
    try {
      const data = await getFiles(workspaceId);
      setFiles(data.files || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load workspace files.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (workspaceId) {
      fetchFiles();
    }
  }, [workspaceId]);

  // Drag and drop event handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  // Perform upload with validation
  const handleFileUpload = async (file) => {
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'pdf', 'docx'];
    const ext = file.name.split('.').pop().toLowerCase();
    
    if (!allowedExtensions.includes(ext)) {
      toast.error("Only JPG, PNG, PDF, and DOCX files are allowed!");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Maximum file size allowed is 10MB!");
      return;
    }

    setUploadingFile(file);
    setUploadProgress(0);

    try {
      const data = await uploadFile(workspaceId, file, (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        setUploadProgress(percentCompleted);
      });
      
      toast.success("File uploaded successfully! 🎉");
      setFiles((prev) => [data.file, ...prev]);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to upload file.");
    } finally {
      setUploadingFile(null);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Delete file handler
  const handleDelete = async (fileId, fileName) => {
    const confirmDelete = window.confirm(`Are you sure you want to delete "${fileName}"?`);
    if (!confirmDelete) return;

    const toastId = toast.loading(`Deleting ${fileName}...`);
    try {
      await deleteFile(workspaceId, fileId);
      toast.success("File deleted successfully.", { id: toastId });
      setFiles((prev) => prev.filter((f) => f._id !== fileId));
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete file.", { id: toastId });
    }
  };

  // Utility to resolve local/Cloudinary URL
  const getBackendUrl = () => {
    return window.location.hostname === 'localhost' 
      ? 'http://localhost:5000' 
      : window.location.origin;
  };

  const getFileUrl = (filePath) => {
    if (!filePath) return '';
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
      return filePath;
    }
    return `${getBackendUrl()}${filePath}`;
  };

  const getAvatarUrl = (avatarPath) => {
    if (!avatarPath) return null;
    if (avatarPath.startsWith('http://') || avatarPath.startsWith('https://')) {
      return avatarPath;
    }
    return `${getBackendUrl()}${avatarPath}`;
  };

  // Utility to format sizes
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Utility to format dates
  const formatUploadTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getInitials = (name) => {
    return name ? name.slice(0, 2).toUpperCase() : '??';
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '1rem', color: 'var(--color-text-muted)' }}>
        <Spinner />
        <span>Loading shared files...</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', width: '100%', height: '100%', overflowY: 'auto' }}>
      
      {/* ─── Drag & Drop Upload Zone ───────────────────────────── */}
      <div 
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${dragActive ? 'var(--color-accent-light)' : 'var(--color-border)'}`,
          background: dragActive ? 'var(--color-accent-subtle)' : 'var(--color-bg-card)',
          borderRadius: 'var(--radius-lg)',
          padding: '2.5rem 1.5rem',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'var(--transition-normal)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.75rem',
          boxShadow: dragActive ? 'var(--shadow-glow)' : 'none'
        }}
        onMouseEnter={(e) => {
          if (!dragActive) {
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            e.currentTarget.style.background = 'var(--color-bg-card-hover)';
          }
        }}
        onMouseLeave={(e) => {
          if (!dragActive) {
            e.currentTarget.style.borderColor = 'var(--color-border)';
            e.currentTarget.style.background = 'var(--color-bg-card)';
          }
        }}
      >
        <input 
          ref={fileInputRef}
          type="file"
          style={{ display: 'none' }}
          onChange={handleFileInputChange}
          accept=".jpg,.jpeg,.png,.pdf,.docx"
        />
        
        <div style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--color-accent-light)',
          marginBottom: '0.25rem'
        }}>
          <UploadCloud size={24} />
        </div>

        <div>
          <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>
            Drag & drop file here or <span style={{ color: 'var(--color-accent-light)' }}>browse</span>
          </span>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
            Supported formats: PNG, JPG, PDF, DOCX (Max 10MB)
          </p>
        </div>
      </div>

      {/* ─── Real-Time Progress Bar ────────────────────────────── */}
      {uploadingFile && (
        <div style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
            <span style={{ color: '#fff', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '75%' }}>
              Uploading: {uploadingFile.name}
            </span>
            <span style={{ color: 'var(--color-accent-light)', fontWeight: 700 }}>
              {uploadProgress}%
            </span>
          </div>
          <div style={{
            width: '100%',
            height: '6px',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: 'var(--radius-full)',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${uploadProgress}%`,
              height: '100%',
              background: 'var(--gradient-brand)',
              transition: 'width 0.1s ease-out',
              borderRadius: 'var(--radius-full)'
            }} />
          </div>
        </div>
      )}

      {/* ─── Shared Files Gallery Grid ─────────────────────────── */}
      <div>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FolderOpen size={16} color="var(--color-accent-light)" />
          Shared Space ({files.length} {files.length === 1 ? 'file' : 'files'})
        </h3>

        {files.length === 0 ? (
          /* Empty Gallery State */
          <div style={{
            background: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '4rem 2rem',
            textAlign: 'center',
            color: 'var(--color-text-muted)'
          }}>
            <FileText size={40} style={{ margin: '0 auto 1rem', color: 'var(--color-text-muted)' }} />
            <h4 style={{ color: '#fff', fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.25rem' }}>No Shared Files Yet</h4>
            <p style={{ fontSize: '0.8rem', maxWidth: '300px', margin: '0 auto', lineHeight: 1.4 }}>
              Upload document resources, specs, PDFs, or design mockups to share them with other members.
            </p>
          </div>
        ) : (
          /* Files Cards Grid */
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: '1.25rem'
          }}>
            {files.map((file) => {
              const isImage = file.mimeType.startsWith('image/');
              const isPdf = file.mimeType === 'application/pdf';
              const isDocx = file.mimeType.includes('document');

              const fileExtension = file.name.split('.').pop().toUpperCase();
              
              // Access controls: Uploader, Workspace Owner, Workspace Admin
              const isUploader = file.uploader && file.uploader._id === currentUser._id;
              const isWorkspaceOwner = workspace.owner._id === currentUser._id;
              const isWorkspaceAdmin = workspace.members.some(
                (m) => m.user._id === currentUser._id && m.role === 'admin'
              );
              const canDelete = isUploader || isWorkspaceOwner || isWorkspaceAdmin;

              return (
                <div 
                  key={file._id}
                  style={{
                    background: 'var(--color-bg-card)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'var(--transition-normal)',
                    position: 'relative'
                  }}
                  className="file-card-hover"
                >
                  {/* File Format Preview Card Header */}
                  <div style={{
                    height: '130px',
                    background: 'rgba(255,255,255,0.01)',
                    borderBottom: '1px solid var(--color-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    position: 'relative'
                  }}>
                    {isImage ? (
                      <img 
                        src={getFileUrl(file.url)} 
                        alt={file.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', color: isPdf ? '#ef4444' : '#3b82f6' }}>
                        <FileText size={42} />
                        <span style={{
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          padding: '0.125rem 0.375rem',
                          borderRadius: 4,
                          background: isPdf ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                          border: `1px solid ${isPdf ? 'rgba(239, 68, 68, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`
                        }}>
                          {fileExtension}
                        </span>
                      </div>
                    )}

                    {/* Preview overlay */}
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'rgba(10,11,15,0.7)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.75rem',
                      opacity: 0,
                      transition: 'opacity 0.2s ease',
                      cursor: 'default'
                    }} className="card-overlay-actions">
                      <a 
                        href={getFileUrl(file.url)} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: '50%',
                          background: 'var(--gradient-brand)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                          cursor: 'pointer'
                        }}
                        title="View file in new tab"
                      >
                        <Eye size={15} />
                      </a>
                    </div>
                  </div>

                  {/* Metadata and Uploader Section */}
                  <div style={{ padding: '0.875rem', display: 'flex', flexDirection: 'column', flex: 1, gap: '0.75rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <span 
                        style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        title={file.name}
                      >
                        {file.name}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                        {formatFileSize(file.size)}
                      </span>
                    </div>

                    {/* Uploader Avatar & details */}
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.5rem', 
                      borderTop: '1px solid rgba(255,255,255,0.03)', 
                      paddingTop: '0.5rem',
                      marginTop: 'auto'
                    }}>
                      {file.uploader && file.uploader.avatar ? (
                        <img 
                          src={getAvatarUrl(file.uploader.avatar)} 
                          alt={file.uploader.username} 
                          style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover' }}
                        />
                      ) : (
                        <div className="avatar-circle" style={{ width: 22, height: 22, fontSize: '0.6rem' }}>
                          {getInitials(file.uploader?.profile?.nickname || file.uploader?.username || 'System')}
                        </div>
                      )}
                      
                      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {file.uploader?.profile?.nickname || file.uploader?.username || 'Unknown'}
                        </span>
                        <span style={{ fontSize: '0.625rem', color: 'var(--color-text-muted)' }}>
                          {formatUploadTime(file.createdAt)}
                        </span>
                      </div>

                      {/* File Card Actions */}
                      <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                        <a 
                          href={getFileUrl(file.url)}
                          download={file.name}
                          target="_blank"
                          rel="noopener noreferrer"
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
                          onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
                          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-muted)'}
                          title="Download file"
                        >
                          <Download size={14} />
                        </a>
                        
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(file._id, file.name)}
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
                            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-error)'}
                            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-muted)'}
                            title="Delete file"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkspaceFiles;
