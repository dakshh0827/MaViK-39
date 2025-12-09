/*
 * =====================================================
 * frontend/src/components/sld/EquipmentNode.jsx
 * =====================================================
 * Updated: Status dot based on mapping and real-time status
 */
import { memo } from "react";

const STATUS_CONFIG = {
  ONLINE: {
    dotColor: "bg-emerald-500",
    energyColor: "text-emerald-600",
  },
  OFFLINE: {
    dotColor: "bg-red-500",
    energyColor: "text-red-600",
  },
};

const getDisplayStatus = (backendStatus) => {
  if (!backendStatus) return "OFFLINE";
  const status = backendStatus.toUpperCase();
  if (
    status === "OPERATIONAL" ||
    status === "IN_USE" ||
    status === "IN_CLASS"
  ) {
    return "ONLINE";
  }
  return "OFFLINE";
};

function EquipmentNodeComponent({ data, onOpenModal, isMapped, isRealTimeActive }) {
  const equipment = data.equipment;
  const displayStatusKey = getDisplayStatus(equipment.status?.status);
  
  // Determine dot color based on mapping and real-time status
  let dotColor = "bg-red-500"; // Default: OFF (red)
  
  if (isMapped && isRealTimeActive) {
    dotColor = "bg-emerald-500"; // Mapped equipment is ON (green)
  }

  // --- ENERGY LOGIC ---
  const currentConsumption = equipment.status?.energyConsumption;
  const lastRecordedConsumption = equipment.status?.lastEnergyConsumption;

  let displayConsumption = 0;

  if (displayStatusKey === "ONLINE") {
    displayConsumption = currentConsumption ?? 0;
  } else {
    displayConsumption = lastRecordedConsumption ?? 0;
  }

  const config = STATUS_CONFIG[displayStatusKey];

  return (
    <div className="relative group" onClick={() => onOpenModal(equipment)}>
      <div
        className={`
          relative w-[210px] h-[46px] bg-white rounded-2xl border border-gray-400 
          shadow-sm hover:shadow-md hover:border-blue-500 transition-all duration-200 cursor-pointer
          flex items-center justify-between px-5
        `}
      >
        {/* LEFT: Status Dot + ID */}
        <div className="flex items-center gap-3 overflow-hidden">
          {/* Status dot with pulsing animation when ON */}
          <div className="relative flex-shrink-0">
            <div
              className={`w-3 h-3 rounded-full ${dotColor} shadow-sm ${
                isMapped && isRealTimeActive ? 'animate-pulse' : ''
              }`}
            ></div>
            {/* Glow effect when ON */}
            {isMapped && isRealTimeActive && (
              <div className="absolute inset-0 w-3 h-3 rounded-full bg-emerald-400 opacity-50 blur-sm"></div>
            )}
          </div>
          <span className="text-md font-mono font-bold text-gray-700 truncate tracking-tight">
            {equipment.equipmentId}
          </span>
        </div>

        {/* RIGHT: Energy Consumption */}
        <div className="flex-shrink-0 pl-2">
          <span className={`text-md font-bold ${config.energyColor}`}>
            {displayConsumption.toFixed(1)}{" "}
            <span className="text-md font-medium text-gray-400">kW</span>
          </span>
        </div>
      </div>
    </div>
  );
}

export default memo(EquipmentNodeComponent);