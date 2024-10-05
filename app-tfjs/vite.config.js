import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
//pnpm install -D unplugin-vue-components unplugin-auto-import unplugin-icons
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import IconResolver from 'unplugin-icons/resolver'
import Icons from 'unplugin-icons/vite'


// https://vitejs.dev/config/
export default defineConfig({
  base: "/test-tfjs",
  plugins: [
    vue(),
    vueJsx(),
    AutoImport({
      resolvers: [
        ElementPlusResolver({ importStyle: false}),
        IconResolver({prefix:"icon"})
      ],
    }),
    Components({
      resolvers: [
        ElementPlusResolver(),
        IconResolver({ //{prefix}-{collection}-{icon}, https://icones.netlify.app/
          enableCollections:["ep"],
          prefix:"icon"
        })
      ],
    }),
    Icons({
      scale:1.2, 
      compiler:"vue3",
      defaultClass:"inline-block", 
      autoInstall:true
    })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@import "@/assets/scss/_mixin.scss";`
      }
    },
    modules: {
      localsConvention: 'camelCase'
    }
  }
})
