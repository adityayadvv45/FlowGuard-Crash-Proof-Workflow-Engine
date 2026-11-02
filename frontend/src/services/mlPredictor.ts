/**
 * FlowGuard Execution Analytics & Statistical Anomaly Detection Service (Frontend Client)
 *
 * NOTE: The previous client-side heuristic formula has been replaced by the backend
 * statistical analysis service at `/api/analytics/*`.
 *
 * This file maintains TypeScript interface compatibility with dashboard views
 * and delegates execution analysis to the Spring Boot backend.
 */

import { AnomalyReport } from '../types';
import * as api from './api';

export interface MLPrediction {
  anomalyScore: number; // 0.00 to 1.00
  isAnomaly: boolean;
  predictedSuccessRate?: number; // Optional legacy display
  empiricalRecoveryRate?: number | null;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  smartBackoffRecommendationMs: number;
  explanation: string;
  modelType?: string;
  status?: string;
  retryEligibility?: string;
  errorClassification?: string;
  attemptsRemaining?: number;
  basis?: string;
}

/**
 * Maps a backend AnomalyReport to the dashboard MLPrediction view model.
 */
export function mapReportToPrediction(report: AnomalyReport): MLPrediction {
  return {
    anomalyScore: report.anomalyScore,
    isAnomaly: report.isAnomaly,
    predictedSuccessRate: report.riskAssessment.empiricalRecoveryRate != null ? report.riskAssessment.empiricalRecoveryRate : undefined,
    empiricalRecoveryRate: report.riskAssessment.empiricalRecoveryRate,
    riskLevel: report.severity as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    smartBackoffRecommendationMs: report.riskAssessment.recommendedBackoffDelayMs,
    explanation: report.explanation,
    modelType: report.modelType,
    status: report.status,
    retryEligibility: report.riskAssessment.retryEligibility,
    errorClassification: report.riskAssessment.errorClassification,
    attemptsRemaining: report.riskAssessment.attemptsRemaining,
    basis: report.riskAssessment.basis,
  };
}

/**
 * Calls the backend /api/analytics/simulate endpoint to evaluate arbitrary parameters
 * using the real database-derived statistical baseline.
 */
export async function evaluateWorkflowMLBackend(
  amount: number,
  stepAttempts: Record<string, number>,
  errorType?: string | null
): Promise<MLPrediction> {
  const attempts = Object.values(stepAttempts).reduce((acc, v) => acc + v, 0);
  const report = await api.simulateAnalytics({
    amount,
    attemptCount: attempts,
    errorType: errorType || undefined,
  });
  return mapReportToPrediction(report);
}

/**
 * @deprecated Legacy offline fallback. Real analysis is performed by backend AnomalyDetectionService.
 */
export function evaluateWorkflowML(
  amount: number,
  stepAttempts: Record<string, number>,
  errorType?: string | null
): MLPrediction {
  const totalAttempts = Object.values(stepAttempts).reduce((acc, v) => acc + v, 0);
  return {
    anomalyScore: 0.05,
    isAnomaly: false,
    empiricalRecoveryRate: null,
    riskLevel: 'LOW',
    smartBackoffRecommendationMs: Math.min(30000, Math.round(2000 * Math.pow(2.0, Math.max(0, totalAttempts - 1)))),
    explanation: 'Initial offline state awaiting backend statistical baseline synchronization.',
    modelType: 'STATISTICAL_DISTRIBUTION_ANALYSIS',
    status: 'INSUFFICIENT_DATA',
    retryEligibility: 'ELIGIBLE_FOR_RETRY',
    errorClassification: errorType || 'NONE',
    attemptsRemaining: Math.max(0, 3 - totalAttempts),
    basis: 'Preliminary offline fallback; live analytics served by backend.',
  };
}
