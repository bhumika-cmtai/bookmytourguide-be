// utils/paymentReminder.js
import nodemailer from "nodemailer";

// Email transport setup
const transporter = nodemailer.createTransport({
  service: "gmail", // Ya tumhara email service
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Send payment reminder email
export const sendPaymentReminderEmail = async (booking, user) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: user.email,
    subject: "⏰ Payment Reminder - Complete Your Booking",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Hi ${user.name},</h2>
        <p>Your trip starts <strong>tomorrow</strong>! Please complete your remaining payment to confirm your booking.</p>
        
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Booking Details:</h3>
          <p><strong>Booking ID:</strong> ${booking._id}</p>
          <p><strong>Start Date:</strong> ${new Date(booking.startDate).toLocaleDateString()}</p>
          <p><strong>Amount Due:</strong> ₹${booking.remainingAmount.toLocaleString()}</p>
        </div>
        
        <a href="${process.env.FRONTEND_URL}/payment/remaining/${booking._id}" 
           style="display: inline-block; background: #FF0000; color: white; padding: 12px 30px; 
                  text-decoration: none; border-radius: 5px; margin: 20px 0;">
          Pay Now
        </a>
        
        <p style="color: #666; font-size: 14px; margin-top: 30px;">
          If you have any questions, please contact our support team.
        </p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

// Cron job function - Yeh daily run hoga
export const checkAndSendReminders = async () => {
  try {
    console.log("🔍 Checking for bookings needing payment reminders...");

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

    // Find bookings starting tomorrow with advance payment only
    const bookingsNeedingReminder = await Booking.find({
      startDate: {
        $gte: tomorrow,
        $lt: dayAfterTomorrow,
      },
      paymentStatus: "Advance Paid",
      status: "Upcoming",
      reminderSent: false,
    }).populate("user", "name email");

    console.log(
      `📧 Found ${bookingsNeedingReminder.length} bookings to remind`
    );

    for (const booking of bookingsNeedingReminder) {
      try {
        await sendPaymentReminderEmail(booking, booking.user);

        booking.reminderSent = true;
        booking.reminderSentAt = new Date();
        await booking.save();

        console.log(`✅ Reminder sent for booking ${booking._id}`);
      } catch (error) {
        console.error(
          `❌ Failed to send reminder for booking ${booking._id}:`,
          error
        );
      }
    }

    console.log("✨ Reminder check completed!");
  } catch (error) {
    console.error("❌ Error in reminder system:", error);
  }
};
