// frontend/src/pages/dashboards/LabAnalyticsPage.jsx - COMPLETE IMPLEMENTATION
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import {
  ArrowLeft, LineChart as LineChartIcon, Box, Clock, BarChart3,
  PieChart as PieChartIcon, Wrench, Building, Award, AlertCircle,
  ShieldCheck, TrendingUp, TrendingDown, Activity
} from "lucide-react";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import api from "../../lib/axios";

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

// Predictive Maintenance Card Component
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
          <h4 className="font-semibold text-gray-900 text-sm">{equipment.name}</h4>
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
            {needsMaintenance 
              ? `Maintenance needed in ${daysUntil} days` 
              : `Next maintenance in ~${daysUntil} days`}
          </p>
        </div>
        {prediction.daysSinceMaintenance !== undefined && (
          <p className="text-xs text-gray-500 mt-1">
            Last maintained {prediction.daysSinceMaintenance} days ago
          </p>
        )}
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

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Fetch lab analytics
        const analyticsResponse = await api.get(`/monitoring/lab-analytics/${labId}`);
        setLabData(analyticsResponse.data.data);

        // Fetch predictive maintenance data
        const predictiveResponse = await api.get(`/analytics/predictive/${labId}`);
        setPredictiveData(predictiveResponse.data.data || []);

      } catch (err) {
        console.error("Failed to fetch lab analytics:", err);
        setError(err.response?.data?.message || "Failed to load lab analytics");
      } finally {
        setIsLoading(false);
      }
    };

    if (labId) {
      fetchData();
    }
  }, [labId]);

  const prepareChartData = () => {
    if (!labData || !labData.equipment) return null;

    const equipment = labData.equipment;

    // Status Distribution
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

    // Health Score Data
    const healthScoreData = equipment.slice(0, 10).map((eq) => ({
      name: eq.name.substring(0, 20) + (eq.name.length > 20 ? "..." : ""),
      healthScore: eq.status?.healthScore || 0,
      efficiency: eq.analyticsParams?.efficiency || 0,
    }));

    // Temperature Trend (Last 24 hours from sensor data)
    const tempData = equipment
      .filter(eq => eq.analyticsParams?.temperature)
      .slice(0, 8)
      .map(eq => ({
        name: eq.name.substring(0, 15),
        temperature: eq.analyticsParams.temperature
      }));

    // Vibration & Energy Data
    const vibrationData = equipment
      .filter(eq => eq.analyticsParams?.vibration)
      .slice(0, 8)
      .map(eq => ({
        name: eq.name.substring(0, 15),
        vibration: eq.analyticsParams.vibration
      }));

    const energyData = equipment
      .filter(eq => eq.analyticsParams?.energyConsumption)
      .slice(0, 8)
      .map(eq => ({
        name: eq.name.substring(0, 15),
        energy: eq.analyticsParams.energyConsumption
      }));

    return { statusChartData, healthScoreData, tempData, vibrationData, energyData };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-200">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Analytics</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate("/dashboard")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!labData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <p className="text-gray-600">No data available for this lab.</p>
      </div>
    );
  }

  const chartData = prepareChartData();
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
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                {labData.lab?.name || "Lab Analytics"}
                {isoStandard && (
                  <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold tracking-wide">
                    <Award className="w-3 h-3" /> {isoStandard}
                  </span>
                )}
              </h1>
              <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                <Building className="w-3 h-3" />
                <span>{labData.lab?.institute?.name}</span>
                <span className="text-gray-300">•</span>
                <span>{labData.lab?.department?.replace(/_/g, " ")}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 w-full p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard icon={Box} title="Total Equipment" value={stats.totalEquipment || 0} />
          <StatCard icon={ShieldCheck} title="Avg Health" value={`${(stats.avgHealthScore || 0).toFixed(0)}%`} color="text-green-600" />
          <StatCard icon={TrendingUp} title="Total Uptime" value={`${(stats.totalUptime || 0).toFixed(0)}h`} />
          <StatCard icon={TrendingDown} title="Downtime" value={`${(stats.totalDowntime || 0).toFixed(0)}h`} />
          <StatCard icon={Clock} title="Active Now" value={stats.inClassEquipment || 0} color="text-purple-600" />
        </div>

        {/* Predictive Maintenance Section */}
        {predictiveData && predictiveData.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                <Wrench className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">AI Predictive Maintenance Forecast</h3>
                <p className="text-sm text-gray-500">Real-time failure probability based on live sensor telemetry.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {predictiveData
                .sort((a, b) => (b.prediction?.probability || 0) - (a.prediction?.probability || 0))
                .slice(0, 6)
                .map((item) => (
                  <PredictiveMaintenanceCard
                    key={item.id}
                    equipment={labData.equipment.find(eq => eq.id === item.id)}
                    prediction={item.prediction}
                  />
                ))}
            </div>
          </div>
        )}

        {/* Charts Section */}
        {chartData && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Status Pie Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                <PieChartIcon className="text-blue-500 w-5 h-5"/> Equipment Status
              </h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData.statusChartData}
                      cx="50%" cy="45%"
                      startAngle={90} endAngle={-270}
                      outerRadius={80}
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      dataKey="value"
                    >
                      {chartData.statusChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.rawStatus] || FALLBACK_COLORS[index % FALLBACK_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Health Score Bar Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 lg:col-span-2">
              <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                <BarChart3 className="text-green-500 w-5 h-5"/> Health Score & Efficiency
              </h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData.healthScoreData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="name" angle={-20} textAnchor="end" height={60} tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="healthScore" fill="#10B981" name="Health Score" />
                    <Bar dataKey="efficiency" fill="#3B82F6" name="Efficiency %" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Additional Charts: Temperature, Vibration, Energy */}
        {chartData && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Temperature Chart */}
            <ChartCard title="Temperature (°C)" data={chartData.tempData} dataKey="temperature" color="#F59E0B" />
            
            {/* Vibration Chart */}
            <ChartCard title="Vibration (mm/s)" data={chartData.vibrationData} dataKey="vibration" color="#8B5CF6" />
            
            {/* Energy Consumption Chart */}
            <ChartCard title="Energy (W)" data={chartData.energyData} dataKey="energy" color="#10B981" />
          </div>
        )}

        {/* Equipment Table */}
        {labData.equipment && labData.equipment.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Equipment Detail View</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Equipment</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Health</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Temp (°C)</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Vibration</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Energy (W)</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {labData.equipment.map((eq) => (
                    <tr key={eq.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{eq.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2.5 py-1 inline-flex text-xs leading-4 font-semibold rounded-full bg-gray-100 text-gray-800">
                          {eq.status?.status || "OFFLINE"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {(eq.status?.healthScore || 0).toFixed(0)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {eq.analyticsParams?.temperature?.toFixed(1) || "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {eq.analyticsParams?.vibration?.toFixed(2) || "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {eq.analyticsParams?.energyConsumption?.toFixed(0) || "N/A"}
                      </td>
                    </tr>
                  ))}
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

const ChartCard = ({ title, data, dataKey, color }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
    <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
      <Activity className="w-5 h-5" style={{ color }} /> {title}
    </h3>
    <div className="h-[250px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
          <XAxis dataKey="name" angle={-20} textAnchor="end" height={60} tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Bar dataKey={dataKey} fill={color} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </div>
);