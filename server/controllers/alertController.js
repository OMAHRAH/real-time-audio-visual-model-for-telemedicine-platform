import Alert from "../models/Alert.js";
import User from "../models/user.js";

export const getAlerts = async (req, res) => {
  try {
    const query = {};

    if (req.user?.role === "doctor") {
      query.doctor = req.user.id;
    }

    if (req.user?.role === "patient") {
      query.patient = req.user.id;
    }

    const alerts = await Alert.find(query)
      .populate("patient", "name email")
      .populate("doctor", "name email specialty isOnline")
      .sort({ createdAt: -1 });

    res.json(alerts);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

export const createEmergencyAlert = async (req, res) => {
  try {
    if (req.user.role !== "patient") {
      return res
        .status(403)
        .json({ message: "Only patients can send emergency alerts" });
    }

    let doctorId = req.body.doctorId;

    if (!doctorId) {
      const fallbackDoctor = await User.findOne({ role: "doctor" }).sort({
        isOnline: -1,
        name: 1,
      });

      if (!fallbackDoctor) {
        return res.status(404).json({ message: "No doctor is available" });
      }

      doctorId = fallbackDoctor._id;
    }

    const doctor = await User.findOne({
      _id: doctorId,
      role: "doctor",
    });

    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    const alert = await Alert.create({
      patient: req.user.id,
      doctor: doctor._id,
      message:
        req.body.message ||
        "Emergency assistance requested by patient. Please respond immediately.",
      type: "emergency",
      status: "active",
    });

    const populatedAlert = await Alert.findById(alert._id)
      .populate("patient", "name email")
      .populate("doctor", "name email specialty isOnline");

    if (req.io) {
      req.io.emit("emergencyAlert", populatedAlert);
    }

    res.status(201).json({
      message: "Emergency alert sent",
      alert: populatedAlert,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error sending emergency alert",
      error: error.message,
    });
  }
};
