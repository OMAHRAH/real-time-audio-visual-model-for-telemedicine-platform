function VitalsTable({ vitals }) {
  return (
    <div className="bg-white rounded-xl shadow p-6 mt-10">
      <h3 className="text-xl font-semibold mb-4">Latest Patient Vitals</h3>

      <table className="w-full">
        <thead>
          <tr className="border-b text-left">
            <th className="py-2">Patient</th>
            <th>Blood Pressure</th>
            <th>Blood Sugar</th>
            <th>Status</th>
          </tr>
        </thead>

        <tbody>
          {vitals.map((vital) => {
            const bp = vital.bloodPressure;
            const sugar = vital.bloodSugar;

            const critical =
              sugar > 200 || (bp && parseInt(bp.split("/")[0]) > 160);

            return (
              <tr key={vital._id} className="border-b">
                <td className="py-3">{vital.patient?.name || "Unknown"}</td>

                <td>{bp}</td>

                <td>{sugar}</td>

                <td>
                  {critical ? (
                    <span className="text-red-600 font-semibold">
                      ⚠ Critical
                    </span>
                  ) : (
                    <span className="text-green-600">Normal</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default VitalsTable;
