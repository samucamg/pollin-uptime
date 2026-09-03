export interface CascadeAttempt {
  model: string;
  step: number;
  durationMs: number;
  success: boolean;
  error?: string;
  statusCode?: number;
}

export interface CascadeReport {
  selectedModel: string;
  finalModel: string;
  attempts: CascadeAttempt[];
  totalLatencyMs: number;
  usedFallback: boolean;
}
