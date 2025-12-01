import React, { useState, useMemo } from 'react';
import { 
  FaSearch, 
  FaFilter, 
  FaBookOpen, 
  FaChevronRight, 
  FaTh, 
  FaInfoCircle 
} from 'react-icons/fa';
import { Navigate } from 'react-router-dom';
import { equipmentGuidelines, formatDepartment } from '../data/equipmentGuidelines';
import { useAuthStore } from '../stores/authStore';

const UserGuidePage = () => {
  const { user } = useAuthStore();
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEquipment, setSelectedEquipment] = useState(null);

  if (user?.role !== 'TRAINER') {
    return <Navigate to="/dashboard" replace />;
  }

  const departments = useMemo(() => {
    const depts = new Set(equipmentGuidelines.map(item => item.department));
    return ['ALL', ...Array.from(depts)];
  }, []);

  const filteredList = useMemo(() => {
    return equipmentGuidelines.filter(item => {
      const matchesDept = selectedDept === 'ALL' || item.department === selectedDept;
      const matchesSearch = item.equipmentName.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesDept && matchesSearch;
    });
  }, [selectedDept, searchQuery]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="space-y-6">
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gray-200 pb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <FaBookOpen className="w-7 h-7 text-blue-600" />
              User Guidelines
            </h1>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          <div className="lg:col-span-4 space-y-4">
            
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 space-y-4">
              <div className="relative">
                <FaSearch className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search equipment..."
                  className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Filter by Category</label>
                <div className="relative">
                  <FaFilter className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <select
                    className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none bg-white cursor-pointer"
                    value={selectedDept}
                    onChange={(e) => {
                      setSelectedDept(e.target.value);
                      setSelectedEquipment(null); 
                    }}
                  >
                    {departments.map(dept => (
                      <option key={dept} value={dept}>
                        {dept === 'ALL' ? 'All Departments' : formatDepartment(dept)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-[calc(100vh-300px)] min-h-[500px]">
              <div className="p-4 border-b border-gray-100 bg-gray-50/50 rounded-t-xl">
                 <h3 className="text-sm font-semibold text-gray-700">Equipment List <span className="text-gray-400 font-normal">({filteredList.length})</span></h3>
              </div>
              <div className="overflow-y-auto flex-1 p-2 space-y-1">
                {filteredList.length === 0 ? (
                  <div className="p-8 text-center flex flex-col items-center justify-center h-full text-gray-500">
                    <FaSearch className="w-8 h-8 text-gray-300 mb-2" />
                    <p className="text-sm">No equipment found.</p>
                  </div>
                ) : (
                  filteredList.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setSelectedEquipment(item)}
                      className={`w-full text-left p-3 rounded-lg transition-all flex justify-between items-center group ${
                        selectedEquipment?.id === item.id 
                          ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200 shadow-sm' 
                          : 'hover:bg-gray-50 text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <div className="min-w-0">
                        <h3 className="font-medium text-sm truncate">
                          {item.equipmentName}
                        </h3>
                        <p className={`text-xs mt-0.5 truncate ${selectedEquipment?.id === item.id ? 'text-blue-500' : 'text-gray-400'}`}>
                          {formatDepartment(item.department)}
                        </p>
                      </div>
                      <FaChevronRight className={`w-4 h-4 flex-shrink-0 transition-transform ${selectedEquipment?.id === item.id ? 'text-blue-500 translate-x-1' : 'text-gray-300 opacity-0 group-hover:opacity-100'}`} />
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-8">
            {selectedEquipment ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-[500px] flex flex-col">
                <div className="bg-white border-b border-gray-200 p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mb-2">
                            {formatDepartment(selectedEquipment.department)}
                        </span>
                        <h2 className="text-2xl font-bold text-gray-900">{selectedEquipment.equipmentName}</h2>
                        <p className="text-gray-500 text-sm mt-1">Standard Operating Procedure & Safety Guidelines</p>
                    </div>
                    <FaTh className="w-6 h-6 text-gray-300" />
                  </div>
                </div>
                
                <div className="p-8 flex-1">
                  <div className="space-y-8">
                    {selectedEquipment.steps.map((step, index) => (
                      <div key={index} className="flex gap-5 group">
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white border-2 border-blue-100 text-blue-600 font-bold text-lg flex items-center justify-center shadow-sm group-hover:border-blue-500 group-hover:text-blue-600 transition-colors">
                          {index + 1}
                        </div>
                        <div className="flex-1 pt-1.5">
                          <p className="text-base text-gray-700 leading-relaxed font-medium">
                            {step}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-12 p-5 bg-amber-50 border border-amber-200 rounded-xl flex gap-4 items-start">
                    <FaInfoCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <h4 className="text-sm font-bold text-amber-800 mb-1">Safety First</h4>
                        <p className="text-sm text-amber-700 leading-relaxed">
                        Always ensure you are wearing appropriate PPE (Personal Protective Equipment) before operating this machinery. 
                        If the machine behaves abnormally, press the <strong>Emergency Stop</strong> immediately and notify a supervisor.
                        </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full min-h-[500px] flex flex-col items-center justify-center text-center p-12 bg-white rounded-xl border border-gray-200 border-dashed">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                    <FaBookOpen className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">No Equipment Selected</h3>
                <p className="text-gray-500 mt-2 max-w-sm text-sm">
                  Select an item from the category list on the left to view its detailed operating guidelines and safety procedures.
                </p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default UserGuidePage;