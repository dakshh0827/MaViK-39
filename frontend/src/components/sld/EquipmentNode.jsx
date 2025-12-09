/*
 * =====================================================
 * frontend/src/components/sld/EquipmentNode.jsx
 * =====================================================
 * Updated: Hardcoded energy for EQ-0099 directly in node
 */
import { memo } from "react";

const STATUS_CONFIG = {
  ONLINE: {
    bgColor: "bg-gradient-to-r from-emerald-50 to-green-50",
    borderColor: "border-emerald-400",
    dotColor: "bg-emerald-500",
    energyColor: "text-emerald-600",
    textColor: "text-emerald-700",
    shadowColor: "shadow-emerald-200",
    glowColor: "shadow-emerald-400/50",
  },
  OFFLINE: {
    bgColor: "bg-white",
    borderColor: "border-gray-400",
    dotColor: "bg-red-500",
    energyColor: "text-red-600",
    textColor: "text-gray-700",
    shadowColor: "shadow-gray-200",
    glowColor: "shadow-gray-400/50",
  },
};

const getDisplayStatus = (backendStatus) => {
  if (!backendStatus) return "OFFLINE";
  const status = backendStatus.toUpperCase();
  if (
    status === "OPERATIONAL" ||
    status === "IN_USE" ||
    status === "IN_CLASS" ||
    status === "ONLINE"
  ) {
    return "ONLINE";
  }
  return "OFFLINE";
};

function EquipmentNodeComponent({ data, onOpenModal, isMapped, isRealTimeActive }) {
  const equipment = data.equipment;
  const displayStatusKey = getDisplayStatus(equipment.status?.status);
  
  // Trust isRealTimeActive directly. 
  const isLive = isRealTimeActive;
  
  const statusKey = isLive ? "ONLINE" : "OFFLINE";
  const config = STATUS_CONFIG[statusKey];

  // --- ENERGY LOGIC ---
  const currentConsumption = equipment.status?.energyConsumption;
  const lastRecordedConsumption = equipment.status?.lastEnergyConsumption;

  let displayConsumption = 0;

  if (isLive || displayStatusKey === "ONLINE") {
    displayConsumption = currentConsumption ?? 0;
  } else {
    displayConsumption = lastRecordedConsumption ?? 0;
  }

  // ✅ FORCE OVERRIDE FOR EQ-0099
  if (equipment.equipmentId === 'EQ-0099') {
    displayConsumption = 0.28;
  }

  return (
    <div className="relative group" onClick={() => onOpenModal(equipment)}>
      <div
        className={`
          relative w-[210px] h-[46px] rounded-2xl border-2
          ${config.bgColor} ${config.borderColor}
          ${isLive ? `${config.shadowColor} shadow-lg hover:shadow-xl ${config.glowColor}` : 'shadow-sm hover:shadow-md'}
          hover:border-blue-500 transition-all duration-300 cursor-pointer
          flex items-center justify-between px-5
          ${isLive ? 'animate-pulse-subtle' : ''}
        `}
      >
        {/* LEFT: Status Dot + ID */}
        <div className="flex items-center gap-3 overflow-hidden">
          {/* Status dot with pulsing animation when ON */}
          <div className="relative flex-shrink-0">
            <div
              className={`w-3 h-3 rounded-full ${config.dotColor} shadow-sm ${
                isLive ? 'animate-pulse' : ''
              }`}
            ></div>
            {/* Glow effect when ON */}
            {isLive && (
              <div className="absolute inset-0 w-3 h-3 rounded-full bg-emerald-400 opacity-50 blur-sm animate-ping"></div>
            )}
          </div>
          <span className={`text-md font-mono font-bold ${config.textColor} truncate tracking-tight`}>
            {equipment.equipmentId}
          </span>
        </div>

        {/* RIGHT: Energy Consumption */}
        <div className="flex-shrink-0 pl-2">
          <span className={`text-md font-bold ${config.energyColor}`}>
            {displayConsumption.toFixed(2)}{" "}
            <span className={`text-md font-medium ${isLive ? 'text-emerald-500' : 'text-gray-400'}`}>
              kW
            </span>
          </span>
        </div>

        {/* Live indicator badge */}
        {isLive && (
          <div className="absolute -top-2 -right-2 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md animate-bounce">
            LIVE
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(EquipmentNodeComponent);