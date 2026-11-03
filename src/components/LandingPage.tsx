import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  LuBrainCircuit, 
  LuCode, 
  LuArrowRight,
  LuRocket,
  LuSave,
  LuUsers,
  LuActivity,
  LuSunMoon
} from 'react-icons/lu';
import Header from './shared/Header';
import { useAuth } from '../contexts/AuthContext';

// Add this component before the LandingPage component
const BlueprintDiagram: React.FC = () => {
  return (
    <div className="w-full h-full relative">
      {/* Background grid */}
      <div className="absolute inset-0 bg-[#060A14] opacity-50" style={{ 
        backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)',
        backgroundSize: '20px 20px'
      }}></div>
      
      {/* Nodes */}
      <div className="absolute top-1/4 left-1/4 w-32 sm:w-40 h-auto bg-[#0A0F1C] border border-primary-500/50 rounded-md p-2 shadow-lg">
        <div className="text-xs text-primary-300 font-mono border-b border-primary-500/30 pb-1 mb-1">Input Action</div>
        <div className="text-xs text-white/60">Jump</div>
        <div className="mt-2 pt-2 border-t border-primary-500/30">
          <div className="flex items-center">
            <div className="w-2 h-2 rounded-full bg-primary-400 mr-1"></div>
            <div className="text-xs text-white/60">Pressed</div>
          </div>
        </div>
      </div>
      
      <div className="absolute top-1/4 left-1/2 w-32 sm:w-40 h-auto bg-[#0A0F1C] border border-accent-500/50 rounded-md p-2 shadow-lg">
        <div className="text-xs text-accent-300 font-mono border-b border-accent-500/30 pb-1 mb-1">Branch</div>
        <div className="text-xs text-white/60">Is Valid</div>
        <div className="mt-2 pt-2 border-t border-accent-500/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-2 h-2 rounded-full bg-green-400 mr-1"></div>
              <div className="text-xs text-white/60">True</div>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 rounded-full bg-red-400 mr-1"></div>
              <div className="text-xs text-white/60">False</div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="absolute top-1/2 left-1/3 w-32 sm:w-40 h-auto bg-[#0A0F1C] border border-secondary-500/50 rounded-md p-2 shadow-lg">
        <div className="text-xs text-secondary-300 font-mono border-b border-secondary-500/30 pb-1 mb-1">Apply Force</div>
        <div className="text-xs text-white/60">Upward</div>
        <div className="mt-2 pt-2 border-t border-secondary-500/30">
          <div className="flex items-center">
            <div className="w-2 h-2 rounded-full bg-secondary-400 mr-1"></div>
            <div className="text-xs text-white/60">Force</div>
          </div>
        </div>
      </div>
      
      <div className="absolute top-1/2 left-2/3 w-32 sm:w-40 h-auto bg-[#0A0F1C] border border-primary-500/50 rounded-md p-2 shadow-lg">
        <div className="text-xs text-primary-300 font-mono border-b border-primary-500/30 pb-1 mb-1">Play Sound</div>
        <div className="text-xs text-white/60">Jump Sound</div>
        <div className="mt-2 pt-2 border-t border-primary-500/30">
          <div className="flex items-center">
            <div className="w-2 h-2 rounded-full bg-primary-400 mr-1"></div>
            <div className="text-xs text-white/60">Sound</div>
          </div>
        </div>
      </div>
      
      {/* Connections */}
      <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 1 }}>
        {/* Input Action to Branch */}
        <path d="M 140 122 C 160 122 200 122 220 122" stroke="rgba(66, 165, 245, 0.5)" strokeWidth="2" fill="none" />
        
        {/* Branch True output to Apply Force */}
        <path d="M 260 124 C 280 124 300 124 300 150 C 300 176 280 176 260 176" stroke="rgba(66, 165, 245, 0.5)" strokeWidth="2" fill="none" />
        
        {/* Branch False output to Play Sound */}
        <path d="M 320 124 C 340 124 350 124 350 150 C 350 176 340 176 320 176" stroke="rgba(66, 165, 245, 0.5)" strokeWidth="2" fill="none" />
      </svg>
      
      {/* Animated dots on connections */}
      <div className="absolute top-[122px] left-[180px] w-2 h-2 bg-primary-400 rounded-full animate-pulse"></div>
      <div className="absolute top-[150px] left-[280px] w-2 h-2 bg-primary-400 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
      <div className="absolute top-[150px] left-[335px] w-2 h-2 bg-primary-400 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
    </div>
  );
};

