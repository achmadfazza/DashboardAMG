import { Link } from "react-router";
import { useAuth } from "../../context/AuthContext";

export default function Unauthorized() {
  const { user } = useAuth();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 mb-4 rounded-full bg-error-50 dark:bg-error-900/20">
            <svg
              className="w-10 h-10 text-error-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
              />
            </svg>
          </div>
          <h1 className="mb-2 text-2xl font-bold text-gray-800 dark:text-white/90">
            Access Denied
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            You don't have permission to access this page.
            {user && (
              <span className="block mt-2">
                Your current role is:{" "}
                <span className="font-medium text-brand-500 capitalize">
                  {user.role}
                </span>
              </span>
            )}
          </p>
        </div>
        <Link
          to="/"
          className="inline-flex items-center justify-center px-6 py-2.5 text-sm font-medium text-white transition rounded-lg bg-brand-500 hover:bg-brand-600"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
