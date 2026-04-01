import { useState } from "react";
import API from "../api/api";

export default function MyVitals() {

  const [systolic,setSystolic] = useState("");
  const [diastolic,setDiastolic] = useState("");
  const [glucose,setGlucose] = useState("");

  const patientId = localStorage.getItem("patientId");

  async function submitVitals(e){
    e.preventDefault();

    try{

      await API.post("/vitals",{
        patient: patientId,
        doctor: "69a66f3c5045f6e26c627c88",
        systolic,
        diastolic,
        glucoseLevel: glucose,
        type:"combined"
      });

      alert("Vitals submitted");

      setSystolic("");
      setDiastolic("");
      setGlucose("");

    } catch(err){
      console.error(err);
      alert("Error submitting vitals");
    }
  }

  return (

    <div className="min-h-screen bg-gray-100 flex justify-center pt-10">

      <form
        onSubmit={submitVitals}
        className="bg-white shadow-lg rounded-xl p-8 w-96"
      >

        <h2 className="text-xl font-semibold mb-6">
          Submit Vital Readings
        </h2>

        <input
          type="number"
          placeholder="Systolic (e.g. 120)"
          value={systolic}
          onChange={(e)=>setSystolic(e.target.value)}
          className="w-full border p-2 rounded mb-3"
        />

        <input
          type="number"
          placeholder="Diastolic (e.g. 80)"
          value={diastolic}
          onChange={(e)=>setDiastolic(e.target.value)}
          className="w-full border p-2 rounded mb-3"
        />

        <input
          type="number"
          placeholder="Glucose Level"
          value={glucose}
          onChange={(e)=>setGlucose(e.target.value)}
          className="w-full border p-2 rounded mb-4"
        />

        <button
          className="w-full bg-blue-600 text-white py-2 rounded"
        >
          Submit
        </button>

      </form>

    </div>
  )
}