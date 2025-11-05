import mongoose, { Schema, Document, Types } from "mongoose";

export type ApplicationKind = "creator" | "member";
export type CreatorType = "técnico" | "visual" | "administrador" | "experto";
export type MemberPlan = "cobre" | "plata" | "oro" | "diamante";
export type AppStatus = "pending" | "accepted" | "rejected";

export interface IApplication extends Document {
  kind: ApplicationKind;               // creator | member
  repo: Types.ObjectId;                // Repository
  applicant: Types.ObjectId;           // User
  status: AppStatus;
  decidedBy?: Types.ObjectId;          // User (owner/admin)
  decidedAt?: Date;

  // creator
  creatorType?: CreatorType;
  aporte?: string;
  motivacion?: string;
  tipoAporte?: string;
  disponibilidadHoras?: number;
  urlPortafolio?: string;

  // member
  plan?: MemberPlan;
  aportePersonal?: string[];           // [compartir enlace, animar, invitar gente, compartir contenido, otro]
  amount?: number;                     // simulación de pago
}

const ApplicationSchema = new Schema<IApplication>(
  {
    kind: { type: String, enum: ["creator", "member"], required: true, index: true },
    repo: { type: Schema.Types.ObjectId, ref: "Repository", required: true, index: true },
    applicant: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    status: { type: String, enum: ["pending", "accepted", "rejected"], default: "pending", index: true },
    decidedBy: { type: Schema.Types.ObjectId, ref: "User" },
    decidedAt: { type: Date },

    creatorType: { type: String, enum: ["técnico", "visual", "administrador", "experto"] },
    aporte: { type: String },
    motivacion: { type: String },
    tipoAporte: { type: String },
    disponibilidadHoras: { type: Number },
    urlPortafolio: { type: String },

    plan: { type: String, enum: ["cobre", "plata", "oro", "diamante"] },
    aportePersonal: [{ type: String }],
    amount: { type: Number },
  },
  { timestamps: true }
);

export default mongoose.model<IApplication>("Application", ApplicationSchema);
