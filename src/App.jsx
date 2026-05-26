import "./App.css";
import Footer from "./MainPageComponents/FooterCompts/Footer";
import Navbar from "./MainPageComponents/HeaderCompts/Navbar";
import { Routes, Route, useLocation } from "react-router-dom";
import { useEffect } from "react";
import Login from "./MainPageComponents/HeaderCompts/Login";
import Register from "./MainPageComponents/HeaderCompts/Register";
import DoctorPortal from "./DoctorComponents/DoctorPortal";
import PharmacyPortal from "./PharmacyComponents/PharmacyPortal";
import ProtectedRoute from "./MainPageComponents/HeaderCompts/ProtectedRoute";
import CompleteProfile from "./DoctorComponents/CompleteProfile";
import PendingVerification from "./DoctorComponents/PendingVerification";
import CompletePharmacyProfile from "./PharmacyComponents/CompletePharmacyProfile";
import PendingVerificationPage from "./PharmacyComponents/PendingVerificationPage";
import PatientPortal from "./PatientComponents/PatientPortal";
import ChatBot from "./Chatbot/ChatBot";

function App() {
  const location = useLocation();


  const hideLayoutRoutes = ["/doctor", "/patient", "/pharmacy"];

  const shouldHideLayout = hideLayoutRoutes.some((path) =>
    location.pathname.startsWith(path)
  );

  const isAuthRoute = ["/login", "/register"].includes(location.pathname);

  return (
    <div className="flex flex-col min-h-screen">

      {/* 🔥 Hide Navbar */}
      {!shouldHideLayout && <Navbar />}

      <main className={`grow flex flex-col ${isAuthRoute ? "bg-gradient-to-br from-blue-50 to-blue-100" : ""}`}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Patient Portal */}
          <Route
            path="/patient/*"
            element={
              <ProtectedRoute
                allowedRole="patient"
                component={PatientPortal}
              />
            }
          />

          {/* Doctor */}
          <Route
            path="/doctor/complete-profile"
            element={
              <ProtectedRoute
                allowedRole="doctor"
                component={CompleteProfile}
              />
            }
          />

          <Route
            path="/doctor/pending-verification"
            element={
              <ProtectedRoute
                allowedRole="doctor"
                component={PendingVerification}
              />
            }
          />

          <Route
            path="/doctor/*"
            element={
              <ProtectedRoute
                allowedRole="doctor"
                component={DoctorPortal}
              />
            }
          />

          {/* Pharmacy */}
          <Route
            path="/pharmacy/complete-profile"
            element={
              <ProtectedRoute
                allowedRole="pharmacy"
                component={CompletePharmacyProfile}
              />
            }
          />

          <Route
            path="/pharmacy/pending-verification"
            element={
              <ProtectedRoute
                allowedRole="pharmacy"
                component={PendingVerificationPage}
              />
            }
          />

          <Route
            path="/pharmacy/*"
            element={
              <ProtectedRoute
                allowedRole="pharmacy"
                component={PharmacyPortal}
              />
            }
          />
        </Routes>
      </main>

      <ChatBot />

      {/* 🔥 Hide Footer */}
      {!shouldHideLayout && <Footer />}
    </div>
  );
}

export default App;