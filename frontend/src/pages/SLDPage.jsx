/*
 * =====================================================
 * frontend/src/pages/SLDPage.jsx - WITH FAULTY EQUIPMENT SUPPORT
 * =====================================================
 */
import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useAuthStore } from "../stores/authStore";
import { useLabStore } from "../stores/labStore";
import { useEquipmentStore } from "../stores/equipmentStore";
import { useInstituteStore } from "../stores/instituteStore";
import { useSLDLayoutStore } from "../stores/sldLayoutStore";
import io from "socket.io-client";
import LoadingSpinner from "../components/common/LoadingSpinner";
import EquipmentNodeComponent from "../components/sld/EquipmentNode";
import {
  Filter,
  AlertCircle,
  Edit,
  Save,
  X,
  Plus,
  Minus,
  GripVertical,
  Columns,
  Microscope,
  Wifi,
  WifiOff,
} from "lucide-react";

const DEPARTMENT_DISPLAY_NAMES = {
  FITTER_MANUFACTURING: "Fitter/Manufacturing",
  ELECTRICAL_ENGINEERING: "Electrical Engineering",
  WELDING_FABRICATION: "Welding & Fabrication",
  TOOL_DIE_MAKING: "Tool & Die Making",
  ADDITIVE_MANUFACTURING: "Additive Manufacturing",
  SOLAR_INSTALLER_PV: "Solar Installer (PV)",
  MATERIAL_TESTING_QUALITY: "Material Testing/Quality",
  ADVANCED_MANUFACTURING_CNC: "Advanced Manufacturing/CNC",
  AUTOMOTIVE_MECHANIC: "Automotive/Mechanic",
};

// UPDATED: Added FAULTY status with red color
const STATUS_COLORS = {
  OPERATIONAL: "bg-emerald-500",
  IN_USE: "bg-blue-500",
  IDLE: "bg-gray-400",
  FAULTY: "bg-red-500", // NEW
};

// --- LAYOUT CONSTANTS ---
const NODE_WIDTH = 140;
const COLUMN_WIDTH = 200;
const ROW_HEIGHT = 180;
const ROOT_WIDTH = 280;
const ROOT_HEIGHT = 100;
const CANVAS_PADDING = 50;
const BUS_OFFSET = 40;

