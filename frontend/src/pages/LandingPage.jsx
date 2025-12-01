import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  FaChartLine,
  FaShieldAlt,
  FaChartBar,
  FaBell,
  FaCheckCircle,
  FaAward,
  FaChevronRight,
  FaFileAlt
} from "react-icons/fa";

export default function LandingPage() {
  const [isScrolled, setIsScrolled] = useState(false);

  // Scroll listener for dynamic navbar
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 30);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const features = [
    {
      icon: FaChartLine,
      title: "Real-time Monitoring",
      description:
        "Track equipment status, health, and performance in real-time across all labs.",
    },
    {
      icon: FaShieldAlt,
      title: "Predictive Maintenance",
      description:
        "AI-powered alerts prevent breakdowns before they happen, reducing downtime.",
    },
    {
      icon: FaChartBar,
      title: "Usage Analytics",
      description:
        "Comprehensive insights on equipment utilization and efficiency metrics.",
    },
    {
      icon: FaBell,
      title: "Instant Alerts",
      description:
        "Get notified of faults, malfunctions, or unsafe usage patterns immediately.",
    },
  ];

  const benefits = [
    "Reduce equipment downtime by up to 40%",
    "Improve training quality and safety",
    "Optimize resource allocation",
    "Generate automated compliance reports",
    "Scale across multiple institutions",
    "Industry 4.0 ready infrastructure",
  ];

  return (
    <div className="min-h-screen relative font-sans text-gray-800 bg-gray-50">
      {/* --- Parallax Background (Watermark) --- */}
      <div
        className="fixed inset-0 z-0 bg-fixed bg-cover bg-center opacity-30"
        style={{
          backgroundImage: "url('/watermark.png')",
        }}
      >
        {/* Lighter overlay since opacity-45 handles the fade */}
        <div className="absolute inset-0 bg-gray-50/10 backdrop-blur-[1px]"></div>
      </div>

      {/* --- Dynamic Floating Glass Navbar --- */}
      <header className="fixed top-6 left-0 right-0 z-50 flex justify-center px-4 transition-all duration-500">
        <nav
          className={`
            flex items-center justify-between 
            bg-white/80 backdrop-blur-md border border-gray-200/50 text-gray-900 shadow-2xl rounded-full
            transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]
            ${
              isScrolled
                ? "w-[85%] max-w-5xl px-6 py-3" // Scrolled: Compact
                : "w-[95%] max-w-7xl px-8 py-4" // Initial: Round & slightly taller, but decreased height
            }
          `}
        >
          {/* Left: Logo & Name */}
          <div className="flex items-center gap-0">
            <div className="p-1.5 bg-[#002f96] rounded-full shadow-[0_0_15px_rgba(21,93,252,0.5)] shrink-0 z-10">
              <FaChartLine className="w-5 h-5 text-white" />
            </div>
            {/* App Name: Collapses on scroll */}
            <h1
              className={`
                font-bold tracking-tight whitespace-nowrap overflow-hidden transition-all duration-500 ease-in-out
                ${
                  isScrolled
                    ? "max-w-0 opacity-0 ml-0" // Hide on scroll
                    : "max-w-[200px] opacity-100 ml-3 text-lg" // Show on mount
                }
              `}
            >
              IoT Monitor
            </h1>
          </div>

          {/* Center: Links (Always Visible) */}
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600 mx-auto">
            <Link to="/features" className="hover:text-[#002f96] transition-colors">
              Features
            </Link>
            <Link
              to="/solutions"
              className="hover:text-[#002f96] transition-colors"
            >
              Solutions
            </Link>
            <Link to="/pricing" className="hover:text-[#002f96] transition-colors">
              Pricing
            </Link>
          </div>

          {/* Right: Actions (Always Visible) */}
          <div className="flex items-center gap-4">
            <Link
              to="/login"
              className="hidden sm:block text-sm font-medium text-gray-600 hover:text-[#002f96] transition-colors"
            >
              Log In
            </Link>
            <Link
              to="/signup"
              className={`
                bg-[#002f96] text-white font-medium rounded-full hover:bg-[#002f96]/90 transition-all shadow-lg whitespace-nowrap
                ${isScrolled ? "px-5 py-2 text-xs" : "px-6 py-2 text-sm"}
              `}
            >
              Become a Member
            </Link>
          </div>
        </nav>
      </header>

      {/* --- Main Content --- */}
      <div className="relative z-10 flex flex-col min-h-screen pt-40">
        <main className="flex-grow">
          {/* Hero Section */}
          <section className="container mx-auto px-6 pb-20 pt-10 text-center">
            <div className="max-w-4xl mx-auto">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#002f96]/10 text-[#002f96] text-xs font-bold mb-8 border border-[#002f96]/20 uppercase tracking-wider">
                <FaAward className="w-3.5 h-3.5" />
                <span>Ministry of Skill Development</span>
              </div>

              <h2 className="text-5xl md:text-7xl font-extrabold text-gray-900 mb-8 leading-tight tracking-tight">
                Smart Monitoring for <br />
                <span className="text-[#002f96] drop-shadow-sm">
                  Future-Ready Labs
                </span>
              </h2>

              <p className="text-xl md:text-2xl text-gray-600 mb-10 leading-relaxed max-w-2xl mx-auto">
                Ensure optimal utilization, predictive maintenance, and enhanced
                safety for ITIs, polytechnics, and training centers across
                India.
              </p>

              <div className="flex flex-col sm:flex-row gap-5 justify-center items-center">
                <Link
                  to="/signup"
                  className="w-full sm:w-auto px-8 py-4 bg-[#002f96] text-white text-lg font-semibold rounded-xl hover:bg-blue-700 hover:scale-105 transition-all shadow-[0_10px_20px_rgba(21,93,252,0.3)] flex items-center justify-center gap-2"
                >
                  Become a Member <FaChevronRight className="w-5 h-5" />
                </Link>
                <Link
                  to="/login"
                  className="w-full sm:w-auto px-8 py-4 bg-white text-gray-700 text-lg font-semibold rounded-xl border border-gray-200 hover:bg-gray-50 hover:text-[#002f96] hover:border-[#002f96]/30 transition-all shadow-md flex items-center justify-center gap-2"
                >
                  Already a Member?
                </Link>
              </div>
            </div>
          </section>

          {/* Features Grid */}
          <section className="container mx-auto px-6 py-16">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="group bg-white/80 backdrop-blur-sm p-8 rounded-2xl border border-gray-100 shadow-lg hover:shadow-2xl hover:border-[#002f96]/20 transition-all duration-300 transform hover:-translate-y-1"
                >
                  <div className="w-14 h-14 bg-[#002f96]/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-[#002f96] transition-colors duration-300">
                    <feature.icon className="w-7 h-7 text-[#002f96] group-hover:text-white transition-colors duration-300" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Benefits Section */}
          <section className="container mx-auto px-6 py-16 mb-16">
              <div className="bg-white backdrop-blur-xl rounded-[2.5rem] p-10 md:p-20 text-[#002f96] shadow-2xl relative overflow-hidden">
              {/* Decorative Glow */}
              <div className="absolute top-0 right-0 w-[30rem] h-[30rem] bg-[#002f96] rounded-full blur-[100px] opacity-20 transform translate-x-1/2 -translate-y-1/2"></div>
              <div className="absolute bottom-0 left-0 w-[20rem] h-[20rem] bg-[#002f96] rounded-full blur-[80px] opacity-10 transform -translate-x-1/3 translate-y-1/3"></div>

              <div className="relative z-10">
                <div className="text-center mb-16">
                  <h3 className="text-3xl md:text-5xl font-bold mb-6">
                    Why Top Institutions Choose Our Platform
                  </h3>
                  <p className="text-gray-500 max-w-2xl mx-auto text-lg">
                    We provide the infrastructure needed to scale vocational
                    training into the Industry 4.0 era.
                  </p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {benefits.map((benefit, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-4 p-4 rounded-2xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5"
                    >
                      <div className="p-1 bg-[#002f96]/20 rounded-full mt-0.5">
                        <FaCheckCircle className="w-5 h-5 text-[#002f96] flex-shrink-0" />
                      </div>
                      <span className="text-lg text-gray-500 font-medium">
                        {benefit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-gray-200 mt-auto">
          <div className="container mx-auto px-6 py-12">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-[#002f96] rounded-lg">
                  <FaChartLine className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-gray-900">
                  IoT Monitor
                </span>
              </div>

              <div className="flex flex-wrap gap-8 text-sm font-medium text-gray-500">
                <Link
                  to="/about"
                  className="hover:text-[#002f96] transition-colors"
                >
                  About Us
                </Link>
                <Link
                  to="/contact"
                  className="hover:text-[#002f96] transition-colors"
                >
                  Contact
                </Link>
                <Link
                  to="/privacy"
                  className="hover:text-[#002f96] transition-colors"
                >
                  Privacy Policy
                </Link>
                <Link
                  to="/terms"
                  className="flex items-center gap-1 hover:text-[#002f96] transition-colors"
                >
                  <FaFileAlt className="w-4 h-4" />
                  Terms & Conditions
                </Link>
              </div>
            </div>

            <div className="border-t border-gray-100 mt-8 pt-8 text-center">
              <p className="text-sm text-gray-400">
                &copy; {new Date().getFullYear()} IoT Equipment Monitor.
                Ministry of Skill Development & Entrepreneurship. All rights
                reserved.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}