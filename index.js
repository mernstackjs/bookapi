require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const connectDB = require("./db/mongoose");
const cors = require("cors");
const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: "https://mernstackjs.github.io",
    credentials: true,
  })
);
// Connect to MongoDB
connectDB();
// Define User schema
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
});

const User = mongoose.model("User", userSchema);

// Register API
app.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ email, password: hashedPassword });
    await user.save();
    res.status(201).send("User registered successfully");
  } catch (error) {
    res.status(500).send(error.message);
  }
});

// Login API
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      throw new Error("User not found");
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new Error("Invalid password");
    }
    const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    res.cookie("token", token, {
      httpOnly: true,
      secure: true, // Ensures the cookie is only sent over HTTPS
      sameSite: "None", // Allows cross-origin cookies
    });

    res.status(200).send("Login successful");
  } catch (error) {
    res.status(401).send(error.message);
  }
});

// Logout API
app.post("/logout", (req, res) => {
  res.clearCookie("token");
  res.status(200).send("Logout successful");
});

app.get("/users", async (req, res) => {
  const users = await User.find();
  res.json(users);
});

// Protected route example
app.get("/protected", verifyToken, (req, res) => {
  jwt.verify(req.token, process.env.JWT_SECRET, (err, authData) => {
    if (err) {
      res.sendStatus(403);
    } else {
      res.json({
        message: "Protected route accessed successfully",
        authData,
      });
    }
  });
});

// Function to verify JWT token
function verifyToken(req, res, next) {
  const token = req.cookies.token;
  if (typeof token !== "undefined") {
    req.token = token;
    next();
  } else {
    res.sendStatus(403);
  }
}

// Start the server
const PORT = process.env.PORT;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
