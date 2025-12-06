// frontend/src/pages/dashboards/TrainerDashboard.jsx - WITH REAL-TIME SOCKET INTEGRATION
import { useEffect, useState, useMemo } from "react";
import io from "socket.io-client";
import { useDashboardStore } from "../../stores/dashboardStore";
import { useEquipmentStore } from "../../stores/equipmentStore";
import { useAlertStore } from "../../stores/alertStore";
import { useAuthStore } from "../../stores/authStore";
import api from "../../lib/axios";
import EquipmentTable from "../../components/dashboard/EquipmentTable";
import AlertsList from "../../components/dashboard/AlertsList";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import {
  FaChartLine,
  FaExclamationTriangle,
  FaWrench,
  FaArrowUp,
  FaSearch,
  FaBuilding,
  FaChartBar,
  FaClock,
  FaUserCheck,
  FaCheckCircle,
  FaTimesCircle,
  FaPlayCircle,
  FaExclamationCircle,
  FaWifi,
} from "react-icons/fa";
import { FaCirclePause } from "react-icons/fa6";
import { ImLab } from "react-icons/im";
import { MdOutlineWifiOff } from "react-icons/md";

// --- SVG Health History Chart Component ---
const HealthHistoryChart = ({ currentScore = 0 }) => {
  const chartData = useMemo(() => {
    const today = new Date();
    const months = [];
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      months.push(d.toLocaleString('default', { month: 'short' }));
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
  const width = 800;
  const padding = 20;
  const maxScore = 100;

  const getX = (index) => padding + (index / (chartData.length - 1)) * (width - 2 * padding);
  const getY = (score) => height - padding - (score / maxScore) * (height - 2 * padding);

  const points = chartData.map((d, i) => `${getX(i)},${getY(d.score)}`).join(" ");
  const areaPoints = `${getX(0)},${height - padding} ${points} ${getX(chartData.length - 1)},${height - padding}`;

  return (
    <div className="w-full h-full flex flex-col items-center justify-center overflow-hidden">
      <div className="relative w-full h-full">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </linearGradient>
          </defs>
          <line x1={padding} y1={getY(0)} x2={width - padding} y2={getY(0)} stroke="#e5e7eb" strokeWidth="1" strokeDasharray="4" vectorEffect="non-scaling-stroke" />
          <line x1={padding} y1={getY(50)} x2={width - padding} y2={getY(50)} stroke="#e5e7eb" strokeWidth="1" strokeDasharray="4" vectorEffect="non-scaling-stroke" />
          <line x1={padding} y1={getY(100)} x2={width - padding} y2={getY(100)} stroke="#e5e7eb" strokeWidth="1" strokeDasharray="4" vectorEffect="non-scaling-stroke" />
          <polygon points={areaPoints} fill="url(#scoreGradient)" />
          <polyline points={points} fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          {chartData.map((d, i) => (
            <g key={i}>
              <circle cx={getX(i)} cy={getY(d.score)} r="4" fill="white" stroke="#10b981" strokeWidth="2" vectorEffect="non-scaling-stroke" />
              <text x={getX(i)} y={getY(d.score) - 10} textAnchor="middle" fontSize="7" fill="#10b981" fontWeight="bold">{d.score}%</text>
              <text x={getX(i)} y={height - 2} textAnchor="middle" fontSize="7" fill="#9ca3af" fontWeight="600" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>{d.month}</text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
};

// --- Compact History List Component ---
const CompactHistoryList = ({ alerts, loading }) => {
  if (loading) return <div className="flex justify-center py-4"><LoadingSpinner size="sm" /></div>;
  if (!alerts || alerts.length === 0) return <div className="text-center text-xs text-gray-500 py-4">No history found.</div>;

  return (
    <div className="space-y-3 p-2">
      {alerts.map((alert) => (
        <div key={alert.id} className="group bg-white p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all flex items-start gap-3">
          <div className={`w-2 h-2 mt-1.5 rounded-full shrink-0 ${alert.priority === "CRITICAL" ? "bg-red-500 shadow-md shadow-red-200" : alert.priority === "HIGH" ? "bg-orange-400" : "bg-green-500"}`} />
          <div className="flex-1 min-w-0 flex flex-col gap-1.5">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-semibold text-xs text-gray-900">{alert.equipment?.name || "Unknown Equipment"}</h4>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-gray-500 flex items-center gap-1"><ImLab className="w-3 h-3" /> {alert.lab?.name || "Unknown Lab"}</span>
                  <span className="text-[10px] font-medium px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">{alert.type?.replace(/_/g, " ") || "ALERT"}</span>
                </div>
              </div>
              <span className="text-[10px] text-gray-400 whitespace-nowrap flex items-center gap-1">
                <FaClock className="w-3 h-3" />
                {new Date(alert.resolvedAt || alert.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            </div>
            <div className="text-xs text-gray-700 bg-gray-50 p-2 rounded border border-gray-100 leading-relaxed">{alert.message}</div>
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

export default function TrainerDashboard() {
  const { user } = useAuthStore();
  const { overview, fetchOverview, isLoading: dashboardLoading } = useDashboardStore();
  const { equipment, fetchEquipment, isLoading: equipmentLoading } = useEquipmentStore();
  const { alerts, fetchAlerts, resolveAlert, isLoading: alertsLoading } = useAlertStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [alertTab, setAlertTab] = useState("active");
  const [historyAlerts, setHistoryAlerts] = useState([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  // Socket State
  const [socket, setSocket] = useState(null);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [liveEquipmentData, setLiveEquipmentData] = useState({});

  // --- SOCKET.IO CONNECTION ---
  useEffect(() => {
    console.log('🔌 [Trainer] Setting up Socket.IO connection...');

    let token = null;
    try {
      const authStorage = localStorage.getItem('auth-storage');
      if (authStorage) {
        const parsed = JSON.parse(authStorage);
        token = parsed?.state?.accessToken;
      }
    } catch (e) {
      console.error('❌ [Trainer] Failed to parse auth token:', e);
    }

    if (!token) {
      console.error('❌ [Trainer] No access token found');
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
      console.log('✅ [Trainer] Socket.IO connected!', socketInstance.id);
      setIsSocketConnected(true);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('❌ [Trainer] Socket.IO disconnected:', reason);
      setIsSocketConnected(false);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('❌ [Trainer] Socket.IO connection error:', error.message);
      setIsSocketConnected(false);
    });

    // Listen for equipment status updates
    socketInstance.on('equipment:status', (data) => {
      console.log('📡 [Trainer] Equipment status update:', data);
      handleEquipmentUpdate(data);
    });

    socketInstance.on('equipment:status:update', (data) => {
      console.log('📡 [Trainer] Equipment status update (alt):', data);
      handleEquipmentUpdate(data.status || data);
    });

    // 🚨 Listen for new alerts
    socketInstance.on('alert:new', (alert) => {
      console.log('🚨 [Trainer] New alert received:', alert);
      handleNewAlert(alert);
    });

    setSocket(socketInstance);

    return () => {
      console.log('🔌 [Trainer] Cleaning up Socket.IO connection');
      socketInstance.removeAllListeners();
      socketInstance.disconnect();
    };
  }, []);

  // --- HANDLE LIVE EQUIPMENT UPDATES ---
  const handleEquipmentUpdate = (data) => {
    const equipmentId = data.equipmentId || data.id;
    
    if (!equipmentId) {
      console.warn('⚠️ [Trainer] No equipmentId in update data', data);
      return;
    }

    console.log('🔄 [Trainer] Updating equipment:', equipmentId, 'Status:', data.status);

    setLiveEquipmentData((prev) => ({
      ...prev,
      [equipmentId]: {
        ...data,
        updatedAt: new Date(),
      },
    }));

    // Refresh overview if equipment becomes faulty
    if (data.status === 'FAULTY') {
      console.log('⚠️ [Trainer] Equipment became FAULTY, refreshing overview');
      fetchOverview();
    }
  };

  // 🚨 Handle New Alert
  const handleNewAlert = (alert) => {
    console.log('🚨 [Trainer] Processing new alert:', alert);
    
    if (alertTab === 'active') {
      fetchAlerts({ isResolved: false });
    }

    fetchOverview();

    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('⚠️ Equipment Alert', {
        body: `${alert.title}: ${alert.equipment?.name}`,
        icon: '/favicon.ico',
      });
    }
  };

  // Merge live data with equipment list
  const equipmentWithLiveData = useMemo(() => {
    if (!equipment || equipment.length === 0) return [];

    return equipment.map((eq) => {
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
  }, [equipment, liveEquipmentData]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    const fetchInitialAlerts = async () => {
      try {
        console.log('🔔 Fetching initial alerts separately...');
        await fetchAlerts({ isResolved: false });
      } catch (error) {
        console.error('❌ Failed to fetch initial alerts:', error);
      }
    };
    fetchInitialAlerts();
  }, [fetchAlerts]);

  const loadDashboardData = async () => {
    try {
      console.log('🚀 Loading dashboard data...');
      await Promise.all([fetchOverview(), fetchEquipment()]);
      console.log('✅ Dashboard data loaded');
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
    }
  };

  const handleTabChange = async (tab) => {
    setAlertTab(tab);
    
    if (tab === "history") {
      if (historyAlerts.length === 0) {
        setIsHistoryLoading(true);
        try {
          const response = await api.get("/alerts", { params: { isResolved: true, limit: 20 } });
          setHistoryAlerts(response.data.data || []);
        } catch (err) {
          console.error("Error fetching history alerts:", err);
        } finally {
          setIsHistoryLoading(false);
        }
      }
    } else if (tab === "active") {
      try {
        await fetchAlerts({ isResolved: false });
      } catch (err) {
        console.error("Error fetching active alerts:", err);
      }
    }
  };

  const handleResolveAlert = async (alertId) => {
    try {
      await resolveAlert(alertId);
    } catch (error) {
      console.error("Failed to resolve alert:", error);
    }
  };

  const getFilteredEquipment = () => {
    let filtered = equipmentWithLiveData || [];
    if (selectedStatus !== "all") {
      filtered = filtered.filter((eq) => eq.status?.status === selectedStatus);
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (eq) =>
          eq.name.toLowerCase().includes(query) ||
          eq.equipmentId.toLowerCase().includes(query) ||
          eq.manufacturer.toLowerCase().includes(query)
      );
    }
    return filtered;
  };

  const filteredEquipment = getFilteredEquipment();

  const getStatusIcon = (status) => {
    switch (status) {
      case "OPERATIONAL": return <FaCheckCircle className="w-4 h-4 text-green-600" />;
      case "FAULTY": return <FaTimesCircle className="w-4 h-4 text-red-600" />;
      case "MAINTENANCE": return <FaWrench className="w-4 h-4 text-amber-600" />;
      case "IN_CLASS": return <FaClock className="w-4 h-4 text-blue-600" />;
      case "IDLE": return <FaCirclePause className="w-4 h-4 text-gray-600" />;
      case "WARNING": return <FaExclamationCircle className="w-4 h-4 text-orange-600" />;
      default: return <FaChartLine className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusBg = (status) => {
    switch (status) {
      case "OPERATIONAL": return "bg-green-100 border-green-100";
      case "FAULTY": return "bg-red-100 border-red-100";
      case "MAINTENANCE": return "bg-amber-100 border-amber-100";
      case "IN_CLASS": return "bg-blue-100 border-blue-100";
      case "IDLE": return "bg-gray-100 border-gray-100";
      case "WARNING": return "bg-orange-100 border-orange-100";
      default: return "bg-gray-100 border-gray-100";
    }
  };

  if (dashboardLoading && !overview) {
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

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col bg-gray-200 overflow-hidden p-1 gap-4 w-full">
      {/* ROW 1: 40% Height */}
      <div className="flex-none h-[40%] grid grid-cols-12 gap-4 min-h-0">
        <div className="col-span-12 lg:col-span-3 h-full grid grid-cols-2 gap-3">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="flex flex-col justify-between p-4 bg-white rounded-xl border border-gray-100 shadow-md hover:shadow-md transition-shadow h-full min-h-0">
                <div className="w-full flex items-center justify-between">
                  <div className={`p-3 rounded-lg ${stat.bg}`}>
                    <Icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                  <div className="text-2xl font-bold text-gray-900 leading-none">{stat.value}</div>
                </div>
                <div className="mt-1 w-full text-center text-wrap text-xs font-semibold text-gray-500 uppercase tracking-wide truncate">{stat.title}</div>
              </div>
            );
          })}
        </div>

        <div className="col-span-12 lg:col-span-9 h-full bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden flex flex-col min-h-0">
          <div className="flex-shrink-0 px-3 py-2 border-b border-gray-100 bg-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                <FaChartBar className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-gray-800">Lab Status & Health</h2>
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
            <div className="text-xs text-gray-500 font-medium">{user?.lab?.name || "Assigned Lab"}</div>
          </div>

          <div className="flex-1 w-full p-4 flex gap-6 overflow-hidden">
            <div className="flex-[4] flex flex-col h-full bg-white rounded-xl border border-gray-100 p-3 relative shadow-md">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-xs font-bold text-gray-700">Health Trend</h3>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-400">Avg Score:</span>
                  <span className={`text-sm font-bold ${overview?.overview?.avgHealthScore >= 80 ? "text-emerald-600" : "text-yellow-600"}`}>
                    {overview?.overview?.avgHealthScore || 0}%
                  </span>
                </div>
              </div>
              <div className="flex-1 min-h-0 w-full">
                <HealthHistoryChart currentScore={overview?.overview?.avgHealthScore} />
              </div>
            </div>

            <div className="flex-1 flex flex-col gap-2 overflow-y-auto pr-1 min-w-[200px]">
              <h3 className="text-xs font-bold text-gray-700 mb-1 sticky top-0 bg-white">Distribution</h3>
              {overview?.equipmentByStatus && overview.equipmentByStatus.map((item) => (
                <div key={item.status} className={`flex items-center justify-between p-2.5 rounded-lg border ${getStatusBg(item.status)}`}>
                  <div className="flex items-center gap-2.5">
                    <div className="p-1 bg-white rounded-full shadow-md">{getStatusIcon(item.status)}</div>
                    <div className="text-[11px] font-bold text-gray-700 uppercase tracking-wide">{item.status.replace(/_/g, " ")}</div>
                  </div>
                  <span className="text-lg font-bold text-gray-800">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ROW 2: 60% Height */}
      <div className="flex-1 min-h-0 grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-9 h-full bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden flex flex-col min-h-0">
          <div className="flex-shrink-0 px-4 py-3 border-b border-gray-100 bg-white flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                <ImLab className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-800">Lab Equipment</h2>
                <p className="text-[10px] text-gray-500 font-medium">{filteredEquipment.length} items listed</p>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-1 justify-end">
              <div className="relative max-w-[240px] w-full">
                <FaSearch className="absolute left-3 top-2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search equipment..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                />
              </div>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-50 max-w-[140px]"
              >
                <option value="all">All Status</option>
                <option value="OPERATIONAL">Operational</option>
                <option value="IN_USE">In Use</option>
                <option value="MAINTENANCE">Maintenance</option>
                <option value="FAULTY">Faulty</option>
              </select>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-0">
            {equipmentLoading ? (
              <div className="flex justify-center py-8"><LoadingSpinner /></div>
            ) : filteredEquipment.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-sm text-gray-500 font-medium">No equipment found matching criteria.</p>
              </div>
            ) : (
              <EquipmentTable equipment={filteredEquipment} showActions={false} />
            )}
          </div>
        </div>

        <div className="col-span-12 lg:col-span-3 h-full bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden flex flex-col min-h-0">
          <div className="flex-shrink-0 px-4 py-3 border-b border-gray-100 bg-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="relative p-1.5 bg-red-100 text-red-600 rounded-lg">
                <FaExclamationTriangle className="w-4 h-4" />
                {alerts && alerts.length > 0 && (
                  <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border border-white" />
                )}
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-800">Alerts</h2>
                <p className="text-[10px] text-gray-500">
                  {alertTab === "active" ? `${alerts?.length || 0} active` : `${historyAlerts?.length || 0} resolved`}
                </p>
              </div>
            </div>
            
            <div className="flex bg-gray-100 p-0.5 rounded-lg">
              <button
                onClick={() => handleTabChange("active")}
                className={`px-2 py-0.5 text-[10px] font-medium rounded transition-all ${alertTab === "active" ? "bg-white text-blue-600 shadow-md" : "text-gray-500 hover:text-gray-700"}`}
              >
                Active
              </button>
              <button
                onClick={() => handleTabChange("history")}
                className={`px-2 py-0.5 text-[10px] font-medium rounded transition-all ${alertTab === "history" ? "bg-white text-blue-600 shadow-md" : "text-gray-500 hover:text-gray-700"}`}
              >
                History
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-0">
            {alertTab === "active" ? (
              alertsLoading ? (
                <div className="flex justify-center py-4">
                  <LoadingSpinner size="sm" />
                </div>
              ) : alerts && alerts.length > 0 ? (
                <AlertsList
                  alerts={alerts}
                  onResolve={handleResolveAlert}
                  compact={true}
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-8 px-4">
                  <div className="p-3 bg-green-100 rounded-full mb-3">
                    <FaCheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <p className="text-sm font-medium text-gray-700">All Clear!</p>
                  <p className="text-xs text-gray-500 text-center mt-1">
                    No active alerts at the moment
                  </p>
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
      </div>
    </div>
  );
}