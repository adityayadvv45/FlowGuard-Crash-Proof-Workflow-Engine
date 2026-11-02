export type WorkflowStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export type StepStatus = 'PENDING' | 'RUNNING' | 'RETRY_WAIT' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export type EventType =
  | 'EXECUTION_STARTED'
  | 'STEP_STARTED'
  | 'STEP_COMPLETED'
  | 'STEP_FAILED'
  | 'RETRY_SCHEDULED'
  | 'EXECUTION_INTERRUPTED'
  | 'RECOVERY_PERFORMED'
  | 'EXECUTION_FAILED'
  | 'EXECUTION_COMPLETED'
  | 'EXECUTION_CANCELLED';

export interface StepExecution {
  id: string;
  workflowExecutionId: string;
  stepKey: string;
  stepName: string;
  stepOrder: number;
  status: StepStatus;
  attemptCount: number;
  inputJson: string | null;
  outputJson: string | null;
  errorMessage: string | null;
  nextRetryAt: string | null;
  workerLeaseOwner: string | null;
  workerLeaseUntil: string | null;
  startedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
  durationMillis: number | null;
}

export interface ExecutionResponse {
  id: string;
  workflowDefinitionId: string;
  workflowName: string;
  workflowDescription: string;
  workflowVersion: number;
  status: WorkflowStatus;
  inputJson: string | null;
  outputJson: string | null;
  idempotencyKey: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
  errorMessage: string | null;
  durationMillis: number | null;
  steps: StepExecution[];
}

export interface ExecutionEventResponse {
  id: number;
  workflowExecutionId: string;
  stepExecutionId: string | null;
  eventType: EventType;
  message: string;
  detailsJson: string | null;
  createdAt: string;
}

export interface PaginatedEventsResponse {
  content: ExecutionEventResponse[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export interface WorkflowStats {
  totalExecutions: number;
  runningExecutions: number;
  completedExecutions: number;
  failedExecutions: number;
  pendingExecutions: number;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  definitionJson: string;
  version: number;
  createdAt: string;
}

export type AnalysisStatus = 'EVALUATED' | 'INSUFFICIENT_DATA';

export interface ContributingFeature {
  featureName: string;
  observedValue: number;
  baselineMean: number;
  baselineStdDev: number;
  deviationScore: number;
  outlier: boolean;
  description: string;
}

export interface RiskAssessment {
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  retryEligibility: string;
  errorClassification: string;
  attemptsRemaining: number;
  configuredMaxAttempts: number;
  recommendedBackoffDelayMs: number;
  empiricalRecoveryRate: number | null;
  recommendation: string;
  basis: string;
}

export interface AnomalyReport {
  executionId: string;
  anomalyScore: number;
  isAnomaly: boolean;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: AnalysisStatus;
  modelType: string;
  reasonCodes: string[];
  contributingFeatures: ContributingFeature[];
  riskAssessment: RiskAssessment;
  explanation: string;
  analyzedAt: string;
}

export interface ExecutionBaseline {
  sampleSize: number;
  meanDurationMs: number;
  stdDevDurationMs: number;
  medianDurationMs: number;
  iqrDurationMs: number;
  meanRetryCount: number;
  meanOrderAmount: number;
  stdDevOrderAmount: number;
  historicalRecoveryRate: number;
  computedAt: string;
  statusNote: string;
}

export interface AnalyticsSummaryResponse {
  totalExecutionsAnalyzed: number;
  anomaliesDetected: number;
  anomalyRatePercent: number;
  averageAnomalyScore: number;
  severityBreakdown: Record<string, number>;
  reasonCodeCounts: Record<string, number>;
  baseline: ExecutionBaseline;
  engineHealth: string;
}

export interface SimulationRequest {
  amount?: number;
  attemptCount?: number;
  errorType?: string;
}

export interface SystemHealthResponse {
  status: string;
  databaseStatus: string;
  workerId: string;
  activeWorkers: number;
  workerPoolSize: number;
  workerQueueSize: number;
  workerQueueCapacity: number;
  activeLeasesCount: number;
  leaseDurationSeconds: number;
  recoveryIntervalSeconds: number;
  retryPollIntervalSeconds: number;
  uptimeMillis: number;
  heapUsedMb: number;
  heapMaxMb: number;
  timestamp: string;
}

export type TabType =
  | 'overview'
  | 'workflows'
  | 'executions'
  | 'analytics'
  | 'events'
  | 'health'
  | 'settings';

export interface ExecutionFilters {
  status?: WorkflowStatus | 'ALL';
  search?: string;
  startDate?: string;
  endDate?: string;
}

export interface EventFilters {
  eventType?: EventType | 'ALL';
  executionId?: string;
}

export interface UserAccount {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: string;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface AuthResponse {
  token: string;
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: string;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface SignUpRequest {
  username: string;
  email: string;
  password: string;
  fullName: string;
  role?: string;
}

export interface LoginRequest {
  emailOrUsername: string;
  password: string;
}

export interface UpdateAccountRequest {
  fullName?: string;
  role?: string;
  currentPassword?: string;
  newPassword?: string;
}
