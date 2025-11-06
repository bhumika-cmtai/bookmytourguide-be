import Otp from "../models/Otp.Model.js";
import { sendEmail } from "../utils/sendEmail.js";

export const sendOtp = async (req, res) => {
  try { // This 'try' block will now work correctly
    const { email } = req.body;
    if (!email)
      return res
        .status(400)
        .json({ success: false, message: "Email required" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await Otp.create({ email, otp, expiresAt });

    // If sendEmail() fails, it will throw an error, and execution
    // will jump to the 'catch' block below.
    await sendEmail(
      email,
      "Verify your email - BookMyTourGuide",
      `<p>Your OTP for verification is: <b>${otp}</b></p>
       <p>This OTP is valid for 10 minutes.</p>`
    );

    res.status(200).json({
      success: true,
      message: "OTP sent successfully to your email",
    });
    console.log(otp);

  } catch (error) { // The error from sendEmail will be caught here
    console.error(error);
    // This will now correctly send a failure message to the frontend
    res.status(500).json({ success: false, message: error.message });
  }
};