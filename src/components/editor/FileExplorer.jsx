import { useState, useRef } from 'react';
import {
  ChevronRight, ChevronDown, File, Folder, FolderOpen,
  Plus, FolderPlus, Trash2, Edit2, Check, X, MoreVertical
} from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * File icon mapping by extension — returns Lucide-compatible color.
 */
const FILE_ICON_COLORS = {
  js: '#f7df1e', jsx: '#61dafb', ts: '#3178c6', tsx: '#61dafb',
  py: '#3572a5', java: '#b07219', cpp: '#f34b7d', c: '#555555',
  go: '#00add8', rs: '#dea584', html: '#e34c26', css: '#563d7c',
  json: '#292929', md: '#083fa1', txt: '#aaaaaa',
};

const getExtension = (name) => name.split('.').pop()?.toLowerCase() || '';
const getFileColor = (name) => FILE_ICON_COLORS[getExtension(name)] || '#94a3b8';

/**
 * Build a tree structure from the flat files array.
 * @param {Array} files - flat list of code files
 * @param {string|null} parentId
 * @returns {Array} nested tree nodes
 */
const buildTree = (files, parentId = null) => {
  return files
    .filter((f) => {
      const fp = f.parent?._id || f.parent;
      const pid = parentId;
      return (fp == null && pid == null) || (fp?.toString() === pid?.toString());
    })
    .map((f) => ({
      ...f,
      children: f.isFolder ? buildTree(files, f._id) : [],
    }))
    .sort((a, b) => {
      // Folders first, then alphabetical
      if (a.isFolder && !b.isFolder) return -1;
      if (!a.isFolder && b.isFolder) return 1;
      return a.name.localeCompare(b.name);
    });
};

/**
 * Single tree node component — renders file or folder with expand/collapse.
 */
const TreeNode = ({
  node,
  depth,
  activeFileId,
  onSelectFile,
  onCreateFile,
  onCreateFolder,
  onRename,
  onDelete,
  hasWriteAccess,
}) => {
  const [expanded, setExpanded] = useState(depth < 2);
  const [contextMenu, setContextMenu] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(node.name);
  const contextRef = useRef(null);

  const isActive = activeFileId === node._id;
  const fileColor = node.isFolder ? '#e2b857' : getFileColor(node.name);

  const handleRename = () => {
    if (!renameValue.trim() || renameValue === node.name) {
      setIsRenaming(false);
      setRenameValue(node.name);
      return;
    }
    onRename(node._id, renameValue.trim(), node.isFolder);
    setIsRenaming(false);
  };

  return (
    <div>
      {/* Node Row */}
      <div
        className={`file-tree-item ${isActive ? 'active' : ''}`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={() => {
          if (node.isFolder) {
            setExpanded(!expanded);
          } else {
            onSelectFile(node);
          }
        }}
        onContextMenu={(e) => {
          if (hasWriteAccess) {
            e.preventDefault();
            setContextMenu(true);
          }
        }}
      >
        {/* Expand arrow for folders */}
        <span className="file-tree-arrow">
          {node.isFolder ? (
            expanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />
          ) : <span style={{ width: 11 }} />}
        </span>

        {/* Icon */}
        <span style={{ color: fileColor, flexShrink: 0, lineHeight: 0 }}>
          {node.isFolder
            ? (expanded ? <FolderOpen size={15} /> : <Folder size={15} />)
            : <File size={15} />}
        </span>

        {/* Name — inline rename input */}
        {isRenaming ? (
          <input
            autoFocus
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRename();
              if (e.key === 'Escape') { setIsRenaming(false); setRenameValue(node.name); }
            }}
            onBlur={handleRename}
            onClick={(e) => e.stopPropagation()}
            className="file-rename-input"
          />
        ) : (
          <span className="file-tree-name" title={node.name}>{node.name}</span>
        )}

        {/* Hover action buttons */}
        {hasWriteAccess && !isRenaming && (
          <span className="file-tree-actions" onClick={(e) => e.stopPropagation()}>
            {node.isFolder && (
              <>
                <button title="New File" onClick={() => onCreateFile(node._id)}>
                  <Plus size={11} />
                </button>
                <button title="New Folder" onClick={() => onCreateFolder(node._id)}>
                  <FolderPlus size={11} />
                </button>
              </>
            )}
            <button title="Rename" onClick={() => setIsRenaming(true)}>
              <Edit2 size={11} />
            </button>
            <button title="Delete" className="danger" onClick={() => onDelete(node._id, node.name, node.isFolder)}>
              <Trash2 size={11} />
            </button>
          </span>
        )}
      </div>

      {/* Children (nested) */}
      {node.isFolder && expanded && node.children.length > 0 && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child._id}
              node={child}
              depth={depth + 1}
              activeFileId={activeFileId}
              onSelectFile={onSelectFile}
              onCreateFile={onCreateFile}
              onCreateFolder={onCreateFolder}
              onRename={onRename}
              onDelete={onDelete}
              hasWriteAccess={hasWriteAccess}
            />
          ))}
        </div>
      )}

      {/* Empty folder hint */}
      {node.isFolder && expanded && node.children.length === 0 && (
        <div style={{ paddingLeft: `${(depth + 1) * 12 + 24}px`, fontSize: '0.7rem', color: 'var(--color-text-muted)', paddingTop: 2, paddingBottom: 2 }}>
          Empty folder
        </div>
      )}
    </div>
  );
};

