import User from "../models/user.js";
import {
  getDoctorStatusSortRank,
  getDoctorWorkloadStatusLabel,
  isDoctorAcceptingNewPatients,
  isDoctorOnlineFromStatus,
  normalizeDoctorWorkloadStatus,
} from "../utils/doctorStatus.js";

export const getDoctors = async (req, res) => {
  try {
    const search = req.query.q?.trim();
    const onlineOnly = req.query.online === "true";
    const availableOnly = req.query.available === "true";
    const statusFilter = req.query.status?.trim();
    const filter = {
      role: "doctor",
    };

    if (onlineOnly) {
      filter.workloadStatus = { $ne: "offline" };
    }

    if (availableOnly) {
      filter.workloadStatus = "available";
    }

    if (statusFilter) {
      filter.workloadStatus = normalizeDoctorWorkloadStatus(statusFilter);
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { specialty: { $regex: search, $options: "i" } },
      ];
    }

    const doctors = await User.find(filter)
      .select("name email specialty isOnline workloadStatus timezone createdAt")
      .lean();

    res.json({
      count: doctors.length,
      doctors: doctors
        .map((doctor) => {
          const workloadStatus = normalizeDoctorWorkloadStatus(
            doctor.workloadStatus,
          );

          return {
            ...doctor,
            isOnline: isDoctorOnlineFromStatus(workloadStatus),
            specialty: doctor.specialty || "General Medicine",
            timezone: doctor.timezone || "Africa/Lagos",
            workloadStatus,
            workloadStatusLabel: getDoctorWorkloadStatusLabel(workloadStatus),
            acceptingNewPatients: isDoctorAcceptingNewPatients(workloadStatus),
            statusSortRank: getDoctorStatusSortRank(workloadStatus),
          };
        })
        .sort((left, right) => {
          const rankDiff = right.statusSortRank - left.statusSortRank;

          if (rankDiff !== 0) {
            return rankDiff;
          }

          return left.name.localeCompare(right.name);
        }),
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

    const requestedStatus =
      typeof req.body.workloadStatus === "string"
        ? req.body.workloadStatus
        : req.body.isOnline === false
          ? "offline"
          : req.body.isOnline === true
            ? "available"
            : doctor.workloadStatus;

    const workloadStatus = normalizeDoctorWorkloadStatus(
      requestedStatus,
      doctor.workloadStatus || "available",
    );

    doctor.workloadStatus = workloadStatus;
    doctor.isOnline = isDoctorOnlineFromStatus(workloadStatus);
    await doctor.save();

    res.json({
      message: `Doctor status updated to ${getDoctorWorkloadStatusLabel(workloadStatus)}`,
      doctor: {
        id: doctor._id,
        name: doctor.name,
        email: doctor.email,
        specialty: doctor.specialty || "General Medicine",
        timezone: doctor.timezone || "Africa/Lagos",
        isOnline: doctor.isOnline,
        workloadStatus,
        workloadStatusLabel: getDoctorWorkloadStatusLabel(workloadStatus),
        acceptingNewPatients: isDoctorAcceptingNewPatients(workloadStatus),
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Error updating availability",
      error: error.message,
    });
  }
};
