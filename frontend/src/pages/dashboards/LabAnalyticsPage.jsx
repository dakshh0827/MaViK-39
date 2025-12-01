import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useLabStore } from "../../stores/labStore";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import api from "../../lib/axios";
import {
  LineChart,
  Line,
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
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Area,
  AreaChart,
} from "recharts";
import {
  FaArrowLeft,
  FaChartLine,
  FaBox,
  FaClock,
  FaChartBar,
  FaChartPie,
  FaWrench,
  FaCalendarAlt,
  FaExclamationCircle,
  FaCertificate,
  FaBuilding
} from "react-icons/fa";
import { MdHealthAndSafety } from "react-icons/md";
import { BsGraphUpArrow, BsGraphDownArrow  } from "react-icons/bs";

// --- Status Colors Map (Fixed Semantic Colors) ---
const STATUS_COLORS = {
  "OPERATIONAL": "#10B981", // Green
  "IN USE": "#3B82F6",      // Blue
  "MAINTENANCE": "#f5b20b", // Yellow
  "FAULTY": "#EF4444",      // Red
  "OFFLINE": "#9CA3AF"      // Gray
};

// --- Distinct Fallback Colors ---
// Changed to Purples/Teals/Pinks to avoid collision with semantic colors above
const FALLBACK_COLORS = [
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#14B8A6", // Teal
  "#6366F1", // Indigo
  "#84CC16", // Lime
  "#06B6D4"  // Cyan
];

const getISOStandard = (department) => {
  if (!department) return null;
  const dept = department.toLowerCase();

  if (dept.includes("manufactur")) return "ISO 9001";
  if (dept.includes("electric")) return "IEC/ISO standards";
  if (dept.includes("weld")) return "ISO 3834";
  if (dept.includes("material")) return "ISO 17025";
  if (dept.includes("auto")) return "ISO 16750, ISO 26262";
  if (dept.includes("it") || dept.includes("comput")) return "ISO 27001";
  
  return null;
};

const calculateNextMaintenance = (equipment) => {
  const params = equipment.analyticsParams;
  const status = equipment.status;

  if (!params || !status) {
    return {
      daysUntilMaintenance: null,
      confidence: 0,
      priority: "UNKNOWN",
      factors: [],
    };
  }

  const healthScore = status.healthScore || 50;
  const efficiency = params.efficiency || 50;
  const uptime = params.totalUptime || 0;
  const downtime = params.totalDowntime || 0;
  const utilizationRate = params.utilizationRate || 50;
  const wearScore = (downtime / (uptime + downtime + 1)) * 100;

  const tempScore = params.temperature
    ? Math.max(0, 100 - Math.abs(params.temperature - 50) * 2)
    : 50;

  const vibrationScore = params.vibration
    ? Math.max(0, 100 - params.vibration * 20)
    : 50;

  const combinedScore =
    healthScore * 0.3 +
    efficiency * 0.2 +
    tempScore * 0.15 +
    vibrationScore * 0.15 +
    utilizationRate * 0.1 +
    (100 - wearScore) * 0.1;

  let daysUntilMaintenance;
  let priority;

  if (combinedScore >= 80) {
    daysUntilMaintenance = Math.floor(90 + (combinedScore - 80) * 2);
    priority = "LOW";
  } else if (combinedScore >= 60) {
    daysUntilMaintenance = Math.floor(30 + ((combinedScore - 60) / 20) * 60);
    priority = "MEDIUM";
  } else if (combinedScore >= 40) {
    daysUntilMaintenance = Math.floor(7 + ((combinedScore - 40) / 20) * 23);
    priority = "HIGH";
  } else {
    daysUntilMaintenance = Math.floor((combinedScore / 40) * 7);
    priority = "CRITICAL";
  }

  const dataAvailability = [
    healthScore !== 50,
    efficiency !== 50,
    params.temperature != null,
    params.vibration != null,
    uptime > 0,
  ].filter(Boolean).length;

  const confidence = (dataAvailability / 5) * 100;

  const factors = [];
  if (healthScore < 70) factors.push("Low health score");
  if (efficiency < 60) factors.push("Poor efficiency");
  if (wearScore > 30) factors.push("High wear rate");
  if (
    params.temperature &&
    (params.temperature > 70 || params.temperature < 30)
  ) {
    factors.push("Abnormal temperature");
  }
  if (params.vibration && params.vibration > 3) factors.push("High vibration");

  return {
    daysUntilMaintenance,
    confidence: Math.round(confidence),
    priority,
    factors,
    combinedScore: Math.round(combinedScore),
  };
};

