# Project Nova - Dual Portal System

This project is a Vue 3 + TypeScript multi-page application utilizing Vite.

## Features
- **Frontend Portal**: A beautifully designed portal with modern glassmorphism.
- **Backend Admin**: A secured administration dashboard using Element Plus.
- **Dual Build**: Separate entries for `index.html` (Frontend) and `admin.html` (Backend).

## Setup & Installation

Ensure you have Node.js installed, then run the appropriate commands:

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Run Development Server**
   ```bash
   npm run dev
   ```
   
   The application will start (usually at `http://localhost:5173/`).

## Project Structure
- `index.html` - Entry point for the frontend portal.
- `admin.html` - Entry point for the backend administration portal.
- `src/pages/index/` - Codebase for the Frontend Portal.
- `src/pages/admin/` - Codebase for the Admin Dashboard (contains Login and Layout).
- `vite.config.ts` - Customized Rollup configuration to maintain multi-page structure.

## Accessing the Admin Portal
- Navigate to `/admin.html` in your browser.
- Use any username and password to log in. The application will cache a mock token to localStorage and authorize you.

## Technologies Used
- Vue 3 (Composition API, `<script setup>`)
- Vite
- Element Plus
- Vue Router 4
- TypeScript

## Build for Production
```bash
npm run build
```
Build files will be generated in `dist` directory with `index.html` and `admin.html`.
