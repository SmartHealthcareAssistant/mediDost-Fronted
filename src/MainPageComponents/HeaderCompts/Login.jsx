import React, { useState, useEffect} from "react";
import { useNavigate } from "react-router-dom";

// API Constants (Assuming these are defined elsewhere)
const API_BASE = "https://medidost-backend.onrender.com/api";

// Mock Auth Hook (assuming your real hook handles global state and navigation logic)
const useAuth = () => {
    // This mock function is just for demonstrating local storage saving and navigation flow
    const login = (data, role) => {
        // Save essential data for ProtectedRoute and downstream components
        localStorage.setItem("token", data.token);
        localStorage.setItem("role", data.role || role);
        localStorage.setItem("doctorId", data.id); 
        localStorage.setItem("name", data.name);
        
        // Note: The verified/profileCompleted flags are typically returned by the server 
        // or fetched separately, but we trust the server's redirectTo path here.
        // For robustness, you might explicitly save status flags if server provides them.
    };
    return { login };
};
const Login = () => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [role, setRole] = useState("doctor");
  const [error, setError] = useState("");
  const [showForgot, setShowForgot] = useState(false);
const [resetEmail, setResetEmail] = useState("");
const [otp, setOtp] = useState(["", "", "", "", "", ""]);
const [step, setStep] = useState(1); 
const [newPassword, setNewPassword] = useState("");
const [timer, setTimer] = useState(0);

  const navigate = useNavigate();

  useEffect(() => {
  if (timer <= 0) return;
  const interval = setInterval(() => {
    setTimer((prev) => prev - 1);
  }, 1000);
  return () => clearInterval(interval);
}, [timer]);

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    

    try {
      const res = await fetch(`https://medidost-backend.onrender.com/api/${role}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email.trim(),
          password: formData.password.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Invalid email or password");
        return;
      }

      // Save token & session data
      localStorage.setItem("token", data.token);
      localStorage.setItem("role", data.role);
      localStorage.setItem("name", data.name);

      if (data.role === "doctor") localStorage.setItem("doctorId", data.id);

      if (data.role === "pharmacy") localStorage.setItem("pharmacyId", data.id);

      if (data.role === "patient") localStorage.setItem("patientId", data.id);

      // 🔥 ADD THIS HERE (IMPORTANT)
if (data.role === "doctor") {
  localStorage.setItem("doctorProfileCompleted", data.profileCompleted);
  localStorage.setItem("doctorVerified", data.verified);
}

if (data.role === "pharmacy") {
localStorage.setItem("pharmacyProfileCompleted", String(data.profileCompleted));
localStorage.setItem("pharmacyVerified", String(data.verified));
}

      // Clear input fields
      setFormData({ email: "", password: "" });

      // Redirect
      if (data.redirectTo) navigate(data.redirectTo);
      else navigate("/login");
    } catch (err) {
      console.log(err);
      setError("Something went wrong. Try again.");
    }
  };

  const handleSendResetOtp = async () => {
  const res = await fetch("https://medidost-backend.onrender.com/send-reset-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: resetEmail }),
  });

  if (res.ok) {
    setStep(2);
    setTimer(30);
  }
};

const handleVerifyResetOtp = async () => {
  const enteredOtp = otp.join("");

  const res = await fetch("https://medidost-backend.onrender.com/verify-reset-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: resetEmail, otp: enteredOtp }),
  });

  if (res.ok) setStep(3);
};

const handleResetPassword = async () => {
  const res = await fetch("https://medidost-backend.onrender.com/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: resetEmail,
      newPassword,
    }),
  });

  if (res.ok) {
    alert("Password reset successful!");
    setShowForgot(false);
    setStep(1);
  }
};

  return (
    <div className="w-full flex-1 flex justify-center items-center py-6 sm:py-12 px-4">

      {/* CARD */}
      <div
        className="
          w-full max-w-md p-10 rounded-3xl shadow-2xl bg-white border border-blue-200
          hover:shadow-blue-300 hover:scale-[1.02] transition-all duration-300
        "
      >
        {/* Heading */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-blue-700">Welcome Back!</h1>
          <p className="text-gray-500 mt-2">Sign in to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Error */}
          {error && (
            <div className="p-3 text-sm text-red-700 bg-red-100 border border-red-300 rounded-md">
              {error}
            </div>
          )}

          {/* EMAIL */}
          <InputField
            label="Email Address"
            name="email"
            type="email"
            placeholder="Enter your email"
            value={formData.email}
            handleChange={handleChange}
          />

          {/* PASSWORD */}
          <InputField
            label="Password"
            name="password"
            type="password"
            placeholder="Enter your password"
            value={formData.password}
            handleChange={handleChange}
          />

          <div className="flex justify-end -mt-3">
  <button
    type="button"
    onClick={() => setShowForgot(true)}
    className="text-sm text-blue-600 hover:underline"
  >
    Forgot Password?
  </button>
</div>
        

{showForgot && (
  <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
    <div className="bg-white w-full max-w-sm p-6 rounded-2xl shadow-xl">

      <h2 className="text-lg font-semibold text-center mb-4">
        Reset Password
      </h2>

      {/* STEP 1 — Enter Email */}
      {step === 1 && (
        <>
          <input
            type="email"
            placeholder="Enter your email"
            value={resetEmail}
            onChange={(e) => setResetEmail(e.target.value)}
            className="w-full border px-3 py-2 rounded-lg"
          />
          <button
            onClick={handleSendResetOtp}
            className="w-full mt-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            Send OTP
          </button>
        </>
      )}

      {/* STEP 2 — Enter OTP */}
      {step === 2 && (
        <>
          <div className="grid grid-cols-6 gap-2 mt-4">
            {otp.map((digit, index) => (
              <input
                key={index}
                maxLength="1"
                value={digit}
                onChange={(e) => handleOtpChange(e.target.value, index)}
                className="w-full aspect-square text-center border rounded-lg"
              />
            ))}
          </div>

          <button
            onClick={handleVerifyResetOtp}
            className="w-full mt-4 py-2 bg-green-600 text-white rounded-lg"
          >
            Verify OTP
          </button>

          <div className="text-center mt-3">
            <button
              disabled={timer > 0}
              onClick={handleSendResetOtp}
              className={`text-sm ${
                timer > 0 ? "text-gray-400" : "text-blue-600"
              }`}
            >
              {timer > 0
                ? `Resend in ${timer}s`
                : "Resend OTP"}
            </button>
          </div>
        </>
      )}

      {/* STEP 3 — New Password */}
      {step === 3 && (
        <>
          <input
            type="password"
            placeholder="Enter new password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full border px-3 py-2 rounded-lg"
          />
          <button
            onClick={handleResetPassword}
            className="w-full mt-4 py-2 bg-green-600 text-white rounded-lg"
          >
            Reset Password
          </button>
        </>
      )}

      <button
        onClick={() => {
          setShowForgot(false);
          setStep(1);
        }}
        className="text-sm text-gray-500 mt-4 block mx-auto"
      >
        Cancel
      </button>

    </div>
  </div>
)}



          {/* ROLE */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Login as
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="
                w-full px-3 py-2 mt-1 
                border border-gray-300 rounded-lg
                focus:ring-1 focus:ring-blue-300 focus:border-blue-400
                placeholder:text-gray-400 transition-all duration-200
              "
            >
              <option value="doctor">Doctor</option>
              <option value="pharmacy">Pharmacy</option>
              <option value="patient">Patient</option>
            </select>
          </div>

          {/* SUBMIT */}
          <button
            type="submit"
            className="
              w-full px-4 py-3 text-white font-bold rounded-lg
              bg-blue-600 hover:bg-blue-700 active:scale-95
              shadow-md hover:shadow-lg transition
            "
          >
            Sign In
          </button>
        </form>

        {/* REGISTER LINK */}
        <div className="text-sm text-center text-gray-700 mt-6">
          Don't have an account?{" "}
          <button
            onClick={() => navigate("/register")}
            className="font-semibold text-blue-600 hover:underline"
          >
            Sign Up
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;

/* ------------ Reusable Input Component ------------ */
const InputField = ({ label, name, type = "text", placeholder, value, handleChange }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700">{label}</label>
    <input
      type={type}
      name={name}
      autoComplete="off"
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      required
      className="
        w-full px-3 py-2 mt-1
        border border-gray-300 rounded-lg
        focus:border-blue-400 focus:ring-1 focus:ring-blue-300
        placeholder:text-gray-400 shadow-sm transition duration-200
      "
    />
  </div>
);
