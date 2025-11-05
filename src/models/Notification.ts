import mongoose, { Schema, Document, Types } from "mongoose";

export type NotificationType =
  | "simple_invite"              // te invitaron a un repo simple
  | "simple_join_accepted"       // aceptaron unirte a un repo simple
  | "creator_new_application"    // alguien aplicó a tu repo de creador
  | "creator_creator_accepted"   // te aceptaron como Creador
  | "creator_member_joined";     // alguien se unió (pagó) como Miembro

export interface INotification extends Document {
  user: Types.ObjectId;          // receptor
  type: NotificationType;
  title: string;
  message?: string;
  seen: boolean;

  actor?: Types.ObjectId;        // quién genera (opcional)
  repo?: Types.ObjectId;
  application?: Types.ObjectId;

  payload?: Record<string, any>; // datos extra para UI
}

const NotificationSchema = new Schema<INotification>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: {
      type: String,
      enum: [
        "simple_invite",
        "simple_join_accepted",
        "creator_new_application",
        "creator_creator_accepted",
        "creator_member_joined",
      ],
      required: true,
      index: true,
    },
    title: { type: String, required: true },
    message: { type: String },
    seen: { type: Boolean, default: false, index: true },

    actor: { type: Schema.Types.ObjectId, ref: "User" },
    repo: { type: Schema.Types.ObjectId, ref: "Repository" },
    application: { type: Schema.Types.ObjectId, ref: "Application" },
    payload: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

export default mongoose.model<INotification>("Notification", NotificationSchema);
