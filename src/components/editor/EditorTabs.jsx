import { useRef } from 'react';
import { X, Circle } from 'lucide-react';

/**
 * File extension → icon color mapping
 */
const FILE_ICON_COLORS = {
  js: '#f7df1e', jsx: '#61dafb', ts: '#3178c6', tsx: '#61dafb',
  py: '#3572a5', java: '#b07219', cpp: '#f34b7d', c: '#555555',
  go: '#00add8', rs: '#dea584', html: '#e34c26', css: '#563d7c',
  json: '#292929', md: '#083fa1', txt: '#94a3b8',
};

const getExtension = (name = '') => name.split('.').pop()?.toLowerCase() || '';
const getFileColor = (name) => FILE_ICON_COLORS[getExtension(name)] || '#94a3b8';

/**
 * EditorTabs — multi-tab file manager bar for the collaborative code editor.
 *
 * Props:
 * - openTabs: Array<{ _id, name, isDirty? }> — list of open tab objects
 * - activeTabId: string — currently active tab file ID
 * - onSelectTab: (fileId) => void
 * - onCloseTab: (fileId) => void
 */
const EditorTabs = ({ openTabs = [], activeTabId, onSelectTab, onCloseTab }) => {
  const scrollRef = useRef(null);

  if (openTabs.length === 0) {
    return (
      <div className="editor-tabs-bar editor-tabs-empty">
        <span>Open a file from the explorer to start editing</span>
      </div>
    );
  }

  return (
    <div className="editor-tabs-bar" ref={scrollRef}>
      {openTabs.map((tab) => {
        const isActive = tab._id === activeTabId;
        const ext = getExtension(tab.name);
        const color = getFileColor(tab.name);

        return (
          <div
            key={tab._id}
            className={`editor-tab ${isActive ? 'active' : ''}`}
            onClick={() => onSelectTab(tab._id)}
            title={tab.name}
          >
            {/* File color dot */}
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: color,
                flexShrink: 0,
                opacity: 0.85,
              }}
            />

            {/* File name */}
            <span className="editor-tab-name">{tab.name}</span>

            {/* Dirty indicator or close button */}
            <button
              className="editor-tab-close"
              onClick={(e) => {
                e.stopPropagation();
                onCloseTab(tab._id);
              }}
              title={tab.isDirty ? 'Unsaved changes — click to close anyway' : 'Close tab'}
            >
              {tab.isDirty ? (
                <Circle size={8} fill="currentColor" style={{ color: '#f59e0b' }} />
              ) : (
                <X size={12} />
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default EditorTabs;
