import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  Dimensions,
  TouchableOpacity,
  Modal,
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
  FAB,
  Chip,
  Divider,
} from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Svg, { Path, Marker, Defs, Circle } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthStore } from "../../context/useAuthStore";
import client from "../../api/client";
import EquipmentNode from "../../components/sld/EquipmentNode";

// --- LAYOUT CONSTANTS ---
const NODE_WIDTH = 140;
const COLUMN_WIDTH = 180;
const ROW_HEIGHT = 160;
const ROOT_WIDTH = 240;
const ROOT_HEIGHT = 80;
const CANVAS_PADDING = 50;
const BUS_OFFSET = 40;

// --- STATUS LEGEND COLORS ---
const STATUS_LEGEND = [
  { label: "Operational", color: "#10B981" }, // Emerald 500
  { label: "In Use", color: "#3B82F6" }, // Blue 500
  { label: "Idle", color: "#9CA3AF" }, // Gray 400
];

export default function SLDScreen({ navigation }) {
  const { user } = useAuthStore();
  const isLabManager = user?.role === "LAB_MANAGER";
  const insets = useSafeAreaInsets();

  // --- State ---
  const [loading, setLoading] = useState(false);
  const [labs, setLabs] = useState([]);
  const [selectedLabId, setSelectedLabId] = useState(null);
  const [equipment, setEquipment] = useState([]);
  const [equipmentPositions, setEquipmentPositions] = useState({});
  const [numColumns, setNumColumns] = useState(3);

  // Dropdown Visibility State
  const [labMenuVisible, setLabMenuVisible] = useState(false);

  // Edit Mode
  const [isEditMode, setIsEditMode] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Modals
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [positionModalVisible, setPositionModalVisible] = useState(false);
  const [tempPos, setTempPos] = useState({ col: 0, row: 0 });
  const [editingNodeId, setEditingNodeId] = useState(null);

  // --- 1. Initial Data Load ---
  useEffect(() => {
    fetchLabs();
  }, []);

  const fetchLabs = async () => {
    try {
      const res = await client.get("/labs");
      const fetchedLabs = res.data.data || [];
      setLabs(fetchedLabs);

      if (user?.role === "TRAINER" && user.lab?.labId) {
        setSelectedLabId(user.lab.labId);
      }
    } catch (err) {
      console.error("Failed to load labs", err);
    }
  };

  // --- 2. Load Equipment & Layout when Lab changes ---
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
      // 1. Fetch Equipment
      const eqRes = await client.get("/equipment", { params: { labId } });
      const eqData = eqRes.data.data || [];
      setEquipment(eqData);

      // Default Layout
      const defaultCols = eqData.length > 0 ? Math.min(3, eqData.length) : 3;
      const defaultPositions = {};
      eqData.forEach((eq, index) => {
        const col = index % defaultCols;
        const row = Math.floor(index / defaultCols);
        defaultPositions[eq.id] = { column: col, row };
      });

      // 2. Fetch Layout
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
        console.log(
          `No custom layout found at /sld-layouts/${labId}, using default.`
        );
        setEquipmentPositions(defaultPositions);
        setNumColumns(defaultCols);
      }
    } catch (err) {
      console.error("Error loading lab data:", err);
    } finally {
      setLoading(false);
    }
  };

  // --- 3. Save Layout ---
  const saveLayout = async () => {
    if (!isLabManager) return;
    setIsSaving(true);
    try {
      await client.put(`/sld-layouts/${selectedLabId}`, {
        numColumns,
        positions: equipmentPositions,
      });

      setHasUnsavedChanges(false);
      Alert.alert("Success", "Layout saved successfully!");
      setIsEditMode(false);
    } catch (err) {
      console.error("Save Layout Error:", err.response?.data || err.message);
      const errorMessage =
        err.response?.data?.message || "Failed to save layout";
      Alert.alert("Error", errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setHasUnsavedChanges(false);
    if (selectedLabId) loadLabData(selectedLabId);
  };

  // --- 4. Layout Generation ---
  const layout = useMemo(() => {
    if (equipment.length === 0)
      return { nodes: [], connections: [], w: 0, h: 0 };

    const positions = { ...equipmentPositions };
    equipment.forEach((eq, index) => {
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
    const equipmentStartY = rootY + ROOT_HEIGHT + 80;

    const nodes = equipment.map((eq) => {
      const pos = positions[eq.id];
      const startX = (totalWidth - numColumns * COLUMN_WIDTH) / 2;

      const x =
        startX + pos.column * COLUMN_WIDTH + (COLUMN_WIDTH - NODE_WIDTH) / 2;
      const y = equipmentStartY + pos.row * ROW_HEIGHT;

      return {
        equipment: eq,
        x,
        y,
        column: pos.column,
        row: pos.row,
      };
    });

    const connections = nodes.map((node) => {
      const startX = rootX + ROOT_WIDTH / 2;
      const startY = rootY + ROOT_HEIGHT;
      const busY = startY + BUS_OFFSET;
      const endX = node.x + NODE_WIDTH / 2;
      const endY = node.y;

      let color = "#9CA3AF";
      const status = node.equipment.status?.status;
      if (status === "OPERATIONAL") color = "#10B981";
      if (status === "IN_USE" || status === "IN_CLASS") color = "#3B82F6";

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
  }, [equipment, equipmentPositions, numColumns]);

  const getSmoothPath = (x1, y1, busY, x2, y2) => {
    const r = 12;
    const xDir = x2 > x1 ? 1 : -1;

    if (Math.abs(x1 - x2) < 1) {
      return `M ${x1} ${y1} L ${x2} ${y2}`;
    }

    return `
      M ${x1} ${y1}
      L ${x1} ${busY - r}
      Q ${x1} ${busY} ${x1 + r * xDir} ${busY}
      L ${x2 - r * xDir} ${busY}
      Q ${x2} ${busY} ${x2} ${busY + r}
      L ${x2} ${y2}
    `;
  };

  // --- Render Helpers ---
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
      {/* --- HEADER --- */}
      <View style={[styles.headerWrapper, { paddingTop: insets.top }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>System Diagram</Text>
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

      {/* --- LAB SELECTOR (DROPDOWN) --- */}
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

      {/* --- EDIT CONTROLS --- */}
      {isEditMode && (
        <View style={styles.editControls}>
          <Text style={styles.editLabel}>Grid Columns: {numColumns}</Text>
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
          {hasUnsavedChanges && (
            <Text
              style={{ color: "#D97706", fontSize: 11, fontWeight: "bold" }}
            >
              Unsaved Changes
            </Text>
          )}
        </View>
      )}

      {/* --- STATUS LEGEND --- */}
      {selectedLabId && !loading && (
        <View style={styles.legendContainer}>
          <Text style={styles.legendTitle}>Status Legend</Text>
          <View style={styles.legendItems}>
            {STATUS_LEGEND.map((status) => (
              <View key={status.label} style={styles.legendItem}>
                <View
                  style={[styles.legendDot, { backgroundColor: status.color }]}
                />
                <Text style={styles.legendText}>{status.label}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* --- CANVAS AREA --- */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={{ marginTop: 10 }}>Loading Diagram...</Text>
        </View>
      ) : !selectedLabId ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconBox}>
            <MaterialCommunityIcons name="sitemap" size={48} color="#9CA3AF" />
          </View>
          <Text style={styles.emptyText}>Select a lab to view diagram</Text>
          <Text style={styles.emptySubText}>
            Choose a lab from the list above
          </Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          contentContainerStyle={{ flexGrow: 1 }}
          style={styles.canvasContainer}
        >
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
                      r="4"
                      fill={conn.color}
                    />
                  </React.Fragment>
                ))}
              </Svg>

              <View
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
                <MaterialCommunityIcons name="domain" size={24} color="white" />
                <View style={{ marginLeft: 10, flex: 1 }}>
                  <Text style={styles.rootTitle} numberOfLines={1}>
                    {labs.find((l) => l.labId === selectedLabId)?.name ||
                      "Main Supply"}
                  </Text>
                  <Text style={styles.rootSubtitle}>
                    {equipment.length} Machines Connected
                  </Text>
                </View>
              </View>

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

      {/* --- MODALS --- */}
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
              <Text style={styles.modalLabel}>Model:</Text>
              <Text>{selectedNode?.model || "N/A"}</Text>
            </View>
            <View style={styles.modalRow}>
              <Text style={styles.modalLabel}>Manufacturer:</Text>
              <Text>{selectedNode?.manufacturer || "N/A"}</Text>
            </View>
            <View style={[styles.modalRow, { marginTop: 10 }]}>
              <Text style={styles.modalLabel}>Status:</Text>
              <Chip style={{ height: 30 }} textStyle={{ fontSize: 12 }}>
                {selectedNode?.status?.status || "IDLE"}
              </Chip>
            </View>
            <View style={[styles.modalRow, { marginTop: 10 }]}>
              <Text style={styles.modalLabel}>Health Score:</Text>
              <Text style={{ fontWeight: "bold", color: "#059669" }}>
                {selectedNode?.status?.healthScore?.toFixed(1)}%
              </Text>
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => {
                setDetailsVisible(false);
                navigation.navigate("EquipmentDetails", {
                  equipmentId: selectedNode?.id,
                });
              }}
            >
              Full Details
            </Button>
            <Button onPress={() => setDetailsVisible(false)}>Close</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Portal>
        <Dialog
          visible={positionModalVisible}
          onDismiss={() => setPositionModalVisible(false)}
        >
          <Dialog.Title>Move Equipment</Dialog.Title>
          <Dialog.Content>
            <Text style={{ marginBottom: 10 }}>
              Enter new coordinates grid position:
            </Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text>Column (0-{numColumns - 1})</Text>
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

  // Dropdown
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

  // Header Fixed
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
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#111827",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionButtons: {
    flexDirection: "row",
  },

  // Lab Selector
  filterContainer: {
    backgroundColor: "white",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    zIndex: 5, // Important for Menu
  },

  // Legend
  legendContainer: {
    backgroundColor: "white",
    padding: 10,
    marginHorizontal: 10,
    marginTop: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  legendTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#374151",
    marginBottom: 6,
  },
  legendItems: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    color: "#6B7280",
  },

  // Content Area
  canvasContainer: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },

  // Empty State
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
  emptyText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#374151",
  },
  emptySubText: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
  },

  // Edit Controls
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

  // Diagram Elements
  rootNode: {
    position: "absolute",
    backgroundColor: "#2563EB",
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 20,
  },
  rootTitle: { color: "white", fontWeight: "bold", fontSize: 14 },
  rootSubtitle: { color: "#DBEAFE", fontSize: 10 },

  // Modal
  modalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  modalLabel: { fontWeight: "bold", color: "#6B7280" },
});
