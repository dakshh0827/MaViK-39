// frontend/src/pages/dashboards/LabAnalyticsPage.jsx
import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import io from "socket.io-client";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  ArrowLeft,
  Box,
  BarChart3,
  PieChart as PieChartIcon,
  Wrench,
  Building,
  Award,
  AlertCircle,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Activity,
  Lock,
  Unlock,
} from "lucide-react";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import api from "../../lib/axios";

// --- CONSTANTS ---
const STATUS_COLORS = {
  OPERATIONAL: "#10B981",
  "IN USE": "#3B82F6",
  "IN CLASS": "#8B5CF6",
  MAINTENANCE: "#F59E0B",
  FAULTY: "#EF4444",
  IDLE: "#6B7280",
  OFFLINE: "#9CA3AF",
  WARNING: "#F97316",
};

const FALLBACK_COLORS = [
  "#8B5CF6",
  "#EC4899",
  "#14B8A6",
  "#6366F1",
  "#84CC16",
  "#06B6D4",
];

// --- HELPER: Date + Time ---
const formatTimestamp = (isoString) => {
  if (!isoString) return "N/A";
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "Invalid Date";

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
};

const getISOStandard = (department) => {
  if (!department) return null;
  const dept = department.toLowerCase();
  if (dept.includes("manufactur")) return "ISO 9001";
  if (dept.includes("electric")) return "IEC/ISO standards";
  if (dept.includes("weld")) return "ISO 3834";
  if (dept.includes("material")) return "ISO 17025";
  if (dept.includes("auto")) return "ISO 16750, ISO 26262";
  return null;
};

