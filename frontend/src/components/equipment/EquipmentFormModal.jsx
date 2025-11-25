/*
 * =====================================================
 * 2. frontend/src/components/equipment/EquipmentFormModal.jsx
 * =====================================================
 * FIXED: Removed createPortal and black overlay.
 * Now renders as a pure card component to fit inside
 * the LabManagerDashboard's glass wrapper.
 */
import { useState, useEffect } from "react";
// REMOVED: import { createPortal } from "react-dom";
import { X } from "lucide-react";
import LoadingSpinner from "../common/LoadingSpinner";
import { useAuthStore } from "../../stores/authStore";
import api from "../../lib/axios";

// Department to equipment name mapping
const DEPARTMENT_EQUIPMENT_NAMES = {
  FITTER_MANUFACTURING: [
    { value: "BENCH_DRILLING_MACHINE", label: "Bench Drilling Machine" },
    { value: "ANGLE_GRINDER_PORTABLE", label: "Angle Grinder (Portable)" },
    {
      value: "MANUAL_ARC_WELDING_MACHINE",
      label: "Manual Arc Welding Machine",
    },
    { value: "GAS_WELDING_KIT", label: "Gas Welding Kit" },
    { value: "MIG_CO2_WELDING_MACHINE", label: "MIG/CO2 Welding Machine" },
  ],
  ELECTRICAL_ENGINEERING: [
    {
      value: "ELECTRICIAN_TRAINING_PANEL",
      label: "Electrician Training Panel",
    },
    {
      value: "ADVANCED_ELECTRICIAN_SETUP_PLC_VFD",
      label: "Advanced Electrician Setup (PLC/VFD)",
    },
    { value: "BENCH_DRILLING_MACHINE", label: "Bench Drilling Machine" },
  ],
  WELDING_FABRICATION: [
    {
      value: "ARC_WELDING_MACHINE_200_300A",
      label: "Arc Welding Machine (200-300A)",
    },
    {
      value: "GAS_WELDING_KIT_OXY_ACETYLENE",
      label: "Gas Welding Kit (Oxy-Acetylene)",
    },
    {
      value: "MIG_CO2_WELDING_MACHINE_250_400A",
      label: "MIG/CO2 Welding Machine (250-400A)",
    },
    { value: "VR_AR_WELDING_SIMULATOR", label: "VR/AR Welding Simulator" },
  ],
  TOOL_DIE_MAKING: [
    {
      value: "TOOL_DIE_EQUIPMENT_EDM_JIG_BORING",
      label: "Tool & Die Equipment (EDM/Jig Boring)",
    },
    { value: "PLANER_MACHINE", label: "Planer Machine" },
    {
      value: "GEAR_HOBBING_SHAPING_MACHINE",
      label: "Gear Hobbing/Shaping Machine",
    },
  ],
  ADDITIVE_MANUFACTURING: [
    { value: "THREE_D_PRINTER_FDM_RESIN", label: "3D Printer (FDM/Resin)" },
    {
      value: "LASER_ENGRAVING_CUTTING_MACHINE",
      label: "Laser Engraving/Cutting Machine",
    },
  ],
  SOLAR_INSTALLER_PV: [
    { value: "INVERTER_TRAINING_UNIT", label: "Inverter Training Unit" },
    {
      value: "DRILLING_MACHINE_AND_TOOLS",
      label: "Drilling Machine and Tools",
    },
  ],
  MATERIAL_TESTING_QUALITY: [
    { value: "TENSILE_TESTING_MACHINE", label: "Tensile Testing Machine" },
    {
      value: "COMPRESSION_TESTING_MACHINE",
      label: "Compression Testing Machine",
    },
    {
      value: "IMPACT_TESTING_MACHINE_CHARPY_IZOD",
      label: "Impact Testing Machine (Charpy/Izod)",
    },
    {
      value: "HARDNESS_TESTER_ROCKWELL_BRINELL_VICKERS",
      label: "Hardness Tester (Rockwell/Brinell/Vickers)",
    },
    { value: "OPTICAL_COMPARATOR", label: "Optical Comparator" },
    { value: "ENVIRONMENTAL_CHAMBER", label: "Environmental Chamber" },
  ],
  ADVANCED_MANUFACTURING_CNC: [
    {
      value: "CNC_VERTICAL_MACHINING_CENTER_3_4_AXIS",
      label: "CNC Vertical Machining Center (3/4 Axis)",
    },
    { value: "CNC_LATHE_2_AXIS", label: "CNC Lathe (2 Axis)" },
  ],
  AUTOMOTIVE_MECHANIC: [
    {
      value: "MOTOR_VEHICLE_TRAINING_MODEL",
      label: "Motor Vehicle Training Model",
    },
  ],
};

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

