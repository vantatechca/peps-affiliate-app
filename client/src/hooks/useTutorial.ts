import { useState, useEffect, useCallback } from "react";

const TUTORIAL_STORAGE_KEY = "affiliatexchange_tutorials_completed";

export interface TutorialStep {
  title: string;
  description: string;
  icon?: React.ReactNode;
}

export interface TutorialConfig {
  id: string;
  steps: TutorialStep[];
}

/**
 * Hook to manage first-time tutorial state using localStorage
 */
export function useTutorial(tutorialId: string) {
  const [hasSeenTutorial, setHasSeenTutorial] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check localStorage for completed tutorials
    const completedTutorials = getCompletedTutorials();
    const hasSeen = completedTutorials.includes(tutorialId);
    setHasSeenTutorial(hasSeen);
    setIsLoading(false);
  }, [tutorialId]);

  const completeTutorial = useCallback(() => {
    const completedTutorials = getCompletedTutorials();
    if (!completedTutorials.includes(tutorialId)) {
      completedTutorials.push(tutorialId);
      localStorage.setItem(TUTORIAL_STORAGE_KEY, JSON.stringify(completedTutorials));
    }
    setHasSeenTutorial(true);
  }, [tutorialId]);

  const resetTutorial = useCallback(() => {
    const completedTutorials = getCompletedTutorials();
    const filtered = completedTutorials.filter((id) => id !== tutorialId);
    localStorage.setItem(TUTORIAL_STORAGE_KEY, JSON.stringify(filtered));
    setHasSeenTutorial(false);
  }, [tutorialId]);

  return {
    hasSeenTutorial,
    isLoading,
    completeTutorial,
    resetTutorial,
    showTutorial: !hasSeenTutorial && !isLoading,
  };
}

function getCompletedTutorials(): string[] {
  try {
    const stored = localStorage.getItem(TUTORIAL_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    // Ignore parsing errors
  }
  return [];
}

/**
 * Reset all tutorials (useful for testing)
 */
export function resetAllTutorials() {
  localStorage.removeItem(TUTORIAL_STORAGE_KEY);
}
