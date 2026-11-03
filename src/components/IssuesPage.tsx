import React, { useState } from "react";
import {
  LuCheck,
  LuSquare,
  LuChevronDown,
  LuChevronRight,
} from "react-icons/lu";
import Header from "./shared/Header";

// Interface for issue item
interface IssueItem {
  id: string;
  title: string;
  description: string;
  status: "open" | "in-progress" | "resolved";
  createdAt: Date;
  priority: "low" | "medium" | "high" | "critical";
}

// Interface for issue category
interface IssueCategory {
  id: string;
  title: string;
  icon: React.ReactNode;
  description: string;
  issues: IssueItem[];
}

const IssuesPage: React.FC = () => {
  // Sample initial data
  const initialCategories: IssueCategory[] = [
    {
      id: "ui-issues",
      title: "UI Issues",
      icon: <LuSquare className="text-blue-400" size={20} />,
      description:
        "Interface design problems, styling inconsistencies, and visual bugs.",
      issues: [
        {
          id: "ui-1",
          title: "Responsive design issues on mobile",
          description:
            "The file explorer doesn't collapse properly on smaller screens, causing layout problems.",
          status: "in-progress",
          createdAt: new Date("2025-04-02"),
          priority: "high",
        },
        {
          id: "ui-2",
          title: "Node color contrast in dark mode",
          description:
            "Some blueprint node headers have poor text contrast against certain background colors.",
          status: "open",
          createdAt: new Date("2025-04-05"),
          priority: "medium",
        },
      ],
    },
    {
      id: "ai-generation",
      title: "AI Generation",
      icon: <LuSquare className="text-purple-400" size={20} />,
      description:
        "Problems with natural language processing and blueprint generation accuracy.",
      issues: [
        {
          id: "ai-1",
          title: "Complex logic generation failures",
          description:
            "Requests with multiple conditional branches sometimes generate disconnected nodes.",
          status: "in-progress",
          createdAt: new Date("2025-03-28"),
          priority: "critical",
        },
        {
          id: "ai-2",
          title: "Inaccurate pin types for custom structures",
          description:
            "Vector and rotator pins are sometimes generated as generic object references.",
          status: "resolved",
          createdAt: new Date("2025-03-15"),
          priority: "high",
        },
      ],
    },
    {
      id: "export-import",
      title: "Export & Import",
      icon: <LuSquare className="text-green-400" size={20} />,
      description:
        "Issues related to Unreal Engine compatibility and file exports.",
      issues: [
        {
          id: "exp-1",
          title: "JSON export format incompatibility",
          description:
            "Exported JSON files cannot be directly imported into Unreal Engine 5 without an intermediate plugin.",
          status: "in-progress",
          createdAt: new Date("2025-04-01"),
          priority: "critical",
        },
        {
          id: "exp-2",
          title: "Missing node GUIDs on clipboard paste",
          description:
            "Direct copy-paste to Unreal Engine requires unique 32-character GUIDs for proper graph compilation.",
          status: "resolved",
          createdAt: new Date("2025-04-08"),
          priority: "high",
        },
      ],
    },
  ];

  // State for issue categories
  const [categories] = useState<IssueCategory[]>(initialCategories);

  // State for expanded categories
  const [expandedCategories, setExpandedCategories] = useState<
    Record<string, boolean>
  >(
    initialCategories.reduce(
      (acc, category) => ({ ...acc, [category.id]: true }),
      {}
    )
  );

  // State for showing resolved issues
  const [showResolved, setShowResolved] = useState(true);

  // Toggle category expansion
  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  const getPriorityBadgeClass = (priority: IssueItem["priority"]) => {
    switch (priority) {
      case "critical":
        return "bg-red-900/50 text-red-300 border-red-700/50";
      case "high":
        return "bg-orange-900/50 text-orange-300 border-orange-700/50";
      case "medium":
        return "bg-yellow-900/50 text-yellow-300 border-yellow-700/50";
      case "low":
        return "bg-green-900/50 text-green-300 border-green-700/50";
    }
  };

  const getStatusBadgeClass = (status: IssueItem["status"]) => {
    switch (status) {
      case "open":
        return "bg-blue-900/50 text-blue-300 border-blue-700/50";
      case "in-progress":
        return "bg-purple-900/50 text-purple-300 border-purple-700/50";
      case "resolved":
        return "bg-emerald-900/50 text-emerald-300 border-emerald-700/50";
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">
            Known Issues & Bugs
          </h1>
          <p className="text-gray-400 mt-2">
            Track reported problems, current fixes, and resolved bugs.
          </p>
        </div>

        {/* Filter controls */}
        <div className="flex justify-end mb-6">
          <button
            onClick={() => setShowResolved(!showResolved)}
            className="flex items-center space-x-2 text-sm text-gray-300 bg-gray-800/80 px-3 py-1.5 rounded-lg border border-gray-700 hover:bg-gray-700 transition-colors"
          >
            <LuCheck
              size={16}
              className={showResolved ? "text-green-400" : "text-gray-500"}
            />
            <span>Show resolved issues</span>
          </button>
        </div>

        {/* Categories and Issues list */}
        <div className="space-y-6">
          {categories.map((category) => {
            const visibleIssues = category.issues.filter(
              (issue) => showResolved || issue.status !== "resolved"
            );

            if (visibleIssues.length === 0) return null;

            return (
              <div
                key={category.id}
                className="bg-gray-800/40 rounded-xl border border-gray-700/60 overflow-hidden"
              >
                <div
                  onClick={() => toggleCategory(category.id)}
                  className="p-4 bg-gray-800/80 flex items-center justify-between cursor-pointer hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    {category.icon}
                    <div>
                      <h2 className="font-semibold text-lg">{category.title}</h2>
                      <p className="text-xs text-gray-400">{category.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-400">
                    <span className="text-xs">
                      {visibleIssues.length} issues
                    </span>
                    {expandedCategories[category.id] ? (
                      <LuChevronDown size={18} />
                    ) : (
                      <LuChevronRight size={18} />
                    )}
                  </div>
                </div>

                {expandedCategories[category.id] && (
                  <div className="divide-y divide-gray-700/40">
                    {visibleIssues.map((issue) => (
                      <div key={issue.id} className="p-4 hover:bg-gray-800/20 transition-colors">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-medium text-gray-200">
                              {issue.title}
                            </h3>
                            <p className="text-sm text-gray-400 mt-1">
                              {issue.description}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2 flex-shrink-0 ml-4">
                            <span
                              className={`text-xs px-2.5 py-0.5 rounded-full border ${getPriorityBadgeClass(
                                issue.priority
                              )}`}
                            >
                              {issue.priority}
                            </span>
                            <span
                              className={`text-xs px-2.5 py-0.5 rounded-full border ${getStatusBadgeClass(
                                issue.status
                              )}`}
                            >
                              {issue.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default IssuesPage;
