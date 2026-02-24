import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * Reusable component to render structured data (objects/arrays) in a pretty way.
 * Supports markdown within string values and handles common data cleaning.
 */

function capitalize(s) {
    if (!s) return '—';
    return String(s).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function cleanContent(text) {
    if (typeof text !== 'string') return text;

    let cleaned = text;
    // 1. Unescape escaped newlines if they exist as literal strings (AI often does this)
    cleaned = cleaned.replace(/\\n/g, '\n');

    // 2. Strip simple XML-like wrappers (e.g. <medical_report>...</medical_report>)
    cleaned = cleaned.replace(/<[a-zA-Z0-9_-]+>/g, '').replace(/<\/[a-zA-Z0-9_-]+>/g, '');

    return cleaned.trim();
}

function fmt(val) {
    if (val == null) return '—';
    if (typeof val === 'boolean') return val ? 'Yes' : 'No';
    if (typeof val === 'number') return val.toLocaleString();
    return String(val);
}

function statusColor(s) {
    if (!s) return 'var(--text-muted)';
    const v = String(s).toLowerCase();
    if (['good', 'improving', 'on_track', 'high', 'excellent', 'normal', 'stable', 'ready', 'success', 'done'].some((k) => v.includes(k))) return 'var(--green)';
    if (['warning', 'moderate', 'declining', 'off_track', 'concern', 'uploading'].some((k) => v.includes(k))) return 'var(--amber)';
    if (['critical', 'poor', 'severe', 'low', 'danger', 'bad', 'error', 'failed'].some((k) => v.includes(k))) return 'var(--red)';
    return 'var(--blue)';
}

function InfoRow({ label, value, color }) {
    const isString = typeof value === 'string';
    const text = isString ? cleanContent(value) : value;

    // Detect if the string contains markdown syntax
    const hasMarkdown = isString && (
        text.includes('**') ||
        text.includes('##') ||
        text.includes('\n*') ||
        text.includes('\n-') ||
        text.includes('\n\n') ||
        text.includes('###')
    );

    return (
        <div style={{
            display: 'flex',
            flexDirection: hasMarkdown ? 'column' : 'row',
            justifyContent: 'space-between',
            alignItems: hasMarkdown ? 'stretch' : 'flex-start',
            padding: '8px 0',
            borderBottom: '1px solid var(--border)',
            gap: hasMarkdown ? 4 : 12
        }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>{capitalize(label)}</span>
            <div style={{
                fontSize: 13,
                fontWeight: hasMarkdown ? 400 : 600,
                color: hasMarkdown ? 'inherit' : (color || 'var(--text-primary)'),
                textAlign: hasMarkdown ? 'left' : 'right',
                maxWidth: hasMarkdown ? '100%' : '65%',
                overflowWrap: 'break-word'
            }}>
                {hasMarkdown ? (
                    <div className="md" style={{ marginTop: 4 }}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
                    </div>
                ) : fmt(value)}
            </div>
        </div>
    );
}

function CollapsibleSection({ title, children, defaultOpen = true }) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div style={{ marginTop: 12 }}>
            <button
                onClick={() => setOpen(!open)}
                style={{
                    display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none',
                    cursor: 'pointer', padding: '4px 0', width: '100%', textAlign: 'left',
                    fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6
                }}
            >
                {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                {capitalize(title)}
            </button>
            {open && (
                <div style={{ padding: '8px 12px', background: 'rgba(14,165,233,0.03)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                    {children}
                </div>
            )}
        </div>
    );
}

export default function DataViewer({ data, depth = 0 }) {
    if (data == null) return <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '10px 0' }}>No data available</div>;

    // Primitive
    if (typeof data !== 'object') {
        return (
            <div className="md" style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.6 }}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{cleanContent(String(data))}</ReactMarkdown>
            </div>
        );
    }

    // Array
    if (Array.isArray(data)) {
        if (data.length === 0) return <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Empty list</div>;
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                {data.map((item, i) => (
                    <div key={i} style={{ padding: '10px 14px', background: 'var(--bg-surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                        <DataViewer data={item} depth={depth + 1} />
                    </div>
                ))}
            </div>
        );
    }

    // Object
    return (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
            {Object.entries(data).map(([k, v]) => {
                // Handle primitives as a simple row
                if (v == null || typeof v !== 'object') {
                    return <InfoRow key={k} label={k} value={v} color={statusColor(String(v ?? ''))} />;
                }

                // Handle nested objects/arrays as sections
                return (
                    <CollapsibleSection key={k} title={k}>
                        <DataViewer data={v} depth={depth + 1} />
                    </CollapsibleSection>
                );
            })}
        </div>
    );
}
