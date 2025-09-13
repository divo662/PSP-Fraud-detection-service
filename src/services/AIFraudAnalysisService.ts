import axios from 'axios';
import { ENV } from '../config/environment';
import { logger } from '../utils/logger';
import { Transaction, AIFraudAnalysis } from '../types';

/**
 * AI-Powered Fraud Analysis Service using Groq API with Meta Llama
 * Provides intelligent fraud detection using advanced language models
 */
export class AIFraudAnalysisService {
  private static readonly GROQ_API_URL = ENV.GROQ_API_URL;
  private static readonly GROQ_API_KEY = ENV.GROQ_API_KEY;
  private static readonly AI_MODEL = ENV.AI_MODEL;

  /**
   * Analyze transaction for fraud using AI
   */
  static async analyzeTransaction(transaction: Transaction): Promise<AIFraudAnalysis> {
    const startTime = Date.now();
    
    try {
      if (!ENV.AI_FRAUD_ANALYSIS_ENABLED) {
        throw new Error('AI fraud analysis is disabled');
      }

      if (!ENV.GROQ_API_KEY) {
        throw new Error('Groq API key is not configured');
      }

      const prompt = this.buildFraudAnalysisPrompt(transaction);
      
      const response = await axios.post(
        this.GROQ_API_URL,
        {
          model: this.AI_MODEL,
          messages: [
            {
              role: 'system',
              content: 'You are an expert fraud detection analyst specializing in payment security and financial crime prevention. Analyze transactions for potential fraud patterns and provide detailed risk assessments.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.1, // Low temperature for consistent analysis
          max_tokens: 1000,
          top_p: 0.9
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.GROQ_API_KEY}`
          },
          timeout: 10000 // 10 second timeout
        }
      );

      const aiResponse = response.data.choices[0]?.message?.content;
      if (!aiResponse) {
        throw new Error('No response from AI model');
      }

      const analysis = this.parseAIResponse(aiResponse, transaction);
      analysis.analysisTime = Date.now() - startTime;
      analysis.aiModel = this.AI_MODEL;

      logger.info('AI fraud analysis completed', {
        transactionId: transaction._id,
        confidence: analysis.confidence,
        isFraudulent: analysis.isFraudulent,
        analysisTime: analysis.analysisTime
      });

      return analysis;

    } catch (error) {
      logger.error('AI fraud analysis failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        transactionId: transaction._id
      });

      // Return fallback analysis
      return {
        isFraudulent: false,
        confidence: 0.0,
        reasoning: 'AI analysis failed - using fallback assessment',
        riskFactors: ['AI analysis unavailable'],
        recommendations: ['Manual review recommended due to AI analysis failure'],
        aiModel: this.AI_MODEL,
        analysisTime: Date.now() - startTime
      };
    }
  }

  /**
   * Build comprehensive prompt for fraud analysis
   */
  private static buildFraudAnalysisPrompt(transaction: Transaction): string {
    const transactionTime = new Date(transaction.createdAt);
    const hour = transactionTime.getHours();
    const dayOfWeek = transactionTime.toLocaleDateString('en-US', { weekday: 'long' });
    
    return `
Analyze this payment transaction for potential fraud:

TRANSACTION DETAILS:
- Amount: ${transaction.amount.toLocaleString()} ${transaction.currency || 'NGN'}
- Customer Email: ${transaction.customerEmail}
- Merchant ID: ${transaction.merchantId}
- Payment Method: ${transaction.paymentMethod || 'card'}
- Transaction Time: ${transactionTime.toISOString()} (${dayOfWeek}, ${hour}:00)
- IP Address: ${transaction.ipAddress || 'Unknown'}
- New Customer: ${transaction.isNewCustomer ? 'Yes' : 'No'}
- Description: ${transaction.description || 'N/A'}

FRAUD ANALYSIS REQUIREMENTS:
1. Assess the transaction for common fraud patterns
2. Consider amount, timing, customer behavior, and payment method
3. Evaluate risk factors and provide confidence score (0.0-1.0)
4. Identify specific risk factors
5. Provide actionable recommendations

RESPONSE FORMAT (JSON):
{
  "isFraudulent": boolean,
  "confidence": number (0.0-1.0),
  "reasoning": "detailed explanation",
  "riskFactors": ["factor1", "factor2"],
  "recommendations": ["recommendation1", "recommendation2"]
}

Consider these fraud patterns:
- Unusual transaction amounts
- Suspicious timing (late night, weekends)
- New customer high-value transactions
- Geographic anomalies
- Payment method inconsistencies
- Velocity patterns
- Merchant-specific patterns
- Behavioral anomalies

Provide a thorough analysis focusing on the most relevant risk factors for this specific transaction.
`;
  }

  /**
   * Parse AI response and extract structured data
   */
  private static parseAIResponse(aiResponse: string, transaction: Transaction): AIFraudAnalysis {
    try {
      // Try to extract JSON from the response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonStr = jsonMatch[0];
        const parsed = JSON.parse(jsonStr);
        
        return {
          isFraudulent: Boolean(parsed.isFraudulent),
          confidence: Math.max(0, Math.min(1, Number(parsed.confidence) || 0)),
          reasoning: String(parsed.reasoning || 'AI analysis completed'),
          riskFactors: Array.isArray(parsed.riskFactors) ? parsed.riskFactors : [],
          recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
          aiModel: this.AI_MODEL,
          analysisTime: 0 // Will be set by caller
        };
      }
    } catch (error) {
      logger.warn('Failed to parse AI response as JSON', { error: error instanceof Error ? error.message : 'Unknown error' });
    }

    // Fallback parsing if JSON extraction fails
    return this.parseTextResponse(aiResponse, transaction);
  }

  /**
   * Parse text response when JSON parsing fails
   */
  private static parseTextResponse(aiResponse: string, transaction: Transaction): AIFraudAnalysis {
    const lowerResponse = aiResponse.toLowerCase();
    
    // Extract confidence score
    const confidenceMatch = lowerResponse.match(/(?:confidence|risk):?\s*(\d+(?:\.\d+)?)/);
    const confidence = confidenceMatch ? Math.max(0, Math.min(1, Number(confidenceMatch[1]))) : 0.5;
    
    // Determine if fraudulent
    const fraudIndicators = ['fraud', 'suspicious', 'high risk', 'block', 'reject'];
    const isFraudulent = fraudIndicators.some(indicator => lowerResponse.includes(indicator));
    
    // Extract risk factors
    const riskFactors: string[] = [];
    const riskPatterns = [
      'unusual amount', 'high amount', 'suspicious timing', 'new customer',
      'geographic anomaly', 'velocity', 'payment method', 'behavioral'
    ];
    
    riskPatterns.forEach(pattern => {
      if (lowerResponse.includes(pattern)) {
        riskFactors.push(pattern.replace(' ', ' '));
      }
    });
    
    // Extract recommendations
    const recommendations: string[] = [];
    const recPatterns = [
      'manual review', 'additional verification', 'monitor', 'block', 'flag',
      'investigate', 'contact customer', 'enhanced security'
    ];
    
    recPatterns.forEach(pattern => {
      if (lowerResponse.includes(pattern)) {
        recommendations.push(pattern.replace(' ', ' '));
      }
    });

    return {
      isFraudulent,
      confidence,
      reasoning: aiResponse.substring(0, 500), // Truncate for storage
      riskFactors: riskFactors.length > 0 ? riskFactors : ['AI analysis completed'],
      recommendations: recommendations.length > 0 ? recommendations : ['Review transaction manually'],
      aiModel: this.AI_MODEL,
      analysisTime: 0 // Will be set by caller
    };
  }

  /**
   * Batch analyze multiple transactions
   */
  static async batchAnalyze(transactions: Transaction[]): Promise<AIFraudAnalysis[]> {
    const results: AIFraudAnalysis[] = [];
    
    // Process transactions in parallel (with rate limiting)
    const batchSize = 5; // Process 5 at a time to avoid rate limits
    for (let i = 0; i < transactions.length; i += batchSize) {
      const batch = transactions.slice(i, i + batchSize);
      const batchPromises = batch.map(transaction => this.analyzeTransaction(transaction));
      
      try {
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        
        // Add delay between batches to respect rate limits
        if (i + batchSize < transactions.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        logger.error('Batch analysis failed', { 
          error: error instanceof Error ? error.message : 'Unknown error',
          batchStart: i,
          batchSize: batch.length
        });
        
        // Add fallback results for failed batch
        batch.forEach(() => {
          results.push({
            isFraudulent: false,
            confidence: 0.0,
            reasoning: 'Batch analysis failed',
            riskFactors: ['Analysis unavailable'],
            recommendations: ['Manual review required'],
            aiModel: this.AI_MODEL,
            analysisTime: 0
          });
        });
      }
    }
    
    return results;
  }

  /**
   * Get AI model status and capabilities
   */
  static async getModelStatus(): Promise<{
    available: boolean;
    model: string;
    apiKeyConfigured: boolean;
    lastChecked: Date;
  }> {
    try {
      if (!ENV.GROQ_API_KEY) {
        return {
          available: false,
          model: this.AI_MODEL,
          apiKeyConfigured: false,
          lastChecked: new Date()
        };
      }

      // Test API connectivity
      const response = await axios.post(
        this.GROQ_API_URL,
        {
          model: this.AI_MODEL,
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 1
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.GROQ_API_KEY}`
          },
          timeout: 5000
        }
      );

      return {
        available: response.status === 200,
        model: this.AI_MODEL,
        apiKeyConfigured: true,
        lastChecked: new Date()
      };
    } catch (error) {
      logger.error('AI model status check failed', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      
      return {
        available: false,
        model: this.AI_MODEL,
        apiKeyConfigured: !!ENV.GROQ_API_KEY,
        lastChecked: new Date()
      };
    }
  }
}
