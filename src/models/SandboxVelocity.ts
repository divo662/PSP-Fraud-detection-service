import mongoose, { Document, Schema } from 'mongoose';

export interface ISandboxVelocity extends Document {
  key: string;
  count: number;
  expiresAt: Date;
  createdAt: Date;
}

const SandboxVelocitySchema = new Schema<ISandboxVelocity>({
  key: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  count: {
    type: Number,
    default: 0,
    min: 0
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 } // TTL index
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// TTL index for automatic cleanup
SandboxVelocitySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model<ISandboxVelocity>('SandboxVelocity', SandboxVelocitySchema);
