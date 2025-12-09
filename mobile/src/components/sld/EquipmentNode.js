import React, { memo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

// --- CONFIGURATION ---
const STATUS_CONFIG = {
  ONLINE: {
    color: "#10B981", // Emerald 500
    energyColor: "#059669", // Darker Emerald text
  },
  OFFLINE: {
    color: "#EF4444", // Red 500
    energyColor: "#DC2626", // Darker Red text
  },
};

const getDisplayStatus = (equipment) => {
  if (!equipment.isAlive) return "OFFLINE";
  const status = equipment.status?.status?.toUpperCase();
  if (
    status === "OPERATIONAL" ||
    status === "IN_USE" ||
    status === "IN_CLASS"
  ) {
    return "ONLINE";
  }
  return "OFFLINE";
};

const EquipmentNode = ({ node, isEditMode, onPositionPress, onNodePress }) => {
  const { equipment } = node;

  // 1. Status & Config
  const displayStatusKey = getDisplayStatus(equipment);
  const config = STATUS_CONFIG[displayStatusKey];

  // 2. Energy Logic
  const currentConsumption = equipment.status?.energyConsumption;
  const lastRecordedConsumption = equipment.status?.lastEnergyConsumption;
  const unresolvedAlerts = equipment._count?.alerts || 0;

  let displayConsumption = 0;
  if (displayStatusKey === "ONLINE") {
    displayConsumption = currentConsumption ?? 0;
  } else {
    displayConsumption = lastRecordedConsumption ?? 0;
  }

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
      {/* --- EDIT HANDLE --- */}
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
        </TouchableOpacity>
      )}

      {/* --- ALERT BADGE --- */}
      {unresolvedAlerts > 0 && (
        <View style={styles.alertBadge}>
          <Text style={styles.alertText}>{unresolvedAlerts}</Text>
        </View>
      )}

      {/* --- MAIN PILL CARD --- */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => onNodePress(equipment)}
        style={styles.pillContainer}
      >
        {/* LEFT: Dot + ID */}
        <View style={styles.leftContainer}>
          <View style={[styles.statusDot, { backgroundColor: config.color }]} />
          <Text style={styles.idText} numberOfLines={1} ellipsizeMode="tail">
            {equipment.equipmentId}
          </Text>
        </View>

        {/* RIGHT: Energy */}
        <View style={styles.rightContainer}>
          <Text style={[styles.energyText, { color: config.energyColor }]}>
            {displayConsumption.toFixed(1)}
            <Text style={styles.unitText}> kW</Text>
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    width: 220, // Explicit width matching the web
    height: 50,
    zIndex: 10,
  },
  pillContainer: {
    width: "80%",
    height: 40, // Web app height
    backgroundColor: "white",
    borderRadius: 15, // Fully rounded ends (Pill)
    borderWidth: 1,
    borderColor: "#9CA3AF", // Gray 400 (matching web border)
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16, // px-5 equivalent
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  leftContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 10,
    overflow: "hidden", // Ensure text doesn't bleed
  },
  statusDot: {
    width: 10, // w-3 equivalent approx
    height: 10, // h-3
    borderRadius: 5,
    marginRight: 8,
  },
  idText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#374151", // Gray 700
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace", // Monospace font
  },
  rightContainer: {
    flexShrink: 0,
  },
  energyText: {
    fontSize: 14,
    fontWeight: "700",
  },
  unitText: {
    fontSize: 12,
    color: "#9CA3AF", // Gray 400
    fontWeight: "500",
  },
  // Overlays
  editBadge: {
    position: "absolute",
    top: -10,
    alignSelf: "center",
    backgroundColor: "#2563EB",
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 20,
    elevation: 5,
  },
  alertBadge: {
    position: "absolute",
    top: -5,
    right: 5,
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
