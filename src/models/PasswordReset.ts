import { Schema, model, Types } from "mongoose";

const PasswordResetSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: "User", required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true},
    usedAt: { type: Date }
  },
  { timestamps: true }
);

// TTL: Atlas eliminará el doc al pasar expiresAt
PasswordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default model("PasswordReset", PasswordResetSchema);
