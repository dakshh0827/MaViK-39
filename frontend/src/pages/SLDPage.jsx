/*
 * =====================================================
 * frontend/src/pages/SLDPage.jsx
 * =====================================================
 */
import { useEffect, useState, useMemo } from "react";
import { useAuthStore } from "../stores/authStore";
import { useLabStore } from "../stores/labStore";
import { useEquipmentStore } from "../stores/equipmentStore";
import { useInstituteStore } from "../stores/instituteStore";
import { useSLDLayoutStore } from "../stores/sldLayoutStore";
import LoadingSpinner from "../components/common/LoadingSpinner";
import EquipmentNodeComponent from "../components/sld/EquipmentNode";
import {
  FaFilter,
  FaExclamationCircle,
  FaEdit,
  FaSave,
  FaTimes,
  FaPlus,
  FaMinus,
  FaGripVertical,
  FaColumns,
  FaMicroscope,
} from "react-icons/fa";

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

const STATUS_COLORS = {
  OPERATIONAL: "bg-emerald-500",
  IN_USE: "bg-blue-500",
  IN_CLASS: "bg-purple-500",
  IDLE: "bg-gray-400",
  MAINTENANCE: "bg-amber-500",
  FAULTY: "bg-red-500",
  OFFLINE: "bg-slate-500",
  WARNING: "bg-orange-500",
};

const NODE_WIDTH = 140;
const NODE_HEIGHT = 100;
const COLUMN_WIDTH = 200;
const ROW_HEIGHT = 160;

