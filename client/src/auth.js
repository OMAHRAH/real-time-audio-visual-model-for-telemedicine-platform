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

export const getCurrentUser = () => {
  const rawUser = localStorage.getItem("user");

  if (rawUser) {
    try {
      return JSON.parse(rawUser);
    } catch {
      localStorage.removeItem("user");
    }
  }

  const token = localStorage.getItem("token");

  if (!token) return null;

  return decodeToken(token);
};

export const isDoctorUser = () => {
  const user = getCurrentUser();

  return user?.role === "doctor" || user?.role === "admin";
};

export const logout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
};

export const storeCurrentUser = (user) => {
  localStorage.setItem("user", JSON.stringify(user));
};
