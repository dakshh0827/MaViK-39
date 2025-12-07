/*
 * =====================================================
 * frontend/src/components/sld/EquipmentNode.jsx
 * =====================================================
 * Updated to support 'FAULTY' status for Real-Time monitoring
 * Updated with Modal for equipment details
 */
import { useState, memo } from "react";
import {
  Activity,
  CheckCircle,
  Clock,
  X,
  AlertTriangle,
  GraduationCap,
  AlertCircle, // Added for FAULTY status
} from "lucide-react";

// STRICT 4-STATE CONFIGURATION (Added FAULTY)
const STATUS_CONFIG = {
  OPERATIONAL: {
    color: "bg-emerald-500",
    dotColor: "bg-emerald-400",
    textColor: "text-emerald-700",
    borderColor: "border-emerald-200",
    icon: CheckCircle,
    label: "Operational",
  },
  IN_USE: {
    color: "bg-blue-500",
    dotColor: "bg-blue-400",
    textColor: "text-blue-700",
    borderColor: "border-blue-200",
    icon: Activity,
    label: "In Use",
  },
  IDLE: {
    color: "bg-gray-400",
    dotColor: "bg-gray-300",
    textColor: "text-gray-600",
    borderColor: "border-gray-200",
    icon: Clock,
    label: "Idle",
  },
  FAULTY: {
    color: "bg-red-500",
    dotColor: "bg-red-400",
    textColor: "text-red-700",
    borderColor: "border-red-200",
    icon: AlertCircle,
    label: "Faulty",
  },
};

const getDisplayStatus = (backendStatus) => {
  if (!backendStatus) return "IDLE";

  const status = backendStatus.toUpperCase();

  if (status === "FAULTY" || status === "MAINTENANCE") {
    return "FAULTY";
  }

  if (status === "IN_USE" || status === "IN_CLASS") {
    return "IN_USE";
  }

  if (status === "OPERATIONAL") {
    return "OPERATIONAL";
  }

  return "IDLE";
};

function EquipmentNodeComponent({ data, onOpenModal }) {
  const equipment = data.equipment;

  // 1. Get Normalized Status Key
  const displayStatusKey = getDisplayStatus(equipment.status?.status);

  // 2. Get Config
  const config = STATUS_CONFIG[displayStatusKey];
  const StatusIcon = config.icon;

  const healthScore = equipment.status?.healthScore || 0;
  const unresolvedAlerts = equipment._count?.alerts || 0;

  const getHealthColor = (score) => {
    if (score >= 80) return "text-emerald-600";
    if (score >= 60) return "text-amber-600";
    if (score >= 40) return "text-orange-600";
    return "text-red-600";
  };

  return (
    <div
      className="relative group"
      onClick={() => onOpenModal(equipment)}
    >
      {/* MAIN CARD - same as before */}
      <div
        className={`
          relative w-[140px] bg-white rounded-lg border-2 ${config.borderColor}
          shadow-sm group-hover:shadow-md transition-all duration-200 cursor-pointer
          overflow-hidden
        `}
      >
        {/* Status Bar */}
        <div className={`h-1 ${config.color}`}></div>

        {/* Content */}
        <div className="p-3 space-y-2">
          {/* Equipment Name */}
          <div>
            <h3 className="font-semibold text-gray-900 text-xs leading-tight line-clamp-2">
              {equipment.name}
            </h3>
            <p className="text-[10px] text-gray-500 font-mono mt-0.5 truncate">
              {equipment.equipmentId}
            </p>
          </div>

          {/* Metrics */}
          <div className="space-y-1.5">
            {/* Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <div
                  className={`w-2 h-2 rounded-full ${config.dotColor}`}
                ></div>
                <span className="text-[10px] text-gray-600">
                  {config.label}
                </span>
              </div>
            </div>

            {/* Health Score */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-gray-600">Health</span>
              <span
                className={`text-xs font-bold ${getHealthColor(healthScore)}`}
              >
                {healthScore.toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Alert Badge */}
      {unresolvedAlerts > 0 && (
        <div className="absolute -top-2 -right-2 z-10 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold shadow-sm ring-2 ring-white">
          {unresolvedAlerts}
        </div>
      )}
    </div>
  );
}

export default memo(EquipmentNodeComponent);