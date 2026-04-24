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
          orange: "#31596b",
          blue: "#2f6fb2",
          bg: "#dfe5ea",
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
