import nodemailer, { Transporter } from 'nodemailer';
import { env } from './env';

function createTransporter(): Transporter {
  // En desarrollo sin SMTP configurado → usa ethereal (logs en consola)
  if (!env.SMTP_USER || !env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: 'localhost',
      port: 1025,
      ignoreTLS: true,
    });
  }

  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: parseInt(env.SMTP_PORT, 10),
    secure: false,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });
}

export const mailer = createTransporter();

export async function sendVerificationEmail(email: string, code: string): Promise<void> {
  // En desarrollo sin SMTP → solo log en consola
  if (!env.SMTP_USER || !env.SMTP_PASS) {
    console.log('\n─────────────────────────────────────');
    console.log(`📧 CÓDIGO DE VERIFICACIÓN para ${email}`);
    console.log(`   Código: ${code}`);
    console.log('─────────────────────────────────────\n');
    return;
  }

  await mailer.sendMail({
    from: `"U-Ride UTA" <${env.SMTP_USER}>`,
    to: email,
    subject: 'Verifica tu cuenta en U-Ride',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #1d4ed8;">Verifica tu cuenta en U-Ride</h2>
        <p>Usa el siguiente código para verificar tu correo institucional:</p>
        <div style="background: #f1f5f9; padding: 24px; text-align: center; border-radius: 8px; margin: 24px 0;">
          <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #1d4ed8;">${code}</span>
        </div>
        <p style="color: #64748b; font-size: 14px;">Este código expira en 15 minutos. Si no solicitaste esto, ignora este correo.</p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(email: string, code: string): Promise<void> {
  // En desarrollo sin SMTP → solo log en consola
  if (!env.SMTP_USER || !env.SMTP_PASS) {
    console.log('\n─────────────────────────────────────');
    console.log(`📧 CÓDIGO DE RECUPERACIÓN DE CONTRASEÑA para ${email}`);
    console.log(`   Código: ${code}`);
    console.log('─────────────────────────────────────\n');
    return;
  }

  await mailer.sendMail({
    from: `"U-Ride UTA" <${env.SMTP_USER}>`,
    to: email,
    subject: 'Recupera tu contraseña en U-Ride',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #1d4ed8;">Recupera tu contraseña</h2>
        <p>Recibimos una solicitud para recuperar tu contraseña. Usa el siguiente código:</p>
        <div style="background: #f1f5f9; padding: 24px; text-align: center; border-radius: 8px; margin: 24px 0;">
          <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #1d4ed8;">${code}</span>
        </div>
        <p style="color: #64748b; font-size: 14px;">Este código expira en 30 minutos. Si no solicitaste recuperar tu contraseña, ignora este correo.</p>
      </div>
    `,
  });
}
