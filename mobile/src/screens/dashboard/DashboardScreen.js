import React, { useEffect, useState, useCallback } from "react";
import {
  ScrollView,
  View,
  StyleSheet,
  RefreshControl,
  Alert,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import {
  Text,
  ActivityIndicator,
  FAB,
  Portal,
  Dialog,
  TextInput,
  Button,
  Searchbar,
  Card,
  Menu,
  Divider,
} from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuthStore } from "../../context/useAuthStore";
import client from "../../api/client";
import { format } from "date-fns";

export default function DashboardScreen({ navigation }) {
  const { user } = useAuthStore();

  // --- UI State ---
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Dropdown Visibility States
  const [labMenuVisible, setLabMenuVisible] = useState(false);
  const [statusMenuVisible, setStatusMenuVisible] = useState(false);

  // Filter States
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedLabId, setSelectedLabId] = useState("all");

  // --- Data State ---
  const [overview, setOverview] = useState(null);
  const [breakdowns, setBreakdowns] = useState([]);
  const [labs, setLabs] = useState([]);
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [equipmentList, setEquipmentList] = useState([]);

  // --- Reorder Dialog State ---
  const [reorderVisible, setReorderVisible] = useState(false);
  const [selectedBreakdown, setSelectedBreakdown] = useState(null);
  const [reorderReason, setReorderReason] = useState("");

  // --- DATA FETCHING ---
  const loadDashboardData = useCallback(async () => {
    // Only show full loading spinner on initial load, not on filter change to keep UI responsive
    if (!overview) setLoading(true);

    try {
      const params = selectedLabId !== "all" ? { labId: selectedLabId } : {};

      const [labsRes, statsRes, eqRes, bdRes, activeAlertRes] =
        await Promise.all([
          client.get("/labs"),
          client.get("/analytics/overview", { params }),
          client.get("/equipment", { params }),
          client.get("/breakdown"),
          client.get("/alerts", { params: { isResolved: false } }),
        ]);

      setLabs(labsRes.data.data || []);
      setOverview(statsRes.data.data?.overview || statsRes.data?.overview);
      setEquipmentList(eqRes.data.data || []);
      setBreakdowns(bdRes.data.data || []);
      setActiveAlerts(activeAlertRes.data.data || activeAlertRes.data || []);
    } catch (error) {
      console.error("Dashboard Load Error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedLabId]); // Dependency on selectedLabId ensures refetch when lab changes

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  // --- CLIENT-SIDE FILTERING ---
  const getFilteredEquipment = () => {
    let filtered = equipmentList;

    if (selectedStatus !== "all") {
      filtered = filtered.filter((eq) => eq.status?.status === selectedStatus);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (eq) =>
          eq.name.toLowerCase().includes(query) ||
          eq.equipmentId.toLowerCase().includes(query) ||
          (eq.manufacturer && eq.manufacturer.toLowerCase().includes(query)) ||
          (eq.model && eq.model.toLowerCase().includes(query))
      );
    }

    return filtered;
  };

  const filteredList = getFilteredEquipment();

  // --- ACTIONS ---
  const handleResolveAlert = async (id) => {
    try {
      await client.patch(`/alerts/${id}/resolve`);
      loadDashboardData();
    } catch (err) {
      Alert.alert("Error", "Failed to resolve alert");
    }
  };

  const handleResolveBreakdown = (id) => {
    Alert.alert("Confirm Resolve", "Is this equipment fixed?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Yes, Resolved",
        onPress: async () => {
          try {
            await client.patch(`/breakdown/${id}/resolve`);
            loadDashboardData();
          } catch (err) {
            Alert.alert("Error", "Failed to resolve.");
          }
        },
      },
    ]);
  };

  const submitReorder = async () => {
    try {
      await client.post("/breakdown/reorder", {
        breakdownId: selectedBreakdown.id,
        reason: reorderReason,
        quantity: 1,
      });
      setReorderVisible(false);
      Alert.alert("Success", "Reorder request submitted.");
      loadDashboardData();
    } catch (err) {
      Alert.alert("Error", "Failed to submit request.");
    }
  };

  const safeFormat = (dateString, formatString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Invalid Date";
    try {
      return format(date, formatString);
    } catch (error) {
      return "Error";
    }
  };

  if (loading && !overview)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );

  return (
    <View style={{ flex: 1, backgroundColor: "#E5E7EB" }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* --- STATS GRID --- */}
        <View style={styles.statsGrid}>
          <StatCard
            title="Total Equipment"
            value={overview?.totalEquipment || 0}
            icon="chart-line"
            color="#2563EB"
            bg="#EFF6FF"
          />
          <StatCard
            title="Active Equipment"
            value={overview?.activeEquipment || 0}
            icon="arrow-up-circle"
            color="#059669"
            bg="#ECFDF5"
          />
          <StatCard
            title="Unresolved Alerts"
            value={overview?.unresolvedAlerts || 0}
            icon="alert-circle"
            color="#DC2626"
            bg="#FEF2F2"
          />
          <StatCard
            title="Maintenance Due"
            value={overview?.maintenanceDue || 0}
            icon="wrench-clock"
            color="#EA580C"
            bg="#FFF7ED"
          />
        </View>

        {/* --- ALERTS SECTION --- */}
        <View style={styles.alertsSection}>
          <View style={styles.alertsHeader}>
            <View style={styles.alertsHeaderLeft}>
              <View style={styles.alertIconBox}>
                <MaterialCommunityIcons
                  name="alert-circle"
                  size={20}
                  color="#DC2626"
                />
                {activeAlerts.length > 0 && <View style={styles.alertBadge} />}
              </View>
              <Text style={styles.alertsTitle}>Active Alerts</Text>
            </View>
          </View>

          <View style={styles.alertsList}>
            {activeAlerts.length === 0 ? (
              <View style={styles.emptyAlerts}>
                <MaterialCommunityIcons
                  name="check-circle"
                  size={32}
                  color="#E5E7EB"
                />
                <Text style={styles.emptyText}>No active alerts</Text>
              </View>
            ) : (
              activeAlerts.map((alert) => {
                const getBgColor = () => {
                  if (alert.priority === "CRITICAL") return "#FEF2F2";
                  if (alert.priority === "HIGH") return "#FFF7ED";
                  return "#F0FDF4";
                };

                return (
                  <Card
                    key={alert.id}
                    style={[
                      styles.alertCard,
                      { backgroundColor: getBgColor() },
                    ]}
                  >
                    <Card.Content style={styles.alertContent}>
                      <View
                        style={[
                          styles.alertDot,
                          {
                            backgroundColor:
                              alert.priority === "CRITICAL"
                                ? "#EF4444"
                                : alert.priority === "HIGH"
                                ? "#FB923D"
                                : "#10B981",
                          },
                        ]}
                      />
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text
                          style={styles.alertEquipment}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {alert.equipment?.name || "Unknown Equipment"}
                        </Text>
                        <View style={styles.alertMeta}>
                          <MaterialCommunityIcons
                            name="flask"
                            size={12}
                            color="#6B7280"
                          />
                          <Text
                            style={styles.alertLabName}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                          >
                            {alert.lab?.name || "Unknown Lab"}
                          </Text>
                          <View style={styles.alertTypeBadge}>
                            <Text style={styles.alertTypeText}>
                              {alert.type?.replace(/_/g, " ") || "ALERT"}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.alertMessageBox}>
                          <Text style={styles.alertMessage}>
                            {alert.message}
                          </Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        style={styles.resolveButton}
                        onPress={() => handleResolveAlert(alert.id)}
                      >
                        <MaterialCommunityIcons
                          name="check-circle"
                          size={20}
                          color="#10B981"
                        />
                      </TouchableOpacity>
                    </Card.Content>
                  </Card>
                );
              })
            )}
          </View>
        </View>

        {/* --- BREAKDOWNS SECTION --- */}
        <View style={styles.breakdownsSection}>
          <View style={styles.breakdownsHeader}>
            <View style={styles.breakdownsHeaderLeft}>
              <View style={styles.breakdownIconBox}>
                <MaterialCommunityIcons
                  name="wrench"
                  size={20}
                  color="#DC2626"
                />
              </View>
              <Text style={styles.breakdownsTitle}>Breakdowns</Text>
            </View>
            <TouchableOpacity
              style={styles.reportButton}
              onPress={() => navigation.navigate("ReportBreakdown")}
            >
              <Text style={styles.reportButtonText}>REPORT ISSUE</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.breakdownsList}>
            {breakdowns.length === 0 ? (
              <View style={styles.emptyBreakdowns}>
                <MaterialCommunityIcons
                  name="check-circle"
                  size={40}
                  color="#E5E7EB"
                />
                <Text style={styles.emptyText}>No breakdowns reported.</Text>
              </View>
            ) : (
              breakdowns.map((bd) => (
                <Card key={bd.id} style={styles.breakdownCard}>
                  <Card.Content style={styles.breakdownContent}>
                    <View style={{ flex: 1 }}>
                      <View style={styles.breakdownHeader}>
                        <Text
                          style={styles.breakdownEquipment}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {bd.equipment?.name || "Unknown Equipment"}
                        </Text>
                        <View style={styles.breakdownStatusBadge}>
                          <Text style={styles.breakdownStatusText}>
                            {bd.isResolved ? "RESOLVED" : "REPORTED"}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.breakdownMeta}>
                        <MaterialCommunityIcons
                          name="flask"
                          size={12}
                          color="#6B7280"
                        />
                        <Text
                          style={styles.breakdownLabName}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {bd.equipment?.lab?.name || "Unknown Lab"}
                        </Text>
                        <MaterialCommunityIcons
                          name="clock-outline"
                          size={12}
                          color="#6B7280"
                          style={{ marginLeft: 8 }}
                        />
                        <Text style={styles.breakdownDate}>
                          {safeFormat(bd.createdAt, "MMM dd, HH:mm")}
                        </Text>
                      </View>
                      <View style={styles.breakdownReasonBox}>
                        <Text style={styles.breakdownReason}>{bd.reason}</Text>
                      </View>
                      {bd.reorderRequested && (
                        <View style={styles.reorderInfo}>
                          <MaterialCommunityIcons
                            name="package-variant"
                            size={14}
                            color="#2563EB"
                          />
                          <Text style={styles.reorderText}>
                            Reorder Requested
                          </Text>
                          {bd.reorderApproved && (
                            <MaterialCommunityIcons
                              name="check-circle"
                              size={14}
                              color="#10B981"
                              style={{ marginLeft: 4 }}
                            />
                          )}
                        </View>
                      )}
                      {!bd.isResolved && (
                        <View style={styles.breakdownActions}>
                          {!bd.reorderRequested && (
                            <TouchableOpacity
                              style={styles.reorderButton}
                              onPress={() => {
                                setSelectedBreakdown(bd);
                                setReorderReason(
                                  `Parts for ${bd.equipment?.name}`
                                );
                                setReorderVisible(true);
                              }}
                            >
                              <MaterialCommunityIcons
                                name="package-variant"
                                size={14}
                                color="#2563EB"
                              />
                              <Text style={styles.reorderButtonText}>
                                Reorder
                              </Text>
                            </TouchableOpacity>
                          )}
                          <TouchableOpacity
                            style={styles.resolveBreakdownButton}
                            onPress={() => handleResolveBreakdown(bd.id)}
                          >
                            <MaterialCommunityIcons
                              name="check-circle"
                              size={14}
                              color="#10B981"
                            />
                            <Text style={styles.resolveBreakdownButtonText}>
                              Resolve
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  </Card.Content>
                </Card>
              ))
            )}
          </View>
        </View>

        {/* --- LAB FILTERS SECTION (Dropdown) --- */}
        <View style={styles.labSection}>
          <View style={styles.labHeader}>
            <View style={styles.labHeaderLeft}>
              <MaterialCommunityIcons name="flask" size={20} color="#2563EB" />
              <Text style={styles.labTitle}>Lab Overview</Text>
            </View>

            <TouchableOpacity
              style={styles.viewAllButton}
              onPress={() => navigation.navigate("EquipmentListScreen")}
            >
              <Text style={styles.viewAllText}>View All</Text>
              <MaterialCommunityIcons
                name="arrow-right"
                size={16}
                color="#2563EB"
              />
            </TouchableOpacity>
          </View>

          {/* New Dropdown Filter for Labs */}
          <Menu
            visible={labMenuVisible}
            onDismiss={() => setLabMenuVisible(false)}
            anchor={
              <TouchableOpacity
                style={styles.dropdownTrigger}
                onPress={() => setLabMenuVisible(true)}
              >
                <Text
                  style={styles.dropdownText}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {selectedLabId === "all"
                    ? "All Labs"
                    : labs.find((l) => l.labId === selectedLabId)?.name ||
                      "Select Lab"}
                </Text>
                <MaterialCommunityIcons
                  name="chevron-down"
                  size={20}
                  color="#6B7280"
                />
              </TouchableOpacity>
            }
            contentStyle={{
              backgroundColor: "white",
              width: Dimensions.get("window").width - 48,
            }}
          >
            <Menu.Item
              onPress={() => {
                setSelectedLabId("all");
                setLabMenuVisible(false);
              }}
              title="All Labs"
              titleStyle={
                selectedLabId === "all"
                  ? { color: "#2563EB", fontWeight: "bold" }
                  : {}
              }
            />
            <Divider />
            {labs.map((lab) => (
              <Menu.Item
                key={lab.id}
                onPress={() => {
                  setSelectedLabId(lab.labId);
                  setLabMenuVisible(false);
                }}
                title={lab.name}
                titleStyle={
                  selectedLabId === lab.labId
                    ? { color: "#2563EB", fontWeight: "bold" }
                    : {}
                }
              />
            ))}
          </Menu>
        </View>

        {/* --- EQUIPMENT MANAGEMENT (Dropdown Filter) --- */}
        <View style={styles.equipmentSection}>
          <View style={styles.searchRow}>
            <Searchbar
              placeholder="Search items..."
              onChangeText={setSearchQuery}
              value={searchQuery}
              style={styles.searchBar}
              inputStyle={{ fontSize: 13 }}
              iconColor="#9CA3AF"
            />
          </View>

          {/* Status Dropdown */}
          <View style={{ marginBottom: 12 }}>
            <Menu
              visible={statusMenuVisible}
              onDismiss={() => setStatusMenuVisible(false)}
              anchor={
                <TouchableOpacity
                  style={styles.dropdownTrigger}
                  onPress={() => setStatusMenuVisible(true)}
                >
                  <Text style={styles.dropdownText}>
                    {selectedStatus === "all"
                      ? "All Statuses"
                      : selectedStatus.replace("_", " ")}
                  </Text>
                  <MaterialCommunityIcons
                    name="filter-variant"
                    size={20}
                    color="#6B7280"
                  />
                </TouchableOpacity>
              }
              contentStyle={{ backgroundColor: "white" }}
            >
              <Menu.Item
                onPress={() => {
                  setSelectedStatus("all");
                  setStatusMenuVisible(false);
                }}
                title="All Statuses"
              />
              <Divider />
              {[
                "OPERATIONAL",
                "IN_USE",
                "MAINTENANCE",
                "FAULTY",
                "OFFLINE",
              ].map((status) => (
                <Menu.Item
                  key={status}
                  onPress={() => {
                    setSelectedStatus(status);
                    setStatusMenuVisible(false);
                  }}
                  title={status.replace("_", " ")}
                />
              ))}
            </Menu>
          </View>

          {filteredList.length === 0 ? (
            <View style={styles.emptyEquipment}>
              <Text style={styles.emptyText}>No equipment found</Text>
            </View>
          ) : (
            filteredList.map((item) => (
              <TouchableOpacity
                key={item.id}
                onPress={() =>
                  navigation.navigate("EquipmentDetails", {
                    equipmentId: item.id,
                  })
                }
              >
                <Card style={styles.equipmentCard}>
                  <Card.Content style={styles.equipmentRow}>
                    <View style={styles.equipmentIcon}>
                      <MaterialCommunityIcons
                        name="robot-industrial"
                        size={20}
                        color="#6B7280"
                      />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text
                        style={styles.equipmentName}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {item.name}
                      </Text>
                      <Text
                        style={styles.equipmentMeta}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {item.equipmentId} • {item.lab?.name}
                      </Text>
                    </View>
                    <StatusBadge status={item.status?.status} />
                  </Card.Content>
                </Card>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* --- Reorder Modal --- */}
      <Portal>
        <Dialog
          visible={reorderVisible}
          onDismiss={() => setReorderVisible(false)}
        >
          <Dialog.Title>Reorder Request</Dialog.Title>
          <Dialog.Content>
            <Text style={{ marginBottom: 10, color: "#374151" }}>
              Requesting parts for: {selectedBreakdown?.equipment?.name}
            </Text>
            <TextInput
              label="Reason / Parts Needed"
              value={reorderReason}
              onChangeText={setReorderReason}
              mode="outlined"
              outlineColor="#D1D5DB"
              activeOutlineColor="#2563EB"
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => setReorderVisible(false)}
              textColor="#6B7280"
            >
              Cancel
            </Button>
            <Button onPress={submitReorder} textColor="#2563EB">
              Submit
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* --- AI Chatbot FAB --- */}
      <FAB
        icon="robot-outline"
        style={styles.fab}
        onPress={() => navigation.navigate("ChatbotScreen")}
        label="Ask AI"
        color="white"
      />
    </View>
  );
}