export default function SLDPage() {
  const { user, isLoading: authLoading } = useAuthStore();
  const { labs, fetchLabs, isLoading: labsLoading } = useLabStore();
  const {
    equipment,
    fetchEquipment,
    isLoading: equipmentLoading,
  } = useEquipmentStore();
  const {
    institutes,
    fetchInstitutes,
    isLoading: institutesLoading,
  } = useInstituteStore();
  const {
    fetchLayout,
    updateLayout,
    isLoading: layoutLoading,
  } = useSLDLayoutStore();

  const [selectedInstitute, setSelectedInstitute] = useState("all");
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [selectedLab, setSelectedLab] = useState(() => {
    if (user?.role === "TRAINER") {
      return (
        user.lab?.labId ||
        user.labId ||
        (user.labs && user.labs[0]?.labId) ||
        "all"
      );
    }
    return "all";
  });
  const [isInitialized, setIsInitialized] = useState(false);

  const [numColumns, setNumColumns] = useState(3);
  const [isEditMode, setIsEditMode] = useState(false);
  const [equipmentPositions, setEquipmentPositions] = useState({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // NEW: Socket state
  const [socket, setSocket] = useState(null);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [liveEquipmentData, setLiveEquipmentData] = useState({});

  const trainerInitializedRef = useRef(false);

  // --- SOCKET.IO CONNECTION ---
  useEffect(() => {
    console.log('🔌 [SLD] Setting up Socket.IO connection...');

    let token = null;
    try {
      const authStorage = localStorage.getItem('auth-storage');
      if (authStorage) {
        const parsed = JSON.parse(authStorage);
        token = parsed?.state?.accessToken;
      }
    } catch (e) {
      console.error('❌ [SLD] Failed to parse auth token:', e);
    }

    if (!token) {
      console.error('❌ [SLD] No access token found');
      return;
    }

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const socketUrl = apiUrl.replace('/api', '');
    
    const socketInstance = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketInstance.on('connect', () => {
      console.log('✅ [SLD] Socket.IO connected!', socketInstance.id);
      setIsSocketConnected(true);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('❌ [SLD] Socket.IO disconnected:', reason);
      setIsSocketConnected(false);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('❌ [SLD] Socket.IO connection error:', error.message);
      setIsSocketConnected(false);
    });

    // Listen for equipment status updates
    socketInstance.on('equipment:status', (data) => {
      console.log('📡 [SLD] Equipment status update:', data);
      handleEquipmentUpdate(data);
    });

    socketInstance.on('equipment:status:update', (data) => {
      console.log('📡 [SLD] Equipment status update (alt):', data);
      handleEquipmentUpdate(data.status || data);
    });

    setSocket(socketInstance);

    return () => {
      console.log('🔌 [SLD] Cleaning up Socket.IO connection');
      socketInstance.removeAllListeners();
      socketInstance.disconnect();
    };
  }, []);

  // --- HANDLE LIVE EQUIPMENT UPDATES ---
  const handleEquipmentUpdate = (data) => {
    const equipmentId = data.equipmentId || data.id;
    
    if (!equipmentId) {
      console.warn('⚠️ [SLD] No equipmentId in update data', data);
      return;
    }

    console.log('🔄 [SLD] Updating equipment:', equipmentId, 'Status:', data.status);

    // Update live data state
    setLiveEquipmentData((prev) => ({
      ...prev,
      [equipmentId]: {
        ...data,
        updatedAt: new Date(),
      },
    }));
  };

  // --- Merge live data with equipment list ---
  const equipmentWithLiveData = useMemo(() => {
    if (!equipment || equipment.length === 0) return [];

    return equipment.map((eq) => {
      const liveData = liveEquipmentData[eq.id];
      if (!liveData) return eq;

      // Merge live data
      return {
        ...eq,
        status: {
          ...eq.status,
          status: liveData.status || eq.status?.status,
          temperature: liveData.temperature ?? eq.status?.temperature,
          vibration: liveData.vibration ?? eq.status?.vibration,
          energyConsumption: liveData.energyConsumption ?? eq.status?.energyConsumption,
          healthScore: liveData.healthScore ?? eq.status?.healthScore,
        },
      };
    });
  }, [equipment, liveEquipmentData]);

  // --- DATA LOADING LOGIC ---
  const loadLabData = useCallback(
    async (labId) => {
      if (!labId || labId === "all") return;
      try {
        const equipmentData = await fetchEquipment({ labId, limit: 1000 });
        
        const eqCount = equipmentData?.data?.length || 0;
        const defaultColumns =
          eqCount > 0 ? Math.max(1, Math.min(4, eqCount)) : 3;
        const defaultPositions = {};

        if (equipmentData?.data && equipmentData.data.length > 0) {
          equipmentData.data.forEach((eq, index) => {
            const col = index % defaultColumns;
            const row = Math.floor(index / defaultColumns);
            defaultPositions[eq.id] = { column: col, row };
          });
        }

        setEquipmentPositions(defaultPositions);
        setNumColumns(defaultColumns);

        try {
          const layout = await fetchLayout(labId);
          if (
            layout &&
            layout.positions &&
            Object.keys(layout.positions).length > 0
          ) {
            setEquipmentPositions(layout.positions);
            setNumColumns(layout.numColumns || defaultColumns);
          }
        } catch (layoutError) {
          console.warn("Layout fetch failed, using defaults");
        }
      } catch (error) {
        console.error("Error fetching lab data:", error);
        setEquipmentPositions({});
      }
    },
    [fetchEquipment, fetchLayout]
  );

  useEffect(() => {
    if (user?.role === "TRAINER") {
      const labId =
        user.lab?.labId || user.labId || (user.labs && user.labs[0]?.labId);
      if (labId && selectedLab !== labId) {
        setSelectedLab(labId);
      }
    }
  }, [user, selectedLab]);

  useEffect(() => {
    const initializeTrainer = async () => {
      if (authLoading) return;
      if (!user || user.role !== "TRAINER") {
        setIsInitialized(true);
        return;
      }
      const trainerLabId =
        user.lab?.labId || user.labId || (user.labs && user.labs[0]?.labId);

      if (!trainerLabId) {
        setIsInitialized(true);
        return;
      }
      if (
        trainerInitializedRef.current &&
        selectedLab === trainerLabId &&
        equipment.length > 0
      ) {
        setIsInitialized(true);
        return;
      }
      try {
        setIsInitialized(false);
        trainerInitializedRef.current = true;
        await loadLabData(trainerLabId);
        setIsInitialized(true);
      } catch (error) {
        console.error("Error initializing trainer data:", error);
        setIsInitialized(true);
        trainerInitializedRef.current = false;
      }
    };
    initializeTrainer();
  }, [user, authLoading, equipment.length, loadLabData]);

  useEffect(() => {
    if (!user || user.role !== "TRAINER") {
      trainerInitializedRef.current = false;
    }
  }, [user]);

  useEffect(() => {
    const initializeOtherRoles = async () => {
      if (!user || user.role === "TRAINER") return;
      try {
        if (user.role === "POLICY_MAKER") {
          await fetchInstitutes();
        }
        await fetchLabs();
      } catch (error) {
        console.error("Failed to load filter data:", error);
      }
    };
    initializeOtherRoles();
  }, [user, fetchInstitutes, fetchLabs]);

  useEffect(() => {
    if (
      !user ||
      user.role === "TRAINER" ||
      !selectedLab ||
      selectedLab === "all"
    ) {
      return;
    }
    loadLabData(selectedLab);
  }, [selectedLab, user, loadLabData]);

  const currentLabName = useMemo(() => {
    if (user?.role === "TRAINER") return user.lab?.name || "Assigned Lab";
    const labObj = labs.find((l) => l.labId === selectedLab);
    return labObj ? labObj.name : "";
  }, [user, labs, selectedLab]);

  const availableInstitutes = useMemo(() => {
    if (user?.role === "POLICY_MAKER") return institutes;
    if (user?.role === "LAB_MANAGER")
      return institutes.filter((inst) => inst.instituteId === user.instituteId);
    return [];
  }, [institutes, user]);

  const availableDepartments = useMemo(() => {
    if (user?.role === "LAB_MANAGER") return [user.department];
    let filteredLabs = labs;
    if (selectedInstitute !== "all") {
      filteredLabs = labs.filter(
        (lab) => lab.instituteId === selectedInstitute
      );
    }
    return [...new Set(filteredLabs.map((lab) => lab.department))].sort();
  }, [labs, selectedInstitute, user]);

  const availableLabs = useMemo(() => {
    let filteredLabs = labs;
    if (user?.role === "LAB_MANAGER") {
      filteredLabs = labs.filter(
        (lab) =>
          lab.instituteId === user.instituteId &&
          lab.department === user.department
      );
    } else {
      if (selectedInstitute !== "all")
        filteredLabs = filteredLabs.filter(
          (lab) => lab.instituteId === selectedInstitute
        );
      if (selectedDepartment !== "all")
        filteredLabs = filteredLabs.filter(
          (lab) => lab.department === selectedDepartment
        );
    }
    return filteredLabs;
  }, [labs, selectedInstitute, selectedDepartment, user]);

  // --- Layout Actions ---
  const saveLayout = async () => {
    try {
      setIsSaving(true);
      await updateLayout(selectedLab, {
        numColumns,
        positions: equipmentPositions,
      });
      setHasUnsavedChanges(false);
      console.log("Layout saved successfully!");
    } catch (error) {
      console.error("Failed to save layout:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePositionChange = (equipmentId, newColumn, newRow) => {
    setEquipmentPositions((prev) => ({
      ...prev,
      [equipmentId]: { column: newColumn, row: newRow },
    }));
    setHasUnsavedChanges(true);
  };

  const toggleEditMode = async () => {
    if (isEditMode) {
      if (hasUnsavedChanges) {
        console.log("Discarding changes, reloading layout...");
        await loadLabData(selectedLab);
        setHasUnsavedChanges(false);
      }
    }
    setIsEditMode(!isEditMode);
  };

  const adjustColumns = (delta) => {
    const newCols = Math.max(1, Math.min(8, numColumns + delta));
    setNumColumns(newCols);
    setHasUnsavedChanges(true);

    const updatedPositions = {};
    const equipmentIds = Object.keys(equipmentPositions);

    const sortedEquipment = equipmentIds.sort((a, b) => {
      const posA = equipmentPositions[a];
      const posB = equipmentPositions[b];
      if (posA.row !== posB.row) return posA.row - posB.row;
      return posA.column - posB.column;
    });

    sortedEquipment.forEach((eqId, index) => {
      const col = index % newCols;
      const row = Math.floor(index / newCols);
      updatedPositions[eqId] = { column: col, row };
    });

    setEquipmentPositions(updatedPositions);
  };

  const getEdgeColor = (rawStatus) => {
    const status = rawStatus ? rawStatus.toUpperCase() : "IDLE";
    if (status === "IN_CLASS") return "#3B82F6";
    switch (status) {
      case "OPERATIONAL":
        return "#10B981";
      case "IN_USE":
        return "#3B82F6";
      case "FAULTY": // NEW
        return "#EF4444";
      case "IDLE":
      default:
        return "#9CA3AF";
    }
  };

  // --- REVISED LAYOUT GENERATION (Using equipmentWithLiveData) ---
  const generateLayout = () => {
    if (selectedLab === "all" || equipmentWithLiveData.length === 0) {
      return { nodes: [], connections: [], totalWidth: 0, totalHeight: 0 };
    }

    const positions = { ...equipmentPositions };
    equipmentWithLiveData.forEach((eq, index) => {
      if (!positions[eq.id]) {
        const col = index % numColumns;
        const row = Math.floor(index / numColumns);
        positions[eq.id] = { column: col, row };
      }
    });

    const maxRow = Math.max(...Object.values(positions).map((p) => p.row), 0);
    const totalWidth = numColumns * COLUMN_WIDTH;

    const rootX = (totalWidth - ROOT_WIDTH) / 2;
    const rootY = 0;

    const equipmentStartY = rootY + ROOT_HEIGHT + 80;

    const nodes = equipmentWithLiveData.map((eq) => {
      const pos = positions[eq.id] || { column: 0, row: 0 };
      const x = pos.column * COLUMN_WIDTH + (COLUMN_WIDTH - NODE_WIDTH) / 2;
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

      const rawStatus = node.equipment.status?.status;
      const isAnimated = rawStatus === "IN_USE" || rawStatus === "IN_CLASS";

      return {
        startX,
        startY,
        busY,
        endX,
        endY,
        color: getEdgeColor(rawStatus),
        animated: isAnimated,
      };
    });

    return {
      nodes,
      connections,
      rootX,
      rootY,
      totalWidth,
      totalHeight: equipmentStartY + (maxRow + 1) * ROW_HEIGHT,
    };
  };

  const layout = generateLayout();

  const getSmoothPath = (x1, y1, busY, x2, y2) => {
    const sx = x1 + CANVAS_PADDING;
    const sy = y1 + CANVAS_PADDING;
    const by = busY + CANVAS_PADDING;
    const ex = x2 + CANVAS_PADDING;
    const ey = y2 + CANVAS_PADDING;

    const r = 12;

    if (Math.abs(sx - ex) < 1) {
      return `M ${sx} ${sy} L ${ex} ${ey}`;
    }

    const xDir = ex > sx ? 1 : -1;

    return `
      M ${sx} ${sy}
      L ${sx} ${by - r}
      Q ${sx} ${by} ${sx + r * xDir} ${by}
      L ${ex - r * xDir} ${by}
      Q ${ex} ${by} ${ex} ${by + r}
      L ${ex} ${ey}
    `;
  };

  const handleInstituteChange = (e) => {
    setSelectedInstitute(e.target.value);
    setSelectedDepartment("all");
    setSelectedLab("all");
  };

  const handleDepartmentChange = (e) => {
    setSelectedDepartment(e.target.value);
    setSelectedLab("all");
  };

  const handleLabChange = (e) => {
    setSelectedLab(e.target.value);
    setIsEditMode(false);
    setHasUnsavedChanges(false);
  };

  const isLoading =
    user?.role === "TRAINER"
      ? !isInitialized || equipmentLoading
      : labsLoading || equipmentLoading || institutesLoading;

  const canEdit = user?.role === "LAB_MANAGER";

  return (
    <div className="space-y-6">
      {/* HEADER & FILTERS */}
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">
              Single Line Diagram (SLD)
            </h1>
            {/* Connection Indicator */}
            {isSocketConnected ? (
              <span className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full border border-green-200">
                <Wifi className="w-3 h-3" />
                Live
              </span>
            ) : (
              <span className="flex items-center gap-2 px-3 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded-full border border-gray-200">
                <WifiOff className="w-3 h-3" />
                Offline
              </span>
            )}
          </div>
          {user?.role === "TRAINER" && (
            <p className="text-gray-500 mt-1 flex items-center gap-2 animate-fadeIn">
              <Microscope className="text-blue-500 w-5 h-5" />
              Viewing:{" "}
              <span className="font-semibold text-gray-700">
                {currentLabName}
              </span>
            </p>
          )}
        </div>
        {canEdit && selectedLab !== "all" && equipmentWithLiveData.length > 0 && (
          <div className="flex gap-2">
            {isEditMode ? (
              <>
                <button
                  onClick={saveLayout}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 disabled:opacity-50"
                  disabled={!hasUnsavedChanges || isSaving}
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? "Saving..." : "Save Layout"}
                </button>
                <button
                  onClick={toggleEditMode}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
                  disabled={isSaving}
                >
                  <X className="w-4 h-4" />
                  Exit Edit
                </button>
              </>
            ) : (
              <button
                onClick={toggleEditMode}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Edit className="w-4 h-4" />
                Edit Layout
              </button>
            )}
          </div>
        )}
      </div>

      {/* FILTER SECTION */}
      {user?.role !== "TRAINER" && (
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-gray-600" />
            <h3 className="font-semibold text-gray-900">Select Lab</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {user?.role === "POLICY_MAKER" && (
              <>
                <select
                  value={selectedInstitute}
                  onChange={handleInstituteChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isLoading}
                >
                  <option value="all">All Institutes</option>
                  {availableInstitutes.map((inst) => (
                    <option key={inst.id} value={inst.instituteId}>
                      {inst.name}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedDepartment}
                  onChange={handleDepartmentChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isLoading || availableDepartments.length === 0}
                >
                  <option value="all">All Departments</option>
                  {availableDepartments.map((dept) => (
                    <option key={dept} value={dept}>
                      {DEPARTMENT_DISPLAY_NAMES[dept] || dept}
                    </option>
                  ))}
                </select>
              </>
            )}
            <select
              value={selectedLab}
              onChange={handleLabChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading || availableLabs.length === 0}
            >
              <option value="all">Select a Lab</option>
              {availableLabs.map((lab) => (
                <option key={lab.labId} value={lab.labId}>
                  {lab.name} ({lab.labId})
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* EDIT CONTROLS */}
      {isEditMode && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Columns className="w-5 h-5 text-blue-600" />
              <span className="font-semibold text-gray-900">
                Layout Columns: {numColumns}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => adjustColumns(-1)}
                className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                disabled={numColumns <= 1}
              >
                <Minus className="w-4 h-4" />
              </button>
              <button
                onClick={() => adjustColumns(1)}
                className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                disabled={numColumns >= 8}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Click on equipment badges to change their position
          </p>
          {hasUnsavedChanges && (
            <p className="text-sm text-amber-600 mt-1 font-medium">
              ⚠ You have unsaved changes
            </p>
          )}
        </div>
      )}

      {/* LEGEND - UPDATED WITH FAULTY */}
      <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
        <h3 className="font-semibold text-gray-900 mb-3">Status Legend</h3>
        <div className="flex flex-wrap gap-4">
          {Object.entries(STATUS_COLORS).map(([status, colorClass]) => (
            <div key={status} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${colorClass}`}></div>
              <span className="text-sm text-gray-700">
                {status.replace(/_/g, " ")}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* CANVAS / DIAGRAM AREA */}
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg shadow-sm border border-gray-200 p-8 overflow-auto flex justify-center">
        {isLoading ? (
          <div className="flex justify-center items-center min-h-[600px] w-full">
            <LoadingSpinner size="lg" />
          </div>
        ) : selectedLab === "all" || equipmentWithLiveData.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[600px] w-full text-gray-500">
            <AlertCircle className="w-16 h-16 text-gray-300 mb-4" />
            <p className="text-lg">
              {equipmentWithLiveData.length === 0 && selectedLab !== "all"
                ? "No equipment found in this lab"
                : "Select a lab to view equipment layout"}
            </p>
          </div>
        ) : (
          <div
            className="relative"
            style={{
              width: `${layout.totalWidth + 100}px`,
              minHeight: `${layout.totalHeight + 100}px`,
            }}
          >
            {/* GRID LINES */}
            {isEditMode && (
              <svg
                className="absolute top-0 left-0 pointer-events-none z-0"
                style={{ width: "100%", height: "100%" }}
              >
                {Array.from({ length: numColumns }).map((_, i) => {
                  const x =
                    i * COLUMN_WIDTH + COLUMN_WIDTH / 2 + CANVAS_PADDING;
                  return (
                    <g key={i}>
                      <line
                        x1={x}
                        y1="0"
                        x2={x}
                        y2="100%"
                        stroke="#CBD5E1"
                        strokeWidth="1"
                        strokeDasharray="4,4"
                      />
                      <text
                        x={x}
                        y="30"
                        textAnchor="middle"
                        fill="#64748B"
                        fontSize="12"
                        fontWeight="600"
                      >
                        Col {i + 1}
                      </text>
                    </g>
                  );
                })}
              </svg>
            )}

            {/* ROOT NODE - Z-Index 10 to sit above lines */}
            <div
              className="absolute z-10"
              style={{
                left: `${layout.rootX + CANVAS_PADDING}px`,
                top: `${layout.rootY + CANVAS_PADDING}px`,
              }}
            >
              <div
                className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg shadow-lg p-4 flex flex-col justify-center"
                style={{ width: `${ROOT_WIDTH}px`, height: `${ROOT_HEIGHT}px` }}
              >
                <div className="text-center">
                  <h3 className="font-bold text-lg leading-tight">
                    {currentLabName}
                  </h3>
                  <div className="mt-2 pt-2 border-t border-blue-400">
                    <p className="text-sm font-semibold opacity-90">
                      Total Equipment: {equipment.length}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* CONNECTION LINES - Z-Index 0 to sit behind cards */}
            <svg
              className="absolute pointer-events-none z-0"
              style={{ width: "100%", height: "100%", top: 0, left: 0 }}
            >
              <defs>
                {layout.connections.map((conn, index) => (
                  <marker
                    key={`arrowhead-${index}`}
                    id={`arrowhead-${index}`}
                    markerWidth="8"
                    markerHeight="8"
                    refX="7"
                    refY="4"
                    orient="auto"
                  >
                    <path d="M0,0 L8,4 L0,8 L0,0" fill={conn.color} />
                  </marker>
                ))}
              </defs>

              {layout.connections.map((conn, index) => (
                <g key={index}>
                  <path
                    d={getSmoothPath(
                      conn.startX,
                      conn.startY,
                      conn.busY,
                      conn.endX,
                      conn.endY
                    )}
                    stroke={conn.color}
                    strokeWidth="2.5"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    markerEnd={`url(#arrowhead-${index})`}
                    className={`transition-all duration-300 ${
                      conn.animated ? "animate-pulse" : ""
                    }`}
                  />
                  <circle
                    cx={conn.startX + CANVAS_PADDING}
                    cy={conn.startY + CANVAS_PADDING}
                    r="3"
                    fill={conn.color}
                  />
                </g>
              ))}
            </svg>

            {/* EQUIPMENT NODES - Z-Index 10 */}
            {layout.nodes.map((node) => (
              <EquipmentNode
                key={node.equipment.id}
                node={node}
                isEditMode={isEditMode}
                numColumns={numColumns}
                onPositionChange={handlePositionChange}
                padding={CANVAS_PADDING}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EquipmentNode({
  node,
  isEditMode,
  numColumns,
  onPositionChange,
  padding,
}) {
  const [showPositionPicker, setShowPositionPicker] = useState(false);
  const [tempColumn, setTempColumn] = useState(node.column);
  const [tempRow, setTempRow] = useState(node.row);

  useEffect(() => {
    setTempColumn(node.column);
    setTempRow(node.row);
  }, [node.column, node.row]);

  const handleBadgeClick = (e) => {
    e.stopPropagation();
    if (isEditMode) {
      setTempColumn(node.column);
      setTempRow(node.row);
      setShowPositionPicker(true);
    }
  };

  const handleApplyPosition = () => {
    onPositionChange(node.equipment.id, tempColumn, tempRow);
    setShowPositionPicker(false);
  };

  return (
    <div
      className="absolute z-10"
      style={{
        left: `${node.x + padding}px`,
        top: `${node.y + padding}px`,
      }}
    >
      <div className="relative">
        {isEditMode && (
          <div
            className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-2 py-1 rounded text-xs cursor-pointer hover:bg-blue-700 flex items-center gap-1 shadow-md z-20"
            onClick={handleBadgeClick}
          >
            <GripVertical className="w-3 h-3" />C{node.column + 1} R
            {node.row + 1}
          </div>
        )}

        <EquipmentNodeComponent data={{ equipment: node.equipment }} />

        {/* Position Picker Modal */}
        {showPositionPicker && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm"
            onClick={() => setShowPositionPicker(false)}
          >
            <div
              className="bg-white rounded-lg shadow-2xl p-6 w-80 animate-fadeIn"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-semibold text-lg">Move Equipment</h4>
                <button
                  onClick={() => setShowPositionPicker(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  {node.equipment.name}
                </p>
                <p className="text-xs text-gray-500 font-mono">
                  {node.equipment.equipmentId}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Column
                  </label>
                  <select
                    value={tempColumn}
                    onChange={(e) => setTempColumn(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {Array.from({ length: numColumns }, (_, i) => (
                      <option key={i} value={i}>
                        Column {i + 1}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Row
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={tempRow}
                    onChange={(e) => setTempRow(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <button
                  onClick={handleApplyPosition}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
                >
                  Apply Position
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}