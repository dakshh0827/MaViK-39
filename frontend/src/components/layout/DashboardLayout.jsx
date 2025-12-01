import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import {
  FaBars,
  FaHome,
  FaFileAlt,
  FaCommentDots,
  FaQuestionCircle,
  FaCodeBranch,
  FaUser,
  FaSignOutAlt,
  FaPlus,
  FaUniversity,
  FaBuilding,
  FaDesktop,
  FaExclamationTriangle
} from "react-icons/fa";
import { useState, useEffect, useRef } from "react";
import { useAuthStore } from "../../stores/authStore";

// Import Modals
import InstituteManagerForm from "../../components/admin/InstituteManagerForm";
import LabManagerForm from "../../components/admin/labManagerForm";

export default function DashboardLayout() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [isQuickMenuOpen, setIsQuickMenuOpen] = useState(false);

  // Modal States
  const [isInstituteModalOpen, setIsInstituteModalOpen] = useState(false);
  const [isLabModalOpen, setIsLabModalOpen] = useState(false);

  // State to trigger Modals in child components
  const [triggerEquipmentModal, setTriggerEquipmentModal] = useState(0);
  const [triggerBreakdownModal, setTriggerBreakdownModal] = useState(0);

  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  // Ref for the quick menu container
  const quickMenuRef = useRef(null);

  // Close quick menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        isQuickMenuOpen &&
        quickMenuRef.current &&
        !quickMenuRef.current.contains(event.target)
      ) {
        setIsQuickMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isQuickMenuOpen]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const navItems = [
    { icon: FaHome, label: "Dashboard", path: "/dashboard" },
    { icon: FaCodeBranch, label: "SLD View", path: "/sld" },
    { icon: FaFileAlt, label: "Reports", path: "/reports" },
    { icon: FaCommentDots, label: "Chatbot", path: "/chatbot" },
    { icon: FaQuestionCircle, label: "Help & Support", path: "/help" },
    { icon: FaUser, label: "Profile", path: "/profile" },
  ];

  const sidebarWidth = isSidebarCollapsed ? "5rem" : "16rem";
  const role = user?.role;

  // Render Quick Action Options based on Role
  const renderQuickActions = () => {
    if (role === "POLICY_MAKER") {
      return (
        <>
          <button
            onClick={() => {
              setIsInstituteModalOpen(true);
              setIsQuickMenuOpen(false);
            }}
            className="w-full flex items-center gap-3 p-3 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-900 rounded-lg transition-colors text-left"
          >
            <div className="p-1.5 bg-blue-100 text-blue-800 rounded-md">
              <FaUniversity size={18} />
            </div>
            <span>Manage Institutes</span>
          </button>
          <button
            onClick={() => {
              setIsLabModalOpen(true);
              setIsQuickMenuOpen(false);
            }}
            className="w-full flex items-center gap-3 p-3 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-900 rounded-lg transition-colors text-left"
          >
            <div className="p-1.5 bg-blue-100 text-blue-800 rounded-md">
              <FaBuilding size={18} />
            </div>
            <span>Add New Lab</span>
          </button>
        </>
      );
    }

    if (role === "LAB_MANAGER") {
      return (
        <>
          <button
            onClick={() => {
              setTriggerEquipmentModal((prev) => prev + 1);
              setIsQuickMenuOpen(false);
            }}
            className="w-full flex items-center gap-3 p-3 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-900 rounded-lg transition-colors text-left"
          >
            <div className="p-1.5 bg-blue-100 text-blue-800 rounded-md">
              <FaDesktop size={18} />
            </div>
            <span>Add Equipment</span>
          </button>

          <button
            onClick={() => {
              setTriggerBreakdownModal((prev) => prev + 1);
              setIsQuickMenuOpen(false);
            }}
            className="w-full flex items-center gap-3 p-3 text-sm font-medium text-gray-700 hover:bg-red-50 hover:text-red-900 rounded-lg transition-colors text-left"
          >
            <div className="p-1.5 bg-red-100 text-red-800 rounded-md">
              <FaExclamationTriangle size={18} />
            </div>
            <span>Report Breakdown</span>
          </button>
        </>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      {/* SIDEBAR */}
      <aside
        className={`
          fixed left-0 top-0 inset-y-0 bg-white border-r border-gray-200
          transition-all duration-300 z-50 flex flex-col
          ${isSidebarCollapsed ? "w-20" : "w-64"}
        `}
      >
        {/* Sidebar Header */}
        <div className="h-16 flex items-center px-4 flex-shrink-0">
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="p-2 rounded-md text-gray-600 hover:bg-gray-100"
          >
            <FaBars size={22} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="mt-4 px-3 space-y-2 flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center rounded-lg transition-all duration-300
                  ${isSidebarCollapsed ? "gap-0 px-3 py-3" : "gap-3 px-3 py-3"}
                  ${
                    isActive
                      ? "bg-blue-50 text-blue-900 font-medium"
                      : "text-gray-700 hover:bg-blue-50 hover:text-blue-900"
                  }
                `}
              >
                {/* Icon Wrapper */}
                <div className="w-6 flex justify-center">
                  <item.icon size={20} />
                </div>

                {/* LABEL */}
                <span
                  className={`
                    whitespace-nowrap
                    transition-all duration-300 
                    ${
                      isSidebarCollapsed
                        ? "opacity-0 w-0"
                        : "opacity-100 w-auto"
                    }
                  `}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* QUICK ACTIONS (Bottom Sidebar) */}
        {(role === "POLICY_MAKER" || role === "LAB_MANAGER") && (
          <div
            ref={quickMenuRef}
            className="p-3 border-t border-gray-100 bg-white relative overflow-visible"
          >
            {/* The Pop-up Menu Card */}
            <div
              className={`
                absolute bottom-full left-2 mb-3
                w-64 bg-white border border-gray-200 shadow-xl rounded-xl p-2
                flex flex-col gap-1 z-[60]
                transition-all duration-200 origin-bottom-left
                ${
                  isQuickMenuOpen
                    ? "opacity-100 scale-100 visible translate-y-0"
                    : "opacity-0 scale-95 invisible translate-y-2"
                }
              `}
            >
              <div className="px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 mb-1">
                Quick Actions
              </div>
              {renderQuickActions()}
            </div>

            {/* The Plus Button */}
            <button
              onClick={() => setIsQuickMenuOpen(!isQuickMenuOpen)}
              className={`
                flex items-center justify-center w-full
                bg-blue-600 hover:bg-blue-700 text-white
                shadow-md rounded-lg transition-all duration-300
                ${isSidebarCollapsed ? "h-10 px-0" : "h-10 gap-2 px-4"}
              `}
              title="Quick Actions"
            >
              <div
                className={`transition-transform duration-300 ${
                  isQuickMenuOpen ? "rotate-45" : ""
                }`}
              >
                <FaPlus size={20} />
              </div>
              {!isSidebarCollapsed && (
                <span className="font-medium">Quick Add</span>
              )}
            </button>
          </div>
        )}
      </aside>

      {/* NAVBAR */}
      <header
        className="fixed top-0 h-16 bg-white z-40 flex items-center justify-between px-6 border-b border-gray-200"
        style={{
          left: sidebarWidth,
          right: 0,
          transition: "left 0.3s ease",
        }}
      >
        <h1 className="text-2xl font-bold text-blue-600">
          MaViK-39
        </h1>

        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600 hidden sm:block">
            {user?.firstName} {user?.lastName}
          </span>
          <span className="px-3 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
            {user?.role?.replace("_", " ")}
          </span>
          <button
            onClick={handleLogout}
            className="p-2 rounded-md text-gray-600 hover:bg-gray-100"
          >
            <FaSignOutAlt size={20} />
          </button>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main
        className="p-4 sm:p-6 lg:p-8 overflow-auto"
        style={{
          marginLeft: sidebarWidth,
          paddingTop: "5rem",
          transition: "margin-left 0.3s ease",
        }}
      >
        {/* Pass trigger states down via context so dashboard can listen to them */}
        <Outlet context={{ triggerEquipmentModal, triggerBreakdownModal }} />
      </main>

      {/* GLOBAL MODALS */}
      {isInstituteModalOpen && (
        <InstituteManagerForm
          isOpen={isInstituteModalOpen}
          onClose={() => setIsInstituteModalOpen(false)}
        />
      )}

      {isLabModalOpen && (
        <LabManagerForm
          isOpen={isLabModalOpen}
          onClose={() => setIsLabModalOpen(false)}
          labToEdit={null} // Create mode
        />
      )}
    </div>
  );
}