// Add a second blueprint diagram for variety
const BlueprintDiagram2: React.FC = () => {
  return (
    <div className="w-full h-full relative">
      {/* Background grid */}
      <div className="absolute inset-0 bg-[#060A14] opacity-50" style={{ 
        backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)',
        backgroundSize: '20px 20px'
      }}></div>
      
      {/* Nodes */}
      <div className="absolute top-1/4 left-1/4 w-40 h-auto bg-[#0A0F1C] border border-accent-500/50 rounded-md p-2 shadow-lg">
        <div className="text-xs text-accent-300 font-mono border-b border-accent-500/30 pb-1 mb-1">Event BeginPlay</div>
        <div className="text-xs text-white/60">Game Start</div>
        <div className="mt-2 pt-2 border-t border-accent-500/30">
          <div className="flex items-center">
            <div className="w-2 h-2 rounded-full bg-accent-400 mr-1"></div>
            <div className="text-xs text-white/60">Execute</div>
          </div>
        </div>
      </div>
      
      <div className="absolute top-1/4 left-1/2 w-40 h-auto bg-[#0A0F1C] border border-primary-500/50 rounded-md p-2 shadow-lg">
        <div className="text-xs text-primary-300 font-mono border-b border-primary-500/30 pb-1 mb-1">Set Timer</div>
        <div className="text-xs text-white/60">Spawn Enemy</div>
        <div className="mt-2 pt-2 border-t border-primary-500/30">
          <div className="flex items-center">
            <div className="w-2 h-2 rounded-full bg-primary-400 mr-1"></div>
            <div className="text-xs text-white/60">Timer</div>
          </div>
        </div>
      </div>
      
      <div className="absolute top-1/2 left-1/3 w-40 h-auto bg-[#0A0F1C] border border-secondary-500/50 rounded-md p-2 shadow-lg">
        <div className="text-xs text-secondary-300 font-mono border-b border-secondary-500/30 pb-1 mb-1">Spawn Actor</div>
        <div className="text-xs text-white/60">Enemy</div>
        <div className="mt-2 pt-2 border-t border-secondary-500/30">
          <div className="flex items-center">
            <div className="w-2 h-2 rounded-full bg-secondary-400 mr-1"></div>
            <div className="text-xs text-white/60">Actor</div>
          </div>
        </div>
      </div>
      
      <div className="absolute top-1/2 left-2/3 w-40 h-auto bg-[#0A0F1C] border border-primary-500/50 rounded-md p-2 shadow-lg">
        <div className="text-xs text-primary-300 font-mono border-b border-primary-500/30 pb-1 mb-1">Set Location</div>
        <div className="text-xs text-white/60">Random</div>
        <div className="mt-2 pt-2 border-t border-primary-500/30">
          <div className="flex items-center">
            <div className="w-2 h-2 rounded-full bg-primary-400 mr-1"></div>
            <div className="text-xs text-white/60">Location</div>
          </div>
        </div>
      </div>
      
      {/* Connections */}
      <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 1 }}>
        {/* Event BeginPlay to Set Timer */}
        <path d="M 140 122 C 160 122 180 122 200 122" stroke="rgba(66, 165, 245, 0.5)" strokeWidth="2" fill="none" />
        
        {/* Set Timer to Spawn Actor */}
        <path d="M 240 128 C 260 128 260 140 260 150 C 260 160 240 170 220 170" stroke="rgba(66, 165, 245, 0.5)" strokeWidth="2" fill="none" />
        
        {/* Spawn Actor to Set Location */}
        <path d="M 175 176 C 195 176 215 176 280 176" stroke="rgba(66, 165, 245, 0.5)" strokeWidth="2" fill="none" />
      </svg>
      
      {/* Animated dots on connections */}
      <div className="absolute top-[122px] left-[170px] w-2 h-2 bg-primary-400 rounded-full animate-pulse"></div>
      <div className="absolute top-[150px] left-[230px] w-2 h-2 bg-primary-400 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
      <div className="absolute top-[176px] left-[220px] w-2 h-2 bg-primary-400 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
    </div>
  );
};

