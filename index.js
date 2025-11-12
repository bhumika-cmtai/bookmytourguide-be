import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import cron from "node-cron";
import { checkAndSendReminders } from "./utils/paymentReminder.js";

// // Routers
import packageRoutes from "./routes/Package.Routes.js";
import blogRoutes from "./routes/Blogs.Routes.js";
import testimonialRoutes from "./routes/Testimonial.Routes.js";
import leadRoutes from "./routes/Leads.Routes.js";
import userRoutes from "./routes/Users.Routes.js";
import couponRoutes from "./routes/Coupons.Routes.js";
import authRoutes from "./routes/Auth.Routes.js";
import locationRoutes from "./routes/Location.routes.js";
import languageRoutes from "./routes/Language.routes.js";
import subscriptionRoutes from "./routes/Subscription.routes.js";
// import guideRoutes from "./routes/Guide.routes.js";
import guideRoutes from "./routes/Guide.routes.js";
import bookingRoutes from "./routes/booking.routes.js";
import touguideRoutes from "./routes/TourGuideBooking.routes.js";
import userBookingRoutes from "./routes/userBooking.routes.js";
import cookieParser from "cookie-parser";
import { errorHandler, notFound } from "./middleware/errorMiddleware.js";
import customTourRequestRoutes from "./routes/customTourRequest.routes.js";

cron.schedule("0 10 * * *", () => {
  console.log("⏰ Running daily payment reminder check...");
  checkAndSendReminders();
});

dotenv.config();
const app = express();

// Middleware
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
    optionsSuccessStatus: 200,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Database connection
const uri = process.env.MONOGO_URI;
connectDB(uri);

// Default route
app.get("/", (req, res) => {
  res.send("Tour Guide API is running ✅");
});

// API routes
app.use("/api/packages", packageRoutes);
app.use("/api/blogs", blogRoutes);
app.use("/api/testimonials", testimonialRoutes);
app.use("/api/leads", leadRoutes);
app.use("/api/users", userRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/locations", locationRoutes);
app.use("/api/languages", languageRoutes);
app.use("/api/packages", packageRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/guides", guideRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/tourguide", touguideRoutes);
app.use("/api/userBooking", userBookingRoutes);
app.use("/uploads", express.static("uploads"));
app.use("/api/custom-tour-requests", customTourRequestRoutes);

//Middleware for handling errors:
app.use(notFound);
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
