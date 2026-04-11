export default function VitalCard({ title, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <h3 className="text-sm text-slate-500">{title}</h3>
      <p className="mt-2 text-2xl font-semibold text-slate-900 sm:text-[1.75rem]">
        {value}
      </p>
    </div>
  );
}
