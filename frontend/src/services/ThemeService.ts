/**
 * Theme type
 */
export type Theme = "light" | "dark";

/**
 * Theme service for managing dark/light mode
 * @class ThemeServiceClass
 */
class ThemeServiceClass {
  private theme: Theme = "light";
  private listeners: Set<(theme: Theme) => void> = new Set();

  /**
   * Initialize theme from localStorage or system preference
   */
  constructor() {
    this.loadTheme();
  }

  /**
   * Load theme from storage
   */
  private loadTheme(): void {
    const stored = localStorage.getItem("theme") as Theme | null;

    if (stored) {
      this.theme = stored;
    } else {
      // Use system preference
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
      this.theme = prefersDark ? "dark" : "light";
    }

    this.applyTheme();
  }

  /**
   * Apply theme to document
   */
  private applyTheme(): void {
    const root = document.documentElement;

    if (this.theme === "dark") {
      root.classList.add("dark");
      root.classList.remove("light");
    } else {
      root.classList.add("light");
      root.classList.remove("dark");
    }
  }

  /**
   * Get current theme
   */
  public getTheme(): Theme {
    return this.theme;
  }

  /**
   * Set theme
   */
  public setTheme(theme: Theme): void {
    this.theme = theme;
    localStorage.setItem("theme", theme);
    this.applyTheme();
    this.notifyListeners();
  }

  /**
   * Toggle theme
   */
  public toggleTheme(): void {
    this.setTheme(this.theme === "dark" ? "light" : "dark");
  }

  /**
   * Subscribe to theme changes
   */
  public subscribe(listener: (theme: Theme) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener(this.theme));
  }
}

// Export singleton instance
export const ThemeService = new ThemeServiceClass();
