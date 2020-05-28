import Vue from 'vue'
import VueRouter from 'vue-router'
import FileViewer from './views/FileViewer.vue'
import EpubViewer from './views/EpubViewer.vue'
import VideoViewer from './views/VideoViewer.vue'
import PdfViewer from './views/PdfViewer.vue'
/**
 * 重写路由的push方法
 */
const routerPush = VueRouter.prototype.push
VueRouter.prototype.push = function push(location) {
  return routerPush.call(this, location).catch(error=> error)
}
Vue.use(VueRouter)
const router = new VueRouter({
	routes: [
		{ path: '/~viewer/epub', component: EpubViewer },
		{ path: '/~viewer/video', component: VideoViewer },
		{ path: '/~viewer/pdf', component: PdfViewer },
		{ path: '/:path(.*)', component: FileViewer }
	],
	mode: 'history'
})

export default router
