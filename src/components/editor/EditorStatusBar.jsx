/**
 * EditorStatusBar — VS Code-style bottom status bar for the code editor.
 *
 * Props:
 * - language: string
 * - cursorLine: number
 * - cursorColumn: number
 * - collaboratorCount: number
 * - fileName: string
 * - encoding: string
 * - isDirty: boolean
 * - hasWriteAccess: boolean
 */
const EditorStatusBar = ({
  language = 'plaintext',
  cursorLine = 1,
  cursorColumn = 1,
  collaboratorCount = 0,
  fileName = '',
  encoding = 'UTF-8',
  isDirty = false,
  hasWriteAccess = true,
}) => {
  const langDisplay = language.charAt(0).toUpperCase() + language.slice(1);

  return (
    <div className="editor-status-bar">
      {/* Left section */}
      <div className="editor-status-left">
        {/* Write access indicator */}
        <span
          className="status-item"
          style={{ color: hasWriteAccess ? '#10b981' : '#f59e0b' }}
          title={hasWriteAccess ? 'Editor access' : 'Viewer access — read only'}
        >
          {hasWriteAccess ? '✎ Editor' : '⊘ Viewer'}
        </span>

        {/* Dirty indicator */}
        {isDirty && (
          <span className="status-item" style={{ color: '#f59e0b' }} title="Unsaved changes">
            ● Modified
          </span>
        )}

        {/* Collaborators online */}
        {collaboratorCount > 0 && (
          <span className="status-item" style={{ color: '#8b5cf6' }}>
            👥 {collaboratorCount} editing
          </span>
        )}
      </div>

      {/* Right section */}
      <div className="editor-status-right">
        {/* Cursor position */}
        <span className="status-item" title="Cursor position">
          Ln {cursorLine}, Col {cursorColumn}
        </span>

        {/* Encoding */}
        <span className="status-item">{encoding}</span>

        {/* Language */}
        <span className="status-item status-language" title="Language mode">
          {langDisplay}
        </span>
      </div>
    </div>
  );
};

export default EditorStatusBar;
