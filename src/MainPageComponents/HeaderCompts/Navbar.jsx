import { useState } from "react";
import { NavLink, Route, Routes } from "react-router-dom";
import { FaUserDoctor } from "react-icons/fa6";
import { FaBars, FaTimes } from "react-icons/fa";

import ShaLogo from "./ShaLogo";

import Home from "./Home";
import About from "./About";
import Contact from "./Contact";
import Services from "./Services";
import FindDoctor from "../MainShowCompts/FindDoctor";

// ---------------------- NAV ITEMS -----------------------
const navItems = [
  {
    name: "Find Doctor",
    path: "/findDoctor",
    icon: <FaUserDoctor />,
  },
  {
    name: "Services",
    path: "/services",
  },
  {
    name: "About Us",
    path: "/about",
  },
  {
    name: "Contact Us",
    path: "/contact",
  },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* ================= NAVBAR ================= */}
      <nav className="sticky top-0 z-50 bg-white shadow-md border-b border-gray-200">

        {/* MAIN CONTAINER */}
        <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 py-3 flex items-center justify-between">

          {/* LOGO */}
          <NavLink to="/" className="flex-shrink-0">
            <ShaLogo />
          </NavLink>

          {/* ================= DESKTOP MENU ================= */}
          <div className="hidden md:flex items-center gap-6 xl:gap-8 font-medium text-gray-700">

            {/* NAV LINKS */}
            {navItems.map((item, idx) => (
              <NavLink
                key={idx}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-2 whitespace-nowrap transition-all duration-300 pb-1
                  ${
                    isActive
                      ? "text-blue-600 border-b-2 border-blue-600"
                      : "hover:text-blue-600"
                  }`
                }
              >
                {item.name}
                {item.icon}
              </NavLink>
            ))}

            {/* LOGIN BUTTON */}
            <NavLink
              to="/login"
              className="px-4 py-2 rounded-xl border border-gray-300 hover:bg-gray-100 transition duration-300"
            >
              Login
            </NavLink>

            {/* REGISTER BUTTON */}
            <NavLink
              to="/register"
              className="px-5 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition duration-300 shadow-md"
            >
              Sign Up
            </NavLink>
          </div>

          {/* ================= MOBILE MENU BUTTON ================= */}
          <button
            className="md:hidden text-2xl text-gray-700"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <FaTimes /> : <FaBars />}
          </button>
        </div>

        {/* ================= MOBILE + TABLET MENU (DRAWER FROM RIGHT) ================= */}
        {/* Dark Backdrop Overlay */}
        <div
          className={`
            fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 md:hidden
            ${isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}
          `}
          onClick={() => setIsOpen(false)}
        />

        {/* Drawer Container */}
        <div
          className={`
            fixed top-0 right-0 z-50 h-screen w-[280px] bg-white shadow-2xl transition-transform duration-300 transform md:hidden
            ${isOpen ? "translate-x-0" : "translate-x-full"}
          `}
        >
          {/* Drawer Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <span className="font-bold text-lg text-blue-900 flex items-center gap-1">
              <span className="text-blue-900">Medi</span>
              <span className="text-teal-700">Dost</span>
            </span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-2xl text-gray-500 hover:text-gray-700 focus:outline-none"
            >
              <FaTimes />
            </button>
          </div>

          {/* Drawer Content */}
          <div className="flex flex-col h-[calc(100vh-68px)] justify-between p-5 font-medium text-gray-700">
            {/* Nav Links */}
            <div className="space-y-2">
              {navItems.map((item, idx) => (
                <NavLink
                  key={idx}
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 py-3 px-4 rounded-xl transition-all duration-200
                    ${
                      isActive
                        ? "bg-blue-50 text-blue-600 font-semibold"
                        : "hover:bg-gray-50 text-gray-700"
                    }`
                  }
                >
                  {item.icon}
                  {item.name}
                </NavLink>
              ))}
            </div>

            {/* Auth Buttons */}
            <div className="space-y-3 pb-8">
              {/* LOGIN */}
              <NavLink
                to="/login"
                onClick={() => setIsOpen(false)}
                className="
                  block w-full text-center
                  py-3 rounded-xl
                  border border-gray-300
                  hover:bg-gray-55
                  transition duration-200
                  font-medium
                "
              >
                Login
              </NavLink>

              {/* REGISTER */}
              <NavLink
                to="/register"
                onClick={() => setIsOpen(false)}
                className="
                  block w-full text-center
                  py-3 rounded-xl
                  bg-blue-600 text-white
                  hover:bg-blue-700
                  transition duration-200
                  font-medium
                  shadow-md
                "
              >
                Sign Up
              </NavLink>
            </div>
          </div>
        </div>
      </nav>

      {/* ================= ROUTES ================= */}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/findDoctor" element={<FindDoctor />} />
        <Route path="/services" element={<Services />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
      </Routes>
    </>
  );
}