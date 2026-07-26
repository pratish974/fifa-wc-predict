import {
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import LoginPage from "../pages/Login/LoginPage";
import DashboardPage from "../pages/Dashboard/DashboardPage";
import ProtectedRoute from "./ProtectedRoute";
import ItineraryPlannerPage from "../itienary/ItineraryPlannerPage";

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<ItineraryPlannerPage />} />
      <Route path="/itinerary" element={<ItineraryPlannerPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
