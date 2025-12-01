/*
 * =====================================================
 * frontend/src/components/admin/InstituteManagerForm.jsx
 * =====================================================
 */
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { 
  FaTimes, 
  FaPlus, 
  FaEdit, 
  FaTrash, 
  FaExclamationCircle 
} from "react-icons/fa";
import LoadingSpinner from "../common/LoadingSpinner";
import { useInstituteStore } from "../../stores/instituteStore";

export default function InstituteManagerForm({ isOpen, onClose }) {
  const {
    institutes,
    fetchInstitutes,
    createInstitute,
    updateInstitute,
    deleteInstitute,
    isLoading,
  } = useInstituteStore();

  const [error, setError] = useState("");
  const [newName, setNewName] = useState("");
  const [newInstituteId, setNewInstituteId] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");

  const hasFetchedRef = useRef(false);

  useEffect(() => {
    if (isOpen && !hasFetchedRef.current) {
      fetchInstitutes(true);
      hasFetchedRef.current = true;
      setError("");
    }
    if (!isOpen) {
      hasFetchedRef.current = false;
    }
  }, [isOpen]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError("");

    if (!newName.trim() || !newInstituteId.trim()) {
      setError("Institute Name and ID are required.");
      return;
    }

    try {
      await createInstitute({
        name: newName.trim(),
        instituteId: newInstituteId.trim(),
      });
      setNewName("");
      setNewInstituteId("");
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = (inst) => {
    setEditingId(inst.instituteId);
    setEditingName(inst.name);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName("");
  };

  const handleUpdate = async (id) => {
    setError("");
    if (!editingName.trim()) {
      setError("Institute name cannot be empty.");
      return;
    }
    try {
      await updateInstitute(id, editingName.trim());
      handleCancelEdit();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (instituteId) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this institute? This action cannot be undone."
      )
    ) {
      return;
    }
    setError("");
    try {
      await deleteInstitute(instituteId);
    } catch (err) {
      setError(err.message);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-50 p-4 transition-all animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Manage Institutes
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FaTimes className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2 m-6 mb-0">
            <FaExclamationCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        <form
          onSubmit={handleCreate}
          className="p-6 border-b border-gray-200 space-y-4"
        >
          <label className="block text-lg font-medium text-gray-700">
            Create New Institute
          </label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Institute Name
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g., ITI Pusa"
                className="flex-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Institute ID
              </label>
              <input
                type="text"
                value={newInstituteId}
                onChange={(e) =>
                  setNewInstituteId(e.target.value.toUpperCase())
                }
                placeholder="e.g., ITI_PUSA"
                className="flex-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            disabled={isLoading}
          >
            <FaPlus className="w-4 h-4" /> Add New Institute
          </button>
        </form>

        <div className="p-6 overflow-y-auto flex-1 space-y-3">
          <h3 className="font-semibold text-gray-800">
            Existing Institutes ({institutes.length})
          </h3>
          {isLoading && institutes.length === 0 ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : institutes.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No institutes found. Create one above.
            </p>
          ) : (
            institutes.map((inst) => (
              <div
                key={inst.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                {editingId === inst.instituteId ? (
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    className="flex-1 px-3 py-1 border border-blue-300 rounded-lg"
                    autoFocus
                  />
                ) : (
                  <div>
                    <span className="text-gray-900 font-medium">
                      {inst.name}
                    </span>
                    <span className="text-gray-500 text-sm ml-2">
                      (ID: {inst.instituteId})
                    </span>
                  </div>
                )}
                <div className="flex gap-2">
                  {editingId === inst.instituteId ? (
                    <>
                      <button
                        onClick={() => handleUpdate(inst.instituteId)}
                        className="px-3 py-1 text-sm text-green-600 hover:bg-green-100 rounded-lg"
                        disabled={isLoading}
                      >
                        Save
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-200 rounded-lg"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleEdit(inst)}
                        className="p-2 text-gray-500 hover:text-blue-700 hover:bg-blue-100 rounded-lg"
                        title="Edit Institute"
                      >
                        <FaEdit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(inst.instituteId)}
                        className="p-2 text-gray-500 hover:text-red-700 hover:bg-red-100 rounded-lg"
                        title="Delete Institute"
                        disabled={isLoading}
                      >
                        <FaTrash className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}