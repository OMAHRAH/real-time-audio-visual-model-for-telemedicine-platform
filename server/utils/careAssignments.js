import CareAssignment from "../models/CareAssignment.js";

export const getActiveAssignment = (patientId) => {
  return CareAssignment.findOne({
    patient: patientId,
    status: "active",
  });
};

export const upsertActiveAssignment = async ({
  patientId,
  doctorId,
  assignedBy = null,
  source = "manual",
  note = "",
}) => {
  if (!patientId || !doctorId) {
    return null;
  }

  const currentActiveAssignment = await CareAssignment.findOne({
    patient: patientId,
    status: "active",
  });

  if (currentActiveAssignment) {
    if (currentActiveAssignment.doctor.toString() === doctorId.toString()) {
      currentActiveAssignment.assignedBy = assignedBy || currentActiveAssignment.assignedBy;
      currentActiveAssignment.source = source || currentActiveAssignment.source;
      currentActiveAssignment.note = note || currentActiveAssignment.note;
      currentActiveAssignment.lastRoutedAt = new Date();
      await currentActiveAssignment.save();
      return currentActiveAssignment;
    }

    currentActiveAssignment.status = "transferred";
    await currentActiveAssignment.save();
  }

  const assignment = await CareAssignment.create({
    patient: patientId,
    doctor: doctorId,
    assignedBy,
    source,
    note,
    status: "active",
    lastRoutedAt: new Date(),
  });

  return assignment;
};
