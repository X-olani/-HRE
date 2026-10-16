import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // CABC brand (pulled from live cabc.org.za)
        brand: {
          blue: "#3299CC",
          bluedark: "#1F6F9E",
          bluedeep: "#14506F",
          yellow: "#D7D733",
          yellowdark: "#B7B716"
        },
        ink: "#000000",
        body: "#4B4F58",
        surface: "#FAFAFA",
        line: "#DDDDDD",
        // severity / category
        danger: "#A32D2D",
        warn: "#EF9F27"
      },
      fontFamily: {
        sans: ["Roboto", "system-ui", "-apple-system", "Segoe UI", "sans-serif"]
      },
      borderRadius: {
        xl: "0.75rem"
      }
    }
  },
  plugins: []
};

export default config;
