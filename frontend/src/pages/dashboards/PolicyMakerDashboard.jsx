/*
 * =====================================================
 * PolicyMakerDashboard.jsx - REAL-TIME SOCKETS ENABLED
 * =====================================================
 * 1. Added Socket.IO integration for real-time alerts.
 * 2. Added live updates for Active Alerts list.
 * 3. Preserved all previous UI fixes (Modals, Charts).
 */

import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import io from "socket.io-client"; // Added Socket.IO
import { useDashboardStore } from "../../stores/dashboardStore";
import { useAlertStore } from "../../stores/alertStore";
import { useLabStore } from "../../stores/labStore";
import { useEquipmentStore } from "../../stores/equipmentStore";
import { useInstituteStore } from "../../stores/instituteStore";
import { useBreakdownStore } from "../../stores/breakdownStore";
import AlertsList from "../../components/dashboard/AlertsList";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import LabManagerForm from "../../components/admin/LabManagerForm"; // Corrected casing if needed
import InstituteManagerForm from "../../components/admin/InstituteManagerForm";
import api from "../../lib/axios";
import {
  FaChartLine,
  FaBuilding,
  FaExclamationTriangle,
  FaArrowUp,
  FaFilter,
  FaUsers,
  FaBox,
  FaEdit,
  FaTrash,
  FaExclamationCircle,
  FaExternalLinkAlt,
  FaTh,
  FaList,
  FaArrowRight,
  FaTimes,
  FaCheckCircle,
  FaTimesCircle,
  FaCalendarAlt,
  FaUser,
  FaMapMarkerAlt,
  FaFileAlt,
  FaHistory,
  FaCommentAlt,
  FaClock,
  FaUserCheck,
  FaWifi, // Added Wifi icon
} from "react-icons/fa";
import { ImLab } from "react-icons/im";
import { MdOutlineWifiOff } from "react-icons/md"; // Added Offline icon

const DEPARTMENT_DISPLAY_NAMES = {
  FITTER_MANUFACTURING: "Fitter/Manufacturing",
  ELECTRICAL_ENGINEERING: "Electrical Engineering",
  WELDING_FABRICATION: "Welding & Fabrication",
  TOOL_DIE_MAKING: "Tool & Die Making",
  ADDITIVE_MANUFACTURING: "Additive Manufacturing",
  SOLAR_INSTALLER_PV: "Solar Installer (PV)",
  MATERIAL_TESTING_QUALITY: "Material Testing/Quality",
  ADVANCED_MANUFACTURING_CNC: "Advanced Manufacturing/CNC",
  AUTOMOTIVE_MECHANIC: "Automotive/Mechanic",
};

// --- CSS STYLE TO FORCE-FIX CHILD MODALS ---
const modalStripperStyle = `
  .modal-stripper * {
    position: static !important;
  }
  .modal-stripper > *:last-child {
    position: relative !important;
  }
  .modal-stripper div[class*="fixed"],
  .modal-stripper div[class*="absolute"],
  .modal-stripper div[class*="inset"],
  .modal-stripper div[class*="bg-black"],
  .modal-stripper div[class*="bg-gray-900"],
  .modal-stripper div[class*="bg-slate"] {
    background-color: transparent !important;
    backdrop-filter: none !important;
  }
  .modal-stripper::before,
  .modal-stripper::after {
    display: none !important;
  }
`;

// --- Modal Wrapper ---
const ModalWrapper = ({ children, onClose }) => {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-md transition-all animate-in fade-in duration-200"
      onClick={onClose}
    >
      <style>{modalStripperStyle}</style>
      <div
        className="modal-stripper relative w-auto max-w-4xl max-h-[90vh] overflow-y-auto p-4 flex flex-col items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  );
};

