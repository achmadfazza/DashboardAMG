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
 * Indonesian greeting for the given local hour. Morning covers 00:00–10:59
 * (including the small hours, which have no dedicated greeting), afternoon
 * 11:00–17:59, and evening from 18:00.
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
  const greeting = getGreeting(now.getHours());
  const fullName = [user?.firstName, user?.lastName]
    .filter((part): part is string => Boolean(part?.trim()))
    .join(" ")
    .trim();

  return (
    <>
      <PageMeta
        title="Dashboard | PT Aneka Mitra Gemilang"
        description="Dashboard PT Aneka Mitra Gemilang"
      />
      <div className="mb-6">
        <h1 className="text-title-sm font-semibold text-gray-900 dark:text-white">
          {greeting}, {fullName || "User"}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {day}, {date} — {time}
        </p>
      </div>
      {canSeeSolar && <SolarDashboard />}
    </>
  );
}
