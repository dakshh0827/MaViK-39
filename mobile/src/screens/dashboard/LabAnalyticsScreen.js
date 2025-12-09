import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
  Alert,
  Platform,
} from "react-native";
import { Text, Card, Divider, Surface } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import io from "socket.io-client";
import { PieChart, BarChart } from "react-native-chart-kit";
import client from "../../api/client";
import { useAuthStore } from "../../context/useAuthStore";

const SCREEN_WIDTH = Dimensions.get("window").width;

// --- CONSTANTS ---
const STATUS_COLORS = {
  OPERATIONAL: "#10B981",
  "IN USE": "#3B82F6",
  IN_USE: "#3B82F6",
  "IN CLASS": "#8B5CF6",
  MAINTENANCE: "#F59E0B",
  FAULTY: "#EF4444",
  IDLE: "#6B7280",
  OFFLINE: "#9CA3AF",
  WARNING: "#F97316",
};

const CHART_CONFIG = {
  backgroundGradientFrom: "#ffffff",
  backgroundGradientTo: "#ffffff",
  color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
  strokeWidth: 2,
  barPercentage: 0.6,
  decimalPlaces: 0,
};

// --- HELPERS ---
const formatTimestamp = (isoString) => {
  if (!isoString) return "N/A";
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "Invalid";
  return date.toLocaleTimeString("en-US", {
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
  if (dept.includes("electric")) return "IEC/ISO";
  if (dept.includes("weld")) return "ISO 3834";
  if (dept.includes("material")) return "ISO 17025";
  if (dept.includes("auto")) return "ISO 16750";
  return null;
};

export default function LabAnalyticsScreen({ route, navigation }) {
  const { labId } = route.params;
  const { token } = useAuthStore();

  const [labData, setLabData] = useState(null);
  const [predictiveData, setPredictiveData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [liveUpdates, setLiveUpdates] = useState({});
  const [isSocketConnected, setIsSocketConnected] = useState(false);

  // --- SOCKET CONNECTION ---
  useEffect(() => {
    if (!token) return;

    const baseUrl =
      client.defaults.baseURL?.replace("/api", "") || "http://192.168.1.5:5000";

    const socketInstance = io(baseUrl, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
    });

    socketInstance.on("connect", () => setIsSocketConnected(true));
    socketInstance.on("disconnect", () => setIsSocketConnected(false));

    socketInstance.on("equipment:status", (data) =>
      handleEquipmentUpdate(data)
    );
    socketInstance.on("equipment:status:update", (data) =>
      handleEquipmentUpdate(data.status || data)
    );

    return () => {
      socketInstance.disconnect();
    };
  }, [token]);

  // --- LIVE UPDATE LOGIC ---
  const handleEquipmentUpdate = (data) => {
    const equipmentId = data.equipmentId || data.id;
    if (!equipmentId) return;

    setLiveUpdates((prev) => ({
      ...prev,
      [equipmentId]: {
        temperature: data.temperature,
        vibration: data.vibration,
        healthScore: data.healthScore,
        efficiency: data.efficiency,
        status: data.status,
        energyConsumption: data.energyConsumption,
        timestamp: data.readingTimestamp || new Date().toISOString(),
        updatedAt: new Date(),
      },
    }));

    setLabData((prevLabData) => {
      if (!prevLabData || !prevLabData.equipment) return prevLabData;

      let updatedEquipmentList = prevLabData.equipment.map((eq) => {
        if (eq.id === equipmentId) {
          return {
            ...eq,
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

      const totalEq = updatedEquipmentList.length;
      const avgHealth =
        updatedEquipmentList.reduce(
          (sum, eq) => sum + (eq.status?.healthScore || 0),
          0
        ) / (totalEq || 1);

      return {
        ...prevLabData,
        equipment: updatedEquipmentList,
        statistics: {
          ...prevLabData.statistics,
          avgHealthScore: avgHealth,
        },
      };
    });
  };

  // --- INITIAL DATA FETCH ---
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const analyticsResponse = await client.get(
          `/monitoring/lab-analytics/${labId}`
        );
        setLabData(analyticsResponse.data.data);

        try {
          const predictiveResponse = await client.get(
            `/analytics/predictive/${labId}`
          );
          setPredictiveData(predictiveResponse.data.data || []);
        } catch (e) {
          console.log("Predictive fetch warning:", e);
        }
      } catch (err) {
        Alert.alert("Error", "Failed to load lab analytics");
        navigation.goBack();
      } finally {
        setIsLoading(false);
      }
    };
    if (labId) fetchData();
  }, [labId]);

  // --- MEMOIZED CHART DATA ---
  const chartData = useMemo(() => {
    if (!labData?.equipment) return null;

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

    const statusCounts = {};
    equipment.forEach((eq) => {
      let s = (eq.status?.status || "OFFLINE").toUpperCase().replace(/ /g, "_");
      statusCounts[s] = (statusCounts[s] || 0) + 1;
    });

    const pieData = Object.keys(statusCounts).map((key) => ({
      name: key.replace(/_/g, " "),
      count: statusCounts[key],
      color: STATUS_COLORS[key] || "#999",
      legendFontColor: "#7F7F7F",
      legendFontSize: 10,
    }));

    // For graphs: take top items but ensure we map efficiently
    const healthLabels = equipment.map((eq) => eq.name.substring(0, 4) + "..");
    const healthValues = equipment.map((eq) => eq.status?.healthScore || 0);

    const tempValues = equipment.map(
      (eq) => eq.analyticsParams?.temperature || 0
    );
    const vibValues = equipment.map((eq) => eq.analyticsParams?.vibration || 0);
    const energyValues = equipment.map(
      (eq) => eq.analyticsParams?.energyConsumption || 0
    );

    return {
      pieData,
      healthLabels,
      healthValues,
      tempValues,
      vibValues,
      energyValues,
    };
  }, [labData, liveUpdates]);

  const avgAiConfidence = useMemo(() => {
    if (!predictiveData || predictiveData.length === 0) return 0;
    const total = predictiveData.reduce(
      (sum, item) => sum + (item.prediction?.probability || 0),
      0
    );
    const avg = total / predictiveData.length;
    return (avg <= 1 ? avg * 100 : avg).toFixed(1);
  }, [predictiveData]);

  if (isLoading)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  if (!labData) return null;

  const isoStandard = getISOStandard(labData.lab?.department);

  return (
    <View style={styles.container}>
      <Surface style={styles.header} elevation={2}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={24}
              color="#111827"
            />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <Text style={styles.headerTitle} numberOfLines={1}>
                {labData.lab?.name}
              </Text>
              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor: isSocketConnected ? "#DCFCE7" : "#F3F4F6",
                    borderColor: isSocketConnected ? "#bbf7d0" : "#e5e7eb",
                  },
                ]}
              >
                <View
                  style={[
                    styles.dot,
                    {
                      backgroundColor: isSocketConnected
                        ? "#10B981"
                        : "#9CA3AF",
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.badgeText,
                    { color: isSocketConnected ? "#15803d" : "#4b5563" },
                  ]}
                >
                  {isSocketConnected ? "Live" : "Connecting"}
                </Text>
              </View>
            </View>
            <View style={styles.headerSub}>
              <MaterialCommunityIcons
                name="office-building"
                size={12}
                color="#6B7280"
              />
              <Text style={styles.subText}>{labData.lab?.institute?.name}</Text>
              {isoStandard && (
                <>
                  <Text style={styles.dotSeparator}>•</Text>
                  <MaterialCommunityIcons
                    name="certificate"
                    size={12}
                    color="#2563EB"
                  />
                  <Text style={[styles.subText, { color: "#2563EB" }]}>
                    {isoStandard}
                  </Text>
                </>
              )}
            </View>
          </View>
        </View>
      </Surface>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* STATS GRID */}
        <View style={styles.statsGrid}>
          <StatCard
            icon="package-variant"
            title="Total Eq."
            value={labData.statistics?.totalEquipment || 0}
          />
          <StatCard
            icon="shield-check"
            title="Avg Health"
            value={`${(labData.statistics?.avgHealthScore || 0).toFixed(0)}%`}
            color="#10B981"
            bg="#ECFDF5"
          />
          <StatCard
            icon="trending-up"
            title="Uptime"
            value={`${(labData.statistics?.totalUptime || 0).toFixed(0)}h`}
          />
          <StatCard
            icon="trending-down"
            title="Downtime"
            value={`${(labData.statistics?.totalDowntime || 0).toFixed(0)}h`}
          />
        </View>

        {/* PREDICTIVE MAINTENANCE */}
        {predictiveData && predictiveData.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.iconBox, { backgroundColor: "#F3E8FF" }]}>
                <MaterialCommunityIcons
                  name="wrench-clock"
                  size={20}
                  color="#9333EA"
                />
              </View>
              <View>
                <Text style={styles.sectionTitle}>AI Predictive Forecast</Text>
                <Text style={styles.sectionSubtitle}>
                  Real-time failure probability
                </Text>
              </View>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingRight: 16 }}
            >
              {predictiveData.map((item, index) => (
                <PredictiveCard
                  key={index}
                  item={item}
                  equipment={labData.equipment.find((e) => e.id === item.id)}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* CHARTS SECTION */}
        <View style={styles.section}>
          <View style={styles.chartHeader}>
            <MaterialCommunityIcons
              name="chart-pie"
              size={20}
              color="#3B82F6"
            />
            <Text style={styles.chartTitle}>Status Distribution</Text>
          </View>
          <PieChart
            data={chartData.pieData}
            width={SCREEN_WIDTH - 40}
            height={220}
            chartConfig={CHART_CONFIG}
            accessor={"count"}
            backgroundColor={"transparent"}
            paddingLeft={"15"}
            absolute
          />
        </View>

        {/* UPDATED HEALTH GRAPH: SCROLLABLE */}
        <View style={styles.section}>
          <View style={styles.chartHeader}>
            <MaterialCommunityIcons
              name="chart-bar"
              size={20}
              color="#10B981"
            />
            <Text style={styles.chartTitle}>Health Score (Real-time)</Text>
          </View>
          {chartData.healthValues.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <BarChart
                data={{
                  labels: chartData.healthLabels,
                  datasets: [{ data: chartData.healthValues }],
                }}
                // Dynamic width: Minimum screen width, or grow based on item count
                width={Math.max(
                  SCREEN_WIDTH - 40,
                  chartData.healthValues.length * 55
                )}
                height={220}
                yAxisSuffix="%"
                chartConfig={{
                  ...CHART_CONFIG,
                  fillShadowGradient: "#10B981",
                  fillShadowGradientOpacity: 1,
                  color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
                }}
                style={{ borderRadius: 12, marginVertical: 8 }}
              />
            </ScrollView>
          ) : (
            <Text style={styles.noDataText}>No data available</Text>
          )}
        </View>

        {/* SENSOR CHARTS ROW */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 16, paddingLeft: 12 }}
        >
          <MiniChart
            title="Temperature"
            color="#F59E0B"
            data={chartData.tempValues}
            suffix="°C"
            labels={chartData.healthLabels}
          />
          <MiniChart
            title="Vibration"
            color="#8B5CF6"
            data={chartData.vibValues}
            suffix=""
            labels={chartData.healthLabels}
          />
          <MiniChart
            title="Energy"
            color="#10B981"
            data={chartData.energyValues}
            suffix="W"
            labels={chartData.healthLabels}
          />
        </ScrollView>

        {/* UPDATED: CARD LIST VIEW (Replaces Table) */}
        <View style={{ marginBottom: 30 }}>
          <View
            style={[
              styles.sectionHeader,
              { paddingHorizontal: 12, marginBottom: 10 },
            ]}
          >
            <Text style={styles.sectionTitle}>Equipment Metrics</Text>
            {Object.keys(liveUpdates).length > 0 && (
              <View style={styles.liveTag}>
                <View style={[styles.dot, { backgroundColor: "#22c55e" }]} />
                <Text style={styles.liveTagText}>
                  {Object.keys(liveUpdates).length} active
                </Text>
              </View>
            )}
          </View>

          {labData.equipment.map((eq) => {
            const live = liveUpdates[eq.id];
            const isFresh = live && new Date() - live.updatedAt < 5000;
            const status = live?.status || eq.status?.status || "OFFLINE";
            const health = live?.healthScore ?? eq.status?.healthScore ?? 0;
            const eff = live?.efficiency ?? eq.analyticsParams?.efficiency ?? 0;
            const temp = live?.temperature ?? eq.analyticsParams?.temperature;
            const vib = live?.vibration ?? eq.analyticsParams?.vibration;
            const energy =
              live?.energyConsumption ?? eq.analyticsParams?.energyConsumption;
            const time = live?.timestamp || eq.status?.lastUsedAt;

            return (
              <Card
                key={eq.id}
                style={[
                  styles.detailCard,
                  isFresh && { borderColor: "#86efac", borderWidth: 1.5 }, // Highlight if fresh
                ]}
              >
                <View style={styles.detailHeader}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      flex: 1,
                    }}
                  >
                    <View
                      style={[
                        styles.statusIndicator,
                        { backgroundColor: STATUS_COLORS[status] || "#999" },
                      ]}
                    />
                    <Text style={styles.detailName}>{eq.name}</Text>
                    {isFresh && (
                      <MaterialCommunityIcons
                        name="flash"
                        size={14}
                        color="#16a34a"
                      />
                    )}
                  </View>
                  <View
                    style={[
                      styles.statusPill,
                      { backgroundColor: STATUS_COLORS[status] || "#999" },
                    ]}
                  >
                    <Text style={styles.statusText}>{status}</Text>
                  </View>
                </View>

                <Divider style={{ marginVertical: 8 }} />

                {/* Grid Layout for Metrics */}
                <View style={styles.detailGrid}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>HEALTH</Text>
                    <Text
                      style={[styles.detailValueLarge, { color: "#10B981" }]}
                    >
                      {health.toFixed(0)}%
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>EFFICIENCY</Text>
                    <Text
                      style={[styles.detailValueLarge, { color: "#3B82F6" }]}
                    >
                      {eff.toFixed(0)}%
                    </Text>
                  </View>
                </View>

                <View style={[styles.detailGrid, { marginTop: 8 }]}>
                  <View style={styles.detailItemRow}>
                    <MaterialCommunityIcons
                      name="thermometer"
                      size={14}
                      color="#F59E0B"
                    />
                    <Text style={styles.detailValueSmall}>
                      {temp ? `${temp.toFixed(1)}°C` : "-"}
                    </Text>
                  </View>
                  <View style={styles.detailItemRow}>
                    <MaterialCommunityIcons
                      name="waveform"
                      size={14}
                      color="#8B5CF6"
                    />
                    <Text style={styles.detailValueSmall}>
                      {vib ? `${vib.toFixed(2)}` : "-"}
                    </Text>
                  </View>
                  <View style={styles.detailItemRow}>
                    <MaterialCommunityIcons
                      name="lightning-bolt"
                      size={14}
                      color="#10B981"
                    />
                    <Text style={styles.detailValueSmall}>
                      {energy ? `${energy.toFixed(0)}W` : "-"}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailFooter}>
                  <Text style={styles.detailTime}>
                    Last updated: {formatTimestamp(time)}
                  </Text>
                </View>
              </Card>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

// ==========================================
// SUB COMPONENTS
// ==========================================

const StatCard = ({ icon, title, value, color = "#111827", bg = "white" }) => (
  <Card
    style={[
      styles.statCard,
      { backgroundColor: bg === "white" ? "white" : bg },
    ]}
  >
    <View style={{ alignItems: "center", gap: 4 }}>
      <View style={[styles.statIconCircle, { backgroundColor: color + "15" }]}>
        <MaterialCommunityIcons name={icon} size={18} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  </Card>
);

const PredictiveCard = ({ item, equipment }) => {
  let rawProb = item.prediction?.probability || 0;
  const probability = rawProb <= 1 ? rawProb * 100 : rawProb;
  const daysUntil = item.prediction?.daysUntilMaintenance || 0;
  const needsMaintenance = item.prediction?.prediction === 1;

  let priority = "LOW";
  let colors = { text: "#15803d", bg: "#dcfce7", border: "#bbf7d0" };

  if (needsMaintenance || probability > 70) {
    priority = "CRITICAL";
    colors = { text: "#b91c1c", bg: "#fef2f2", border: "#fecaca" };
  } else if (probability > 50 || daysUntil < 15) {
    priority = "HIGH";
    colors = { text: "#c2410c", bg: "#fff7ed", border: "#fed7aa" };
  } else if (probability > 30 || daysUntil < 30) {
    priority = "MEDIUM";
    colors = { text: "#a16207", bg: "#fefce8", border: "#fef08a" };
  }

  return (
    <View
      style={[
        styles.predCard,
        { backgroundColor: colors.bg, borderColor: colors.border },
      ]}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginBottom: 6,
        }}
      >
        <Text style={[styles.predTitle, { flex: 1 }]} numberOfLines={1}>
          {equipment?.name || "Unknown"}
        </Text>
        <View
          style={[
            styles.predBadge,
            { borderColor: colors.border, backgroundColor: "white" },
          ]}
        >
          <Text style={[styles.predBadgeText, { color: colors.text }]}>
            {priority}
          </Text>
        </View>
      </View>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          marginBottom: 8,
        }}
      >
        <View
          style={{
            backgroundColor: "white",
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: 4,
          }}
        >
          <Text style={[styles.predConf, { color: colors.text }]}>
            Conf: {probability.toFixed(1)}%
          </Text>
        </View>
      </View>
      <Divider
        style={{ backgroundColor: "rgba(0,0,0,0.05)", marginVertical: 6 }}
      />
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <MaterialCommunityIcons
          name="alert-circle-outline"
          size={14}
          color="#6B7280"
        />
        <Text style={styles.predMsg}>
          {needsMaintenance
            ? `Maint. in ${daysUntil} days`
            : `Next in ~${daysUntil} days`}
        </Text>
      </View>
    </View>
  );
};

