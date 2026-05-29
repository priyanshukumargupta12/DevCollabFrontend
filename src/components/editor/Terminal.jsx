import { useRef, useState } from 'react';
import { Terminal as TerminalIcon, X, Trash2, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';

/**
 * Terminal — bottom output panel for the collaborative code editor.
 * Displays code execution results, errors, and loading states.
 *
 * Props:
 * - output: string — stdout from execution
 * - error: string — stderr from execution
 * - isRunning: boolean
 * - exitCode: number|null
 * - executionTime: number|null — ms
 * - language: string
 * - timedOut: boolean
 * - onClear: () => void
 * - isCollapsed: boolean
 * - onToggleCollapse: () => void
 */
const Terminal = ({
  output = '',
  error = '',
  isRunning = false,
  exitCode = null,
  executionTime = null,
  language = '',
  timedOut = false,
  onClear,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const terminalRef = useRef(null);

  const hasOutput = output || error || exitCode !== null;
  const isSuccess = exitCode === 0;

  return (
    <div className={`editor-terminal ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Terminal Header */}
      <div className="editor-terminal-header">
        <div className="editor-terminal-header-left">
          <TerminalIcon size={13} style={{ color: '#10b981' }} />
          <span className="editor-terminal-title">OUTPUT</span>

          {/* Execution status badge */}
          {!isRunning && exitCode !== null && (
            <span
              className={`terminal-status-badge ${isSuccess ? 'success' : 'error'}`}
            >
              {timedOut
                ? '⏱ Timed Out'
                : isSuccess
                ? `✓ Exit 0`
                : `✗ Exit ${exitCode}`}
            </span>
          )}

          {executionTime !== null && !isRunning && (
            <span className="terminal-exec-time">{executionTime}ms</span>
          )}

          {isRunning && (
            <span className="terminal-status-badge running">
              <Loader2 size={10} className="spin" />
              Running {language}...
            </span>
          )}
        </div>

        <div className="editor-terminal-header-right">
          {/* Clear button */}
          {hasOutput && (
            <button
              className="terminal-icon-btn"
              onClick={onClear}
              title="Clear output"
            >
              <Trash2 size={12} />
            </button>
          )}
          {/* Collapse toggle */}
          <button
            className="terminal-icon-btn"
            onClick={onToggleCollapse}
            title={isCollapsed ? 'Expand terminal' : 'Collapse terminal'}
          >
            {isCollapsed ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>
      </div>

      {/* Terminal Body */}
      {!isCollapsed && (
        <div className="editor-terminal-body" ref={terminalRef}>
          {isRunning ? (
            <div className="terminal-loading">
              <div className="terminal-loading-dots">
                <span /><span /><span />
              </div>
              <span className="terminal-loading-text">Executing {language} code...</span>
            </div>
          ) : !hasOutput ? (
            <div className="terminal-empty">
              <span className="terminal-prompt">$ </span>
              <span className="terminal-cursor-blink">▋</span>
              <span style={{ opacity: 0.4, marginLeft: 8 }}>
                Press Run ▶ to execute your code
              </span>
            </div>
          ) : (
            <div className="terminal-content">
              {/* stdout */}
              {output && (
                <pre className="terminal-output stdout">
                  <span className="terminal-label stdout-label">stdout</span>
                  {output}
                </pre>
              )}

              {/* stderr */}
              {error && (
                <pre className="terminal-output stderr">
                  <span className="terminal-label stderr-label">stderr</span>
                  {error}
                </pre>
              )}

              {/* Timeout warning */}
              {timedOut && (
                <div className="terminal-timeout-msg">
                  ⏱ Execution timed out after 10 seconds and was killed.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Terminal;
