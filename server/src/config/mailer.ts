import sgMail from '@sendgrid/mail';
import { env } from './env';

if (env.SENDGRID_API_KEY) {
  sgMail.setApiKey(env.SENDGRID_API_KEY);
}

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!env.SENDGRID_API_KEY) {
    console.warn(`📧 [dev] Email para ${to} — subject: ${subject}`);
    return;
  }

  await sgMail.send({
    from: { name: 'U-Ride UTA', email: 'oriofrio0126@gmail.com' },
    to,
    subject,
    html,
  });
}

export async function sendVerificationEmail(email: string, code: string): Promise<void> {
  if (!env.SENDGRID_API_KEY) {
    console.warn(`\n📧 CÓDIGO DE VERIFICACIÓN para ${email}: ${code}\n`);
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
  if (!env.SENDGRID_API_KEY) {
    console.warn(`\n📧 CÓDIGO DE RECUPERACIÓN para ${email}: ${code}\n`);
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
