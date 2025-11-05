import nodemailer from "nodemailer";

const { EMAIL_USER, EMAIL_PASS } = process.env;

export const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: { user: EMAIL_USER, pass: EMAIL_PASS }
});

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  const from = process.env.SMTP_FROM || `Plataforma <${EMAIL_USER}>`;
  const subj = "Instrucciones para restablecer tu contraseña";
  const html = `
  <div style="font-family:system-ui,Segoe UI,Roboto,Arial">
    <h2>${process.env.APP_NAME || "Plataforma"}</h2>
    <p>Recibimos una solicitud para restablecer tu contraseña.</p>
    <p>Haz clic en el botón o copia el enlace:</p>
    <p>
      <a href="${resetUrl}" style="display:inline-block;background:#0ea5e9;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;">
        Restablecer contraseña
      </a>
    </p>
    <p>Si no fuiste tú, ignora este mensaje.</p>
    <p>Enlace directo:<br><code>${resetUrl}</code></p>
  </div>`;
  await transporter.sendMail({ from, to, subject: subj, html });
}