// Helper map from schema
const DEPARTMENT_FIELD_MAP = {
  FITTER_MANUFACTURING: "fitterEquipmentName",
  ELECTRICAL_ENGINEERING: "electricalEquipmentName",
  WELDING_FABRICATION: "weldingEquipmentName",
  TOOL_DIE_MAKING: "toolDieEquipmentName",
  ADDITIVE_MANUFACTURING: "additiveManufacturingEquipmentName",
  SOLAR_INSTALLER_PV: "solarInstallerEquipmentName",
  MATERIAL_TESTING_QUALITY: "materialTestingEquipmentName",
  ADVANCED_MANUFACTURING_CNC: "advancedManufacturingEquipmentName",
  AUTOMOTIVE_MECHANIC: "automotiveEquipmentName",
};

// Helper to get the correct equipmentName field from the equipment object
const getDepartmentFieldName = (department) => {
  return DEPARTMENT_FIELD_MAP[department] || null;
};

export default function EquipmentFormModal({
  isOpen,
  onClose,
  onSubmit,
  equipment = null,
}) {
  const { user } = useAuthStore();
  const isEditing = !!equipment;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [availableLabs, setAvailableLabs] = useState([]);

  // Get user's role and fixed attributes
  const isPolicyMaker = user.role === "POLICY_MAKER";
  const isLabManager = user.role === "LAB_MANAGER";
  const userInstitute = user.institute; // Lab Managers and Trainers have this
  const userDepartment = user.department; // Lab Managers have this

  const [formData, setFormData] = useState({
    equipmentId: "",
    name: "",
    // For Lab Manager, department is fixed. For Policy Maker, it's selectable.
    department: isLabManager ? userDepartment : "",
    equipmentName: "", // This is the new department-specific enum
    labId: "", // This will be the PUBLIC string labId
    manufacturer: "",
    model: "",
    serialNumber: "",
    purchaseDate: "",
    warrantyExpiry: "",
    specifications: "",
    imageUrl: "",
  });

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Populate form when editing
  useEffect(() => {
    if (equipment) {
      const departmentField = getDepartmentFieldName(equipment.department);
      const equipmentName = departmentField ? equipment[departmentField] : "";

      setFormData({
        equipmentId: equipment.equipmentId || "",
        name: equipment.name || "",
        department: equipment.department || "",
        equipmentName: equipmentName || "",
        labId: equipment.lab?.labId || "", // Use public labId from populated lab
        manufacturer: equipment.manufacturer || "",
        model: equipment.model || "",
        serialNumber: equipment.serialNumber || "",
        purchaseDate: equipment.purchaseDate
          ? new Date(equipment.purchaseDate).toISOString().split("T")[0]
          : "",
        warrantyExpiry: equipment.warrantyExpiry
          ? new Date(equipment.warrantyExpiry).toISOString().split("T")[0]
          : "",
        specifications: equipment.specifications
          ? JSON.stringify(equipment.specifications, null, 2)
          : "",
        imageUrl: equipment.imageUrl || "",
      });
    } else {
      // Reset form for "Add New"
      setFormData({
        equipmentId: "",
        name: "",
        department: isLabManager ? userDepartment : "",
        equipmentName: "",
        labId: "",
        manufacturer: "",
        model: "",
        serialNumber: "",
        purchaseDate: "",
        warrantyExpiry: "",
        specifications: "",
        imageUrl: "",
      });
    }
  }, [equipment, isOpen, isLabManager, userDepartment]);

  // Fetch available labs whenever the department changes
  useEffect(() => {
    if (formData.department) {
      fetchLabs(formData.department);
    } else {
      setAvailableLabs([]);
    }
  }, [formData.department, userInstitute]);

  const fetchLabs = async (department) => {
    try {
      const params = new URLSearchParams();
      if (isPolicyMaker) {
        // Logic for policy maker
      } else if (isLabManager) {
        params.append("institute", userInstitute);
      }
      params.append("department", department);

      const response = await api.get(`/labs?${params.toString()}`);
      setAvailableLabs(response.data.data || []);
    } catch (error) {
      console.error("Failed to fetch labs:", error);
      setError("Failed to load labs for the selected department.");
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (name === "department") {
      setFormData((prev) => ({
        ...prev,
        equipmentName: "",
        labId: "",
      }));
    }

    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const requiredFields = [
        "equipmentId",
        "name",
        "department",
        "labId",
        "manufacturer",
        "model",
        "purchaseDate",
      ];

      for (const field of requiredFields) {
        if (!formData[field]) {
          throw new Error(`Field "${field}" is required`);
        }
      }

      let specifications = null;
      if (formData.specifications) {
        try {
          specifications = JSON.parse(formData.specifications);
        } catch (err) {
          throw new Error("Invalid JSON in specifications field");
        }
      }

      const submitData = {
        ...formData,
        specifications,
        serialNumber: formData.serialNumber || undefined,
        warrantyExpiry: formData.warrantyExpiry || undefined,
        imageUrl: formData.imageUrl || undefined,
        equipmentName: formData.equipmentName || undefined,
      };

      if (isEditing) {
        const { equipmentId, ...updateData } = submitData;
        await onSubmit(equipment.id, updateData);
      } else {
        await onSubmit(submitData);
      }

      onClose();
    } catch (err) {
      setError(err.message || "Failed to save equipment");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const availableEquipmentNames =
    DEPARTMENT_EQUIPMENT_NAMES[formData.department] || [];

  // --- CHANGED HERE: Return pure card, no Portal, no Overlay ---
  return (
    <div
      className="bg-white rounded-lg shadow-xl w-full max-w-2xl flex flex-col max-h-[85vh]"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-white z-10 rounded-t-lg">
        <h2 className="text-xl font-semibold text-gray-900">
          {isEditing ? "Edit Equipment" : "Add New Equipment"}
        </h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          type="button"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Form Content - Scrollable */}
      <div className="overflow-y-auto p-6 space-y-4">
        <form id="equipment-form" onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Equipment ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Equipment ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="equipmentId"
              value={formData.equipmentId}
              onChange={handleChange}
              disabled={isEditing}
              placeholder="e.g., ITI-PUSA-MECH-01-CNC-001"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Unique identifier for this equipment (cannot be changed)
            </p>
          </div>

          {/* Equipment Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Equipment Display Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., CNC Vertical Machining Center"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Department */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Department <span className="text-red-500">*</span>
            </label>
            {isPolicyMaker ? (
              <select
                name="department"
                value={formData.department}
                onChange={handleChange}
                disabled={isEditing}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                required
              >
                <option value="">Select Department</option>
                {Object.entries(DEPARTMENT_DISPLAY_NAMES).map(
                  ([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  )
                )}
              </select>
            ) : (
              <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-100 text-gray-700">
                {DEPARTMENT_DISPLAY_NAMES[formData.department] ||
                  formData.department}
              </div>
            )}
          </div>

          {/* Equipment Type */}
          {availableEquipmentNames.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Equipment Type (Based on Department)
              </label>
              <select
                name="equipmentName"
                value={formData.equipmentName}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Type (Optional)</option>
                {availableEquipmentNames.map((eq) => (
                  <option key={eq.value} value={eq.value}>
                    {eq.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Lab */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Lab <span className="text-red-500">*</span>
            </label>
            <select
              name="labId"
              value={formData.labId}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              disabled={!formData.department || availableLabs.length === 0}
            >
              <option value="">
                {formData.department
                  ? "Select Lab"
                  : "Select a department first"}
              </option>
              {availableLabs.map((lab) => (
                <option key={lab.labId} value={lab.labId}>
                  {lab.name} ({lab.labId})
                </option>
              ))}
            </select>
            {availableLabs.length === 0 && formData.department && (
              <p className="text-xs text-red-500 mt-1">
                No labs found for this department. Please add a lab first.
              </p>
            )}
          </div>

          {/* Manufacturer & Model */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Manufacturer <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="manufacturer"
                value={formData.manufacturer}
                onChange={handleChange}
                placeholder="e.g., Siemens"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Model <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="model"
                value={formData.model}
                onChange={handleChange}
                placeholder="e.g., S7-1200"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          {/* Serial Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Serial Number
            </label>
            <input
              type="text"
              name="serialNumber"
              value={formData.serialNumber}
              onChange={handleChange}
              placeholder="e.g., SN123456789"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Purchase Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="purchaseDate"
                value={formData.purchaseDate}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Warranty Expiry
              </label>
              <input
                type="date"
                name="warrantyExpiry"
                value={formData.warrantyExpiry}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Image URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Image URL
            </label>
            <input
              type="url"
              name="imageUrl"
              value={formData.imageUrl}
              onChange={handleChange}
              placeholder="https://example.com/image.jpg"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Specifications */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Specifications (JSON)
            </label>
            <textarea
              name="specifications"
              value={formData.specifications}
              onChange={handleChange}
              rows={4}
              placeholder='{"power": "5kW", "voltage": "380V"}'
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter specifications in JSON format
            </p>
          </div>
        </form>
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-white rounded-b-lg">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          disabled={isLoading}
        >
          Cancel
        </button>
        {/* Trigger form submission from outside the form element */}
        <button
          type="submit"
          form="equipment-form"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isLoading}
        >
          {isLoading && <LoadingSpinner size="sm" />}
          {isEditing ? "Update Equipment" : "Add Equipment"}
        </button>
      </div>
    </div>
  );
}