// Add a third blueprint diagram for more variety
const BlueprintDiagram3: React.FC = () => {
  return (
    <div className="w-full h-full relative">
      {/* Background grid */}
      <div className="absolute inset-0 bg-[#060A14] opacity-50" style={{ 
        backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)',
        backgroundSize: '20px 20px'
      }}></div>
      
      {/* Nodes */}
      <div className="absolute top-1/4 left-1/4 w-40 h-auto bg-[#0A0F1C] border border-secondary-500/50 rounded-md p-2 shadow-lg">
        <div className="text-xs text-secondary-300 font-mono border-b border-secondary-500/30 pb-1 mb-1">Event Tick</div>
        <div className="text-xs text-white/60">Every Frame</div>
        <div className="mt-2 pt-2 border-t border-secondary-500/30">
          <div className="flex items-center">
            <div className="w-2 h-2 rounded-full bg-secondary-400 mr-1"></div>
            <div className="text-xs text-white/60">Execute</div>
          </div>
        </div>
      </div>
      
      <div className="absolute top-1/4 left-1/2 w-40 h-auto bg-[#0A0F1C] border border-primary-500/50 rounded-md p-2 shadow-lg">
        <div className="text-xs text-primary-300 font-mono border-b border-primary-500/30 pb-1 mb-1">Get Player Location</div>
        <div className="text-xs text-white/60">Current</div>
        <div className="mt-2 pt-2 border-t border-primary-500/30">
          <div className="flex items-center">
            <div className="w-2 h-2 rounded-full bg-primary-400 mr-1"></div>
            <div className="text-xs text-white/60">Location</div>
          </div>
        </div>
      </div>
      
      <div className="absolute top-1/2 left-1/3 w-40 h-auto bg-[#0A0F1C] border border-accent-500/50 rounded-md p-2 shadow-lg">
        <div className="text-xs text-accent-300 font-mono border-b border-accent-500/30 pb-1 mb-1">Distance</div>
        <div className="text-xs text-white/60">To Enemy</div>
        <div className="mt-2 pt-2 border-t border-accent-500/30">
          <div className="flex items-center">
            <div className="w-2 h-2 rounded-full bg-accent-400 mr-1"></div>
            <div className="text-xs text-white/60">Float</div>
          </div>
        </div>
      </div>
      
      <div className="absolute top-1/2 left-2/3 w-40 h-auto bg-[#0A0F1C] border border-primary-500/50 rounded-md p-2 shadow-lg">
        <div className="text-xs text-primary-300 font-mono border-b border-primary-500/30 pb-1 mb-1">Branch</div>
        <div className="text-xs text-white/60">Is Less Than</div>
        <div className="mt-2 pt-2 border-t border-primary-500/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-2 h-2 rounded-full bg-green-400 mr-1"></div>
              <div className="text-xs text-white/60">True</div>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 rounded-full bg-red-400 mr-1"></div>
              <div className="text-xs text-white/60">False</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Connections */}
      <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 1 }}>
        {/* Event Tick to Get Player Location */}
        <path d="M 140 122 C 160 122 180 122 200 122" stroke="rgba(66, 165, 245, 0.5)" strokeWidth="2" fill="none" />
        
        {/* Get Player Location to Distance */}
        <path d="M 220 128 C 240 128 240 140 240 150 C 240 160 220 170 200 170" stroke="rgba(66, 165, 245, 0.5)" strokeWidth="2" fill="none" />
        
        {/* Distance to Branch */}
        <path d="M 153 176 C 173 176 193 176 280 176" stroke="rgba(66, 165, 245, 0.5)" strokeWidth="2" fill="none" />
      </svg>
      
      {/* Animated dots on connections */}
      <div className="absolute top-[122px] left-[170px] w-2 h-2 bg-primary-400 rounded-full animate-pulse"></div>
      <div className="absolute top-[150px] left-[220px] w-2 h-2 bg-primary-400 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
      <div className="absolute top-[176px] left-[220px] w-2 h-2 bg-primary-400 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
    </div>
  );
};

