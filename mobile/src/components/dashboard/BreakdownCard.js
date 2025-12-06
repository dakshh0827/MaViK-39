import React from "react";
import { View, StyleSheet } from "react-native";
import {
  Card,
  Text,
  Button,
  Chip,
  Divider,
  IconButton,
} from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { format } from "date-fns";

export default function BreakdownCard({ item, onResolve, onReorder }) {
  return (
    <Card style={styles.card}>
      <Card.Content>
        {/* Header: Machine Name & Status */}
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text variant="titleMedium" style={styles.machineName}>
              {item.equipment?.name}
            </Text>
            <Text variant="bodySmall" style={styles.idText}>
              {item.equipment?.equipmentId}
            </Text>
          </View>
          <Chip
            icon="alert-circle"
            style={{ backgroundColor: "#ffebee" }}
            textStyle={{ color: "#d32f2f" }}
          >
            Broken
          </Chip>
        </View>

        <Divider style={styles.divider} />

        {/* Details: Reason & Reporter */}
        <View style={styles.detailRow}>
          <MaterialCommunityIcons
            name="alert-octagon"
            size={16}
            color="#d32f2f"
          />
          <Text style={styles.detailText}>
            {item.reason || "No reason provided"}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <MaterialCommunityIcons name="account" size={16} color="#666" />
          <Text style={styles.detailText}>
            Reported by: {item.reportedByUser?.firstName} •{" "}
            {format(new Date(item.reportedAt), "MMM dd")}
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            mode="outlined"
            textColor="#d32f2f"
            style={styles.button}
            onPress={() => onReorder(item)}
            icon="cart-arrow-down"
          >
            Reorder Parts
          </Button>
          <Button
            mode="contained"
            buttonColor="#2e7d32"
            style={styles.button}
            onPress={() => onResolve(item.id)}
            icon="check"
          >
            Resolve
          </Button>
        </View>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 12, backgroundColor: "white", elevation: 2 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  machineName: { fontWeight: "bold" },
  idText: { color: "gray", fontSize: 12 },
  divider: { marginVertical: 10 },
  detailRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  detailText: { marginLeft: 8, color: "#444", fontSize: 13, flex: 1 },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 10,
    gap: 10,
  },
  button: { flex: 1 },
});
