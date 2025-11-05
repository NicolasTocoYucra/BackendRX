import mongoose, { Schema, Document, Types } from "mongoose";

export type RepoType = "simple" | "creator";
export type RepoMode = "personal" | "grupal";
export type Privacy = "public" | "private";

export type SimpleRole = "owner" | "admin" | "writer" | "viewer";
export type CreatorRole = "creator" | "member";
export type AnyRole = SimpleRole | CreatorRole;

export interface IParticipant {
  user: Types.ObjectId;
  role: AnyRole;
  status: "active" | "invited" | "pending"; // invited para simples, pending para aplicaciones
}

export interface IRepository extends Document {
  name: string;                         // título del repo
  description?: string;
  typeRepo: RepoType;

  // Simple
  mode?: RepoMode;                      // personal | grupal
  privacy?: Privacy;                    // public | private (simple)

  // Creator
  interestAreas?: string[];
  geoAreas?: string[];
  sectors?: string[];

  // Comunes
  tags?: string[];                      // alias de “áreas” para filtros de Home
  owner: Types.ObjectId;
  participants: IParticipant[];         // roles y estado
  files: Types.ObjectId[];

  // Destacado/prioridad
  featured?: boolean;                   // para portada
  featuredWeight?: number;              // ordenar
  isRxUno?: boolean;                    // priorizar RX.UNO en Home

  createdAt: Date;
  updatedAt: Date;
}

const ParticipantSchema = new Schema<IParticipant>({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  role: {
    type: String,
    enum: ["owner", "admin", "writer", "viewer", "creator", "member"],
    required: true,
  },
  status: { type: String, enum: ["active", "invited", "pending"], default: "active" },
}, { _id: false });

const RepositorySchema = new Schema<IRepository>(
  {
    name: { type: String, required: true, index: true },
    description: { type: String },
    typeRepo: { type: String, enum: ["simple", "creator"], required: true, index: true },

    // Solo "simple"
    mode: { type: String, enum: ["personal", "grupal"] },
    privacy: { type: String, enum: ["public", "private"], default: "public" },

    // Solo "creator"
    interestAreas: [{ type: String, index: true }],
    geoAreas: [{ type: String }],
    sectors: [{ type: String }],

    // Comunes
    tags: [{ type: String, index: true }],
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    participants: { type: [ParticipantSchema], default: [] },
    files: [{ type: Schema.Types.ObjectId, ref: "File" }],

    featured: { type: Boolean, default: false },
    featuredWeight: { type: Number, default: 0 },
    isRxUno: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Normaliza campos según tipo
RepositorySchema.pre("save", function (next) {
  if (this.typeRepo === "simple") {
    this.set({ interestAreas: [], geoAreas: [], sectors: [] });
    if (!this.mode) this.mode = "grupal";
  }
  if (this.typeRepo === "creator") {
    this.set({ privacy: "public", mode: undefined }); // creator es vitrina pública
  }
  next();
});

export default mongoose.model<IRepository>("Repository", RepositorySchema);
