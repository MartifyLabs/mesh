const flowbite = require("flowbite-react/tailwind");

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    flowbite.content(),
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          // 50: "#eff6ff",
          // 100: "#dbeafe",
          // 200: "#bfdbfe",
          // 300: "#93c5fd",
          // 400: "#60a5fa",
          // 500: "#3b82f6",
          // 600: "#2563eb",
          // 700: "#1d4ed8",
          // 800: "#1e40af",
          // 900: "#1e3a8a",
        },
      },
      typography: {
        DEFAULT: {
          css: {
            pre: {
              margin: "0px",
              "margin-bottom": "8px",
              padding: "0px",
              "background-color": "transparent",
            },
          },
        },
      },
    },
    fontFamily: {
      body: [
        "Inter",
        "ui-sans-serif",
        "system-ui",
        "-apple-system",
        "system-ui",
        "Segoe UI",
        "Roboto",
        "Helvetica Neue",
        "Arial",
        "Noto Sans",
        "sans-serif",
        "Apple Color Emoji",
        "Segoe UI Emoji",
        "Segoe UI Symbol",
        "Noto Color Emoji",
      ],
      sans: [
        "Inter",
        "ui-sans-serif",
        "system-ui",
        "-apple-system",
        "system-ui",
        "Segoe UI",
        "Roboto",
        "Helvetica Neue",
        "Arial",
        "Noto Sans",
        "sans-serif",
        "Apple Color Emoji",
        "Segoe UI Emoji",
        "Segoe UI Symbol",
        "Noto Color Emoji",
      ],
    },
  },
  plugins: [require("flowbite-typography"), flowbite.plugin()],
};
