import express from "express";
import UsersModel from "../models/Users.Model.js";
// import { upload } from "../middleware/uploads.js";

const app = express()
const router = express.Router();

/**
 * @route   GET /api/users
 * @desc    Get all users (supports pagination & search)
 * @access  Protected (admin only)
 */
app.use("/", (res,req)=>{
    console.log("blahblah")
})

export default router;
