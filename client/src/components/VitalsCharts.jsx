import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

function VitalsCharts({ chartData }) {
  return (
    <>
      <div className="bg-white rounded-xl shadow p-6 mt-10">
        <h3 className="text-xl font-semibold mb-4">Blood Pressure Trend</h3>

        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />

            {/* Danger threshold */}
            <ReferenceLine y={160} stroke="red" strokeDasharray="5 5" />

            <Line
              type="monotone"
              dataKey="systolic"
              stroke="#2563eb"
              strokeWidth={3}
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-xl shadow p-6 mt-10">
        <h3 className="text-xl font-semibold mb-4">Glucose Trend</h3>

        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />

            {/* Danger threshold */}
            <ReferenceLine y={180} stroke="red" strokeDasharray="5 5" />

            <Line
              type="monotone"
              dataKey="glucose"
              stroke="#dc2626"
              strokeWidth={3}
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}

export default VitalsCharts;
