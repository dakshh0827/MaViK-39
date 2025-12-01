/*
 * =====================================================
 * frontend/src/components/admin/LabManagerForm.jsx
 * =====================================================
 */
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { FaTimes } from "react-icons/fa";
import LoadingSpinner from "../common/LoadingSpinner";
import { useLabStore } from "../../stores/labStore";
import { useInstituteStore } from "../../stores/instituteStore";

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

export default function LabManagerForm({ isOpen, onClose, labToEdit = null }) {
  const { createLab, updateLab, isLoading } = useLabStore();
  const {
    institutes,
    fetchInstitutes,
    isLoading: institutesLoading,
  } = useInstituteStore();

  const isEditing = !!labToEdit;
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    labId: "",
    name: "",
    instituteId: "",
    department: "",
  });

  const hasFetchedRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      if (!hasFetchedRef.current) {
        fetchInstitutes(true);
        hasFetchedRef.current = true;
      }
      if (labToEdit) {
        setFormData({
          labId: labToEdit.labId,
          name: labToEdit.name,
          instituteId: labToEdit.instituteId,
          department: labToEdit.department,
        });
      } else {
        setFormData({
          labId: "",
          name: "",
          instituteId: "",
          department: "",
        });
      }
      setError("");
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen, labToEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      if (isEditing) {
        const { name, instituteId, department } = formData;
        await updateLab(labToEdit.labId, { name, instituteId, department });
      } else {
        await createLab(formData);
      }
      onClose();
    } catch (err) {
      setError(err.message || "An unknown error occurred.");
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-50 p-4 transition-all animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <h2 className="text-xl font-semibold text-gray-900">
            {isEditing ? "Edit Lab" : "Create New Lab"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            type="button"
          >
            <FaTimes className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Institute <span className="text-red-500">*</span>
            </label>
            <select
              name="instituteId"
              value={formData.instituteId}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              disabled={institutesLoading}
            >
              <option value="">
                {institutesLoading
                  ? "Loading institutes..."
                  : "Select Institute"}
              </option>
              {institutes.map((inst) => (
                <option key={inst.id} value={inst.instituteId}>
                  {inst.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Department <span className="text-red-500">*</span>
            </label>
            <select
              name="department"
              value={formData.department}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Select Department</option>
              {Object.entries(DEPARTMENT_DISPLAY_NAMES).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Lab Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., Fitter Workshop 1"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Lab ID (Public) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="labId"
              value={formData.labId}
              onChange={handleChange}
              disabled={isEditing}
              placeholder="e.g., ITI-PUSA-FITTER-01"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Must be unique. Cannot be changed after creation.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 sticky bottom-0 bg-white">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading && <LoadingSpinner size="sm" />}
              {isEditing ? "Update Lab" : "Create Lab"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}