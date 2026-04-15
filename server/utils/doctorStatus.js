export const DOCTOR_WORKLOAD_STATUSES = [
  "available",
  "busy",
  "in_consultation",
  "on_break",
  "offline",
];

const STATUS_LABELS = {
  available: "Available",
  busy: "Busy",
  in_consultation: "In Consultation",
  on_break: "On Break",
  offline: "Offline",
};

const STATUS_SORT_RANK = {
  available: 4,
  busy: 3,
  in_consultation: 2,
  on_break: 1,
  offline: 0,
};

export const normalizeDoctorWorkloadStatus = (
  value,
  fallback = "available",
) => {
  const normalizedValue =
    typeof value === "string" ? value.trim().toLowerCase() : "";

  return DOCTOR_WORKLOAD_STATUSES.includes(normalizedValue)
    ? normalizedValue
    : fallback;
};

export const getDoctorWorkloadStatusLabel = (status) => {
  const normalizedStatus = normalizeDoctorWorkloadStatus(status);
  return STATUS_LABELS[normalizedStatus] || STATUS_LABELS.available;
};

export const getDoctorStatusSortRank = (status) => {
  const normalizedStatus = normalizeDoctorWorkloadStatus(status);
  return STATUS_SORT_RANK[normalizedStatus] ?? STATUS_SORT_RANK.available;
};

export const isDoctorOnlineFromStatus = (status) =>
  normalizeDoctorWorkloadStatus(status) !== "offline";

export const isDoctorAcceptingNewPatients = (status) =>
  normalizeDoctorWorkloadStatus(status) === "available";
