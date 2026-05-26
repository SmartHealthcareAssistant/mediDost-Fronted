import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import toast from "react-hot-toast";

const getBackendUrl = () => {
  if (
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1")
  ) {
    return "http://localhost:5000";
  }
  return "https://medidost-backend.onrender.com";
};

const Register = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    rePassword: "",
  });

  const [role, setRole] = useState("doctor");
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showRePass, setShowRePass] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [showOtpBox, setShowOtpBox] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false); // Prevents double submission
  const [timer, setTimer] = useState(0);

  const navigate = useNavigate();

  // ✅ IMPROVED: Robust Password Validation (Regex)
  // At least 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

  const getPasswordStrength = (password) => {
    if (!password) return { label: "", color: "" };
    if (passwordRegex.test(password)) return { label: "Strong", color: "text-green-600" };
    if (password.length >= 6) return { label: "Weak (Needs mixed characters)", color: "text-yellow-600" };
    return { label: "Very Weak", color: "text-red-600" };
  };

  const handleSendOtp = async () => {
    if (!formData.email || !/^\S+@\S+\.\S+$/.test(formData.email)) {
      toast.error("Enter a valid email address");
      return;
    }

    try {
      setOtpLoading(true);
      const res = await fetch(`${getBackendUrl()}/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email.trim().toLowerCase() }),
      });

      if (!res.ok) throw new Error("Failed to send OTP");

      toast.success("OTP sent to your email");
      setShowOtpBox(true);
      setTimer(30);
    } catch (err) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    const enteredOtp = otp.join("");
    if (enteredOtp.length !== 6) {
      toast.error("Enter complete OTP");
      return;
    }

    try {
      const res = await fetch(`${getBackendUrl()}/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email.trim().toLowerCase(),
          otp: enteredOtp,
        }),
      });

      if (!res.ok) throw new Error("Invalid OTP");

      toast.success("Email verified successfully!");
      setEmailVerified(true);
      setShowOtpBox(false);
    } catch (err) {
      toast.error(err.message);
    }
  };

  useEffect(() => {
    if (timer <= 0) return;
    const interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const handleResendOtp = async () => {
    if (timer > 0) return;
    await handleSendOtp();
  };

  const handleOtpChange = (value, index) => {
    if (!/^[0-9]?$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) document.getElementById(`otp-${index + 1}`).focus();
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // ✅ NEW: Strict Security Validations
    if (!passwordRegex.test(formData.password)) {
      setError("Password must be at least 8 characters, include uppercase, lowercase, a number, and a special character (@$!%*?&).");
      return;
    }

    if (formData.password !== formData.rePassword) {
      setError("Passwords do not match!");
      return;
    }

    if (!emailVerified) {
      setError("Please verify your email before signing up.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch(`${getBackendUrl()}/api/${role}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
        }),
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Registration failed");
      }

      toast.success("Registration successful!");
      navigate("/login");
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOtpKeyDown = (e, index) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`).focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData("text").trim();
    if (!/^\d{6}$/.test(pasteData)) return;
    setOtp(pasteData.split(""));
    document.getElementById("otp-5").focus();
  };

  const strength = getPasswordStrength(formData.password);

  return (
    <div className="w-full flex-1 flex justify-center items-center py-6 sm:py-12 px-4">
      <div className="w-full max-w-md p-8 rounded-3xl shadow-2xl bg-white border border-blue-200 transition hover:scale-[1.01]">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-blue-700">Create Account</h1>
          <p className="text-gray-500 mt-2">Sign up to access your dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-3 text-sm text-red-700 bg-red-100 border border-red-300 rounded-md">
              {error}
            </div>
          )}

          <InputField label="Full Name" name="name" placeholder="John Doe" handleChange={handleChange} />

          <div>
            <label className="block text-sm font-medium text-gray-700">Email Address</label>
            <div className="flex gap-2">
              <input
                type="email"
                name="email"
                onChange={handleChange}
                required
                placeholder="you@example.com"
                disabled={emailVerified}
                className="flex-1 px-3 py-2 mt-1 border border-gray-300 rounded-lg focus:border-blue-400 focus:ring-1 focus:ring-blue-300 disabled:bg-gray-100"
              />
              {!emailVerified && (
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={otpLoading}
                  className="px-3 py-2 mt-1 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm font-medium disabled:opacity-50"
                >
                  {otpLoading ? "..." : "Verify"}
                </button>
              )}
              {emailVerified && <span className="px-3 py-2 mt-1 bg-green-100 text-green-700 rounded-lg text-sm">Verified ✓</span>}
            </div>
          </div>

          {showOtpBox && (
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200">
              <h3 className="text-center text-sm font-semibold text-gray-800">Enter Verification Code</h3>
              <div className="grid grid-cols-6 gap-2 mt-3">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    id={`otp-${index}`}
                    type="text"
                    inputMode="numeric"
                    maxLength="1"
                    value={digit}
                    onChange={(e) => handleOtpChange(e.target.value, index)}
                    onKeyDown={(e) => handleOtpKeyDown(e, index)}
                    onPaste={handleOtpPaste}
                    className="w-full aspect-square text-center border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200"
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={handleVerifyOtp}
                className="w-full mt-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
              >
                Confirm Code
              </button>
              <div className="text-center mt-2">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={timer > 0}
                  className={`text-xs ${timer > 0 ? "text-gray-400" : "text-blue-600 hover:underline"}`}
                >
                  {timer > 0 ? `Resend in ${timer}s` : "Resend OTP"}
                </button>
              </div>
            </div>
          )}

          <PasswordField label="Password" name="password" show={showPass} setShow={setShowPass} handleChange={handleChange} />

          {formData.password && (
            <div className="mt-[-10px]">
              <p className={`text-xs font-bold ${strength.color}`}>Strength: {strength.label}</p>
              <div className="w-full bg-gray-200 h-1 mt-1 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-300 ${strength.label === "Strong" ? "w-full bg-green-500" : strength.label.includes("Weak") ? "w-1/2 bg-yellow-500" : "w-1/4 bg-red-500"}`}
                />
              </div>
            </div>
          )}

          <PasswordField label="Confirm Password" name="rePassword" show={showRePass} setShow={setShowRePass} handleChange={handleChange} />

          <div>
            <label className="block text-sm font-medium text-gray-700">Account Type</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-300"
            >
              <option value="doctor">Doctor</option>
              <option value="pharmacy">Pharmacy</option>
              <option value="patient">Patient</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={!emailVerified || isSubmitting}
            className={`w-full py-3 text-white font-bold rounded-lg shadow-md transition ${
              emailVerified && !isSubmitting ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-400 cursor-not-allowed"
            }`}
          >
            {isSubmitting ? "Creating Account..." : "Sign Up"}
          </button>
        </form>

        <div className="text-sm text-center text-gray-700 mt-6">
          Already have an account?{" "}
          <button onClick={() => navigate("/login")} className="font-semibold text-blue-600 hover:underline">
            Sign In
          </button>
        </div>
      </div>
    </div>
  );
};

export default Register;

/* Components kept the same but added minor accessibility/style fixes */
const InputField = ({ label, name, placeholder, type = "text", handleChange }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700">{label}</label>
    <input
      type={type}
      name={name}
      onChange={handleChange}
      required
      placeholder={placeholder}
      className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-lg focus:border-blue-400 focus:ring-1 focus:ring-blue-300"
    />
  </div>
);

const PasswordField = ({ label, name, show, setShow, handleChange }) => (
  <div className="relative">
    <label className="block text-sm font-medium text-gray-700">{label}</label>
    <input
      type={show ? "text" : "password"}
      name={name}
      onChange={handleChange}
      required
      placeholder="••••••••"
      className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-lg focus:border-blue-400 focus:ring-1 focus:ring-blue-300"
    />
    <button
      type="button"
      className="absolute right-3 top-[34px] text-gray-500 hover:text-blue-600"
      onClick={() => setShow(!show)}
    >
      {show ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
    </button>
  </div>
);