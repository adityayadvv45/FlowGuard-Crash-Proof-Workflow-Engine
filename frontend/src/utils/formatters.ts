export function formatDuration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || isNaN(ms)) return '—';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  const mins = Math.floor(ms / 60000);
  const secs = ((ms % 60000) / 1000).toFixed(1);
  return `${mins}m ${secs}s`;
}

export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  } catch {
    return dateStr;
  }
}

export function formatRelativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diffSec < 5) return 'just now';
    if (diffSec < 60) return `${diffSec}s ago`;
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return `${Math.floor(diffSec / 86400)}d ago`;
  } catch {
    return dateStr;
  }
}

export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function truncateId(id: string | null | undefined, head = 8, tail = 4): string {
  if (!id) return '—';
  if (id.length <= head + tail + 3) return id;
  return `${id.slice(0, head)}…${id.slice(-tail)}`;
}

export function getStatusStyle(status: string) {
  switch (status?.toUpperCase()) {
    case 'COMPLETED':
      return {
        bg: 'rgba(16, 185, 129, 0.10)',
        border: 'rgba(16, 185, 129, 0.3)',
        text: '#10b981',
        dot: '#10b981',
        label: 'Completed',
      };
    case 'RUNNING':
      return {
        bg: 'rgba(59, 130, 246, 0.12)',
        border: 'rgba(59, 130, 246, 0.35)',
        text: '#38bdf8',
        dot: '#38bdf8',
        label: 'Running',
      };
    case 'RETRY_WAIT':
      return {
        bg: 'rgba(245, 158, 11, 0.12)',
        border: 'rgba(245, 158, 11, 0.35)',
        text: '#fbbf24',
        dot: '#fbbf24',
        label: 'Retry Wait',
      };
    case 'FAILED':
      return {
        bg: 'rgba(239, 68, 68, 0.12)',
        border: 'rgba(239, 68, 68, 0.35)',
        text: '#f87171',
        dot: '#ef4444',
        label: 'Failed',
      };
    case 'CANCELLED':
      return {
        bg: 'rgba(148, 163, 184, 0.10)',
        border: 'rgba(148, 163, 184, 0.25)',
        text: '#94a3b8',
        dot: '#64748b',
        label: 'Cancelled',
      };
    case 'PENDING':
    default:
      return {
        bg: 'rgba(100, 116, 139, 0.10)',
        border: 'rgba(100, 116, 139, 0.25)',
        text: '#94a3b8',
        dot: '#64748b',
        label: status || 'Pending',
      };
  }
}

export function getSeverityStyle(severity: string) {
  switch (severity?.toUpperCase()) {
    case 'CRITICAL':
      return { bg: 'rgba(239, 68, 68, 0.15)', text: '#f87171', border: '#ef4444' };
    case 'HIGH':
      return { bg: 'rgba(249, 115, 22, 0.15)', text: '#fb923c', border: '#f97316' };
    case 'MEDIUM':
      return { bg: 'rgba(234, 179, 8, 0.15)', text: '#fde047', border: '#eab308' };
    case 'LOW':
    default:
      return { bg: 'rgba(16, 185, 129, 0.15)', text: '#34d399', border: '#10b981' };
  }
}
