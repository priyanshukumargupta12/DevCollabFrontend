import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

import {
  getCodeFiles,
  getCodeFileById,
  createCodeFile,
  updateCodeFile,
  deleteCodeFile,
  saveVersion,
  executeCodeFile,
} from '../api/codeEditor';
import { getWorkspaceById } from '../api/workspace';

import FileExplorer from '../components/editor/FileExplorer';
import EditorTabs from '../components/editor/EditorTabs';
import EditorToolbar from '../components/editor/EditorToolbar';
import EditorStatusBar from '../components/editor/EditorStatusBar';
import Terminal from '../components/editor/Terminal';
import VersionHistoryPanel from '../components/editor/VersionHistoryPanel';
import MonacoEditorWrapper from '../components/editor/MonacoEditorWrapper';
import Spinner from '../components/Spinner';

// Auto-save debounce interval (milliseconds)
const AUTO_SAVE_DELAY = 3000;

/**
 * CodeEditorPage — Full-screen VS Code-style collaborative code editor.
 *
 * Layout:
 *   ┌───────────────────────────────────────────────┐
 *   │  EditorToolbar                                │
 *   ├───────────────┬───────────────────────────────┤
 *   │               │  EditorTabs                   │
 *   │ FileExplorer  │─────────────────────────────  │
 *   │  (sidebar)    │  MonacoEditorWrapper           │
 *   │               │                               │
 *   ├───────────────┴───────────────────────────────┤
 *   │  Terminal / Output Panel                      │
 *   ├───────────────────────────────────────────────┤
 *   │  EditorStatusBar                              │
 *   └───────────────────────────────────────────────┘
 */