// ─── New Item Input Component ─────────────────────────────────────────────────
const NewItemInput = ({ type, onConfirm, onCancel }) => {
  const [value, setValue] = useState('');

  const handleConfirm = () => {
    if (!value.trim()) { onCancel(); return; }
    onConfirm(value.trim());
  };

  return (
    <div className="new-item-input-row">
      <span style={{ color: type === 'folder' ? '#e2b857' : '#94a3b8', lineHeight: 0 }}>
        {type === 'folder' ? <Folder size={14} /> : <File size={14} />}
      </span>
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={type === 'folder' ? 'folder-name' : 'file.js'}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleConfirm();
          if (e.key === 'Escape') onCancel();
        }}
        className="file-rename-input"
        style={{ flex: 1 }}
      />
      <button onClick={handleConfirm} style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer', padding: 2 }}>
        <Check size={13} />
      </button>
      <button onClick={onCancel} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 2 }}>
        <X size={13} />
      </button>
    </div>
  );
};

// ─── Main FileExplorer Component ──────────────────────────────────────────────

/**
 * FileExplorer — full sidebar file tree for the collaborative code editor.
 *
 * Props:
 * - files: Array — flat list of CodeFile documents from API
 * - activeFileId: string — currently open file ID
 * - onSelectFile: (file) => void
 * - onCreateFile: (name, parentId) => Promise<void>
 * - onCreateFolder: (name, parentId) => Promise<void>
 * - onRename: (fileId, newName, isFolder) => Promise<void>
 * - onDelete: (fileId, name, isFolder) => Promise<void>
 * - hasWriteAccess: boolean
 * - workspaceName: string
 */
const FileExplorer = ({
  files = [],
  activeFileId,
  onSelectFile,
  onCreateFile,
  onCreateFolder,
  onRename,
  onDelete,
  hasWriteAccess = true,
  workspaceName = 'Workspace',
}) => {
  const [creatingIn, setCreatingIn] = useState(null); // { type: 'file'|'folder', parentId }
  const tree = buildTree(files);

  const handleNewFile = (parentId = null) => setCreatingIn({ type: 'file', parentId });
  const handleNewFolder = (parentId = null) => setCreatingIn({ type: 'folder', parentId });

  const handleCreateConfirm = async (name) => {
    const parentId = creatingIn.parentId;
    setCreatingIn(null);
    try {
      if (creatingIn.type === 'file') {
        await onCreateFile(name, parentId);
      } else {
        await onCreateFolder(name, parentId);
      }
    } catch {
      toast.error('Failed to create item.');
    }
  };

  return (
    <div className="file-explorer">
      {/* Explorer Header */}
      <div className="file-explorer-header">
        <span className="file-explorer-title">EXPLORER</span>
        {hasWriteAccess && (
          <div className="file-explorer-header-actions">
            <button title="New File" onClick={() => handleNewFile(null)}>
              <Plus size={14} />
            </button>
            <button title="New Folder" onClick={() => handleNewFolder(null)}>
              <FolderPlus size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Workspace Root Label */}
      <div className="file-explorer-workspace-label">
        <ChevronDown size={12} />
        <span>{workspaceName.toUpperCase()}</span>
      </div>

      {/* New item input at root level */}
      {creatingIn && creatingIn.parentId === null && (
        <div style={{ padding: '2px 8px' }}>
          <NewItemInput
            type={creatingIn.type}
            onConfirm={handleCreateConfirm}
            onCancel={() => setCreatingIn(null)}
          />
        </div>
      )}

      {/* File Tree */}
      <div className="file-tree">
        {tree.length === 0 ? (
          <div className="file-tree-empty">
            <File size={20} style={{ marginBottom: 8, opacity: 0.4 }} />
            <p>No files yet.</p>
            {hasWriteAccess && (
              <button className="file-tree-empty-btn" onClick={() => handleNewFile(null)}>
                + Create your first file
              </button>
            )}
          </div>
        ) : (
          tree.map((node) => (
            <TreeNode
              key={node._id}
              node={node}
              depth={0}
              activeFileId={activeFileId}
              onSelectFile={onSelectFile}
              onCreateFile={handleNewFile}
              onCreateFolder={handleNewFolder}
              onRename={onRename}
              onDelete={onDelete}
              hasWriteAccess={hasWriteAccess}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default FileExplorer;
