import { Component } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

class MDErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: false }; }
  static getDerivedStateFromError() { return { error: true }; }
  render() {
    if (this.state.error) {
      return (
        <pre style={{ fontSize:12, color:'var(--text-secondary)', whiteSpace:'pre-wrap', wordBreak:'break-word' }}>
          {this.props.raw}
        </pre>
      );
    }
    return this.props.children;
  }
}

export default function MarkdownRenderer({ content, className = '' }) {
  // Guard: always coerce to string
  const text = content == null
    ? ''
    : typeof content === 'string'
      ? content
      : JSON.stringify(content, null, 2);

  if (!text.trim()) return null;

  return (
    <MDErrorBoundary raw={text}>
      <div className={`md ${className}`}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
      </div>
    </MDErrorBoundary>
  );
}
