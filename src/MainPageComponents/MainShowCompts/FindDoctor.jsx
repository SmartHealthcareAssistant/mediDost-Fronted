import React, { useState, useEffect } from "react";
import axios from "axios";
import { FaSearch, FaStar, FaStethoscope } from "react-icons/fa";
import { MdLocationOn } from "react-icons/md";
import { IoClose } from "react-icons/io5";
import { useNavigate, useLocation } from "react-router-dom";

// Example specializations
const specializations = [
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

const FindDoctor = () => {
  const navigate = useNavigate();
  const routeLocation = useLocation();
  const [location, setLocation] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState(null); // For modal
  const [appointment, setAppointment] = useState({
    name: "",
    email: "",
    phone: "",
    date: "",
    time: "",
    type: "",
    reason: "",
  });

  // Fetch doctors from backend
  const searchDoctors = async (specOverride = null) => {
    setLoading(true);
    setError("");

    const activeSpec = specOverride !== null ? specOverride : specialization;

    try {
      const params = {};
      if (location) params.location = location;
      if (activeSpec) params.specialization = activeSpec;

      const { data } = await axios.get(
        "https://medidost-backend.onrender.com/api/doctor/search",
        { params }
      );

      if (data.success && data.doctors && data.doctors.length > 0) {
        setDoctors(data.doctors);
      } else {
        setError("No doctors found for the selected criteria.");
        setDoctors([]);
      }
    } catch (err) {
      console.error("Error fetching doctors:", err);
      setError("Server error, please try again later.");
      setDoctors([]);
    } finally {
      setLoading(false);
    }
  };

  // Check if specialization was passed via route state (e.g. from chatbot)
  useEffect(() => {
    if (routeLocation.state?.specialization) {
      const spec = routeLocation.state.specialization;
      if (specializations.includes(spec)) {
        setSpecialization(spec);
        searchDoctors(spec);
      }
    }
  }, [routeLocation]);

  // Handle appointment 
const handleBookClick = () => {
  navigate("/login");

};

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h2 className="text-3xl font-bold mb-8 text-center text-blue-700 flex items-center justify-center gap-2">
        <FaStethoscope className="text-blue-500" /> Best Doctor for you
      </h2>

      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row gap-5 mb-8 bg-white p-4 rounded-xl shadow-lg border border-gray-200 items-center">
        {/* Location Input */}
        <div className="relative flex-1 w-full">
          <MdLocationOn className="absolute left-3 top-3 text-gray-400 text-xl" />
          <input
            type="text"
            placeholder="Enter location (e.g., Delhi)"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        {/* Specialization Dropdown */}
        <div className="relative flex-1 w-full">
          <FaStethoscope className="absolute left-3 top-3 text-gray-400 text-xl" />
          <select
            value={specialization}
            onChange={(e) => setSpecialization(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="">Select Specialization</option>
            {specializations.map((spec) => (
              <option key={spec} value={spec}>
                {spec}
              </option>
            ))}
          </select>
        </div>

        {/* Search Button */}
        <button
          onClick={searchDoctors}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition duration-200"
        >
          <FaSearch /> Search
        </button>
      </div>

      {/* Loading and Error States */}
      {loading && (
        <p className="text-center text-gray-500 text-lg">Loading doctors...</p>
      )}
      {error && (
        <p className="text-center text-red-500 text-lg font-medium">{error}</p>
      )}

      {/* Doctor Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {doctors.map((doc) => (
          <div
            key={doc._id}
            className="bg-white rounded-2xl shadow-md hover:shadow-xl transition duration-200 border border-gray-100 overflow-hidden flex flex-col pt-6"
          >
            {/* Doctor Image Container (Circular Avatar) */}
            <div className="flex justify-center mb-4 relative">
              {/* Outer decorative ring bg */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-indigo-50/20 opacity-40 blur-xl rounded-full w-36 h-36 mx-auto -top-2"></div>
              
              <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-md bg-slate-50 flex items-center justify-center">
                <img
                  src={
                    doc.image?.startsWith("/uploads")
                      ? `https://medidost-backend.onrender.com${doc.image}`
                      : doc.image || "https://via.placeholder.com/150?text=Doctor"
                  }
                  alt={doc.name}
                  className="w-full h-full object-cover object-top"
                />
              </div>
            </div>

            {/* Doctor Info */}
            <div className="p-5 flex-1 flex flex-col justify-between">
              <div>
                <h3 className="text-xl font-bold text-blue-900 mb-0.5 text-center">
                  {doc.name}
                </h3>
                <p className="text-blue-600 text-sm mb-3 text-center font-semibold">
                  {doc.specialization}
                </p>

                {/* Rating */}
                <div className="flex items-center justify-center gap-1 mb-4 bg-slate-50 py-1 px-3 rounded-full w-max mx-auto border border-slate-100">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <FaStar
                      key={star}
                      className={
                        star <= Math.floor(doc.rating || 0)
                          ? "text-yellow-400 text-xs"
                          : "text-gray-200 text-xs"
                      }
                    />
                  ))}
                  <span className="ml-1 text-xs text-gray-700 font-bold">
                    {doc.rating ? doc.rating.toFixed(1) : "0.0"}
                  </span>
                  <span className="text-gray-400 text-[10px] ml-1">
                    ({doc.numReviews || 0})
                  </span>
                </div>

                {/* Details */}
                <div className="text-gray-650 text-sm mb-4 space-y-1.5 border-t border-slate-100 pt-4">
                  <div className="flex justify-between">
                    <span className="text-gray-400 font-medium">Experience:</span>
                    <span className="font-semibold text-gray-700">{doc.experience} years</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 font-medium">Location:</span>
                    <span className="font-semibold text-gray-700">{doc.location}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 font-medium">Consultation Fee:</span>
                    <span className="font-semibold text-gray-700 text-emerald-600">₹{doc.consultationFee}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 font-medium">Phone:</span>
                    <span className="font-semibold text-gray-700">{doc.phone}</span>
                  </div>
                </div>
              </div>    {/* Availability + Button */}
              <div className="flex justify-between items-center mt-4">
<span
  className={`text-sm font-semibold px-3 py-1 rounded-full ${
    doc.unavailableDates?.includes(
      appointment.date
    )
      ? "bg-red-100 text-red-700"
      : "bg-green-100 text-green-700"
  }`}
>
  {doc.unavailableDates?.includes(
    appointment.date
  )
    ? "Unavailable"
    : "Available"}
</span>

                <button
                  onClick={() => handleBookClick(doc)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition"
                >
                  Book Appointment
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FindDoctor;
