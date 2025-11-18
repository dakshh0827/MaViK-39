// =====================================================
// 10. src/components/layout/DashboardLayout.jsx
// =====================================================

import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import {
  Menu,
  Home,
  FileText,
  MessageSquare,
  HelpCircle,
  GitBranch,
  User,
  LogOut,
} from "lucide-react";
import { useState } from "react";
import { useAuthStore } from "../../stores/authStore";

export default function DashboardLayout() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const navItems = [
    { icon: Home, label: "Dashboard", path: "/dashboard" },
    { icon: GitBranch, label: "SLD View", path: "/sld" },
    { icon: FileText, label: "Reports", path: "/reports" },
    { icon: MessageSquare, label: "Chatbot", path: "/chatbot" },
    { icon: HelpCircle, label: "Help & Support", path: "/help" },
    { icon: User, label: "Profile", path: "/profile" },
  ];

  const sidebarWidth = isSidebarCollapsed ? "5rem" : "16rem";

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      {/* SIDEBAR */}
      <aside
        className={`
          fixed left-0 top-0 inset-y-0 bg-white border-r border-gray-200
          transition-all duration-300 z-50
          ${isSidebarCollapsed ? "w-20" : "w-64"}
        `}
      >
        {/* Sidebar Header */}
        <div className="h-16 flex items-center px-4">
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="p-2 rounded-md text-gray-600 hover:bg-gray-100"
          >
            <Menu size={22} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="mt-4 px-3 space-y-2">
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
                {/* Icon Wrapper to avoid shifting */}
                <div className="w-6 flex justify-center">
                  <item.icon size={20} />
                </div>

                {/* LABEL WITH SMOOTH FADE */}
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
      </aside>

      {/* NAVBAR */}
      <header
        className="fixed top-0 h-16 bg-white z-40 flex items-center justify-between px-6"
        style={{
          left: sidebarWidth,
          right: 0,
        }}
      >
        <h1 className="text-lg font-bold text-blue-900">
          IoT Equipment Monitor
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
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main
        className="p-4 sm:p-6 lg:p-8 overflow-auto"
        style={{
          marginLeft: sidebarWidth,
          paddingTop: "4.5rem",
          transition: "margin-left 0.3s ease",
        }}
      >
        <Outlet />
      </main>
    </div>
  );
}
