import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  FaBook,
  FaEnvelope,
  FaPhone,
  FaQuestionCircle,
  FaChartLine,
  FaWrench,
  FaMobileAlt,
  FaInfoCircle,
  FaExternalLinkAlt,
  FaChevronDown,
  FaChevronUp,
  FaCommentAlt,
  FaFileAlt,
  FaYoutube
} from "react-icons/fa";
import { useAuthStore } from "../stores/authStore";

export default function HelpSupportPage() {
  const { user } = useAuthStore();
  const [openSection, setOpenSection] = useState(null);

  const toggleSection = (index) => {
    setOpenSection(openSection === index ? null : index);
  };

  const isManagerOrAbove = user?.role === "LAB_MANAGER" || user?.role === "POLICY_MAKER";
  const isTrainer = user?.role === "TRAINER";

  // Dynamic Content Generators based on Role
  const getFAQs = () => (
    <ul className="space-y-3 text-gray-600 text-sm">
      <li><strong>Common Issues:</strong> Check power cables first. If the screen is blank, verify the breaker.</li>
      <li><strong>IoT Alerts:</strong> "Maintenance Needed" means sensors crossed safety thresholds. {isManagerOrAbove ? "Schedule a checkup." : "Notify the Lab Manager."}</li>
      <li><strong>Password Reset:</strong> Use the 'Forgot Password' link on the login screen.</li>
      <li><strong>Scheduling:</strong> {isManagerOrAbove ? "Approve reservation requests in the Scheduler tab." : "View equipment availability in the Calendar."}</li>
      
      {/* Manager Only FAQs */}
      {isManagerOrAbove && (
        <>
          <li className="text-blue-700 bg-blue-50 p-2 rounded border border-blue-100"><strong>Manager Tip:</strong> How to add new equipment? Go to Equipment &gt; Add New.</li>
          <li className="text-blue-700 bg-blue-50 p-2 rounded border border-blue-100"><strong>Manager Tip:</strong> To export reports, use the "Generate PDF" button in the Reports tab.</li>
        </>
      )}
    </ul>
  );

  const getMaintenanceSupport = () => (
    <ul className="space-y-3 text-gray-600 text-sm">
      <li><strong>Alert Response:</strong> {isManagerOrAbove ? "Acknowledge the alert in the dashboard and assign a technician." : "Observe the alert type and report it to the Lab Manager immediately."}</li>
      <li><strong>Breakdowns:</strong> Call the helpline immediately for critical failures.</li>
      
      {/* Manager Only Maintenance */}
      {isManagerOrAbove && (
        <li><strong>Logging Maintenance:</strong> Click 'Complete' on a work order to log it to history.</li>
      )}
      
      {/* Trainer Only Maintenance */}
      {isTrainer && (
        <li><strong>Reporting Issues:</strong> Use the "Report Breakdown" button in the dashboard to flag malfunctioning equipment.</li>
      )}
    </ul>
  );

  const getAppFeatures = () => (
    <ul className="list-disc pl-5 space-y-2 text-gray-600 text-sm">
      <li>View Usage Analytics via the 'Analytics' tab {isTrainer ? "(Read-only view)" : ""}.</li>
      <li>Submit Incident Reports using the red '+' button.</li>
      
      {/* Manager Only Features */}
      {isManagerOrAbove && (
        <li>Manage Lab Settings and user access in the "Settings" tab.</li>
      )}
      
      {/* Trainer Only Features */}
      {isTrainer && (
        <li>View Standard Operating Procedures (SOPs) in the User Guide.</li>
      )}
    </ul>
  );

  // Detailed Support Sections
  const supportSections = [
    {
      title: "Frequently Asked Questions (FAQ)",
      icon: FaQuestionCircle,
      content: getFAQs()
    },
    {
      title: "Maintenance & Alert Support",
      icon: FaWrench,
      content: getMaintenanceSupport()
    },
    {
      title: "How to Use App Features",
      icon: FaMobileAlt,
      content: getAppFeatures()
    },
    {
      title: "System Status",
      icon: FaChartLine,
      content: (
        <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-800 font-medium text-sm">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            All Systems Operational
          </div>
          <span className="text-xs text-emerald-600 font-medium">Uptime: 99.9%</span>
        </div>
      )
    },
    {
      title: "Feedback & Suggestions",
      icon: FaCommentAlt,
      content: (
        <form className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500">Your Feedback</label>
            <textarea 
              className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" 
              placeholder="Describe a bug or feature request..." 
              rows="3"
            ></textarea>
          </div>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm">
            Submit Feedback
          </button>
        </form>
      )
    },
    {
      title: "Custom Request",
      icon: FaFileAlt,
      content: (
        <form className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500">Describe what you want</label>
            <textarea 
              className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" 
              placeholder="Enter your custom requirement or specific request here..." 
              rows="3"
            ></textarea>
          </div>
          <button className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-900 transition-colors shadow-sm">
            Send Request
          </button>
        </form>
      )
    }
  ];

  return (
    <div className="space-y-4 p-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gray-200 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Help Center</h1>
        </div>
      </div>

      {/* Trainer Specific Resources (User Guide & Videos) */}
      {isTrainer && (
        <div className="space-y-4">
          
          {/* User Guide Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col md:flex-row items-center justify-between gap-6 transition-shadow hover:shadow-md">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
                <FaBook className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Equipment User Guides</h2>
                <p className="text-gray-500 text-sm mt-1 max-w-xl">
                  Access standard operating procedures, safety checklists, and 4-step visual guides for all laboratory equipment.
                </p>
              </div>
            </div>
            <Link 
              to="/user-guide" 
              className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 font-medium py-2.5 px-5 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm whitespace-nowrap"
            >
              Open Guide <FaExternalLinkAlt size={16} />
            </Link>
          </div>

          {/* Video Resources Card (Replaces Inline List) */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col md:flex-row items-center justify-between gap-6 transition-shadow hover:shadow-md">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-red-50 rounded-lg text-red-600">
                <FaYoutube className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Video Training Resources</h2>
                <p className="text-gray-500 text-sm mt-1 max-w-xl">
                  Watch detailed video tutorials on carpentry, welding, electrical tools, and engineering drawing.
                </p>
              </div>
            </div>
            <Link 
              to="/video-resources" 
              className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 font-medium py-2.5 px-5 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm whitespace-nowrap"
            >
              View Videos <FaExternalLinkAlt size={16} />
            </Link>
          </div>
        </div>
      )}

      {/* Main Support Sections */}
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 bg-gray-50/50 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <FaInfoCircle className="w-5 h-5 text-blue-600" />
              Support Resources
            </h2>
          </div>
          
          <div className="divide-y divide-gray-100">
            {supportSections.map((section, index) => {
              const isOpen = openSection === index;
              return (
                <div 
                  key={index} 
                  className={`transition-all duration-300 ${
                    isOpen 
                      ? 'bg-gray-50 border-l-4 border-l-blue-500' // Highlighting logic
                      : 'bg-white border-l-4 border-l-transparent hover:bg-gray-50/50'
                  }`}
                >
                  <button
                    onClick={() => toggleSection(index)}
                    className="w-full px-6 py-4 flex items-center justify-between text-left focus:outline-none group"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-md transition-colors ${
                        isOpen 
                          ? 'bg-blue-100 text-blue-600' 
                          : 'bg-gray-50 text-gray-500 group-hover:bg-white group-hover:text-blue-500'
                      }`}>
                        <section.icon className="w-5 h-5" />
                      </div>
                      <span className={`font-medium transition-colors ${
                        isOpen ? 'text-blue-800' : 'text-gray-700'
                      }`}>
                        {section.title}
                      </span>
                    </div>
                    {isOpen ? (
                      <FaChevronUp className="w-4 h-4 text-blue-500" />
                    ) : (
                      <FaChevronDown className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                    )}
                  </button>
                  
                  {isOpen && (
                    <div className="px-6 pb-6 pt-2 pl-[3.75rem] animate-in fade-in slide-in-from-top-1 duration-200">
                      <div className="prose prose-sm max-w-none">
                        {section.content}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Contact Info Footer */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex items-start gap-4 hover:border-blue-200 transition-colors">
          <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
            <FaEnvelope className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900 text-sm">Email Support</h3>
            <a href="mailto:saarthitactrion@gmail.com" className="text-blue-600 text-sm font-medium hover:underline block mt-0.5">
              saarthitactrion@gmail.com
            </a>
            <p className="text-xs text-gray-400 mt-1">Response time: &lt; 24 hours</p>
          </div>
        </div>
        
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex items-start gap-4 hover:border-green-200 transition-colors">
          <div className="p-2 bg-green-50 rounded-lg text-green-600">
            <FaPhone className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900 text-sm">Helpline</h3>
            <p className="text-green-700 text-sm font-medium mt-0.5">+91 7357756699</p>
            <p className="text-xs text-gray-400 mt-1">Urgent breakdowns (9 AM - 6 PM)</p>
          </div>
        </div>
      </div>
    </div>
  );
}