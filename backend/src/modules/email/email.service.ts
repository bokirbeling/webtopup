import nodemailer from "nodemailer";
import type { EmailVerificationMessage, EmailVerificationSender } from "../auth/auth.service";

export type EmailConfig = Readonly<{
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromName: string;
  fromEmail: string;
}>;

export type EmailService = Readonly<{
  sendVerificationEmail(message: EmailVerificationMessage): Promise<void>;
  sendOrderConfirmation(to: string, orderNumber: string, amount: number): Promise<void>;
  sendPaymentSuccess(to: string, orderNumber: string, amount: number): Promise<void>;
  sendFulfillmentSuccess(to: string, orderNumber: string, productName: string): Promise<void>;
  sendPayoutRequest(to: string, amount: number, requestId: string): Promise<void>;
  sendAdminAlert(subject: string, message: string): Promise<void>;
}>;

export function createEmailService(config: EmailConfig): EmailService {
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  return {
    async sendVerificationEmail(message) {
      const verificationUrl = `https://adnanpay.com/verify-email?token=${message.token}`;
      
      await transporter.sendMail({
        from: `"${config.fromName}" <${config.fromEmail}>`,
        to: message.to,
        subject: "Verifikasi Email Anda - Adnanpay",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Verifikasi Email Anda</h2>
            <p>Terima kasih telah mendaftar di Adnanpay. Silakan klik tombol di bawah untuk memverifikasi email Anda:</p>
            <a href="${verificationUrl}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0;">Verifikasi Email</a>
            <p style="color: #666; font-size: 14px;">Link ini akan kadaluarsa pada: ${message.expiresAt.toLocaleString('id-ID')}</p>
            <p style="color: #666; font-size: 14px;">Jika Anda tidak mendaftar di Adnanpay, abaikan email ini.</p>
          </div>
        `,
      });
    },

    async sendOrderConfirmation(to, orderNumber, amount) {
      await transporter.sendMail({
        from: `"${config.fromName}" <${config.fromEmail}>`,
        to,
        subject: `Konfirmasi Pesanan ${orderNumber} - Adnanpay`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Pesanan Anda Telah Dibuat</h2>
            <p>Nomor Pesanan: <strong>${orderNumber}</strong></p>
            <p>Total: <strong>Rp ${(amount / 100).toLocaleString('id-ID')}</strong></p>
            <p>Silakan lakukan pembayaran untuk melanjutkan pesanan Anda.</p>
            <p style="color: #666; font-size: 14px;">Terima kasih telah menggunakan Adnanpay.</p>
          </div>
        `,
      });
    },

    async sendPaymentSuccess(to, orderNumber, amount) {
      await transporter.sendMail({
        from: `"${config.fromName}" <${config.fromEmail}>`,
        to,
        subject: `Pembayaran Berhasil ${orderNumber} - Adnanpay`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #10b981;">Pembayaran Berhasil</h2>
            <p>Nomor Pesanan: <strong>${orderNumber}</strong></p>
            <p>Total Dibayar: <strong>Rp ${(amount / 100).toLocaleString('id-ID')}</strong></p>
            <p>Pesanan Anda sedang diproses dan akan segera dikirim.</p>
            <p style="color: #666; font-size: 14px;">Terima kasih telah menggunakan Adnanpay.</p>
          </div>
        `,
      });
    },

    async sendFulfillmentSuccess(to, orderNumber, productName) {
      await transporter.sendMail({
        from: `"${config.fromName}" <${config.fromEmail}>`,
        to,
        subject: `Pesanan ${orderNumber} Berhasil - Adnanpay`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #10b981;">Pesanan Berhasil Diproses</h2>
            <p>Nomor Pesanan: <strong>${orderNumber}</strong></p>
            <p>Produk: <strong>${productName}</strong></p>
            <p>Pesanan Anda telah berhasil diproses dan dikirim.</p>
            <p style="color: #666; font-size: 14px;">Terima kasih telah menggunakan Adnanpay.</p>
          </div>
        `,
      });
    },

    async sendPayoutRequest(to, amount, requestId) {
      await transporter.sendMail({
        from: `"${config.fromName}" <${config.fromEmail}>`,
        to,
        subject: `Permintaan Penarikan Dana ${requestId} - Adnanpay`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Permintaan Penarikan Dana</h2>
            <p>ID Permintaan: <strong>${requestId}</strong></p>
            <p>Jumlah: <strong>Rp ${(amount / 100).toLocaleString('id-ID')}</strong></p>
            <p>Permintaan penarikan dana Anda sedang diproses oleh admin.</p>
            <p style="color: #666; font-size: 14px;">Anda akan menerima notifikasi setelah permintaan disetujui.</p>
          </div>
        `,
      });
    },

    async sendAdminAlert(subject, message) {
      await transporter.sendMail({
        from: `"${config.fromName}" <${config.fromEmail}>`,
        to: "admin@adnanpay.com",
        subject: `[ADMIN ALERT] ${subject}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #ef4444;">Admin Alert</h2>
            <p>${message}</p>
          </div>
        `,
      });
    },
  };
}

export function createEmailVerificationSender(emailService: EmailService): EmailVerificationSender {
  return {
    async sendVerificationEmail(message) {
      await emailService.sendVerificationEmail(message);
    },
  };
}
