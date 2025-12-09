import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import {
  Text,
  ActivityIndicator,
  Button,
  Portal,
  Dialog,
  TextInput,
  Menu,
  IconButton,
  Chip,
} from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Svg, { Path, Marker, Defs, Circle } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient"; // IMPORT ADDED
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthStore } from "../../context/useAuthStore";
import client from "../../api/client";
import EquipmentNode from "../../components/sld/EquipmentNode";
import io from "socket.io-client";

// --- REDUCED LAYOUT CONSTANTS ---
const NODE_WIDTH = 180;
const NODE_HEIGHT = 38;
const COLUMN_WIDTH = 240;
const ROW_HEIGHT = 90;
const ROOT_WIDTH = 250;
const ROOT_HEIGHT = 60;
const CANVAS_PADDING = 40;
const BUS_OFFSET = 40;

export default function SLDScreen({ navigation }) {
  const { user } = useAuthStore();
  const isLabManager = user?.role === "LAB_MANAGER";
  const insets = useSafeAreaInsets();

  // --- State ---
  const [loading, setLoading] = useState(false);
  const [labs, setLabs] = useState([]);
  const [selectedLabId, setSelectedLabId] = useState(null);
  const [equipment, setEquipment] = useState([]);
  const [liveEquipmentData, setLiveEquipmentData] = useState({});
  const [currentTime, setCurrentTime] = useState(Date.now());

  const [socket, setSocket] = useState(null);
  const [isSocketConnected, setIsSocketConnected] = useState(false);

  const [equipmentPositions, setEquipmentPositions] = useState({});
  const [numColumns, setNumColumns] = useState(3);

  const [labMenuVisible, setLabMenuVisible] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [detailsVisible, setDetailsVisible] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [positionModalVisible, setPositionModalVisible] = useState(false);
  const [tempPos, setTempPos] = useState({ col: 0, row: 0 });
  const [editingNodeId, setEditingNodeId] = useState(null);

  // --- Socket & Init ---
  useEffect(() => {
    fetchLabs();

    let socketUrl = client.defaults.baseURL;
    if (socketUrl) {
      socketUrl = socketUrl.replace("/api", "");
    } else {
      socketUrl = "http://192.168.1.15:5000";
    }

    const socketInstance = io(socketUrl, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
    });

    socketInstance.on("connect", () => setIsSocketConnected(true));
    socketInstance.on("disconnect", () => setIsSocketConnected(false));
    socketInstance.on("equipment:status", (data) =>
      handleEquipmentUpdate(data)
    );
    socketInstance.on("equipment:status:update", (data) =>
      handleEquipmentUpdate(data.status || data)
    );

    setSocket(socketInstance);

    const interval = setInterval(() => setCurrentTime(Date.now()), 2000);
    return () => {
      socketInstance.disconnect();
      clearInterval(interval);
    };
  }, []);

  const handleEquipmentUpdate = (data) => {
    const equipmentId = data.equipmentId || data.id;
    if (!equipmentId) return;
    setLiveEquipmentData((prev) => ({
      ...prev,
      [equipmentId]: { ...data, updatedAt: new Date() },
    }));
  };

  const fetchLabs = async () => {
    try {
      const res = await client.get("/labs");
      setLabs(res.data.data || []);
      if (user?.role === "TRAINER" && user.lab?.labId) {
        setSelectedLabId(user.lab.labId);
      }
    } catch (err) {
      console.error("Failed to load labs", err);
    }
  };

  useEffect(() => {
    if (selectedLabId && selectedLabId !== "all") {
      loadLabData(selectedLabId);
    } else {
      setEquipment([]);
    }
  }, [selectedLabId]);

  const loadLabData = async (labId) => {
    setLoading(true);
    try {
      const eqRes = await client.get("/equipment", { params: { labId } });
      const eqData = eqRes.data.data || [];
      setEquipment(eqData);
      setLiveEquipmentData({});

      const defaultCols = eqData.length > 0 ? Math.min(3, eqData.length) : 3;
      const defaultPositions = {};
      eqData.forEach((eq, index) => {
        const col = index % defaultCols;
        const row = Math.floor(index / defaultCols);
        defaultPositions[eq.id] = { column: col, row };
      });

      try {
        const layoutRes = await client.get(`/sld-layouts/${labId}`);
        const savedLayout = layoutRes.data?.data || layoutRes.data;
        if (savedLayout && savedLayout.positions) {
          setEquipmentPositions(savedLayout.positions);
          setNumColumns(savedLayout.numColumns || defaultCols);
        } else {
          setEquipmentPositions(defaultPositions);
          setNumColumns(defaultCols);
        }
      } catch (layoutErr) {
        setEquipmentPositions(defaultPositions);
        setNumColumns(defaultCols);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const saveLayout = async () => {
    if (!isLabManager) return;
    setIsSaving(true);
    try {
      await client.put(`/sld-layouts/${selectedLabId}`, {
        numColumns,
        positions: equipmentPositions,
      });
      setHasUnsavedChanges(false);
      Alert.alert("Success", "Layout saved!");
      setIsEditMode(false);
    } catch (err) {
      Alert.alert("Error", "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setHasUnsavedChanges(false);
    if (selectedLabId) loadLabData(selectedLabId);
  };

  const getLabNameOnly = (fullName) => {
    if (!fullName) return "Lab Main";
    const parts = fullName.split(/[-–,]/);
    const lastName = parts[parts.length - 1];
    return lastName ? lastName.trim() : fullName;
  };

  // --- MERGE DATA ---
  const equipmentWithLiveData = useMemo(() => {
    if (!equipment || equipment.length === 0) return [];
    return equipment.map((eq) => {
      const liveData = liveEquipmentData[eq.id];
      let isAlive = false;
      if (liveData && liveData.updatedAt) {
        if (currentTime - new Date(liveData.updatedAt).getTime() < 30000)
          isAlive = true;
      }
      return {
        ...eq,
        isAlive,
        status: liveData
          ? {
              ...eq.status,
              status: liveData.status || eq.status?.status,
              energyConsumption:
                liveData.energyConsumption ?? eq.status?.energyConsumption,
              lastEnergyConsumption: eq.status?.lastEnergyConsumption,
            }
          : { ...eq.status, isAlive: false },
      };
    });
  }, [equipment, liveEquipmentData, currentTime]);

  // --- LAYOUT ENGINE ---
  const layout = useMemo(() => {
    if (equipmentWithLiveData.length === 0)
      return { nodes: [], connections: [], w: 0, h: 0 };

    const positions = { ...equipmentPositions };
    equipmentWithLiveData.forEach((eq, index) => {
      if (!positions[eq.id]) {
        positions[eq.id] = {
          column: index % numColumns,
          row: Math.floor(index / numColumns),
        };
      }
    });

    const maxRow = Math.max(...Object.values(positions).map((p) => p.row), 0);
    const totalWidth = Math.max(
      Dimensions.get("window").width,
      numColumns * COLUMN_WIDTH + CANVAS_PADDING * 2
    );

    const rootX = (totalWidth - ROOT_WIDTH) / 2;
    const rootY = CANVAS_PADDING;
    const equipmentStartY = rootY + ROOT_HEIGHT + 60;

    const nodes = equipmentWithLiveData.map((eq) => {
      const pos = positions[eq.id];
      const startX = (totalWidth - numColumns * COLUMN_WIDTH) / 2;
      const x =
        startX + pos.column * COLUMN_WIDTH + (COLUMN_WIDTH - NODE_WIDTH) / 2;
      const y = equipmentStartY + pos.row * ROW_HEIGHT;
      return { equipment: eq, x, y, column: pos.column, row: pos.row };
    });

    const connections = nodes.map((node) => {
      const startX = rootX + ROOT_WIDTH / 2;
      const startY = rootY + ROOT_HEIGHT;
      const busY = startY + BUS_OFFSET;
      const endX = node.x + NODE_WIDTH / 2;
      const endY = node.y;
      const color = node.equipment.isAlive ? "#10B981" : "#9CA3AF";
      return { startX, startY, busY, endX, endY, color };
    });

    return {
      nodes,
      connections,
      rootX,
      rootY,
      totalWidth,
      totalHeight: equipmentStartY + (maxRow + 1) * ROW_HEIGHT + 100,
    };
  }, [equipmentWithLiveData, equipmentPositions, numColumns]);

  const getSmoothPath = (x1, y1, busY, x2, y2) => {
    const r = 10;
    const xDir = x2 > x1 ? 1 : -1;
    if (Math.abs(x1 - x2) < 1) return `M ${x1} ${y1} L ${x2} ${y2}`;
    return `
      M ${x1} ${y1}
      L ${x1} ${busY - r}
      Q ${x1} ${busY} ${x1 + r * xDir} ${busY}
      L ${x2 - r * xDir} ${busY}
      Q ${x2} ${busY} ${x2} ${busY + r}
      L ${x2} ${y2}
    `;
  };

  const handleApplyPosition = () => {
    if (editingNodeId) {
      setEquipmentPositions((prev) => ({
        ...prev,
        [editingNodeId]: { column: tempPos.col, row: tempPos.row },
      }));
      setHasUnsavedChanges(true);
      setPositionModalVisible(false);
    }
  };

  const handleNodePress = (eq) => {
    if (isEditMode) return;
    setSelectedNode(eq);
    setDetailsVisible(true);
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={[styles.headerWrapper, { paddingTop: insets.top }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>System Diagram</Text>
            <View
              style={[
                styles.liveBadge,
                isSocketConnected ? styles.bgGreen : styles.bgGray,
              ]}
            >
              <MaterialCommunityIcons
                name={isSocketConnected ? "wifi" : "wifi-off"}
                size={12}
                color={isSocketConnected ? "#15803d" : "#4b5563"}
              />
              <Text
                style={[
                  styles.liveText,
                  isSocketConnected
                    ? { color: "#15803d" }
                    : { color: "#4b5563" },
                ]}
              >
                {isSocketConnected ? "Live" : "Offline"}
              </Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            {isLabManager &&
              selectedLabId &&
              (isEditMode ? (
                <View style={styles.actionButtons}>
                  <IconButton
                    icon="close"
                    size={24}
                    iconColor="#6B7280"
                    onPress={handleCancelEdit}
                  />
                  <IconButton
                    icon="content-save"
                    iconColor="#2563EB"
                    size={24}
                    onPress={saveLayout}
                    loading={isSaving}
                  />
                </View>
              ) : (
                <IconButton
                  icon="pencil-outline"
                  iconColor="#111827"
                  size={24}
                  onPress={() => setIsEditMode(true)}
                />
              ))}
          </View>
        </View>
      </View>

      {/* LAB SELECTOR */}
      <View style={styles.filterContainer}>
        <Menu
          visible={labMenuVisible}
          onDismiss={() => setLabMenuVisible(false)}
          anchor={
            <TouchableOpacity
              style={styles.dropdownTrigger}
              onPress={() => setLabMenuVisible(true)}
            >
              <Text style={styles.dropdownText} numberOfLines={1}>
                {labs.find((l) => l.labId === selectedLabId)?.name ||
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
            width: Dimensions.get("window").width - 32,
          }}
        >
          {labs.map((lab) => (
            <Menu.Item
              key={lab.id}
              onPress={() => {
                setSelectedLabId(lab.labId);
                setLabMenuVisible(false);
                if (isEditMode) handleCancelEdit();
              }}
              title={lab.name}
            />
          ))}
        </Menu>
      </View>

      {/* EDIT CONTROLS */}
      {isEditMode && (
        <View style={styles.editControls}>
          <Text style={styles.editLabel}>Columns: {numColumns}</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <IconButton
              icon="minus"
              mode="contained"
              containerColor="white"
              size={18}
              onPress={() => {
                setNumColumns(Math.max(1, numColumns - 1));
                setHasUnsavedChanges(true);
              }}
            />
            <IconButton
              icon="plus"
              mode="contained"
              containerColor="white"
              size={18}
              onPress={() => {
                setNumColumns(Math.min(6, numColumns + 1));
                setHasUnsavedChanges(true);
              }}
            />
          </View>
        </View>
      )}

      {/* CANVAS */}
      <View style={styles.canvasContainer}>
        {/* STICKY TOTAL COUNT BADGE */}
        {selectedLabId && equipmentWithLiveData.length > 0 && (
          <View style={styles.stickyCounter}>
            <MaterialCommunityIcons name="collage" size={14} color="#6B7280" />
            <Text style={styles.stickyCounterText}>
              Total: {equipmentWithLiveData.length}
            </Text>
          </View>
        )}

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#2563EB" />
          </View>
        ) : !selectedLabId ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="sitemap" size={48} color="#9CA3AF" />
            <Text style={styles.emptyText}>Select a lab to view diagram</Text>
          </View>
        ) : (
          <ScrollView horizontal contentContainerStyle={{ flexGrow: 1 }}>
            <ScrollView
              contentContainerStyle={{
                minWidth: layout.totalWidth,
                minHeight: layout.totalHeight,
                paddingBottom: 50,
              }}
            >
              <View
                style={{ width: layout.totalWidth, height: layout.totalHeight }}
              >
                <Svg
                  height={layout.totalHeight}
                  width={layout.totalWidth}
                  style={StyleSheet.absoluteFill}
                >
                  <Defs>
                    <Marker
                      id="arrow"
                      viewBox="0 0 10 10"
                      refX="5"
                      refY="5"
                      markerWidth="4"
                      markerHeight="4"
                      orient="auto-start-reverse"
                    >
                      <Path d="M 0 0 L 10 5 L 0 10 z" fill="#9CA3AF" />
                    </Marker>
                  </Defs>
                  {layout.connections.map((conn, i) => (
                    <React.Fragment key={i}>
                      <Path
                        d={getSmoothPath(
                          conn.startX,
                          conn.startY,
                          conn.busY,
                          conn.endX,
                          conn.endY
                        )}
                        stroke={conn.color}
                        strokeWidth="2"
                        fill="none"
                      />
                      <Circle
                        cx={conn.startX}
                        cy={conn.startY}
                        r="3"
                        fill={conn.color}
                      />
                    </React.Fragment>
                  ))}
                </Svg>

                {/* ROOT NODE WITH GRADIENT */}
                <LinearGradient
                  colors={["#6B7280", "#4B5563"]} // gray-500 to gray-600
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[
                    styles.rootNode,
                    {
                      left: layout.rootX,
                      top: layout.rootY,
                      width: ROOT_WIDTH,
                      height: ROOT_HEIGHT,
                    },
                  ]}
                >
                  <Text style={styles.rootTitle} numberOfLines={1}>
                    {getLabNameOnly(
                      labs.find((l) => l.labId === selectedLabId)?.name
                    )}
                  </Text>
                </LinearGradient>

                {layout.nodes.map((node) => (
                  <EquipmentNode
                    key={node.equipment.id}
                    node={node}
                    isEditMode={isEditMode}
                    onPositionPress={(n) => {
                      setEditingNodeId(n.equipment.id);
                      setTempPos({ col: n.column, row: n.row });
                      setPositionModalVisible(true);
                    }}
                    onNodePress={handleNodePress}
                  />
                ))}
              </View>
            </ScrollView>
          </ScrollView>
        )}
      </View>

      {/* MODALS */}
      <Portal>
        <Dialog
          visible={detailsVisible}
          onDismiss={() => setDetailsVisible(false)}
        >
          <Dialog.Title>{selectedNode?.name}</Dialog.Title>
          <Dialog.Content>
            <View style={styles.modalRow}>
              <Text style={styles.modalLabel}>ID:</Text>
              <Text>{selectedNode?.equipmentId}</Text>
            </View>
            <View style={styles.modalRow}>
              <Text style={styles.modalLabel}>Energy:</Text>
              <Text>
                {selectedNode?.status?.energyConsumption?.toFixed(2) || 0} kW
              </Text>
            </View>
            <View style={styles.modalRow}>
              <Text style={styles.modalLabel}>Status:</Text>
              <Chip>{selectedNode?.isAlive ? "Online" : "Offline"}</Chip>
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDetailsVisible(false)}>Close</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog
          visible={positionModalVisible}
          onDismiss={() => setPositionModalVisible(false)}
        >
          <Dialog.Title>Move Equipment</Dialog.Title>
          <Dialog.Content>
            <Text style={{ marginBottom: 10 }}>Coordinates:</Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text>Column</Text>
                <TextInput
                  mode="outlined"
                  keyboardType="numeric"
                  value={String(tempPos.col)}
                  onChangeText={(t) =>
                    setTempPos((p) => ({ ...p, col: parseInt(t) || 0 }))
                  }
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text>Row</Text>
                <TextInput
                  mode="outlined"
                  keyboardType="numeric"
                  value={String(tempPos.row)}
                  onChangeText={(t) =>
                    setTempPos((p) => ({ ...p, row: parseInt(t) || 0 }))
                  }
                />
              </View>
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setPositionModalVisible(false)}>
              Cancel
            </Button>
            <Button onPress={handleApplyPosition} mode="contained">
              Move
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#E5E7EB" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  headerWrapper: {
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    zIndex: 10,
  },
  headerContent: {
    height: 60,
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#111827" },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    gap: 4,
    borderWidth: 1,
  },
  bgGreen: { backgroundColor: "#dcfce7", borderColor: "#bbf7d0" },
  bgGray: { backgroundColor: "#f3f4f6", borderColor: "#e5e7eb" },
  liveText: { fontSize: 10, fontWeight: "700" },
  headerRight: { flexDirection: "row", alignItems: "center" },
  actionButtons: { flexDirection: "row" },
  filterContainer: {
    backgroundColor: "white",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    zIndex: 5,
  },
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
  dropdownText: { fontSize: 14, color: "#374151", fontWeight: "500", flex: 1 },
  editControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    backgroundColor: "#EFF6FF",
    borderBottomWidth: 1,
    borderBottomColor: "#DBEAFE",
  },
  editLabel: { fontSize: 14, fontWeight: "600", color: "#1E40AF" },
  canvasContainer: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    position: "relative",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#F3F4F6",
  },
  emptyIconBox: {
    padding: 20,
    backgroundColor: "#E5E7EB",
    borderRadius: 50,
    marginBottom: 16,
  },
  emptyText: { fontSize: 16, fontWeight: "bold", color: "#374151" },
  // UPDATED ROOT NODE STYLE
  rootNode: {
    position: "absolute",
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
    zIndex: 20,
  },
  rootTitle: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
    textAlign: "center",
  },
  stickyCounter: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    zIndex: 100,
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  stickyCounterText: { fontSize: 12, fontWeight: "600", color: "#374151" },
  modalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  modalLabel: { fontWeight: "bold", color: "#6B7280" },
});