// Helper Components
const StatCard = ({ title, value, icon, color, bg }) => (
  <View style={[styles.statCard, { backgroundColor: bg }]}>
    <View style={styles.statHeader}>
      <View style={[styles.statIconBox, { backgroundColor: bg }]}>
        <MaterialCommunityIcons name={icon} size={24} color={color} />
      </View>
      <Text style={[styles.statValue, { color: "#111827" }]}>{value}</Text>
    </View>
    <Text style={styles.statTitle}>{title}</Text>
  </View>
);

const StatusBadge = ({ status }) => {
  let color = "#6B7280";
  if (status === "OPERATIONAL") color = "#059669";
  if (status === "IN_USE") color = "#2563EB";
  if (status === "MAINTENANCE") color = "#EA580C";
  if (status === "FAULTY") color = "#DC2626";
  if (status === "OFFLINE") color = "#6B7280";

  return (
    <View
      style={[
        styles.statusBadge,
        { backgroundColor: color + "20", borderColor: color + "40" },
      ]}
    >
      <Text style={[styles.statusBadgeText, { color }]}>
        {status || "UNKNOWN"}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  // Dropdown Styles
  dropdownTrigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dropdownText: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
    flex: 1,
  },

  // Alerts Section
  alertsSection: {
    backgroundColor: "white",
    margin: 12,
    marginBottom: 8,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  alertsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  alertsHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  alertIconBox: {
    position: "relative",
    padding: 6,
    backgroundColor: "#FEF2F2",
    borderRadius: 8,
  },
  alertBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    backgroundColor: "#EF4444",
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "white",
  },
  alertsTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#111827",
  },
  alertsList: {
    padding: 8,
    maxHeight: 400,
  },
  alertCard: {
    marginBottom: 12,
    backgroundColor: "white",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    elevation: 0,
  },
  alertContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 8,
  },
  alertDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  alertEquipment: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
  },
  alertMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  alertLabName: {
    fontSize: 10,
    color: "#6B7280",
    maxWidth: 100,
  },
  alertTypeBadge: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  alertTypeText: {
    fontSize: 9,
    fontWeight: "500",
    color: "#4B5563",
  },
  alertMessageBox: {
    backgroundColor: "#F9FAFB",
    padding: 8,
    borderRadius: 6,
    marginTop: 6,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  alertMessage: {
    fontSize: 12,
    color: "#374151",
    lineHeight: 18,
  },
  resolveButton: {
    padding: 6,
    backgroundColor: "#F0FDF4",
    borderRadius: 8,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  emptyAlerts: {
    paddingVertical: 32,
    alignItems: "center",
  },

  // Stats Grid
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 12,
    gap: 8,
    marginTop: 12,
  },
  statCard: {
    width: "48%",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  statHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  statIconBox: {
    padding: 12,
    borderRadius: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: "bold",
  },
  statTitle: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    textAlign: "center",
  },

  // Breakdowns Section
  breakdownsSection: {
    backgroundColor: "white",
    margin: 12,
    marginTop: 8,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  breakdownsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  breakdownsHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  breakdownIconBox: {
    padding: 6,
    backgroundColor: "#FEF2F2",
    borderRadius: 8,
  },
  breakdownsTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#111827",
  },
  reportButton: {
    backgroundColor: "#DC2626",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  reportButtonText: {
    color: "white",
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  breakdownsList: {
    padding: 8,
  },
  emptyBreakdowns: {
    paddingVertical: 32,
    alignItems: "center",
  },
  breakdownCard: {
    marginBottom: 12,
    backgroundColor: "white",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    elevation: 0,
  },
  breakdownContent: {
    paddingVertical: 8,
  },
  breakdownHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  breakdownEquipment: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    flex: 1,
    marginRight: 8,
  },
  breakdownStatusBadge: {
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  breakdownStatusText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#DC2626",
  },
  breakdownMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 8,
  },
  breakdownLabName: {
    fontSize: 11,
    color: "#6B7280",
    maxWidth: 120,
  },
  breakdownDate: {
    fontSize: 11,
    color: "#6B7280",
  },
  breakdownReasonBox: {
    backgroundColor: "#F9FAFB",
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    marginBottom: 8,
  },
  breakdownReason: {
    fontSize: 12,
    color: "#374151",
    lineHeight: 18,
  },
  reorderInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  reorderText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#2563EB",
  },
  breakdownActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  reorderButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  reorderButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2563EB",
  },
  resolveBreakdownButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  resolveBreakdownButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#10B981",
  },

  // Lab Section
  labSection: {
    backgroundColor: "white",
    margin: 12,
    marginTop: 8,
    borderRadius: 12,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  labHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  labHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2563EB",
  },
  labTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#111827",
    flex: 1,
  },
  labCount: {
    fontSize: 11,
    color: "#6B7280",
    marginLeft: "auto",
  },

  // Equipment Section
  equipmentSection: {
    backgroundColor: "white",
    margin: 12,
    marginTop: 8,
    borderRadius: 12,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  searchRow: {
    marginBottom: 12,
  },
  searchBar: {
    backgroundColor: "#F9FAFB",
    elevation: 0,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "center",
    height: 45,
  },
  equipmentCard: {
    marginBottom: 8,
    backgroundColor: "white",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    elevation: 0,
  },
  equipmentRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  equipmentIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  equipmentName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  equipmentMeta: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "bold",
  },
  emptyEquipment: {
    paddingVertical: 48,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 8,
  },

  // FAB
  fab: {
    position: "absolute",
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: "#2563EB",
    zIndex: 100,
  },
});
