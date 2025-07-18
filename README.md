# Svelte + Vite + CRXJS

This template helps you quickly start developing Chrome extensions with Svelte and Vite. It includes the CRXJS Vite plugin for seamless Chrome extension development.

## Features

- Svelte with component syntax
- Vite build tool
- CRXJS Vite plugin integration
- Chrome extension manifest configuration
- Security-focused development with vulnerability scanning

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Start development server:

```bash
npm run dev
```

3. Open Chrome and navigate to `chrome://extensions/`, enable "Developer mode", and load the unpacked extension from the `dist` directory.

4. Build for production:

```bash
npm run build
```

## Project Structure

- `src/popup/` - Extension popup UI
- `src/content/` - Content scripts
- `manifest.config.js` - Chrome extension manifest configuration

## Chrome Extension Development Notes

- Use `manifest.config.js` to configure your extension
- The CRXJS plugin automatically handles manifest generation
- Content scripts should be placed in `src/content/`
- Popup UI should be placed in `src/popup/`

## Documentation

- [Svelte Documentation](https://svelte.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [CRXJS Documentation](https://crxjs.dev/vite-plugin)
