import { useState } from "react";
import API from "../api/api";

function Register(){

  const [name,setName] = useState("");
  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");

  const handleRegister = async (e)=>{
    e.preventDefault();

    try{
      await API.post("/auth/register",{
        name,
        email,
        password,
        role:"patient"
      });

      alert("Account created");
      window.location.href="/login";
    }
    catch(err){
      alert("Registration failed");
    }
  };

  return(
    <div className="min-h-screen flex items-center justify-center bg-gray-100">

      <form
        onSubmit={handleRegister}
        className="bg-white p-8 rounded-xl shadow w-80"
      >

        <h2 className="text-2xl font-bold mb-6 text-center">
          Patient Register
        </h2>

        <input
          placeholder="Name"
          className="w-full border p-2 mb-3 rounded"
          onChange={(e)=>setName(e.target.value)}
        />

        <input
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
          Register
        </button>

      </form>
    </div>
  )
}

export default Register