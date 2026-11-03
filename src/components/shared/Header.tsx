import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LuBrainCircuit, LuLogOut, LuUser, LuMenu, LuX, LuSun, LuMoon } from "react-icons/lu";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";

const Header: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const { currentUser, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/");
    } catch (error) {
      console.error("Failed to log out", error);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (
        isMobileMenuOpen &&
        !target.closest(".mobile-menu") &&
        !target.closest(".mobile-menu-toggle")
      ) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMobileMenuOpen]);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-3 px-4 font-sans">
      <div
        className={`relative transition-all duration-300 ease-in-out ${
          isScrolled ? "w-full max-w-5xl" : "w-full max-w-6xl"
        }`}
      >
        {/* Main header bar */}
        <div className="relative bg-white/95 dark:bg-noder-dark/95 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-lg py-2 px-4 flex justify-between items-center shadow-xl">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <Link to="/" className="flex items-center space-x-2.5 group">
              <div className="p-1.5 rounded-md bg-black dark:bg-white text-white dark:text-black group-hover:bg-gold-500 dark:group-hover:bg-gold-500 transition-colors">
                <LuBrainCircuit size={18} />
              </div>
              <span className="text-base font-bold tracking-tight text-zinc-900 dark:text-white">
                Noder
              </span>
            </Link>
          </div>

          {/* Desktop Navigation & Actions */}
          <div className="flex items-center space-x-4">
            <nav className="hidden md:flex space-x-5 items-center text-xs font-medium">
              <Link
                to="/"
                className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
              >
                Home
              </Link>
              <Link
                to="/projects"
                className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
              >
                Projects
              </Link>
              <Link
                to="/roadmap"
                className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
              >
                Roadmap
              </Link>
              <Link
                to="/issues"
                className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
              >
                Issues
              </Link>
            </nav>

            <div className="h-4 w-[1px] bg-zinc-200 dark:bg-zinc-800 hidden md:block"></div>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              aria-label="Toggle Theme"
              className="p-1.5 rounded-md text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700"
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            >
              {theme === 'dark' ? (
                <LuSun className="w-4 h-4 text-gold-400" />
              ) : (
                <LuMoon className="w-4 h-4 text-zinc-700" />
              )}
            </button>

            {/* User Profile / Login */}
            {currentUser ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-2 focus:outline-none"
                >
                  <div className="p-1 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300">
                    <LuUser className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200 hidden sm:block max-w-[120px] truncate">
                    {currentUser.displayName || currentUser.email?.split('@')[0] || "Architect"}
                  </span>
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-noder-dark border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl py-1 z-50 animate-fade-in text-xs font-sans">
                    <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-800">
                      <p className="font-semibold text-zinc-900 dark:text-white truncate">
                        {currentUser.displayName || "Architect"}
                      </p>
                      <p className="text-[11px] text-zinc-500 truncate">
                        {currentUser.email}
                      </p>
                    </div>
                    <Link
                      to="/projects"
                      onClick={() => setShowUserMenu(false)}
                      className="block px-3 py-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                      My Workspaces
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-3 py-2 text-red-600 dark:text-red-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center transition-colors"
                    >
                      <LuLogOut className="mr-2" size={13} />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="px-3 py-1.5 text-xs font-semibold rounded bg-zinc-900 hover:bg-black dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-black transition-colors"
              >
                Log In
              </Link>
            )}

            {/* Mobile menu toggle */}
            <button
              className="mobile-menu-toggle md:hidden text-zinc-700 dark:text-zinc-300 p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <LuX size={18} /> : <LuMenu size={18} />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {isMobileMenuOpen && (
          <div className="mobile-menu md:hidden mt-2 bg-white dark:bg-noder-dark border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 shadow-2xl animate-fade-in text-xs space-y-2">
            <Link
              to="/"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block py-1 text-zinc-700 dark:text-zinc-300 hover:text-gold-500"
            >
              Home
            </Link>
            <Link
              to="/projects"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block py-1 text-zinc-700 dark:text-zinc-300 hover:text-gold-500"
            >
              Projects
            </Link>
            <Link
              to="/roadmap"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block py-1 text-zinc-700 dark:text-zinc-300 hover:text-gold-500"
            >
              Roadmap
            </Link>
            <Link
              to="/issues"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block py-1 text-zinc-700 dark:text-zinc-300 hover:text-gold-500"
            >
              Issues
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