// --- SVG Health History Chart ---
const HealthHistoryChart = ({ currentScore = 0 }) => {
  const chartData = useMemo(() => {
    const today = new Date();
    const months = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      months.push(d.toLocaleString("default", { month: "short" }));
    }

    const safeScore = currentScore || 0;

    return months.map((m, i) => {
      if (i === 5) {
        return { month: m, score: safeScore };
      }
      const variance = Math.floor(Math.random() * 20) - 10;
      const calculatedScore = Math.max(0, Math.min(100, safeScore + variance));
      return { month: m, score: calculatedScore };
    });
  }, [currentScore]);

  const height = 120;
  const width = 600;
  const padding = 15;
  const maxScore = 100;

  const getX = (index) =>
    padding + (index / (chartData.length - 1)) * (width - 2 * padding);
  const getY = (score) =>
    height - padding - (score / maxScore) * (height - 2 * padding);

  const points = chartData
    .map((d, i) => `${getX(i)},${getY(d.score)}`)
    .join(" ");
  const areaPoints = `${getX(0)},${height - padding} ${points} ${getX(
    chartData.length - 1
  )},${height - padding}`;

  return (
    <div className="w-full h-full flex flex-col items-center justify-center overflow-hidden">
      <div className="relative w-full h-full">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="pmScoreGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </linearGradient>
          </defs>
          <line
            x1={padding}
            y1={getY(0)}
            x2={width - padding}
            y2={getY(0)}
            stroke="#e5e7eb"
            strokeWidth="1"
            strokeDasharray="4"
            vectorEffect="non-scaling-stroke"
          />
          <line
            x1={padding}
            y1={getY(50)}
            x2={width - padding}
            y2={getY(50)}
            stroke="#e5e7eb"
            strokeWidth="1"
            strokeDasharray="4"
            vectorEffect="non-scaling-stroke"
          />
          <line
            x1={padding}
            y1={getY(100)}
            x2={width - padding}
            y2={getY(100)}
            stroke="#e5e7eb"
            strokeWidth="1"
            strokeDasharray="4"
            vectorEffect="non-scaling-stroke"
          />
          <polygon points={areaPoints} fill="url(#pmScoreGradient)" />
          <polyline
            points={points}
            fill="none"
            stroke="#10b981"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          {chartData.map((d, i) => (
            <g key={i}>
              <circle
                cx={getX(i)}
                cy={getY(d.score)}
                r="3"
                fill="white"
                stroke="#10b981"
                strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
              />
              <text
                x={getX(i)}
                y={getY(d.score) - 8}
                textAnchor="middle"
                fontSize="10"
                fill="#10b981"
                fontWeight="bold"
              >
                {d.score}
              </text>
              <text
                x={getX(i)}
                y={height - 2}
                textAnchor="middle"
                fontSize="9"
                fill="#9ca3af"
                fontWeight="600"
                style={{ textTransform: "uppercase" }}
              >
                {d.month}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
};

// --- Compact History List ---
const CompactHistoryList = ({ alerts, loading }) => {
  if (loading)
    return (
      <div className="flex justify-center py-4">
        <LoadingSpinner size="sm" />
      </div>
    );
  if (!alerts || alerts.length === 0)
    return (
      <div className="text-center text-xs text-gray-500 py-4">
        No history found.
      </div>
    );

  return (
    <div className="space-y-3 p-2">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className="group bg-white p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all flex items-start gap-3"
        >
          <div
            className={`w-2 h-2 mt-1.5 rounded-full flex-shrink-0 ${
              alert.priority === "CRITICAL"
                ? "bg-red-500 shadow-md shadow-red-200"
                : alert.priority === "HIGH"
                ? "bg-orange-400"
                : "bg-green-500"
            }`}
            title={`Priority: ${alert.priority}`}
          />
          <div className="flex-1 min-w-0 flex flex-col gap-1.5">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-semibold text-xs text-gray-900">
                  {alert.equipment?.name || "Unknown Equipment"}
                </h4>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-gray-500 flex items-center gap-1">
                    <ImLab className="w-3 h-3" />{" "}
                    {alert.lab?.name || "Unknown Lab"}
                  </span>
                  <span className="text-[10px] font-medium px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                    {alert.type?.replace(/_/g, " ") || "ALERT"}
                  </span>
                </div>
              </div>
              <span className="text-[10px] text-gray-400 whitespace-nowrap flex items-center gap-1">
                <FaClock className="w-3 h-3" />
                {new Date(
                  alert.resolvedAt || alert.createdAt
                ).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
            <div className="text-xs text-gray-700 bg-gray-50 p-2 rounded border border-gray-100 leading-relaxed">
              {alert.message}
            </div>
            {alert.isResolved && (
              <div className="pt-2 mt-1 border-t border-gray-100 grid gap-1">
                <div className="flex items-center gap-1.5 text-[10px] text-emerald-700 font-medium">
                  <FaUserCheck className="w-3 h-3" />
                  Resolved by {alert.resolver?.name || "Admin"}
                </div>
                {alert.resolutionNotes && (
                  <div className="flex items-start gap-1.5 text-[10px] text-gray-500 italic pl-0.5">
                    <FaCommentAlt className="w-3 h-3 mt-0.5 flex-shrink-0" />"
                    {alert.resolutionNotes}"
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default function PolicyMakerDashboard() {
  const navigate = useNavigate();
  const {
    overview,
    fetchOverview,
    isLoading: dashboardLoading,
    error: dashboardError,
  } = useDashboardStore();
  const { alerts, fetchAlerts, resolveAlert } = useAlertStore();

  const [alertTab, setAlertTab] = useState("active");
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [isActiveAlertsLoading, setIsActiveAlertsLoading] = useState(false);
  const [historyAlerts, setHistoryAlerts] = useState([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  const { labs, fetchLabs, deleteLab, isLoading: labLoading } = useLabStore();
  const { reorderRequests, fetchReorderRequests, reviewReorderRequest } =
    useBreakdownStore();

  const [showPendingOnly, setShowPendingOnly] = useState(true);
  const { pagination, fetchEquipment } = useEquipmentStore();
  const {
    institutes,
    fetchInstitutes,
    isLoading: institutesLoading,
  } = useInstituteStore();

  const [selectedInstitute, setSelectedInstitute] = useState("all");
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [labManagersCount, setLabManagersCount] = useState(0);
  const [isLabModalOpen, setIsLabModalOpen] = useState(false);
  const [isInstituteModalOpen, setIsInstituteModalOpen] = useState(false);
  const [editingLab, setEditingLab] = useState(null);

  const [viewMode, setViewMode] = useState("list");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [reviewComment, setReviewComment] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // --- SOCKET STATE ---
  const [socket, setSocket] = useState(null);
  const [isSocketConnected, setIsSocketConnected] = useState(false);

  // --- SOCKET CONNECTION EFFECT ---
  useEffect(() => {
    console.log('🔌 [PolicyMaker] Setting up Socket.IO connection...');

    let token = null;
    try {
      const authStorage = localStorage.getItem('auth-storage');
      if (authStorage) {
        const parsed = JSON.parse(authStorage);
        token = parsed?.state?.accessToken;
      }
    } catch (e) {
      console.error('❌ [PolicyMaker] Failed to parse auth token:', e);
    }

    if (!token) {
      console.error('❌ [PolicyMaker] No access token found');
      return;
    }

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const socketUrl = apiUrl.replace('/api', '');
    
    const socketInstance = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketInstance.on('connect', () => {
      console.log('✅ [PolicyMaker] Socket.IO connected!', socketInstance.id);
      setIsSocketConnected(true);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('❌ [PolicyMaker] Socket.IO disconnected:', reason);
      setIsSocketConnected(false);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('❌ [PolicyMaker] Socket.IO connection error:', error.message);
      setIsSocketConnected(false);
    });

    // Listen for new alerts
    socketInstance.on('alert:new', (alert) => {
      console.log('🚨 [PolicyMaker] New alert received:', alert);
      handleNewAlert(alert);
    });

    setSocket(socketInstance);

    return () => {
      console.log('🔌 [PolicyMaker] Cleaning up Socket.IO connection');
      socketInstance.removeAllListeners();
      socketInstance.disconnect();
    };
  }, []);

  // --- HANDLE NEW ALERT ---
  const handleNewAlert = (alert) => {
    // 1. Update active alerts list if on "active" tab
    setActiveAlerts((prev) => {
      const exists = prev.some((a) => a.id === alert.id);
      if (exists) return prev;
      return [alert, ...prev];
    });

    // 2. Refresh overview stats (to update counters)
    fetchOverview();

    // 3. Show notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('⚠️ Policy Maker Alert', {
        body: `${alert.title}: ${alert.equipment?.name}`,
        icon: '/favicon.ico',
      });
    }
  };

  const parseAlertResponse = (response) => {
    if (!response) return [];
    if (Array.isArray(response)) return response;
    if (response.data && Array.isArray(response.data)) return response.data;
    if (response.alerts && Array.isArray(response.alerts))
      return response.alerts;
    return [];
  };

  const fetchActiveAlertsIsolated = async () => {
    setIsActiveAlertsLoading(true);
    try {
      const response = await fetchAlerts({ isResolved: false });
      setActiveAlerts(parseAlertResponse(response));
    } catch (error) {
      console.error("Failed to fetch active alerts:", error);
    } finally {
      setIsActiveAlertsLoading(false);
    }
  };

  const fetchHistoryAlertsIsolated = async () => {
    setIsHistoryLoading(true);
    try {
      const response = await fetchAlerts({ isResolved: true, limit: 20 });
      setHistoryAlerts(parseAlertResponse(response));
    } catch (error) {
      console.error("Failed to fetch history alerts:", error);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const handleTabChange = (tab) => {
    setAlertTab(tab);
    if (tab === "history") fetchHistoryAlertsIsolated();
    if (tab === "active") fetchActiveAlertsIsolated();
  };

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        await Promise.allSettled([
          fetchOverview(),
          fetchActiveAlertsIsolated(),
          fetchInstitutes(true),
          fetchLabs({}, true),
          fetchReorderRequests(),
        ]);
        fetchFilteredCounts("all", "all");
      } catch (error) {
        console.error("❌ Failed to load initial data:", error);
      }
    };
    loadInitialData();
  }, []);

  const institutesList = institutes;
  const departmentsList = useMemo(() => {
    if (selectedInstitute === "all")
      return [...new Set(labs.map((lab) => lab.department))].sort();
    return [
      ...new Set(
        labs
          .filter((lab) => lab.instituteId === selectedInstitute)
          .map((lab) => lab.department)
      ),
    ].sort();
  }, [labs, selectedInstitute]);

  const labsList = useMemo(() => {
    return labs.filter((lab) => {
      const instituteMatch =
        selectedInstitute === "all" || lab.instituteId === selectedInstitute;
      const departmentMatch =
        selectedDepartment === "all" || lab.department === selectedDepartment;
      return instituteMatch && departmentMatch;
    });
  }, [labs, selectedInstitute, selectedDepartment]);

  const handleInstituteChange = (e) => {
    const inst = e.target.value;
    setSelectedInstitute(inst);
    setSelectedDepartment("all");
    fetchFilteredCounts(inst, "all");
  };

  const handleDepartmentChange = (e) => {
    const dept = e.target.value;
    setSelectedDepartment(dept);
    fetchFilteredCounts(selectedInstitute, dept);
  };

  const fetchFilteredCounts = async (instituteId, department) => {
    try {
      const userParams = new URLSearchParams();
      userParams.append("role", "LAB_MANAGER");
      if (instituteId !== "all") userParams.append("instituteId", instituteId);
      const userRes = await api.get("/users", { params: userParams });
      let managers = userRes.data.data || [];
      if (department !== "all")
        managers = managers.filter((user) => user.department === department);
      setLabManagersCount(managers.length);
      const eqParams = {};
      if (instituteId !== "all") eqParams.instituteId = instituteId;
      if (department !== "all") eqParams.department = department;
      await fetchEquipment(eqParams);
    } catch (error) {
      console.error("Failed to fetch filtered counts:", error);
    }
  };

  const handleResolveAlert = async (alertId) => {
    try {
      await resolveAlert(alertId);
      await Promise.all([fetchActiveAlertsIsolated(), fetchOverview()]);
      if (alertTab === "history") fetchHistoryAlertsIsolated();
    } catch (error) {
      console.error("Failed to resolve alert:", error);
      alert("Failed to resolve alert. Please try again.");
    }
  };

  const handleReviewAction = async (action) => {
    if (!selectedRequest) return;
    setIsSubmittingReview(true);
    try {
      await reviewReorderRequest(selectedRequest.id, action, reviewComment);
      await fetchReorderRequests();
      setSelectedRequest(null);
      setReviewComment("");
    } catch (error) {
      console.error("Failed to review request:", error);
      alert("Failed to process review. Please try again.");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const openRequestModal = (request) => {
    setReviewComment("");
    setSelectedRequest(request);
  };

  const handleOpenEditLab = (lab) => {
    setEditingLab(lab);
    setIsLabModalOpen(true);
  };
  const handleDeleteLab = async (labId) => {
    if (!window.confirm(`Are you sure you want to delete lab ${labId}?`))
      return;
    try {
      await deleteLab(labId);
      await fetchLabs();
    } catch (error) {
      alert(error.message || "Failed to delete lab");
    }
  };
  const handleLabModalClose = async () => {
    setIsLabModalOpen(false);
    setEditingLab(null);
    await fetchLabs();
  };
  const handleInstituteModalClose = async () => {
    setIsInstituteModalOpen(false);
    await fetchInstitutes();
    await fetchLabs();
  };
  const handleLabClick = (labId) => {
    navigate(`/dashboard/lab-analytics/${labId}`);
  };

  const isLoading = dashboardLoading || labLoading || institutesLoading;
  if (isLoading && !labs.length && !institutes.length && !overview)
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  if (dashboardError && !overview)
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <FaExclamationCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Failed to Load Dashboard
          </h2>
          <button
            onClick={() => fetchOverview()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );

  const standardStats = [
    {
      icon: FaBuilding,
      title: "Institutions",
      value: overview?.overview?.totalInstitutions || 0,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
    },
    {
      icon: FaChartLine,
      title: "Total Equipment",
      value: overview?.overview?.totalEquipment || 0,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      icon: FaUsers,
      title: "Lab Managers",
      value: labManagersCount,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      icon: FaBox,
      title: "Items in Stock",
      value: pagination.total || 0,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
  ];

  const pendingReorders = reorderRequests.filter((r) => r.status === "PENDING");
  const displayedReorders = showPendingOnly ? pendingReorders : reorderRequests;

  return (
    <div className="h-[calc(92vh-4rem)] mt-0.5 overflow-hidden bg-gray-200 p-1">
      <div className="h-full grid grid-cols-12 gap-4">
        {/* LEFT SECTION - 8 Columns */}
        <div className="col-span-8 flex flex-col gap-4 h-full min-h-0">
          {/* UPDATED GRID LAYOUT: 50% Stats, 50% Chart */}
          <div className="grid grid-cols-2 gap-3 flex-shrink-0 h-44">
            {/* General Stats */}
            <div className="col-span-1 grid grid-cols-2 grid-rows-2 gap-3 h-full">
              {standardStats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100 shadow-md hover:shadow-md transition-shadow"
                  >
                    <div className={`p-2.5 rounded-lg ${stat.bg}`}>
                      <Icon className={`w-5 h-5 ${stat.color}`} />
                    </div>
                    <div>
                      <div className="text-xl font-bold text-gray-900 leading-tight">
                        {stat.value}
                      </div>
                      <div className="text-xs font-medium text-gray-500">
                        {stat.title}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Health Score Chart */}
            <div className="col-span-1 bg-white rounded-xl shadow-md border border-gray-100 hover:shadow-md transition-shadow flex flex-col items-center justify-between p-3 relative overflow-hidden">
              <div className="w-full flex items-center justify-between z-10">
                <h3 className="text-xs font-bold text-gray-700">
                  Avg Health Score
                </h3>
                <span
                  className={`text-sm font-bold ${
                    overview?.overview?.avgHealthScore >= 80
                      ? "text-emerald-600"
                      : "text-yellow-600"
                  }`}
                >
                  {overview?.overview?.avgHealthScore || 0}%
                </span>
              </div>
              <div className="flex-1 w-full z-10 pt-2 min-h-0">
                <HealthHistoryChart
                  currentScore={overview?.overview?.avgHealthScore || 0}
                />
              </div>
            </div>
          </div>

          <div className="flex-1 bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden flex flex-col min-h-0">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-white flex-shrink-0 gap-4">
              <div className="flex items-center gap-2 flex-shrink-0">
                <ImLab className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-gray-800">
                  Labs Directory
                </h3>
                <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs font-medium">
                  {labsList.length}
                </span>
                {/* Connection Status Badge */}
                {isSocketConnected ? (
                  <span className="flex items-center gap-1.5 px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded-full border border-green-200 ml-2">
                    <FaWifi className="w-2.5 h-2.5" />
                    Live
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-bold rounded-full border border-gray-200 ml-2">
                    <MdOutlineWifiOff className="w-2.5 h-2.5" />
                    Offline
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 flex-1 justify-end">
                <div className="flex items-center gap-2 max-w-2xl flex-1 justify-end">
                  <FaFilter className="w-4 h-4 text-gray-400" />
                  <select
                    value={selectedInstitute}
                    onChange={handleInstituteChange}
                    className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-50 max-w-[200px]"
                  >
                    <option value="all">All Institutes</option>
                    {institutesList.map((inst) => (
                      <option key={inst.id} value={inst.instituteId}>
                        {inst.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={selectedDepartment}
                    onChange={handleDepartmentChange}
                    className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-50 max-w-[200px]"
                    disabled={departmentsList.length === 0}
                  >
                    <option value="all">All Departments</option>
                    {departmentsList.map((dept) => (
                      <option key={dept} value={dept}>
                        {DEPARTMENT_DISPLAY_NAMES[dept] || dept}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex bg-gray-100 p-1 rounded-lg shrink-0">
                  <button
                    onClick={() => setViewMode("cards")}
                    className={`p-1.5 rounded transition-all ${
                      viewMode === "cards"
                        ? "bg-white text-blue-600 shadow-md"
                        : "text-gray-400 hover:text-gray-600"
                    }`}
                  >
                    <FaTh className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={`p-1.5 rounded transition-all ${
                      viewMode === "list"
                        ? "bg-white text-blue-600 shadow-md"
                        : "text-gray-400 hover:text-gray-600"
                    }`}
                  >
                    <FaList className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 min-h-0 bg-gray-50/30">
              {labsList.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <ImLab className="w-12 h-12 mb-2 opacity-20" />
                  <p className="text-sm">No labs match the selected filters.</p>
                </div>
              ) : viewMode === "cards" ? (
                <div className="grid grid-cols-3 gap-4">
                  {labsList.map((lab) => (
                    <div
                      key={lab.labId}
                      className="group relative flex flex-col p-4 rounded-xl border border-gray-200 bg-white hover:border-blue-400 hover:shadow-md transition-all h-full"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                          <ImLab className="w-5 h-5" />
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleOpenEditLab(lab)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          >
                            <FaEdit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteLab(lab.labId)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          >
                            <FaTrash className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <button
                        onClick={() => handleLabClick(lab.labId)}
                        className="text-left flex-1"
                      >
                        <h4 className="font-bold text-gray-900 text-sm mb-1 truncate group-hover:text-blue-700">
                          {lab.name}
                        </h4>
                        <div className="space-y-1">
                          <p className="text-xs text-gray-500 flex items-center gap-1 truncate">
                            <FaMapMarkerAlt className="w-3 h-3" />{" "}
                            {lab.institute?.name || "N/A"}
                          </p>
                          <p className="text-xs text-gray-500 flex items-center gap-1 truncate">
                            <FaBox className="w-3 h-3" />{" "}
                            {DEPARTMENT_DISPLAY_NAMES[lab.department] ||
                              lab.department}
                          </p>
                        </div>
                      </button>
                      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                        <span className="font-mono text-gray-400">
                          #{lab.labId.slice(0, 8)}
                        </span>
                        <span className="text-blue-600 font-medium flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          View Details <FaArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {labsList.map((lab) => (
                    <div
                      key={lab.labId}
                      className="flex items-center justify-between p-3 rounded-lg border border-gray-200 bg-white hover:border-blue-400 hover:shadow-md transition-all group"
                    >
                      <button
                        onClick={() => handleLabClick(lab.labId)}
                        className="flex items-center gap-4 flex-1 text-left"
                      >
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                          <ImLab className="w-4 h-4" />
                        </div>
                        <div className="grid grid-cols-12 gap-4 flex-1 items-center">
                          <div className="col-span-4">
                            <div className="font-semibold text-gray-900 text-sm group-hover:text-blue-700">
                              {lab.name}
                            </div>
                            <div className="text-xs text-gray-400 font-mono">
                              {lab.labId}
                            </div>
                          </div>
                          <div className="col-span-4 text-xs text-gray-600 truncate">
                            {lab.institute?.name || "N/A"}
                          </div>
                          <div className="col-span-4 text-xs text-gray-600 truncate">
                            {DEPARTMENT_DISPLAY_NAMES[lab.department] ||
                              lab.department}
                          </div>
                        </div>
                      </button>
                      <div className="flex gap-2 pl-4 border-l border-gray-100">
                        <button
                          onClick={() => handleOpenEditLab(lab)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        >
                          <FaEdit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteLab(lab.labId)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <FaTrash className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleLabClick(lab.labId)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        >
                          <FaExternalLinkAlt className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT SECTION - 4 Columns */}
        <div className="col-span-4 flex flex-col gap-4 h-full min-h-0">
          <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden flex flex-col h-[45%]">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0 bg-white">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <FaExclamationTriangle className="w-4 h-4 text-red-500" />
                  {activeAlerts.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  )}
                </div>
                <h3 className="text-sm font-bold text-gray-800">Alerts</h3>
              </div>
              <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
                <button
                  onClick={() => handleTabChange("active")}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all ${
                    alertTab === "active"
                      ? "bg-white text-blue-600 shadow-md"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <FaList className="w-3 h-3" /> Active
                </button>
                <button
                  onClick={() => handleTabChange("history")}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all ${
                    alertTab === "history"
                      ? "bg-white text-blue-600 shadow-md"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <FaHistory className="w-3 h-3" /> History
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0">
              {alertTab === "active" ? (
                isActiveAlertsLoading ? (
                  <div className="flex justify-center py-6">
                    <LoadingSpinner />
                  </div>
                ) : (
                  <div className="p-4">
                    <AlertsList
                      alerts={activeAlerts}
                      onResolve={handleResolveAlert}
                      compact={true}
                    />
                  </div>
                )
              ) : (
                <CompactHistoryList
                  alerts={historyAlerts}
                  loading={isHistoryLoading}
                />
              )}
            </div>
          </div>

          <div className="flex-1 bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden flex flex-col min-h-0">
            <div className="px-4 py-3 border-b border-gray-100 flex flex-col gap-2 flex-shrink-0 bg-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FaBox className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-bold text-gray-800">
                    Reorder Requests
                  </h3>
                </div>
                <button
                  onClick={() => navigate("/reorder-requests")}
                  className="text-gray-400 hover:text-blue-600 transition-colors"
                  title="View Full Page"
                >
                  <FaExternalLinkAlt className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex bg-gray-100 p-1 rounded-lg w-full">
                <button
                  onClick={() => setShowPendingOnly(true)}
                  className={`flex-1 px-2 py-1 text-xs font-medium rounded-md transition-all text-center ${
                    showPendingOnly
                      ? "bg-white text-blue-600 shadow-md"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Pending ({pendingReorders.length})
                </button>
                <button
                  onClick={() => setShowPendingOnly(false)}
                  className={`flex-1 px-2 py-1 text-xs font-medium rounded-md transition-all text-center ${
                    !showPendingOnly
                      ? "bg-white text-blue-600 shadow-md"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  All
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 min-h-0 bg-gray-50/50">
              {displayedReorders.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 py-4">
                  <FaBox className="w-8 h-8 mb-2 opacity-20" />
                  <p className="text-xs">No requests found</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {displayedReorders.map((request) => (
                    <div
                      key={request.id}
                      onClick={() => openRequestModal(request)}
                      className="group bg-white p-2.5 rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer flex items-start gap-3"
                    >
                      <div
                        className={`w-1.5 h-1.5 mt-1.5 rounded-full flex-shrink-0 ${
                          request.priority === "CRITICAL"
                            ? "bg-red-500 shadow-red-200 shadow-md"
                            : request.priority === "HIGH"
                            ? "bg-orange-400"
                            : "bg-yellow-400"
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <h4 className="font-medium text-xs text-gray-900 truncate max-w-[70%]">
                            {request.equipmentName}
                          </h4>
                          <span className="text-[10px] text-gray-400">
                            {new Date(request.createdAt).toLocaleDateString(
                              undefined,
                              { month: "short", day: "numeric" }
                            )}
                          </span>
                        </div>
                        <div className="text-[10px] text-gray-500 truncate mb-1">
                          {request.labName}
                        </div>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            request.status === "PENDING"
                              ? "bg-blue-50 text-blue-600"
                              : request.status === "APPROVED"
                              ? "bg-green-50 text-green-600"
                              : "bg-gray-50 text-gray-500"
                          }`}
                        >
                          {request.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* --- MODALS WRAPPED WITH PORTAL --- */}

      {/* 1. Reorder Request Details Modal */}
      {selectedRequest && (
        <ModalWrapper onClose={() => setSelectedRequest(null)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                  <FaBox className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    Request Details
                  </h3>
                  <p className="text-xs text-gray-500 font-mono">
                    ID: {selectedRequest.id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedRequest(null)}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              >
                <FaTimes className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="flex flex-wrap gap-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex-1">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Status
                  </span>
                  <div className="mt-1 flex items-center gap-2">
                    <span
                      className={`px-3 py-1 text-sm font-bold rounded-full ${
                        selectedRequest.status === "PENDING"
                          ? "bg-blue-100 text-blue-700"
                          : selectedRequest.status === "APPROVED"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {selectedRequest.status}
                    </span>
                  </div>
                </div>
                <div className="flex-1">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Priority
                  </span>
                  <div className="mt-1">
                    <span
                      className={`px-3 py-1 text-sm font-bold rounded-full inline-flex items-center gap-1 ${
                        selectedRequest.priority === "CRITICAL"
                          ? "bg-red-100 text-red-700"
                          : selectedRequest.priority === "HIGH"
                          ? "bg-orange-100 text-orange-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      <FaExclamationTriangle className="w-3.5 h-3.5" />
                      {selectedRequest.priority}
                    </span>
                  </div>
                </div>
                <div className="flex-1">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Requested Date
                  </span>
                  <div className="mt-1 flex items-center gap-2 text-sm text-gray-900 font-medium">
                    <FaCalendarAlt className="w-4 h-4 text-gray-400" />
                    {new Date(selectedRequest.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1 flex items-center gap-2">
                      <FaBox className="w-4 h-4" /> Equipment
                    </h4>
                    <p className="text-base font-semibold text-gray-900">
                      {selectedRequest.equipmentName}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Type: {selectedRequest.type || "Consumable"}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1 flex items-center gap-2">
                      <FaArrowUp className="w-4 h-4" /> Quantity Info
                    </h4>
                    <div className="flex items-center gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Current:</span>{" "}
                        <span className="font-mono font-medium text-gray-900">
                          {selectedRequest.currentStock || 0}
                        </span>
                      </div>
                      <div className="h-4 w-px bg-gray-300"></div>
                      <div>
                        <span className="text-gray-500">Requested:</span>{" "}
                        <span className="font-mono font-bold text-blue-600">
                          {selectedRequest.quantity || 1}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1 flex items-center gap-2">
                      <FaMapMarkerAlt className="w-4 h-4" /> Location
                    </h4>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedRequest.labName}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {selectedRequest.instituteName || "Main Institute"}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1 flex items-center gap-2">
                      <FaUser className="w-4 h-4" /> Requested By
                    </h4>
                    <p className="text-sm text-gray-900">
                      {selectedRequest.requestedBy || "Lab Manager"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {selectedRequest.requesterRole || "Staff"}
                    </p>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-2">
                  <FaFileAlt className="w-4 h-4" /> Reason / Description
                </h4>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 text-sm text-gray-700 leading-relaxed">
                  {selectedRequest.description ||
                    "No additional description provided."}
                </div>
              </div>
              {selectedRequest.status === "PENDING" && (
                <div className="pt-6 border-t border-gray-200">
                  <h4 className="text-sm font-bold text-gray-900 mb-3">
                    Review Actions
                  </h4>
                  <div className="space-y-4">
                    <textarea
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder="Enter approval notes or rejection reason (required for rejection)..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm min-h-[100px] resize-y transition-all"
                    />
                    <div className="flex gap-4">
                      <button
                        onClick={() => handleReviewAction("APPROVED")}
                        disabled={isSubmittingReview}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium shadow-md hover:shadow"
                      >
                        {isSubmittingReview ? (
                          <LoadingSpinner size="sm" color="white" />
                        ) : (
                          <>
                            <FaCheckCircle className="w-4 h-4" /> Approve Request
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleReviewAction("REJECTED")}
                        disabled={isSubmittingReview || !reviewComment.trim()}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
                        title={
                          !reviewComment.trim()
                            ? "Please add a comment to reject"
                            : ""
                        }
                      >
                        {isSubmittingReview ? (
                          <LoadingSpinner size="sm" color="red" />
                        ) : (
                          <>
                            <FaTimesCircle className="w-4 h-4" /> Reject Request
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </ModalWrapper>
      )}

      {/* 2. Lab Manager Form Modal */}
      {isLabModalOpen && (
        <ModalWrapper onClose={handleLabModalClose}>
          <div style={{ width: "100%" }}>
            <LabManagerForm
              isOpen={isLabModalOpen}
              onClose={handleLabModalClose}
              labToEdit={editingLab}
            />
          </div>
        </ModalWrapper>
      )}

      {/* 3. Institute Manager Form Modal */}
      {isInstituteModalOpen && (
        <ModalWrapper onClose={handleInstituteModalClose}>
          <div style={{ width: "100%" }}>
            <InstituteManagerForm
              isOpen={isInstituteModalOpen}
              onClose={handleInstituteModalClose}
            />
          </div>
        </ModalWrapper>
      )}
    </div>
  );
}