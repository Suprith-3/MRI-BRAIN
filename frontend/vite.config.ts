import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import fs from 'fs'
import path from 'path'

// Automatically ensure logo and video are copied to public and src/assets on dev server reload
try {
  const possibleLogos = [
    path.resolve('c:/Users/supre/vinay b/logo.png'),
    path.resolve('../logo.png'),
    path.resolve('c:/Users/supre/.gemini/antigravity-ide/brain/ccaf8f92-022a-49c1-bce8-574bcdea873c/.user_uploaded/media_1790254089201.jpg')
  ];
  
  fs.mkdirSync(path.resolve('public'), { recursive: true });
  fs.mkdirSync(path.resolve('src/assets'), { recursive: true });
  
  const targetPublic = path.resolve('public/logo.png');
  const targetSrc = path.resolve('src/assets/logo.png');
  
  for (const src of possibleLogos) {
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, targetPublic);
      fs.copyFileSync(src, targetSrc);
      console.log('Copied custom logo from:', src);
      break;
    }
  }

  // Also ensure background video is copied
  const videoSrc = path.resolve('c:/Users/supre/vinay b/BACKGROUND VIDO.mp4');
  const videoTarget = path.resolve('public/background.mp4');
  if (fs.existsSync(videoSrc) && !fs.existsSync(videoTarget)) {
    fs.copyFileSync(videoSrc, videoTarget);
  }
} catch (e) {
  console.error('Asset copy error in vite.config.ts:', e);
}

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true
  }
})
