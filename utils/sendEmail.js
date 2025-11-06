import nodemailer from "nodemailer";

export const sendEmail = async (to, subject, htmlContent) => {
  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.hostinger.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // ... (companyTemplate remains the same)

    const companyTemplate = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fb; padding: 30px;">
        <table align="center" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 5px 20px rgba(0,0,0,0.05);">
          <tr>
            <td style="background-color: #004aad; padding: 20px 0; text-align: center; color: #ffffff;">
              <h1 style="margin: 0; font-size: 24px; letter-spacing: 1px;">BookMyTourGuide</h1>
              <p style="margin: 5px 0 0; font-size: 14px; opacity: 0.9;">Discover. Connect. Explore.</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px;">
              ${htmlContent}
            </td>
          </tr>
          <tr>
            <td style="background-color: #f4f7fb; text-align: center; padding: 15px 10px;">
              <p style="font-size: 13px; color: #666;">You’re receiving this email from <strong>BookMyTourGuide</strong>.</p>
              <p style="font-size: 12px; color: #999;">© ${new Date().getFullYear()} BookMyTourGuide. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </div>
    `;

    await transporter.sendMail({
      from: `"BookMyTourGuide" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html: companyTemplate,
      text: htmlContent.replace(/<[^>]+>/g, ""),
    });

    console.log(`✅ Email sent successfully to ${to}`);
    // Return true on success
    return true;

  } catch (error) {
    console.error("❌ Email sending failed:", error.message);
    // ❗️ IMPORTANT: Re-throw the error so the controller can catch it
    throw new Error("Failed to send verification email.");
  }
};