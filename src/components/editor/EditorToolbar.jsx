import { useState } from 'react';
import {
  Play, Save, Share2, Users, History, Sun, Moon,
  ChevronDown, Loader2, CheckCircle, XCircle, Code2
} from 'lucide-react';

/**
 * Language options for the selector dropdown.
 */
const LANGUAGES = [
  { value: 'javascript', label: 'JavaScript', ext: '.js' },
  { value: 'typescript', label: 'TypeScript', ext: '.ts' },
  { value: 'python', label: 'Python', ext: '.py' },
  { value: 'java', label: 'Java', ext: '.java' },
  { value: 'cpp', label: 'C++', ext: '.cpp' },
  { value: 'c', label: 'C', ext: '.c' },
  { value: 'go', label: 'Go', ext: '.go' },
  { value: 'rust', label: 'Rust', ext: '.rs' },
  { value: 'html', label: 'HTML', ext: '.html' },
  { value: 'css', label: 'CSS', ext: '.css' },
  { value: 'json', label: 'JSON', ext: '.json' },
];

/**
 * EditorToolbar — top action bar for the collaborative code editor.
 *
 * Props:
 * - workspaceName: string
 * - fileName: string
 * - language: string
 * - onLanguageChange: (lang) => void
 * - onRun: () => void
 * - onSave: () => void
 * - onShareLink: () => void
 * - onToggleVersionHistory: () => void
 * - onToggleTheme: () => void
 * - collaborators: Array<{ userId, username, avatar, color }> — active editors
 * - isRunning: boolean
 * - isSaving: boolean
 * - lastSaved: Date|null
 * - darkTheme: boolean
 * - hasWriteAccess: boolean
 */
const EditorToolbar = ({
  workspaceName = '',
  fileName = '',
  language = 'javascript',
  onLanguageChange,
  onRun,
  onSave,
  onShareLink,
  onToggleVersionHistory,
  onToggleTheme,
  collaborators = [],
  isRunning = false,
  isSaving = false,
  lastSaved = null,
  darkTheme = true,
  hasWriteAccess = true,
}) => {
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const selectedLang = LANGUAGES.find((l) => l.value === language) || LANGUAGES[0];

  const formatSaveTime = (date) => {
    if (!date) return null;
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    if (diff < 5) return 'Just saved';
    if (diff < 60) return `Saved ${diff}s ago`;
    if (diff < 3600) return `Saved ${Math.floor(diff / 60)}m ago`;
    return `Saved at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <div className="editor-toolbar">
      {/* Left: Workspace/File breadcrumb */}
      <div className="editor-toolbar-left">
        <Code2 size={16} style={{ color: 'var(--color-accent-light)', flexShrink: 0 }} />
        <span className="editor-toolbar-breadcrumb">
          {workspaceName && <span className="editor-breadcrumb-workspace">{workspaceName}</span>}
          {workspaceName && fileName && <span style={{ opacity: 0.4, margin: '0 4px' }}>/</span>}
          {fileName && <span className="editor-breadcrumb-file">{fileName}</span>}
        </span>

        {/* Save status */}
        {hasWriteAccess && (
          <span className="editor-save-status">
            {isSaving ? (
              <><Loader2 size={11} className="spin" /><span>Saving...</span></>
            ) : lastSaved ? (
              <><CheckCircle size={11} style={{ color: '#10b981' }} /><span>{formatSaveTime(lastSaved)}</span></>
            ) : null}
          </span>
        )}
      </div>

      {/* Center: Language selector */}
      <div className="editor-toolbar-center" style={{ position: 'relative' }}>
        <button
          className="editor-lang-btn"
          onClick={() => setShowLangDropdown(!showLangDropdown)}
          disabled={!hasWriteAccess}
          title="Change language"
        >
          <span>{selectedLang.label}</span>
          <ChevronDown size={12} />
        </button>

        {showLangDropdown && (
          <div className="editor-lang-dropdown">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.value}
                className={`editor-lang-option ${lang.value === language ? 'active' : ''}`}
                onClick={() => {
                  onLanguageChange?.(lang.value);
                  setShowLangDropdown(false);
                }}
              >
                <span>{lang.label}</span>
                <span className="editor-lang-ext">{lang.ext}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right: Action buttons + collaborator avatars */}
      <div className="editor-toolbar-right">
        {/* Collaborator presence avatars */}
        {collaborators.length > 0 && (
          <div className="editor-collaborators">
            {collaborators.slice(0, 5).map((c) => (
              <div
                key={c.socketId || c.userId}
                className="editor-collaborator-avatar"
                style={{ borderColor: c.color }}
                title={`${c.username} is editing`}
              >
                {c.avatar ? (
                  <img src={c.avatar} alt={c.username} />
                ) : (
                  <span style={{ background: c.color }}>
                    {c.username?.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
            ))}
            {collaborators.length > 5 && (
              <div className="editor-collaborator-avatar editor-collaborator-overflow">
                +{collaborators.length - 5}
              </div>
            )}
          </div>
        )}

        {/* Version History */}
        <button
          className="editor-toolbar-btn"
          onClick={onToggleVersionHistory}
          title="Version History"
        >
          <History size={15} />
          <span>History</span>
        </button>

        {/* Share Link */}
        <button
          className="editor-toolbar-btn"
          onClick={onShareLink}
          title="Copy share link"
        >
          <Share2 size={15} />
          <span>Share</span>
        </button>

        {/* Theme toggle */}
        <button
          className="editor-toolbar-btn icon-only"
          onClick={onToggleTheme}
          title={darkTheme ? 'Switch to light theme' : 'Switch to dark theme'}
        >
          {darkTheme ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        {/* Save button */}
        {hasWriteAccess && (
          <button
            className="editor-toolbar-btn"
            onClick={onSave}
            disabled={isSaving}
            title="Save file (Ctrl+S)"
          >
            {isSaving ? <Loader2 size={15} className="spin" /> : <Save size={15} />}
            <span>Save</span>
          </button>
        )}

        {/* Run button */}
        <button
          className="editor-toolbar-btn run-btn"
          onClick={onRun}
          disabled={isRunning}
          title="Run code (Ctrl+Enter)"
        >
          {isRunning ? (
            <><Loader2 size={15} className="spin" /><span>Running...</span></>
          ) : (
            <><Play size={15} fill="currentColor" /><span>Run</span></>
          )}
        </button>
      </div>
    </div>
  );
};

export default EditorToolbar;
