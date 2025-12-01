/*
 * =====================================================
 * frontend/src/components/breakdown/ReorderModal.jsx
 * =====================================================
 */
import { useState } from "react";
import { FaTimes, FaBox } from "react-icons/fa";

export default function ReorderModal({ isOpen, onClose, breakdown, onSubmit }) {
  const [formData, setFormData] = useState({
    quantity: 1,
    urgency: "MEDIUM",
    reason: "",
    estimatedCost: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!formData.reason.trim()) {
      setError("Please provide a reason for reordering");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (err) {
      setError(err.message || "Failed to submit reorder request");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FaBox className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Submit Reorder Request
              </h2>
              <p className="text-sm text-gray-500">
                {breakdown.equipment.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <FaTimes className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Equipment Info */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Equipment Details
            </h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-500">ID:</span>{" "}
                <span className="font-medium">
                  {breakdown.equipment.equipmentId}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Lab:</span>{" "}
                <span className="font-medium">
                  {breakdown.equipment.lab.name}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Manufacturer:</span>{" "}
                <span className="font-medium">
                  {breakdown.equipment.manufacturer}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Model:</span>{" "}
                <span className="font-medium">{breakdown.equipment.model}</span>
              </div>
            </div>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quantity <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="quantity"
              value={formData.quantity}
              onChange={handleChange}
              min="1"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Urgency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Urgency Level <span className="text-red-500">*</span>
            </label>
            <select
              name="urgency"
              value={formData.urgency}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="LOW">Low - Can wait</option>
              <option value="MEDIUM">Medium - Needed soon</option>
              <option value="HIGH">High - Urgent</option>
              <option value="CRITICAL">Critical - Immediate</option>
            </select>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for Reorder <span className="text-red-500">*</span>
            </label>
            <textarea
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              required
              rows="4"
              placeholder="Explain why this equipment needs to be reordered..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Estimated Cost */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estimated Cost (Optional)
            </label>
            <input
              type="number"
              name="estimatedCost"
              value={formData.estimatedCost}
              onChange={handleChange}
              min="0"
              step="0.01"
              placeholder="Enter estimated cost in ₹"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Submitting..." : "Submit Request"}
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