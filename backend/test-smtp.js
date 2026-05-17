const nodemailer = require("nodemailer");

async function testSMTP() {
  const transporter = nodemailer.createTransport({
    host: "mail.adnanpay.com",
    port: 465,
    secure: true,
    auth: {
      user: "mail@adnanpay.com",
      pass: "jVIcC2L?B=ecJ0#?",
    },
  });

  try {
    console.log("Testing SMTP connection...");
    await transporter.verify();
    console.log("✓ SMTP connection successful!");

    console.log("\nSending test email...");
    const info = await transporter.sendMail({
      from: '"Adnanpay" <mail@adnanpay.com>',
      to: "mail@adnanpay.com",
      subject: "Test Email - Adnanpay SMTP",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">SMTP Test Successful</h2>
          <p>This is a test email from Adnanpay backend.</p>
          <p>Timestamp: ${new Date().toISOString()}</p>
        </div>
      `,
    });

    console.log("✓ Test email sent!");
    console.log("Message ID:", info.messageId);
  } catch (error) {
    console.error("✗ SMTP test failed:", error);
    process.exit(1);
  }
}

testSMTP();
