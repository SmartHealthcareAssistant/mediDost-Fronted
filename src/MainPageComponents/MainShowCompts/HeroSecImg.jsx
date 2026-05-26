import heroImg from "../../assets/Images/Hero.png";
import { useNavigate } from "react-router-dom";

export default function HeroSecImg() {
  const navigate = useNavigate();

  return (
    <div
      className="
        relative w-full
        h-[55vh]
        sm:h-[70vh]
        md:h-[80vh]
        lg:h-screen
        overflow-hidden
      "
    >
      {/* Background Image */}
      <img
        src={heroImg}
        alt="Healthcare Professionals"
        className="
          absolute inset-0
          w-full h-full
          object-cover
          object-center sm:object-[center_top]
        "
      />

      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black/45"></div>

      {/* Content */}
      <div
        className="
          relative z-10
          flex flex-col
          items-center justify-center
          h-full
          text-center
          px-4 sm:px-6 md:px-8
        "
      >
        <h1
          className="
            text-white font-bold
            text-2xl
            sm:text-4xl
            md:text-5xl
            lg:text-6xl
            leading-tight
            drop-shadow-xl
            mt-6 sm:mt-12
          "
        >
          Your Health is our Priority
        </h1>

        <p
          className="
            mt-3 sm:mt-4
            text-gray-200
            text-xs
            sm:text-sm
            md:text-lg
            max-w-xs
            sm:max-w-lg
            md:max-w-xl
          "
        >
          Trusted care for you and your family
        </p>

        <button
          className="
            mt-5 sm:mt-6
            bg-white font-bold
            text-blue-600
            px-4 py-2
            sm:px-6 sm:py-3
            rounded-full
            shadow-lg
            hover:shadow-2xl
            transition-all duration-300
            transform hover:-translate-y-1
            text-sm sm:text-base
          "
          onClick={() => navigate("/findDoctor")}
        >
          Book Appointment
        </button>
      </div>
    </div>
  );
}