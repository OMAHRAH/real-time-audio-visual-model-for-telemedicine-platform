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

const normalizeOptionalString = (value) =>
  typeof value === "string" ? value.trim() : "";

const normalizeOptionalNumber = (value) => {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};

const normalizeOptionalDate = (value) => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const buildProfilePayload = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  hospitalNumber: user.hospitalNumber || "",
  role: user.role,
  specialty: user.specialty || "",
  timezone: user.timezone || "Africa/Lagos",
  medicalProfile: {
    dateOfBirth: user.medicalProfile?.dateOfBirth || null,
    gender: user.medicalProfile?.gender || "",
    bloodGroup: user.medicalProfile?.bloodGroup || "",
    heightCm: user.medicalProfile?.heightCm ?? null,
    weightKg: user.medicalProfile?.weightKg ?? null,
    emergencyContact: {
      name: user.medicalProfile?.emergencyContact?.name || "",
      phone: user.medicalProfile?.emergencyContact?.phone || "",
      relationship: user.medicalProfile?.emergencyContact?.relationship || "",
    },
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
        "name email hospitalNumber role specialty timezone medicalProfile createdAt workloadStatus isOnline",
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
        dateOfBirth: normalizeOptionalDate(req.body.medicalProfile?.dateOfBirth),
        gender: normalizeOptionalString(req.body.medicalProfile?.gender),
        bloodGroup: normalizeOptionalString(
          req.body.medicalProfile?.bloodGroup,
        ).toUpperCase(),
        heightCm: normalizeOptionalNumber(req.body.medicalProfile?.heightCm),
        weightKg: normalizeOptionalNumber(req.body.medicalProfile?.weightKg),
        emergencyContact: {
          name: normalizeOptionalString(
            req.body.medicalProfile?.emergencyContact?.name,
          ),
          phone: normalizeOptionalString(
            req.body.medicalProfile?.emergencyContact?.phone,
          ),
          relationship: normalizeOptionalString(
            req.body.medicalProfile?.emergencyContact?.relationship,
          ),
        },
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
