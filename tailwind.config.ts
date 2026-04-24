import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        reddit: {
          orange: "#ff4500",
          blue: "#0079d3",
          bg: "#dae0e6",
          line: "#cccfd4",
          text: "#1a1a1b",
          muted: "#576f76",
        },
      },
      boxShadow: {
        reddit: "0 1px 2px rgba(0, 0, 0, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
