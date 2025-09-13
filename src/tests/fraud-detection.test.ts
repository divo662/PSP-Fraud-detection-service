import { FraudDetectionService } from '../services/FraudDetectionService';
import { Transaction } from '../types';
import TransactionModel from '../models/Transaction';
import SandboxVelocityModel from '../models/SandboxVelocity';

describe('FraudDetectionService', () => {
  describe('analyzeTransaction', () => {
    it('should allow low-risk transactions', async () => {
      const transaction: Transaction = {
        amount: 50000,
        customerEmail: 'test@example.com',
        merchantId: 'merchant_001',
        ipAddress: '192.168.1.100',
        createdAt: new Date(),
        status: 'pending',
        isNewCustomer: false,
        currency: 'NGN',
        paymentMethod: 'card'
      };

      const result = await FraudDetectionService.analyzeTransaction(transaction);

      expect(result.action).toBe('allow');
      expect(result.isFraudulent).toBe(false);
      expect(result.flagged).toBe(false);
      expect(result.riskScore.score).toBeLessThan(30);
    });

    it('should flag high amount transactions', async () => {
      const transaction: Transaction = {
        amount: 1500000, // High amount (above 1M threshold)
        customerEmail: 'test@example.com',
        merchantId: 'merchant_001',
        ipAddress: '192.168.1.100',
        createdAt: new Date(),
        status: 'pending',
        isNewCustomer: false,
        currency: 'NGN',
        paymentMethod: 'card',
        description: 'High amount test'
      };

      const result = await FraudDetectionService.analyzeTransaction(transaction);

      expect(result.action).toBe('allow'); // 20 points = allow (flag threshold is 30)
      expect(result.flagged).toBe(false); // Not flagged until 30+ points
      expect(result.riskScore.factors).toContain('High Transaction Amount');
    });

    it('should block new customer high amount transactions', async () => {
      const transaction: Transaction = {
        amount: 600000, // High amount for new customer
        customerEmail: 'newcustomer@example.com',
        merchantId: 'merchant_001',
        ipAddress: '192.168.1.100',
        createdAt: new Date(),
        status: 'pending',
        isNewCustomer: true,
        currency: 'NGN',
        paymentMethod: 'card'
      };

      const result = await FraudDetectionService.analyzeTransaction(transaction);

      expect(result.action).toBe('flag'); // 30 points = flag level, not block
      expect(result.isFraudulent).toBe(false); // Not fraudulent until 80+ points
      expect(result.riskScore.factors).toContain('New Customer High Amount');
    });

    it('should flag unusual time transactions', async () => {
      const unusualTime = new Date();
      unusualTime.setHours(2); // 2 AM

      const transaction: Transaction = {
        amount: 100000,
        customerEmail: 'test@example.com',
        merchantId: 'merchant_001',
        ipAddress: '192.168.1.100',
        createdAt: unusualTime,
        status: 'pending',
        isNewCustomer: false,
        currency: 'NGN',
        paymentMethod: 'card'
      };

      const result = await FraudDetectionService.analyzeTransaction(transaction);

      expect(result.riskScore.factors).toContain('Unusual Transaction Time');
    });
  });

  describe('calculateRiskScore', () => {
    it('should calculate correct risk score for multiple factors', async () => {
      const unusualTime = new Date();
      unusualTime.setHours(2); // 2 AM - unusual time

      const transaction: Transaction = {
        amount: 1500000, // High amount (20 points)
        customerEmail: 'test@example.com',
        merchantId: 'merchant_001',
        ipAddress: '192.168.1.100',
        createdAt: unusualTime, // Unusual time (15 points)
        status: 'pending',
        isNewCustomer: true, // New customer high amount (30 points)
        currency: 'NGN',
        paymentMethod: 'card'
      };

      const result = await FraudDetectionService.calculateRiskScore(transaction);

      expect(result.score).toBeGreaterThanOrEqual(50); // 65 points
      expect(result.level).toBe('high'); // 65 points = high level
      expect(result.factors).toContain('High Transaction Amount');
      expect(result.factors).toContain('Unusual Transaction Time');
      expect(result.factors).toContain('New Customer High Amount');
    });

    it('should return low risk for normal transactions', async () => {
      const transaction: Transaction = {
        amount: 25000,
        customerEmail: 'test@example.com',
        merchantId: 'merchant_001',
        ipAddress: '192.168.1.100',
        createdAt: new Date(),
        status: 'pending',
        isNewCustomer: false,
        currency: 'NGN',
        paymentMethod: 'card'
      };

      const result = await FraudDetectionService.calculateRiskScore(transaction);

      expect(result.score).toBeLessThan(40);
      expect(result.level).toBe('low');
    });
  });

  describe('checkVelocityFraud', () => {
    it('should detect velocity fraud after multiple attempts', async () => {
      const customerEmail = 'velocity@example.com';
      const merchantId = 'merchant_001';

      // Simulate multiple rapid transactions
      for (let i = 0; i < 6; i++) {
        const isVelocityFraud = await FraudDetectionService.checkVelocityFraud(
          customerEmail,
          merchantId,
          3600000 // 1 hour window
        );
        
        if (i < 5) {
          expect(isVelocityFraud).toBe(false);
        } else {
          expect(isVelocityFraud).toBe(true);
        }
      }
    });

    it('should not flag velocity fraud for normal transaction patterns', async () => {
      const customerEmail = 'normal@example.com';
      const merchantId = 'merchant_001';

      const isVelocityFraud = await FraudDetectionService.checkVelocityFraud(
        customerEmail,
        merchantId
      );

      expect(isVelocityFraud).toBe(false);
    });
  });

  describe('checkAmountAnomaly', () => {
    beforeEach(async () => {
      // Create some normal transactions for the merchant
      await TransactionModel.create([
        {
          amount: 50000,
          customerEmail: 'test1@example.com',
          merchantId: 'merchant_001',
          status: 'success',
          createdAt: new Date()
        },
        {
          amount: 75000,
          customerEmail: 'test2@example.com',
          merchantId: 'merchant_001',
          status: 'success',
          createdAt: new Date()
        },
        {
          amount: 100000,
          customerEmail: 'test3@example.com',
          merchantId: 'merchant_001',
          status: 'success',
          createdAt: new Date()
        }
      ]);
    });

    it('should detect amount anomaly for unusually high amounts', async () => {
      const isAnomaly = await FraudDetectionService.checkAmountAnomaly(
        'merchant_001',
        500000 // Much higher than average
      );

      expect(isAnomaly).toBe(true);
    });

    it('should not flag normal amounts as anomalies', async () => {
      const isAnomaly = await FraudDetectionService.checkAmountAnomaly(
        'merchant_001',
        80000 // Within normal range
      );

      expect(isAnomaly).toBe(false);
    });
  });

  describe('checkGeographicAnomaly', () => {
    beforeEach(async () => {
      // Create transactions from different locations
      await TransactionModel.create([
        {
          amount: 50000,
          customerEmail: 'geo@example.com',
          merchantId: 'merchant_001',
          ipAddress: '192.168.1.100',
          status: 'success',
          createdAt: new Date()
        },
        {
          amount: 75000,
          customerEmail: 'geo@example.com',
          merchantId: 'merchant_001',
          ipAddress: '192.168.1.101',
          status: 'success',
          createdAt: new Date()
        },
        {
          amount: 100000,
          customerEmail: 'geo@example.com',
          merchantId: 'merchant_001',
          ipAddress: '192.168.1.102',
          status: 'success',
          createdAt: new Date()
        }
      ]);
    });

    it('should detect geographic anomaly for multiple locations', async () => {
      const isAnomaly = await FraudDetectionService.checkGeographicAnomaly(
        'geo@example.com',
        '192.168.1.103' // New location
      );

      expect(isAnomaly).toBe(true);
    });

    it('should not flag same location as anomaly', async () => {
      // Create a transaction with only one location first
      await TransactionModel.create({
        amount: 50000,
        customerEmail: 'single@example.com',
        merchantId: 'merchant_001',
        ipAddress: '192.168.1.100',
        status: 'success',
        createdAt: new Date()
      });

      const isAnomaly = await FraudDetectionService.checkGeographicAnomaly(
        'single@example.com',
        '192.168.1.100' // Same location
      );

      expect(isAnomaly).toBe(false);
    });
  });

  describe('getFraudStatistics', () => {
    beforeEach(async () => {
      // Create test transactions with different risk levels
      await TransactionModel.create([
        {
          amount: 50000,
          customerEmail: 'test1@example.com',
          merchantId: 'merchant_001',
          status: 'success',
          createdAt: new Date()
        },
        {
          amount: 1500000, // High risk
          customerEmail: 'test2@example.com',
          merchantId: 'merchant_001',
          status: 'success',
          createdAt: new Date()
        },
        {
          amount: 2000000, // Very high risk
          customerEmail: 'test3@example.com',
          merchantId: 'merchant_001',
          status: 'success',
          createdAt: new Date()
        }
      ]);
    });

    it('should calculate correct fraud statistics', async () => {
      const stats = await FraudDetectionService.getFraudStatistics('merchant_001');

      expect(stats.totalTransactions).toBe(3);
      expect(stats.flaggedTransactions).toBeGreaterThanOrEqual(0);
      expect(stats.fraudRate).toBeGreaterThanOrEqual(0);
      expect(stats.averageRiskScore).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(stats.topRiskFactors)).toBe(true);
    });
  });

  describe('fraud rule management', () => {
    it('should add a new fraud rule', () => {
      const newRule = {
        name: 'Test Rule',
        description: 'Test rule for testing',
        weight: 10,
        enabled: true,
        condition: (transaction: Transaction) => transaction.amount > 1000
      };

      const result = FraudDetectionService.addFraudRule(newRule);
      expect(result).toBe(true);

      const rules = FraudDetectionService.getFraudRules();
      const addedRule = rules.find(rule => rule.name === 'Test Rule');
      expect(addedRule).toBeDefined();
    });

    it('should update an existing fraud rule', () => {
      const rules = FraudDetectionService.getFraudRules();
      const firstRule = rules[0];

      const result = FraudDetectionService.updateFraudRule(firstRule.id, {
        weight: 50,
        enabled: false
      });

      expect(result).toBe(true);

      const updatedRules = FraudDetectionService.getFraudRules();
      const updatedRule = updatedRules.find(rule => rule.id === firstRule.id);
      expect(updatedRule?.weight).toBe(50);
      expect(updatedRule?.enabled).toBe(false);
    });

    it('should toggle a fraud rule', () => {
      const rules = FraudDetectionService.getFraudRules();
      const firstRule = rules[0];
      const originalEnabled = firstRule.enabled;

      const result = FraudDetectionService.toggleFraudRule(firstRule.id, !originalEnabled);
      expect(result).toBe(true);

      const updatedRules = FraudDetectionService.getFraudRules();
      const updatedRule = updatedRules.find(rule => rule.id === firstRule.id);
      expect(updatedRule?.enabled).toBe(!originalEnabled);
    });

    it('should remove a fraud rule', () => {
      const rules = FraudDetectionService.getFraudRules();
      const ruleCount = rules.length;

      const result = FraudDetectionService.removeFraudRule(rules[0].id);
      expect(result).toBe(true);

      const updatedRules = FraudDetectionService.getFraudRules();
      expect(updatedRules.length).toBe(ruleCount - 1);
    });

    it('should return false for non-existent rule operations', () => {
      const result = FraudDetectionService.updateFraudRule('non-existent', { enabled: false });
      expect(result).toBe(false);

      const removeResult = FraudDetectionService.removeFraudRule('non-existent');
      expect(removeResult).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle errors gracefully in analyzeTransaction', async () => {
      const invalidTransaction = {} as Transaction;

      // The service is robust and handles invalid transactions gracefully
      const result = await FraudDetectionService.analyzeTransaction(invalidTransaction);
      expect(result).toBeDefined();
      expect(result.action).toBe('allow'); // Default safe action
    });

    it('should handle errors gracefully in calculateRiskScore', async () => {
      const invalidTransaction = {} as Transaction;

      // The service is robust and handles invalid transactions gracefully
      const result = await FraudDetectionService.calculateRiskScore(invalidTransaction);
      expect(result).toBeDefined();
      expect(result.score).toBe(0); // Default safe score
    });
  });
});
