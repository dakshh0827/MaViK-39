/*
 * =====================================================
 * frontend/src/components/breakdown/ReorderRequestsList.jsx
 * =====================================================
 */
import { useState } from "react";
import {
  FaBox,
  FaClock,
  FaCheckCircle,
  FaTimesCircle,
  FaExclamationCircle,
  FaCommentAlt,
} from "react-icons/fa";

const URGENCY_COLORS = {
  LOW: "bg-blue-100 text-blue-800 border-blue-200",
  MEDIUM: "bg-yellow-100 text-yellow-800 border-yellow-200",
  HIGH: "bg-orange-100 text-orange-800 border-orange-200",
  CRITICAL: "bg-red-100 text-red-800 border-red-200",
};

const STATUS_COLORS = {
  PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
  APPROVED: "bg-green-100 text-green-800 border-green-200",
  REJECTED: "bg-red-100 text-red-800 border-red-200",
  CANCELLED: "bg-gray-100 text-gray-800 border-gray-200",
};

export default function ReorderRequestsList({ requests, onReview }) {
  const [reviewingId, setReviewingId] = useState(null);
  const [comments, setComments] = useState("");
  const [showCommentsFor, setShowCommentsFor] = useState(null);

  const handleReview = async (requestId, action) => {
    try {
      await onReview(requestId, action, comments);
      setReviewingId(null);
      setComments("");
      setShowCommentsFor(null);
    } catch (error) {
      console.error("Failed to review request:", error);
    }
  };

  const pendingRequests = requests.filter((r) => r.status === "PENDING");
  const reviewedRequests = requests.filter((r) => r.status !== "PENDING");

  if (requests.length === 0) {
    return (
      <div className="text-center py-12">
        <FaBox className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 text-lg">No reorder requests</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FaClock className="w-5 h-5 text-yellow-600" />
            Pending Approval ({pendingRequests.length})
          </h3>
          <div className="space-y-4">
            {pendingRequests.map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                reviewingId={reviewingId}
                setReviewingId={setReviewingId}
                comments={comments}
                setComments={setComments}
                showCommentsFor={showCommentsFor}
                setShowCommentsFor={setShowCommentsFor}
                handleReview={handleReview}
              />
            ))}
          </div>
        </div>
      )}

      {/* Reviewed Requests */}
      {reviewedRequests.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FaCheckCircle className="w-5 h-5 text-green-600" />
            Reviewed Requests ({reviewedRequests.length})
          </h3>
          <div className="space-y-4">
            {reviewedRequests.map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                isReviewed={true}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RequestCard({
  request,
  reviewingId,
  setReviewingId,
  comments,
  setComments,
  showCommentsFor,
  setShowCommentsFor,
  handleReview,
  isReviewed = false,
}) {
  const equipment = request.breakdown.equipment;
  const requester = request.requestedByUser;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <FaExclamationCircle className="w-5 h-5 text-red-500" />
            <h4 className="text-lg font-semibold text-gray-900">
              {equipment.name}
            </h4>
            <span
              className={`px-2 py-1 text-xs font-semibold rounded-full border ${
                URGENCY_COLORS[request.urgency]
              }`}
            >
              {request.urgency}
            </span>
          </div>
          <p className="text-sm text-gray-600">
            {equipment.equipmentId} • {equipment.lab.name}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {equipment.lab.institute?.name || equipment.lab.instituteId}
          </p>
        </div>
        <span
          className={`px-3 py-1 text-sm font-semibold rounded-full border ${
            STATUS_COLORS[request.status]
          }`}
        >
          {request.status}
        </span>
      </div>

      {/* Request Details */}
      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
        <div>
          <span className="text-gray-500">Quantity:</span>{" "}
          <span className="font-medium">{request.quantity}</span>
        </div>
        <div>
          <span className="text-gray-500">Requested by:</span>{" "}
          <span className="font-medium">
            {requester.firstName} {requester.lastName}
          </span>
        </div>
        {request.estimatedCost && (
          <div>
            <span className="text-gray-500">Est. Cost:</span>{" "}
            <span className="font-medium">
              ₹{request.estimatedCost.toLocaleString()}
            </span>
          </div>
        )}
        <div>
          <span className="text-gray-500">Requested on:</span>{" "}
          <span className="font-medium">
            {new Date(request.requestedAt).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Reason */}
      <div className="bg-gray-50 p-3 rounded-lg mb-4">
        <p className="text-sm font-medium text-gray-700 mb-1">Reason:</p>
        <p className="text-sm text-gray-600">{request.reason}</p>
      </div>

      {/* Review Section for Pending Requests */}
      {!isReviewed && request.status === "PENDING" && (
        <div className="border-t border-gray-200 pt-4">
          {reviewingId === request.id ? (
            <div className="space-y-3">
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Add comments (optional)..."
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleReview(request.id, "APPROVED")}
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                >
                  <FaCheckCircle className="w-4 h-4" />
                  Approve
                </button>
                <button
                  onClick={() => handleReview(request.id, "REJECTED")}
                  className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                >
                  <FaTimesCircle className="w-4 h-4" />
                  Reject
                </button>
                <button
                  onClick={() => {
                    setReviewingId(null);
                    setComments("");
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setReviewingId(request.id)}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Review Request
            </button>
          )}
        </div>
      )}

      {/* Review Details for Reviewed Requests */}
      {isReviewed && request.reviewedByUser && (
        <div className="border-t border-gray-200 pt-4">
          <div className="flex items-center justify-between text-sm">
            <div>
              <span className="text-gray-500">Reviewed by:</span>{" "}
              <span className="font-medium">
                {request.reviewedByUser.firstName}{" "}
                {request.reviewedByUser.lastName}
              </span>
            </div>
            <div>
              <span className="text-gray-500">on</span>{" "}
              <span className="font-medium">
                {new Date(request.reviewedAt).toLocaleDateString()}
              </span>
            </div>
          </div>
          {request.reviewComments && (
            <div className="mt-2 bg-blue-50 p-3 rounded-lg">
              <div className="flex items-start gap-2">
                <FaCommentAlt className="w-4 h-4 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-blue-900 mb-1">
                    Comments:
                  </p>
                  <p className="text-sm text-blue-800">
                    {request.reviewComments}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}