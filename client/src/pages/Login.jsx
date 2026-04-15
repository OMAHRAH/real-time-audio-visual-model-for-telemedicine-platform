import { useState } from "react";
import API from "../api/api";
import { clearAuthSession, storeAuthSession } from "../auth";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await API.post("/auth/login", {
        email,
        password,
      });

      const role = res.data.user?.role;

      if (role !== "doctor" && role !== "admin") {
        clearAuthSession();
        setError("Use a doctor or admin account for this dashboard.");
        return;
      }

      storeAuthSession({
        token: res.data.token,
        user: res.data.user,
      });

      window.location.href = "/";
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
      <form
        onSubmit={handleLogin}
        className="bg-white p-8 rounded-xl shadow w-full max-w-sm"
      >
        <h1 className="text-2xl font-bold mb-2 text-center">
          Doctor Dashboard
        </h1>

        <p className="text-gray-500 text-center mb-6">
          Log in with a doctor or admin account.
        </p>

        {error && (
          <p className="bg-red-50 text-red-700 p-3 rounded mb-4 text-sm">
            {error}
          </p>
        )}

        <input
          type="email"
          placeholder="Email"
          className="w-full border p-2 mb-3 rounded"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          className="w-full border p-2 mb-4 rounded"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          disabled={loading}
          className="w-full bg-blue-700 text-white p-2 rounded disabled:bg-blue-300"
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
    </div>
  );
}

export default Login;