const PredictiveMaintenanceCard = ({ equipment }) => {
  const prediction = calculateNextMaintenance(equipment);

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "CRITICAL": return "red";
      case "HIGH": return "orange";
      case "MEDIUM": return "yellow";
      case "LOW": return "green";
      default: return "gray";
    }
  };

  const getPriorityBg = (priority) => {
    switch (priority) {
      case "CRITICAL": return "bg-red-50 border-red-200";
      case "HIGH": return "bg-orange-50 border-orange-200";
      case "MEDIUM": return "bg-yellow-50 border-yellow-200";
      case "LOW": return "bg-green-50 border-green-200";
      default: return "bg-gray-50 border-gray-200";
    }
  };

  return (
    <div className={`p-4 rounded-xl border ${getPriorityBg(prediction.priority)} shadow-sm`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900">{equipment.name}</h4>
          <div className="flex items-center gap-2 mt-1">
             <span className={`text-xs font-bold text-${getPriorityColor(prediction.priority)}-700`}>
                {prediction.daysUntilMaintenance ?? "?"} days remaining
             </span>
          </div>
        </div>
        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase bg-white border border-${getPriorityColor(prediction.priority)}-200 text-${getPriorityColor(prediction.priority)}-700`}>
          {prediction.priority}
        </span>
      </div>

      {prediction.factors.length > 0 && (
        <div className="mt-2 pt-2 border-t border-black/5 flex items-start gap-1.5">
          <FaExclamationCircle className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-gray-600">{prediction.factors.join(", ")}</p>
        </div>
      )}

      <div className="mt-2 flex justify-between items-center text-xs text-gray-500">
         <span>Confidence: {prediction.confidence}%</span>
         <span className="font-medium text-gray-700">Health: {prediction.combinedScore}%</span>
      </div>
    </div>
  );
};

export default function LabAnalyticsPage() {
  const { labId } = useParams();
  const navigate = useNavigate();
  const { labSummary, fetchLabSummary, isLoading: labLoading } = useLabStore();
  const [labAnalytics, setLabAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setAnalyticsLoading(true);
        await fetchLabSummary(labId);
        const response = await api.get(`/monitoring/lab-analytics/${labId}`);
        setLabAnalytics(response.data.data);
      } catch (error) {
        console.error("Failed to fetch lab analytics:", error);
      } finally {
        setAnalyticsLoading(false);
      }
    };

    fetchData();
  }, [labId]);

  const prepareAnalyticsData = () => {
    if (!labAnalytics || !labAnalytics.equipment) return null;

    const equipment = labAnalytics.equipment;

    const statusData = equipment.reduce((acc, eq) => {
      let status = eq.status?.status || "OFFLINE";
      // Normalize status: uppercase and replace underscores with spaces
      // This merges "IN_USE" and "IN USE" into a single slice, preventing duplicates
      status = status.toUpperCase().replace(/_/g, " ");
      
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    // Create the initial array
    let statusChartData = Object.entries(statusData).map(
      ([status, count]) => ({
        name: status,
        rawStatus: status, // normalized status
        value: count,
      })
    );

    // --- CUSTOM SORT ORDER ---
    const sortOrder = {
      "FAULTY": 1,
      "MAINTENANCE": 2,
      "OFFLINE": 3,
      "IN USE": 4,
      "OPERATIONAL": 5
    };

    statusChartData.sort((a, b) => {
      const orderA = sortOrder[a.rawStatus] || 99;
      const orderB = sortOrder[b.rawStatus] || 99;
      return orderA - orderB;
    });

    const healthScoreData = equipment.map((eq) => ({
      name: eq.name.substring(0, 15) + (eq.name.length > 15 ? "..." : ""),
      healthScore: eq.status?.healthScore || 0,
      efficiency: eq.analyticsParams?.efficiency || 0,
    }));

    const radarMetrics = [];
    const sampleEquipment = equipment.find((eq) => eq.analyticsParams);

    if (sampleEquipment?.analyticsParams) {
      const params = sampleEquipment.analyticsParams;
      if (params.temperature !== null)
        radarMetrics.push({ metric: "Temp", value: Math.min((params.temperature / 100) * 100, 100) });
      if (params.efficiency !== null)
        radarMetrics.push({ metric: "Eff.", value: params.efficiency });
      if (params.utilizationRate !== null)
        radarMetrics.push({ metric: "Util.", value: params.utilizationRate });
      if (params.vibration !== null)
        radarMetrics.push({ metric: "Vib.", value: Math.max(0, 100 - params.vibration * 10) });
      if (params.voltage !== null)
        radarMetrics.push({ metric: "Volt", value: Math.min((params.voltage / 240) * 100, 100) });
      if (params.powerFactor !== null)
        radarMetrics.push({ metric: "P.F.", value: params.powerFactor * 100 });
    }

    const uptimeDowntimeData = equipment
      .filter((eq) => eq.analyticsParams)
      .slice(0, 10)
      .map((eq) => ({
        name: eq.name.substring(0, 10),
        uptime: eq.analyticsParams.totalUptime || 0,
        downtime: eq.analyticsParams.totalDowntime || 0,
      }));

    return {
      statusChartData,
      healthScoreData,
      radarMetrics,
      uptimeDowntimeData,
    };
  };

  const analyticsData = labAnalytics ? prepareAnalyticsData() : null;
  const isoStandard = getISOStandard(labAnalytics?.lab?.department);

  if (labLoading || analyticsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-5 sticky top-0 z-10 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/dashboard")}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-gray-900"
            >
              <FaArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                {labSummary?.lab?.name || "Loading..."}
                {isoStandard && (
                   <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold tracking-wide">
                     <FaCertificate /> {isoStandard}
                   </span>
                )}
              </h1>
              <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                <FaBuilding className="w-3 h-3" />
                <span>{labAnalytics?.lab?.institute?.name}</span>
                <span className="text-gray-300">•</span>
                <span>{labAnalytics?.lab?.department}</span>
                {isoStandard && (
                   <span className="md:hidden inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold">
                     {isoStandard}
                   </span>
                )}
              </div>
            </div>
          </div>
          
          

[Image of ISO certified laboratory]

        </div>
      </div>

      <div className="flex-1 w-full p-6 space-y-6">
        
        {/* Simple Stats */}
        {labSummary && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-full mb-3">
                <FaBox className="w-5 h-5" />
              </div>
              <span className="text-2xl font-bold text-gray-900">
                {labSummary.statistics?.totalEquipment || 0}
              </span>
              <span className="text-xs text-gray-500 font-medium uppercase tracking-wide mt-1">Total Equipment</span>
            </div>

            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
              <div className="p-3 bg-green-50 text-green-600 rounded-full mb-3">
                <MdHealthAndSafety  className="w-5 h-5" />
              </div>
              <span className="text-2xl font-bold text-green-600">
                {labSummary.statistics?.avgHealthScore?.toFixed(0) || 0}%
              </span>
              <span className="text-xs text-gray-500 font-medium uppercase tracking-wide mt-1">Avg Health</span>
            </div>

            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-full mb-3">
                <BsGraphUpArrow  className="w-5 h-5" />
              </div>
              <span className="text-2xl font-bold text-gray-900">
                {labSummary.statistics?.totalUptime?.toFixed(0) || 0}<span className="text-sm text-gray-400 font-normal ml-0.5">h</span>
              </span>
              <span className="text-xs text-gray-500 font-medium uppercase tracking-wide mt-1">Total Uptime</span>
            </div>

            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
              <div className="p-3 bg-red-50 text-red-600 rounded-full mb-3">
                <BsGraphDownArrow  className="w-5 h-5" />
              </div>
              <span className="text-2xl font-bold text-gray-900">
                {labSummary.statistics?.totalDowntime?.toFixed(0) || 0}<span className="text-sm text-gray-400 font-normal ml-0.5">h</span>
              </span>
              <span className="text-xs text-gray-500 font-medium uppercase tracking-wide mt-1">Downtime</span>
            </div>

            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center col-span-2 md:col-span-1">
              <div className="p-3 bg-purple-50 text-purple-600 rounded-full mb-3">
                <FaClock className="w-5 h-5" />
              </div>
              <span className="text-2xl font-bold text-gray-900">
                {labSummary.statistics?.inClassEquipment || 0}
              </span>
              <span className="text-xs text-gray-500 font-medium uppercase tracking-wide mt-1">Active Now</span>
            </div>
          </div>
        )}

        {analyticsData && labAnalytics && (
          <>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                   <FaWrench className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Predictive Maintenance Forecast</h3>
                  <p className="text-sm text-gray-500">AI-driven maintenance scheduling based on live telemetry.</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {labAnalytics.equipment
                  .filter((eq) => eq.analyticsParams)
                  .sort((a, b) => {
                    const aPred = calculateNextMaintenance(a);
                    const bPred = calculateNextMaintenance(b);
                    const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, UNKNOWN: 4 };
                    return priorityOrder[aPred.priority] - priorityOrder[bPred.priority];
                  })
                  .slice(0, 6)
                  .map((eq) => (
                    <PredictiveMaintenanceCard key={eq.id} equipment={eq} />
                  ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* PIE CHART with reordered data */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <FaChartPie className="text-blue-500"/> Equipment Status
                </h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analyticsData.statusChartData}
                        cx="50%"
                        cy="45%" 
                        startAngle={90}
                        endAngle={-270}
                        outerRadius={80}
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        dataKey="value"
                      >
                        {analyticsData.statusChartData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            // Use normalized rawStatus for color lookup
                            fill={
                                STATUS_COLORS[entry.rawStatus] || 
                                FALLBACK_COLORS[index % FALLBACK_COLORS.length]
                            } 
                          />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Bar Chart */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 lg:col-span-2">
                <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <FaChartBar className="text-green-500"/> Health Score & Efficiency
                </h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analyticsData.healthScoreData.slice(0, 8)}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis
                        dataKey="name"
                        angle={-20}
                        textAnchor="end"
                        height={60}
                        tick={{ fontSize: 11, fill: '#6B7280' }}
                      />
                      <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} />
                      <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Legend verticalAlign="top" height={36} wrapperStyle={{ top: -10 }} />
                      <Bar dataKey="healthScore" fill="#10B981" name="Health Score" />
                      <Bar dataKey="efficiency" fill="#3B82F6" name="Efficiency %" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Area Chart */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 lg:col-span-2">
                <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <FaChartLine className="text-emerald-500"/> Uptime vs Downtime Analysis
                </h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analyticsData.uptimeDowntimeData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis
                        dataKey="name"
                        angle={-20}
                        textAnchor="end"
                        height={60}
                        tick={{ fontSize: 11, fill: '#6B7280' }}
                      />
                      <YAxis label={{ value: "Hours", angle: -90, position: "insideLeft", style: { fontSize: 10 } }} tick={{ fontSize: 11, fill: '#6B7280' }} />
                      <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Legend verticalAlign="top" height={36} wrapperStyle={{ top: -10 }} />
                      <Area type="monotone" dataKey="uptime" stackId="1" stroke="#10B981" fill="#10B981" name="Uptime (hrs)" />
                      <Area type="monotone" dataKey="downtime" stackId="1" stroke="#EF4444" fill="#EF4444" name="Downtime (hrs)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Radar Chart */}
              {analyticsData.radarMetrics.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <FaChartLine className="text-purple-500"/> Performance Radar
                  </h3>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={analyticsData.radarMetrics}>
                        <PolarGrid stroke="#e5e7eb" />
                        <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: '#4B5563' }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
                        <Radar name="Performance" dataKey="value" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.6} />
                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                        <Legend verticalAlign="bottom" height={36} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>

            {/* Equipment Details Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                <h3 className="font-bold text-gray-900">Equipment Detail View</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Equipment</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Health</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Efficiency</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Temp</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Uptime</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Maint. Due</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {labAnalytics.equipment.map((eq) => {
                      const prediction = calculateNextMaintenance(eq);
                      return (
                        <tr key={eq.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{eq.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2.5 py-1 inline-flex text-xs leading-4 font-semibold rounded-full ${
                                eq.status?.status === "OPERATIONAL" ? "bg-green-100 text-green-800" :
                                eq.status?.status === "IN_USE" ? "bg-blue-100 text-blue-800" :
                                eq.status?.status === "MAINTENANCE" ? "bg-yellow-100 text-yellow-800" :
                                eq.status?.status === "FAULTY" ? "bg-red-100 text-red-800" : "bg-gray-100 text-gray-800"
                              }`}>
                              {eq.status?.status || "OFFLINE"}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div className="flex items-center gap-2">
                              <span>{eq.status?.healthScore?.toFixed(0) || 0}%</span>
                              <div className="w-16 bg-gray-100 rounded-full h-1.5">
                                <div className={`h-full rounded-full ${
                                    (eq.status?.healthScore || 0) >= 80 ? "bg-green-500" :
                                    (eq.status?.healthScore || 0) >= 50 ? "bg-yellow-500" : "bg-red-500"
                                  }`} style={{ width: `${eq.status?.healthScore || 0}%` }} />
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{eq.analyticsParams?.efficiency?.toFixed(1) || "N/A"}%</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{eq.analyticsParams?.temperature?.toFixed(1) || "N/A"}°C</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{eq.analyticsParams?.totalUptime?.toFixed(1) || "N/A"}h</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {prediction.daysUntilMaintenance != null ? (
                              <div className="flex flex-col">
                                <span className={`text-xs font-bold ${prediction.daysUntilMaintenance < 7 ? 'text-red-600' : 'text-gray-700'}`}>
                                  {prediction.daysUntilMaintenance} Days
                                </span>
                                <span className="text-[10px] text-gray-400 uppercase">{prediction.priority} priority</span>
                              </div>
                            ) : (<span className="text-xs text-gray-400">No data</span>)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}