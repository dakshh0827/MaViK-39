import React from "react";
import {
  FaExclamationTriangle,
  FaCheckCircle,
  FaClock,
  FaQuestionCircle,
  FaCalendarAlt,
  FaUser,
} from "react-icons/fa";

const SEVERITY_CONFIG = {
  CRITICAL: {
    color: "bg-red-100 text-red-800",
    icon: FaExclamationTriangle,
  },
  HIGH: {
    color: "bg-orange-100 text-orange-800",
    icon: FaExclamationTriangle,
  },
  MEDIUM: {
    color: "bg-yellow-100 text-yellow-800",
    icon: FaClock,
  },
  LOW: {
    color: "bg-blue-100 text-blue-800",
    icon: FaQuestionCircle,
  },
};

export default function AlertHistoryTable({ alerts, loading }) {
  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500">Loading history...</div>
    );
  }

  if (!alerts || alerts.length === 0) {
    return (
      <div className="p-8 text-center flex flex-col items-center justify-center text-gray-500">
        <FaCheckCircle className="w-12 h-12 text-green-100 mb-3" />
        <p>No resolved alerts found in history.</p>
      </div>
    );
  }

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
          <tr>
            <th className="px-6 py-3">Severity</th>
            <th className="px-6 py-3">Issue / Equipment</th>
            <th className="px-6 py-3">Lab</th>
            <th className="px-6 py-3">Created</th>
            <th className="px-6 py-3">Resolved</th>
            <th className="px-6 py-3">Resolved By</th>
          </tr>
        </thead>
        <tbody>
          {alerts.map((alert) => {
            const severityStyle =
              SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.LOW;
            const SeverityIcon = severityStyle.icon;

            return (
              <tr key={alert.id} className="bg-white border-b hover:bg-gray-50">
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${severityStyle.color}`}
                  >
                    <SeverityIcon className="w-3 h-3" />
                    {alert.severity}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="font-medium text-gray-900">{alert.title}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {alert.equipment?.name}{" "}
                    <span className="text-gray-400">
                      ({alert.equipment?.equipmentId})
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-gray-900">
                    {alert.equipment?.lab?.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {alert.equipment?.lab?.institute?.name}
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-600">
                  <div className="flex items-center gap-1.5">
                    <FaCalendarAlt className="w-3 h-3" />
                    {formatDate(alert.createdAt)}
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-600">
                  <div className="flex items-center gap-1.5">
                    <FaCheckCircle className="w-3 h-3 text-green-600" />
                    {formatDate(alert.resolvedAt)}
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-600">
                  <div className="flex items-center gap-1.5">
                    <FaUser className="w-3 h-3" />
                    {alert.resolvedBy || "System"}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}