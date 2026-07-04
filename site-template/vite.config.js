import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import yaml from 'js-yaml'

// Read conference.yaml at build time and bake values in via define.
// Nothing is fetched at runtime — the built site works from file:// and GitHub Pages.
const conferenceYamlPath = resolve(__dirname, 'conference.yaml')
const conference = yaml.load(readFileSync(conferenceYamlPath, 'utf8'))

// Vite HTML transform plugin: replaces {{CONFERENCE_*}} placeholders in index.html
function conferenceHtmlPlugin(conf) {
  return {
    name: 'conference-html',
    transformIndexHtml(html) {
      return html
        .replace(/\{\{CONFERENCE_TITLE\}\}/g, conf.pageTitle ?? '')
        .replace(/\{\{CONFERENCE_FAVICON\}\}/g, conf.faviconPath ?? '/swisschi.svg')
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), conferenceHtmlPlugin(conference)],
  base: conference.basePath ?? './',
  define: {
    __CONFERENCE__: JSON.stringify(conference),
  },
})
