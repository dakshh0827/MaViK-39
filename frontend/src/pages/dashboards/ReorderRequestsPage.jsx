import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBreakdownStore } from "../../stores/breakdownStore";
import ReorderRequestsList from "../../components/breakdown/ReorderRequestsList";
import LoadingSpinner from "../../components/common/LoadingSpinner";
// Updated imports to react-icons/fa
import {
  FaBox,
  FaArrowLeft,
  FaClock,
  FaCheckCircle,
  FaTimesCircle,
  FaSearch,
  FaCalendarAlt,
} from "react-icons/fa";

export default function ReorderRequestsPage() {
  const navigate = useNavigate();
  const {
    reorderRequests,
    fetchReorderRequests,
    reviewReorderRequest,
    isLoading,
  } = useBreakdownStore();

  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRequest, setSelectedRequest] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        await fetchReorderRequests();
      } catch (error) {
        console.error("Failed to load reorder requests:", error);
      }
    };
    loadData();
  }, []);

  const filteredRequests = reorderRequests.filter((request) => {
    const statusMatch =
      statusFilter === "all" || request.status === statusFilter;
    const priorityMatch =
      priorityFilter === "all" || request.priority === priorityFilter;
    const searchMatch =
      searchQuery === "" ||
      request.equipmentName
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      request.labName?.toLowerCase().includes(searchQuery.toLowerCase());

    return statusMatch && priorityMatch && searchMatch;
  });

  const stats = {
    total: reorderRequests.length,
    pending: reorderRequests.filter((r) => r.status === "PENDING").length,
    approved: reorderRequests.filter((r) => r.status === "APPROVED").length,
    rejected: reorderRequests.filter((r) => r.status === "REJECTED").length,
  };

  if (isLoading && reorderRequests.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FaArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <FaBox className="w-6 h-6 text-blue-600" />
                  Reorder Requests
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  Manage all equipment reorder requests
                </p>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="bg-gradient-to-br from-blue-50 to-white p-4 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Requests</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.total}
                  </p>
                </div>
                <FaBox className="w-8 h-8 text-blue-600" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-yellow-50 to-white p-4 rounded-lg border border-yellow-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-yellow-700">
                    {stats.pending}
                  </p>
                </div>
                <FaClock className="w-8 h-8 text-yellow-600" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-white p-4 rounded-lg border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Approved</p>
                  <p className="text-2xl font-bold text-green-700">
                    {stats.approved}
                  </p>
                </div>
                <FaCheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-red-50 to-white p-4 rounded-lg border border-red-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Rejected</p>
                  <p className="text-2xl font-bold text-red-700">
                    {stats.rejected}
                  </p>
                </div>
                <FaTimesCircle className="w-8 h-8 text-red-600" />
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <FaSearch className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by equipment or lab name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="all">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="all">All Priority</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {filteredRequests.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <FaBox className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No Requests Found
            </h3>
            <p className="text-gray-600">
              {searchQuery || statusFilter !== "all" || priorityFilter !== "all"
                ? "Try adjusting your filters to see more results."
                : "There are no reorder requests at the moment."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRequests.map((request) => (
              <div
                key={request.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {request.equipmentName || "Equipment"}
                      </h3>
                      <span
                        className={`px-3 py-1 text-xs font-bold rounded-full ${
                          request.priority === "CRITICAL"
                            ? "bg-red-100 text-red-700"
                            : request.priority === "HIGH"
                            ? "bg-orange-100 text-orange-700"
                            : request.priority === "MEDIUM"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {request.priority}
                      </span>
                      <span
                        className={`px-3 py-1 text-xs font-bold rounded-full ${
                          request.status === "PENDING"
                            ? "bg-blue-100 text-blue-700"
                            : request.status === "APPROVED"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {request.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Lab</p>
                        <p className="font-medium text-gray-900">
                          {request.labName || "Unknown Lab"}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Requested By</p>
                        <p className="font-medium text-gray-900">
                          {request.requestedBy || "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Request Date</p>
                        <p className="font-medium text-gray-900 flex items-center gap-1">
                          <FaCalendarAlt className="w-3 h-3" />
                          {new Date(request.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {request.reason && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-600 mb-1">Reason</p>
                        <p className="text-sm text-gray-900">
                          {request.reason}
                        </p>
                      </div>
                    )}

                    {request.reviewComments && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-xs text-blue-600 mb-1 font-semibold">
                          Review Comments
                        </p>
                        <p className="text-sm text-gray-900">
                          {request.reviewComments}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {request.status === "PENDING" && (
                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-200">
                    <button
                      onClick={async () => {
                        const comments = prompt(
                          "Enter review comments (optional):"
                        );
                        if (comments !== null) {
                          await reviewReorderRequest(
                            request.id,
                            "REJECTED",
                            comments || undefined
                          );
                          await fetchReorderRequests();
                        }
                      }}
                      className="px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
                    >
                      <FaTimesCircle className="w-4 h-4 inline mr-1" />
                      Reject
                    </button>
                    <button
                      onClick={async () => {
                        const comments = prompt(
                          "Enter review comments (optional):"
                        );
                        if (comments !== null) {
                          await reviewReorderRequest(
                            request.id,
                            "APPROVED",
                            comments || undefined
                          );
                          await fetchReorderRequests();
                        }
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                    >
                      <FaCheckCircle className="w-4 h-4 inline mr-1" />
                      Approve
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}