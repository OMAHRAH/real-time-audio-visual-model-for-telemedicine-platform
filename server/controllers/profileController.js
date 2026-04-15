import User from "../models/user.js";

const normalizeList = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || "").trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

const buildProfilePayload = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  specialty: user.specialty || "",
  timezone: user.timezone || "Africa/Lagos",
  medicalProfile: {
    allergies: normalizeList(user.medicalProfile?.allergies),
    medications: normalizeList(user.medicalProfile?.medications),
    medicalHistory: normalizeList(user.medicalProfile?.medicalHistory),
    ongoingConditions: normalizeList(user.medicalProfile?.ongoingConditions),
  },
});

export const getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select(
        "name email role specialty timezone medicalProfile createdAt workloadStatus isOnline",
      )
      .lean();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      profile: buildProfilePayload(user),
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching profile",
      error: error.message,
    });
  }
};

export const updateMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (typeof req.body.name === "string" && req.body.name.trim()) {
      user.name = req.body.name.trim();
    }

    if (typeof req.body.timezone === "string" && req.body.timezone.trim()) {
      user.timezone = req.body.timezone.trim();
    }

    if (req.user.role === "patient") {
      user.medicalProfile = {
        allergies: normalizeList(req.body.medicalProfile?.allergies),
        medications: normalizeList(req.body.medicalProfile?.medications),
        medicalHistory: normalizeList(req.body.medicalProfile?.medicalHistory),
        ongoingConditions: normalizeList(
          req.body.medicalProfile?.ongoingConditions,
        ),
      };
    }

    await user.save();

    res.json({
      message: "Profile updated",
      profile: buildProfilePayload(user),
    });
  } catch (error) {
    res.status(500).json({
      message: "Error updating profile",
      error: error.message,
    });
  }
};
