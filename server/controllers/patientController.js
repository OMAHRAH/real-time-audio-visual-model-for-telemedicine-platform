import Appointment from "../models/appointment.js";
import User from "../models/user.js";
import CareAssignment from "../models/CareAssignment.js";

export const getPatients = async (req, res) => {
  try {
    let patientFilter = { role: "patient" };

    if (req.user.role === "doctor") {
      const [activeAssignments, historicalAppointmentPatientIds] = await Promise.all([
        CareAssignment.find({
          doctor: req.user.id,
          status: "active",
        })
          .select("patient")
          .lean(),
        Appointment.distinct("patient", { doctor: req.user.id }),
      ]);
      const assignedPatientIds = [
        ...activeAssignments.map((assignment) => assignment.patient),
        ...historicalAppointmentPatientIds,
      ];

      patientFilter = {
        ...patientFilter,
        _id: { $in: assignedPatientIds },
      };
    }

    const patients = await User.find(patientFilter)
      .select("name email createdAt")
      .sort({ name: 1 })
      .lean();

    const patientIds = patients.map((patient) => patient._id);
    const appointmentQuery = { patient: { $in: patientIds } };

    if (req.user.role === "doctor") {
      appointmentQuery.doctor = req.user.id;
    }

    const appointments = await Appointment.find(appointmentQuery)
      .select("patient appointmentDate")
      .sort({ appointmentDate: -1 })
      .lean();

    const activeAssignments = await CareAssignment.find({
      patient: { $in: patientIds },
      status: "active",
    })
      .populate("doctor", "name email specialty isOnline")
      .lean();

    const lastAppointmentByPatient = new Map();
    const activeAssignmentByPatient = new Map();

    appointments.forEach((appointment) => {
      const patientId = appointment.patient.toString();

      if (!lastAppointmentByPatient.has(patientId)) {
        lastAppointmentByPatient.set(patientId, appointment.appointmentDate);
      }
    });

    activeAssignments.forEach((assignment) => {
      const patientId = assignment.patient.toString();

      if (!activeAssignmentByPatient.has(patientId)) {
        activeAssignmentByPatient.set(patientId, assignment);
      }
    });

    res.json({
      count: patients.length,
      patients: patients.map((patient) => ({
        ...patient,
        lastAppointment:
          lastAppointmentByPatient.get(patient._id.toString()) || null,
        activeAssignment: activeAssignmentByPatient.get(patient._id.toString()) || null,
      })),
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching patients",
      error: error.message,
    });
  }
};

export const getPatientById = async (req, res) => {
  try {
    if (req.user.role === "doctor") {
      const activeAssignment = await CareAssignment.findOne({
        doctor: req.user.id,
        patient: req.params.id,
        status: "active",
      }).lean();

      const hasHistoricalRelationship = await Appointment.exists({
        doctor: req.user.id,
        patient: req.params.id,
      });

      if (!activeAssignment && !hasHistoricalRelationship) {
        return res.status(403).json({
          message: "Patient is not assigned to this doctor",
        });
      }
    }

    const patient = await User.findOne({
      _id: req.params.id,
      role: "patient",
    })
      .select("name email createdAt")
      .lean();

    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    res.json({ patient });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching patient",
      error: error.message,
    });
  }
};
