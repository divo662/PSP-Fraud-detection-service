import mongoose, { Document, Schema } from 'mongoose';

export interface ITransaction extends Document {
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
  riskScore?: number;
  riskLevel?: string;
  fraudFactors?: string[];
}

const TransactionSchema = new Schema<ITransaction>({
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  customerEmail: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  merchantId: {
    type: String,
    required: true
  },
  ipAddress: {
    type: String,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'success', 'failed', 'blocked'],
    default: 'pending',
    index: true
  },
  isNewCustomer: {
    type: Boolean,
    default: false
  },
  currency: {
    type: String,
    default: 'NGN'
  },
  paymentMethod: {
    type: String,
    enum: ['card', 'bank_transfer', 'wallet', 'other'],
    default: 'card'
  },
  description: {
    type: String,
    trim: true
  },
  riskScore: {
    type: Number,
    min: 0,
    max: 100
  },
  riskLevel: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical']
  },
  fraudFactors: [{
    type: String
  }]
}, {
  timestamps: true
});

// Indexes for performance
TransactionSchema.index({ customerEmail: 1, createdAt: -1 });
TransactionSchema.index({ merchantId: 1, createdAt: -1 });
TransactionSchema.index({ status: 1, createdAt: -1 });
TransactionSchema.index({ ipAddress: 1, createdAt: -1 });

export default mongoose.model<ITransaction>('Transaction', TransactionSchema);
