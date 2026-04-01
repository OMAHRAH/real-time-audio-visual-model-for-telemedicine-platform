import Alert from "../models/Alert.js";

export const getAlerts = async (req, res) => {
  try {
    const alerts = await Alert.find()
      .populate("patient", "name email")
      .sort({ createdAt: -1 });

    res.json(alerts);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};
