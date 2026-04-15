const decodeToken = (token) => {
  try {
    const payload = token.split(".")[1];
    const normalizedPayload = payload.replace(/-/g, "+").replace(/_/g, "/");
    const paddedPayload = normalizedPayload.padEnd(
      Math.ceil(normalizedPayload.length / 4) * 4,
      "=",
    );

    return JSON.parse(atob(paddedPayload));
  } catch {
    return null;
  }
};

export const getStoredUser = () => {
  const rawUser = localStorage.getItem("user");

  if (rawUser) {
    try {
      return JSON.parse(rawUser);
    } catch {
      localStorage.removeItem("user");
    }
  }

  const token = localStorage.getItem("token");
  return token ? decodeToken(token) : null;
};

export const getPatientId = () => {
  return (
    localStorage.getItem("patientId") ||
    getStoredUser()?.id ||
    getStoredUser()?._id ||
    null
  );
};

export const isPatientUser = () => {
  const user = getStoredUser();
  return user?.role === "patient";
};

export const logout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("patientId");
};

export const storeStoredUser = (user) => {
  if (!user) {
    return;
  }

  localStorage.setItem("user", JSON.stringify(user));
};
