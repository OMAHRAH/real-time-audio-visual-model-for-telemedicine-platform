import User from "../models/user.js";

export const getDoctors = async (req, res) => {
  try {
    const search = req.query.q?.trim();
    const onlineOnly = req.query.online === "true";
    const filter = {
      role: "doctor",
    };

    if (onlineOnly) {
      filter.isOnline = { $ne: false };
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { specialty: { $regex: search, $options: "i" } },
      ];
    }

    const doctors = await User.find(filter)
      .select("name email specialty isOnline createdAt")
      .sort({ isOnline: -1, name: 1 })
      .lean();

    res.json({
      count: doctors.length,
      doctors: doctors.map((doctor) => ({
        ...doctor,
        isOnline: doctor.isOnline !== false,
        specialty: doctor.specialty || "General Medicine",
      })),
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching doctors",
      error: error.message,
    });
  }
};

export const updateAvailability = async (req, res) => {
  try {
    const doctor = await User.findOne({
      _id: req.user.id,
      role: "doctor",
    });

    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    doctor.isOnline = Boolean(req.body.isOnline);
    await doctor.save();

    res.json({
      message: `Doctor is now ${doctor.isOnline ? "online" : "offline"}`,
      doctor: {
        id: doctor._id,
        name: doctor.name,
        email: doctor.email,
        specialty: doctor.specialty || "General Medicine",
        isOnline: doctor.isOnline,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Error updating availability",
      error: error.message,
    });
  }
};
