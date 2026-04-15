import { useEffect, useMemo, useState } from "react";
import API from "../api/api";
import { getStoredUser, storeStoredUser } from "../auth";

const toTextareaValue = (value) =>
  Array.isArray(value) ? value.join("\n") : value || "";

export default function MedicalProfile() {
  const storedUser = getStoredUser();
  const [form, setForm] = useState({
    name: storedUser?.name || "",
    timezone:
      storedUser?.timezone ||
      Intl.DateTimeFormat().resolvedOptions().timeZone ||
      "Africa/Lagos",
    dateOfBirth: "",
    gender: "",
    bloodGroup: "",
    heightCm: "",
    weightKg: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    emergencyContactRelationship: "",
    allergies: "",
    medications: "",
    medicalHistory: "",
    ongoingConditions: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await API.get("/profile/me");
        const profile = res.data.profile;
        setForm({
          name: profile.name || "",
          timezone:
            profile.timezone ||
            Intl.DateTimeFormat().resolvedOptions().timeZone ||
            "Africa/Lagos",
          dateOfBirth: profile.medicalProfile?.dateOfBirth
            ? String(profile.medicalProfile.dateOfBirth).slice(0, 10)
            : "",
          gender: profile.medicalProfile?.gender || "",
          bloodGroup: profile.medicalProfile?.bloodGroup || "",
          heightCm:
            profile.medicalProfile?.heightCm === null ||
            profile.medicalProfile?.heightCm === undefined
              ? ""
              : String(profile.medicalProfile.heightCm),
          weightKg:
            profile.medicalProfile?.weightKg === null ||
            profile.medicalProfile?.weightKg === undefined
              ? ""
              : String(profile.medicalProfile.weightKg),
          emergencyContactName:
            profile.medicalProfile?.emergencyContact?.name || "",
          emergencyContactPhone:
            profile.medicalProfile?.emergencyContact?.phone || "",
          emergencyContactRelationship:
            profile.medicalProfile?.emergencyContact?.relationship || "",
          allergies: toTextareaValue(profile.medicalProfile?.allergies),
          medications: toTextareaValue(profile.medicalProfile?.medications),
          medicalHistory: toTextareaValue(profile.medicalProfile?.medicalHistory),
          ongoingConditions: toTextareaValue(
            profile.medicalProfile?.ongoingConditions,
          ),
        });
      } catch (error) {
        console.error("Failed to load medical profile", error);
        setFeedback(
          error.response?.data?.message ||
            "Unable to load your medical profile right now.",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const profileCompleteness = useMemo(() => {
    const fields = [
      form.dateOfBirth,
      form.gender,
      form.bloodGroup,
      form.heightCm,
      form.weightKg,
      form.emergencyContactName,
      form.emergencyContactPhone,
      form.emergencyContactRelationship,
      form.allergies,
      form.medications,
      form.medicalHistory,
      form.ongoingConditions,
    ];
    const filled = fields.filter((value) => value.trim()).length;

    return Math.round((filled / fields.length) * 100);
  }, [
    form.dateOfBirth,
    form.gender,
    form.bloodGroup,
    form.heightCm,
    form.weightKg,
    form.emergencyContactName,
    form.emergencyContactPhone,
    form.emergencyContactRelationship,
    form.allergies,
    form.medications,
    form.medicalHistory,
    form.ongoingConditions,
  ]);

  const updateField = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFeedback("");

    try {
      const res = await API.patch("/profile/me", {
        name: form.name,
        timezone: form.timezone,
        medicalProfile: {
          dateOfBirth: form.dateOfBirth,
          gender: form.gender,
          bloodGroup: form.bloodGroup,
          heightCm: form.heightCm,
          weightKg: form.weightKg,
          emergencyContact: {
            name: form.emergencyContactName,
            phone: form.emergencyContactPhone,
            relationship: form.emergencyContactRelationship,
          },
          allergies: form.allergies,
          medications: form.medications,
          medicalHistory: form.medicalHistory,
          ongoingConditions: form.ongoingConditions,
        },
      });

      storeStoredUser({
        ...(getStoredUser() || {}),
        name: res.data.profile.name,
        timezone: res.data.profile.timezone,
        medicalProfile: res.data.profile.medicalProfile,
      });

      setFeedback("Medical profile updated.");
    } catch (error) {
      console.error("Failed to update medical profile", error);
      setFeedback(
        error.response?.data?.message ||
          "Unable to update your medical profile right now.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[0.88fr_1.12fr] xl:items-start">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-sm uppercase tracking-[0.22em] text-blue-600">
          Profile
        </p>
        <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">
          Medical profile
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-500 sm:text-base">
          Keep your allergies, medications, history, and ongoing conditions up
          to date so doctors and admin are not working from incomplete context.
        </p>

        <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-sm font-medium text-slate-500">Profile completeness</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            {profileCompleteness}%
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Completing this profile improves triage quality and reduces repeat
            questioning during appointments and emergencies.
          </p>
        </div>
      </section>

      <form
        onSubmit={saveProfile}
        className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
      >
        {loading ? (
          <p className="text-sm text-slate-500">Loading profile...</p>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Full name
                </label>
                <input
                  value={form.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 p-3 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Timezone
                </label>
                <input
                  value={form.timezone}
                  onChange={(event) => updateField("timezone", event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 p-3 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                />
              </div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Date of birth
                </label>
                <input
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(event) =>
                    updateField("dateOfBirth", event.target.value)
                  }
                  className="w-full rounded-2xl border border-slate-200 p-3 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Gender
                </label>
                <select
                  value={form.gender}
                  onChange={(event) => updateField("gender", event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 p-3 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                >
                  <option value="">Prefer not to say</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="non_binary">Non-binary</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Blood group
                </label>
                <input
                  value={form.bloodGroup}
                  onChange={(event) =>
                    updateField("bloodGroup", event.target.value.toUpperCase())
                  }
                  placeholder="O+, A-, AB+"
                  className="w-full rounded-2xl border border-slate-200 p-3 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Height (cm)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={form.heightCm}
                  onChange={(event) => updateField("heightCm", event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 p-3 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                />
              </div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Weight (kg)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={form.weightKg}
                  onChange={(event) => updateField("weightKg", event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 p-3 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Emergency contact name
                </label>
                <input
                  value={form.emergencyContactName}
                  onChange={(event) =>
                    updateField("emergencyContactName", event.target.value)
                  }
                  className="w-full rounded-2xl border border-slate-200 p-3 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Emergency contact phone
                </label>
                <input
                  value={form.emergencyContactPhone}
                  onChange={(event) =>
                    updateField("emergencyContactPhone", event.target.value)
                  }
                  className="w-full rounded-2xl border border-slate-200 p-3 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Emergency contact relationship
              </label>
              <input
                value={form.emergencyContactRelationship}
                onChange={(event) =>
                  updateField("emergencyContactRelationship", event.target.value)
                }
                placeholder="Parent, spouse, sibling, caregiver"
                className="w-full rounded-2xl border border-slate-200 p-3 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              />
            </div>

            {[
              ["allergies", "Allergies"],
              ["medications", "Current medications"],
              ["medicalHistory", "Medical history"],
              ["ongoingConditions", "Ongoing conditions"],
            ].map(([field, label]) => (
              <div key={field} className="mt-4">
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  {label}
                </label>
                <textarea
                  value={form[field]}
                  onChange={(event) => updateField(field, event.target.value)}
                  placeholder="Enter one item per line"
                  className="min-h-28 w-full rounded-2xl border border-slate-200 p-3 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                />
              </div>
            ))}

            <button
              type="submit"
              disabled={saving}
              className="mt-5 w-full rounded-2xl bg-blue-600 py-3 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              {saving ? "Saving..." : "Save medical profile"}
            </button>

            {feedback ? (
              <p className="mt-4 text-sm leading-6 text-slate-600">{feedback}</p>
            ) : null}
          </>
        )}
      </form>
    </div>
  );
}
