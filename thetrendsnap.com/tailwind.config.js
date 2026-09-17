/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    // Full-bleed by default: the shell spans the viewport at every breakpoint
    // and only the gutter grows, so no page has dead space at the edges.
    container: {
      center: true,
      padding: {
        DEFAULT: "0.875rem",
        sm: "1.25rem",
        lg: "1.75rem",
        xl: "2.25rem",
        "2xl": "3rem",
      },
      screens: {
        sm: "100%",
        md: "100%",
        lg: "100%",
        xl: "100%",
        "2xl": "100%",
      },
    },
    extend: {
      colors: {
        brand: {
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
        },
        ink: {
          50: "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          300: "#cbd5e1",
          400: "#94a3b8",
          500: "#64748b",
          600: "#475569",
          700: "#334155",
          800: "#1e293b",
          900: "#0f172a",
          950: "#070b16",
        },
        flame: "#f43f5e",
        surface: {
          DEFAULT: "rgb(var(--surface) / <alpha-value>)",
          soft: "rgb(var(--surface-soft) / <alpha-value>)",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        display: ["'Plus Jakarta Sans'", "Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(15,23,42,.04), 0 8px 24px -12px rgba(15,23,42,.12)",
        pop: "0 12px 40px -12px rgba(15,23,42,.25)",
      },
      borderRadius: { xl: "0.875rem", "2xl": "1.125rem" },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        // Slow drift on the hero backdrop — motion without distraction.
        // Gentle drift: the crop stays under ~6% so the frame keeps its subject.
        "ken-burns": {
          "0%, 100%": { transform: "scale(1.02) translate3d(0, 0, 0)" },
          "50%": { transform: "scale(1.06) translate3d(-1%, -1%, 0)" },
        },
        // Light sweep across the hero, once every few seconds.
        sheen: {
          "0%": { transform: "translateX(-120%) skewX(-12deg)", opacity: "0" },
          "12%": { opacity: ".55" },
          "45%, 100%": { transform: "translateX(220%) skewX(-12deg)", opacity: "0" },
        },
        // Continuous right-to-left rail; the track holds two copies of the
        // list, so translating by half its width loops seamlessly.
        marquee: {
          from: { transform: "translate3d(0, 0, 0)" },
          to: { transform: "translate3d(-50%, 0, 0)" },
        },
        "glow-pulse": {
          "0%, 100%": { opacity: ".35" },
          "50%": { opacity: ".75" },
        },
      },
      animation: {
        "fade-up": "fade-up .4s ease-out both",
        shimmer: "shimmer 1.6s infinite",
        "ken-burns": "ken-burns 26s ease-in-out infinite",
        sheen: "sheen 6.5s ease-in-out infinite",
        "glow-pulse": "glow-pulse 5s ease-in-out infinite",
        marquee: "marquee 38s linear infinite",
        "marquee-slow": "marquee 55s linear infinite",
      },
    },
  },
  plugins: [],
};
