import mongoose, { Schema, Document, Types } from "mongoose";

export type UserType = "Estudiante" | "Administrador" | "Investigador" | "Académico";

interface StudentInfo {
  institucion?: string;
  carrera?: string;
  nivel?: string; // semestre/nivel
}
interface ResearcherInfo {
  institucion?: string;
  enfoque?: string;
  urlInvestigaciones?: string;
}
interface BusinessAdminInfo {
  empresa?: string;
  cargo?: string;
  area?: string;
  aniosExp?: number;
}
interface AcademicInfo {
  institucion?: string;
  departamento?: string;
  grado?: string; // pregrado/maestría/PhD
  lineas?: string[]; // docencia/investigación
}

export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  repositories: Types.ObjectId[];

  // 2FA / recuperación
  verificationCode?: string;
  verificationCodeExpires?: Date;

  // 🔹 Recuperación de contraseña
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;

  // Perfil
  nombre?: string;
  apellido?: string;
  bio?: string;
  isPublic: boolean;
  userType?: UserType;
  student?: StudentInfo;
  researcher?: ResearcherInfo;
  businessAdmin?: BusinessAdminInfo;
  academic?: AcademicInfo;

  hobbies: string[];
  profileStyles: string[];
  profileImage?: string;

  // Métricas (cacheables)
  repoCount?: number;
  fileCount?: number;

  // Extra (legado)
  estado?: string;
  profesion?: string;
  institucion?: string;
  ciudad?: string;
  contacto?: string;

  createdAt: Date;
  updatedAt: Date;
}

const StudentSchema = new Schema<StudentInfo>(
  { institucion: String, carrera: String, nivel: String },
  { _id: false }
);
const ResearcherSchema = new Schema<ResearcherInfo>(
  { institucion: String, enfoque: String, urlInvestigaciones: String },
  { _id: false }
);
const BusinessAdminSchema = new Schema<BusinessAdminInfo>(
  { empresa: String, cargo: String, area: String, aniosExp: Number },
  { _id: false }
);
const AcademicSchema = new Schema<AcademicInfo>(
  { institucion: String, departamento: String, grado: String, lineas: [String] },
  { _id: false }
);

const UserSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, unique: true, index: true },
    password: { type: String, required: true },

    repositories: [{ type: Schema.Types.ObjectId, ref: "Repository" }],

    verificationCode: { type: String },
    verificationCodeExpires: { type: Date },

    // 🔹 Campos de recuperación de contraseña
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },

    nombre: { type: String },
    apellido: { type: String },
    bio: { type: String },
    isPublic: { type: Boolean, default: true, index: true },
    userType: {
      type: String,
      enum: ["Estudiante", "Administrador", "Investigador", "Académico"],
    },

    student: StudentSchema,
    researcher: ResearcherSchema,
    businessAdmin: BusinessAdminSchema,
    academic: AcademicSchema,

    hobbies: [{ type: String, index: true }],
    profileStyles: [{ type: String }],
    profileImage: { type: String },

    repoCount: { type: Number, default: 0 },
    fileCount: { type: Number, default: 0 },

    // campos legados por compatibilidad
    estado: String,
    profesion: String,
    institucion: String,
    ciudad: String,
    contacto: String,
  },
  { timestamps: true }
);

export default mongoose.model<IUser>("User", UserSchema);