const CodeEditorPage = () => {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket } = useSocket();

  // ─── Workspace & Files State ───────────────────────────────────────────────
  const [workspace, setWorkspace] = useState(null);
  const [files, setFiles] = useState([]);
  const [isLoadingWorkspace, setIsLoadingWorkspace] = useState(true);

  // ─── Tab Management ────────────────────────────────────────────────────────
  const [openTabs, setOpenTabs] = useState([]); // Array of { _id, name, language, isDirty }
  const [activeTabId, setActiveTabId] = useState(null);

  // ─── Editor Content ────────────────────────────────────────────────────────
  const [currentContent, setCurrentContent] = useState('');
  const [currentLanguage, setCurrentLanguage] = useState('javascript');
  const contentRef = useRef(''); // Ref for auto-save without stale closure

  // ─── Cursor & Collaboration ────────────────────────────────────────────────
  const [cursorPosition, setCursorPosition] = useState({ lineNumber: 1, column: 1 });
  const [collaborators, setCollaborators] = useState([]); // Active editors on current file
  const editorRef = useRef(null);

  // ─── Auto-save ────────────────────────────────────────────────────────────
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const autoSaveTimerRef = useRef(null);

  // ─── Terminal / Execution ──────────────────────────────────────────────────
  const [terminalOutput, setTerminalOutput] = useState('');
  const [terminalError, setTerminalError] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [exitCode, setExitCode] = useState(null);
  const [executionTime, setExecutionTime] = useState(null);
  const [timedOut, setTimedOut] = useState(false);
  const [isTerminalCollapsed, setIsTerminalCollapsed] = useState(false);

  // ─── UI State ──────────────────────────────────────────────────────────────
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [darkTheme, setDarkTheme] = useState(true);

  // ─── Permissions ───────────────────────────────────────────────────────────
  const isOwner = workspace?.owner?._id === user?._id || workspace?.owner === user?._id;
  const memberRecord = workspace?.members?.find(
    (m) => (m.user?._id || m.user) === user?._id
  );
  const isAdmin = memberRecord?.role === 'admin';
  const hasWriteAccess = isOwner || isAdmin || memberRecord?.role === 'member';

  // ─── Load Workspace & Files ────────────────────────────────────────────────
  useEffect(() => {
    if (!workspaceId) return;

    const loadData = async () => {
      setIsLoadingWorkspace(true);
      try {
        const [wsData, filesData] = await Promise.all([
          getWorkspaceById(workspaceId),
          getCodeFiles(workspaceId),
        ]);
        setWorkspace(wsData.workspace);
        setFiles(filesData.files || []);
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to load workspace.');
        navigate('/dashboard');
      } finally {
        setIsLoadingWorkspace(false);
      }
    };

    loadData();
  }, [workspaceId, navigate]);

  // ─── Socket.io Collaborative Editor Events ─────────────────────────────────
  useEffect(() => {
    if (!socket || !activeTabId || !user) return;

    const avatarUrl = user.avatar || '';

    // Join the editor room for the active file
    socket.emit('join_code_editor', {
      fileId: activeTabId,
      workspaceId,
      userId: user._id,
      username: user.username,
      avatar: avatarUrl,
    });

    // Receive initial file content from cache (fast load)
    const handleEditorInit = ({ content, language }) => {
      if (content !== undefined) {
        editorRef.current?.setValue(content);
        setCurrentContent(content);
        contentRef.current = content;
        setCurrentLanguage(language || 'javascript');
      }
    };

    // Receive code changes from other editors
    const handleCodeChange = ({ fileId, content, senderSocketId }) => {
      if (fileId !== activeTabId) return;
      if (senderSocketId === socket.id) return; // Skip our own echoes

      // Apply remote change via editor ref (no re-render loop)
      editorRef.current?.setValue(content);
      contentRef.current = content;
      setCurrentContent(content);
    };

    // Receive cursor position from collaborators
    const handleCursorChange = ({ socketId, cursor }) => {
      setCollaborators((prev) =>
        prev.map((c) => (c.socketId === socketId ? { ...c, cursor } : c))
      );
    };

    // Collaborator joined this file
    const handleUserJoined = (userInfo) => {
      setCollaborators((prev) => {
        if (prev.some((c) => c.socketId === userInfo.socketId)) return prev;
        return [...prev, userInfo];
      });
      toast(`${userInfo.username} joined the editor`, {
        icon: '✏️',
        style: { fontSize: '0.8rem' },
        duration: 2500,
      });
    };

    // Collaborator left this file
    const handleUserLeft = ({ socketId }) => {
      setCollaborators((prev) => {
        const left = prev.find((c) => c.socketId === socketId);
        if (left) {
          toast(`${left.username} left the editor`, {
            icon: '👋',
            style: { fontSize: '0.8rem' },
            duration: 2000,
          });
        }
        return prev.filter((c) => c.socketId !== socketId);
      });
    };

    // Current presence list on join
    const handlePresence = (editors) => {
      setCollaborators(editors);
    };

    // Run code result via socket
    const handleRunResult = ({ output, error, exitCode: ec, executionTime: et, timedOut: to }) => {
      setTerminalOutput(output || '');
      setTerminalError(error || '');
      setExitCode(ec);
      setExecutionTime(et);
      setTimedOut(to || false);
      setIsRunning(false);
    };

    socket.on('editor_init', handleEditorInit);
    socket.on('code_change', handleCodeChange);
    socket.on('cursor_change', handleCursorChange);
    socket.on('user_joined_editor', handleUserJoined);
    socket.on('user_left_editor', handleUserLeft);
    socket.on('editor_presence', handlePresence);
    socket.on('run_code_result', handleRunResult);

    return () => {
      // Leave the editor room when switching files or unmounting
      socket.emit('leave_code_editor', { fileId: activeTabId });
      socket.off('editor_init', handleEditorInit);
      socket.off('code_change', handleCodeChange);
      socket.off('cursor_change', handleCursorChange);
      socket.off('user_joined_editor', handleUserJoined);
      socket.off('user_left_editor', handleUserLeft);
      socket.off('editor_presence', handlePresence);
      socket.off('run_code_result', handleRunResult);
      setCollaborators([]);
    };
  }, [socket, activeTabId, workspaceId, user]);

  // ─── Keyboard Shortcut Listeners ──────────────────────────────────────────
  useEffect(() => {
    const handleSave = () => handleSaveFile();
    const handleRun = () => handleRunCode();

    document.addEventListener('editor-save', handleSave);
    document.addEventListener('editor-run', handleRun);
    return () => {
      document.removeEventListener('editor-save', handleSave);
      document.removeEventListener('editor-run', handleRun);
    };
  }, [activeTabId, currentContent, currentLanguage]);

  // ─── Open a File ──────────────────────────────────────────────────────────
  const handleSelectFile = async (file) => {
    if (file.isFolder) return;

    // If already open, just switch to it
    if (openTabs.some((t) => t._id === file._id)) {
      setActiveTabId(file._id);
      return;
    }

    try {
      const data = await getCodeFileById(workspaceId, file._id);
      const codeFile = data.codeFile;

      // Add to open tabs
      setOpenTabs((prev) => [
        ...prev,
        { _id: codeFile._id, name: codeFile.name, language: codeFile.language, isDirty: false },
      ]);
      setActiveTabId(codeFile._id);
      setCurrentContent(codeFile.content || '');
      setCurrentLanguage(codeFile.language || 'javascript');
      contentRef.current = codeFile.content || '';
      setLastSaved(null);
    } catch {
      toast.error('Failed to open file.');
    }
  };

  // ─── Switch Tab ───────────────────────────────────────────────────────────
  const handleSelectTab = async (tabId) => {
    if (tabId === activeTabId) return;
    // Save auto-save state of current tab before switching
    clearTimeout(autoSaveTimerRef.current);

    try {
      const data = await getCodeFileById(workspaceId, tabId);
      const codeFile = data.codeFile;
      setActiveTabId(tabId);
      setCurrentContent(codeFile.content || '');
      setCurrentLanguage(codeFile.language || 'javascript');
      contentRef.current = codeFile.content || '';
    } catch {
      toast.error('Failed to switch file.');
    }
  };

  // ─── Close Tab ────────────────────────────────────────────────────────────
  const handleCloseTab = (tabId) => {
    const tab = openTabs.find((t) => t._id === tabId);
    if (tab?.isDirty) {
      if (!window.confirm(`Close "${tab.name}" with unsaved changes?`)) return;
    }

    const newTabs = openTabs.filter((t) => t._id !== tabId);
    setOpenTabs(newTabs);

    if (activeTabId === tabId) {
      const next = newTabs[newTabs.length - 1];
      if (next) {
        handleSelectTab(next._id);
      } else {
        setActiveTabId(null);
        setCurrentContent('');
        setCurrentLanguage('javascript');
      }
    }
  };

  // ─── Content Change Handler ───────────────────────────────────────────────
  const handleContentChange = useCallback(
    (newValue) => {
      setCurrentContent(newValue);
      contentRef.current = newValue;

      // Mark tab as dirty
      setOpenTabs((prev) =>
        prev.map((t) => (t._id === activeTabId ? { ...t, isDirty: true } : t))
      );

      // Broadcast code change via Socket.io
      if (socket && activeTabId) {
        socket.emit('code_change', {
          fileId: activeTabId,
          content: newValue,
          language: currentLanguage,
        });
      }

      // Schedule auto-save
      clearTimeout(autoSaveTimerRef.current);
      if (hasWriteAccess) {
        autoSaveTimerRef.current = setTimeout(() => {
          autoSaveFile(activeTabId, newValue, currentLanguage);
        }, AUTO_SAVE_DELAY);
      }
    },
    [socket, activeTabId, currentLanguage, hasWriteAccess]
  );

  // ─── Auto-Save ────────────────────────────────────────────────────────────
  const autoSaveFile = async (fileId, content, language) => {
    if (!fileId || !hasWriteAccess) return;
    setIsSaving(true);
    try {
      await updateCodeFile(workspaceId, fileId, { content, language });
      setLastSaved(new Date());
      setOpenTabs((prev) =>
        prev.map((t) => (t._id === fileId ? { ...t, isDirty: false } : t))
      );
      // Notify collaborators
      socket?.emit('code_saved', {
        fileId,
        savedBy: user?.username,
        version: null,
      });
    } catch {
      // Silently fail auto-save — don't toast to avoid noise
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Manual Save + Version Snapshot ──────────────────────────────────────
  const handleSaveFile = async () => {
    if (!activeTabId || !hasWriteAccess) return;
    clearTimeout(autoSaveTimerRef.current);
    setIsSaving(true);

    const toastId = toast.loading('Saving...');
    try {
      await updateCodeFile(workspaceId, activeTabId, {
        content: contentRef.current,
        language: currentLanguage,
      });

      // Save a version snapshot on every manual save
      await saveVersion(workspaceId, activeTabId, {
        label: `v${Date.now()}`,
      });

      setLastSaved(new Date());
      setOpenTabs((prev) =>
        prev.map((t) => (t._id === activeTabId ? { ...t, isDirty: false } : t))
      );
      socket?.emit('code_saved', {
        fileId: activeTabId,
        savedBy: user?.username,
        version: 'manual',
      });
      toast.success('File saved ✓', { id: toastId });
    } catch {
      toast.error('Failed to save.', { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Cursor Change → broadcast ────────────────────────────────────────────
  const handleCursorChange = (position) => {
    setCursorPosition(position);
    if (socket && activeTabId) {
      socket.emit('cursor_change', {
        fileId: activeTabId,
        cursor: position,
      });
    }
  };

  // ─── Run Code ─────────────────────────────────────────────────────────────
  const handleRunCode = async () => {
    if (!activeTabId || isRunning) return;
    setIsRunning(true);
    setTerminalOutput('');
    setTerminalError('');
    setExitCode(null);
    setExecutionTime(null);
    setTimedOut(false);
    setIsTerminalCollapsed(false);

    // Use socket for live run (faster UX)
    if (socket) {
      const requestId = `run_${Date.now()}`;
      socket.emit('run_code_request', {
        fileId: activeTabId,
        code: contentRef.current,
        language: currentLanguage,
        requestId,
      });
      // Result handled by socket listener — timeout fallback via API
      const timeout = setTimeout(async () => {
        if (isRunning) {
          try {
            const data = await executeCodeFile(workspaceId, activeTabId, {
              code: contentRef.current,
              language: currentLanguage,
            });
            const { output, error, exitCode: ec, executionTime: et, timedOut: to } = data.result;
            setTerminalOutput(output || '');
            setTerminalError(error || '');
            setExitCode(ec);
            setExecutionTime(et);
            setTimedOut(to || false);
          } catch {
            setTerminalError('Execution failed.');
            setExitCode(1);
          } finally {
            setIsRunning(false);
          }
        }
      }, 12000);
      return () => clearTimeout(timeout);
    } else {
      // Fallback: REST API
      try {
        const data = await executeCodeFile(workspaceId, activeTabId, {
          code: contentRef.current,
          language: currentLanguage,
        });
        const { output, error, exitCode: ec, executionTime: et, timedOut: to } = data.result;
        setTerminalOutput(output || '');
        setTerminalError(error || '');
        setExitCode(ec);
        setExecutionTime(et);
        setTimedOut(to || false);
      } catch {
        setTerminalError('Execution failed.');
        setExitCode(1);
      } finally {
        setIsRunning(false);
      }
    }
  };

  // ─── File CRUD Handlers ────────────────────────────────────────────────────
  const handleCreateFile = async (name, parentId = null) => {
    try {
      const data = await createCodeFile(workspaceId, {
        name,
        isFolder: false,
        parent: parentId,
      });
      setFiles((prev) => [...prev, data.codeFile]);
      // Auto-open the new file
      await handleSelectFile(data.codeFile);
      toast.success(`Created "${name}"`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create file.');
    }
  };

  const handleCreateFolder = async (name, parentId = null) => {
    try {
      const data = await createCodeFile(workspaceId, {
        name,
        isFolder: true,
        parent: parentId,
      });
      setFiles((prev) => [...prev, data.codeFile]);
      toast.success(`Created folder "${name}"`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create folder.');
    }
  };

  const handleRenameFile = async (fileId, newName) => {
    try {
      const data = await updateCodeFile(workspaceId, fileId, { name: newName });
      setFiles((prev) => prev.map((f) => (f._id === fileId ? { ...f, name: newName } : f)));
      setOpenTabs((prev) => prev.map((t) => (t._id === fileId ? { ...t, name: newName } : t)));
      toast.success(`Renamed to "${newName}"`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to rename.');
    }
  };

  const handleDeleteFile = async (fileId, name, isFolder) => {
    if (!window.confirm(`Delete "${name}"${isFolder ? ' and all its contents' : ''}?`)) return;
    try {
      await deleteCodeFile(workspaceId, fileId);
      setFiles((prev) => prev.filter((f) => f._id !== fileId));
      // Close tab if open
      if (openTabs.some((t) => t._id === fileId)) {
        handleCloseTab(fileId);
      }
      toast.success(`Deleted "${name}"`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete.');
    }
  };

  const handleShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied to clipboard! 🔗');
  };

  const handleLanguageChange = async (lang) => {
    setCurrentLanguage(lang);
    setOpenTabs((prev) =>
      prev.map((t) => (t._id === activeTabId ? { ...t, language: lang } : t))
    );
    if (activeTabId) {
      try {
        await updateCodeFile(workspaceId, activeTabId, { language: lang });
      } catch {
        // Non-critical
      }
    }
  };

  const activeTab = openTabs.find((t) => t._id === activeTabId);

  // ─── Loading State ─────────────────────────────────────────────────────────
  if (isLoadingWorkspace) {
    return (
      <div className="editor-page-loading">
        <Spinner />
        <span>Loading workspace...</span>
      </div>
    );
  }

  return (
    <div className={`editor-page ${darkTheme ? 'editor-dark' : 'editor-light'}`}>
      {/* ── Toolbar ──────────────────────────────────────────────────────────── */}
      <EditorToolbar
        workspaceName={workspace?.name}
        fileName={activeTab?.name}
        language={currentLanguage}
        onLanguageChange={handleLanguageChange}
        onRun={handleRunCode}
        onSave={handleSaveFile}
        onShareLink={handleShareLink}
        onToggleVersionHistory={() => setShowVersionHistory(!showVersionHistory)}
        onToggleTheme={() => setDarkTheme(!darkTheme)}
        collaborators={collaborators}
        isRunning={isRunning}
        isSaving={isSaving}
        lastSaved={lastSaved}
        darkTheme={darkTheme}
        hasWriteAccess={hasWriteAccess}
      />

      {/* ── Main Body ─────────────────────────────────────────────────────────── */}
      <div className="editor-body">
        {/* Sidebar toggle button */}
        <button
          className="sidebar-toggle-btn"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          title={isSidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
        >
          {isSidebarOpen ? <PanelLeftClose size={15} /> : <PanelLeftOpen size={15} />}
        </button>

        {/* ── File Explorer Sidebar ──────────────────────────────────────────── */}
        {isSidebarOpen && (
          <aside className="editor-sidebar">
            {/* Back to workspace */}
            <button
              className="back-to-workspace-btn"
              onClick={() => navigate('/dashboard')}
            >
              <ArrowLeft size={13} />
              <span>Dashboard</span>
            </button>

            <FileExplorer
              files={files}
              activeFileId={activeTabId}
              onSelectFile={handleSelectFile}
              onCreateFile={handleCreateFile}
              onCreateFolder={handleCreateFolder}
              onRename={handleRenameFile}
              onDelete={handleDeleteFile}
              hasWriteAccess={hasWriteAccess}
              workspaceName={workspace?.name}
            />
          </aside>
        )}

        {/* ── Editor Panel ───────────────────────────────────────────────────── */}
        <main className="editor-main">
          {/* Tabs */}
          <EditorTabs
            openTabs={openTabs}
            activeTabId={activeTabId}
            onSelectTab={handleSelectTab}
            onCloseTab={handleCloseTab}
          />

          {/* Monaco Editor Area */}
          <div className="editor-area">
            {activeTabId ? (
              <MonacoEditorWrapper
                ref={editorRef}
                value={currentContent}
                language={currentLanguage}
                onChange={handleContentChange}
                onCursorChange={handleCursorChange}
                readOnly={!hasWriteAccess}
                darkTheme={darkTheme}
                collaborators={collaborators}
              />
            ) : (
              /* Welcome / Empty State */
              <div className="editor-welcome">
                <div className="editor-welcome-inner">
                  <div className="editor-welcome-logo">⌨️</div>
                  <h2>Collaborative Code Editor</h2>
                  <p>Select a file from the explorer to start editing</p>
                  <div className="editor-shortcuts">
                    <div className="shortcut-item">
                      <kbd>Ctrl</kbd><span>+</span><kbd>S</kbd>
                      <span className="shortcut-desc">Save file</span>
                    </div>
                    <div className="shortcut-item">
                      <kbd>Ctrl</kbd><span>+</span><kbd>Enter</kbd>
                      <span className="shortcut-desc">Run code</span>
                    </div>
                  </div>
                  {hasWriteAccess && (
                    <button
                      className="editor-welcome-cta"
                      onClick={() => handleCreateFile('main.js', null)}
                    >
                      + Create main.js
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Terminal Panel */}
          <Terminal
            output={terminalOutput}
            error={terminalError}
            isRunning={isRunning}
            exitCode={exitCode}
            executionTime={executionTime}
            language={currentLanguage}
            timedOut={timedOut}
            onClear={() => {
              setTerminalOutput('');
              setTerminalError('');
              setExitCode(null);
              setExecutionTime(null);
            }}
            isCollapsed={isTerminalCollapsed}
            onToggleCollapse={() => setIsTerminalCollapsed(!isTerminalCollapsed)}
          />
        </main>

        {/* ── Version History Panel (slide-in) ──────────────────────────────── */}
        {showVersionHistory && activeTabId && (
          <VersionHistoryPanel
            workspaceId={workspaceId}
            fileId={activeTabId}
            currentContent={currentContent}
            onClose={() => setShowVersionHistory(false)}
            onRestored={(restoredContent) => {
              editorRef.current?.setValue(restoredContent);
              setCurrentContent(restoredContent);
              contentRef.current = restoredContent;
            }}
            hasWriteAccess={hasWriteAccess}
          />
        )}
      </div>

      {/* ── Status Bar ────────────────────────────────────────────────────────── */}
      <EditorStatusBar
        language={currentLanguage}
        cursorLine={cursorPosition.lineNumber}
        cursorColumn={cursorPosition.column}
        collaboratorCount={collaborators.length}
        fileName={activeTab?.name}
        isDirty={activeTab?.isDirty || false}
        hasWriteAccess={hasWriteAccess}
      />
    </div>
  );
};

export default CodeEditorPage;
