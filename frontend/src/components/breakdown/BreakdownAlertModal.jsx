/*
 * =====================================================
 * frontend/src/components/breakdown/BreakdownAlertModal.jsx
 * =====================================================
 */
import { useState } from "react";
import { FaTimes, FaExclamationCircle, FaCheckCircle, FaTimesCircle } from "react-icons/fa";

export default function BreakdownAlertModal({
  isOpen,
  onClose,
  alert,
  onRespond,
}) {
  const [isBreakdown, setIsBreakdown] = useState(null);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (isBreakdown === null) {
      setError("Please select Yes or No");
      return;
    }

    if (isBreakdown && !reason.trim()) {
      setError("Please provide a reason for the breakdown");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      await onRespond(alert.id, isBreakdown, reason || null);
      onClose();
    } catch (err) {
      setError(err.message || "Failed to respond to alert");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !alert) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <FaExclamationCircle className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Breakdown Check Required
              </h2>
              <p className="text-sm text-gray-500">{alert.equipment?.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <FaTimes className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
            <p className="text-sm text-gray-700">{alert.message}</p>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 mb-3">
              Is this equipment broken down?
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setIsBreakdown(true)}
                className={`p-4 border-2 rounded-lg transition-all ${
                  isBreakdown === true
                    ? "border-red-500 bg-red-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <FaTimesCircle
                  className={`w-8 h-8 mx-auto mb-2 ${
                    isBreakdown === true ? "text-red-600" : "text-gray-400"
                  }`}
                />
                <p
                  className={`text-sm font-medium ${
                    isBreakdown === true ? "text-red-900" : "text-gray-700"
                  }`}
                >
                  Yes, it's broken
                </p>
              </button>

              <button
                onClick={() => setIsBreakdown(false)}
                className={`p-4 border-2 rounded-lg transition-all ${
                  isBreakdown === false
                    ? "border-green-500 bg-green-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <FaCheckCircle
                  className={`w-8 h-8 mx-auto mb-2 ${
                    isBreakdown === false ? "text-green-600" : "text-gray-400"
                  }`}
                />
                <p
                  className={`text-sm font-medium ${
                    isBreakdown === false ? "text-green-900" : "text-gray-700"
                  }`}
                >
                  No, it's operational
                </p>
              </button>
            </div>
          </div>

          {isBreakdown && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for Breakdown <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows="3"
                placeholder="Describe what's wrong with the equipment..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 p-6 border-t border-gray-200">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || isBreakdown === null}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Submitting..." : "Submit Response"}
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}