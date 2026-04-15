const MINUTE_IN_MS = 60 * 1000;

const STATUS_LABELS = {
  on_track: "On track",
  due_soon: "Due soon",
  overdue: "Overdue",
  escalated: "Escalated",
};

export const SLA_RULES = {
  appointmentIntake: {
    label: "Appointment intake",
    objective: "Assign a doctor",
    warningMinutes: 15,
    dueMinutes: 30,
    escalationMinutes: 60,
  },
  appointmentResponse: {
    label: "Appointment response",
    objective: "Doctor response",
    warningMinutes: 30,
    dueMinutes: 60,
    escalationMinutes: 120,
  },
  criticalVitalIntake: {
    label: "Critical vital routing",
    objective: "Assign a doctor",
    warningMinutes: 3,
    dueMinutes: 5,
    escalationMinutes: 10,
  },
  criticalVitalResponse: {
    label: "Critical vital response",
    objective: "Doctor response",
    warningMinutes: 5,
    dueMinutes: 10,
    escalationMinutes: 20,
  },
  emergencyIntake: {
    label: "Emergency routing",
    objective: "Assign a doctor",
    warningMinutes: 1,
    dueMinutes: 2,
    escalationMinutes: 5,
  },
  emergencyResponse: {
    label: "Emergency response",
    objective: "Doctor response",
    warningMinutes: 3,
    dueMinutes: 5,
    escalationMinutes: 10,
  },
};

const formatDuration = (valueMs) => {
  const totalMinutes = Math.max(0, Math.ceil(valueMs / MINUTE_IN_MS));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours && minutes) {
    return `${hours}h ${minutes}m`;
  }

  if (hours) {
    return `${hours}h`;
  }

  return `${minutes}m`;
};

export const getSlaSeverityRank = (status) => {
  switch (status) {
    case "escalated":
      return 3;
    case "overdue":
      return 2;
    case "due_soon":
      return 1;
    default:
      return 0;
  }
};

export const evaluateSla = ({ startedAt, rule, now = new Date() }) => {
  const openedAt = new Date(startedAt);

  if (Number.isNaN(openedAt.getTime())) {
    return {
      status: "unknown",
      statusLabel: "Unknown",
      objective: rule?.objective || "Response",
      ruleLabel: rule?.label || "Unspecified",
      ageLabel: "Unavailable",
      deadlineLabel: "Unavailable",
      sortRank: -1,
      isBreached: false,
      isEscalated: false,
      startedAt: null,
      warningAt: null,
      dueAt: null,
      escalatesAt: null,
    };
  }

  const warningMs = (rule.warningMinutes || 0) * MINUTE_IN_MS;
  const dueMs = (rule.dueMinutes || 0) * MINUTE_IN_MS;
  const escalationMs = (rule.escalationMinutes || 0) * MINUTE_IN_MS;
  const elapsedMs = Math.max(0, now.getTime() - openedAt.getTime());

  let status = "on_track";

  if (elapsedMs >= escalationMs) {
    status = "escalated";
  } else if (elapsedMs >= dueMs) {
    status = "overdue";
  } else if (elapsedMs >= warningMs) {
    status = "due_soon";
  }

  const warningAt = new Date(openedAt.getTime() + warningMs);
  const dueAt = new Date(openedAt.getTime() + dueMs);
  const escalatesAt = new Date(openedAt.getTime() + escalationMs);

  let deadlineLabel = `Due in ${formatDuration(dueMs - elapsedMs)}`;

  if (status === "overdue") {
    deadlineLabel = `Overdue by ${formatDuration(elapsedMs - dueMs)}`;
  }

  if (status === "escalated") {
    deadlineLabel = `Escalated ${formatDuration(elapsedMs - escalationMs)} ago`;
  }

  return {
    status,
    statusLabel: STATUS_LABELS[status],
    objective: rule.objective,
    ruleLabel: rule.label,
    ageMinutes: Math.ceil(elapsedMs / MINUTE_IN_MS),
    ageLabel: `Open ${formatDuration(elapsedMs)}`,
    deadlineLabel,
    sortRank: getSlaSeverityRank(status),
    isBreached: status === "overdue" || status === "escalated",
    isEscalated: status === "escalated",
    startedAt: openedAt,
    warningAt,
    dueAt,
    escalatesAt,
  };
};
