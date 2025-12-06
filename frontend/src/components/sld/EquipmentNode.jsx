/*
 * =====================================================
 * frontend/src/components/sld/EquipmentNode.jsx
 * =====================================================
 * Updated to support 'FAULTY' status for Real-Time monitoring
 */
import { useState, memo } from "react";
import {
  Activity,
  CheckCircle,
  Clock,
  ChevronDown,
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

function EquipmentNodeComponent({ data }) {
  const [showDetails, setShowDetails] = useState(false);
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
    // WRAPPER: Handles positioning and click events, but allows overflow
    <div
      className="relative group"
      onClick={() => setShowDetails(!showDetails)}
    >
      {/* MAIN CARD: Keeps overflow-hidden so the colored status bar 
          doesn't bleed out of the rounded corners 
      */}
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

        {/* Expand Indicator */}
        <div className="absolute bottom-1 right-1">
          <ChevronDown
            className={`w-3 h-3 text-gray-400 transition-transform ${
              showDetails ? "rotate-180" : ""
            }`}
          />
        </div>
      </div>

      {/* BADGE: Placed OUTSIDE the card container so it isn't clipped.
          -top-2 -right-2 positions it cleanly on the corner.
          z-10 ensures it sits on top of everything.
      */}
      {unresolvedAlerts > 0 && (
        <div className="absolute -top-2 -right-2 z-10 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold shadow-sm ring-2 ring-white">
          {unresolvedAlerts}
        </div>
      )}

      {/* Details Popup */}
      {showDetails && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={(e) => {
              e.stopPropagation();
              setShowDetails(false);
            }}
          />

          {/* Popup */}
          <div
            className="absolute z-50 top-full left-1/2 transform -translate-x-1/2 mt-2 w-72 bg-white rounded-lg shadow-xl border border-gray-200 p-4 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowDetails(false)}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-3">
              <div>
                <h4 className="font-bold text-base text-gray-900">
                  {equipment.name}
                </h4>
                <p className="text-xs text-gray-500 font-mono">
                  {equipment.equipmentId}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-gray-500">Manufacturer</p>
                  <p className="font-medium text-gray-900">
                    {equipment.manufacturer}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Model</p>
                  <p className="font-medium text-gray-900">{equipment.model}</p>
                </div>
              </div>

              {equipment.serialNumber && (
                <div className="text-xs">
                  <p className="text-gray-500">Serial Number</p>
                  <p className="font-medium font-mono text-gray-900">
                    {equipment.serialNumber}
                  </p>
                </div>
              )}

              <div className="pt-2 border-t border-gray-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">Status</span>
                  <div className="flex items-center gap-1.5">
                    <StatusIcon className={`w-3.5 h-3.5 ${config.textColor}`} />
                    <span
                      className={`text-xs font-semibold ${config.textColor}`}
                    >
                      {config.label}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">Health Score</span>
                  <span
                    className={`text-sm font-bold ${getHealthColor(
                      healthScore
                    )}`}
                  >
                    {healthScore.toFixed(1)}%
                  </span>
                </div>

                {equipment.status?.temperature && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">Temperature</span>
                    <span className="text-xs font-medium text-gray-900">
                      {equipment.status.temperature.toFixed(1)}°C
                    </span>
                  </div>
                )}

                {equipment.status?.isOperatingInClass && (
                  <div className="flex items-center gap-2 bg-purple-50 p-2 rounded text-xs">
                    <GraduationCap className="w-3.5 h-3.5 text-purple-600" />
                    <span className="text-purple-700 font-medium">
                      In class session
                    </span>
                  </div>
                )}

                {unresolvedAlerts > 0 && (
                  <div className="flex items-center gap-2 bg-red-50 p-2 rounded text-xs">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                    <span className="text-red-700 font-medium">
                      {unresolvedAlerts} alert{unresolvedAlerts > 1 ? "s" : ""}
                    </span>
                  </div>
                )}
              </div>

              {equipment.status?.lastUsedAt && (
                <div className="text-[10px] text-gray-500 pt-2 border-t border-gray-100">
                  Last used:{" "}
                  {new Date(equipment.status.lastUsedAt).toLocaleString()}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default memo(EquipmentNodeComponent);