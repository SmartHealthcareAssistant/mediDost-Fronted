import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import logo from "../../src/assets/logo/image.png"
import { io } from "socket.io-client";

/* ---------------- CONSTANTS & HELPERS ---------------- */
const API_BASE = "https://medidost-backend.onrender.com/api";
const authHeaders = () => {
  const t = localStorage.getItem("token");
  return t ? { Authorization: `Bearer ${t}` } : {};
};

const fmtDate = (iso) => (iso ? new Date(iso).toLocaleString() : "—");
const fmtPhone = (p) => {
  if (!p) return "";
  const s = String(p).replace(/\D/g, "");
  if (s.length === 10) return s.replace(/(\d{3})(\d{3})(\d{4})/, "$1 $2 $3");
  return p;
};

/* ---------------- ErrorBoundary ---------------- */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { err: null };
  }
  static getDerivedStateFromError(err) {
    return { err };
  }
  componentDidCatch(err, info) {
    console.error("ErrorBoundary:", err, info);
  }
  render() {
    if (this.state.err) {
      return (
        <div className="p-6">
          <h2 className="text-xl font-bold text-red-600">Something went wrong</h2>
          <p className="mt-2 text-gray-600">Try reloading the page or contact support.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ---------------- Inline Components (Modals/Messages) ---------------- */
// Custom Alert/Message Box (Replaces alert() and confirm())
const MessageBox = ({ title, message, isOpen, onClose }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white p-6 rounded-xl shadow-2xl max-w-sm w-full">
                <h3 className="text-xl font-bold mb-3 text-blue-700">{title}</h3>
                <p className="text-gray-700 mb-4">{message}</p>
                <div className="flex justify-end">
                    <button onClick={onClose} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Close</button>
                </div>
            </div>
        </div>
    );
};


/* ---------------- Doctor/Appointment Helpers ---------------- */

// Helper to look up full doctor details from local 'doctors' state if only ID is present
const useDoctorLookup = (doctors) => {
    return useCallback((doctorId) => {
        if (typeof doctorId === 'object' && doctorId !== null && doctorId.name) {
            return doctorId; // Already populated by backend
        }
        if (typeof doctorId === 'string') {
            return doctors.find(d => d._id === doctorId) || null;
        }
        return null;
    }, [doctors]);
};


/* ---------------- main component ---------------- */
function PatientPortalInner() {
  const navigate = useNavigate();

  const [page, setPage] = useState("dashboard");

  // core data
  const [user, setUser] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [pharmacies, setPharmacies] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);

  // UI & filters
  const [doctorQuery, setDoctorQuery] = useState("");
  const [doctorLocation, setDoctorLocation] = useState("");
  const [pharmQuery, setPharmQuery] = useState("");

  // booking modal state
  const [bookingDoctor, setBookingDoctor] = useState(null);
  const [bookingNotes, setBookingNotes] = useState("");
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingMessage, setBookingMessage] = useState("");

  const [socket, setSocket] = useState(null);

  const [sidebarOpen, setSidebarOpen] = useState(false);
const [selectedDate, setSelectedDate] = useState("");
const [slots, setSlots] = useState([]);
const [showSlots, setShowSlots] = useState(true);
const [selectedSlot, setSelectedSlot] = useState(null);


  const [isMessageOpen, setIsMessageOpen] = useState(false); // For custom message box

  // doctor detail modal (view inline)
  const [doctorDetail, setDoctorDetail] = useState(null);
  // pharmacy detail modal
  const [selectedPharmacy, setSelectedPharmacy] = useState(null);
  const [pharmacyLoading, setPharmacyLoading] = useState(false);
  const [pharmacyMedicines, setPharmacyMedicines] = useState([]);

  // profile form (editable)
  const [profileForm, setProfileForm] = useState({ name: "", email: "", phone: "", address: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  
  const getDoctorById = useDoctorLookup(doctors); // Doctor Lookup Helper

  

  /* ---------------- load current patient ---------------- */
  useEffect(() => {
    const ctrl = new AbortController();
    async function load() {
      try {
        const res = await axios.get(`${API_BASE}/patient/me`, { headers: authHeaders(), signal: ctrl.signal });
        setUser(res.data);
        setProfileForm({
          name: res.data?.name || "",
          email: res.data?.email || "",
          phone: res.data?.phone ? String(res.data.phone) : "",
          address: res.data?.address || "",
        });
      } catch (err) {
        if (!axios.isCancel(err)) {
          console.error("load user error", err);
          if (err?.response?.status === 401) navigate("/login");
        }
      }
    }
    load();
    return () => ctrl.abort();
  }, [navigate]);


  useEffect(() => {
  const s = io("https://medidost-backend.onrender.com");
  setSocket(s);

  return () => s.disconnect();
}, []);

useEffect(() => {
  if (!socket) return;

  if (bookingDoctor?._id) {
    socket.emit("joinDoctorRoom", bookingDoctor._id);
  }

  return () => {
    if (bookingDoctor?._id) {
      socket.emit("leaveDoctorRoom", bookingDoctor._id);
    }
  };
}, [socket, bookingDoctor]);


  /* ---------------- load doctors ---------------- */
  useEffect(() => {
    const ctrl = new AbortController();
    async function loadDoctors() {
      try {
        // GET /api/doctors (This route should fetch consultationFee)
        const res = await axios.get(`${API_BASE}/doctor`, { headers: authHeaders(), signal: ctrl.signal });
        setDoctors(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        if (!axios.isCancel(err)) console.error("load doctors error", err);
        setDoctors([]);
      }
    }
    loadDoctors();
    return () => ctrl.abort();
  }, []);

  /* ---------------- load pharmacies ---------------- */
  useEffect(() => {
    const ctrl = new AbortController();
    async function loadPharms() {
      try {
        // Using /api/pharmacy (Requires JWT token)
        const res = await axios.get(`${API_BASE}/pharmacy`, { headers: authHeaders(), signal: ctrl.signal });
        setPharmacies(
  Array.isArray(res.data?.pharmacies)
    ? res.data.pharmacies
    : Array.isArray(res.data)
    ? res.data
    : []
);
      } catch (err) {
        if (!axios.isCancel(err)) console.error("load pharmacies error:", err.response?.status || err.message);
        setPharmacies([]);
      }
    }
    loadPharms();
    return () => ctrl.abort();
  }, []);

  // /* ---------------- load appointments ---------------- */
  const loadAppointments = async () => {
    try {
      const res = await axios.get(`${API_BASE}/patient/appointments`, { headers: authHeaders() });
      setAppointments(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("load appointments err", err);
      setAppointments([]);
    }
  };
  useEffect(() => {
    loadAppointments();
  }, []);

  /* ---------------- load prescriptions ---------------- */
  useEffect(() => {
    const ctrl = new AbortController();
    async function loadPresc() {
      try {
        // Fetch prescriptions associated with the patient
        const res = await axios.get(`${API_BASE}/patient/prescriptions`, { headers: authHeaders(), signal: ctrl.signal });
        setPrescriptions(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        if (!axios.isCancel(err)) console.error("load prescriptions error", err);
        setPrescriptions([]);
      }
    }
    loadPresc();
    return () => ctrl.abort();
  }, []);

  /* ---------------- filtered lists ---------------- */
  const doctorsFiltered = (doctors || []).filter((d) => {
    const q = doctorQuery.trim().toLowerCase();
    const loc = doctorLocation.trim().toLowerCase();
    if (q && !((d.name || "").toLowerCase().includes(q) || (d.specialization || "").toLowerCase().includes(q))) return false;
    if (loc && !( (d.location||"").toLowerCase().includes(loc) )) return false;
    return true;
  });

  const pharmaciesFiltered = (pharmacies || []).filter((p) => {
    const q = pharmQuery.trim().toLowerCase();
    if (!q) return true;
    // Check name, pharmacyName, location, city, state
    return (p.name || "").toLowerCase().includes(q) || 
           (p.pharmacyName || "").toLowerCase().includes(q) ||
           (p.location || "").toLowerCase().includes(q) ||
           (p.city || "").toLowerCase().includes(q) ||
           (p.state || "").toLowerCase().includes(q);
  });

  /* ---------------- booking flow ---------------- */
  const openBooking = (doc) => {
    setBookingDoctor(doc);
    setBookingNotes("");
    setBookingMessage("");


    setSelectedDate("");
    setSlots([]);
    setSelectedSlot(null);
    setShowSlots(true);
  };


const fetchSlots = async (date) => {
  try {
    const res = await axios.get(
      `${API_BASE}/doctor/${bookingDoctor._id}/slots?date=${date}`
    );
    setSlots(res.data);
  } catch (err) {
    console.error("slot fetch error", err);
    setSlots([]);
  }
};

useEffect(() => {
  if (!socket) return;

  // when someone books slot
socket.on("slotBooked", (data) => {
  setSlots(prev =>
    prev.map(slot =>
new Date(slot.slotStart).getTime() === new Date(data.slotStart).getTime()
        ? { ...slot, disabled: true } // ✅ ADD THIS
        : slot
    )
  );
});

  // when slot released
  socket.on("slotReleased", (data) => {
    if (selectedDate) {
      fetchSlots(selectedDate);
    }
  });

  return () => {
    socket.off("slotBooked");
    socket.off("slotReleased");
  };
}, [socket, selectedDate]);



  
const handleBookAppointment = async () => {
  if (bookingLoading) return; 
  setBookingLoading(true);  

  if (!bookingDoctor) return toast.error("Select doctor");
  if (!selectedSlot) return toast.error("Select slot");

  try {
    const doctorId = bookingDoctor._id;
    const doctorFee = bookingDoctor.consultationFee;


console.log("Sending slot:", {
  doctorId,
  slotStart: selectedSlot.slotStart,
  slotEnd: selectedSlot.slotEnd
});

    //  STEP 1: LOCK SLOT
    const lockRes = await axios.post(
      `${API_BASE}/payment/lock-slot`,
      {
        doctorId,
        patientId: localStorage.getItem("patientId"),
        slotStart: selectedSlot.slotStart,
        slotEnd: selectedSlot.slotEnd
      },
      { headers: authHeaders() }
    );

    const appointmentId = lockRes.data.appointmentId;

    //  STEP 2: CREATE ORDER
    const res = await axios.post(
      `${API_BASE}/payment/create-order`,
      {
        doctorId,
        patientId: localStorage.getItem("patientId"),
        amount: doctorFee,
        date: selectedSlot.slotStart,
        time: selectedSlot.slotStart,
        appointmentId
      },
      { headers: authHeaders() }
    );

    const { order } = res.data;

    const options = {
key: import.meta.env.VITE_RAZORPAY_KEY,
      amount: order.amount,
      currency: "INR",
      name: "MediDost",
      order_id: order.id,

      handler: async function (response) {
        await axios.post(
          `${API_BASE}/payment/verify-payment`,
          {
            ...response,
            appointmentId
          },
          { headers: authHeaders() }
        );

        toast.success("Appointment Confirmed ✅");
        setBookingDoctor(null);
        loadAppointments();
      }
    };

const rzp = new window.Razorpay({
  ...options,

  modal: {
    ondismiss: async function () {

      // 🔥 RELEASE SLOT WHEN USER CLOSES PAYMENT
      await axios.post(
        `${API_BASE}/payment/release-slot`,
        {
          slotStart: selectedSlot.slotStart,
          doctorId
        },
        { headers: authHeaders() }
      );

      toast.error("Payment cancelled");

      setBookingLoading(false);
    }
  }
});

rzp.open();

  } catch (err) {
  console.error(err);

  const errorMessage =
    err?.response?.data?.message ||
    "Booking failed ❌";

  // SHOW INSIDE BOOKING CARD
  setBookingMessage(errorMessage);

  // OPTIONAL TOAST
  // toast.error(errorMessage);
}
  finally {
  setBookingLoading(false);
}
}

  /* ---------------- doctor detail modal ---------------- */
  const openDoctorDetail = (d) => {
    setDoctorDetail(d);
  };
  const closeDoctorDetail = () => setDoctorDetail(null);


  const [rating, setRating] = useState(0);
const [comment, setComment] = useState("");

const submitReview = async () => {
  try {
    if (!rating) {
      toast.error("Please select rating");
      return;
    }

    if (!doctorDetail?._id) {
      toast.error("Doctor not found");
      return;
    }

        // ✅ 🔥 ADD THIS HERE
    console.log("Sending review:", {
      doctorId: doctorDetail?._id,
      rating,
      comment
    });

    const res = await axios.post(
      `${API_BASE}/reviews/${doctorDetail._id}`,
      { rating: Number(rating), comment },
      { headers: authHeaders() }
    );

    // ✅ 1. Modal data update
    setDoctorDetail(prev => ({
      ...prev,
      rating: res.data.rating,
      numReviews: res.data.numReviews
    }));

    // ✅ 2. Doctor list update (IMPORTANT 🔥)
    setDoctors(prevDoctors =>
      prevDoctors.map(doc =>
        doc._id === doctorDetail._id
          ? {
              ...doc,
              rating: res.data.rating,
              numReviews: res.data.numReviews
            }
          : doc
      )
    );

    // ✅ 3. Reset form
    setRating("");
    setComment("");

    // ✅ 4. Auto close modal 🔥
    closeDoctorDetail();
    console.log("Response:", res.data); // optional
    toast.success("Review submitted");

  } catch (err) {
    console.error("Review error:", err.response?.data || err.message);
    toast.error("Failed to submit review ❌");
  }
};



  /* ---------------- pharmacy detail ---------------- */
  const openPharmacy = async (ph) => {
    setSelectedPharmacy(ph);
    setPharmacyMedicines([]);
    
    setPharmacyLoading(true);
    try {
      // Fetch full details of the specific pharmacy
      const res = await axios.get(`${API_BASE}/patient/pharmacy/${ph._id}`, { headers: authHeaders() });
      const data = res.data || {};
      const medicines = Array.isArray(data.medicines) ? data.medicines : (data.inventory || []); 
      setPharmacyMedicines(medicines);
    } catch (err) {
      console.error("fetch pharmacy detail err", err);
      setPharmacyMedicines([]);
    } finally {
      setPharmacyLoading(false);
    }
  };

  const closePharmacy = () => {
    setSelectedPharmacy(null);
    setPharmacyMedicines([]);
  };

  /* ---------------- profile update ---------------- */
  const saveProfile = async (e) => {
    e && e.preventDefault();
    setSavingProfile(true);
    try {
      const payload = {
        name: profileForm.name,
        phone: profileForm.phone ? String(profileForm.phone).replace(/\D/g, "") : "",
        address: profileForm.address,
      };
      const res = await axios.put(`${API_BASE}/patient/me`, payload, { headers: authHeaders() });
      const updated = res.data?.patient || res.data;
      if (updated) {
        setUser(updated);
        setProfileForm({
          name: updated.name || "",
          email: updated.email || "",
          phone: updated.phone ? String(updated.phone) : "",
          address: updated.address || "",
        });
      }
      setBookingMessage("Profile saved successfully.");
      setIsMessageOpen(true);
    } catch (err) {
      console.error("save profile err", err);
      setBookingMessage(err?.response?.data?.message || "Save failed");
      setIsMessageOpen(true);
    } finally {
      setSavingProfile(false);
    }
  };

  /* ---------------- logout ---------------- */
  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("patientId");
    navigate("/login");
  };

  /* ---------------- derived values ---------------- */
  const totalBookings = Array.isArray(appointments) ? appointments.length : 0;
  const upcomingAppointment = (Array.isArray(appointments) ? appointments : [])
    .filter((a) => a.slotStart && new Date(a.slotStart) > new Date())
    .sort((a, b) => new Date(a.slotStart) - new Date(b.slotStart))[0] || null;
  const upcomingDoctor = upcomingAppointment ? getDoctorById(upcomingAppointment.doctor) : null;
  const upcoming = upcomingAppointment;

  /* ---------------- UI ---------------- */
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 font-[Inter]">
      {/* Header */}
<div
  className="
    flex items-center justify-between
    bg-white border-b shadow-sm
    px-3 sm:px-4 md:px-6
    py-3
    sticky top-0 z-30
  "
>
        <div className="flex flex-col sm:flex-row gap-3">
          <div>
                <div className="flex items-center select-none min-w-0">

  {/* ✅ MOBILE MENU BUTTON */}
  <button
    className="md:hidden text-xl mr-2"
    onClick={() => setSidebarOpen(!sidebarOpen)}
  >
    ☰
  </button>

      {/* Logo Image */}
      <img
        src={logo}
        alt="MediDost Logo"
        className="
          h-10 sm:h-8 md:h-10 lg:h-12
          w-auto object-contain
        "
      />

      {/* Brand Name */}
<div className="flex flex-col min-w-0">
      <h1
        className="
text-base sm:text-lg md:text-xl lg:text-2xl
          font-bold
          tracking-normal
          leading-none
          ml-1
        "
      >
        <span className="text-blue-900">
          Medi
        </span>
        <span className="text-teal-700">
          Dost
        </span>
      </h1>
      <span className=" ml-1 text-sm text-gray-500">Patient Portal</span>
      </div>

    </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <div className="font-medium">{user?.name}</div>
            <div className="text-sm text-gray-500">{user?.email}</div>
          </div>
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700">{user?.name ? user.name.charAt(0).toUpperCase() : "P"}</div>
        </div>
      </div>
<div className="flex relative h-[calc(100vh-72px)] overflow-hidden">

  {sidebarOpen && (
  <div
    className="fixed inset-0 bg-black/40 z-40 md:hidden"
    onClick={() => setSidebarOpen(false)}
  />
)}
<aside
  className={`
    fixed md:static
    top-0 left-0
    z-50
    h-full
    w-64
    bg-gray-900 text-white
    p-4
    flex flex-col
    transition-transform duration-300

    ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
    md:translate-x-0
  `}
>

  {/* MENU */}
  <nav className="space-y-2">
    <button onClick={() => {
  setPage("dashboard");
  setSidebarOpen(false);
}} className={`w-full text-left px-3 py-2 rounded-lg text-base md:text-lg font-medium transition-colors ${page === "dashboard" ? "bg-blue-600" : "hover:bg-gray-800"}`}>Dashboard</button>

    <button onClick={() => {
  setPage("appointments");
  setSidebarOpen(false);
}} className={`w-full text-left px-3 py-2 rounded-lg text-base md:text-lg font-medium transition-colors ${page === "appointments" ? "bg-blue-600" : "hover:bg-gray-800"}`}>Appointments</button>

    <button onClick={() => {
  setPage("prescriptions");
  setSidebarOpen(false);
}} className={`w-full text-left px-3 py-2 rounded-lg text-base md:text-lg font-medium transition-colors ${page === "prescriptions" ? "bg-blue-600" : "hover:bg-gray-800"}`}>Prescriptions</button>

    <button onClick={() => {
  setPage("pharmacies");
  setSidebarOpen(false);
}} className={`w-full text-left px-3 py-2 rounded-lg text-base md:text-lg font-medium transition-colors ${page === "pharmacies" ? "bg-blue-600" : "hover:bg-gray-800"}`}>Pharmacies</button>

    <button onClick={() => {
  setPage("profile");
  setSidebarOpen(false);
}} className={`w-full text-left px-3 py-2 rounded-lg text-base md:text-lg font-medium  transition-colors ${page === "profile" ? "bg-blue-600" : "hover:bg-gray-800"}`}>Profile</button>
  </nav>

  {/* 🔥 THIS WILL NOW GO TO BOTTOM */}
  <div className="mt-auto">
    <button
      onClick={logout}
      className="w-full text-center px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 transition"
    >
      Logout
    </button>
  </div>

</aside>

        {/* Main Content Area */}
<main
  className="
    flex-1
    overflow-y-auto
    h-full
    p-3 sm:p-4 md:p-6
    w-full
  "
>
          {page === "dashboard" && (
            <div>
              <h2 className="text-2xl font-semibold mb-4">Dashboard</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl shadow border-l-4 border-blue-500">
                  <div className="text-sm text-gray-500">Upcoming Appointment</div>
                  <div className="font-bold text-lg mt-1">{upcomingDoctor ? upcomingDoctor.name : "No upcoming"}</div>
                  <div className="text-sm text-gray-600">{upcoming ? fmtDate(upcoming.slotStart) : ""}</div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow border-l-4 border-green-500">
                  <div className="text-sm text-gray-500">Total Bookings</div>
                  <div className="text-3xl font-bold mt-1">{totalBookings}</div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow border-l-4 border-yellow-500">
                  <div className="text-sm text-gray-500">Next Date</div>
                  <div className="font-bold text-lg mt-1">{upcoming ? fmtDate(upcoming.time) : "—"}</div>
                </div>
              </div>
            </div>
          )}

          {page === "appointments" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-semibold">Appointments</h2>
              </div>

              {/* appointment list */}
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-2">Your Appointments</h3>
                {(!appointments || appointments.length === 0) ? <p className="text-gray-500 p-4 bg-white rounded-lg shadow">No appointments</p> : (
                  <ul className="space-y-3">
                    {appointments.map((a) => {
                      const docDetails = getDoctorById(a.doctor);
                      return (
                        <li key={a._id || a.id} className="
  bg-white p-4 rounded-xl shadow
  flex flex-col sm:flex-row
  gap-3
  justify-between sm:items-center
  hover:shadow-lg transition
">
                          <div>
                            <div className="font-bold text-blue-600">{a.title || (docDetails ? docDetails.name : 'Consultation')}</div>
                            <div className="text-sm text-gray-700">{fmtDate(a.slotStart)}</div>
                            <div className="text-sm text-gray-500">Doctor: {docDetails ? docDetails.name : 'Unknown'} • Loc: {docDetails ? docDetails.location : 'N/A'}</div>
                            {docDetails?.consultationFee !== undefined && (
                                // FEE DISPLAY ADDED HERE
                                <div className="text-xs text-green-600 font-semibold mt-1">Fee: ₹{docDetails.consultationFee}</div>
                            )}
                            {a.notes && <div className="text-sm text-gray-700 mt-1 italic">Notes: {a.notes}</div>}
                          </div>
                          <div className="text-sm font-semibold px-3 py-1 rounded-full bg-yellow-100 text-yellow-700">{a.status || "Scheduled"}</div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          )}

          {page === "pharmacies" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-semibold">Pharmacies</h2>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <input placeholder="Search pharmacy/location" value={pharmQuery} onChange={(e) => setPharmQuery(e.target.value)} className="px-3 py-2 border rounded-lg w-full sm:w-64 shadow-sm"/>
                  <button onClick={() => setPharmQuery("")} className="px-3 py-2 border rounded-lg hover:bg-gray-200 transition-colors">Clear</button>
                </div>
              </div>

              {pharmaciesFiltered.length === 0 ? <p className="text-gray-500 p-4 bg-white rounded-lg shadow">No pharmacies found. Ensure a pharmacy has completed its profile.</p> : (
                <ul className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {pharmaciesFiltered.map((p) => (
                    <li key={p._id} className="bg-white p-4 rounded-xl shadow flex flex-col gap-3 hover:shadow-lg transition">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-bold text-blue-700">{p.pharmacyName}</div>
                          <div className="text-sm text-gray-600">{p.location || p.city || p.state}</div>
                          <div className="text-sm text-gray-500"> {fmtPhone(p.pharmaPhone)}{p.email ? ` • ${p.email}` : ""}</div>
                          <div className="text-xs text-gray-500 mt-1">Timings: {p.timings || 'N/A'}</div>
                        </div>
                        <button onClick={() => openPharmacy(p)} className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">View Meds</button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {page === "prescriptions" && (
            <div>
              <h2 className="text-2xl font-semibold mb-4">Prescriptions</h2>
              {prescriptions.length === 0 ? <p className="text-gray-500 p-4 bg-white rounded-lg shadow">No prescriptions found</p> : (
                <ul className="space-y-3">
{prescriptions.map((p) => (
  <li key={p._id} className="bg-white p-4 rounded-xl shadow">

    <div className="font-bold text-lg">
      {p.title || "Prescription"}
    </div>

    <div className="text-sm text-gray-600">
      By Dr. {p.doctor?.name || "Unknown"}
    </div>

    {/* Medicines */}
    <div className="mt-2">
      <span className="font-medium text-blue-600">Medicines:</span>
      <ul className="list-disc ml-5">
        {p.medicines?.map((m, i) => (
          <li key={i}>
            {m.name} - {m.dosage} ({m.timing || "N/A"}) for {m.duration || "N/A"}
          </li>
        ))}
      </ul>
    </div>

    {/* Notes */}
    <div className="mt-2 text-sm">
      <span className="font-medium">Notes:</span> {p.notes || "-"}
    </div>

    {/* Files */}
    {p.files?.length > 0 && (
      <div className="mt-2">
        {p.files.map((f, i) => (
          <a
            key={i}
            href={f.startsWith("http") ? f : `https://medidost-backend.onrender.com${f}`}
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 underline block"
          >
            View Document {i + 1}
          </a>
        ))}
      </div>
    )}

  </li>
))};
                </ul>
              )}
            </div>
          )}

          {page === "profile" && (
            <div>
              <h2 className="text-2xl font-semibold mb-4">Profile</h2>
              <form onSubmit={saveProfile} className="bg-white p-6 rounded-xl shadow max-w-2xl space-y-4">
                <div className="text-xs text-gray-500 italic pb-2">Note: Email cannot be changed.</div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Full name</label>
                  <input value={profileForm.name} onChange={(e) => setProfileForm((p) => ({ ...p, name: e.target.value }))} className="mt-1 block w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email (readonly)</label>
                  <input value={profileForm.email} disabled className="mt-1 block w-full px-3 py-2 border bg-gray-100 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <input value={profileForm.phone} onChange={(e) => setProfileForm((p) => ({ ...p, phone: String(e.target.value).replace(/\D/g, "") }))} className="mt-1 block w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Address</label>
                  <input value={profileForm.address} onChange={(e) => setProfileForm((p) => ({ ...p, address: e.target.value }))} className="mt-1 block w-full px-3 py-2 border rounded-lg" />
                </div>

                <div className="flex items-center gap-3">
                  <button type="submit" disabled={savingProfile} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50">{savingProfile ? "Saving..." : "Save Changes"}</button>
                  <button type="button" onClick={() => { setProfileForm({ name: user?.name || "", email: user?.email || "", phone: user?.phone ? String(user.phone) : "", address: user?.address || "" }); }} className="px-3 py-2 border rounded-lg hover:bg-gray-100 transition">Reset</button>
                </div>
              </form>
            </div>
          )}
          
          {/* Doctors List / Finder */}
          {(page === "dashboard" || page === "appointments") && (
            <div className="mt-8">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold">Find Doctors</h3>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <input placeholder="Name or specialization" value={doctorQuery} onChange={(e) => setDoctorQuery(e.target.value)} className="px-3 py-2 border rounded-lg w-full sm:w-auto" />
                  <input placeholder="Location filter" value={doctorLocation} onChange={(e) => setDoctorLocation(e.target.value)} className="px-3 py-2 border rounded-lg w-full sm:w-auto" />
                  <button onClick={() => { setDoctorQuery(""); setDoctorLocation(""); }} className="px-3 py-2 border rounded-lg hover:bg-gray-200 transition">Clear</button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {doctorsFiltered.length === 0 ? (
                  <div className="text-gray-500 p-4">No doctors found</div>
                ) : doctorsFiltered.map((d) => (
                  <div key={d._id} className="bg-white p-4 rounded-xl shadow flex flex-col hover:shadow-lg transition">
                    <div className="flex items-center gap-3">
                     <img
  src={
    d.image
      ? d.image.startsWith("http")
        ? d.image
        : `https://medidost-backend.onrender.com${d.image}`
      : "https://via.placeholder.com/150"
  }
  alt={d.name}
  className="w-20 h-20 rounded-full object-cover"
/>
                      <div className="flex-1">
                        <div className="font-bold text-blue-700">{d.name}</div>
                        <div className="text-sm text-gray-600">{d.specialization}</div>
                        <div className="text-sm text-gray-500">{d.location}</div>

                          {/* ⭐ ADD HERE */}
  <div className="text-yellow-600 text-sm mt-1">
    ⭐ {d.rating?.toFixed(1) || 0} ({d.numReviews || 0} reviews)
  </div>
                        
                        {/* FEE DISPLAY ADDED HERE */}
                        {d.consultationFee !== undefined && (
                          <div className="text-sm font-semibold text-green-600 mt-1">Fee: ₹{d.consultationFee}</div>
                        )}
                        
                      </div>
                    </div>

                    <div className="mt-3 flex gap-2 justify-end">
                      <button onClick={() => openDoctorDetail(d)} className="px-3 py-1 border rounded-lg hover:bg-gray-200 transition">View</button>
                      <button onClick={() => openBooking(d)} className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">Book</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
{/* Booking modal */}
{bookingDoctor && (
  <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
    
    {/* Overlay */}
    <div
      className="absolute inset-0 bg-black/40"
      onClick={async () => {
        if (selectedSlot && bookingDoctor?._id) {
          try {
            await axios.post(
              `${API_BASE}/payment/release-slot`,
              {
                doctorId: bookingDoctor._id,
                slotStart: selectedSlot.slotStart
              },
              { headers: authHeaders() }
            );
          } catch (err) {
            console.error("release slot on close error", err);
          }
        }
        setBookingDoctor(null);
      }}
    />

    {/* Modal */}
<div
  className="
    bg-white
    w-full
    sm:max-w-md
    rounded-t-2xl sm:rounded-xl
    p-4 sm:p-6
    max-h-[90vh]
    overflow-y-auto
    z-10
    shadow-2xl
  "
>

      {/* Header */}
      <h3 className="text-lg sm:text-xl font-semibold mb-1">
        Dr. {bookingDoctor.name}
      </h3>
      <p className="text-xs sm:text-sm text-gray-500 mb-2">
        {bookingDoctor.specialization} • {bookingDoctor.location}
      </p>

      {/* Fee */}
      {bookingDoctor.consultationFee !== undefined && (
        <div className="text-sm sm:text-base font-bold text-green-700 mb-3">
          Consultation Fee: ₹{bookingDoctor.consultationFee}
        </div>
      )}

      {/* Date */}
      <label className="block text-sm mb-1">Select Date</label>
<input
  type="date"
  value={selectedDate}
  onChange={async (e) => {

    const date = e.target.value;

    setSelectedDate(date);

    try {

      const res = await axios.get(
        `${API_BASE}/doctor/${bookingDoctor._id}/slots?date=${date}`
      );

      // DOCTOR UNAVAILABLE
      if (res.data.unavailable) {

        setSlots([]);

        setBookingMessage(
          "Doctor is unavailable on this date"
        );

        return;
      }

      // CLEAR MESSAGE
      setBookingMessage("");

      // LOAD AVAILABLE SLOTS
      setSlots(res.data);

    } catch (err) {

      console.error(err);

      setSlots([]);

      setBookingMessage(
        "Failed to load slots"
      );
    }
  }}
  className="w-full px-3 py-2 border rounded-lg mb-3 text-sm sm:text-base"
/>

      {/* Slots */}
      <label className="block text-sm mb-1">Available Slots</label>
      {showSlots && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3 max-h-60 overflow-y-auto">
          
          {slots.length === 0 && (
            <p className="text-gray-500 text-sm col-span-3 text-center">
              No slots available
            </p>
          )}

          {slots.map((slot, i) => (
            <button
              key={i}
              disabled={slot.disabled}
              onClick={() => {
                setSelectedSlot(slot);
                setShowSlots(false);
              }}
              className={`px-2 py-2 rounded-lg border text-xs sm:text-sm ${
                slot.disabled
                  ? "bg-gray-300 cursor-not-allowed"
                  : selectedSlot?.slotStart === slot.slotStart
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 hover:bg-gray-200"
              }`}
            >
              <div className="flex flex-col">
                <span className="font-medium">
                  {new Date(slot.slotStart).toLocaleDateString([], {
                    day: "2-digit",
                    month: "short"
                  })}
                </span>
                <span className="text-xs">
                  {new Date(slot.slotStart).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit"
                  })}
                </span>
              </div>

              {slot.disabled && (
                <span className="text-xs text-red-500 block">
                  Booked
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Selected Slot */}
      {selectedSlot && !showSlots && (
        <div className="mb-3 p-2 bg-green-100 rounded text-center text-xs sm:text-sm">
          Selected Time:{" "}
          {new Date(selectedSlot.slotStart).toLocaleString()}

          <button
            onClick={async () => {
              if (selectedSlot && bookingDoctor?._id) {
                try {
                  await axios.post(
                    `${API_BASE}/payment/release-slot`,
                    {
                      doctorId: bookingDoctor._id,
                      slotStart: selectedSlot.slotStart
                    },
                    { headers: authHeaders() }
                  );
                } catch (err) {
                  console.error("release slot error", err);
                }
              }

              setShowSlots(true);
            }}
            className="ml-2 text-blue-600 text-xs sm:text-sm"
          >
            Change
          </button>
        </div>
      )}

      {/* Notes */}
      <label className="block text-sm">Reason / Notes (optional)</label>
      <textarea
        value={bookingNotes}
        onChange={(e) => setBookingNotes(e.target.value)}
        className="w-full px-3 py-2 border rounded-lg mb-3 text-sm sm:text-base"
        rows={4}
      />

      {/* Message */}
      {bookingMessage && (
        <div className="mb-2 text-sm text-red-600">
          {bookingMessage}
        </div>
      )}

      {/* Buttons */}
      <div className="flex flex-col sm:flex-row gap-2">
        
<button
  onClick={handleBookAppointment}
  disabled={
    bookingLoading ||
    bookingMessage ===
      "Doctor is unavailable on this date"
  }
  className={`w-full sm:w-auto px-3 py-2 rounded-lg transition
    ${
      bookingMessage ===
      "Doctor is unavailable on this date"
        ? "bg-gray-400 cursor-not-allowed text-white"
        : "bg-blue-600 hover:bg-blue-700 text-white"
    }
  `}
>
  {bookingMessage ===
  "Doctor is unavailable on this date"
    ? "Unavailable"
    : `Pay ₹${bookingDoctor?.consultationFee} & Book`}
</button>

<button
  onClick={async () => {

    if (selectedSlot && bookingDoctor?._id) {
      try {
        await axios.post(
          `${API_BASE}/payment/release-slot`,
          {
            doctorId: bookingDoctor._id,
            slotStart: selectedSlot.slotStart
          },
          { headers: authHeaders() }
        );
      } catch (err) {
        console.error("release slot error", err);
      }
    }

    setBookingDoctor(null);

    setSelectedDate("");
    setSlots([]);
    setSelectedSlot(null);
    setBookingMessage("");
    setShowSlots(true);

  }}
  className="w-full sm:w-auto px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition"
>
  Cancel
</button>
      </div>

    </div>
  </div>
)}

      {/* Doctor detail modal */}
      {doctorDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={closeDoctorDetail} />
          <div className="
  relative bg-white
  p-4 sm:p-6
  rounded-xl
  w-full
  max-w-2xl
  max-h-[90vh]
  overflow-y-auto
  z-10 shadow-2xl
">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold text-blue-700">{doctorDetail.name}</h3>
                {/* ⭐ ADD THIS */}
<div className="text-yellow-600 text-sm mt-1">
  ⭐ {doctorDetail.rating?.toFixed(1) || 0} ({doctorDetail.numReviews || 0} reviews)
</div>
                <div className="text-sm text-gray-600">{doctorDetail.specialization} • {doctorDetail.location}</div>
                {doctorDetail.consultationFee !== undefined && (
                   <div className="text-base font-semibold text-green-700 mt-1">Fee: ₹{doctorDetail.consultationFee}</div>
                )}
                <div className="text-sm text-gray-500 mt-1">Experience: {doctorDetail.experience || "-"}</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { openBooking(doctorDetail); closeDoctorDetail(); }} className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">Book</button>
                <button onClick={closeDoctorDetail} className="px-3 py-1 border rounded-lg hover:bg-gray-200 transition">Close</button>
              </div>
            </div>

            <div className="mt-4 border-t pt-4">
  <h3 className="font-semibold mb-2">Give Rating</h3>

<select value={rating} onChange={(e) => setRating(Number(e.target.value))}>
    <option value="">Select Rating</option>
    {[1,2,3,4,5].map(r => (
      <option key={r} value={r}>{r} Star</option>
    ))}
  </select>

  <textarea
    placeholder="Write review"
    value={comment}
    onChange={(e) => setComment(e.target.value)}
    className="w-full border mt-2 p-2"
  />

  <button onClick={submitReview} className="bg-blue-600 text-white px-3 py-2 mt-2 rounded">
    Submit
  </button>
</div>
          </div>
        </div>
      )}

      {/* Pharmacy detail modal */}
      {selectedPharmacy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={closePharmacy} />
          <div className="relative bg-white p-6 rounded-xl w-full max-w-2xl z-10 shadow-2xl">
            <div className="flex justify-between items-start border-b pb-3 mb-4">
              <div>
                <h3 className="text-xl font-bold text-blue-700">{selectedPharmacy.name || selectedPharmacy.pharmacyName}</h3>
                <div className="text-sm text-gray-600">{selectedPharmacy.location || selectedPharmacy.pharmacyAddress}</div>
                <div className="text-sm text-gray-500">{fmtPhone(selectedPharmacy.pharmaPhone || selectedPharmacy.phone)} {selectedPharmacy.email ? `• ${selectedPharmacy.email}` : ""}</div>
              </div>
              <button onClick={closePharmacy} className="px-3 py-1 border rounded-lg hover:bg-gray-200 transition">Close</button>
            </div>

            <div className="mt-4">
              <h4 className="font-bold mb-3 text-gray-800">Available Medicines / Items</h4>
              {pharmacyLoading ? <p className="text-blue-600">Loading...</p> : pharmacyMedicines.length === 0 ? <p className="text-gray-500">No medicines listed</p> : (
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto pr-2">
                  {pharmacyMedicines.map((m, i) => (
                    <li key={i} className="border border-gray-200 p-4 rounded-lg bg-gray-50">
                      <div className="font-semibold text-gray-700">{typeof m === "string" ? m : (m.name || "Item")}</div>
                      {typeof m !== "string" && m.price && <div className="text-sm text-green-600 font-medium">Price: {m.price}</div>}
                      {typeof m !== "string" && m.qty && <div className="text-sm text-gray-600">Qty: {m.qty}</div>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Custom Message Box */}
      <MessageBox 
          title={bookingMessage.includes("success") ? "Success" : "Error"}
          message={bookingMessage}
          isOpen={isMessageOpen}
          onClose={() => setIsMessageOpen(false)}
      />
      
    </div>
  );
}

/* ---------------- export wrapped ---------------- */
export default function PatientPortal() {
  return (
    <ErrorBoundary>
      <PatientPortalInner />
    </ErrorBoundary>
  );
}