import { connectDatabase, disconnectDatabase } from './database/connection';
import { FraudDetectionService } from './services/FraudDetectionService';
import { AIFraudAnalysisService } from './services/AIFraudAnalysisService';
import { Transaction } from './types';
import { logger } from './utils/logger';

/**
 * Demo application showcasing the Fraud Detection Service
 */
async function runDemo() {
  try {
    // Connect to database
    await connectDatabase();
    
    logger.info(' Fraud Detection Service Demo Starting...');
    
    // Check AI model status
    console.log('\n AI Model Status Check...');
    const aiStatus = await FraudDetectionService.getAIStatus();
    console.log(`   AI Model: ${aiStatus.model}`);
    console.log(`   Available: ${aiStatus.available ? 'Yes' : 'No'}`);
    console.log(`   API Key: ${aiStatus.apiKeyConfigured ? 'Configured' : 'Missing'}`);
    
    // Sample transactions for testing
    const sampleTransactions: Transaction[] = [
      {
        amount: 50000,
        customerEmail: 'john.doe@example.com',
        merchantId: 'merchant_001',
        ipAddress: '192.168.1.100',
        createdAt: new Date(),
        status: 'pending',
        isNewCustomer: false,
        currency: 'NGN',
        paymentMethod: 'card',
        description: 'Regular purchase'
      },
      {
        amount: 1500000, // High amount
        customerEmail: 'jane.smith@example.com',
        merchantId: 'merchant_001',
        ipAddress: '192.168.1.101',
        createdAt: new Date(),
        status: 'pending',
        isNewCustomer: true, // New customer with high amount
        currency: 'NGN',
        paymentMethod: 'card',
        description: 'Large purchase'
      },
      {
        amount: 25000,
        customerEmail: 'bob.wilson@example.com',
        merchantId: 'merchant_002',
        ipAddress: '192.168.1.102',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago (unusual time)
        status: 'pending',
        isNewCustomer: false,
        currency: 'NGN',
        paymentMethod: 'bank_transfer',
        description: 'Late night purchase'
      },
      {
        amount: 100000,
        customerEmail: 'alice.brown@example.com',
        merchantId: 'merchant_001',
        ipAddress: '192.168.1.103',
        createdAt: new Date(),
        status: 'pending',
        isNewCustomer: false,
        currency: 'NGN',
        paymentMethod: 'wallet',
        description: 'Normal purchase'
      }
    ];

    console.log('\n🔍 Analyzing Sample Transactions...\n');
    console.log('=' .repeat(80));

    // Analyze each transaction
    for (let i = 0; i < sampleTransactions.length; i++) {
      const transaction = sampleTransactions[i];
      console.log(`Transaction ${i + 1}:`);
      console.log(`   Amount: ₦${transaction.amount.toLocaleString()}`);
      console.log(`   Customer: ${transaction.customerEmail}`);
      console.log(`   Merchant: ${transaction.merchantId}`);
      console.log(`   New Customer: ${transaction.isNewCustomer ? 'Yes' : 'No'}`);
      console.log(`   Time: ${transaction.createdAt.toLocaleString()}`);
      
      try {
        // Use AI-enhanced analysis if available
        const result = await FraudDetectionService.analyzeTransactionWithAI(transaction);
        
        console.log(`\n Enhanced Fraud Analysis Result:`);
        console.log(`   Traditional Score: ${result.riskScore.score}/100`);
        console.log(`   Combined Score: ${result.combinedRiskScore}/100`);
        console.log(`   Risk Level: ${result.riskScore.level.toUpperCase()}`);
        console.log(`   Action: ${result.action.toUpperCase()}`);
        console.log(`   Flagged: ${result.flagged ? 'Yes' : 'No'}`);
        console.log(`   Fraudulent: ${result.isFraudulent ? 'Yes' : 'No'}`);
        console.log(`   AI Enhanced: ${result.aiEnhanced ? '✅ Yes' : '❌ No'}`);
        
        if (result.reason) {
          console.log(`   Reason: ${result.reason}`);
        }
        
        if (result.riskScore.factors.length > 0) {
          console.log(`   Risk Factors: ${result.riskScore.factors.join(', ')}`);
        }
        
        if (result.riskScore.recommendations.length > 0) {
          console.log(`   Recommendations:`);
          result.riskScore.recommendations.forEach(rec => {
            console.log(`     • ${rec}`);
          });
        }
        
        // Show AI analysis details if available
        if (result.aiAnalysis) {
          console.log(`\n AI Analysis Details:`);
          console.log(`   AI Confidence: ${(result.aiAnalysis.confidence * 100).toFixed(1)}%`);
          console.log(`   AI Fraudulent: ${result.aiAnalysis.isFraudulent ? 'Yes' : 'No'}`);
          console.log(`   AI Reasoning: ${result.aiAnalysis.reasoning.substring(0, 200)}...`);
          console.log(`   Analysis Time: ${result.aiAnalysis.analysisTime}ms`);
        }
        
      } catch (error) {
        console.log(` Error analyzing transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      
      console.log('\n' + '-'.repeat(80));
    }

    // Demonstrate fraud statistics
    console.log('\nFraud Statistics Demo...\n');
    
    try {
      const stats = await FraudDetectionService.getFraudStatistics('merchant_001');
      console.log('Merchant Statistics:');
      console.log(`   Total Transactions: ${stats.totalTransactions}`);
      console.log(`   Flagged Transactions: ${stats.flaggedTransactions}`);
      console.log(`   Blocked Transactions: ${stats.blockedTransactions}`);
      console.log(`   Fraud Rate: ${stats.fraudRate.toFixed(2)}%`);
      console.log(`   Average Risk Score: ${stats.averageRiskScore.toFixed(2)}`);
      
      if (stats.topRiskFactors.length > 0) {
        console.log('   Top Risk Factors:');
        stats.topRiskFactors.forEach((factor, index) => {
          console.log(`     ${index + 1}. ${factor.factor} (${factor.count} occurrences)`);
        });
      }
    } catch (error) {
      console.log(` Error getting statistics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Demonstrate fraud rule management
    console.log('\nFraud Rule Management Demo...\n');
    
    const rules = FraudDetectionService.getFraudRules();
    console.log(`Active Fraud Rules (${rules.length}):`);
    rules.forEach((rule, index) => {
      console.log(`   ${index + 1}. ${rule.name} (Weight: ${rule.weight}, Enabled: ${rule.enabled})`);
    });

    // Add a custom rule
    console.log('\n➕ Adding Custom Rule...');
    const customRuleAdded = FraudDetectionService.addFraudRule({
      name: 'Weekend High Amount',
      description: 'High amount transactions on weekends',
      weight: 15,
      enabled: true,
      condition: (transaction) => {
        const day = new Date(transaction.createdAt).getDay();
        return (day === 0 || day === 6) && transaction.amount > 200000;
      }
    });
    
    console.log(`Custom rule added: ${customRuleAdded ? 'Success' : 'Failed'}`);

    console.log('\n Demo completed successfully!');
    console.log('\n Key Features Demonstrated:');
    console.log('   • AI-Enhanced fraud analysis with Meta Llama');
    console.log('   • Traditional rule-based fraud detection');
    console.log('   • Advanced anomaly detection (velocity, amount, geographic)');
    console.log('   • Dynamic fraud rule management');
    console.log('   • Merchant fraud statistics and reporting');
    console.log('   • Configurable thresholds and AI parameters');
    console.log('   • Real-time AI model integration via Groq API');
    console.log('   • Fallback mechanisms for AI service failures');
    
  } catch (error) {
    logger.error('Demo failed:', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    console.error(' Demo failed:', error);
  } finally {
    // Disconnect from database
    await disconnectDatabase();
    process.exit(0);
  }
}

// Run the demo
if (require.main === module) {
  runDemo().catch(console.error);
}

export { runDemo };
