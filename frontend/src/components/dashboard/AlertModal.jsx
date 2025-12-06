// frontend/src/components/dashboard/AlertModal.jsx
import React from "react";
import {
  FaExclamationTriangle,
  FaClock,
  FaQuestionCircle,
  FaTimes,
  FaCalendarAlt,
  FaUser,
  FaMapMarkerAlt,
  FaTools,
  FaCheckCircle,
} from "react-icons/fa";
import { ImLab } from "react-icons/im";

const SEVERITY_CONFIG = {
  CRITICAL: {
    color: "bg-red-100 text-red-800 border-red-200",
    icon: FaExclamationTriangle,
    badge: "bg-red-500",
  },
  HIGH: {
    color: "bg-orange-100 text-orange-800 border-orange-200",
    icon: FaExclamationTriangle,
    badge: "bg-orange-500",
  },
  MEDIUM: {
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
    icon: FaClock,
    badge: "bg-yellow-500",
  },
  LOW: {
    color: "bg-blue-100 text-blue-800 border-blue-200",
    icon: FaQuestionCircle,
    badge: "bg-blue-500",
  },
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

export default function AlertModal({ alert, onClose, onResolve }) {
  if (!alert) return null;

  const severity = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.LOW;
  const SeverityIcon = severity.icon;
  const equipment = alert.equipment;
  const lab = equipment?.lab;

  const handleResolve = () => {
    if (onResolve) {
      onResolve(alert.id);
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`px-6 py-4 border-b ${severity.color}`}>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              <div className="p-2 bg-white rounded-lg shadow-sm">
                <SeverityIcon className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-bold text-gray-900">
                    {alert.title}
                  </h3>
                  <span
                    className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${severity.badge} text-white`}
                  >
                    {alert.severity}
                  </span>
                </div>
                <p className="text-sm text-gray-600">Alert Details</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/50 rounded-lg transition-colors"
            >
              <FaTimes className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-5 max-h-[calc(90vh-180px)] overflow-y-auto">
          <div className="space-y-5">
            {/* Alert Message */}
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Description
              </h4>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="text-sm text-gray-700 leading-relaxed">
                  {alert.message}
                </p>
              </div>
            </div>

            {/* Equipment & Location Info */}
            {equipment && lab && (
              <div className="grid grid-cols-2 gap-4">
                {/* Equipment */}
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <FaTools className="w-3.5 h-3.5" />
                    Equipment
                  </h4>
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <p className="font-semibold text-sm text-gray-900 mb-1">
                      {equipment.name}
                    </p>
                    <p className="text-xs text-gray-500 font-mono">
                      ID: {equipment.equipmentId}
                    </p>
                  </div>
                </div>

                {/* Lab */}
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <ImLab className="w-3.5 h-3.5" />
                    Lab
                  </h4>
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <p className="font-semibold text-sm text-gray-900 mb-1">
                      {lab.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {DEPARTMENT_DISPLAY_NAMES[lab.department] ||
                        lab.department}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Institute Info */}
            {lab?.institute && (
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <FaMapMarkerAlt className="w-3.5 h-3.5" />
                  Institute
                </h4>
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <p className="text-sm text-gray-900">{lab.institute.name}</p>
                  {lab.instituteId && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      ID: {lab.instituteId}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Timeline */}
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Timeline
              </h4>
              <div className="space-y-2">
                <div className="flex items-center gap-3 text-sm">
                  <FaCalendarAlt className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">Created:</span>
                  <span className="font-medium text-gray-900">
                    {new Date(alert.createdAt).toLocaleString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                {alert.isResolved && alert.resolvedAt && (
                  <>
                    <div className="flex items-center gap-3 text-sm">
                      <FaCheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-gray-600">Resolved:</span>
                      <span className="font-medium text-gray-900">
                        {new Date(alert.resolvedAt).toLocaleString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    {alert.resolvedBy && (
                      <div className="flex items-center gap-3 text-sm">
                        <FaUser className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">Resolved By:</span>
                        <span className="font-medium text-gray-900">
                          {alert.resolvedBy}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        {!alert.isResolved && onResolve && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-3">
            <button
              onClick={handleResolve}
              className="px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <FaCheckCircle className="w-4 h-4" />
              Mark as Resolved
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
