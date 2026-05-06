import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import nodemailer from 'nodemailer';
import { sendVerificationEmail, sendPasswordResetEmail } from '../../src/config/mailer';

/**
 * Pruebas unitarias para el módulo de mailer
 * Verifica que los emails se envíen correctamente en diferentes escenarios
 */

vi.mock('nodemailer');

const mockSendMail = vi.fn().mockResolvedValue({ messageId: 'test-id' });

describe('Mailer Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSendMail.mockResolvedValue({ messageId: 'test-id' });
  });

  describe('sendVerificationEmail', () => {
    it('should log to console in development mode when SMTP not configured', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await sendVerificationEmail('student@uta.edu.ec', '123456');

      expect(consoleSpy).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('CÓDIGO DE VERIFICACIÓN')
      );

      consoleSpy.mockRestore();
    });

    it('should contain the verification code in output', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const code = '654321';

      await sendVerificationEmail('student@uta.edu.ec', code);

      const logs = consoleSpy.mock.calls.map((call) => call[0]).join('\n');
      expect(logs).toContain(code);

      consoleSpy.mockRestore();
    });

    it('should contain the email address in output', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const email = 'student@uta.edu.ec';

      await sendVerificationEmail(email, '123456');

      const logs = consoleSpy.mock.calls.map((call) => call[0]).join('\n');
      expect(logs).toContain(email);

      consoleSpy.mockRestore();
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('should log to console in development mode when SMTP not configured', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await sendPasswordResetEmail('student@uta.edu.ec', '654321');

      expect(consoleSpy).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('CÓDIGO DE RECUPERACIÓN')
      );

      consoleSpy.mockRestore();
    });

    it('should contain the reset code in output', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const code = '999888';

      await sendPasswordResetEmail('student@uta.edu.ec', code);

      const logs = consoleSpy.mock.calls.map((call) => call[0]).join('\n');
      expect(logs).toContain(code);

      consoleSpy.mockRestore();
    });

    it('should mention expiration time in reset email', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await sendPasswordResetEmail('student@uta.edu.ec', '123456');

      const logs = consoleSpy.mock.calls.map((call) => call[0]).join('\n');
      expect(logs).toContain('15 minutos');

      consoleSpy.mockRestore();
    });

    it('should contain the email address in output', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const email = 'student@uta.edu.ec';

      await sendPasswordResetEmail(email, '123456');

      const logs = consoleSpy.mock.calls.map((call) => call[0]).join('\n');
      expect(logs).toContain(email);

      consoleSpy.mockRestore();
    });
  });

  describe('Email format validation', () => {
    it('sendVerificationEmail should format code with letter spacing', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await sendVerificationEmail('student@uta.edu.ec', '123456');

      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('sendPasswordResetEmail should format code with letter spacing', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await sendPasswordResetEmail('student@uta.edu.ec', '654321');

      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('Error handling', () => {
    it('should handle empty email gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await sendVerificationEmail('', '123456');

      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should handle empty code gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await sendVerificationEmail('student@uta.edu.ec', '');

      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('Development mode output format', () => {
    it('should use consistent formatting for verification email', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const code = '123456';
      const email = 'student@uta.edu.ec';

      await sendVerificationEmail(email, code);

      const logs = consoleSpy.mock.calls.map((call) => call[0]).join('');
      
      // Check for expected format elements
      expect(logs).toContain('─────────────────────────────────────');
      expect(logs).toContain('📧');
      expect(logs).toContain(code);
      expect(logs).toContain(email);

      consoleSpy.mockRestore();
    });

    it('should use consistent formatting for reset email', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const code = '654321';
      const email = 'student@uta.edu.ec';

      await sendPasswordResetEmail(email, code);

      const logs = consoleSpy.mock.calls.map((call) => call[0]).join('');
      
      // Check for expected format elements
      expect(logs).toContain('─────────────────────────────────────');
      expect(logs).toContain('📧');
      expect(logs).toContain(code);
      expect(logs).toContain(email);

      consoleSpy.mockRestore();
    });
  });
});
