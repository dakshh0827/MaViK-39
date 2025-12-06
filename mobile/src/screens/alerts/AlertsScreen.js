import React, { useEffect, useState, useCallback } from "react";
import {
  ScrollView,
  View,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from "react-native";
import {
  Text,
  Card,
  Searchbar,
  ActivityIndicator,
  Chip,
} from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { format } from "date-fns";
import client from "../../api/client";

export default function AlertsScreen() {
  // --- State ---
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [activeTab, setActiveTab] = useState("active"); // 'active' or 'history'
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPriority, setSelectedPriority] = useState("all");

  // --- Fetch Data ---
  const fetchAlerts = useCallback(async () => {
    try {
      // Determine if we want resolved or unresolved based on tab
      const isResolved = activeTab === "history";

      const res = await client.get("/alerts", {
        params: { isResolved },
      });

      setAlerts(res.data.data || []);
    } catch (error) {
      console.error("Error fetching alerts:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab]);

  useEffect(() => {
    setLoading(true);
    fetchAlerts();
  }, [fetchAlerts]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAlerts();
  };

  // --- Actions ---
  const handleResolveAlert = async (id) => {
    try {
      await client.patch(`/alerts/${id}/resolve`);
      // Refresh list after resolving
      fetchAlerts();
    } catch (err) {
      Alert.alert("Error", "Failed to resolve alert");
    }
  };

  // --- Filtering ---
  const getFilteredAlerts = () => {
    let filtered = alerts;

    // Filter by Priority
    if (selectedPriority !== "all") {
      filtered = filtered.filter((a) => a.priority === selectedPriority);
    }

    // Filter by Search Text
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.message?.toLowerCase().includes(query) ||
          a.equipment?.name?.toLowerCase().includes(query) ||
          a.lab?.name?.toLowerCase().includes(query)
      );
    }

    return filtered;
  };

  const filteredAlerts = getFilteredAlerts();

  // --- Helpers ---
  const safeFormat = (dateString, fmt) => {
    if (!dateString) return "N/A";
    try {
      return format(new Date(dateString), fmt);
    } catch (e) {
      return "Invalid Date";
    }
  };

  const getPriorityColor = (priority) => {
    if (priority === "CRITICAL") return "#EF4444";
    if (priority === "HIGH") return "#F59E0B";
    return "#10B981"; // Normal/Low
  };

  const getBgColor = (priority) => {
    if (priority === "CRITICAL") return "#FEF2F2";
    if (priority === "HIGH") return "#FFF7ED";
    return "#F0FDF4";
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* --- Header / Search Section --- */}
      <View style={styles.headerContainer}>
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "active" && styles.tabActive]}
            onPress={() => setActiveTab("active")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "active" && styles.tabTextActive,
              ]}
            >
              Active Alerts
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "history" && styles.tabActive]}
            onPress={() => setActiveTab("history")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "history" && styles.tabTextActive,
              ]}
            >
              History
            </Text>
          </TouchableOpacity>
        </View>

        <Searchbar
          placeholder="Search alerts..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
          inputStyle={{ fontSize: 14 }}
        />

        {/* Priority Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterRow}
        >
          {["all", "CRITICAL", "HIGH", "NORMAL"].map((p) => (
            <Chip
              key={p}
              selected={selectedPriority === p}
              onPress={() => setSelectedPriority(p)}
              style={[
                styles.chip,
                selectedPriority === p && { backgroundColor: "#DBEAFE" },
              ]}
              textStyle={{
                fontSize: 11,
                color: selectedPriority === p ? "#2563EB" : "#4B5563",
              }}
            >
              {p === "all" ? "All Priorities" : p}
            </Chip>
          ))}
        </ScrollView>
      </View>

      {/* --- Alert List --- */}
      <ScrollView
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredAlerts.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons
              name="check-all"
              size={48}
              color="#D1D5DB"
            />
            <Text style={styles.emptyText}>No alerts found</Text>
          </View>
        ) : (
          filteredAlerts.map((item) => (
            <Card
              key={item.id}
              style={[
                styles.card,
                {
                  backgroundColor:
                    activeTab === "active"
                      ? getBgColor(item.priority)
                      : "white",
                },
              ]}
            >
              <Card.Content style={styles.cardContent}>
                {/* Priority Dot */}
                <View
                  style={[
                    styles.priorityDot,
                    { backgroundColor: getPriorityColor(item.priority) },
                  ]}
                />

                {/* Main Content */}
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.equipmentName}>
                      {item.equipment?.name || "Unknown Equipment"}
                    </Text>
                    <Text style={styles.dateText}>
                      {safeFormat(
                        activeTab === "history"
                          ? item.resolvedAt
                          : item.createdAt,
                        "MMM dd, HH:mm"
                      )}
                    </Text>
                  </View>

                  <View style={styles.metaRow}>
                    <View style={styles.metaItem}>
                      <MaterialCommunityIcons
                        name="flask"
                        size={12}
                        color="#6B7280"
                      />
                      <Text style={styles.metaText}>
                        {item.lab?.name || "Unknown Lab"}
                      </Text>
                    </View>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>
                        {item.type?.replace(/_/g, " ")}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.messageBox}>
                    <Text style={styles.messageText}>{item.message}</Text>
                  </View>

                  {/* History Specific: Who resolved it */}
                  {activeTab === "history" && item.isResolved && (
                    <View style={styles.resolvedFooter}>
                      <MaterialCommunityIcons
                        name="account-check-outline"
                        size={14}
                        color="#059669"
                      />
                      <Text style={styles.resolvedText}>
                        Resolved by {item.resolver?.name || "System/Admin"}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Active Specific: Resolve Button */}
                {activeTab === "active" && (
                  <TouchableOpacity
                    style={styles.resolveButton}
                    onPress={() => handleResolveAlert(item.id)}
                  >
                    <MaterialCommunityIcons
                      name="check"
                      size={20}
                      color="#059669"
                    />
                  </TouchableOpacity>
                )}
              </Card.Content>
            </Card>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E5E7EB", // Matches Dashboard background
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  headerContainer: {
    backgroundColor: "white",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    zIndex: 1,
  },
  // Tab Styles
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    padding: 4,
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 6,
  },
  tabActive: {
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#6B7280",
  },
  tabTextActive: {
    color: "#2563EB",
    fontWeight: "700",
  },
  // Search & Filter
  searchBar: {
    backgroundColor: "#F9FAFB",
    elevation: 0,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    height: 42,
    marginBottom: 10,
  },
  filterRow: {
    flexDirection: "row",
  },
  chip: {
    marginRight: 8,
    height: 28,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  // List Styles
  listContent: {
    padding: 12,
    paddingBottom: 40,
  },
  emptyState: {
    alignItems: "center",
    marginTop: 60,
  },
  emptyText: {
    color: "#9CA3AF",
    marginTop: 10,
    fontSize: 14,
  },
  // Card Styles
  card: {
    marginBottom: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    elevation: 0, // Using flat border look to match dashboard
  },
  cardContent: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: "flex-start",
  },
  priorityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 5,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  equipmentName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  dateText: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: "#6B7280",
  },
  badge: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: "600",
    color: "#4B5563",
    textTransform: "uppercase",
  },
  messageBox: {
    backgroundColor: "rgba(255,255,255,0.6)",
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  messageText: {
    fontSize: 13,
    color: "#374151",
    lineHeight: 18,
  },
  resolvedFooter: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    gap: 4,
  },
  resolvedText: {
    fontSize: 11,
    color: "#059669",
    fontWeight: "500",
  },
  resolveButton: {
    padding: 8,
    backgroundColor: "#ECFDF5",
    borderRadius: 20,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: "#A7F3D0",
    alignSelf: "center",
  },
});
