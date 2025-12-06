// frontend/src/components/dashboard/AlertsList.jsx
import React from "react";
import {
  FaExclamationTriangle,
  FaCheckCircle,
  FaClock,
  FaQuestionCircle,
  FaMapMarkerAlt,
} from "react-icons/fa";
import { ImLab } from "react-icons/im";

const SEVERITY_CONFIG = {
  CRITICAL: {
    color: "bg-red-50 border-red-200 hover:border-red-300",
    badge: "bg-red-500",
    dot: "bg-red-500",
    icon: FaExclamationTriangle,
  },
  HIGH: {
    color: "bg-orange-50 border-orange-200 hover:border-orange-300",
    badge: "bg-orange-500",
    dot: "bg-orange-500",
    icon: FaExclamationTriangle,
  },
  MEDIUM: {
    color: "bg-yellow-50 border-yellow-200 hover:border-yellow-300",
    badge: "bg-yellow-500",
    dot: "bg-yellow-500",
    icon: FaClock,
  },
  LOW: {
    color: "bg-blue-50 border-blue-200 hover:border-blue-300",
    badge: "bg-blue-500",
    dot: "bg-blue-500",
    icon: FaQuestionCircle,
  },
};

export default function AlertsList({ alerts, onAlertClick, compact = true }) {
  const getSeverity = (severity) => {
    return SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.LOW;
  };

  return (
    <div className="space-y-2 p-3">
      {alerts.length === 0 ? (
        <div className="text-center py-8">
          <FaCheckCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No alerts</p>
        </div>
      ) : (
        alerts.map((alert) => {
          const severity = getSeverity(alert.severity);
          const SeverityIcon = severity.icon;
          const equipment = alert.equipment;
          const lab = equipment?.lab;

          return (
            <button
              key={alert.id}
              onClick={() => onAlertClick && onAlertClick(alert)}
              className={`w-full text-left p-3 rounded-lg border ${severity.color} hover:shadow-md transition-all group cursor-pointer`}
            >
              <div className="flex items-start gap-3">
                {/* Severity Indicator */}
                <div className="flex-shrink-0 pt-0.5">
                  <div
                    className={`w-2 h-2 rounded-full ${severity.dot} shadow-sm`}
                  />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Title & Severity Badge */}
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <h4 className="font-semibold text-sm text-gray-900 line-clamp-1 group-hover:text-gray-800">
                      {alert.title}
                    </h4>
                    <span
                      className={`flex-shrink-0 px-2 py-0.5 text-[10px] font-bold rounded-full ${severity.badge} text-white`}
                    >
                      {alert.severity}
                    </span>
                  </div>

                  {/* Equipment & Lab Info */}
                  {equipment && lab && (
                    <div className="space-y-1 mb-2">
                      <div className="flex items-center gap-1.5 text-xs text-gray-600">
                        <FaMapMarkerAlt className="w-3 h-3 text-gray-400" />
                        <span className="font-medium">{equipment.name}</span>
                        <span className="text-gray-400">•</span>
                        <span className="text-gray-500">
                          {equipment.equipmentId}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <ImLab className="w-3 h-3 text-gray-400" />
                        <span>{lab.name}</span>
                      </div>
                    </div>
                  )}

                  {/* Timestamp */}
                  <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                    <FaClock className="w-3 h-3" />
                    {new Date(alert.createdAt).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            </button>
          );
        })
      )}
    </div>
  );
}