const LandingPage: React.FC = () => {
  const [scrollY, setScrollY] = useState(0);
  const { currentUser } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const parallaxValue = -scrollY * 0.2; // Parallax effect intensity
  
  return (
    <div className="relative min-h-screen bg-[#0A0F1C] text-white overflow-hidden">
      {/* Background elements */}
      <div className="fixed inset-0 bg-gradient-radial-to-tr from-primary-900/30 via-[#0A00F1C] to-secondary-900/20"></div>
      <div 
        className="fixed inset-0 opacity-30" 
        style={{ 
          backgroundImage: 'radial-gradient(rgba(66, 165, 245, 0.1) 1px, transparent 1px)', 
          backgroundSize: '50px 50px',
          transform: `translateY(${parallaxValue * 0.5}px)`
        }}
      ></div>
      
      {/* Animated orbs */}
      <div className="fixed -top-[300px] -right-[300px] w-[600px] h-[600px] rounded-full bg-primary-500/5 blur-[80px] animate-float-slow"></div>
      <div className="fixed -bottom-[300px] -left-[300px] w-[600px] h-[600px] rounded-full bg-secondary-500/5 blur-[100px] animate-float-slower"></div>
      
      {/* Dynamic Island-like Header */}
      <Header />

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center py-20 overflow-hidden">
        {/* Background elements */}
        <div className="absolute inset-0 bg-hero-pattern opacity-10"></div>
        <div className="absolute -top-[400px] -left-[300px] w-[800px] h-[800px] bg-primary-500/10 rounded-full blur-[100px]"></div>
        <div className="absolute -bottom-[300px] -right-[200px] w-[700px] h-[700px] bg-accent-500/10 rounded-full blur-[100px]"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('/grid-pattern.svg')] bg-repeat opacity-5"></div>
        
        <div className="container mx-auto px-4 sm:px-6 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="lg:pr-12">
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
                <span className="text-white">Revolutionize</span>
                <br />
                <span className="bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent">Game Development</span>
              </h1>
              
              <p className="text-lg sm:text-xl text-white/70 mb-10 max-w-xl">
                Transform natural language into production-ready Unreal Engine 5 Blueprints instantly. 
                <span className="text-white font-medium"> Cut development time by 80%</span> and bring your game ideas to life faster than ever before.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-5">
                {!currentUser && (
                  <Link
                    to="/signup"
                    className="px-8 py-4 rounded-full bg-gradient-to-r from-primary-500 to-accent-500 text-white font-medium text-lg transition-transform hover:scale-105 hover:shadow-lg hover:shadow-primary-500/20 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                  >
                    Start Creating for Free
                  </Link>
                )}
                {currentUser && (
                  <Link
                    to="/projects"
                    className="px-8 py-4 rounded-full bg-gradient-to-r from-primary-500 to-accent-500 text-white font-medium text-lg transition-transform hover:scale-105 hover:shadow-lg hover:shadow-primary-500/20 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                  >
                    Go to My Projects
                  </Link>
                )}
                <Link
                  to="/roadmap"
                  className="px-8 py-4 rounded-full bg-white/10 text-white backdrop-blur-sm font-medium text-lg hover:bg-white/15 transition-all"
                >
                  View Roadmap
                </Link>
              </div>
            </div>
            
            <div className="lg:pl-6 relative mt-10 lg:mt-0">
              <div className="relative z-10 bg-[#0A0F1C]/70 backdrop-blur-lg rounded-xl border border-white/5 overflow-hidden shadow-2xl shadow-primary-500/10">
                <div className="border-b border-white/5 px-5 py-4 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  </div>
                  <div className="px-3 py-1 bg-white/5 rounded text-white/60 text-xs">Blueprint Generator</div>
                </div>
                <div className="p-5">
                  <div className="bg-[#060A14] rounded-lg p-4 mb-4 shadow-inner border border-white/5">
                    <p className="text-white/80 font-mono text-sm">
                      <span className="text-accent-400">&gt;</span> Create a character movement system with sprint, crouch, and wall climbing abilities
                    </p>
                  </div>
                  <div className="h-[250px] sm:h-[300px] bg-[#060A14] rounded-lg border border-white/5 relative overflow-hidden">
                    <BlueprintDiagram />
                  </div>
                </div>
              </div>
              
              {/* Code particles animation */}
              <div className="absolute -top-10 -right-10 w-20 h-20 text-primary-400 opacity-20 animate-float-slow">
                {`{ node: "InputAction" }`}
              </div>
              <div className="absolute bottom-20 -left-10 w-20 h-20 text-accent-400 opacity-20 animate-float">
                {`Execute("OnJump");`}
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Mockup Animation Section */}
      <section className="relative py-20 bg-[#070B15] overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="container mx-auto px-4 sm:px-6 relative z-10">
          <div className="max-w-6xl mx-auto">
            <div className="bg-[#0A0F1C]/80 backdrop-blur-sm border border-white/5 rounded-2xl shadow-2xl overflow-hidden">
              <div className="h-10 bg-[#060A14] border-b border-white/5 flex items-center px-4">
                <div className="flex space-x-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/70"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500/70"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500/70"></div>
                </div>
                <div className="flex-1 text-center">
                  <p className="text-xs text-white/40">noder-blueprint-generator</p>
                </div>
              </div>
              
              <div className="p-4 sm:p-8 flex flex-col lg:flex-row gap-8">
                <div className="flex-1 bg-[#060A14]/80 border border-white/5 rounded-lg p-4 h-[300px] sm:h-[350px] max-w-md mx-auto lg:mx-0">
                  <div className="border-b border-white/10 pb-2 mb-4">
                    <h4 className="text-primary-400 text-sm font-medium">Prompt Input</h4>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-start">
                      <div className="w-8 h-8 rounded-full bg-accent-500/20 flex items-center justify-center text-accent-400 shrink-0">U</div>
                      <div className="ml-3 bg-[#0A0F1C] rounded-lg p-3 text-sm text-white/80">
                        Create a blueprint that detects when the player overlaps with a trigger, plays a sound, and adds health to the player character.
                      </div>
                    </div>
                    <div className="flex items-start">
                      <div className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center text-primary-400 shrink-0">AI</div>
                      <div className="ml-3 bg-[#0C1225] rounded-lg p-3 text-sm text-white/80">
                        <p>Generating blueprint with:</p>
                        <ul className="list-disc pl-5 mt-2 space-y-1">
                          <li>Trigger box overlap event</li>
                          <li>Sound playback component</li>
                          <li>Health addition to player</li>
                        </ul>
                        <div className="mt-2 flex items-center text-accent-400">
                          <span className="animate-pulse mr-2">●</span>
                          <span className="text-xs">Processing...</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex-1 relative h-[300px] sm:h-[350px] bg-[#060A14]/50 rounded-lg border border-white/5 overflow-hidden">
                  <BlueprintDiagram />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-28">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent">Unreal Engine Acceleration</span>
            </h2>
            <p className="text-xl text-white/70">
              Supercharge Your Development
            </p>
            <div className="w-20 h-1 bg-gradient-to-r from-primary-500 to-accent-500 mx-auto mt-6 rounded-full"></div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature Card 1 */}
            <div className="group bg-[#0A0F1C]/70 backdrop-blur-md rounded-xl border border-white/5 p-6 hover:border-primary-500/30 transition-all duration-300 hover:shadow-xl hover:shadow-primary-500/5">
              <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-primary-500/20 to-primary-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
                  <LuBrainCircuit className="text-white text-2xl" />
                </div>
              </div>
              
              <h3 className="text-xl font-semibold mb-3 text-white group-hover:text-primary-400 transition-colors duration-300">AI-Powered Generation</h3>
              
              <p className="text-white/70 leading-relaxed mb-4">
                Our intelligent system understands complex game logic, transforming your natural language descriptions into fully-functioning blueprints - from character controllers to entire gameplay systems.
              </p>
              
              <div className="pt-4 border-t border-white/5">
                <Link to="/blueprint-editor" className="text-primary-400 group-hover:text-primary-300 inline-flex items-center text-sm font-medium">
                  <span>Try the Blueprint Editor</span>
                  <LuArrowRight className="ml-2 group-hover:ml-3 transition-all duration-300" />
                </Link>
              </div>
            </div>
            
            {/* Feature Card 2 */}
            <div className="group bg-[#0A0F1C]/70 backdrop-blur-md rounded-xl border border-white/5 p-6 hover:border-accent-500/30 transition-all duration-300 hover:shadow-xl hover:shadow-accent-500/5">
              <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-accent-500/20 to-accent-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent-500 to-accent-600 flex items-center justify-center">
                  <LuSave className="text-white text-2xl" />
                </div>
              </div>
              
              <h3 className="text-xl font-semibold mb-3 text-white group-hover:text-accent-400 transition-colors duration-300">UE5 Blueprint Export</h3>
              
              <p className="text-white/70 leading-relaxed mb-4">
                Seamlessly export to Unreal Engine 5 with our native format support. Generate blueprint assets that can be directly imported into your UE projects with no compatibility issues.
              </p>
              
              <div className="pt-4 border-t border-white/5">
                <Link to="/export-formats" className="text-accent-400 group-hover:text-accent-300 inline-flex items-center text-sm font-medium">
                  <span>View Export Options</span>
                  <LuArrowRight className="ml-2 group-hover:ml-3 transition-all duration-300" />
                </Link>
              </div>
            </div>
            
            {/* Feature Card 3 */}
            <div className="group bg-[#0A0F1C]/70 backdrop-blur-md rounded-xl border border-white/5 p-6 hover:border-secondary-500/30 transition-all duration-300 hover:shadow-xl hover:shadow-secondary-500/5">
              <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-secondary-500/20 to-secondary-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-secondary-500 to-secondary-600 flex items-center justify-center">
                  <LuUsers className="text-white text-2xl" />
                </div>
              </div>
              
              <h3 className="text-xl font-semibold mb-3 text-white group-hover:text-secondary-400 transition-colors duration-300">Team Collaboration</h3>
              
              <p className="text-white/70 leading-relaxed mb-4">
                Share blueprints with your team in real-time, manage versions, and collaborate on complex systems. Perfect for studios and teams working across multiple projects.
              </p>
              
              <div className="pt-4 border-t border-white/5">
                <Link to="/team-features" className="text-secondary-400 group-hover:text-secondary-300 inline-flex items-center text-sm font-medium">
                  <span>Explore Team Features</span>
                  <LuArrowRight className="ml-2 group-hover:ml-3 transition-all duration-300" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Blueprint Examples Section */}
      <section className="py-20 sm:py-28 bg-[#060A14]">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-3xl mx-auto text-center mb-12 sm:mb-20">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent">Blueprint Examples</span>
            </h2>
            <p className="text-lg sm:text-xl text-white/70">
              See what Noder can generate from simple prompts
            </p>
            <div className="w-20 h-1 bg-gradient-to-r from-primary-500 to-accent-500 mx-auto mt-6 rounded-full"></div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12">
            {/* Example 1 */}
            <div className="bg-[#0A0F1C]/70 backdrop-blur-md rounded-xl border border-white/5 overflow-hidden transform hover:scale-[1.02] transition-all duration-300 hover:shadow-xl hover:shadow-primary-500/10">
              <div className="border-b border-white/5 px-5 py-4 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-8 h-8 rounded bg-primary-500/20 flex items-center justify-center">
                    <LuActivity className="text-primary-400" />
                  </div>
                  <h3 className="font-medium text-white">Player Damage & Health System</h3>
                </div>
              </div>
              
              <div className="p-5">
                <div className="bg-[#060A14] rounded-lg p-4 mb-4 shadow-inner border border-white/5">
                  <p className="text-white/80 font-mono text-sm">
                    <span className="text-accent-400">&gt;</span> Create a player health system with damage events, health regeneration, and death handling
                  </p>
                </div>
                
                <div className="aspect-video bg-[#060A14] rounded-lg border border-white/5 relative overflow-hidden p-2">
                  <div className="w-full h-full">
                    <BlueprintDiagram />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 px-4 py-3 bg-gradient-to-t from-[#060A14] to-transparent">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-white/60">BP_PlayerHealthSystem.uasset</span>
                      <div className="flex items-center space-x-2">
                        <div className="px-2 py-1 rounded bg-primary-500/20 text-primary-400 text-xs">Export</div>
                        <div className="px-2 py-1 rounded bg-accent-500/20 text-accent-400 text-xs">Edit</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Example 2 */}
            <div className="bg-[#0A0F1C]/70 backdrop-blur-md rounded-xl border border-white/5 overflow-hidden transform hover:scale-[1.02] transition-all duration-300 hover:shadow-xl hover:shadow-accent-500/10">
              <div className="border-b border-white/5 px-5 py-4 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-8 h-8 rounded bg-accent-500/20 flex items-center justify-center">
                    <LuSunMoon className="text-accent-400" />
                  </div>
                  <h3 className="font-medium text-white">Day/Night Cycle</h3>
                </div>
              </div>
              
              <div className="p-5">
                <div className="bg-[#060A14] rounded-lg p-4 mb-4 shadow-inner border border-white/5">
                  <p className="text-white/80 font-mono text-sm">
                    <span className="text-accent-400">&gt;</span> Build a day/night cycle system with smooth transitions, time scale control and sky color changes
                  </p>
                </div>
                
                <div className="aspect-video bg-[#060A14] rounded-lg border border-white/5 relative overflow-hidden p-2">
                  <div className="w-full h-full">
                    <BlueprintDiagram3 />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 px-4 py-3 bg-gradient-to-t from-[#060A14] to-transparent">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-white/60">BP_DayNightCycle.uasset</span>
                      <div className="flex items-center space-x-2">
                        <div className="px-2 py-1 rounded bg-primary-500/20 text-primary-400 text-xs">Export</div>
                        <div className="px-2 py-1 rounded bg-accent-500/20 text-accent-400 text-xs">Edit</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-10 sm:mt-14 text-center">
            <Link 
              to="/examples" 
              className="inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-primary-500/20 to-accent-500/20 border border-white/10 rounded-lg text-white font-medium hover:bg-gradient-to-r hover:from-primary-500/30 hover:to-accent-500/30 transition-all duration-300 group"
            >
              <span>View More Examples</span>
              <LuArrowRight className="ml-2 group-hover:translate-x-1 transition-transform duration-200" />
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="relative py-20 sm:py-32">
        <div className="container mx-auto px-4 sm:px-6 relative z-10">
          <div className="max-w-3xl mx-auto text-center mb-16 sm:mb-24">
            <h3 className="inline-flex items-center px-5 py-2 rounded-full bg-glass text-primary-400 text-sm font-medium mb-6">
              <LuRocket className="mr-2" />
              <span>Simple Process</span>
            </h3>
            <h2 className="text-3xl sm:text-4xl font-bold mb-8 bg-gradient-to-r from-primary-400 to-secondary-400 bg-clip-text text-transparent text-shadow-sm">
              How It Works
            </h2>
            <p className="text-lg sm:text-xl text-white/60">
              Get from idea to implementation in three simple steps
            </p>
          </div>
          
          <div className="relative">
            {/* Connector line */}
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-500/30 via-secondary-500/30 to-accent-500/30 transform -translate-y-1/2 hidden md:block"></div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-16">
              <div className="group relative p-6 sm:p-8 bg-glass rounded-2xl border border-white/5 transition-all duration-300 hover:border-white/10 hover:shadow-card-hover z-10 h-full">
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 md:top-1/2 md:-translate-y-1/2 md:left-auto md:-translate-x-0 md:-left-8 w-16 h-16 rounded-full bg-[#0A0F1C] border border-white/10 flex items-center justify-center text-xl font-bold transform group-hover:scale-110 transition-transform duration-300 shadow-lg z-20">
                  <div className="absolute inset-1 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 opacity-10"></div>
                  <span className="relative z-10 bg-gradient-to-r from-primary-400 to-secondary-400 bg-clip-text text-transparent font-mono">01</span>
                </div>
                <div className="pt-8 md:pt-0 md:pl-8">
                  <h4 className="text-xl font-bold mb-4 text-white group-hover:text-shadow transition-all duration-300">Describe Your Game Logic</h4>
                  <p className="text-white/60 group-hover:text-white/70 transition-colors duration-300">Simply explain what you want your game to do in plain language. No coding required.</p>
                  <div className="mt-6 bg-[#060A14] rounded-lg p-4 border border-white/5">
                    <p className="text-white/80 font-mono text-sm">
                      <span className="text-accent-400">&gt;</span> Create a character that can double jump and wall run
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="group relative p-6 sm:p-8 bg-glass rounded-2xl border border-white/5 transition-all duration-300 hover:border-white/10 hover:shadow-card-hover z-10 h-full">
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 md:top-1/2 md:-translate-y-1/2 md:left-auto md:-translate-x-0 md:-left-8 w-16 h-16 rounded-full bg-[#0A0F1C] border border-white/10 flex items-center justify-center text-xl font-bold transform group-hover:scale-110 transition-transform duration-300 shadow-lg z-20">
                  <div className="absolute inset-1 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 opacity-10"></div>
                  <span className="relative z-10 bg-gradient-to-r from-primary-400 to-secondary-400 bg-clip-text text-transparent font-mono">02</span>
                </div>
                <div className="pt-8 md:pt-0 md:pl-8">
                  <h4 className="text-xl font-bold mb-4 text-white group-hover:text-shadow transition-all duration-300">AI Generates Blueprint</h4>
                  <p className="text-white/60 group-hover:text-white/70 transition-colors duration-300">Our AI transforms your description into a fully functional Unreal Engine blueprint.</p>
                  <div className="mt-6 bg-[#060A14] rounded-lg p-4 border border-white/5 h-[100px] overflow-hidden">
                    <BlueprintDiagram2 />
                  </div>
                </div>
              </div>
              
              <div className="group relative p-6 sm:p-8 bg-glass rounded-2xl border border-white/5 transition-all duration-300 hover:border-white/10 hover:shadow-card-hover z-10 h-full">
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 md:top-1/2 md:-translate-y-1/2 md:left-auto md:-translate-x-0 md:-left-8 w-16 h-16 rounded-full bg-[#0A0F1C] border border-white/10 flex items-center justify-center text-xl font-bold transform group-hover:scale-110 transition-transform duration-300 shadow-lg z-20">
                  <div className="absolute inset-1 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 opacity-10"></div>
                  <span className="relative z-10 bg-gradient-to-r from-primary-400 to-secondary-400 bg-clip-text text-transparent font-mono">03</span>
                </div>
                <div className="pt-8 md:pt-0 md:pl-8">
                  <h4 className="text-xl font-bold mb-4 text-white group-hover:text-shadow transition-all duration-300">Import to Unreal Engine</h4>
                  <p className="text-white/60 group-hover:text-white/70 transition-colors duration-300">One-click export to your Unreal Engine project. Ready to use immediately.</p>
                  <div className="mt-6 bg-[#060A14] rounded-lg p-4 border border-white/5 flex items-center justify-center">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 rounded bg-primary-500/20 flex items-center justify-center">
                        <LuCode className="text-primary-400" />
                      </div>
                      <div className="text-white/80 font-mono text-sm">Import to UE5</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-32">
        <div className="container mx-auto px-6 relative z-10">
          <div className="relative overflow-hidden rounded-3xl">
            {/* Background gradients */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary-600/20 to-secondary-600/20"></div>
            <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
            
            <div className="relative bg-[#0A0F1C]/60 backdrop-blur-sm p-16 text-center">
              <h3 className="text-4xl font-bold mb-6 bg-gradient-to-r from-primary-400 to-secondary-400 bg-clip-text text-transparent text-shadow-sm">
                Ready to Accelerate Your Workflow?
              </h3>
              <p className="text-xl text-white/70 mb-10 max-w-2xl mx-auto">
                Join Noder today and transform how you create Blueprint functionality.
              </p>
              {!currentUser ? (
                <Link 
                  to="/signup" 
                  className="inline-block px-8 py-4 bg-white rounded-lg text-[#0A0F1C] font-semibold hover:bg-blue-50 transition-all duration-200 transform hover:scale-105 hover:shadow-lg hover:shadow-white/25"
                >
                  Sign Up for Free
                </Link>
              ) : (
                <Link 
                  to="/projects" 
                  className="inline-block px-8 py-4 bg-white rounded-lg text-[#0A0F1C] font-semibold hover:bg-blue-50 transition-all duration-200 transform hover:scale-105 hover:shadow-lg hover:shadow-white/25"
                >
                  Go to My Projects
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-white/50 text-sm mb-4 md:mb-0">
              &copy; {new Date().getFullYear()} Noder. All rights reserved.
            </div>
            <div className="flex space-x-6">
              <a href="#" className="text-white/50 hover:text-white transition-colors text-sm">Terms</a>
              <a href="#" className="text-white/50 hover:text-white transition-colors text-sm">Privacy</a>
              <a href="#" className="text-white/50 hover:text-white transition-colors text-sm">Cookies</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

// Helper components with enhanced designs
interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  gradient: string;
}

export const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description, gradient }) => (
  <div className="group relative bg-glass rounded-2xl p-8 border border-white/5 transition-all duration-500 hover:border-white/10 hover:shadow-card-hover backdrop-blur-sm overflow-hidden">
    {/* Gradient background that appears on hover */}
    <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`}></div>
    
    <div className="relative z-10">
      <div className={`mb-6 h-16 w-16 rounded-2xl bg-gradient-to-br ${gradient} bg-opacity-10 flex items-center justify-center text-white p-3 transform group-hover:scale-110 transition-transform duration-500`}>
        {icon}
      </div>
      <h4 className="text-xl font-bold mb-4 text-white group-hover:text-shadow transition-all duration-300">{title}</h4>
      <p className="text-white/60 group-hover:text-white/70 transition-colors duration-300">{description}</p>
      
      <div className="mt-8 flex items-center text-primary-400 opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">
        <span className="text-sm font-medium">Learn more</span>
        <LuArrowRight className="ml-2 text-sm" />
      </div>
    </div>
  </div>
);

interface StepCardProps {
  number: string;
  title: string;
  description: string;
}

export const StepCard: React.FC<StepCardProps> = ({ number, title, description }) => (
  <div className="group relative p-8 bg-glass rounded-2xl border border-white/5 transition-all duration-300 hover:border-white/10 hover:shadow-card-hover z-10 h-full">
    <div className="absolute -top-8 left-1/2 -translate-x-1/2 md:top-1/2 md:-translate-y-1/2 md:left-auto md:-translate-x-0 md:-left-8 w-16 h-16 rounded-full bg-[#0A0F1C] border border-white/10 flex items-center justify-center text-xl font-bold transform group-hover:scale-110 transition-transform duration-300 shadow-lg z-20">
      <div className="absolute inset-1 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 opacity-10"></div>
      <span className="relative z-10 bg-gradient-to-r from-primary-400 to-secondary-400 bg-clip-text text-transparent font-mono">{number}</span>
    </div>
    <div className="pt-8 md:pt-0 md:pl-8">
      <h4 className="text-xl font-bold mb-4 text-white group-hover:text-shadow transition-all duration-300">{title}</h4>
      <p className="text-white/60 group-hover:text-white/70 transition-colors duration-300">{description}</p>
    </div>
  </div>
);

export default LandingPage; 


