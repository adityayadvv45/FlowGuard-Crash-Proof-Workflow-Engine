import {
  ExecutionEventResponse,
  ExecutionResponse,
  WorkflowDefinition,
  WorkflowStats,
  AnomalyReport,
  AnalyticsSummaryResponse,
  SimulationRequest,
  SystemHealthResponse,
  PaginatedEventsResponse,
  ExecutionFilters,
} from '../types';

const BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || '/api';

export async function fetchStats(): Promise<WorkflowStats> {
  const res = await fetch(`${BASE_URL}/executions/stats`);
  if (!res.ok) throw new Error('Failed to fetch execution stats');
  return res.json();
}

export async function fetchWorkflows(): Promise<WorkflowDefinition[]> {
  const res = await fetch(`${BASE_URL}/workflows`);
  if (!res.ok) throw new Error('Failed to fetch workflows');
  return res.json();
}

export async function fetchExecutions(
  page = 0,
  size = 20,
  filters?: ExecutionFilters
): Promise<{ content: ExecutionResponse[]; totalElements: number; totalPages: number }> {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('size', String(size));

  if (filters?.status && filters.status !== 'ALL') {
    params.set('status', filters.status);
  }
  if (filters?.search && filters.search.trim()) {
    params.set('search', filters.search.trim());
  }
  if (filters?.startDate) {
    params.set('startDate', filters.startDate);
  }
  if (filters?.endDate) {
    params.set('endDate', filters.endDate);
  }

  const res = await fetch(`${BASE_URL}/executions?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch executions');
  return res.json();
}

export async function fetchExecution(id: string): Promise<ExecutionResponse> {
  const res = await fetch(`${BASE_URL}/executions/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch execution: ${id}`);
  return res.json();
}

export async function fetchEvents(executionId: string): Promise<ExecutionEventResponse[]> {
  const res = await fetch(`${BASE_URL}/executions/${executionId}/events`);
  if (!res.ok) throw new Error(`Failed to fetch events for execution: ${executionId}`);
  return res.json();
}

export async function fetchGlobalEvents(
  page = 0,
  size = 20,
  eventType?: string,
  executionId?: string
): Promise<PaginatedEventsResponse> {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('size', String(size));
  if (eventType && eventType !== 'ALL') {
    params.set('eventType', eventType);
  }
  if (executionId && executionId.trim()) {
    params.set('workflowExecutionId', executionId.trim());
  }

  const res = await fetch(`${BASE_URL}/events?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch event audit history');
  return res.json();
}

export async function fetchSystemHealth(): Promise<SystemHealthResponse> {
  const res = await fetch(`${BASE_URL}/system/health`);
  if (!res.ok) throw new Error('Failed to fetch system health status');
  return res.json();
}

export async function startExecution(
  workflowId: string,
  payload: {
    inputData: Record<string, unknown>;
    idempotencyKey?: string;
    failAtStepKey?: string;
    failureMode?: 'CRASH' | 'TRANSIENT' | 'PERMANENT';
  }
): Promise<ExecutionResponse> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (payload.idempotencyKey) {
    headers['Idempotency-Key'] = payload.idempotencyKey;
  }

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/workflows/${workflowId}/executions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
  } catch (err: unknown) {
    throw new Error('Cannot connect to backend on port 8080. Please ensure the backend is running on http://localhost:8080');
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    if (res.status === 500 && !errorData.message) {
      throw new Error('Internal Server Error. Please verify database connectivity.');
    }
    throw new Error(errorData.message || `Failed to start execution (${res.status})`);
  }
  return res.json();
}

export async function retryExecution(id: string): Promise<ExecutionResponse> {
  const res = await fetch(`${BASE_URL}/executions/${id}/retry`, { method: 'POST' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to retry execution');
  }
  return res.json();
}

export async function cancelExecution(id: string): Promise<ExecutionResponse> {
  const res = await fetch(`${BASE_URL}/executions/${id}/cancel`, { method: 'POST' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to cancel execution');
  }
  return res.json();
}

export async function deleteExecution(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/executions/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to delete execution');
  }
}

export async function fetchExecutionAnomaly(executionId: string): Promise<AnomalyReport> {
  const res = await fetch(`${BASE_URL}/analytics/executions/${executionId}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Failed to fetch anomaly report for ${executionId}`);
  }
  return res.json();
}

export async function fetchRecentAnomalies(limit = 20): Promise<AnomalyReport[]> {
  const res = await fetch(`${BASE_URL}/analytics/recent?limit=${limit}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to fetch recent anomalies');
  }
  return res.json();
}

export async function fetchAnalyticsSummary(): Promise<AnalyticsSummaryResponse> {
  const res = await fetch(`${BASE_URL}/analytics/summary`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to fetch analytics summary');
  }
  return res.json();
}

export async function simulateAnalytics(payload: SimulationRequest): Promise<AnomalyReport> {
  const res = await fetch(`${BASE_URL}/analytics/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to run analytics simulation');
  }
  return res.json();
}
