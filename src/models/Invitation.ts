import mongoose, { Schema, Document, Types } from "mongoose";

export type InviteStatus = "pending" | "accepted" | "rejected" | "expired";
export type InviteRole = "admin" | "writer" | "viewer"; // owner no se invita

export interface IInvitation extends Document {
  repo: Types.ObjectId;
  invitedUser: Types.ObjectId;        // User
  invitedBy: Types.ObjectId;          // User (admin/owner)
  role: InviteRole;
  token: string;                       // si quieres aceptar vía link
  expiresAt?: Date;
  status: InviteStatus;
}

const InvitationSchema = new Schema<IInvitation>(
  {
    repo: { type: Schema.Types.ObjectId, ref: "Repository", required: true, index: true },
    invitedUser: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    invitedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, enum: ["admin", "writer", "viewer"], required: true },
    token: { type: String, required: true, unique: true },
    expiresAt: { type: Date },
    status: { type: String, enum: ["pending", "accepted", "rejected", "expired"], default: "pending", index: true },
  },
  { timestamps: true }
);

export default mongoose.model<IInvitation>("Invitation", InvitationSchema);
