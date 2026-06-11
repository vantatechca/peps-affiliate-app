import { useEffect, useState, useRef } from "react";
import { cn } from "../lib/utils";

export interface SettingsSection {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface SettingsNavigationProps {
  sections: SettingsSection[];
  className?: string;
}

export function SettingsNavigation({ sections, className }: SettingsNavigationProps) {
  const [activeSection, setActiveSection] = useState<string>(sections[0]?.id || "");
  const isClickScrollingRef = useRef(false);
  const sectionsRef = useRef(sections);

  // Keep sections ref updated
  useEffect(() => {
    sectionsRef.current = sections;
  }, [sections]);

  // Update active section when sections prop changes
  useEffect(() => {
    if (sections.length > 0) {
      setActiveSection(sections[0].id);
    }
  }, [sections]);

  useEffect(() => {
    const updateActiveSection = () => {
      // Skip if we're in the middle of a click-triggered scroll
      if (isClickScrollingRef.current) return;

      const currentSections = sectionsRef.current;
      if (currentSections.length === 0) return;

      const viewportHeight = window.innerHeight;
      let currentSection = currentSections[0]?.id || "";

      // Go through each section and find the one currently in view
      for (let i = 0; i < currentSections.length; i++) {
        const section = currentSections[i];
        const element = document.getElementById(section.id);
        if (element) {
          const rect = element.getBoundingClientRect();
          // If the top of the section is above 40% of viewport, it's the current section
          if (rect.top <= viewportHeight * 0.4) {
            currentSection = section.id;
          }
        }
      }

      setActiveSection(currentSection);
    };

    // Throttle scroll events for better performance
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          updateActiveSection();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    // Initial check after a short delay to ensure DOM is ready
    const timeoutId = setTimeout(() => {
      updateActiveSection();
    }, 100);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      clearTimeout(timeoutId);
    };
  }, []);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      // Mark that we're doing a click-triggered scroll
      isClickScrollingRef.current = true;
      setActiveSection(sectionId);

      element.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });

      // Reset after scroll animation completes
      setTimeout(() => {
        isClickScrollingRef.current = false;
      }, 1000);
    }
  };

  return (
    <nav
      className={cn(
        "sticky top-24 h-fit w-48 shrink-0 hidden lg:block",
        className
      )}
    >
      <div className="space-y-1 border-l border-border pl-4">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => scrollToSection(section.id)}
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all text-left border-l-2 -ml-[17px] pl-[15px]",
              activeSection === section.id
                ? "border-l-gray-900 bg-gray-100 text-gray-900 dark:border-l-gray-100 dark:bg-gray-800 dark:text-gray-100"
                : "border-l-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800/50 dark:hover:text-gray-300"
            )}
          >
            {section.icon}
            <span className="truncate">{section.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
