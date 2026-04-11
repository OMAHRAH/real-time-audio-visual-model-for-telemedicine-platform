import { useState } from "react";
import { Link } from "react-router-dom";
import API from "../api/api";

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

      if (res.data.user?.role !== "patient") {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("patientId");
        setError("Use a patient account to access this app.");
        return;
      }

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("patientId", res.data.user.id);
      localStorage.setItem("user", JSON.stringify(res.data.user));

      window.location.href = "/";
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-8 sm:px-6 sm:py-10">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl sm:p-8"
      >
        <p className="mb-2 text-center text-xs uppercase tracking-[0.3em] text-blue-600">
          Omar MedPlus
        </p>
        <h2 className="mb-2 text-center text-3xl font-bold tracking-tight">
          Patient Login
        </h2>
        <p className="mb-6 text-center text-sm leading-6 text-slate-500 sm:text-base">
          Manage vitals, appointments, and live doctor chat.
        </p>

        {error && (
          <p className="bg-red-50 text-red-700 p-3 rounded-xl mb-4 text-sm">
            {error}
          </p>
        )}

        <input
          type="email"
          placeholder="Email"
          className="mb-3 w-full rounded-xl border border-slate-200 p-3 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          className="mb-4 w-full rounded-xl border border-slate-200 p-3 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          disabled={loading}
          className="w-full rounded-xl bg-blue-600 p-3 font-medium text-white transition hover:bg-blue-700 disabled:bg-blue-300"
        >
          {loading ? "Logging in..." : "Login"}
        </button>

        <p className="mt-4 text-center text-sm text-slate-500">
          New here?{" "}
          <Link to="/register" className="text-blue-600 font-medium">
            Create an account
          </Link>
        </p>
      </form>
    </div>
  );
}

export default Login;
