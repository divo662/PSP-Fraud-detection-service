import dotenv from 'dotenv';
import { EnvironmentConfig } from '../types';

// Load environment variables
dotenv.config();

export const ENV: EnvironmentConfig = {
  FRAUD_FLAG_THRESHOLD: parseInt(process.env.FRAUD_FLAG_THRESHOLD || '30', 10),
  FRAUD_REVIEW_THRESHOLD: parseInt(process.env.FRAUD_REVIEW_THRESHOLD || '50', 10),
  FRAUD_BLOCK_THRESHOLD: parseInt(process.env.FRAUD_BLOCK_THRESHOLD || '80', 10),
  VELOCITY_WINDOW_MS: parseInt(process.env.VELOCITY_WINDOW_MS || '3600000', 10), // 1 hour
  VELOCITY_MAX_ATTEMPTS: parseInt(process.env.VELOCITY_MAX_ATTEMPTS || '5', 10),
  AMOUNT_ANOMALY_WINDOW_MS: parseInt(process.env.AMOUNT_ANOMALY_WINDOW_MS || '86400000', 10), // 24 hours
  AMOUNT_ANOMALY_MULTIPLIER: parseInt(process.env.AMOUNT_ANOMALY_MULTIPLIER || '3', 10),
  GEO_ANOMALY_WINDOW_MS: parseInt(process.env.GEO_ANOMALY_WINDOW_MS || '86400000', 10), // 24 hours
  GEO_ANOMALY_MAX_LOCATIONS: parseInt(process.env.GEO_ANOMALY_MAX_LOCATIONS || '2', 10),
  // AI Configuration
  GROQ_API_KEY: process.env.GROQ_API_KEY || '',
  GROQ_API_URL: process.env.GROQ_API_URL || 'https://api.groq.com/openai/v1/chat/completions',
  AI_MODEL: process.env.AI_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct',
  AI_FRAUD_ANALYSIS_ENABLED: process.env.AI_FRAUD_ANALYSIS_ENABLED === 'true',
  AI_CONFIDENCE_THRESHOLD: parseFloat(process.env.AI_CONFIDENCE_THRESHOLD || '0.7'),
};
