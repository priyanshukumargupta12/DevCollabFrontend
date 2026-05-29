import { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import Editor, { loader } from '@monaco-editor/react';

// Configure Monaco to load from CDN (no webpack needed)
loader.config({
  paths: {
    vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs',
  },
});

/**
 * Custom VS Code-like dark theme definition for Monaco.
 * Registered once when the editor mounts.
 */
const CUSTOM_THEME = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'comment', foreground: '6a9955', fontStyle: 'italic' },
    { token: 'keyword', foreground: '569cd6', fontStyle: 'bold' },
    { token: 'string', foreground: 'ce9178' },
    { token: 'number', foreground: 'b5cea8' },
    { token: 'type', foreground: '4ec9b0' },
    { token: 'function', foreground: 'dcdcaa' },
    { token: 'variable', foreground: '9cdcfe' },
    { token: 'operator', foreground: 'd4d4d4' },
  ],
  colors: {
    'editor.background': '#0d1117',
    'editor.foreground': '#c9d1d9',
    'editorLineNumber.foreground': '#3b4048',
    'editorLineNumber.activeForeground': '#6b7280',
    'editor.lineHighlightBackground': '#161b22',
    'editorCursor.foreground': '#58a6ff',
    'editor.selectionBackground': '#1c4a7b',
    'editor.inactiveSelectionBackground': '#1c3a5e',
    'editorIndentGuide.background': '#21262d',
    'editorIndentGuide.activeBackground': '#3b4048',
    'editor.wordHighlightBackground': '#1c4a7b44',
    'editor.findMatchBackground': '#f59e0b44',
    'editor.findMatchHighlightBackground': '#f59e0b22',
    'scrollbarSlider.background': '#21262d80',
    'scrollbarSlider.hoverBackground': '#30363d80',
    'tabs.activeBackground': '#0d1117',
    'sideBar.background': '#010409',
  },
};

const LIGHT_THEME = {
  base: 'vs',
  inherit: true,
  rules: [],
  colors: {
    'editor.background': '#ffffff',
    'editor.foreground': '#24292f',
    'editorLineNumber.foreground': '#d0d7de',
    'editor.lineHighlightBackground': '#f6f8fa',
  },
};

/**
 * Map our language identifiers to Monaco language IDs.
 */
const MONACO_LANG_MAP = {
  javascript: 'javascript',
  typescript: 'typescript',
  python: 'python',
  java: 'java',
  cpp: 'cpp',
  c: 'c',
  go: 'go',
  rust: 'rust',
  html: 'html',
  css: 'css',
  json: 'json',
  markdown: 'markdown',
  plaintext: 'plaintext',
};

/**
 * MonacoEditorWrapper — wraps @monaco-editor/react with collaborative features.
 *
 * Props:
 * - value: string — current file content
 * - language: string — code language identifier
 * - onChange: (newValue) => void — called on every content change
 * - onCursorChange: (position) => void — called on cursor move
 * - readOnly: boolean
 * - darkTheme: boolean
 * - collaborators: Array<{ socketId, username, color, cursor }> — remote cursors
 * - onMount: (editor, monaco) => void — called when editor is ready
 */
