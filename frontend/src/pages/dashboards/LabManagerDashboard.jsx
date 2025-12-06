// frontend/src/pages/dashboards/LabManagerDashboard.jsx - WITH REAL-TIME SOCKET INTEGRATION
import { useEffect, useState, useRef } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import io from "socket.io-client";
import { useDashboardStore } from "../../stores/dashboardStore";
import { useEquipmentStore } from "../../stores/equipmentStore";
import { useAlertStore } from "../../stores/alertStore";
import { useAuthStore } from "../../stores/authStore";
import { useLabStore } from "../../stores/labStore";
import EquipmentTable from "../../components/dashboard/EquipmentTable";
import AlertsList from "../../components/dashboard/AlertsList";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EquipmentFormModal from "../../components/equipment/EquipmentFormModal";
import MarkMaintenanceModal from "../../components/maintenance/MarkMaintenanceModal";
import { useBreakdownStore } from "../../stores/breakdownStore";
import BreakdownEquipmentTable from "../../components/breakdown/BreakdownEquipmentTable";
import AddBreakdownModal from "../../components/breakdown/AddBreakdownModal";
import BreakdownAlertModal from "../../components/breakdown/BreakdownAlertModal";
import {
  FaChartLine, FaExclamationTriangle, FaWrench, FaArrowUp, FaBuilding,
  FaDownload, FaSearch, FaCheckCircle, FaChevronDown, FaClock,
  FaUserCheck, FaCheck, FaTimes, FaExternalLinkAlt, FaPlus,
  FaWifi
} from "react-icons/fa";
import { ImLab } from "react-icons/im";
import { MdOutlineWifiOff } from "react-icons/md";

// Modal Wrapper CSS
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

