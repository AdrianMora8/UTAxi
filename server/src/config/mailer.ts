import nodemailer, { Transporter } from 'nodemailer';
import { env } from './env';

function createTransporter(): Transporter {
  if (!env.SMTP_USER || !env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: 'localhost',
      port: 1025,
      ignoreTLS: true,
    });
  }

  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: Number.parseInt(env.SMTP_PORT, 10),
    secure: false,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });
}

export const mailer = createTransporter();

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!env.SMTP_USER || !env.SMTP_PASS) {
    console.log(`📧 [dev] Email para ${to} — subject: ${subject}`);
    return;
  }

  await mailer.sendMail({ from: `"U-Ride UTA" <${env.SMTP_USER}>`, to, subject, html });
}

export async function sendVerificationEmail(email: string, code: string): Promise<void> {
  if (!env.RESEND_API_KEY && !env.SMTP_USER) {
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
  `,
  );
}

export async function sendPasswordResetEmail(email: string, code: string): Promise<void> {
  if (!env.RESEND_API_KEY && !env.SMTP_USER) {
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
  `,
  );
}
