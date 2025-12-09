import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Linking,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import io from "socket.io-client";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuthStore } from "../../context/useAuthStore";
import client from "../../api/client";

// --- 1. HARDCODED QUALIFICATION DATA ---
const QUALIFICATION_DB = {
  lathe: {
    title: "CNC Lathe Operator",
    url: "https://nqr.gov.in/qualifications/11405",
    stats: {
      Theory: 40,
      Practical: 80,
      "Employability Skills": "00",
      "OJT (Mandatory)": "00",
    },
  },
  drill: {
    title: "Bench Drill Operator",
    url: "https://nqr.gov.in/qualifications/12082",
    stats: {
      Theory: 60,
      Practical: 150,
      "Employability Skills": 30,
      "OJT (Mandatory)": 150,
    },
  },
  weld: {
    title: "Arc Welding Specialist",
    url: "https://nqr.gov.in/qualifications/14234",
    stats: {
      Theory: 120,
      Practical: 180,
      "Employability Skills": 30,
      "OJT (Mandatory)": 60,
    },
  },
  laser: {
    title: "Laser Engraver",
    url: "https://nqr.gov.in/qualifications/13977",
    stats: {
      Theory: 150,
      Practical: 180,
      "Employability Skills": 60,
      "OJT (Mandatory)": 180,
    },
  },
};

export default function EquipmentDetailsScreen({ route }) {
  const { equipmentId } = route.params;
  const { token } = useAuthStore();

  const [equipmentName, setEquipmentName] = useState("");
  const [liveParams, setLiveParams] = useState(null);

  // --- HELPER: Find data based on name ---
  const getQualificationData = (name) => {
    if (!name) return null;
    const lowerName = name.toLowerCase();

    if (lowerName.includes("lathe")) return QUALIFICATION_DB.lathe;
    if (lowerName.includes("drill")) return QUALIFICATION_DB.drill;
    if (lowerName.includes("weld")) return QUALIFICATION_DB.weld;
    if (lowerName.includes("laser")) return QUALIFICATION_DB.laser;

    return null;
  };

  // --- FETCH EQUIPMENT DETAILS ---
  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const res = await client.get(`/equipment/${equipmentId}`);
        if (res.data && res.data.data) {
          setEquipmentName(res.data.data.name);
        }
      } catch (err) {
        console.log("Failed to fetch equipment name", err);
      }
    };
    fetchDetails();
  }, [equipmentId]);

  // --- SOCKET CONNECTION ---
  useEffect(() => {
    if (!token) return;

    // Use your specific IP here
    const socket = io("http://192.168.1.5:5000", {
      auth: { token: token },
      transports: ["websocket"],
    });

    socket.on("connect", () => {
      socket.emit("subscribe:equipment", equipmentId);
    });

    socket.on("equipment:status", (data) => {
      setLiveParams(data);
    });

    return () => {
      socket.emit("unsubscribe:equipment", equipmentId);
      socket.disconnect();
    };
  }, [equipmentId, token]);

  const nqrData = getQualificationData(equipmentName);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      {/* 1. Header & Live Data Section */}
      <View style={styles.headerContainer}>
        <Text style={styles.equipmentTitle}>
          {equipmentName || "Loading..."}
        </Text>
      </View>

      {/* 2. Qualification Standards Cards */}
      {nqrData && (
        <View style={styles.nqrSection}>
          <View style={styles.nqrHeader}>
            <MaterialCommunityIcons
              name="book-education-outline"
              size={22}
              color="#4F46E5"
            />
            <View style={{ marginLeft: 8 }}>
              <Text style={styles.sectionTitle}>Qualification Standards</Text>
              <Text style={styles.nqrSubtitle}>{nqrData.title}</Text>
            </View>
          </View>

          <View style={styles.cardsContainer}>
            {Object.entries(nqrData.stats).map(([key, value]) => (
              <View key={key} style={styles.statCard}>
                <View style={styles.cardHeader}>
                  {/* Icon mapping based on key names */}
                  <MaterialCommunityIcons
                    name={
                      key.includes("Theory")
                        ? "book-open-page-variant"
                        : key.includes("Practical")
                        ? "wrench"
                        : "account-school"
                    }
                    size={18}
                    color="#6B7280"
                  />
                  <Text style={styles.statLabel}>{key}</Text>
                </View>
                <Text style={styles.statValue}>
                  {value}{" "}
                  <Text style={{ fontSize: 12, color: "#9CA3AF" }}>hrs</Text>
                </Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => Linking.openURL(nqrData.url)}
          >
            <Text style={styles.linkText}>View Official NQR Curriculum</Text>
            <MaterialCommunityIcons
              name="open-in-new"
              size={16}
              color="white"
            />
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB", // Light gray background
    padding: 16,
  },

  // --- Header ---
  headerContainer: {
    marginBottom: 16,
    marginTop: 10,
  },
  equipmentTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111827",
  },
  equipmentId: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 2,
  },

  // --- Live Data Card ---
  liveDataCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  liveDataHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  },
  liveDataTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
  },
  metricsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  metricItem: {
    alignItems: "center",
  },
  metricLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111827",
  },
  metricUnit: {
    fontSize: 14,
    color: "#9CA3AF",
    fontWeight: "normal",
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: "#E5E7EB",
  },

  // --- NQR Section ---
  nqrSection: {
    marginTop: 8,
  },
  nqrHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
  },
  nqrSubtitle: {
    fontSize: 13,
    fontWeight: "500",
    color: "#6B7280",
  },

  // --- NQR Cards Grid ---
  cardsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  statCard: {
    width: "48%", // Two cards per row
    backgroundColor: "white",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    marginBottom: 0,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "600",
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
  },

  // --- Link Button ---
  linkButton: {
    marginTop: 20,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#4F46E5",
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  linkText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
  },
});
