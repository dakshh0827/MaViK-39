/*
 * =====================================================
 * frontend/src/components/sld/EquipmentNode.jsx
 * =====================================================
 * Updated: Wider (210px), Rounded Corners (Pill), Offline Data Logic
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

function EquipmentNodeComponent({ data, onOpenModal }) {
  const equipment = data.equipment;
  const displayStatusKey = getDisplayStatus(equipment.status?.status);
  const config = STATUS_CONFIG[displayStatusKey];

  // --- ENERGY LOGIC FIX ---
  const currentConsumption = equipment.status?.energyConsumption;
  const lastRecordedConsumption = equipment.status?.lastEnergyConsumption;

  let displayConsumption = 0;

  if (displayStatusKey === "ONLINE") {
    // If Online, use current real-time consumption
    displayConsumption = currentConsumption ?? 0;
  } else {
    // If Offline (Faulty, Idle, etc.), STRICTLY use lastRecordedConsumption
    // If lastRecorded is null/undefined, it defaults to 0 (meaning no history available)
    displayConsumption = lastRecordedConsumption ?? 0;
  }

  return (
    <div className="relative group" onClick={() => onOpenModal(equipment)}>
      {/* RECTANGLE CARD 
          Width: 210px (Increased to fit long IDs)
          Height: 46px (Comfortable height)
          Rounded: rounded-full (Pill shape for softer look)
      */}
      <div
        className={`
          relative w-[210px] h-[46px] bg-white rounded-2xl border border-gray-400 
          shadow-sm hover:shadow-md hover:border-blue-500 transition-all duration-200 cursor-pointer
          flex items-center justify-between px-5
        `}
      >
        {/* LEFT: Status Dot + ID */}
        <div className="flex items-center gap-3 overflow-hidden">
          <div
            className={`w-3 h-3 rounded-full ${config.dotColor} flex-shrink-0 shadow-sm`}
          ></div>
          {/* ID with flex-shrink to ensure it truncates if absolutely necessary, 
              but width is increased to avoid this. */}
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
