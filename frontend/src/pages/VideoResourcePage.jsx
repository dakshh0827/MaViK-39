import React from "react";
import { Link } from "react-router-dom";
import { FaArrowLeft, FaYoutube, FaExternalLinkAlt } from "react-icons/fa";

export default function VideoResourcesPage() {
  // Video Data
  const videoResources = [
    {
      title: "Mechanical Diploma - Lab Classes",
      description: "ET Lab Classes 02 for Mechanical Diploma 3rd Semester covering fundamental electrical technology.",
      url: "https://www.youtube.com/watch?v=zhy5EFAQCL4"
    },
    {
      title: "Carpentry Workshop Exercise",
      description: "Comprehensive guide on carpentry exercises and cross halving joints from the Mechanical Engineering Workshop.",
      url: "https://www.youtube.com/watch?v=_E0ASOb_rP8"
    },
    {
      title: "TIG & MIG Welding Guide",
      description: "Understanding the differences between TIG and MIG welding, types of welding, and joint classification.",
      url: "https://www.youtube.com/watch?v=ZyN9Tw9VTSo"
    },
    {
      title: "ITI Electrician Hand Tools",
      description: "A practical guide to ITI Electrician hand tools with visual identification and usage instructions.",
      url: "https://www.youtube.com/watch?v=knlMHLi84LY&list=PLWJUmxTv4Qy3MFpTwfGdNoD0_bp0pkcCO"
    },
    {
      title: "Engineering Drawing: Lines & Title Block",
      description: "Learn about the different types of lines in engineering drawing and how to create a standard title block.",
      url: "https://www.youtube.com/watch?v=yVcs0VQGsTo&list=PLWJUmxTv4Qy1CQ_AoHH4liNZS3sM1UMiC"
    },
    {
      title: "Employability Skills Class 2025",
      description: "Overview of the ITI Employability Skills syllabus, covering career skills, digital literacy, and future work skills.",
      url: "https://www.youtube.com/watch?v=cSE8YUSH0W0&list=PLFXJRLJ1IaWnRmvv328_QNP-YpIv1DZ9p"
    }
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link to="/help" className="text-gray-500 hover:text-gray-700 transition-colors">
              <FaArrowLeft />
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Video Training Resources</h1>
          </div>
          <p className="text-gray-500 text-sm ml-6">
            Curated video tutorials for laboratory equipment and safety procedures.
          </p>
        </div>
      </div>

      {/* Video Grid */}
      <div className="grid grid-cols-1 gap-4">
        {videoResources.map((video, index) => (
          <div 
            key={index} 
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col md:flex-row items-center justify-between gap-6 transition-all hover:shadow-md hover:border-red-200 group"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-red-50 rounded-lg text-red-600 group-hover:bg-red-100 transition-colors">
                <FaYoutube className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 group-hover:text-red-700 transition-colors">
                  {video.title}
                </h2>
                <p className="text-gray-500 text-sm mt-1 max-w-xl">
                  {video.description}
                </p>
              </div>
            </div>
            <a 
              href={video.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 font-medium py-2.5 px-5 rounded-lg hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-all shadow-sm whitespace-nowrap"
            >
              Watch Video <FaExternalLinkAlt size={16} />
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}