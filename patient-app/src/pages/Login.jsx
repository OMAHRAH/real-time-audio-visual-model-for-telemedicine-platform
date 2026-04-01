import { useState } from "react";
import API from "../api/api";

function Login() {
  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();

    try{
      const res = await API.post("/auth/login",{
        email,
        password
      });

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("patientId", res.data.user.id);

      window.location.href = "/";
    }
    catch(err){
      alert("Login failed");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">

      <form
        onSubmit={handleLogin}
        className="bg-white p-8 rounded-xl shadow w-80"
      >

        <h2 className="text-2xl font-bold mb-6 text-center">
          Patient Login
        </h2>

        <input
          type="email"
          placeholder="Email"
          className="w-full border p-2 mb-3 rounded"
          onChange={(e)=>setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          className="w-full border p-2 mb-4 rounded"
          onChange={(e)=>setPassword(e.target.value)}
        />

        <button className="w-full bg-blue-600 text-white p-2 rounded">
          Login
        </button>

      </form>
    </div>
  );
}

export default Login;