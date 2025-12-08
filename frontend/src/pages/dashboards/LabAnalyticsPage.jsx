// frontend/src/pages/dashboards/LabAnalyticsPage.jsx - UPDATED WITH REAL-TIME HEALTH/EFFICIENCY
import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import io from "socket.io-client";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import {
  ArrowLeft, Box, Clock, BarChart3, PieChart as PieChartIcon, 
  Wrench, Building, Award, AlertCircle, ShieldCheck, 
  TrendingUp, TrendingDown, Activity, Wifi, WifiOff
} from "lucide-react";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import api from "../../lib/axios";

// --- CONSTANTS ---
const STATUS_COLORS = {
  "OPERATIONAL": "#10B981",
  "IN USE": "#3B82F6",
  "IN CLASS": "#8B5CF6",
  "MAINTENANCE": "#F59E0B",
  "FAULTY": "#EF4444",
  "IDLE": "#6B7280",
  "OFFLINE": "#9CA3AF",
  "WARNING": "#F97316"
};

const FALLBACK_COLORS = ["#8B5CF6", "#EC4899", "#14B8A6", "#6366F1", "#84CC16", "#06B6D4"];

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
    <div className={`p-4 rounded-xl border ${priorityBg} shadow-sm`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900 text-sm truncate pr-2">{equipment?.name || "Unknown Equipment"}</h4>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs font-bold text-${priorityColor}-700`}>
              Failure Prob: {probability.toFixed(1)}%
            </span>
          </div>
        </div>
        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase bg-white border border-${priorityColor}-200 text-${priorityColor}-700`}>
          {priority}
        </span>
      </div>
      <div className="mt-2 pt-2 border-t border-black/5">
        <div className="flex items-start gap-1.5 mb-1">
          <AlertCircle className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-gray-600">
            {needsMaintenance ? `Maintenance needed in ${daysUntil} days` : `Next maintenance in ~${daysUntil} days`}
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
    console.log('🔌 Setting up Socket.IO connection...');

    let token = null;
    try {
      const authStorage = localStorage.getItem('auth-storage');
      if (authStorage) {
        const parsed = JSON.parse(authStorage);
        token = parsed?.state?.accessToken;
      }
    } catch (e) {
      console.error('❌ Failed to parse auth token:', e);
    }

    if (!token) {
      console.error('❌ No access token found in localStorage');
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
      console.log('✅ Socket.IO connected!', socketInstance.id);
      setIsSocketConnected(true);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('❌ Socket.IO disconnected:', reason);
      setIsSocketConnected(false);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('❌ Socket.IO connection error:', error.message);
      setIsSocketConnected(false);
    });

    socketInstance.on('equipment:status', (data) => {
      handleEquipmentUpdate(data);
    });

    socketInstance.on('equipment:status:update', (data) => {
      handleEquipmentUpdate(data.status || data);
    });

    setSocket(socketInstance);

    return () => {
      console.log('🔌 Cleaning up Socket.IO connection');
      socketInstance.removeAllListeners();
      socketInstance.disconnect();
    };
  }, []);

  // ========================================
  // 🆕 HANDLE LIVE UPDATES WITH REAL-TIME HEALTH/EFFICIENCY
  // ========================================
  const handleEquipmentUpdate = (data) => {
    const equipmentId = data.equipmentId || data.id;
    
    if (!equipmentId) {
      console.warn('⚠️ No equipmentId in update data', data);
      return;
    }

    console.log('📊 Real-time update received:', {
      equipmentId,
      temperature: data.temperature,
      vibration: data.vibration,
      energyConsumption: data.energyConsumption,
      healthScore: data.healthScore, // 🆕 Real-time calculated
      efficiency: data.efficiency,    // 🆕 Real-time calculated
    });

    // 1. Update Live Indicator State
    setLiveUpdates((prev) => ({
      ...prev,
      [equipmentId]: {
        temperature: data.temperature,
        vibration: data.vibration,
        energyConsumption: data.energyConsumption,
        healthScore: data.healthScore,     // 🆕 Store real-time health score
        efficiency: data.efficiency,       // 🆕 Store real-time efficiency
        updatedAt: new Date(),
      },
    }));

    // ========================================
    // 🆕 UPDATE LAB DATA WITH REAL-TIME CALCULATED METRICS
    // ========================================
    setLabData((prevLabData) => {
      if (!prevLabData || !prevLabData.equipment) return prevLabData;

      let updatedEquipmentList = prevLabData.equipment.map((eq) => {
        if (eq.id === equipmentId) {
          // Use the calculated metrics from the backend
          const newHealthScore = data.healthScore ?? eq.status?.healthScore ?? 0;
          const newEfficiency = data.efficiency ?? eq.analyticsParams?.efficiency ?? 0;

          return {
            ...eq,
            status: {
              ...eq.status,
              status: data.status || eq.status?.status,
              healthScore: newHealthScore, // 🆕 Use real-time calculated value
              temperature: data.temperature ?? eq.status?.temperature,
              vibration: data.vibration ?? eq.status?.vibration,
              energyConsumption: data.energyConsumption ?? eq.status?.energyConsumption,
            },
            analyticsParams: {
              ...eq.analyticsParams,
              temperature: data.temperature ?? eq.analyticsParams?.temperature,
              vibration: data.vibration ?? eq.analyticsParams?.vibration,
              energyConsumption: data.energyConsumption ?? eq.analyticsParams?.energyConsumption,
              efficiency: newEfficiency, // 🆕 Use real-time calculated value
            }
          };
        }
        return eq;
      });

      // ========================================
      // 🆕 RECALCULATE GLOBAL STATS BASED ON REAL-TIME DATA
      // ========================================
      const totalEquipment = updatedEquipmentList.length;
      const avgHealthScore = updatedEquipmentList.reduce((sum, eq) => 
        sum + (eq.status?.healthScore || 0), 0) / (totalEquipment || 1);

      console.log('📊 Updated average health score:', avgHealthScore);

      return {
        ...prevLabData,
        equipment: updatedEquipmentList,
        statistics: {
          ...prevLabData.statistics,
          avgHealthScore: avgHealthScore // 🆕 Update with real-time average
        }
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
        const analyticsResponse = await api.get(`/monitoring/lab-analytics/${labId}`);
        setLabData(analyticsResponse.data.data);

        try {
          const predictiveResponse = await api.get(`/analytics/predictive/${labId}`);
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

  // --- LIVE INDICATOR COMPONENT ---
  const LiveIndicator = ({ equipmentId }) => {
    const update = liveUpdates[equipmentId];
    if (!update) return null;

    const secondsAgo = Math.floor((new Date() - update.updatedAt) / 1000);
    const isLive = secondsAgo < 10;

    return (
      <div className="flex items-center gap-2 ml-2">
        <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
        <span className={`text-[10px] font-bold ${isLive ? 'text-green-600' : 'text-gray-500'}`}>
          {isLive ? 'LIVE' : `${secondsAgo}s ago`}
        </span>
      </div>
    );
  };

  // --- CHART DATA PREPARATION ---
  const chartData = useMemo(() => {
    if (!labData || !labData.equipment) return null;

    const equipment = labData.equipment;

    const statusData = equipment.reduce((acc, eq) => {
      let status = eq.status?.status || "OFFLINE";
      status = status.toUpperCase().replace(/_/g, " ");
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    const statusChartData = Object.entries(statusData).map(([status, count]) => ({
      name: status,
      rawStatus: status,
      value: count,
    }));

    // 🆕 Health Score uses real-time calculated values
    const healthScoreData = equipment.map((eq) => ({
      name: eq.name,
      shortName: eq.name.substring(0, 15) + (eq.name.length > 15 ? "..." : ""),
      healthScore: eq.status?.healthScore || 0, // Real-time value
      efficiency: eq.analyticsParams?.efficiency || 0, // Real-time value
    }));

    const tempData = equipment.filter(eq => eq.analyticsParams?.temperature !== undefined).map(eq => ({
        name: eq.name,
        shortName: eq.name.substring(0, 10),
        temperature: eq.analyticsParams.temperature
    }));

    const vibrationData = equipment.filter(eq => eq.analyticsParams?.vibration !== undefined).map(eq => ({
        name: eq.name,
        shortName: eq.name.substring(0, 10),
        vibration: eq.analyticsParams.vibration
    }));

    const energyData = equipment.filter(eq => eq.analyticsParams?.energyConsumption !== undefined).map(eq => ({
        name: eq.name,
        shortName: eq.name.substring(0, 10),
        energy: eq.analyticsParams.energyConsumption
    }));

    return { statusChartData, healthScoreData, tempData, vibrationData, energyData };
  }, [labData]);

  // --- RENDER ---
  if (isLoading) return <div className="flex items-center justify-center min-h-screen bg-gray-50"><LoadingSpinner size="lg" /></div>;
  
  if (error) return (
    <div className="flex items-center justify-center min-h-screen bg-gray-200">
      <div className="text-center">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Analytics</h2>
        <p className="text-gray-600 mb-4">{error}</p>
        <button onClick={() => navigate("/dashboard")} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Return to Dashboard</button>
      </div>
    </div>
  );

  if (!labData) return <div className="flex items-center justify-center min-h-screen bg-gray-50"><p className="text-gray-600">No data available.</p></div>;

  const isoStandard = getISOStandard(labData.lab?.department);
  const stats = labData.statistics || {};

  return (
    <div className="min-h-screen bg-gray-200 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-5 sticky top-0 z-10 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/dashboard")} className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-gray-900">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-gray-900">{labData.lab?.name || "Lab Analytics"}</h1>
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
                    <span className="flex items-center gap-1 text-blue-600 font-medium"><Award className="w-3 h-3" /> {isoStandard}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 w-full p-6 space-y-6">
        {/* Stats Cards - 🆕 Now shows real-time calculated average */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard icon={Box} title="Total Equipment" value={stats.totalEquipment || 0} />
          <StatCard 
            icon={ShieldCheck} 
            title="Avg Health" 
            value={`${(stats.avgHealthScore || 0).toFixed(0)}%`} 
            color="text-green-600" 
          />
          <StatCard icon={TrendingUp} title="Total Uptime" value={`${(stats.totalUptime || 0).toFixed(0)}h`} />
          <StatCard icon={TrendingDown} title="Downtime" value={`${(stats.totalDowntime || 0).toFixed(0)}h`} />
          <StatCard icon={Clock} title="Active Now" value={stats.inClassEquipment || 0} color="text-purple-600" />
        </div>

        {/* Predictive Maintenance */}
        {predictiveData && predictiveData.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg text-purple-600"><Wrench className="w-5 h-5" /></div>
                  <div>
                      <h3 className="text-lg font-bold text-gray-900">AI Predictive Forecast</h3>
                      <p className="text-sm text-gray-500">Real-time failure probability.</p>
                  </div>
                </div>
            </div>
            <div className="max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {predictiveData.map((item) => (
                    <PredictiveMaintenanceCard
                        key={item.id}
                        equipment={labData.equipment?.find(eq => eq.id === item.id)}
                        prediction={item.prediction}
                    />
                ))}
                </div>
            </div>
          </div>
        )}

        {/* Charts Section - 🆕 Now uses real-time health/efficiency data */}
        {chartData && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                <PieChartIcon className="text-blue-500 w-5 h-5"/> Status
              </h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData.statusChartData} cx="50%" cy="45%" startAngle={90} endAngle={-270}
                      outerRadius={80} labelLine={false} dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {chartData.statusChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.rawStatus] || FALLBACK_COLORS[index]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Health Chart - 🆕 Real-time calculated values */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 lg:col-span-2 flex flex-col">
              <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                <BarChart3 className="text-green-500 w-5 h-5"/> Health & Efficiency (Real-time)
              </h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={chartData.healthScoreData} 
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    barCategoryGap={chartData.healthScoreData.length > 15 ? '5%' : chartData.healthScoreData.length > 10 ? '10%' : '15%'}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="shortName" 
                      angle={chartData.healthScoreData.length > 10 ? -45 : -20} 
                      textAnchor="end" 
                      height={60} 
                      tick={{ fontSize: chartData.healthScoreData.length > 15 ? 9 : 11 }} 
                      interval={0} 
                    />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar 
                      dataKey="healthScore" 
                      fill="#10B981" 
                      name="Health Score"
                      maxBarSize={chartData.healthScoreData.length > 15 ? 20 : chartData.healthScoreData.length > 10 ? 30 : 50}
                    />
                    <Bar 
                      dataKey="efficiency" 
                      fill="#3B82F6" 
                      name="Efficiency %"
                      maxBarSize={chartData.healthScoreData.length > 15 ? 20 : chartData.healthScoreData.length > 10 ? 30 : 50}
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
            <ChartCard title="Temperature (°C)" data={chartData.tempData} dataKey="temperature" color="#F59E0B" />
            <ChartCard title="Vibration (mm/s)" data={chartData.vibrationData} dataKey="vibration" color="#8B5CF6" />
            <ChartCard title="Energy (W)" data={chartData.energyData} dataKey="energy" color="#10B981" />
          </div>
        )}

        {/* Live Equipment Table - 🆕 Shows real-time health/efficiency */}
        {labData.equipment && labData.equipment.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Equipment Detail View (Real-time Metrics)</h3>
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
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase bg-gray-50">Equipment</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase bg-gray-50">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase bg-gray-50">Health</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase bg-gray-50">Efficiency</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase bg-gray-50">Temp</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase bg-gray-50">Vib</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase bg-gray-50">Energy</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {labData.equipment.map((eq) => {
                    const hasLiveData = liveUpdates[eq.id];
                    return (
                      <tr key={eq.id} className={`hover:bg-gray-50 transition-colors ${hasLiveData ? 'bg-green-50/40' : ''}`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                                <span className="text-sm font-medium text-gray-900">{eq.name}</span>
                                <LiveIndicator equipmentId={eq.id} />
                            </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2.5 py-1 inline-flex text-xs leading-4 font-semibold rounded-full bg-gray-100 text-gray-800">
                            {eq.status?.status || "OFFLINE"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className={hasLiveData ? 'font-bold text-green-700' : ''}>
                            {(eq.status?.healthScore || 0).toFixed(0)}%
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className={hasLiveData ? 'font-bold text-green-700' : ''}>
                            {(eq.analyticsParams?.efficiency || 0).toFixed(0)}%
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            <span className={hasLiveData ? 'font-bold text-green-700' : ''}>
                                {eq.analyticsParams?.temperature?.toFixed(1) || "N/A"}
                            </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            <span className={hasLiveData ? 'font-bold text-green-700' : ''}>
                                {eq.analyticsParams?.vibration?.toFixed(2) || "N/A"}
                            </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            <span className={hasLiveData ? 'font-bold text-green-700' : ''}>
                                {eq.analyticsParams?.energyConsumption?.toFixed(0) || "N/A"}
                            </span>
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

// Helper Components
const StatCard = ({ icon: Icon, title, value, color = "text-blue-600" }) => (
  <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
    <div className={`p-3 bg-blue-50 ${color} rounded-full mb-3`}>
      <Icon className="w-5 h-5" />
    </div>
    <span className="text-2xl font-bold text-gray-900">{value}</span>
    <span className="text-xs text-gray-500 font-medium uppercase tracking-wide mt-1">{title}</span>
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
          <div style={{ width: `${dynamicWidth}%`, minWidth: '100%', height: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="shortName" angle={-20} textAnchor="end" height={60} tick={{ fontSize: 10 }} interval={0} />
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