const PredictiveMaintenanceCard = ({ equipment, prediction }) => {
  if (!prediction) return null;
  const probability = prediction.probability || 0;
  const daysUntil = prediction.daysUntilMaintenance || 0;
  const needsMaintenance = prediction.prediction === 1;

  let priority = "LOW";
  let priorityColor = "green";
  let priorityBg = "bg-green-50 border-green-200";

  if (needsMaintenance || probability > 70) {
    priority = "CRITICAL";
    priorityColor = "red";
    priorityBg = "bg-red-50 border-red-200";
  } else if (probability > 50 || daysUntil < 15) {
    priority = "HIGH";
    priorityColor = "orange";
    priorityBg = "bg-orange-50 border-orange-200";
  } else if (probability > 30 || daysUntil < 30) {
    priority = "MEDIUM";
    priorityColor = "yellow";
    priorityBg = "bg-yellow-50 border-yellow-200";
  }

  return (
    <div
      className={`p-5 rounded-xl border ${priorityBg} shadow-sm min-h-[160px] flex flex-col justify-between`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900 text-sm truncate pr-2">
            {equipment?.name || "Unknown Equipment"}
          </h4>
          <div className="flex items-center gap-2 mt-2">
            <span
              className={`text-xs font-bold text-${priorityColor}-700 bg-white/60 px-2 py-1 rounded`}
            >
              Confidence: {probability.toFixed(1)}%
            </span>
          </div>
        </div>
        <span
          className={`px-2 py-1 rounded text-[10px] font-bold uppercase bg-white border border-${priorityColor}-200 text-${priorityColor}-700`}
        >
          {priority}
        </span>
      </div>
      <div className="mt-2 pt-2 border-t border-black/5">
        <div className="flex items-start gap-1.5 mb-1">
          <AlertCircle className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-gray-600">
            {needsMaintenance
              ? `Maintenance needed in ${daysUntil} days`
              : `Next maintenance in ~${daysUntil} days`}
          </p>
        </div>
      </div>
    </div>
  );
};

export default function LabAnalyticsPage() {
  const { labId } = useParams();
  const navigate = useNavigate();

  const [labData, setLabData] = useState(null);
  const [predictiveData, setPredictiveData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [socket, setSocket] = useState(null);
  const [liveUpdates, setLiveUpdates] = useState({});
  const [isSocketConnected, setIsSocketConnected] = useState(false);

  // --- SOCKET.IO CONNECTION ---
  useEffect(() => {
    let token = null;
    try {
      const authStorage = localStorage.getItem("auth-storage");
      if (authStorage) {
        const parsed = JSON.parse(authStorage);
        token = parsed?.state?.accessToken;
      }
    } catch (e) {
      console.error("❌ Failed to parse auth token:", e);
    }

    if (!token) return;

    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
    const socketUrl = apiUrl.replace("/api", "");

    const socketInstance = io(socketUrl, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketInstance.on("connect", () => {
      setIsSocketConnected(true);
    });

    socketInstance.on("disconnect", () => {
      setIsSocketConnected(false);
    });

    socketInstance.on("connect_error", () => {
      setIsSocketConnected(false);
    });

    socketInstance.on("equipment:status", (data) => {
      handleEquipmentUpdate(data);
    });

    socketInstance.on("equipment:status:update", (data) => {
      handleEquipmentUpdate(data.status || data);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.removeAllListeners();
      socketInstance.disconnect();
    };
  }, []);

  // ========================================
  // 🆕 HANDLE LIVE UPDATES (Status + Auth)
  // ========================================
  const handleEquipmentUpdate = (data) => {
    const equipmentId = data.equipmentId || data.id;

    if (!equipmentId) return;

    // 1. Update Live Indicator State
    setLiveUpdates((prev) => ({
      ...prev,
      [equipmentId]: {
        // Metric Updates
        temperature: data.temperature,
        vibration: data.vibration,
        healthScore: data.healthScore,
        efficiency: data.efficiency,
        status: data.status,
        energyConsumption: data.energyConsumption,
        // Authentication Updates
        isLocked: data.isLocked,
        currentUserId: data.currentUserId,

        timestamp: data.readingTimestamp || new Date().toISOString(),
        updatedAt: new Date(),
      },
    }));

    // 2. Update Main Lab Data
    setLabData((prevLabData) => {
      if (!prevLabData || !prevLabData.equipment) return prevLabData;

      let updatedEquipmentList = prevLabData.equipment.map((eq) => {
        if (eq.id === equipmentId) {
          return {
            ...eq,
            // Merge Auth State
            isLocked: data.isLocked !== undefined ? data.isLocked : eq.isLocked,
            currentUserId:
              data.currentUserId !== undefined
                ? data.currentUserId
                : eq.currentUserId,

            status: {
              ...eq.status,
              status: data.status || eq.status?.status,
              healthScore: data.healthScore ?? eq.status?.healthScore,
              lastUsedAt: data.readingTimestamp || new Date().toISOString(),
            },
            analyticsParams: {
              ...eq.analyticsParams,
              temperature: data.temperature ?? eq.analyticsParams?.temperature,
              vibration: data.vibration ?? eq.analyticsParams?.vibration,
              efficiency: data.efficiency ?? eq.analyticsParams?.efficiency,
              energyConsumption:
                data.energyConsumption ?? eq.analyticsParams?.energyConsumption,
            },
          };
        }
        return eq;
      });

      // Recalculate Stats
      const totalEquipment = updatedEquipmentList.length;
      const avgHealthScore =
        updatedEquipmentList.reduce(
          (sum, eq) => sum + (eq.status?.healthScore || 0),
          0
        ) / (totalEquipment || 1);

      return {
        ...prevLabData,
        equipment: updatedEquipmentList,
        statistics: {
          ...prevLabData.statistics,
          avgHealthScore: avgHealthScore,
        },
      };
    });
  };

  // --- INITIAL DATA FETCH ---
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        console.log(`📊 Fetching lab analytics for: ${labId}`);
        const analyticsResponse = await api.get(
          `/monitoring/lab-analytics/${labId}`
        );
        setLabData(analyticsResponse.data.data);

        try {
          const predictiveResponse = await api.get(
            `/analytics/predictive/${labId}`
          );
          setPredictiveData(predictiveResponse.data.data || []);
        } catch (predErr) {
          console.warn("Predictive data fetch failed (non-critical):", predErr);
        }
      } catch (err) {
        console.error("❌ Failed to fetch lab analytics:", err);
        setError(err.response?.data?.message || "Failed to load lab analytics");
      } finally {
        setIsLoading(false);
      }
    };

    if (labId) {
      fetchData();
    }
  }, [labId]);

  // --- AUTH HANDLERS ---
  const handleAuthClick = (equipment) => {
    if (!equipment.isLocked) return; // Prevent clicking if already unlocked
    setSelectedEquipmentForAuth(equipment);
    setShowAuthModal(true);
  };

  const handleAuthSuccess = (data) => {
    // The socket should handle the state update, but we can do a quick optimistic update or refresh
    console.log("Authentication Successful:", data);

    // Optional: Refresh full data to ensure cascading unlocks are reflected if socket is slow
    api
      .get(`/monitoring/lab-analytics/${labId}`)
      .then((res) => setLabData(res.data.data))
      .catch(console.error);
  };

  // --- CHART DATA PREPARATION ---
  const chartData = useMemo(() => {
    if (!labData || !labData.equipment) return null;

    // 1. Merge liveUpdates into the equipment list
    const equipment = labData.equipment.map((eq) => {
      const live = liveUpdates[eq.id];
      if (!live) return eq;

      return {
        ...eq,
        status: {
          ...eq.status,
          status: live.status || eq.status?.status,
          healthScore: live.healthScore ?? eq.status?.healthScore,
        },
        analyticsParams: {
          ...eq.analyticsParams,
          temperature: live.temperature ?? eq.analyticsParams?.temperature,
          vibration: live.vibration ?? eq.analyticsParams?.vibration,
          efficiency: live.efficiency ?? eq.analyticsParams?.efficiency,
          energyConsumption:
            live.energyConsumption ?? eq.analyticsParams?.energyConsumption,
        },
      };
    });

    const statusData = equipment.reduce((acc, eq) => {
      let status = eq.status?.status || "OFFLINE";
      status = status.toUpperCase().replace(/_/g, " ");
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    const statusChartData = Object.entries(statusData).map(
      ([status, count]) => ({
        name: status,
        rawStatus: status,
        value: count,
      })
    );

    const healthScoreData = equipment.map((eq) => ({
      name: eq.name,
      shortName: eq.name.substring(0, 15) + (eq.name.length > 15 ? "..." : ""),
      healthScore: eq.status?.healthScore || 0,
      efficiency: eq.analyticsParams?.efficiency || 0,
    }));

    const tempData = equipment
      .filter((eq) => eq.analyticsParams?.temperature !== undefined)
      .map((eq) => ({
        name: eq.name,
        shortName: eq.name.substring(0, 10),
        temperature: eq.analyticsParams.temperature,
      }));

    const vibrationData = equipment
      .filter((eq) => eq.analyticsParams?.vibration != null)
      .map((eq) => ({
        name: eq.name,
        shortName: eq.name.substring(0, 10),
        vibration: eq.analyticsParams.vibration,
      }));

    const energyData = equipment
      .filter((eq) => eq.analyticsParams?.energyConsumption != null)
      .map((eq) => ({
        name: eq.name,
        shortName: eq.name.substring(0, 10),
        energy: eq.analyticsParams.energyConsumption,
      }));

    return {
      statusChartData,
      healthScoreData,
      tempData,
      vibrationData,
      energyData,
    };
  }, [labData, liveUpdates]);

  // --- CALCULATE UNIQUE QUALIFICATIONS ---
  const uniqueQualifications = useMemo(() => {
    if (!labData?.equipment) return [];
    const foundUrls = new Set();
    const qualifications = [];

    labData.equipment.forEach((eq) => {
      const data = getQualificationData(eq.name);
      if (data && !foundUrls.has(data.url)) {
        foundUrls.add(data.url);
        qualifications.push(data);
      }
    });
    return qualifications;
  }, [labData]);

  // --- CALCULATE AVERAGE AI CONFIDENCE ---
  const avgAiConfidence = useMemo(() => {
    if (!predictiveData || predictiveData.length === 0) return 0;
    const totalConfidence = predictiveData.reduce(
      (sum, item) => sum + (item.prediction?.probability || 0),
      0
    );
    return (totalConfidence / predictiveData.length).toFixed(1);
  }, [predictiveData]);

  if (isLoading)
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  if (error)
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-200">
        <p className="text-red-500">{error}</p>
      </div>
    );
  if (!labData)
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <p className="text-gray-600">No data available.</p>
      </div>
    );

  const isoStandard = getISOStandard(labData.lab?.department);
  const stats = labData.statistics || {};

  return (
    <div className="min-h-screen bg-gray-200 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-5 sticky top-0 z-10 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/dashboard")}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-gray-900">
                  {labData.lab?.name || "Lab Analytics"}
                </h1>
                {isSocketConnected ? (
                  <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full flex items-center gap-1.5 border border-green-200">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    Real-time Active
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded-full flex items-center gap-1.5 border border-gray-200">
                    <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                    Connecting...
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                <Building className="w-3 h-3" />
                <span>{labData.lab?.institute?.name}</span>
                {isoStandard && (
                  <>
                    <span className="text-gray-300">•</span>
                    <span className="flex items-center gap-1 text-blue-600 font-medium">
                      <Award className="w-3 h-3" /> {isoStandard}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 w-full p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard
            icon={Box}
            title="Total Equipment"
            value={stats.totalEquipment || 0}
          />
          <StatCard
            icon={ShieldCheck}
            title="Avg Health"
            value={`${(stats.avgHealthScore || 0).toFixed(0)}%`}
            color="text-green-600"
          />
          <StatCard
            icon={TrendingUp}
            title="Total Uptime"
            value={`${(stats.totalUptime || 0).toFixed(0)}h`}
          />
          <StatCard
            icon={TrendingDown}
            title="Downtime"
            value={`${(stats.totalDowntime || 0).toFixed(0)}h`}
          />
          <StatCard
            icon={Activity}
            title="Avg AI Confidence"
            value={`${avgAiConfidence}%`}
            color="text-purple-600"
          />
        </div>

        {/* Predictive Maintenance */}
        {predictiveData && predictiveData.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    AI Predictive Forecast
                  </h3>
                  <p className="text-sm text-gray-500">
                    Real-time failure probability.
                  </p>
                </div>
              </div>
            </div>
            <div className="max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {predictiveData.map((item) => (
                  <PredictiveMaintenanceCard
                    key={item.id}
                    equipment={labData.equipment?.find(
                      (eq) => eq.id === item.id
                    )}
                    prediction={item.prediction}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Charts Section */}
        {chartData && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                <PieChartIcon className="text-blue-500 w-5 h-5" /> Status
              </h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData.statusChartData}
                      cx="50%"
                      cy="45%"
                      startAngle={90}
                      endAngle={-270}
                      outerRadius={80}
                      labelLine={false}
                      dataKey="value"
                      label={({ name, percent }) =>
                        `${name}: ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {chartData.statusChartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            STATUS_COLORS[entry.rawStatus] ||
                            FALLBACK_COLORS[index]
                          }
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Health Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 lg:col-span-2 flex flex-col">
              <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                <BarChart3 className="text-green-500 w-5 h-5" /> Health &
                Efficiency (Real-time)
              </h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData.healthScoreData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#f0f0f0"
                    />
                    <XAxis
                      dataKey="shortName"
                      angle={-20}
                      textAnchor="end"
                      height={60}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar
                      dataKey="healthScore"
                      fill="#10B981"
                      name="Health Score"
                    />
                    <Bar
                      dataKey="efficiency"
                      fill="#3B82F6"
                      name="Efficiency %"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Sensor Charts */}
        {chartData && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <ChartCard
              title="Temperature (°C)"
              data={chartData.tempData}
              dataKey="temperature"
              color="#F59E0B"
            />
            {chartData.vibrationData.length > 0 && (
              <ChartCard
                title="Vibration (mm/s)"
                data={chartData.vibrationData}
                dataKey="vibration"
                color="#8B5CF6"
              />
            )}
            {chartData.energyData.length > 0 && (
              <ChartCard
                title="Energy (W)"
                data={chartData.energyData}
                dataKey="energy"
                color="#10B981"
              />
            )}
          </div>
        )}

        {/* Live Equipment Table with AUTH Controls */}
        {labData.equipment && labData.equipment.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">
                Equipment Detail View (Real-time Metrics)
              </h3>
              {Object.keys(liveUpdates).length > 0 && (
                <span className="text-xs text-green-600 flex items-center gap-1 font-bold animate-pulse">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  {Object.keys(liveUpdates).length} devices transmitting
                </span>
              )}
            </div>
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase bg-gray-50">
                      Equipment
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase bg-gray-50">
                      Access Control
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase bg-gray-50">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase bg-gray-50">
                      Health
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase bg-gray-50">
                      Temp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase bg-gray-50">
                      Vib
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase bg-gray-50">
                      Energy
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase bg-gray-50">
                      Last Updated
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {labData.equipment.map((eq) => {
                    const live = liveUpdates[eq.id];
                    const isFresh = live && new Date() - live.updatedAt < 5000;
                    const displayTime =
                      live?.timestamp || eq.status?.lastUsedAt;

                    // CHECK FOR QUALIFICATION DATA
                    const qualification = getQualificationData(eq.name);

                    return (
                      <tr
                        key={eq.id}
                        className={`hover:bg-gray-50 transition-colors duration-500 ${
                          isFresh ? "bg-green-50" : ""
                        }`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900">
                              {eq.name}
                            </span>
                            {live && (
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                            )}
                          </div>
                        </td>

                        {/* QUALIFICATION LINK CELL */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          {qualification ? (
                            <a
                              href={qualification.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              View NQR
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-xs text-gray-400">N/A</span>
                          )}
                        </td>

                        {/* NEW CELL: Qualification Link */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          {qualification ? (
                            <a
                              href={qualification.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              View NQR
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-xs text-gray-400">N/A</span>
                          )}
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2.5 py-1 inline-flex text-xs leading-4 font-semibold rounded-full text-white`}
                            style={{
                              backgroundColor:
                                STATUS_COLORS[
                                  live?.status || eq.status?.status
                                ] || STATUS_COLORS.OFFLINE,
                            }}
                          >
                            {live?.status || eq.status?.status || "OFFLINE"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span
                            className={
                              isFresh ? "font-bold text-green-700" : ""
                            }
                          >
                            {(
                              live?.healthScore ??
                              eq.status?.healthScore ??
                              0
                            ).toFixed(0)}
                            %
                          </span>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          <span
                            className={
                              isFresh ? "font-bold text-green-700" : ""
                            }
                          >
                            {(
                              live?.temperature ??
                              eq.analyticsParams?.temperature
                            )?.toFixed(1) ?? "N/A"}
                            °C
                          </span>
                        </td>

                        {/* VIBRATION CELL - UPDATED */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          <span
                            className={
                              isFresh ? "font-bold text-green-700" : ""
                            }
                          >
                            {(
                              live?.vibration ?? eq.analyticsParams?.vibration
                            )?.toFixed(2) ?? "-"}
                          </span>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                          {eq.analyticsParams?.energyConsumption
                            ? eq.analyticsParams.energyConsumption.toFixed(0)
                            : "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                          {formatTimestamp(displayTime)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// HELPER COMPONENTS
// ==========================================

const StatCard = ({ icon: Icon, title, value, color = "text-blue-600" }) => (
  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
    <div className="flex items-center gap-3 mb-1">
      <div className={`p-2 bg-blue-50 ${color} rounded-full`}>
        <Icon className="w-4 h-4" />
      </div>
      <span className="text-xl font-bold text-gray-900">{value}</span>
    </div>
    <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">
      {title}
    </span>
  </div>
);

const ChartCard = ({ title, data, dataKey, color }) => {
  const dynamicWidth = Math.max(100, (data?.length || 0) * 12);
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col">
      <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
        <Activity className="w-5 h-5" style={{ color }} /> {title}
      </h3>
      <div className="h-[250px] overflow-x-auto overflow-y-hidden custom-scrollbar">
        <div
          style={{
            width: `${dynamicWidth}%`,
            minWidth: "100%",
            height: "100%",
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#f0f0f0"
              />
              <XAxis
                dataKey="shortName"
                angle={-20}
                textAnchor="end"
                height={60}
                tick={{ fontSize: 10 }}
                interval={0}
              />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey={dataKey} fill={color} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
