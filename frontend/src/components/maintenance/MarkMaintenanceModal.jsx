import { useState, useMemo } from 'react';
import { FaTimes, FaWrench, FaSearch } from 'react-icons/fa';

// Mock components for demo
const LoadingSpinner = ({ size }) => (
  <div className={`animate-spin rounded-full border-2 border-white border-t-transparent ${size === 'sm' ? 'h-4 w-4' : 'h-8 w-8'}`} />
);

export default function MarkMaintenanceModal({ 
  isOpen, 
  onClose, 
  equipment, // Can be null if triggered via Sidebar/+ button
  allEquipment = [], // List of equipment for the dropdown
  onSuccess 
}) {
  const [maintenanceType, setMaintenanceType] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  // Selection state for global trigger
  const [selectedEqId, setSelectedEqId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Determine which equipment we are acting on
  const targetEquipment = equipment || allEquipment.find(eq => eq.id === selectedEqId);

  // Filter equipment for the dropdown search
  const filteredOptions = useMemo(() => {
    if (!searchTerm) return allEquipment;
    return allEquipment.filter(eq => 
      eq.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      eq.equipmentId.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allEquipment, searchTerm]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!targetEquipment) {
      setError('Please select equipment first');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // Simulated API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      onSuccess?.();
      onClose();
      // Reset states
      setMaintenanceType('');
      setNotes('');
      setSelectedEqId('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to mark maintenance');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div 
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-white z-10 rounded-t-lg">
          <h2 className="text-xl font-semibold text-gray-900">
            Mark Maintenance
          </h2>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 transition-colors"
            type="button"
          >
            <FaTimes className="w-6 h-6" />
          </button>
        </div>

        {/* Form Content - Scrollable */}
        <div className="overflow-y-auto p-6 space-y-4">
          <form id="maintenance-form" onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* CASE 1: Equipment Pre-selected (Table Action) */}
            {equipment ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Equipment
                </label>
                <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-100 text-gray-700">
                  <div className="font-medium">{equipment.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">ID: {equipment.equipmentId}</div>
                </div>
              </div>
            ) : (
              /* CASE 2: Global Trigger (Sidebar/Button) - Show Search/Select */
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Equipment <span className="text-red-500">*</span>
                </label>
                
                {/* Search Box */}
                {/* <div className="relative">
                  <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none z-10" />
                  <input 
                    type="text"
                    placeholder="Search equipment..."
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div> */}

                {/* Select Dropdown */}
                <select
                  value={selectedEqId}
                  onChange={(e) => setSelectedEqId(e.target.value)}
                  className="w-full px-3 py-2 mt-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select equipment</option>
                  {filteredOptions.length === 0 ? (
                    <option disabled>No equipment found</option>
                  ) : (
                    filteredOptions.map(eq => (
                      <option key={eq.id} value={eq.id}>
                        {eq.name} ({eq.equipmentId})
                      </option>
                    ))
                  )}
                </select>
                
                {selectedEqId && (
                  <p className="text-xs text-gray-500 mt-1">
                    Selected: {allEquipment.find(e => e.id === selectedEqId)?.name}
                  </p>
                )}
              </div>
            )}

            {/* Maintenance Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Maintenance Type <span className="text-red-500">*</span>
              </label>
              <select
                value={maintenanceType}
                onChange={(e) => setMaintenanceType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Select type</option>
                <option value="Preventive Maintenance">Preventive Maintenance</option>
                <option value="Corrective Maintenance">Corrective Maintenance</option>
                <option value="Calibration">Calibration</option>
                <option value="Inspection">Inspection</option>
                <option value="Cleaning">Cleaning</option>
                <option value="Parts Replacement">Parts Replacement</option>
              </select>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Add details about the maintenance..."
              />
            </div>
          </form>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-white rounded-b-lg">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="maintenance-form"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isSubmitting || (!equipment && !selectedEqId)}
          >
            {isSubmitting && <LoadingSpinner size="sm" />}
            Mark Complete
          </button>
        </div>
      </div>
    </div>
  );
}