import React, { useState } from "react";
import Header from "./shared/Header";
import {
  LuSquare,
  LuLayers,
  LuBrainCircuit,
  LuPuzzle,
  LuRocket,
  LuCheck,
  LuSparkles,
  LuUsers,
  LuCalendar,
} from "react-icons/lu";

// Interface for roadmap phases
interface RoadmapPhase {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  date?: string;
  items: RoadmapItem[];
}

// Interface for roadmap items
interface RoadmapItem {
  text: string;
  completed: boolean;
  date?: string;
  subItems?: RoadmapItem[];
}

const RoadmapPage: React.FC = () => {
  // Track which phases are expanded
  const [expandedPhases, setExpandedPhases] = useState<string[]>(["phase-1"]);

  // Toggle phase expansion
  const togglePhase = (phaseId: string) => {
    setExpandedPhases((prev) =>
      prev.includes(phaseId)
        ? prev.filter((id) => id !== phaseId)
        : [...prev, phaseId]
    );
  };

  // Roadmap data
  const roadmapPhases: RoadmapPhase[] = [
    {
      id: "phase0",
      title: "Project Initialization",
      description: "The beginning of the Noder project",
      icon: <LuLayers className="w-10 h-10 text-secondary-400" />,
      date: "November 3, 2024",
      items: [
        {
          text: "Project Initialized",
          completed: true,
          date: "November 3, 2024",
          subItems: [
            { text: "Basic project structure created", completed: true },
            { text: "Initial planning and research", completed: true },
          ],
        },
        {
          text: "Basic Prototype of Editor Layout",
          completed: true,
          date: "November 13, 2024",
          subItems: [
            { text: "Initial UI components created", completed: true },
            { text: "Basic layout structure established", completed: true },
          ],
        },
        {
          text: "Enhanced Editor Layout Concept",
          completed: true,
          date: "November 17, 2024",
          subItems: [
            { text: "Improved UI design", completed: true },
            { text: "Better component organization", completed: true },
          ],
        },
        {
          text: "Tech Stack Research",
          completed: true,
          date: "November 20, 2024",
          subItems: [
            {
              text: "Evaluated different frameworks and libraries",
              completed: true,
            },
            {
              text: "Selected optimal tech stack for the project",
              completed: true,
            },
          ],
        },
      ],
    },
    {
      id: "phase1",
      title: "Development Phase 1",
      description: "Initial development and core features",
      icon: <LuBrainCircuit className="w-10 h-10 text-primary-400" />,
      date: "November 22, 2024",
      items: [
        {
          text: "React + Tailwind Project Initialized",
          completed: true,
          date: "November 22, 2024",
          subItems: [
            { text: "Set up development environment", completed: true },
            {
              text: "Configured build tools and dependencies",
              completed: true,
            },
          ],
        },
        {
          text: "Home Page Created",
          completed: true,
          date: "December 7, 2024",
          subItems: [
            { text: "Designed and implemented landing page", completed: true },
            {
              text: "Added key features and benefits section",
              completed: true,
            },
          ],
        },
        {
          text: "Roadmap Page Created",
          completed: true,
          date: "December 12, 2024",
          subItems: [
            { text: "Implemented roadmap visualization", completed: true },
            { text: "Added project timeline and milestones", completed: true },
          ],
        },
        {
          text: "Project Page Created",
          completed: true,
          date: "December 13, 2024",
          subItems: [
            {
              text: "Implemented project management interface",
              completed: true,
            },
            {
              text: "Added project creation and management features",
              completed: true,
            },
          ],
        },
        {
          text: "Page Refinements and UI Improvements",
          completed: true,
          date: "December 20, 2024",
          subItems: [
            {
              text: "Enhanced visual design and user experience",
              completed: true,
            },
            {
              text: "Improved responsiveness and accessibility",
              completed: true,
            },
          ],
        },
      ],
    },
    {
      id: "phase2",
      title: "Development Phase 2",
      description: "Core functionality and editor implementation",
      icon: <LuPuzzle className="w-10 h-10 text-accent-400" />,
      date: "January 13, 2025",
      items: [
        {
          text: "Editor Layout Created",
          completed: true,
          date: "January 13, 2025",
          subItems: [
            { text: "Implemented blueprint editor interface", completed: true },
            {
              text: "Added node and connection visualization",
              completed: true,
            },
          ],
        },
        {
          text: "Core LLM and JSON Data Integration",
          completed: true,
          date: "February 3, 2025",
          subItems: [
            {
              text: "Integrated LLM API for blueprint generation",
              completed: true,
            },
            {
              text: "Implemented JSON data handling and validation",
              completed: true,
            },
          ],
        },
        {
          text: "UI and UX Improvements",
          completed: true,
          date: "February 13, 2025",
          subItems: [
            { text: "Enhanced user interface elements", completed: true },
            { text: "Improved user experience and workflow", completed: true },
          ],
        },
        {
          text: "Rules and Additional Features",
          completed: true,
          date: "February 20, 2025",
          subItems: [
            {
              text: "Implemented security rules and permissions",
              completed: true,
            },
            {
              text: "Added additional functionality and features",
              completed: true,
            },
          ],
        },
        {
          text: "Small Code Improvements",
          completed: true,
          date: "March 18, 2025",
          subItems: [
            { text: "Refactored and optimized code", completed: true },
            { text: "Fixed bugs and improved performance", completed: true },
          ],
        },
      ],
    },
    {
      id: "phase3",
      title: "Deployment and Hosting",
      description: "Deploying the application to production",
      icon: <LuRocket className="w-10 h-10 text-violet-400" />,
      date: "April 7, 2025",
      items: [
        {
          text: "Vercel, Firebase and Render Hosting",
          completed: true,
          date: "April 7-8, 2025",
          subItems: [
            { text: "Set up Vercel for frontend hosting", completed: true },
            {
              text: "Configured Firebase for backend services",
              completed: true,
            },
            { text: "Deployed serverless functions", completed: true },
          ],
        },
        {
          text: "Developer Ecosystem Program",
          completed: true,
          date: "April 8, 2025",
          subItems: [
            {
              text: "Prepared open developer tool documentation",
              completed: true,
            },
            { text: "Submitted grant request for funding", completed: true },
          ],
        },
      ],
    },
    {
      id: "beta2",
      title: "Beta 2.0 (3-6 months)",
      description: "Future improvements and enhancements",
      icon: <LuSparkles className="w-10 h-10 text-yellow-400" />,
      items: [
        { text: "Code Base Refactoring", completed: false },
        { text: "UI and UX Improvements", completed: false },
        { text: "Smart LLM API Rotation", completed: false },
        { text: "More Secure and Robust Login/Signup", completed: false },
        { text: "Hosting & Better Cloud Storage Options", completed: false },
      ],
    },
    {
      id: "alpha",
      title: "Alpha v1 (3-7 months)",
      description: "Advanced features and community integration",
      icon: <LuUsers className="w-10 h-10 text-blue-400" />,
      items: [
        { text: "Better Exporting/Copy Paste", completed: false },
        { text: "Community and Sharing of Scripts + Forum", completed: false },
        { text: "Live-Link-Layer for Unreal", completed: false },
        { text: "Interactive Learning and Tutorials", completed: false },
      ],
    },
  ];

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-[#070B14] to-[#0A1428] text-white">
      <Header />

      {/* Main Content */}
      <div className="pt-28 pb-20 px-6 max-w-6xl mx-auto">
        {/* Hero Section */}
        <div className="relative mb-16">
          {/* Glow effect */}
          <div className="absolute -inset-1 top-20 bg-gradient-to-r from-secondary-700/20 via-primary-600/20 to-accent-600/20 rounded-lg blur-xl opacity-70"></div>

          <h1 className="text-4xl md:text-5xl font-bold text-center mb-4 bg-gradient-to-r from-secondary-300 via-primary-300 to-accent-400 bg-clip-text text-transparent">
            Noder Project Roadmap
          </h1>
          <p className="text-lg text-center text-gray-300 max-w-3xl mx-auto">
            Our development journey and the exciting features we're building for
            you. Track our progress and see what's coming next in our visual
            blueprint generation tool.
          </p>
        </div>

        {/* Core Goal Section */}
        <div className="relative mb-16 bg-[#0A0F1C]/50 backdrop-blur-md border border-gray-800/40 p-8 rounded-xl">
          <h2 className="text-2xl font-bold text-center mb-6 text-primary-300">
            Core Goal
          </h2>
          <p className="text-lg text-center text-gray-300 max-w-3xl mx-auto">
            To provide a tool that allows users to generate Unreal Engine
            Blueprints from natural language queries and manage them within a
            project structure.
          </p>
        </div>

        {/* Phases Timeline */}
        <div className="space-y-8">
          {roadmapPhases.map((phase) => (
            <div
              key={phase.id}
              className="relative transition-all duration-300 bg-[#0A0F1C]/40 backdrop-blur-sm border border-gray-800/30 rounded-xl overflow-hidden hover:border-gray-700/50 hover:shadow-md hover:shadow-accent-900/20"
            >
              {/* Phase Header */}
              <div
                className="flex items-center cursor-pointer p-6 group"
                onClick={() => togglePhase(phase.id)}
              >
                <div className="mr-6 p-3 rounded-full bg-[#0A1428]/60 group-hover:bg-[#0A1428]/90 transition-all border border-gray-800/30">
                  {phase.icon}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-100 group-hover:text-white transition-colors">
                    {phase.title}
                  </h3>
                  <p className="text-gray-400 group-hover:text-gray-300 transition-colors">
                    {phase.description}
                  </p>
                  {phase.date && (
                    <div className="flex items-center mt-1 text-sm text-gray-500">
                      <LuCalendar className="w-4 h-4 mr-1" />
                      <span>{phase.date}</span>
                    </div>
                  )}
                </div>
                <div className="ml-4 transform transition-transform duration-300">
                  <svg
                    className={`w-6 h-6 text-gray-400 ${
                      expandedPhases.includes(phase.id) ? "rotate-180" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </div>

              {/* Phase Content */}
              {expandedPhases.includes(phase.id) && (
                <div className="px-6 pb-6 border-t border-gray-800/50 pt-4 space-y-4">
                  {phase.items.map((item, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-start">
                        {item.completed ? (
                          <LuCheck className="w-5 h-5 text-accent-400 mr-3 mt-0.5" />
                        ) : (
                          <LuSquare className="w-5 h-5 text-gray-500 mr-3 mt-0.5" />
                        )}
                        <div>
                          <span
                            className={`font-medium ${
                              item.completed ? "text-white" : "text-gray-300"
                            }`}
                          >
                            {item.text}
                          </span>
                          {item.date && (
                            <div className="flex items-center mt-1 text-xs text-gray-500">
                              <LuCalendar className="w-3 h-3 mr-1" />
                              <span>{item.date}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Sub-items */}
                      {item.subItems && (
                        <div className="ml-8 pl-4 border-l border-gray-800/60 space-y-2 mt-2">
                          {item.subItems.map((subItem, subIndex) => (
                            <div key={subIndex} className="flex items-start">
                              {subItem.completed ? (
                                <LuCheck className="w-4 h-4 text-accent-400 mr-3 mt-0.5" />
                              ) : (
                                <LuSquare className="w-4 h-4 text-gray-500 mr-3 mt-0.5" />
                              )}
                              <span
                                className={`text-sm ${
                                  subItem.completed
                                    ? "text-gray-300"
                                    : "text-gray-400"
                                }`}
                              >
                                {subItem.text}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Contribute Section */}
        <div className="mt-16 text-center">
          <div className="relative inline-block">
            <div className="absolute -inset-1 bg-gradient-to-r from-secondary-700/30 to-accent-600/30 rounded-full blur-md opacity-70"></div>
            <a
              href="https://github.com/xrishb/noder"
              target="_blank"
              rel="noopener noreferrer"
              className="relative px-8 py-3 bg-[#0A0F1C] border border-secondary-700/40 rounded-full text-sm font-medium text-white hover:text-white/90 transition-all duration-300 inline-block"
            >
              Contribute on GitHub
            </a>
          </div>
          <p className="mt-4 text-gray-400 text-sm">
            Have ideas? We'd love to hear from you!
          </p>
        </div>
      </div>
    </div>
  );
};

export default RoadmapPage;

