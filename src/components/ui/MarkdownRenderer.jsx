import { Component } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import DataViewer from './DataViewer';

// ── Helpers ────────────────────────────────────────────────────────
function cleanContent(text) {
  if (typeof text !== 'string') return text;

  let cleaned = text;
  // 1. Unescape escaped newlines if they exist as literal strings
  cleaned = cleaned.replace(/\\n/g, '\n');

  // 2. Strip simple XML-like wrappers (e.g. <medical_report>...</medical_report>)
  cleaned = cleaned.replace(/<[a-zA-Z0-9_-]+>/g, '').replace(/<\/[a-zA-Z0-9_-]+>/g, '');

  return cleaned.trim();
}

class MDErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 12, border: '1px solid var(--red)', borderRadius: 'var(--radius)', background: 'var(--bg-card)' }}>
          <div style={{ fontSize: 11, color: 'var(--red)', fontWeight: 600, marginBottom: 8 }}>
            MARKDOWN RENDER ERROR: {String(this.state.error.message || this.state.error)}
          </div>
          <pre style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'monospace', margin: 0 }}>
            {this.props.raw}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function MarkdownRenderer({ content, className = '' }) {
  // If content is an object (and not null), handle it
  if (content != null && typeof content === 'object') {
    const keys = Object.keys(content);

    // Peeling: if it's a single-key object with a standard AI wrapper key, render the string directly
    if (keys.length === 1) {
      const k = keys[0].toLowerCase();
      const val = content[keys[0]];
      if (['response', 'report', 'summary', 'message', 'analysis', 'updated_report', 'final_report', 'result', 'data'].includes(k)) {
        return <MarkdownRenderer content={val} className={className} />;
      }
    }

    return (
      <div className={`data-view ${className}`} style={{ animation: 'mdFadeIn 0.35s ease forwards' }}>
        <DataViewer data={content} />
      </div>
    );
  }

  const text = cleanContent(content);
  if (!text) return null;

  return (
    <MDErrorBoundary raw={text}>
      <div className={`md ${className}`}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
      </div>
    </MDErrorBoundary>
  );
}
