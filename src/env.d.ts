/// <reference types="vite/client" />

declare module '*.vue' {
    import type { DefineComponent } from 'vue'
    const component: DefineComponent<{}, {}, any>
    export default component
}

declare module 'v-lazy-image';
// v-lazy-image 类型声明
declare module 'v-lazy-image';

declare module 'mpegts.js';
declare module 'demuxer';
declare module 'demuxer/dist/demuxer.min.js';
