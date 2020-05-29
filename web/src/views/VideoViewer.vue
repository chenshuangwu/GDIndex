<template>
	<v-container fluid>
		<v-row justify="center">
			<v-col md="8">
				<!-- <video controls ref="video">
					<source ref="source" />
					<track
						ref="track"
						label="Unknown"
						kind="subtitles"
						srclang="en"
						default
					/>
				</video>-->
				<div id="video"></div>
			</v-col>
		</v-row>
	</v-container>
</template>
<script>
import api from '../api'
import Player from 'xgplayer'
import 'xgplayer-mp4'

const MIME = {
	mp4: 'video/mp4'
}
function checkExists(url) {
	const ct = new AbortController()
	return api
		.get(url, {
			signal: ct.signal
		})
		.then(r => {
			ct.abort()
			return r.status === 200
		})
		.catch(() => false)
}
const srt2vtt = s =>
	'WEBVTT FILE\r\n\r\n' +
	s
		.replace(/\{\\([ibu])\}/g, '</$1>')
		.replace(/\{\\([ibu])1\}/g, '<$1>')
		.replace(/\{([ibu])\}/g, '<$1>')
		.replace(/\{\/([ibu])\}/g, '</$1>')
		.replace(/(\d\d:\d\d:\d\d),(\d\d\d)/g, '$1.$2')
		.concat('\r\n\r\n')
export default {
	data() {
		return {
			player: ''
		}
	},
	async mounted() {
		// const { video, source, track } = this.$refs
		// const url = new URL(atob(this.$route.query.urlBase64))
		// const toks = url.pathname.split('.')
		// const pathSansExt = toks.slice(0, -1).join('.')
		// const ext = toks.slice(-1)[0].toLowerCase()
		// source.type = MIME[ext]
		// source.src = url.href

		// const srtUrl = new URL(url)
		// srtUrl.pathname = pathSansExt + '.srt'
		// const hasSrt = await checkExists(srtUrl)
		// if (hasSrt) {
		// 	const srt = await api.get(srtUrl).text()
		// 	const blob = new Blob([srt2vtt(srt)], { type: 'text/vtt' })
		// 	track.src = URL.createObjectURL(blob)
		// 	video.textTracks[0].mode = 'show'
		// }

		// video.play()
		// const url = new URL(atob(this.$route.query.urlBase64))
		const url = decodeURIComponent(this.$route.query.urlBase64)
		
		  this.player = new Player({
			id: 'video',
			url: url,
			fluid: true,
			videoInit: true,
			playbackRate: [0.5, 0.75, 1, 1.5, 2],
			rotate: {   //视频旋转按钮配置项
			innerRotate: true, //只旋转内部video
			clockwise: false // 旋转方向是否为顺时针
			},
			download: true, //设置download控件显示
			pip: true, //画中画
			cssFullscreen: true, //网页样式全屏
			keyShortcut: 'on', // 键盘快捷键
		});
	},
	methods: {

	},
	beforeDestroy() {
		this.player.destroy(true)
	}
}
</script>
<style scoped>
video {
	width: 100%;
	height: 100%;
	object-fit: cover;
}
</style>
