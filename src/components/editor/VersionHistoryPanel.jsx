import { useState, useEffect } from 'react';
import { X, RotateCcw, Clock, User, FileText, ChevronRight, Loader2 } from 'lucide-react';
import { getVersionHistory, getVersionById, restoreVersion } from '../../api/codeEditor';
import toast from 'react-hot-toast';

/**
 * VersionHistoryPanel — slide-in side panel showing save history for the active file.
 *
 * Props:
 * - workspaceId: string
 * - fileId: string
 * - currentContent: string — current editor content for comparison
 * - onClose: () => void
 * - onRestored: (restoredContent) => void — called after a successful restore
 * - hasWriteAccess: boolean
 */
const VersionHistoryPanel = ({
  workspaceId,
  fileId,
  currentContent = '',
  onClose,
  onRestored,
  hasWriteAccess = true,
}) => {
  const [versions, setVersions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [selectedContent, setSelectedContent] = useState(null);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [showDiff, setShowDiff] = useState(false);

  // Fetch version list on mount
  useEffect(() => {
    if (!workspaceId || !fileId) return;
    setIsLoading(true);
    getVersionHistory(workspaceId, fileId)
      .then((data) => setVersions(data.versions || []))
      .catch(() => toast.error('Failed to load version history.'))
      .finally(() => setIsLoading(false));
  }, [workspaceId, fileId]);

  const handleSelectVersion = async (version) => {
    setSelectedVersion(version);
    setSelectedContent(null);
    setShowDiff(false);
    setIsLoadingContent(true);
    try {
      const data = await getVersionById(workspaceId, fileId, version._id);
      setSelectedContent(data.version.content);
    } catch {
      toast.error('Failed to load version content.');
    } finally {
      setIsLoadingContent(false);
    }
  };

  const handleRestore = async () => {
    if (!selectedVersion) return;
    const confirmed = window.confirm(
      `Restore to Version ${selectedVersion.version} — "${selectedVersion.label}"?\n\nThis will replace the current file content.`
    );
    if (!confirmed) return;

    setIsRestoring(true);
    try {
      await restoreVersion(workspaceId, fileId, selectedVersion._id);
      toast.success(`Restored to v${selectedVersion.version} ✓`);
      onRestored?.(selectedContent);
      onClose();
    } catch {
      toast.error('Failed to restore version.');
    } finally {
      setIsRestoring(false);
    }
  };

  const formatDate = (dateString) => {
    const d = new Date(dateString);
    return d.toLocaleString([], {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes}B`;
    return `${(bytes / 1024).toFixed(1)}KB`;
  };

  // Simple line-based diff visualization
  const renderDiff = () => {
    if (!selectedContent || !currentContent) return null;
    const oldLines = currentContent.split('\n');
    const newLines = selectedContent.split('\n');
    const maxLen = Math.max(oldLines.length, newLines.length);

    return (
      <div className="version-diff">
        <div className="version-diff-header">
          <span style={{ color: '#ef4444' }}>− Current</span>
          <span style={{ color: '#10b981' }}>+ Version {selectedVersion?.version}</span>
        </div>
        <div className="version-diff-body">
          {Array.from({ length: maxLen }, (_, i) => {
            const oldLine = oldLines[i];
            const newLine = newLines[i];
            if (oldLine === newLine) {
              return (
                <div key={i} className="diff-line unchanged">
                  <span className="diff-line-num">{i + 1}</span>
                  <pre>{oldLine || ''}</pre>
                </div>
              );
            }
            return (
              <div key={i} className="diff-line-group">
                {oldLine !== undefined && (
                  <div className="diff-line removed">
                    <span className="diff-line-num">{i + 1}</span>
                    <pre>- {oldLine}</pre>
                  </div>
                )}
                {newLine !== undefined && (
                  <div className="diff-line added">
                    <span className="diff-line-num">{i + 1}</span>
                    <pre>+ {newLine}</pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="version-history-panel">
      {/* Panel Header */}
      <div className="version-history-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Clock size={15} style={{ color: 'var(--color-accent-light)' }} />
          <h3 className="version-history-title">Version History</h3>
        </div>
        <button className="version-history-close" onClick={onClose} title="Close">
          <X size={16} />
        </button>
      </div>

      <div className="version-history-body">
        {/* Version List */}
        <div className="version-list">
          {isLoading ? (
            <div className="version-loading">
              <Loader2 size={18} className="spin" />
              <span>Loading history...</span>
            </div>
          ) : versions.length === 0 ? (
            <div className="version-empty">
              <FileText size={24} style={{ opacity: 0.3, marginBottom: 8 }} />
              <p>No saved versions yet.</p>
              <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>
                Save the file to create a version snapshot.
              </span>
            </div>
          ) : (
            versions.map((v) => (
              <div
                key={v._id}
                className={`version-item ${selectedVersion?._id === v._id ? 'active' : ''}`}
                onClick={() => handleSelectVersion(v)}
              >
                <div className="version-item-left">
                  <span className="version-badge">v{v.version}</span>
                  <div className="version-item-info">
                    <span className="version-label">{v.label || `Version ${v.version}`}</span>
                    <div className="version-meta">
                      <User size={10} />
                      <span>{v.savedBy?.username || 'Unknown'}</span>
                      <span>·</span>
                      <Clock size={10} />
                      <span>{formatDate(v.createdAt)}</span>
                      {v.size > 0 && <><span>·</span><span>{formatSize(v.size)}</span></>}
                    </div>
                  </div>
                </div>
                <ChevronRight size={13} style={{ opacity: 0.4 }} />
              </div>
            ))
          )}
        </div>

        {/* Selected Version Detail */}
        {selectedVersion && (
          <div className="version-detail">
            <div className="version-detail-header">
              <div>
                <h4>Version {selectedVersion.version} — {selectedVersion.label}</h4>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  Saved by {selectedVersion.savedBy?.username} · {formatDate(selectedVersion.createdAt)}
                </span>
              </div>
              {hasWriteAccess && selectedContent !== null && (
                <button
                  className="version-restore-btn"
                  onClick={handleRestore}
                  disabled={isRestoring}
                >
                  {isRestoring ? (
                    <><Loader2 size={13} className="spin" /> Restoring...</>
                  ) : (
                    <><RotateCcw size={13} /> Restore</>
                  )}
                </button>
              )}
            </div>

            {/* Diff toggle */}
            {selectedContent !== null && (
              <>
                <button
                  className="version-diff-toggle"
                  onClick={() => setShowDiff(!showDiff)}
                >
                  {showDiff ? '▾ Hide Diff' : '▸ Show Diff vs Current'}
                </button>

                {isLoadingContent ? (
                  <div className="version-loading">
                    <Loader2 size={16} className="spin" />
                    <span>Loading content...</span>
                  </div>
                ) : showDiff ? (
                  renderDiff()
                ) : (
                  <pre className="version-preview">{selectedContent || '(empty file)'}</pre>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default VersionHistoryPanel;