const MiniChart = ({ title, color, data, suffix, labels }) => (
  <View style={styles.miniChartCard}>
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginBottom: 8,
      }}
    >
      <MaterialCommunityIcons name="pulse" size={16} color={color} />
      <Text style={styles.miniChartTitle}>{title}</Text>
    </View>
    {data.length > 0 ? (
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <BarChart
          data={{
            labels: labels,
            datasets: [{ data: data }],
          }}
          width={Math.max(200, data.length * 40)}
          height={120}
          yAxisSuffix={suffix}
          chartConfig={{
            ...CHART_CONFIG,
            backgroundGradientFrom: "#fff",
            backgroundGradientTo: "#fff",
            fillShadowGradient: color,
            fillShadowGradientOpacity: 1,
            color: (opacity = 1) => color,
            strokeWidth: 0,
            barPercentage: 0.6,
          }}
          withInnerLines={false}
          fromZero
        />
      </ScrollView>
    ) : (
      <Text style={styles.noDataText}>No data</Text>
    )}
  </View>
);

// ==========================================
// STYLES
// ==========================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#E5E7EB" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  scrollContent: { padding: 12, paddingBottom: 40 },

  // Header
  header: {
    backgroundColor: "white",
    paddingTop: Platform.OS === "ios" ? 50 : 40,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerTop: { flexDirection: "row", alignItems: "center" },
  backButton: { marginRight: 12, padding: 4 },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#111827",
    maxWidth: 220,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    marginLeft: 8,
  },
  dot: { width: 6, height: 6, borderRadius: 4, marginRight: 4 },
  badgeText: { fontSize: 10, fontWeight: "bold" },
  headerSub: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    marginLeft: 44,
  },
  subText: { fontSize: 12, color: "#6B7280", marginLeft: 4 },
  dotSeparator: { marginHorizontal: 6, color: "#D1D5DB" },

  // Stats Grid
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  statCard: {
    width: (SCREEN_WIDTH - 32 - 8) / 2,
    padding: 12,
    borderRadius: 12,
    elevation: 1,
  },
  statIconCircle: { padding: 8, borderRadius: 20 },
  statValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#111827",
    marginTop: 4,
  },
  statTitle: {
    fontSize: 10,
    color: "#6B7280",
    textTransform: "uppercase",
    fontWeight: "600",
  },

  // Sections
  section: {
    backgroundColor: "white",
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  iconBox: { padding: 6, borderRadius: 8, marginRight: 10 },
  sectionTitle: { fontSize: 16, fontWeight: "bold", color: "#111827" },
  sectionSubtitle: { fontSize: 12, color: "#6B7280" },

  // Predictive Card
  predCard: {
    width: 200,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 12,
    justifyContent: "space-between",
  },
  predTitle: { fontSize: 13, fontWeight: "600", color: "#111827" },
  predBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  predBadgeText: { fontSize: 9, fontWeight: "bold" },
  predConf: { fontSize: 10, fontWeight: "bold" },
  predMsg: { fontSize: 11, color: "#4B5563" },

  // Charts
  chartHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  chartTitle: { fontSize: 14, fontWeight: "bold", color: "#374151" },
  miniChartCard: {
    backgroundColor: "white",
    padding: 12,
    borderRadius: 12,
    marginRight: 12,
    width: 220,
    elevation: 1,
  },
  miniChartTitle: { fontSize: 13, fontWeight: "bold", color: "#374151" },
  noDataText: {
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 20,
  },

  // Detail Cards (Replacement for Table)
  liveTag: {
    marginLeft: "auto",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  liveTagText: { fontSize: 10, fontWeight: "bold", color: "#15803d" },

  detailCard: {
    backgroundColor: "white",
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    elevation: 1,
  },
  detailHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusIndicator: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  detailName: { fontSize: 14, fontWeight: "bold", color: "#111827" },
  statusPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  statusText: { color: "white", fontSize: 10, fontWeight: "bold" },

  detailGrid: { flexDirection: "row", justifyContent: "space-between" },
  detailItem: { flex: 1, alignItems: "center" },
  detailLabel: {
    fontSize: 10,
    color: "#6B7280",
    fontWeight: "bold",
    marginBottom: 2,
  },
  detailValueLarge: { fontSize: 18, fontWeight: "bold" },

  detailItemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flex: 1,
    justifyContent: "center",
  },
  detailValueSmall: { fontSize: 12, fontWeight: "600", color: "#374151" },

  detailFooter: {
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F9FAFB",
  },
  detailTime: {
    fontSize: 10,
    color: "#9CA3AF",
    textAlign: "right",
    fontStyle: "italic",
  },
});
