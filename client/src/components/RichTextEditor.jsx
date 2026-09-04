import { useRef, useEffect } from 'react';

export default function RichTextEditor({ value, onChange, placeholder = 'Describe your rental property in detail...' }) {
  const editorRef = useRef(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== (value || '')) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  const execCmd = (command, value = null) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  return (
    <div
      style={{
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '12px',
        overflow: 'hidden',
        background: 'rgba(15, 23, 42, 0.6)',
      }}
    >
      {/* Rich Text Toolbar */}
      <div
        style={{
          padding: '0.5rem 0.75rem',
          background: 'rgba(255, 255, 255, 0.05)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.4rem',
          alignItems: 'center',
        }}
      >
        <button
          type="button"
          className="btn"
          style={{ padding: '0.25rem 0.6rem', fontSize: '0.85rem', background: 'rgba(255, 255, 255, 0.08)' }}
          onClick={() => execCmd('bold')}
          title="Bold (Ctrl+B)"
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          className="btn"
          style={{ padding: '0.25rem 0.6rem', fontSize: '0.85rem', background: 'rgba(255, 255, 255, 0.08)' }}
          onClick={() => execCmd('italic')}
          title="Italic (Ctrl+I)"
        >
          <em>I</em>
        </button>
        <button
          type="button"
          className="btn"
          style={{ padding: '0.25rem 0.6rem', fontSize: '0.85rem', background: 'rgba(255, 255, 255, 0.08)' }}
          onClick={() => execCmd('underline')}
          title="Underline (Ctrl+U)"
        >
          <u>U</u>
        </button>
        <span style={{ borderLeft: '1px solid rgba(255,255,255,0.15)', height: '18px', margin: '0 0.2rem' }} />

        <button
          type="button"
          className="btn"
          style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem', background: 'rgba(255, 255, 255, 0.08)' }}
          onClick={() => execCmd('insertUnorderedList')}
          title="Bullet List"
        >
          • List
        </button>
        <button
          type="button"
          className="btn"
          style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem', background: 'rgba(255, 255, 255, 0.08)' }}
          onClick={() => execCmd('insertOrderedList')}
          title="Numbered List"
        >
          1. List
        </button>
        <span style={{ borderLeft: '1px solid rgba(255,255,255,0.15)', height: '18px', margin: '0 0.2rem' }} />

        <button
          type="button"
          className="btn"
          style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem', background: 'rgba(255, 255, 255, 0.08)' }}
          onClick={() => execCmd('formatBlock', '<h3>')}
          title="Heading 3"
        >
          H3
        </button>
        <button
          type="button"
          className="btn"
          style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem', background: 'rgba(255, 255, 255, 0.08)' }}
          onClick={() => execCmd('formatBlock', '<blockquote>')}
          title="Quote"
        >
          " Quote
        </button>
        <button
          type="button"
          className="btn"
          style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem', background: 'rgba(255, 255, 255, 0.08)' }}
          onClick={() => execCmd('removeFormat')}
          title="Clear Formatting"
        >
          🧹 Clear
        </button>
      </div>

      {/* Content Editable Body */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        style={{
          minHeight: '120px',
          maxHeight: '260px',
          overflowY: 'auto',
          padding: '0.85rem 1rem',
          color: '#f8fafc',
          fontSize: '0.9rem',
          lineHeight: '1.6',
          outline: 'none',
        }}
        data-placeholder={placeholder}
      />
    </div>
  );
}
