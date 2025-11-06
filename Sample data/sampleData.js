import dotenv from "dotenv";

dotenv.config();

// Import your models
import User from "../models/Users.Model.js";
import Testimonial from "../models/testimonial.model.js";
import Lead from "../models/Leads.Model.js";
import Blogs from "../models/Blogs.Model.js";
import Coupons from "../models/Coupons.Model.js";
import Package from "../models/package.model.js";
import connectDB from "../config/db.js";

// Add other models here as needed, e.g., Jobs, Internships, Companies

// MongoDB URI
const MONGO_URI = process.env.MONOGO_URI;

// Sample Data
const users = [
  { name: "Vivek Joshii", email: "vivek@example.com", password: "password123", role: "admin" },
  { name: "John Doe", email: "john@example.com", password: "password123", role: "user" },
];

const testimonials = [
  { name: "Alice Smith", message: "Great service!", rating: 5, position: "CEO, Company A" },
  { name: "Bob Johnson", message: "Very satisfied.", rating: 4, position: "Manager, Company B" },
];

const leads = [
  { name: "Charlie Brown", email: "charlie@example.com", phone: "1234567890", message: "Interested in your services", source: "Website" },
  { name: "Diana Prince", email: "diana@example.com", phone: "0987654321", message: "Looking for collaboration", source: "Website" },
];


const blogs = [
  {
    title: "How to Boost Your Career in 2025",
    slug: "how-to-boost-your-career-2025",
    content: "This blog covers actionable tips to advance your career, improve skills, and increase your professional growth.",
    author: "68ea2c7d453989e32b83c9d1",
    thumbnail: "https://example.com/images/blog1.jpg",
    tags: ["career", "growth", "skills"],
    published: true,
    publishedAt: new Date("2025-10-01"),
  },
  {
    title: "Top 10 Programming Languages to Learn",
    slug: "top-10-programming-languages-to-learn",
    content: "A detailed overview of the most popular programming languages and why they are in demand in 2025.",
    author: "68ea2c7d453989e32b83c9d1",
    thumbnail: "https://example.com/images/blog2.jpg",
    tags: ["programming", "technology", "coding"],
    published: true,
    publishedAt: new Date("2025-09-20"),
  },
  {
    title: "Remote Work: How to Stay Productive",
    slug: "remote-work-how-to-stay-productive",
    content: "Tips and tools to maintain productivity and balance while working remotely from anywhere in the world.",
    author: "68ea2c7d453989e32b83c9d1",
    thumbnail: "https://example.com/images/blog3.jpg",
    tags: ["remote work", "productivity", "tips"],
    published: true,
    publishedAt: new Date("2025-08-15"),
  },
  {
    title: "Understanding AI and Machine Learning",
    slug: "understanding-ai-and-machine-learning",
    content: "An introductory guide to AI and ML, including applications, concepts, and future trends.",
    author: "68ea2c7d453989e32b83c9d1",
    thumbnail: "https://example.com/images/blog4.jpg",
    tags: ["AI", "machine learning", "technology"],
    published: false,
  },
  {
    title: "Personal Finance Tips for Young Professionals",
    slug: "personal-finance-tips-for-young-professionals",
    content: "Essential tips on budgeting, saving, and investing for young professionals starting their careers.",
    author: "68ea2c7d453989e32b83c9d1",
    thumbnail: "https://example.com/images/blog5.jpg",
    tags: ["finance", "budgeting", "investing"],
    published: true,
    publishedAt: new Date("2025-07-30"),
  },
];




const coupons = [
  {
    code: "WELCOME10",
    discountType: "percentage",
    discountValue: 10,
    minPurchase: 0,
    expiryDate: new Date("2025-12-31"),
    isActive: true,
    usageCount: 0,
    maxUsage: 1,
  },
  {
    code: "SUMMER20",
    discountType: "percentage",
    discountValue: 20,
    minPurchase: 100, // optional, example minimum purchase
    expiryDate: new Date("2025-06-30"),
    isActive: true,
    usageCount: 0,
    maxUsage: 5,
  },
  {
    code: "FLAT50",
    discountType: "flat",
    discountValue: 50,
    minPurchase: 200,
    expiryDate: new Date("2025-08-31"),
    isActive: true,
    usageCount: 0,
    maxUsage: 3,
  },
];


const packages = [
  {
    title: "Basic Package",
    slug: "basic-package",
    description: "This is a basic package suitable for beginners.",
    price: 99,
    duration: "5 Days / 4 Nights",
    location: "Goa, India",
    images: [
      "https://example.com/images/basic1.jpg",
      "https://example.com/images/basic2.jpg"
    ],
    highlights: ["Beach visit", "City tour", "Welcome dinner"],
    inclusions: ["Accommodation", "Breakfast", "Airport transfer"],
    exclusions: ["Flight tickets", "Personal expenses"],
    isActive: true,
  },
  {
    title: "Premium Package",
    slug: "premium-package",
    description: "Premium package with advanced features and support.",
    price: 199,
    duration: "7 Days / 6 Nights",
    location: "Kerala, India",
    images: [
      "https://example.com/images/premium1.jpg",
      "https://example.com/images/premium2.jpg"
    ],
    highlights: ["Houseboat stay", "Ayurvedic spa", "Guided tours"],
    inclusions: ["Luxury accommodation", "All meals", "Local transportation"],
    exclusions: ["Flights", "Personal expenses", "Insurance"],
    isActive: true,
  },
];




// Main seeding function
const seedDatabase = async () => {
  try {
    const url = process.env.MONOGO_URI;
    connectDB(url);

    console.log("MongoDB Connected...");

    // Clear existing data
    await User.deleteMany();
    await Testimonial.deleteMany();
    await Lead.deleteMany();
    await Blogs.deleteMany();
    await Coupons.deleteMany();
    await Package.deleteMany();

    // Clear other collections similarly

    // Insert sample data
    await User.insertMany(users);
    await Testimonial.insertMany(testimonials);
    await Lead.insertMany(leads);
    await Blogs.insertMany(blogs);
    await Coupons.insertMany(coupons);
    await Package.insertMany(packages);

    // Insert other collections similarly

    console.log("Sample data inserted successfully!");
    process.exit();
  } catch (err) {
    console.error("Error seeding database:", err);
    process.exit(1);
  }
};

seedDatabase();