const MonacoEditorWrapper = forwardRef(({
  value = '',
  language = 'javascript',
  onChange,
  onCursorChange,
  readOnly = false,
  darkTheme = true,
  collaborators = [],
  onMount,
}, ref) => {
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const decorationsRef = useRef([]);
  const isInternalChangeRef = useRef(false);

  /**
   * Expose editor methods to parent via ref.
   */
  useImperativeHandle(ref, () => ({
    focus: () => editorRef.current?.focus(),
    getValue: () => editorRef.current?.getValue() || '',
    setValue: (val) => {
      if (editorRef.current) {
        isInternalChangeRef.current = true;
        editorRef.current.setValue(val);
        isInternalChangeRef.current = false;
      }
    },
    getPosition: () => editorRef.current?.getPosition(),
    revealLine: (line) => editorRef.current?.revealLine(line),
  }));

  /**
   * Render remote collaborator cursors as Monaco decorations.
   */
  const renderCollaboratorCursors = useCallback(() => {
    if (!editorRef.current || !monacoRef.current) return;

    const editor = editorRef.current;
    const monaco = monacoRef.current;

    // Build new decorations from collaborators with valid cursor positions
    const newDecorations = collaborators
      .filter((c) => c.cursor && c.cursor.lineNumber)
      .flatMap((c) => {
        const { lineNumber, column } = c.cursor;
        const color = c.color || '#8b5cf6';

        return [
          // Cursor line decoration
          {
            range: new monaco.Range(lineNumber, column, lineNumber, column),
            options: {
              className: `remote-cursor-${c.socketId?.replace(/[^a-z0-9]/gi, '')}`,
              afterContentClassName: `remote-cursor-label`,
              stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
              zIndex: 10,
            },
          },
        ];
      });

    // Apply CSS for each collaborator's color
    collaborators.forEach((c) => {
      if (!c.cursor || !c.color) return;
      const safeId = c.socketId?.replace(/[^a-z0-9]/gi, '');
      const styleId = `cursor-style-${safeId}`;
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
          .remote-cursor-${safeId} {
            border-left: 2px solid ${c.color};
            margin-left: -1px;
          }
          .remote-cursor-${safeId}::after {
            content: '${c.username?.slice(0, 10) || '?'}';
            background: ${c.color};
            color: #000;
            font-size: 10px;
            padding: 1px 4px;
            border-radius: 2px;
            position: absolute;
            top: -18px;
            left: 0;
            white-space: nowrap;
            z-index: 100;
            font-family: sans-serif;
            pointer-events: none;
          }
        `;
        document.head.appendChild(style);
      }
    });

    // Apply decorations (replace previous batch)
    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, newDecorations);
  }, [collaborators]);

  // Re-render remote cursors when collaborators change
  useEffect(() => {
    renderCollaboratorCursors();
  }, [renderCollaboratorCursors]);

  /**
   * Called when Monaco editor mounts.
   */
  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Register custom themes
    monaco.editor.defineTheme('collab-dark', CUSTOM_THEME);
    monaco.editor.defineTheme('collab-light', LIGHT_THEME);
    monaco.editor.setTheme(darkTheme ? 'collab-dark' : 'collab-light');

    // Track cursor position changes
    editor.onDidChangeCursorPosition((e) => {
      onCursorChange?.({
        lineNumber: e.position.lineNumber,
        column: e.position.column,
      });
    });

    // Keyboard shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      // Ctrl+S — trigger save (bubbled via custom event)
      document.dispatchEvent(new CustomEvent('editor-save'));
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      // Ctrl+Enter — run code
      document.dispatchEvent(new CustomEvent('editor-run'));
    });

    // Auto-close brackets / quotes
    editor.updateOptions({
      autoClosingBrackets: 'always',
      autoClosingQuotes: 'always',
    });

    onMount?.(editor, monaco);
  };

  // Sync theme changes
  useEffect(() => {
    if (monacoRef.current && editorRef.current) {
      monacoRef.current.editor.setTheme(darkTheme ? 'collab-dark' : 'collab-light');
    }
  }, [darkTheme]);

  const monacoLanguage = MONACO_LANG_MAP[language] || 'plaintext';

  return (
    <div className="monaco-editor-container">
      <Editor
        height="100%"
        width="100%"
        language={monacoLanguage}
        value={value}
        theme={darkTheme ? 'collab-dark' : 'collab-light'}
        onChange={(newValue) => {
          if (!isInternalChangeRef.current) {
            onChange?.(newValue || '');
          }
        }}
        onMount={handleEditorDidMount}
        options={{
          fontSize: 14,
          fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace",
          fontLigatures: true,
          lineNumbers: 'on',
          minimap: { enabled: true, scale: 1 },
          scrollBeyondLastLine: false,
          wordWrap: 'off',
          automaticLayout: true,
          tabSize: 2,
          insertSpaces: true,
          renderLineHighlight: 'line',
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          smoothScrolling: true,
          readOnly,
          // Suggestions & IntelliSense
          suggestOnTriggerCharacters: true,
          quickSuggestions: { other: true, comments: false, strings: false },
          parameterHints: { enabled: true },
          formatOnPaste: true,
          formatOnType: false,
          // Code folding
          folding: true,
          foldingHighlight: true,
          showFoldingControls: 'mouseover',
          // Appearance
          roundedSelection: true,
          padding: { top: 16, bottom: 16 },
          bracketPairColorization: { enabled: true },
          guides: { bracketPairs: true, indentation: true },
          renderWhitespace: 'selection',
          // Scrollbar
          scrollbar: {
            verticalScrollbarSize: 8,
            horizontalScrollbarSize: 8,
            useShadows: false,
          },
        }}
        loading={
          <div className="monaco-loading">
            <div className="monaco-loading-dots">
              <span /><span /><span />
            </div>
            <span>Loading editor...</span>
          </div>
        }
      />
    </div>
  );
});

MonacoEditorWrapper.displayName = 'MonacoEditorWrapper';

export default MonacoEditorWrapper;
