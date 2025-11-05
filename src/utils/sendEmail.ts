import nodemailer from 'nodemailer';

export const sendVerificationEmail = async (to: string, code: string) => {
  const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
      user: process.env.EMAIL_USER, // Tu correo
      pass: process.env.EMAIL_PASS, // Contraseña de aplicación
    },
  });

  await transporter.sendMail({
    from: `"Mi App" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Tu código de verificación',
    text: `Tu código de verificación es: ${code}`,
    html: `<p>Tu código de verificación es: <b>${code}</b></p>`,
  });
};
