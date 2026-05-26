import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast"; // assuming you have react-hot-toast installed

const CompleteProfile = () => {
  const navigate = useNavigate();
  const doctorId = localStorage.getItem("doctorId");

    if (!doctorId) {
    // If ID is missing, redirect to login/dashboard as state is inconsistent
    toast.error("Authentication required. Please log in.");
    navigate("/login");
    return null; // Don't render the form if the ID is missing
  }

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const fields = [
    { label: "Government ID Proof", name: "idProof" },
    { label: "Medical Registration Certificate", name: "license" },
    { label: "Medical Qualification Certificate", name: "degree" },
    { label: "Other Professional Certificates (Optional)", name: "certificates" },
  ];

  const [profileData, setProfileData] = useState({
    phone: "",
    specialization: "",
    location: "",
    experience: "",
    consultationFee: "",
    available: true,
  });

  const [files, setFiles] = useState({
    image: null,
    idProof: null,
    license: null,
    degree: null,
    certificates: null,
  });

  const [preview, setPreview] = useState({});

  const specializationOptions = [
    "Cardiologist",
    "Dermatologist",
    "Neurologist",
    "Pediatrician",
    "Gynecologist",
    "Orthopedic",
    "ENT Specialist",
    "Psychiatrist",
    "Dentist",
    "General Physician",
    "Oncologist",
    "Urologist",
    "Gastroenterologist",
    "Ophthalmologist",
    "Physiotherapist",
    "Immunologist",
  ];

  // ----------------------------------------------------
  // Handle Input Changes (with phone validation)
  // ----------------------------------------------------
  const handleProfileChange = (e) => {
    const { name, value, type, checked } = e.target;

    // Only digits allowed for phone input
    if (name === "phone" && !/^\d*$/.test(value)) return;

    setProfileData({
      ...profileData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  // Helper to resize and compress image to max dimensions on client-side
  const resizeImageFile = (file, maxWidth, maxHeight, callback) => {
    const img = document.createElement("img");
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target.result;
    };

    reader.onerror = () => {
      toast.error("Failed to read image file.");
      callback(file);
    };

    img.onload = () => {
      let width = img.width;
      let height = img.height;

      // Handle scaling aspect ratio
      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            callback(file);
            return;
          }
          const resizedFile = new File([blob], file.name, {
            type: file.type,
            lastModified: Date.now(),
          });
          callback(resizedFile);
        },
        file.type || "image/jpeg",
        0.85 // 85% compression quality
      );
    };

    reader.readAsDataURL(file);
  };

  // ----------------------------------------------------
  // Handle File Changes
  // ----------------------------------------------------
  const handleFileChange = (e) => {
    const { name, files: selectedFiles } = e.target;
    if (!selectedFiles[0]) return;

    const file = selectedFiles[0];
    const maxSize = 2 * 1024 * 1024; // 2MB limit

    // Validate file size limit
    if (file.size > maxSize) {
      toast.error(`File size of "${file.name}" must be under 2MB.`);
      e.target.value = ""; // Clear file input
      return;
    }

    setErrors((prev) => ({ ...prev, [name]: "" }));

    // If it's a profile image, resize it on client-side
    if (name === "image") {
      const toastId = toast.loading("Processing profile image...");
      resizeImageFile(file, 600, 600, (resizedFile) => {
        setFiles({ ...files, image: resizedFile });
        
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreview({ ...preview, image: reader.result });
          toast.success("Profile image optimized successfully!", { id: toastId });
        };
        reader.readAsDataURL(resizedFile);
      });
    } else {
      // Document uploads (Aadhar, license, degree, certificates)
      setFiles({ ...files, [name]: file });
      const reader = new FileReader();
      reader.onloadend = () => setPreview({ ...preview, [name]: reader.result });
      reader.readAsDataURL(file);
    }
  };

  // ----------------------------------------------------
  // Step Validation (with phone format check)
  // ----------------------------------------------------
  const nextStep = () => {
    const stepErrors = {};

    // Phone validation
    if (!profileData.phone) {
      stepErrors.phone = "Required";
    } else if (!/^\d{10}$/.test(profileData.phone)) {
      stepErrors.phone = "Phone must be exactly 10 digits";
    }

    ["specialization", "location", "experience"].forEach((f) => {
      if (!profileData[f]) stepErrors[f] = "Required";
    });

    if (!files.image) stepErrors.image = "Profile image required";

    setErrors(stepErrors);

    if (Object.keys(stepErrors).length === 0) setStep(2);
  };

  const prevStep = () => setStep(1);

  // ----------------------------------------------------
  // Form Submission
  // ----------------------------------------------------
    const handleSubmit = async (e) => {
    e.preventDefault();
    const docErrors = {};
    ["idProof", "license", "degree"].forEach((f) => {
      if (!files[f]) docErrors[f] = "Required";
    });
    setErrors(docErrors);
    if (Object.keys(docErrors).length > 0) return;

    const formData = new FormData();
    Object.keys(profileData).forEach((k) => formData.append(k, profileData[k]));
    Object.keys(files).forEach((k) => files[k] && formData.append(k, files[k]));

    // Use the corrected URL from the previous step verification
    const url = `https://medidost-backend.onrender.com/api/doctor/complete-profile/${doctorId}`; 
    
    try {
      setLoading(true);
      
      // Get the authentication token for the request header
      const token = localStorage.getItem('token');
      
      const { data } = await axios.put(
        url, 
        formData,
        { 
          headers: { 
            "Content-Type": "multipart/form-data",
            "Authorization": `Bearer ${token}` // Ensure token is sent
          } 
        }
      );

      // --- CRITICAL FIX: Update status flags in localStorage ---
      // This tells ProtectedRoute that the profile step is done, and verification is pending.
      localStorage.setItem("doctorProfileCompleted", "true");
      localStorage.setItem("doctorVerified", "false");
      // --- END CRITICAL FIX ---
      
      toast.success(data.message || "Profile submitted successfully! Waiting for admin verification.");
      
      // CRITICAL: Ensure redirect uses data.redirectTo from the server response
      // Server sends: /doctor/pending-verification
      if (data.redirectTo) {
        navigate(data.redirectTo);
      } else {
        navigate('/doctor/pending-verification'); // Fallback
      }
      
    } catch (err) {
      console.error("Error submitting profile:", err);
      // FIX: Replace alert with toast notification for errors
      toast.error(err.response?.data?.message || "❌ Submission failed. Check console.");
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="min-h-screen flex justify-center items-center bg-blue-50">
      <div className="w-full max-w-lg bg-white p-8 rounded-2xl shadow-lg">
        <h2 className="text-3xl font-bold text-center text-blue-600 mb-6">
          {step === 1 ? "Complete Your Profile" : "Upload Documents"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* ---------------- STEP 1 ---------------- */}
          {step === 1 && (
            <>
              {["phone", "specialization", "location", "experience", "consultationFee"].map((name) => (
                <div key={name}>
                  <label className="block font-semibold mb-1">
                    {name.charAt(0).toUpperCase() + name.slice(1)}
                  </label>

                  {name === "specialization" ? (
                    <select
                      name="specialization"
                      value={profileData.specialization}
                      onChange={handleProfileChange}
                      className={`w-full border rounded-md p-2 focus:ring-2 ${
                        errors.specialization
                          ? "border-red-500 focus:ring-red-500"
                          : "border-gray-300 focus:ring-blue-500"
                      }`}
                    >
                      <option value="">Select Specialization</option>
                      {specializationOptions.map((spec) => (
                        <option key={spec} value={spec}>
                          {spec}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={["experience", "consultationFee"].includes(name) ? "number" : "text"}
                      name={name}
                      value={profileData[name]}
                      onChange={handleProfileChange}
                      className={`w-full border rounded-md p-2 focus:ring-2 ${
                        errors[name]
                          ? "border-red-500 focus:ring-red-500"
                          : "border-gray-300 focus:ring-blue-500"
                      }`}
                    />
                  )}

                  {errors[name] && <p className="text-red-500 text-sm mt-1">{errors[name]}</p>}
                </div>
              ))}

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  name="available"
                  checked={profileData.available}
                  onChange={handleProfileChange}
                />
                <label className="font-medium text-gray-700">
                  Available for appointments
                </label>
              </div>

              <div>
                <label className="block font-semibold mb-1">Profile Image*</label>
                <input type="file" name="image" accept="image/*" onChange={handleFileChange} />
                {preview.image && (
                  <img
                    src={preview.image}
                    alt="profile"
                    className="mt-3 w-28 h-28 rounded-full object-cover mx-auto"
                  />
                )}
                {errors.image && <p className="text-red-500 text-sm mt-1">{errors.image}</p>}
              </div>

              <button
                type="button"
                onClick={nextStep}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md"
              >
                Next
              </button>
            </>
          )}

          {/* ---------------- STEP 2 ---------------- */}
          {step === 2 && (
            <>
{fields.map(({ label, name }) => (
  <div key={name}>
    <label className="block font-semibold mb-1">{label}</label>

    <input
      type="file"
      name={name}
      accept="image/*"
      onChange={handleFileChange}
    />

    {preview[name] && (
      <img
        src={preview[name]}
        alt={label}
        className="mt-2 w-28 h-28 object-cover rounded-lg"
      />
    )}

    {errors[name] && (
      <p className="text-red-500 text-sm mt-1">{errors[name]}</p>
    )}
  </div>
))}

              <div className="flex justify-between mt-3">
                <button type="button" onClick={prevStep} className="bg-gray-400 text-white py-2 px-4 rounded-md">
                  Back
                </button>
                <button type="submit" disabled={loading} className="bg-green-600 text-white py-2 px-4 rounded-md">
                  {loading ? "Submitting..." : "Submit"}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
};

export default CompleteProfile;
