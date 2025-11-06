import express from "express";
import {
  loginUser,
  logoutUser,
  getCurrentUser,
  verifyOtpAndRegister,
  refreshToken,
} from "../controllers/auth.controller.js";
import { upload } from "../middleware/uploads.js";
import { sendOtp } from "../controllers/Otp.controller.js";
import { protect } from "../middleware/authMiddleware.js";

const authRouter = express.Router();

// Routes
// Step 1: Send OTP
authRouter.post("/send-otp", sendOtp);

// Step 2: Verify OTP & Register
authRouter.post(
  "/verify-otp",
  upload.fields([
    { name: "photo", maxCount: 1 },
    { name: "license", maxCount: 1 },
  ]),
  verifyOtpAndRegister
);

authRouter.post("/login", loginUser);

authRouter.post("/logout", protect, logoutUser);
authRouter.get("/me", getCurrentUser);
authRouter.post("/refresh", refreshToken);

export default authRouter;
