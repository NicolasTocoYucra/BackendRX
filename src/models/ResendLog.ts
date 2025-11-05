import { Schema, model, Types } from "mongoose";

const ResendLogSchema = new Schema({
  userId: { type: Types.ObjectId, ref: "User", index: true, required: false },
  ip: { type: String, index: true },
  // ⬇️ QUITA "index: true" aquí
  createdAt: { type: Date, default: Date.now },
});

// TTL de 24h sobre createdAt
ResendLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 });

export default model("ResendLog", ResendLogSchema);
