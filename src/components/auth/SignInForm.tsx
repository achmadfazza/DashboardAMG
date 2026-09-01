import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { EyeCloseIcon, EyeIcon } from "../../icons";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Checkbox from "../form/input/Checkbox";
import Button from "../ui/button/Button";

export default function SignInForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  
  // State baru untuk menampilkan alert sukses
  const [successMessage, setSuccessMessage] = useState("");
  
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMessage("Email belum diisi");
      return;
    }
    if (!password.trim()) {
      setErrorMessage("Password belum diisi");
      return;
    }
    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const API_URL = import.meta.env.VITE_API_BASE_URL;
      const response = await fetch(`${API_URL}/api/auth/signin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password, rememberMe: isChecked }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Gagal melakukan sign in");
      }

      // Simpan token ke localStorage
      localStorage.setItem("token", data.token);

      localStorage.setItem("user", JSON.stringify(data.user));

      // 1. Tampilkan pesan sukses login
      setSuccessMessage("Login berhasil!");

      // 2. Berikan jeda (misal: 1500 milidetik / 1.5 detik) sebelum pindah halaman
      setTimeout(() => {
        navigate("/");
      }, 1500);

    } catch (err: any) {
      // Tangani khusus untuk error jaringan / server mati
      if (err.message === "Failed to fetch") {
        setErrorMessage("Gagal terhubung ke server. Cek Koneksi internet anda.");
      } else {
        // Tangani error lain (misal: password salah yang dilempar dari throw new Error)
        setErrorMessage(err.message);
      }
      setLoading(false); // Matikan loading hanya jika gagal (jika sukses biarkan sampai pindah halaman)
    }
  };

  return (
    <div className="flex flex-col flex-1">
      <div className="w-full max-w-md pt-10 mx-auto">
      </div>
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div>
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
              Sign In
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Masukan email dan password untuk masuk ke dashboard!
            </p>
          </div>

          {/* Alert Error */}
          {errorMessage && (
            <div className="mb-4 p-3 text-sm text-red-500 bg-red-100 rounded-lg dark:bg-red-900/30">
              {errorMessage}
            </div>
          )}

          {/* Alert Sukses */}
          {successMessage && (
            <div className="mb-4 p-3 text-sm text-green-600 bg-green-100 rounded-lg dark:bg-green-900/30">
              {successMessage}
            </div>
          )}

          <div>
            <form onSubmit={handleSubmit}>
              <div className="space-y-6">
                <div>
                  <Label>
                    Email <span className="text-error-500">*</span>{" "}
                  </Label>
                  <Input 
                    type="email"
                    placeholder="info@pt-amg-id.com" 
                    value={email}
                    onChange={(e: any) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label>
                    Password <span className="text-error-500">*</span>{" "}
                  </Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Masukan password anda"
                      value={password}
                      onChange={(e: any) => setPassword(e.target.value)}
                      required
                    />
                    <span
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                    >
                      {showPassword ? (
                        <EyeIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                      ) : (
                        <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                      )}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox checked={isChecked} onChange={setIsChecked} />
                    <span className="block font-normal text-gray-700 text-theme-sm dark:text-gray-400">
                      Tetap masuk
                    </span>
                  </div>
                </div>

                <div>
                  <Button className="w-full" size="sm" disabled={loading}>
                    {loading ? "Signing in..." : "Sign in"}
                  </Button>
                </div>
              </div>
            </form>

            <div className="mt-5">
              <p className="text-sm font-normal text-center text-gray-700 dark:text-gray-400 sm:text-start">
                Belum memiliki akun? {""}
                <Link
                  to="/signup"
                  className="text-brand-500 hover:text-brand-600 dark:text-brand-400"
                >
                  Sign Up
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}