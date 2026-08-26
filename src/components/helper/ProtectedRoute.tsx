import { Navigate, Outlet } from "react-router";

export default function ProtectedRoute() {
   // 1. Cek status login di sini. 
   // Contoh menggunakan localStorage (Anda bisa menggantinya dengan Context/Redux/Zustand)
   const isLogin = localStorage.getItem("token");

   // 2. Jika tidak ada token (belum login), tendang ke halaman sign in
   if (!isLogin) {
      // 'replace' digunakan agar user tidak bisa menekan tombol 'Back' ke halaman dashboard yang diblokir
      return <Navigate to="/signin" replace />;
   }

   // 3. Jika sudah login, render komponen anak (children/layout) yang ada di dalamnya
   return <Outlet />;
}