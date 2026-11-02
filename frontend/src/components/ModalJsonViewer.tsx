import React from 'react';
import { X, Copy, Check } from 'lucide-react';

interface ModalJsonViewerProps {
  title: string;
  jsonString: string | null;
  onClose: () => void;
}

export const ModalJsonViewer: React.FC<ModalJsonViewerProps> = ({ title, jsonString, onClose }) => {
  const [copied, setCopied] = React.useState(false);

  let formatted = 'null';
  if (jsonString) {
    try {
      formatted = JSON.stringify(JSON.parse(jsonString), null, 2);
    } catch {
      formatted = jsonString;
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(formatted);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ fontSize: '15px', fontWeight: 700 }}>{title}</h3>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              className="btn btn-secondary"
              style={{ padding: '6px 12px', fontSize: '12px' }}
              onClick={handleCopy}
            >
              {copied ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>
        <pre className="modal-body">{formatted}</pre>
      </div>
    </div>
  );
};
