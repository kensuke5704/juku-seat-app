import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#172033",
        line: "#d8e2f0",
        appblue: "#2563eb",
      },
    },
  },
  plugins: [],
};

export default config;
