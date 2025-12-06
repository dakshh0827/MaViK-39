import React, { useState, useEffect } from "react";
import { View, FlatList, StyleSheet, TouchableOpacity } from "react-native";
import { Searchbar, Card, Text, Chip, FAB } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import client from "../../api/client";

export default function EquipmentListScreen({ navigation }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [equipment, setEquipment] = useState([]);
  const [filteredEquipment, setFilteredEquipment] = useState([]);

  useEffect(() => {
    // Initial fetch
    client.get("/equipment").then((res) => {
      setEquipment(res.data.data);
      setFilteredEquipment(res.data.data);
    });
  }, []);

  const onChangeSearch = (query) => {
    setSearchQuery(query);
    if (!query) {
      setFilteredEquipment(equipment);
    } else {
      setFilteredEquipment(
        equipment.filter((item) =>
          item.name.toLowerCase().includes(query.toLowerCase())
        )
      );
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      onPress={() =>
        navigation.navigate("EquipmentDetails", { equipmentId: item.id })
      }
    >
      <Card style={styles.card}>
        <Card.Title
          title={item.name}
          subtitle={`Dept: ${item.department}`}
          left={(props) => (
            <MaterialCommunityIcons
              {...props}
              name="robot"
              size={40}
              color="#555"
            />
          )}
          right={(props) => (
            <Chip
              icon="circle"
              // 1. Fix the color logic (access .status inside the object)
              selectedColor={
                item.status?.status === "OPERATIONAL" ? "green" : "red"
              }
              style={{ marginRight: 10, backgroundColor: "transparent" }}
            >
              {/* 2. Fix the text display (access .status inside the object) */}
              {item.status?.status || "UNKNOWN"}
            </Chip>
          )}
        />
      </Card>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Search machines..."
        onChangeText={onChangeSearch}
        value={searchQuery}
        style={styles.search}
      />

      <FlatList
        data={filteredEquipment}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 80 }}
      />

      {/* Floating Action Button for Scanner */}
      <FAB
        icon="qrcode-scan"
        style={styles.fab}
        label="Scan QR"
        onPress={() => navigation.navigate("QRScanner")}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5", padding: 16 },
  search: { marginBottom: 10, backgroundColor: "white" },
  card: { marginBottom: 10, backgroundColor: "white" },
  fab: {
    position: "absolute",
    margin: 16,
    right: 4,
    bottom: 14,
    backgroundColor: "#2196F3",
  },
});
