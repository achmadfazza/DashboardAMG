import { BrowserRouter as Router, Routes, Route } from "react-router";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/helper/ProtectedRoute";
import SignIn from "./pages/AuthPages/SignIn";
import SignUp from "./pages/AuthPages/SignUp";
import NotFound from "./pages/OtherPage/NotFound";
import Unauthorized from "./pages/OtherPage/Unauthorized";
import UserProfiles from "./pages/UserProfiles";
import Videos from "./pages/UiElements/Videos";
import Images from "./pages/UiElements/Images";
import Alerts from "./pages/UiElements/Alerts";
import Badges from "./pages/UiElements/Badges";
import Avatars from "./pages/UiElements/Avatars";
import Buttons from "./pages/UiElements/Buttons";
import LineChart from "./pages/Charts/LineChart";
import BarChart from "./pages/Charts/BarChart";
import Calendar from "./pages/Calendar";
import BasicTables from "./pages/Tables/BasicTables";
import FormElements from "./pages/Forms/FormElements";
import Blank from "./pages/Blank";
import AppLayout from "./layout/AppLayout";
import { ScrollToTop } from "./components/common/ScrollToTop";
import Home from "./pages/Dashboard/Home";
import GuestBook from "./pages/Dashboard/InputGuestBook";
import ListGuestBook from "./pages/Dashboard/ListGuestBook";
import UserManagement from "./pages/UserManagement";
import UserForm from "./pages/UserForm";
import DepartmentManagement from "./pages/DepartmentManagement";


export default function App() {
  return (
    <AuthProvider>
      <Router>
        <ScrollToTop />
        <Routes>
          {/* Dashboard Layout — Protected with RBAC */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route index path="/" element={<Home />} />
              {/* Others Page — All authenticated users */}
              <Route path="/profile" element={<UserProfiles />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/blank" element={<Blank />} />

              {/* Guest Book — User & Manager only */}
              <Route element={<ProtectedRoute roles={["user", "manager","admin"]} />}>
                <Route path="/guest-book" element={<GuestBook />} />
                <Route path="/list-guest-book" element={<ListGuestBook />} />
              </Route>

              {/* User Management — Admin & Manager only */}
              <Route element={<ProtectedRoute roles={["admin", "manager"]} />}>
                <Route path="/user-management" element={<UserManagement />} />
                <Route path="/user-management/new" element={<UserForm />} />
              </Route>

              {/* User Management Edit — Admin only (update:user) */}
              <Route element={<ProtectedRoute permissions={["update:user"]} />}>
                <Route path="/user-management/:id/edit" element={<UserForm />} />
              </Route>

              {/* Department Management — Admin only (manage:department) */}
              <Route element={<ProtectedRoute permissions={["manage:department"]} />}>
                <Route path="/department-management" element={<DepartmentManagement />} />
              </Route>

              {/* Forms — Admin & Manager only */}
              <Route element={<ProtectedRoute roles={["admin", "manager"]} />}>
                <Route path="/form-elements" element={<FormElements />} />
              </Route>

              {/* Tables — Admin & Manager only */}
              <Route element={<ProtectedRoute roles={["admin", "manager"]} />}>
                <Route path="/basic-tables" element={<BasicTables />} />
              </Route>

              {/* UI Elements — All authenticated users */}
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/avatars" element={<Avatars />} />
              <Route path="/badge" element={<Badges />} />
              <Route path="/buttons" element={<Buttons />} />
              <Route path="/images" element={<Images />} />
              <Route path="/videos" element={<Videos />} />

              {/* Charts — Admin & Manager only */}
              <Route element={<ProtectedRoute roles={["admin", "manager"]} />}>
                <Route path="/line-chart" element={<LineChart />} />
                <Route path="/bar-chart" element={<BarChart />} />
              </Route>
            </Route>
          </Route>

          {/* Auth Layout */}
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />

          {/* Unauthorized — accessible without auth */}
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* Fallback Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
