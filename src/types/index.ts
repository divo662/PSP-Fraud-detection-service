export interface FraudRiskScore {
  score: number; // 0-100, higher = more risky
  level: 'low' | 'medium' | 'high' | 'critical';
  factors: string[];
  recommendations: string[];
}

export interface FraudRule {
  id: string;
  name: string;
  description: string;
  weight: number;
  enabled: boolean;
  condition: (transaction: any) => boolean;
}

export interface FraudDetectionResult {
  isFraudulent: boolean;
  riskScore: FraudRiskScore;
  flagged: boolean;
  reason?: string;
  action: 'allow' | 'block' | 'review' | 'flag';
}

export interface TransactionRisk {
  transactionId: string;
  riskScore: number;
  riskLevel: string;
  factors: string[];
  timestamp: Date;
}

export interface Transaction {
  _id?: string | unknown;
  amount: number;
  customerEmail: string;
  merchantId: string;
  ipAddress?: string;
  createdAt: Date;
  status: 'pending' | 'success' | 'failed' | 'blocked';
  isNewCustomer?: boolean;
  currency?: string;
  paymentMethod?: string;
  description?: string;
}

export interface FraudStatistics {
  totalTransactions: number;
  flaggedTransactions: number;
  blockedTransactions: number;
  fraudRate: number;
  averageRiskScore: number;
  topRiskFactors: Array<{ factor: string; count: number }>;
}

export interface EnvironmentConfig {
  FRAUD_FLAG_THRESHOLD: number;
  FRAUD_REVIEW_THRESHOLD: number;
  FRAUD_BLOCK_THRESHOLD: number;
  VELOCITY_WINDOW_MS: number;
  VELOCITY_MAX_ATTEMPTS: number;
  AMOUNT_ANOMALY_WINDOW_MS: number;
  AMOUNT_ANOMALY_MULTIPLIER: number;
  GEO_ANOMALY_WINDOW_MS: number;
  GEO_ANOMALY_MAX_LOCATIONS: number;
  // AI Configuration
  GROQ_API_KEY: string;
  GROQ_API_URL: string;
  AI_MODEL: string;
  AI_FRAUD_ANALYSIS_ENABLED: boolean;
  AI_CONFIDENCE_THRESHOLD: number;
}

export interface AIFraudAnalysis {
  isFraudulent: boolean;
  confidence: number;
  reasoning: string;
  riskFactors: string[];
  recommendations: string[];
  aiModel: string;
  analysisTime: number;
}

export interface EnhancedFraudDetectionResult extends FraudDetectionResult {
  aiAnalysis?: AIFraudAnalysis;
  combinedRiskScore: number;
  aiEnhanced: boolean;
}
