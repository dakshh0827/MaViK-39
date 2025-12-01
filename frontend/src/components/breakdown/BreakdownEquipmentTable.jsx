/*
 * =====================================================
 * frontend/src/components/breakdown/BreakdownEquipmentTable.jsx
 * =====================================================
 */
import { useState } from "react";
import {
  FaExclamationCircle,
  FaBox,
  FaCheckCircle,
} from "react-icons/fa";
import ReorderModal from "./ReorderModal";

const STATUS_COLORS = {
  REPORTED: "bg-yellow-100 text-yellow-800 border-yellow-200",
  REORDER_PENDING: "bg-blue-100 text-blue-800 border-blue-200",
  REORDER_APPROVED: "bg-green-100 text-green-800 border-green-200",
  REORDER_REJECTED: "bg-red-100 text-red-800 border-red-200",
  RESOLVED: "bg-gray-100 text-gray-800 border-gray-200",
};

const STATUS_LABELS = {
  REPORTED: "Reported",
  REORDER_PENDING: "Reorder Pending",
  REORDER_APPROVED: "Reorder Approved",
  REORDER_REJECTED: "Reorder Rejected",
  RESOLVED: "Resolved",
};

export default function BreakdownEquipmentTable({
  breakdowns,
  onReorder,
  onResolve,
}) {
  const [selectedBreakdown, setSelectedBreakdown] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleReorderClick = (breakdown) => {
    setSelectedBreakdown(breakdown);
    setIsModalOpen(true);
  };

  const handleReorderSubmit = async (data) => {
    await onReorder(selectedBreakdown.id, data);
    setIsModalOpen(false);
    setSelectedBreakdown(null);
  };

  if (breakdowns.length === 0) {
    return (
      <div className="text-center py-12">
        <FaCheckCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 text-lg">No breakdown equipment</p>
        <p className="text-gray-400 text-sm mt-2">
          All equipment is operational
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Equipment
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Lab
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Reason
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Reported
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {breakdowns.map((breakdown) => {
              const equipment = breakdown.equipment;
              const latestRequest = breakdown.reorderRequests?.[0];

              return (
                <tr key={breakdown.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <FaExclamationCircle className="w-5 h-5 text-red-500 mr-2" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {equipment.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {equipment.equipmentId}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {equipment.lab.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {equipment.lab.institute?.name ||
                        equipment.lab.instituteId}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${
                        STATUS_COLORS[breakdown.status]
                      }`}
                    >
                      {STATUS_LABELS[breakdown.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 max-w-xs truncate">
                      {breakdown.reason}
                    </div>
                    {breakdown.isAutoDetected && (
                      <span className="text-xs text-blue-600">
                        Auto-detected
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(breakdown.reportedAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      {breakdown.status === "REPORTED" && (
                        <button
                          onClick={() => handleReorderClick(breakdown)}
                          className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                        >
                          <FaBox className="w-4 h-4" />
                          Reorder
                        </button>
                      )}

                      {latestRequest && (
                        <div className="text-xs">
                          <span
                            className={`px-2 py-1 rounded ${
                              latestRequest.status === "APPROVED"
                                ? "bg-green-100 text-green-800"
                                : latestRequest.status === "REJECTED"
                                ? "bg-red-100 text-red-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {latestRequest.status}
                          </span>
                        </div>
                      )}

                      {breakdown.status === "REORDER_APPROVED" && (
                        <button
                          onClick={() => onResolve(breakdown.id)}
                          className="text-green-600 hover:text-green-900 flex items-center gap-1"
                        >
                          <FaCheckCircle className="w-4 h-4" />
                          Resolve
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <ReorderModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedBreakdown(null);
          }}
          breakdown={selectedBreakdown}
          onSubmit={handleReorderSubmit}
        />
      )}
    </>
  );
}