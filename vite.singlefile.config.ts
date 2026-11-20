import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, Plugin } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

const configDir = path.dirname(fileURLToPath(import.meta.url));

function inlineBlueprintAssetPlugin(): Plugin {
  const assetPublicUrl = '/assets/aistudio/Technische_blauwdruk_van_moderne_sedan_846ffc14.png';
  const assetDiskPath = path.resolve(configDir, 'public/assets/aistudio/Technische_blauwdruk_van_moderne_sedan_846ffc14.png');
  return {
    name: 'inline-blueprint-asset',
    transform(code, id) {
      if (id.endsWith('SchadeVisuals.tsx') && code.includes(assetPublicUrl) && fs.existsSync(assetDiskPath)) {
        const b64 = fs.readFileSync(assetDiskPath).toString('base64');
        return code.replaceAll(assetPublicUrl, `data:image/png;base64,${b64}`);
      }
      return null;
    }
  };
}

export default defineConfig(() => {
  return {
    plugins: [inlineBlueprintAssetPlugin(), react(), tailwindcss(), viteSingleFile()],
    define: {
      __IS_STANDALONE_HTML__: JSON.stringify(true)
    },
    resolve: {
      alias: {
        '@': configDir
      }
    },
    build: {
      outDir: 'dist-html',
      emptyOutDir: true,
      copyPublicDir: false
    }
  };
});
