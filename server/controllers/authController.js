import User from "../models/user.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const VALID_ROLES = new Set(["patient", "doctor", "admin"]);
const STAFF_ROLES = new Set(["doctor", "admin"]);

// REGISTER USER
export const register = async (req, res) => {
  try {
    const { name, email, password, role, specialty, staffBootstrapKey } = req.body;
    const normalizedRole =
      typeof role === "string" ? role.trim().toLowerCase() : "patient";

    if (!VALID_ROLES.has(normalizedRole)) {
      return res.status(400).json({ message: "Invalid role selected" });
    }

    if (STAFF_ROLES.has(normalizedRole)) {
      const publicStaffRegistrationAllowed =
        process.env.ALLOW_PUBLIC_STAFF_REGISTRATION === "true";
      const expectedBootstrapKey = process.env.STAFF_BOOTSTRAP_KEY?.trim();
      const providedBootstrapKey =
        typeof staffBootstrapKey === "string"
          ? staffBootstrapKey.trim()
          : "";

      if (
        !publicStaffRegistrationAllowed &&
        (!expectedBootstrapKey || providedBootstrapKey !== expectedBootstrapKey)
      ) {
        return res.status(403).json({
          message:
            "Staff registration is disabled on this deployment. Use the staff bootstrap key or create the account manually.",
        });
      }
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: normalizedRole,
      specialty,
    });

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        specialty: user.specialty || "",
        isOnline: user.isOnline !== false,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// LOGIN USER
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Create JWT
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        role: user.role,
        name: user.name,
        email: user.email,
        specialty: user.specialty || "",
        isOnline: user.isOnline !== false,
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
