import React, { memo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

// --- CONFIGURATION ---
const STATUS_CONFIG = {
  OPERATIONAL: {
    color: "#10B981", // Emerald 500
    bg: "#ECFDF5", // Emerald 50
    icon: "check-circle",
    label: "Operational",
  },
  IN_USE: {
    color: "#3B82F6", // Blue 500
    bg: "#EFF6FF", // Blue 50
    icon: "pulse",
    label: "In Use",
  },
  IDLE: {
    color: "#9CA3AF", // Gray 400
    bg: "#F3F4F6", // Gray 100
    icon: "clock-outline",
    label: "Idle",
  },
};

const getDisplayStatus = (backendStatus) => {
  if (!backendStatus) return "IDLE";
  const status = backendStatus.toUpperCase();
  if (status === "IN_USE" || status === "IN_CLASS") return "IN_USE";
  if (status === "OPERATIONAL") return "OPERATIONAL";
  return "IDLE";
};

const EquipmentNode = ({ node, isEditMode, onPositionPress, onNodePress }) => {
  const { equipment } = node;
  const displayStatus = getDisplayStatus(equipment.status?.status);
  const config = STATUS_CONFIG[displayStatus];
  const healthScore = equipment.status?.healthScore || 0;
  const unresolvedAlerts = equipment._count?.alerts || 0;

  const getHealthColor = (score) => {
    if (score >= 80) return "#059669"; // Green
    if (score >= 60) return "#D97706"; // Amber
    if (score >= 40) return "#EA580C"; // Orange
    return "#DC2626"; // Red
  };

  return (
    <View
      style={[
        styles.wrapper,
        {
          left: node.x,
          top: node.y,
        },
      ]}
    >
      {/* --- EDIT BADGE (Visible only in Edit Mode) --- */}
      {isEditMode && (
        <TouchableOpacity
          style={styles.editBadge}
          onPress={(e) => {
            e.stopPropagation();
            onPositionPress(node);
          }}
        >
          <MaterialCommunityIcons
            name="drag-vertical"
            size={12}
            color="white"
          />
          <Text style={styles.editBadgeText}>
            C{node.column + 1} R{node.row + 1}
          </Text>
        </TouchableOpacity>
      )}

      {/* --- ALERT BADGE --- */}
      {unresolvedAlerts > 0 && (
        <View style={styles.alertBadge}>
          <Text style={styles.alertText}>{unresolvedAlerts}</Text>
        </View>
      )}

      {/* --- MAIN CARD --- */}
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => onNodePress(equipment)}
        style={[styles.card, { borderColor: config.color + "40" }]} // 40 is hex opacity
      >
        {/* Color Bar Top */}
        <View style={[styles.statusBar, { backgroundColor: config.color }]} />

        <View style={styles.content}>
          {/* Header */}
          <View>
            <Text numberOfLines={1} ellipsizeMode="tail" style={styles.name}>
              {equipment.name}
            </Text>
            <Text style={styles.idText}>{equipment.equipmentId}</Text>
          </View>

          {/* Metrics */}
          <View style={styles.metricsContainer}>
            {/* Status Row */}
            <View style={styles.metricRow}>
              <View style={styles.statusChip}>
                <View style={[styles.dot, { backgroundColor: config.color }]} />
                <Text style={styles.statusText}>{config.label}</Text>
              </View>
            </View>

            {/* Health Row */}
            <View style={styles.metricRow}>
              <Text style={styles.label}>Health</Text>
              <Text
                style={[
                  styles.healthText,
                  { color: getHealthColor(healthScore) },
                ]}
              >
                {healthScore.toFixed(0)}%
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    width: 140, // Match NODE_WIDTH
    zIndex: 10,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 8,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    overflow: "hidden",
  },
  statusBar: {
    height: 4,
    width: "100%",
  },
  content: {
    padding: 10,
  },
  name: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 2,
  },
  idText: {
    fontSize: 10,
    color: "#6B7280",
    fontFamily: "System",
  },
  metricsContainer: {
    marginTop: 8,
    gap: 4,
  },
  metricRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    color: "#4B5563",
  },
  label: {
    fontSize: 10,
    color: "#6B7280",
  },
  healthText: {
    fontSize: 11,
    fontWeight: "bold",
  },
  editBadge: {
    position: "absolute",
    top: -10,
    alignSelf: "center",
    backgroundColor: "#2563EB",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    zIndex: 20,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 4,
  },
  editBadgeText: {
    color: "white",
    fontSize: 10,
    fontWeight: "bold",
    marginLeft: 2,
  },
  alertBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#DC2626",
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 20,
    borderWidth: 1.5,
    borderColor: "white",
  },
  alertText: {
    color: "white",
    fontSize: 10,
    fontWeight: "bold",
  },
});

export default memo(EquipmentNode);