const ModalWrapper = ({ children, onClose }) => {
  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm transition-all animate-in fade-in duration-200"
      onClick={onClose}
    >
      <style>{modalStripperStyle}</style>
      <div
        className="modal-stripper relative w-auto max-w-4xl max-h-[90vh] overflow-y-auto p-4 flex flex-col items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
};

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
            className={`w-2 h-2 mt-1.5 rounded-full shrink-0 ${
              alert.priority === "CRITICAL"
                ? "bg-red-500 shadow-md shadow-red-200"
                : alert.priority === "HIGH"
                ? "bg-orange-400"
                : "bg-green-500"
            }`}
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
                ).toLocaleDateString("en-US", {
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
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default function LabManagerDashboard() {
  const navigate = useNavigate();
  const { triggerEquipmentModal, triggerBreakdownModal } = useOutletContext() || {};
  
  const { user, checkAuth } = useAuthStore();
  const { overview, fetchOverview, isLoading: dashboardLoading } = useDashboardStore();
  const {
    equipment,
    fetchEquipment,
    createEquipment,
    updateEquipment,
    deleteEquipment,
    isLoading: equipmentLoading,
  } = useEquipmentStore();
  const { fetchAlerts, resolveAlert } = useAlertStore();
  const { labs, fetchLabs, isLoading: labLoading } = useLabStore();
  const {
    breakdownEquipment,
    fetchBreakdownEquipment,
    respondToBreakdownAlert,
    addBreakdownEquipment,
    submitReorderRequest,
    resolveBreakdown,
  } = useBreakdownStore();

  // Socket state
  const [socket, setSocket] = useState(null);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [liveEquipmentData, setLiveEquipmentData] = useState({});

  const [isAddBreakdownModalOpen, setIsAddBreakdownModalOpen] = useState(false);
  const [breakdownAlertToRespond, setBreakdownAlertToRespond] = useState(null);
  const [selectedLabId, setSelectedLabId] = useState("all");
  const [isLabDropdownOpen, setIsLabDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [alertTab, setAlertTab] = useState("active");
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [isActiveAlertsLoading, setIsActiveAlertsLoading] = useState(true);
  const [historyAlerts, setHistoryAlerts] = useState([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  // Mark Maintenance Modal State
  const [isMarkMaintenanceModalOpen, setIsMarkMaintenanceModalOpen] = useState(false);
  const [equipmentToMaintain, setEquipmentToMaintain] = useState(null);

  const prevEqTrigger = useRef(triggerEquipmentModal || 0);
  const prevBdTrigger = useRef(triggerBreakdownModal || 0);

  // --- SOCKET.IO CONNECTION ---
  useEffect(() => {
    console.log('🔌 [LabManager] Setting up Socket.IO connection...');

    let token = null;
    try {
      const authStorage = localStorage.getItem('auth-storage');
      if (authStorage) {
        const parsed = JSON.parse(authStorage);
        token = parsed?.state?.accessToken;
      }
    } catch (e) {
      console.error('❌ [LabManager] Failed to parse auth token:', e);
    }

    if (!token) {
      console.error('❌ [LabManager] No access token found');
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
      console.log('✅ [LabManager] Socket.IO connected!', socketInstance.id);
      setIsSocketConnected(true);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('❌ [LabManager] Socket.IO disconnected:', reason);
      setIsSocketConnected(false);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('❌ [LabManager] Socket.IO connection error:', error.message);
      setIsSocketConnected(false);
    });

    // Listen for equipment status updates
    socketInstance.on('equipment:status', (data) => {
      console.log('📡 [LabManager] Equipment status update:', data);
      handleEquipmentUpdate(data);
    });

    socketInstance.on('equipment:status:update', (data) => {
      console.log('📡 [LabManager] Equipment status update (alt):', data);
      handleEquipmentUpdate(data.status || data);
    });

    // 🚨 NEW: Listen for new alerts
    socketInstance.on('alert:new', (alert) => {
      console.log('🚨 [LabManager] New alert received:', alert);
      handleNewAlert(alert);
    });

    setSocket(socketInstance);

    return () => {
      console.log('🔌 [LabManager] Cleaning up Socket.IO connection');
      socketInstance.removeAllListeners();
      socketInstance.disconnect();
    };
  }, []);

  // --- HANDLE LIVE EQUIPMENT UPDATES ---
  const handleEquipmentUpdate = (data) => {
    const equipmentId = data.equipmentId || data.id;
    
    if (!equipmentId) {
      console.warn('⚠️ [LabManager] No equipmentId in update data', data);
      return;
    }

    console.log('🔄 [LabManager] Updating equipment:', equipmentId, 'Status:', data.status);

    // Update live data state
    setLiveEquipmentData((prev) => ({
      ...prev,
      [equipmentId]: {
        ...data,
        updatedAt: new Date(),
      },
    }));

    // Refresh overview if equipment becomes faulty
    if (data.status === 'FAULTY') {
      console.log('⚠️ [LabManager] Equipment became FAULTY, refreshing overview');
      fetchOverview();
    }
  };

  // 🚨 NEW: Handle New Alert
  const handleNewAlert = (alert) => {
    console.log('🚨 [LabManager] Processing new alert:', alert);
    
    // Add to active alerts if on active tab
    if (alertTab === 'active') {
      setActiveAlerts((prev) => {
        // Check if alert already exists
        const exists = prev.some(a => a.id === alert.id);
        if (exists) return prev;
        
        // Add new alert to the top
        return [alert, ...prev];
      });
    }

    // Refresh overview to update stats
    fetchOverview();

    // Show notification (optional)
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('⚠️ Equipment Alert', {
        body: `${alert.title}: ${alert.equipment?.name}`,
        icon: '/favicon.ico',
      });
    }
  };

  // Merge live data with equipment list
  const equipmentWithLiveData = equipment.map((eq) => {
    const liveData = liveEquipmentData[eq.id];
    if (!liveData) return eq;

    return {
      ...eq,
      status: {
        ...eq.status,
        status: liveData.status || eq.status?.status,
        temperature: liveData.temperature ?? eq.status?.temperature,
        vibration: liveData.vibration ?? eq.status?.vibration,
        energyConsumption: liveData.energyConsumption ?? eq.status?.energyConsumption,
        healthScore: liveData.healthScore ?? eq.status?.healthScore,
      },
    };
  });

  // Listener for Sidebar "Add Equipment"
  useEffect(() => {
    if ((triggerEquipmentModal || 0) > prevEqTrigger.current) {
      setEditingEquipment(null);
      setIsModalOpen(true);
      prevEqTrigger.current = triggerEquipmentModal;
    }
  }, [triggerEquipmentModal]);

  // Listener for Sidebar "Report Breakdown"
  useEffect(() => {
    if ((triggerBreakdownModal || 0) > prevBdTrigger.current) {
      setIsAddBreakdownModalOpen(true);
      prevBdTrigger.current = triggerBreakdownModal;
    }
  }, [triggerBreakdownModal]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsLabDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const ensureUserDataLoaded = async () => {
      if (!user?.institute) {
        try {
          await checkAuth();
        } catch (error) {
          console.error("Failed to load user profile:", error);
        }
      }
      setIsInitialLoad(false);
    };
    ensureUserDataLoaded();
  }, []);

  useEffect(() => {
    if (!isInitialLoad && user) {
      loadDashboardData();
      fetchBreakdownEquipment();
    }
  }, [isInitialLoad, user?.id]);

  const parseAlertResponse = (response) => {
    if (Array.isArray(response)) return response;
    if (response && response.data && Array.isArray(response.data))
      return response.data;
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
      const response = await fetchAlerts({ isResolved: true, limit: 50 });
      setHistoryAlerts(parseAlertResponse(response));
    } catch (error) {
      console.error("Failed to fetch history alerts:", error);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const loadDashboardData = async () => {
    try {
      await Promise.all([
        fetchOverview(),
        fetchEquipment(),
        fetchLabs({}, true),
        fetchActiveAlertsIsolated(),
      ]);
    } catch (error) {
      console.error("❌ Failed to load dashboard data:", error);
    }
  };

  const handleTabChange = (tab) => {
    setAlertTab(tab);
    if (tab === "history" && historyAlerts.length === 0)
      fetchHistoryAlertsIsolated();
    if (tab === "active") fetchActiveAlertsIsolated();
  };

  const handleSelectLab = (labId) => {
    setIsLabDropdownOpen(false);
    if (labId === selectedLabId) return;
    if (labId === "all") {
      setSelectedLabId("all");
      fetchEquipment();
    } else {
      setSelectedLabId(labId);
      fetchEquipment({ labId: labId });
    }
  };

  const handleCreateEquipment = async (data) => {
    try {
      await createEquipment(data);
      setIsModalOpen(false);
      await loadDashboardData();
    } catch (error) {
      console.error("Failed to create equipment:", error);
      throw error;
    }
  };

  const handleUpdateEquipment = async (id, data) => {
    try {
      await updateEquipment(id, data);
      setIsModalOpen(false);
      setEditingEquipment(null);
      await loadDashboardData();
    } catch (error) {
      console.error("Failed to update equipment:", error);
      throw error;
    }
  };

  const handleDeleteEquipment = async (id) => {
    if (!window.confirm("Are you sure you want to delete this equipment?"))
      return;
    try {
      await deleteEquipment(id);
      await loadDashboardData();
    } catch (error) {
      console.error("Failed to delete equipment:", error);
    }
  };

  const handleEditClick = (equipment) => {
    setEditingEquipment(equipment);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingEquipment(null);
  };

  const handleResolveAlert = async (alertId) => {
    try {
      const alert = activeAlerts.find((a) => a.id === alertId);
      if (alert?.type === "EQUIPMENT_BREAKDOWN_CHECK") {
        setBreakdownAlertToRespond(alert);
        return;
      }
      await resolveAlert(alertId);
      fetchOverview();
      await fetchActiveAlertsIsolated();
      if (historyAlerts.length > 0 || alertTab === "history")
        fetchHistoryAlertsIsolated();
    } catch (error) {
      console.error("Failed to resolve alert:", error);
    }
  };

  const handleMarkMaintenanceClick = (equipment) => {
    setEquipmentToMaintain(equipment);
    setIsMarkMaintenanceModalOpen(true);
  };

  const handleMarkMaintenanceSuccess = async () => {
    setIsMarkMaintenanceModalOpen(false);
    setEquipmentToMaintain(null);
    await loadDashboardData();
  };

  const getFilteredEquipment = () => {
    let filtered = equipmentWithLiveData;
    if (selectedStatus !== "all")
      filtered = filtered.filter((eq) => eq.status?.status === selectedStatus);
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (eq) =>
          eq.name.toLowerCase().includes(query) ||
          eq.equipmentId.toLowerCase().includes(query) ||
          eq.manufacturer.toLowerCase().includes(query) ||
          eq.model.toLowerCase().includes(query)
      );
    }
    return filtered;
  };

  const handleExportData = () => {
    const filteredData = getFilteredEquipment();
    if (!filteredData.length) return;
    const headers = [
      "Equipment ID", "Name", "Department", "Lab", "Status",
      "Manufacturer", "Model", "Purchase Date",
    ];
    const rows = filteredData.map((eq) => [
      eq.equipmentId, eq.name, eq.department, eq.lab?.name || "",
      eq.status?.status || "", eq.manufacturer, eq.model,
      new Date(eq.purchaseDate).toLocaleDateString(),
    ]);
    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `equipment-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (isInitialLoad || dashboardLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const stats = [
    {
      icon: FaChartLine,
      title: "Total Equipment",
      value: overview?.overview?.totalEquipment || 0,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      icon: FaArrowUp,
      title: "Active Equipment",
      value: overview?.overview?.activeEquipment || 0,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      icon: FaExclamationTriangle,
      title: "Unresolved Alerts",
      value: overview?.overview?.unresolvedAlerts || 0,
      color: "text-red-600",
      bg: "bg-red-50",
    },
    {
      icon: FaWrench,
      title: "Maintenance Due",
      value: overview?.overview?.maintenanceDue || 0,
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
  ];

  const filteredEquipment = getFilteredEquipment();
  const currentLabName =
    selectedLabId === "all"
      ? "All Labs"
      : labs.find((l) => l.labId === selectedLabId)?.name || "Unknown Lab";

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col bg-gray-200 overflow-hidden p-1 gap-4 w-full">
      {/* ROW 1: 40% Height */}
      <div className="flex-none h-[40%] grid grid-cols-12 gap-4 min-h-0">
        <div className="col-span-3 h-full grid grid-cols-2 gap-3">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={index}
                className="flex flex-col justify-between p-4 bg-white rounded-xl border border-gray-100 shadow-md hover:shadow-md transition-shadow h-full min-h-0"
              >
                <div className="w-full flex items-center justify-between">
                  <div className={`p-3 rounded-lg ${stat.bg}`}>
                    <Icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                  <div className="text-2xl font-bold text-gray-900 leading-none">
                    {stat.value}
                  </div>
                </div>
                <div className="mt-1 w-full text-center text-wrap text-xs font-semibold text-gray-500 uppercase tracking-wide truncate">
                  {stat.title}
                </div>
              </div>
            );
          })}
        </div>

        <div className="col-span-9 h-full bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden flex flex-col min-h-0">
          <div className="flex-shrink-0 px-3 py-2 border-b border-gray-100 bg-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-red-50 text-red-600 rounded-lg">
                <FaWrench className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-gray-800">Breakdowns</h2>
              {/* Connection Badge */}
              {isSocketConnected ? (
                <span className="flex items-center gap-1.5 px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded-full border border-green-200">
                  <FaWifi className="w-2.5 h-2.5" />
                  Live
                </span>
              ) : (
                <span className="flex items-center gap-1.5 px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-bold rounded-full border border-gray-200">
                  <MdOutlineWifiOff className="w-2.5 h-2.5" />
                  Offline
                </span>
              )}
            </div>
            <button
              onClick={() => setIsAddBreakdownModalOpen(true)}
              className="px-2 py-1 text-[10px] font-bold bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors uppercase tracking-wide shadow-md"
            >
              Report Issue
            </button>
          </div>

          <div className="flex-1 overflow-y-auto w-full relative [&::-webkit-scrollbar:horizontal]:hidden" style={{ overflowX: "hidden" }}>
            <div className="p-2 min-w-0 w-full">
              {breakdownEquipment.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 py-8">
                  <FaCheckCircle className="w-8 h-8 mb-2 opacity-20" />
                  <p className="text-xs">No breakdowns reported.</p>
                </div>
              ) : (
                <BreakdownEquipmentTable
                  breakdowns={breakdownEquipment}
                  onReorder={async (id, data) => {
                    await submitReorderRequest(id, data);
                    await fetchBreakdownEquipment();
                  }}
                  onResolve={async (id) => {
                    await resolveBreakdown(id);
                    await fetchBreakdownEquipment();
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ROW 2: Remaining 60% Height */}
      <div className="flex-1 min-h-0 grid grid-cols-12 gap-4">
        <div className="col-span-9 h-full bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden flex flex-col min-h-0">
          <div className="flex-shrink-0 px-4 py-3 border-b border-gray-100 bg-white flex items-center justify-between gap-4">
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsLabDropdownOpen(!isLabDropdownOpen)}
                className="flex items-center gap-3 p-1.5 hover:bg-gray-50 rounded-lg transition-colors group pr-3 border border-transparent hover:border-gray-200"
              >
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-100 transition-colors">
                  <ImLab className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <h2 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                    {currentLabName}
                    <FaChevronDown className="w-3.5 h-3.5 text-gray-400" />
                  </h2>
                  <p className="text-[10px] text-gray-500 font-medium">
                    {filteredEquipment.length} Equipment Listed
                  </p>
                </div>
              </button>

              {isLabDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-60 bg-white rounded-xl shadow-xl border border-gray-100 z-50 py-1 max-h-64 overflow-y-auto">
                  <button
                    onClick={() => handleSelectLab("all")}
                    className="w-full text-left px-4 py-2.5 text-xs font-medium hover:bg-gray-50 flex items-center justify-between"
                  >
                    <span>All Labs</span>
                    {selectedLabId === "all" && (
                      <FaCheck className="w-3.5 h-3.5 text-blue-600" />
                    )}
                  </button>
                  <div className="h-px bg-gray-100 my-1" />
                  {labs.map((lab) => (
                    <button
                      key={lab.id}
                      onClick={() => handleSelectLab(lab.labId)}
                      className="w-full text-left px-4 py-2.5 text-xs hover:bg-gray-50 flex items-center justify-between group transition-colors"
                    >
                      <span className={selectedLabId === lab.labId ? "font-semibold text-blue-600" : "text-gray-700"}>
                        {lab.name}
                      </span>
                      {selectedLabId === lab.labId && (
                        <FaCheck className="w-3.5 h-3.5 text-blue-600" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 flex-1 justify-end">
              
              {/* Log Maintenance Button - Added here as well for visibility */}
              <button
                 onClick={() => {
                   setEquipmentToMaintain(null);
                   setIsMarkMaintenanceModalOpen(true);
                 }}
                 className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 text-orange-600 border border-orange-200 rounded-lg text-xs font-semibold hover:bg-orange-100 transition-colors"
              >
                <FaWrench className="w-3 h-3" />
                Log Maintenance
              </button>

              <div className="relative max-w-[200px] w-full">
                <FaSearch className="absolute left-3 top-2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                />
              </div>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-50 max-w-[120px]"
              >
                <option value="all">All Status</option>
                <option value="OPERATIONAL">Operational</option>
                <option value="IN_USE">In Use</option>
                <option value="MAINTENANCE">Maintenance</option>
                <option value="FAULTY">Faulty</option>
                <option value="OFFLINE">Offline</option>
              </select>
              <button
                onClick={handleExportData}
                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg border border-gray-200 hover:border-blue-100 transition-colors shadow-md"
                title="Export CSV"
              >
                <FaDownload className="w-4 h-4" />
              </button>
            </div>

            {selectedLabId !== "all" && (
              <button
                onClick={() => navigate(`/dashboard/lab-analytics/${selectedLabId}`)}
                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg border border-gray-200 hover:border-blue-100 transition-colors shadow-md"
                title="Go to Lab Analytics"
              >
                <FaExternalLinkAlt className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-0">
            {equipmentLoading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : filteredEquipment.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-sm text-gray-500 font-medium">No equipment found</p>
                {selectedLabId === "all" && (
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="mt-2 text-xs text-blue-600 hover:underline"
                  >
                    Add equipment
                  </button>
                )}
              </div>
            ) : (
              <EquipmentTable
                equipment={filteredEquipment}
                onEdit={handleEditClick}
                onDelete={handleDeleteEquipment}
                onMarkMaintenance={handleMarkMaintenanceClick}
                showActions={true}
              />
            )}
          </div>
        </div>

        <div className="col-span-3 h-full bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden flex flex-col min-h-0">
          <div className="flex-shrink-0 px-4 py-3 border-b border-gray-100 bg-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="relative p-1.5 bg-red-100 text-red-600 rounded-lg">
                <FaExclamationTriangle className="w-4 h-4" />
                {activeAlerts.length > 0 && (
                  <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border border-white" />
                )}
              </div>
              <h2 className="text-sm font-bold text-gray-800">Alerts</h2>
            </div>
            <div className="flex bg-gray-100 p-0.5 rounded-lg">
              <button
                onClick={() => handleTabChange("active")}
                className={`px-2 py-0.5 text-[10px] font-medium rounded transition-all ${
                  alertTab === "active"
                    ? "bg-white text-blue-600 shadow-md"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Active
              </button>
              <button
                onClick={() => handleTabChange("history")}
                className={`px-2 py-0.5 text-[10px] font-medium rounded transition-all ${
                  alertTab === "history"
                    ? "bg-white text-blue-600 shadow-md"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                History
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {alertTab === "active" ? (
              isActiveAlertsLoading ? (
                <div className="flex justify-center py-6">
                  <LoadingSpinner size="sm" />
                </div>
              ) : (
                <AlertsList
                  alerts={activeAlerts}
                  onResolve={handleResolveAlert}
                  compact={true}
                />
              )
            ) : (
              <CompactHistoryList
                alerts={historyAlerts}
                loading={isHistoryLoading}
              />
            )}
          </div>
        </div>
      </div>

      {/* MODALS */}
      {breakdownAlertToRespond && (
        <ModalWrapper onClose={() => setBreakdownAlertToRespond(null)}>
          <BreakdownAlertModal
            isOpen={!!breakdownAlertToRespond}
            onClose={() => setBreakdownAlertToRespond(null)}
            alert={breakdownAlertToRespond}
            onRespond={async (alertId, isBreakdown, reason) => {
              await respondToBreakdownAlert(alertId, isBreakdown, reason);
              await Promise.all([
                fetchActiveAlertsIsolated(),
                fetchBreakdownEquipment(),
                fetchOverview(),
              ]);
            }}
          />
        </ModalWrapper>
      )}

      {isAddBreakdownModalOpen && (
        <ModalWrapper onClose={() => setIsAddBreakdownModalOpen(false)}>
          <AddBreakdownModal
            isOpen={isAddBreakdownModalOpen}
            onClose={() => setIsAddBreakdownModalOpen(false)}
            onSubmit={async (equipmentId, reason) => {
              await addBreakdownEquipment(equipmentId, reason);
              await fetchBreakdownEquipment();
            }}
          />
        </ModalWrapper>
      )}

      {/* Equipment Modal */}
      {isModalOpen && (
        <ModalWrapper onClose={handleModalClose}>
          <div
            style={{
              position: "relative",
              background: "transparent",
              zIndex: "auto",
              width: "100%",
            }}
          >
            <EquipmentFormModal
              isOpen={isModalOpen}
              onClose={handleModalClose}
              onSubmit={
                editingEquipment ? handleUpdateEquipment : handleCreateEquipment
              }
              equipment={editingEquipment}
            />
          </div>
        </ModalWrapper>
      )}

      {/* Mark Maintenance Modal */}
      {isMarkMaintenanceModalOpen && (
        <ModalWrapper onClose={() => setIsMarkMaintenanceModalOpen(false)}>
          <div
            style={{
              position: "relative",
              background: "transparent",
              zIndex: "auto",
              width: "100%",
            }}
          >
            <MarkMaintenanceModal
              isOpen={isMarkMaintenanceModalOpen}
              onClose={() => setIsMarkMaintenanceModalOpen(false)}
              equipment={equipmentToMaintain}
              allEquipment={equipment} // Pass full list for dropdown
              onSuccess={handleMarkMaintenanceSuccess}
            />
          </div>
        </ModalWrapper>
      )}
    </div>
  );
}