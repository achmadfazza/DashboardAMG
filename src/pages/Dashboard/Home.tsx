import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import PageMeta from "../../components/common/PageMeta";
import SolarDashboard from "./SolarDashboard";

const days = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/**
 * Sapaan dalam Bahasa Indonesia sesuai jam lokal. Pagi mencakup 00:00–10:59
 * (jam dini hari ikut "Pagi"), siang 11:00–17:59, dan malam mulai 18:00.
 */
const getGreeting = (hour: number): string => {
  if (hour < 11) return "Selamat Pagi";
  if (hour < 18) return "Selamat Siang";

  return "Selamat Malam";
};

export default function Home() {
  // Solar dashboard is visible to admins and managers.
  const { hasAnyRole, user } = useAuth();
  const canSeeSolar = hasAnyRole(["admin", "manager"]);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const day = days[now.getDay()];
  const date = now.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const time = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  // Nama dari sesi login (POST /api/auth/signin -> user.firstName/lastName).
  // Tiap bagian di-trim dulu supaya field seperti "Nicholas " tidak
  // menghasilkan spasi ganda saat digabung.
  const fullName = [user?.firstName, user?.lastName]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");
  const greeting = fullName ? `${getGreeting(now.getHours())}, ${fullName}` : "Selamat Datang";

  return (
    <>
      <PageMeta
        title="Dashboard | PT Aneka Mitra Gemilang"
        description="Dashboard PT Aneka Mitra Gemilang"
      />
      <div className="mb-6">
        <h1 className="text-title-sm font-semibold text-gray-900 dark:text-white">
          {greeting}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {day}, {date} — {time}
        </p>
      </div>
      {canSeeSolar && <SolarDashboard />}
    </>
  );
}
