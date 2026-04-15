const AUTH_TOKEN_KEY = "token";
const AUTH_USER_KEY = "user";

const getAuthStorage = () => window.sessionStorage;

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

export const getAuthToken = () => {
  return getAuthStorage().getItem(AUTH_TOKEN_KEY);
};

export const storeAuthSession = ({ token, user }) => {
  const storage = getAuthStorage();

  if (token) {
    storage.setItem(AUTH_TOKEN_KEY, token);
  }

  if (user) {
    storage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  }
};

export const clearAuthSession = () => {
  const storage = getAuthStorage();
  storage.removeItem(AUTH_TOKEN_KEY);
  storage.removeItem(AUTH_USER_KEY);
};

export const getCurrentUser = () => {
  const storage = getAuthStorage();
  const rawUser = storage.getItem(AUTH_USER_KEY);

  if (rawUser) {
    try {
      return JSON.parse(rawUser);
    } catch {
      storage.removeItem(AUTH_USER_KEY);
    }
  }

  const token = storage.getItem(AUTH_TOKEN_KEY);

  if (!token) return null;

  return decodeToken(token);
};

export const isDoctorUser = () => {
  const user = getCurrentUser();

  return user?.role === "doctor" || user?.role === "admin";
};

export const logout = () => {
  clearAuthSession();
};

export const storeCurrentUser = (user) => {
  if (!user) {
    return;
  }

  getAuthStorage().setItem(AUTH_USER_KEY, JSON.stringify(user));
};
