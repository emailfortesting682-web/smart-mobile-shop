import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#1f2937",
        mist: "#f7f8fa",
        line: "#e5e7eb",
        mint: "#0f766e",
        cobalt: "#2563eb",
        coral: "#c2410c",
        amber: "#b45309",
        graphite: "#111827"
      },
      boxShadow: {
        soft: "0 18px 48px rgba(17, 24, 39, 0.08)",
        panel: "0 1px 2px rgba(17, 24, 39, 0.06), 0 20px 50px rgba(17, 24, 39, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
