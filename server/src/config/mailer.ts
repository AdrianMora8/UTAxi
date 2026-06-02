import nodemailer from 'nodemailer';
import { env } from './env';

// Crear el transportador SMTP
const createTransporter = () => {
  if (env.SMTP_HOST && env.SMTP_USER) {
    return nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: Number(env.SMTP_PORT) || 587,
      secure: Number(env.SMTP_PORT) === 465, // true for 465, false for other ports
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    });
  }
  return null;
};

const transporter = createTransporter();

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!transporter) {
    console.log(`📧 [dev] Email para ${to} — subject: ${subject}`);
    return;
  }

  try {
    await transporter.sendMail({
      from: `"U-Ride UTA" <${env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`✅ Email enviado exitosamente a ${to}`);
  } catch (error) {
    console.error(`❌ Error al enviar email a ${to}:`, error);
  }
}

export async function sendVerificationEmail(email: string, code: string): Promise<void> {
  if (!transporter) {
    console.log(`\n📧 CÓDIGO DE VERIFICACIÓN para ${email}: ${code}\n`);
    return;
  }

  await sendEmail(
    email,
    'Verifica tu cuenta en U-Ride',
    `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #1d4ed8;">Verifica tu cuenta en U-Ride</h2>
      <p>Usa el siguiente código para verificar tu correo institucional:</p>
      <div style="background: #f1f5f9; padding: 24px; text-align: center; border-radius: 8px; margin: 24px 0;">
        <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #1d4ed8;">${code}</span>
      </div>
      <p style="color: #64748b; font-size: 14px;">Este código expira en 15 minutos.</p>
    </div>
  `
  );
}

export async function sendPasswordResetEmail(email: string, code: string): Promise<void> {
  if (!transporter) {
    console.log(`\n📧 CÓDIGO DE RECUPERACIÓN para ${email}: ${code}\n`);
    return;
  }

  await sendEmail(
    email,
    'Recupera tu contraseña en U-Ride',
    `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #1d4ed8;">Recupera tu contraseña</h2>
      <p>Usa el siguiente código de 6 dígitos:</p>
      <div style="background: #f1f5f9; padding: 24px; text-align: center; border-radius: 8px; margin: 24px 0;">
        <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #1d4ed8;">${code}</span>
      </div>
      <p style="color: #64748b; font-size: 14px;">⏰ Este código expira en 15 minutos.</p>
    </div>
  `
  );
}
