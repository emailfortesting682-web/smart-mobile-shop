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
        ink: "#172026",
        mist: "#f5f7f8",
        line: "#d9e1e5",
        mint: "#2f9d78",
        coral: "#d95d4f",
        amber: "#c9861a"
      },
      boxShadow: {
        soft: "0 16px 48px rgba(23, 32, 38, 0.10)"
      }
    }
  },
  plugins: []
};

export default config;
