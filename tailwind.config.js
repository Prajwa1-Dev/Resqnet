/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./views/**/*.ejs",           // if your HTML is in views
    "./public/**/*.html",         // any static HTML files
    "./public/**/*.js"            // any JS files with Tailwind classes
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
