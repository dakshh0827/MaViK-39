import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Button, Alert, TextInput } from "react-native"; // Added Alert, TextInput
import io from "socket.io-client";
import { useAuthStore } from "../../context/useAuthStore";
import client from "../../api/client"; // <--- IMPORT THIS

export default function EquipmentDetailsScreen({ route }) {
  const { equipmentId } = route.params;
  const { token } = useAuthStore();

  const [liveParams, setLiveParams] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState("Disconnected");

  // State for the breakdown form
  const [showReportInput, setShowReportInput] = useState(false);
  const [reason, setReason] = useState("");

  // --- YOUR NEW FUNCTION (Adapted for React Native) ---
  const reportBreakdown = async () => {
    if (!reason.trim()) {
      Alert.alert("Error", "Please enter a reason.");
      return;
    }

    try {
      await client.post("/breakdown", {
        equipmentId,
        reason,
        urgency: "HIGH",
      });
      Alert.alert("Success", "Breakdown reported successfully!");
      setShowReportInput(false);
      setReason("");
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to report breakdown");
    }
  };

  useEffect(() => {
    if (!token) return;

    // 1. Initialize Socket
    const socket = io("http://192.168.1.X:5000", {
      // Remember to use your local IP
      auth: { token: token },
      transports: ["websocket"],
    });

    socket.on("connect", () => {
      setConnectionStatus("Connected");
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

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Real-time Status: {connectionStatus}</Text>

      {/* 1. Live Data Section */}
      {liveParams ? (
        <View style={styles.dataContainer}>
          <Text style={styles.dataText}>
            Temperature: {liveParams.temperature}°C
          </Text>
          <Text style={styles.dataText}>
            Vibration: {liveParams.vibration} Hz
          </Text>
        </View>
      ) : (
        <Text style={styles.loadingText}>Waiting for live data...</Text>
      )}

      {/* 2. Breakdown Reporting Section */}
      <View style={styles.actionContainer}>
        {!showReportInput ? (
          <Button
            title="Report Breakdown"
            color="red"
            onPress={() => setShowReportInput(true)}
          />
        ) : (
          <View>
            <Text style={styles.label}>Reason for breakdown:</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Overheating, abnormal sound"
              value={reason}
              onChangeText={setReason}
            />
            <View style={styles.buttonRow}>
              <Button
                title="Cancel"
                onPress={() => setShowReportInput(false)}
              />
              <View style={{ width: 10 }} />
              <Button
                title="Submit Report"
                color="red"
                onPress={reportBreakdown}
              />
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  header: { fontSize: 20, fontWeight: "bold", marginBottom: 20 },
  dataContainer: {
    padding: 15,
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    marginBottom: 30,
  },
  dataText: { fontSize: 16, marginBottom: 5 },
  loadingText: { fontStyle: "italic", color: "#666", marginBottom: 30 },

  actionContainer: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 20,
  },
  label: { fontSize: 16, marginBottom: 10 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
  },
  buttonRow: { flexDirection: "row", justifyContent: "flex-end" },
});