export default function SLDPage() {
  const { user } = useAuthStore();
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
  const [selectedLab, setSelectedLab] = useState("all");
  const [isInitialized, setIsInitialized] = useState(false);

  const [numColumns, setNumColumns] = useState(3);
  const [isEditMode, setIsEditMode] = useState(false);
  const [equipmentPositions, setEquipmentPositions] = useState({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // =========================================================
  // =========================================================
  // 1. TRAINER INITIALIZATION - Separate useEffect
  // =========================================================
  useEffect(() => {
    const initializeTrainer = async () => {
      if (!user || user.role !== "TRAINER") return;

      const trainerLabId = user.lab?.labId;
      console.log("Trainer initialization - Lab ID:", trainerLabId);

      if (!trainerLabId) {
        console.warn("Trainer has no lab assigned");
        setIsInitialized(true);
        return;
      }

      try {
        setIsInitialized(false);

        // Set the selected lab
        setSelectedLab(trainerLabId);

        // Fetch equipment
        console.log("Fetching equipment for trainer lab:", trainerLabId);
        await fetchEquipment({ labId: trainerLabId });

        // Small delay to ensure equipment state is updated
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Fetch layout
        console.log("Fetching layout for trainer lab:", trainerLabId);
        const layout = await fetchLayout(trainerLabId);

        if (
          layout &&
          layout.positions &&
          Object.keys(layout.positions).length > 0
        ) {
          console.log("Layout loaded:", layout);
          setEquipmentPositions(layout.positions);
          setNumColumns(layout.numColumns || 4);
        } else {
          console.log("No saved layout, will use defaults");
          setEquipmentPositions({});
        }

        setIsInitialized(true);
        console.log("Trainer initialization complete");
      } catch (error) {
        console.error("Error initializing trainer data:", error);
        setIsInitialized(true);
      }
    };

    initializeTrainer();
  }, [user]); // Only depend on user

  // =========================================================
  // 2. NON-TRAINER INITIALIZATION
  // =========================================================
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
  }, [user]);

  // =========================================================
  // 3. DATA FETCHING FOR NON-TRAINERS (Lab Selection Change)
  // =========================================================
  useEffect(() => {
    // Skip if trainer or no specific lab selected
    if (
      !user ||
      user.role === "TRAINER" ||
      !selectedLab ||
      selectedLab === "all"
    ) {
      return;
    }

    const fetchLabData = async () => {
      try {
        console.log("Fetching data for selected lab:", selectedLab);
        await fetchEquipment({ labId: selectedLab });

        const layout = await fetchLayout(selectedLab);
        if (
          layout &&
          layout.positions &&
          Object.keys(layout.positions).length > 0
        ) {
          setEquipmentPositions(layout.positions);
          setNumColumns(layout.numColumns || 4);
        } else {
          setEquipmentPositions({});
        }
      } catch (error) {
        console.error("Error fetching lab data:", error);
        setEquipmentPositions({});
      }
    };

    fetchLabData();
  }, [selectedLab]);

  // =========================================================
  // 4. INITIALIZE DEFAULT POSITIONS WHEN EQUIPMENT LOADS
  // =========================================================
  useEffect(() => {
    // Only initialize if we have equipment and no positions set
    if (!equipment || equipment.length === 0) return;
    if (Object.keys(equipmentPositions).length > 0) return;

    console.log("Initializing default positions for equipment");
    initializeDefaultPositions();
  }, [equipment]);

  // =========================================================
  // 3. COMPUTED VALUES (For Filters & Display)
  // =========================================================

  // Name of the lab being viewed (for Header)
  const currentLabName = useMemo(() => {
    if (user.role === "TRAINER") return user.lab?.name || "Assigned Lab";

    const labObj = labs.find((l) => l.labId === selectedLab);
    return labObj ? labObj.name : "";
  }, [user, labs, selectedLab]);

  // Filter Logic (Only for Non-Trainers)
  const availableInstitutes = useMemo(() => {
    if (user.role === "POLICY_MAKER") return institutes;
    if (user.role === "LAB_MANAGER")
      return institutes.filter((inst) => inst.instituteId === user.instituteId);
    return [];
  }, [institutes, user]);

  const availableDepartments = useMemo(() => {
    if (user.role === "LAB_MANAGER") return [user.department];
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
    if (user.role === "LAB_MANAGER") {
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

  // =========================================================
  // 4. LAYOUT & INTERACTION LOGIC
  // =========================================================
  const initializeDefaultPositions = () => {
    if (!equipment || equipment.length === 0) return;

    const defaultPositions = {};
    const cols = numColumns;

    equipment.forEach((eq, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      defaultPositions[eq.id] = { column: col, row };
    });

    console.log("Default positions created:", defaultPositions);
    setEquipmentPositions(defaultPositions);
  };

  const saveLayout = async () => {
    try {
      setIsSaving(true);
      await updateLayout(selectedLab, {
        numColumns,
        positions: equipmentPositions,
      });
      setHasUnsavedChanges(false);
      alert("Layout saved successfully!");
    } catch (error) {
      console.error("Failed to save layout:", error);
      alert(error.response?.data?.message || "Failed to save layout");
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

  const toggleEditMode = () => {
    if (isEditMode && hasUnsavedChanges) {
      if (
        window.confirm(
          "You have unsaved changes. Do you want to save before exiting?"
        )
      ) {
        saveLayout();
      }
    }
    setIsEditMode(!isEditMode);
  };

  const adjustColumns = (delta) => {
    const newCols = Math.max(1, Math.min(8, numColumns + delta));
    setNumColumns(newCols);
    setHasUnsavedChanges(true);

    // Recalculate positions based on new column count to keep order
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

  const getEdgeColor = (status) => {
    switch (status) {
      case "OPERATIONAL":
        return "#10B981";
      case "IN_USE":
        return "#3B82F6";
      case "IN_CLASS":
        return "#8B5CF6";
      case "MAINTENANCE":
        return "#F59E0B";
      case "FAULTY":
        return "#EF4444";
      case "WARNING":
        return "#F97316";
      default:
        return "#CBD5E1";
    }
  };

  const generateLayout = () => {
    if (selectedLab === "all" || equipment.length === 0) {
      return { nodes: [], connections: [], totalWidth: 0, totalHeight: 0 };
    }

    const positions = { ...equipmentPositions };
    equipment.forEach((eq, index) => {
      if (!positions[eq.id]) {
        const col = index % numColumns;
        const row = Math.floor(index / numColumns);
        positions[eq.id] = { column: col, row };
      }
    });

    const maxRow = Math.max(...Object.values(positions).map((p) => p.row), 0);
    const totalWidth = numColumns * COLUMN_WIDTH;
    const totalHeight = (maxRow + 1) * ROW_HEIGHT;

    const rootX = (totalWidth - 280) / 2;
    const rootY = 0;

    const nodes = equipment.map((eq) => {
      const pos = positions[eq.id] || { column: 0, row: 0 };
      const x = pos.column * COLUMN_WIDTH + (COLUMN_WIDTH - NODE_WIDTH) / 2;
      const y = rootY + 180 + pos.row * ROW_HEIGHT;

      return {
        equipment: eq,
        x,
        y,
        column: pos.column,
        row: pos.row,
      };
    });

    const connections = nodes.map((node) => {
      const startX = rootX + 140;
      const startY = rootY + 100;
      const endX = node.x + NODE_WIDTH / 2;
      const endY = node.y;

      return {
        startX,
        startY,
        endX,
        endY,
        color: getEdgeColor(node.equipment.status?.status),
        animated:
          node.equipment.status?.status === "IN_USE" ||
          node.equipment.status?.status === "IN_CLASS",
      };
    });

    return {
      nodes,
      connections,
      rootX,
      rootY,
      totalWidth,
      totalHeight: rootY + 180 + totalHeight,
    };
  };

  const layout = generateLayout();

  // Handlers for Managers/Policy Makers
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
    if (isEditMode && hasUnsavedChanges) {
      if (
        !window.confirm(
          "You have unsaved changes. Are you sure you want to switch labs?"
        )
      )
        return;
    }
    setSelectedLab(e.target.value);
    setIsEditMode(false);
    setHasUnsavedChanges(false);
  };

  const isLoading =
    user?.role === "TRAINER"
      ? !isInitialized
      : labsLoading || equipmentLoading || institutesLoading || layoutLoading;
  const canEdit = user.role === "LAB_MANAGER";

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Single Line Diagram (SLD)
          </h1>
          {/* TRAINER VIEW: Static Lab Name */}
          {user.role === "TRAINER" && (
            <p className="text-gray-500 mt-1 flex items-center gap-2 animate-fadeIn">
              <FaMicroscope className="text-blue-500" />
              Viewing:{" "}
              <span className="font-semibold text-gray-700">
                {currentLabName}
              </span>
            </p>
          )}
        </div>

        {/* ACTION BUTTONS (Only for Managers) */}
        {canEdit && selectedLab !== "all" && equipment.length > 0 && (
          <div className="flex gap-2">
            {isEditMode ? (
              <>
                <button
                  onClick={saveLayout}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 disabled:opacity-50"
                  disabled={!hasUnsavedChanges || isSaving}
                >
                  <FaSave className="w-4 h-4" />
                  {isSaving ? "Saving..." : "Save Layout"}
                </button>
                <button
                  onClick={toggleEditMode}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
                  disabled={isSaving}
                >
                  <FaTimes className="w-4 h-4" />
                  Exit Edit
                </button>
              </>
            ) : (
              <button
                onClick={toggleEditMode}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <FaEdit className="w-4 h-4" />
                Edit Layout
              </button>
            )}
          </div>
        )}
      </div>

      {/* FILTER SECTION - COMPLETELY HIDDEN FOR TRAINERS */}
      {user.role !== "TRAINER" && (
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <FaFilter className="w-5 h-5 text-gray-600" />
            <h3 className="font-semibold text-gray-900">Select Lab</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {user.role === "POLICY_MAKER" && (
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
            )}

            {user.role === "POLICY_MAKER" && (
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
              <FaColumns className="w-5 h-5 text-blue-600" />
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
                <FaMinus className="w-4 h-4" />
              </button>
              <button
                onClick={() => adjustColumns(1)}
                className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                disabled={numColumns >= 8}
              >
                <FaPlus className="w-4 h-4" />
              </button>
            </div>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Click on equipment badges (C# R#) to change their position in the
            flowchart
          </p>
          {hasUnsavedChanges && (
            <p className="text-sm text-amber-600 mt-1 font-medium">
              ⚠ You have unsaved changes
            </p>
          )}
        </div>
      )}

      {/* LEGEND */}
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
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg shadow-sm border border-gray-200 p-8 overflow-auto">
        {isLoading ? (
          <div className="flex justify-center items-center min-h-[600px]">
            <LoadingSpinner size="lg" />
          </div>
        ) : user?.role === "TRAINER" && !user?.lab?.labId ? (
          <div className="flex flex-col items-center justify-center min-h-[600px] text-gray-500">
            <FaExclamationCircle className="w-16 h-16 text-red-300 mb-4" />
            <p className="text-lg">No Lab Assigned</p>
            <p className="text-sm text-gray-400 mt-2">
              Please contact your administrator.
            </p>
          </div>
        ) : selectedLab === "all" ? (
          <div className="flex flex-col items-center justify-center min-h-[600px] text-gray-500">
            <FaExclamationCircle className="w-16 h-16 text-gray-300 mb-4" />
            <p className="text-lg">
              Please select a lab to view equipment layout
            </p>
          </div>
        ) : equipment.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[600px] text-gray-500">
            <FaExclamationCircle className="w-16 h-16 text-gray-300 mb-4" />
            <p className="text-lg">No equipment found in this lab</p>
            <p className="text-sm text-gray-400 mt-2">
              {user?.role === "TRAINER"
                ? "Your lab has no equipment registered yet."
                : "Try selecting a different lab"}
            </p>
          </div>
        ) : (
          <div
            className="relative mx-auto"
            style={{
              width: `${layout.totalWidth + 100}px`,
              minHeight: `${layout.totalHeight + 100}px`,
            }}
          >
            {/* GRID LINES (Edit Mode) */}
            {isEditMode && (
              <svg
                className="absolute top-0 left-0 pointer-events-none"
                style={{ width: "100%", height: "100%" }}
              >
                {Array.from({ length: numColumns }).map((_, i) => {
                  const x = i * COLUMN_WIDTH + COLUMN_WIDTH / 2 + 50;
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

            {/* ROOT NODE (Lab Name) */}
            <div
              className="absolute"
              style={{
                left: `${layout.rootX + 50}px`,
                top: `${layout.rootY + 50}px`,
              }}
            >
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg shadow-lg p-4 w-[280px]">
                <div className="text-center">
                  <h3 className="font-bold text-lg">{currentLabName}</h3>
                  <div className="mt-2 pt-2 border-t border-blue-400">
                    <p className="text-sm font-semibold">
                      Total Equipment: {equipment.length}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* CONNECTION LINES */}
            <svg
              className="absolute pointer-events-none"
              style={{ width: "100%", height: "100%", top: 0, left: 0 }}
            >
              <defs>
                {layout.connections.map((conn, index) => (
                  <marker
                    key={`marker-${index}`}
                    id={`arrowhead-${index}`}
                    markerWidth="10"
                    markerHeight="10"
                    refX="9"
                    refY="3"
                    orient="auto"
                  >
                    <polygon points="0 0, 10 3, 0 6" fill={conn.color} />
                  </marker>
                ))}
              </defs>

              {layout.connections.map((conn, index) => {
                const midY = (conn.startY + 50 + conn.endY + 50) / 2;
                return (
                  <g key={index}>
                    <path
                      d={`M ${conn.startX + 50} ${conn.startY + 50} 
                          L ${conn.startX + 50} ${midY} 
                          L ${conn.endX + 50} ${midY} 
                          L ${conn.endX + 50} ${conn.endY + 50}`}
                      stroke={conn.color}
                      strokeWidth="2"
                      fill="none"
                      markerEnd={`url(#arrowhead-${index})`}
                      className={conn.animated ? "animate-pulse" : ""}
                    />
                  </g>
                );
              })}
            </svg>

            {/* EQUIPMENT NODES */}
            {layout.nodes.map((node) => (
              <EquipmentNode
                key={node.equipment.id}
                node={node}
                isEditMode={isEditMode}
                numColumns={numColumns}
                onPositionChange={handlePositionChange}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ... (keep all existing imports and the main SLDPage component unchanged)

// Scroll down to the helper component at the bottom of the file to apply the fix
function EquipmentNode({ node, isEditMode, numColumns, onPositionChange }) {
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
      className="absolute"
      style={{
        left: `${node.x + 50}px`,
        top: `${node.y + 50}px`,
      }}
    >
      <div className="relative">
        {isEditMode && (
          <div
            className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-2 py-1 rounded text-xs cursor-pointer hover:bg-blue-700 flex items-center gap-1 shadow-md z-10"
            onClick={handleBadgeClick}
          >
            <FaGripVertical className="w-3 h-3" />C{node.column + 1} R
            {node.row + 1}
          </div>
        )}

        <EquipmentNodeComponent data={{ equipment: node.equipment }} />

        {showPositionPicker && (
          <div
            // UPDATED FIX: Using 'bg-black/40' combined syntax for reliable translucency
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
                  <FaTimes className="w-5 h-5" />
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
