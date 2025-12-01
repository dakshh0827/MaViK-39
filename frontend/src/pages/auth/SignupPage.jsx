import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";
import { useInstituteStore } from "../../stores/instituteStore";
import {
  FaChartLine,
  FaUser,
  FaEnvelope,
  FaLock,
  FaBuilding,
  FaExclamationCircle,
  FaHashtag,
  FaBook,
} from "react-icons/fa";

// Department names from the schema
const departments = [
  "FITTER_MANUFACTURING",
  "ELECTRICAL_ENGINEERING",
  "WELDING_FABRICATION",
  "TOOL_DIE_MAKING",
  "ADDITIVE_MANUFACTURING",
  "SOLAR_INSTALLER_PV",
  "MATERIAL_TESTING_QUALITY",
  "ADVANCED_MANUFACTURING_CNC",
  "AUTOMOTIVE_MECHANIC",
];

const DEPARTMENT_DISPLAY_NAMES = {
  FITTER_MANUFACTURING: "Fitter/Manufacturing",
  ELECTRICAL_ENGINEERING: "Electrical Engineering",
  WELDING_FABRICATION: "Welding & Fabrication",
  TOOL_DIE_MAKING: "Tool & Die Making",
  ADDITIVE_MANUFACTURING: "Additive Manufacturing",
  SOLAR_INSTALLER_PV: "Solar Installer (PV)",
  MATERIAL_TESTING_QUALITY: "Material Testing/Quality",
  ADVANCED_MANUFACTURING_CNC: "Advanced Manufacturing/CNC",
  AUTOMOTIVE_MECHANIC: "Automotive/Mechanic",
};

export default function SignupPage() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    role: "TRAINER",
    phone: "",
    instituteId: "", // Changed from 'institute' to 'instituteId'
    department: "",
    labId: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { register } = useAuthStore();
  const { institutes, fetchInstitutes, isLoading: institutesLoading } =
    useInstituteStore();

  useEffect(() => {
    fetchInstitutes();
  }, [fetchInstitutes]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    // Clear error when user starts typing
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Basic validation
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    // UPDATED: Role-specific validation - both roles now require all three fields
    if (formData.role === "LAB_MANAGER" || formData.role === "TRAINER") {
      if (!formData.instituteId) {
        setError("Institute is required for this role");
        return;
      }
      if (!formData.department) {
        setError("Department is required for this role");
        return;
      }
      if (!formData.labId) {
        setError("Lab ID is required for this role");
        return;
      }
    }

    setIsLoading(true);

    try {
      // Destructure to remove frontend-only fields
      const { confirmPassword, ...registerData } = formData;

      // Clean up data based on role to match backend expectations
      const cleanData = { ...registerData };

      if (formData.role === "POLICY_MAKER") {
        // Policy makers don't need institute, department, or labId
        delete cleanData.instituteId;
        delete cleanData.department;
        delete cleanData.labId;
      }
      // No fields deleted for Trainer or Lab Manager - both now send all fields

      await register(cleanData);
      // Navigate to verify-email page, passing email in state
      navigate("/verify-email", { state: { email: formData.email } });
    } catch (err) {
      setError(
        err.message ||
          err.errors?.[0]?.msg ||
          "Registration failed. Please check your inputs and try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white px-4 py-8">
      <div className="max-w-2xl w-full">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <FaChartLine className="w-12 h-12 text-blue-900" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900">Create Account</h2>
          <p className="text-gray-600 mt-2">
            Join the IoT Equipment Monitoring Platform
          </p>
        </div>

        {/* Signup Form */}
        <div className="bg-white rounded-lg shadow-md p-8">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <FaExclamationCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-red-800">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <FaUser className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            {/* Email and Phone */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <FaEnvelope className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Role Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role <span className="text-red-500">*</span>
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="TRAINER">Trainer</option>
                <option value="LAB_MANAGER">Lab Manager</option>
                <option value="POLICY_MAKER">Policy Maker</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {formData.role === "TRAINER" &&
                  "Trainers view equipment in their assigned lab"}
                {formData.role === "LAB_MANAGER" &&
                  "Lab Managers oversee all labs in their department"}
                {formData.role === "POLICY_MAKER" &&
                  "Policy Makers have system-wide access"}
              </p>
            </div>

            {/* UPDATED: Show all three fields for both LAB_MANAGER and TRAINER */}
            {(formData.role === "LAB_MANAGER" ||
              formData.role === "TRAINER") && (
              <>
                {/* Institute */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Institute <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <FaBuilding className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <select
                      name="instituteId"
                      value={formData.instituteId}
                      onChange={handleChange}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                      disabled={institutesLoading}
                    >
                      <option value="">
                        {institutesLoading
                          ? "Loading institutes..."
                          : "Select Institute"}
                      </option>
                      {institutes.map((inst) => (
                        <option key={inst.id} value={inst.instituteId}>
                          {inst.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Department */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Department <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <FaBook className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <select
                      name="department"
                      value={formData.department}
                      onChange={handleChange}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">Select Department</option>
                      {departments.map((dept) => (
                        <option key={dept} value={dept}>
                          {DEPARTMENT_DISPLAY_NAMES[dept] || dept}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.role === "LAB_MANAGER"
                      ? "You will manage all labs in this department at your institute"
                      : "Select the department of your assigned lab"}
                  </p>
                </div>

                {/* Lab ID */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lab ID <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <FaHashtag className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      name="labId"
                      value={formData.labId}
                      onChange={handleChange}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., ITI-PUSA-MECH-01"
                      required
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.role === "LAB_MANAGER"
                      ? "Enter your primary Lab ID."
                      : "Enter the Lab ID you are assigned to."}
                  </p>
                </div>
              </>
            )}

            {/* Password Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <FaLock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    minLength={8}
                    required
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Minimum 8 characters
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-blue-900 text-white rounded-lg hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {isLoading ? "Creating Account..." : "Create Account"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-blue-900 hover:underline font-medium"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>

        {/* Back to Home */}
        <div className="text-center mt-6">
          <Link to="/" className="text-sm text-gray-600 hover:text-blue-900">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}