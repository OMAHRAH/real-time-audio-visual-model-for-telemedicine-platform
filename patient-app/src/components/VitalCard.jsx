export default function VitalCard({ title, value }) {
    return (
      <div className="bg-white shadow rounded-xl p-4">
        <h3 className="text-gray-500 text-sm">{title}</h3>
  
        <p className="text-2xl font-semibold mt-2">
          {value}
        </p>
      </div>
    );
  }