/*
 * =====================================================
 * frontend/src/components/breakdown/AddBreakdownModal.jsx
 * =====================================================
 */
import { useState, useEffect } from "react";
import { FaTimes, FaExclamationTriangle } from "react-icons/fa";
import { useEquipmentStore } from "../../stores/equipmentStore";

export default function AddBreakdownModal({ isOpen, onClose, onSubmit }) {
  const { equipment, fetchEquipment } = useEquipmentStore();
  const [selectedEquipmentId, setSelectedEquipmentId] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      fetchEquipment();
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!selectedEquipmentId) {
      setError("Please select an equipment");
      return;
    }

    if (!reason.trim()) {
      setError("Please provide a reason");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(selectedEquipmentId, reason);
      // Reset form fields
      setSelectedEquipmentId("");
      setReason("");
      setError("");
      // Close modal immediately after successful submission
      onClose();
    } catch (err) {
      setError(err.message || "Failed to add breakdown equipment");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <FaExclamationTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Report Breakdown Equipment
              </h2>
              <p className="text-sm text-gray-500">
                Manually add equipment to breakdown list
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <FaTimes className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Equipment <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedEquipmentId}
              onChange={(e) => setSelectedEquipmentId(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">-- Select Equipment --</option>
              {equipment.map((eq) => (
                <option key={eq.id} value={eq.equipmentId}>
                  {eq.name} ({eq.equipmentId}) - {eq.lab?.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for Breakdown <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              rows="4"
              placeholder="Describe the issue with the equipment..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-center gap-3 pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Adding..." : "Add to Breakdown List"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}