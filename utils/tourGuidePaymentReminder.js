// utils/tourGuidePaymentReminder.js
import cron from 'node-cron';
import TourGuideBooking from '../models/TourGuideBooking.model.js';
import { sendEmail } from './sendEmail.js'; // Assuming you have a generic sendEmail utility

const sendTourGuideReminderEmail = async (booking) => {
  const user = booking.user;
  const subject = "⏰ Payment Reminder: Your Tour Guide Booking Starts Tomorrow!";
  const htmlContent = `
    <h2 style="color: #333;">Hi ${user.name},</h2>
    <p style="font-size: 16px;">This is a friendly reminder that your trip to <strong>${booking.location}</strong> with your assigned guide is scheduled to start tomorrow!</p>
    <p style="font-size: 16px;">To confirm and finalize your booking, please complete the remaining payment.</p>
    
    <div style="background: #f8f9fa; border-left: 4px solid #004aad; padding: 15px 20px; margin: 20px 0;">
      <p><strong>Booking ID:</strong> ${booking._id}</p>
      <p><strong>Amount Due:</strong> ₹${booking.remainingAmount.toLocaleString()}</p>
    </div>
    
    <a href="${process.env.FRONTEND_URL}/dashboard/user/tour-guide-booking/${booking._id}" 
       style="display: inline-block; background-color: #FF0000; color: white; padding: 12px 25px; 
              text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
      Complete Your Payment
    </a>
    
    <p style="color: #666; font-size: 14px; margin-top: 30px;">
      We look forward to providing you with an amazing experience.
    </p>
  `;

  await sendEmail(user.email, subject, htmlContent);
};

export const scheduleTourGuideReminders = () => {
  // Yeh job har din subah 8 baje run hoga
  cron.schedule('0 8 * * *', async () => {
    console.log("🔍 Checking for tour guide bookings needing payment reminders...");

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

    try {
      const bookingsToRemind = await TourGuideBooking.find({
        startDate: { $gte: tomorrow, $lt: dayAfterTomorrow },
        paymentStatus: "Advance Paid",
        status: "Upcoming",
        reminderSent: false,
      }).populate("user", "name email");

      console.log(`📧 Found ${bookingsToRemind.length} tour guide bookings to remind.`);

      for (const booking of bookingsToRemind) {
        await sendTourGuideReminderEmail(booking);
        booking.reminderSent = true;
        booking.reminderSentAt = new Date();
        await booking.save();
        console.log(`✅ Reminder sent for tour guide booking ${booking._id}`);
      }
    } catch (error) {
      console.error("❌ Error in tour guide reminder system:", error);
    }
  });
};