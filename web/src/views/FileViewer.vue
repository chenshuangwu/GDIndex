<template>
	<v-container fluid>
		<FileUploadDialog v-model="showUploadDialog" :uploadUrl="uploadUrl" @uploaded="uploadComplete" />

		<portal to="upload">
			<div class="pt-4">
				<v-btn
					v-if="uploadEnabled"
					color="#00AEFF"
					class="white-text"
					dark
					@click="showUploadDialog = true"
				>
					<v-icon color="#FFF">mdi-upload</v-icon>
					{{$t('upload')}}
				</v-btn>
			</div>
		</portal>
		<!-- <v-row justify="center" v-if="uploadEnabled">
			<v-col md="10" lg="8" class="pt-0 pb-0">
				
			</v-col>
		</v-row>-->
		<v-row justify="center">
			<v-col md="10" lg="8">
				<portal-target name="menu" />
				<v-card
					id="images"
					class="mx-auto"
					min-height="400px"
					tile
					flat
					v-infinite-scroll="loadMore"
					infinite-scroll-disabled="busy"
					infinite-scroll-distance="100"
					:infinite-scroll-immediate-check="false"
				>
					<v-breadcrumbs :items="pathSegments" class="pl-4 pt-1">
						<template v-slot:item="{ item }">
							<v-breadcrumbs-item
								href="#"
								@click="goPath(item.path)"
								:title="item.name"
								:disabled="item.disabled"
							>{{ item.name }}</v-breadcrumbs-item>
						</template>
						<template v-slot:divider>
							<v-icon>mdi-chevron-right</v-icon>
						</template>
					</v-breadcrumbs>
<!-- 
					<div class="search-box col-sm-3 col-md-3 col-lg-3 col col-xs-1 pa-0 ml-1">
						<input class="search-input" type="text" v-model="searchKey"  placeholder="搜索当前文件">
						<v-icon :focusable="false" :ripple="false" class="icon">mdi-magnify</v-icon>
					</div> -->


					<v-list-item class="pl-0 list-item list-header">
						<span v-for="item in headers" :key="item.value" :class="item.class">{{item.text}}</span>
					</v-list-item>

					<v-list-item
						v-for="item in filterList"
						:key="item.id"
						tag="a"
						class="pl-0 list-item"
						@click.prevent="goPath(item.resourcePath, item.opener, item.id, item)"
						:href="getFileUrl(item.resourcePath)"
					>
						<v-row class="ma-0 pl-2">
							<v-list-item-avatar class="ma-0">
								<!-- <v-img
									contain
									height="24"
									v-if="item.thumbnailLink"
									:lazy-src="item.thumbnailLink"
									:src="item.thumbnailLink"
								></v-img>-->
								<i :class="['icon ', item.icon]"></i>
							</v-list-item-avatar>
							<span class="v-list-item__title file-name">{{item.fileName}}</span>
							<!-- <span v-if="!item.isFolder">
								<v-btn
									icon
									v-if="!item.isFolder && !item.isGoogleFile"
									tag="a"
									:href="getFileUrl(item.resourcePath)"
									download
									@click.stop
								>
									<v-icon color="#00AEFF">mdi-download</v-icon>
								</v-btn>
							</span>-->
							<v-col md="2" lg="2" class="text-end">{{item.fileSize}}</v-col>

							<v-col md="3" lg="3" class="modifyed-time text-end">{{item.modifiedTime}}</v-col>
						</v-row>
					</v-list-item>

					<div class="list-item-end">
						<span v-show="loading">
							<v-progress-circular indeterminate color="#34ABFF"></v-progress-circular>
						</span>
						<span v-if="loadEnd">共 {{filterList.length}} 项</span>
					</div>
				</v-card>
			</v-col>
		</v-row>

		<div class="text-center">
			<v-dialog v-model="pathDialog" width="500">
				<v-card>
					<v-card-title class="headline grey lighten-2" primary-title>{{searchItemSelected.fileName}}</v-card-title>

					<v-card-text class="pt-4">
						<a @click.stop="goPathBySearch" target="_blank">{{searchItemSelected.path}}</a>
					</v-card-text>

					<v-divider></v-divider>
				</v-card>
			</v-dialog>
		</div>
	</v-container>
</template>
<script>
import { format } from 'date-fns'
import prettyBytes from 'pretty-bytes'
import nodeUrl from 'url'
import nodePath from 'path'
import api from '../api'
import ImageViewer from 'viewerjs'
import 'viewerjs/dist/viewer.css'
import FileUploadDialog from '../components/FileUploadDialog'
import { tr } from 'date-fns/locale'

const SUPPORTED_TYPES = {
	'application/epub+zip': 'epub',
	'video/mp4': 'video',
	'image/png': 'image',
	'image/jpeg': 'image',
	'image/gif': 'image',
	'image/bmp': 'image',
	'application/pdf': 'pdf'
}
const ICON_NAME = {
	'application/x-rar': 'icon-zip',
	'application/x-zip-compressed': 'icon-zip',
	'application/vnd.google-apps.folder': 'icon-folder',
	'application/epub+zip': 'mdi-book',
	'application/vnd.android.package-archive': 'mdi-android',
	'video/mp4': 'icon-video',
	'video/x-msvideo': 'icon-video',
	'video/x-flv': 'icon-video',
	'video/x-ms-wmv': 'icon-video',
	'video/webm': 'icon-video',
	'video/x-matroska': 'icon-video',
	'video/flv': 'icon-video',
	'application/zip': 'icon-zip',
	'application/x-7z-compressed': 'icon-zip',
	'application/x-rar-compressed': 'icon-zip',
	'application/x-gzip': 'icon-zip',
	'image/png': 'icon-img',
	'image/jpeg': 'icon-img',
	'image/gif': 'icon-img',
	'image/bmp': 'icon-img',
	'application/msword': 'mdi-file-word',
	'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
		'mdi-file-word',
	'application/vnd.ms-excel': 'mdi-file-excel',
	'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
		'mdi-file-excel',
	'application/vnd.openxmlformats-officedocument.presentationml.presentation':
		'mdi-file-powerpoint',
	'application/vnd.ms-powerpoint': 'mdi-file-powerpoint',
	'application/pdf': 'icon-pdf',
	'text/x-sql': 'mdi-database',
	'application/octet-stream': 'icon-octet-stream',
	'application/x-font-ttf': 'icon-ttf',
	'audio/x-flac': 'icon-music',
	'audio/mpeg': 'icon-mp3',
	'audio/flac': 'icon-music',
	'audio/x-wav': 'icon-music',
	'audio/x-hx-aac-adts': 'icon-music'
}
const ICON_COLOR = {
	'application/vnd.google-apps.folder': '#FED032'
}
export default {
	components: {
		FileUploadDialog
	},
	props: {
		filesCache: Object,
		searchKey: String,
		current: Boolean
	},
	data() {
		return {
			list: [],
			loading: false,
			headers: [
				{
					text: this.$t('fileName'),
					value: 'fileName',
					class: 'v-list-item__title file-name pl-4'
				},
				{
					text: this.$t('fileSize'),
					value: 'fileSize',
					class: 'text-end col-md-2 col-lg-2 col',
					filterable: false
				},
				{
					text: this.$t('modifiedTime'),
					value: 'modifiedTime',
					filterable: false,
					class: 'modifyed-time text-end col-md-2 col-lg-3 col'
				}
			],
			renderStart: null,
			uploadEnabled: window.props.upload,
			showUploadDialog: false,
			showImg: false,
			pageToken: '',
			busy: true,
			loadEnd: false,
			path: '/' + this.$route.params.path,
			keyword: this.$route.query.keyword,
			rootId: this.$route.query.rootId || window.props.default_root_id,
			pathDialog: false,
			searchItemSelected: '',
			// searchKey: '', // 当前结果搜索关键词
			
		}
	},
	computed: {
		// path() {
		// 	return '/' + this.$route.params.path
		// },
		pathSegments() {
			const list = this.path
				.split('/')
				.filter(Boolean)
				.map(decodeURIComponent)
			const ar = []
			ar.push({
				name: '全部文件',
				path: '/',
				disabled: false
			})
			for (let i = 0; i < list.length; i++) {
				let disabled = false
				if (i + 1 == list.length) {
					disabled = true
				}
				ar.push({
					name: list[i],
					path: '/' + nodePath.join(...list.slice(0, i + 1)) + '/',
					disabled
				})
			}
			return ar
		},
		uploadUrl() {
			const u = new URL(this.path, window.props.api)
			u.searchParams.set(
				'rootId',
				this.$route.query.rootId || window.props.default_root_id
			)
			return u.href
		},
		filterList() {
			let key = this.searchKey
			if(key && this.current) {
				//不区分大小写处理
				let reg = new RegExp(key, 'ig')

                //es6 filter过滤匹配，有则返回当前，无则返回所有
				return this.list.filter( (e) => {
					return e.fileName.match(reg)
				})

				// 匹配所有字段
				// return Object.keys(e).some(function(key) {
				//     return e[key].match(reg);
				// })
			}
            return this.list;

		}
	},
	methods: {
		async goPath(path, opener, id, item) {
			// if (this.loading) return
			const query = {
				rootId: this.$route.query.rootId
			}
			if (opener) {
				query.opener = opener
			}
			if (this.keyword && id) {
				this.searchItemSelected = item
				this.searchItemSelected.path = await this.getPathById(
					id,
					this.rootId
				)
				this.pathDialog = true
				return
			}

			if (path.substr(-1) === '/') {
				this.$router.push({
					path: path
						.split('/')
						.map(decodeURIComponent)
						.map(encodeURIComponent)
						.join('/'),
					query
				})
			} else {
				let u = nodeUrl.resolve(window.props.api, path)
				//if (Math.random() < 10) return
				if (
					query.rootId &&
					query.rootId !== window.props.default_root_id
				) {
					u += '?rootId=' + query.rootId
				}
				if (query.opener) {
					if (query.opener === 'image') {
						const img = new Image()
						img.src = u
						img.style.display = 'none'
						document.body.appendChild(img)
						const viewer = new ImageViewer(img)
						viewer.show()
						img.onload = () => {
							img.addEventListener('hide', () => {
								viewer.destroy()
								img.remove()
							})
						}
						return
					}
					this.$router.push({
						path: '/~viewer/' + query.opener,
						query: { urlBase64: encodeURIComponent(u) }
					})
				} else {
					location.href = u
				}
			}


		},
		goPathBySearch() {
			this.pathDialog = false
			let query = {
				rootId: this.rootId,
				opener: this.searchItemSelected.opener
			}
			this.goPath(this.searchItemSelected.path, this.searchItemSelected.opener)
			// this.handlePath(this.searchItemSelected.path, query)
		},
		async getPathById(id, rootId) {
			let params = {
				id,
				rootId
			}
			const data = await api
				.post('/id2path', {
					method: 'POST',
					qs: params
				})
				.json()
			return data.path
		},
		getFileUrl(path) {
			const { rootId } = this.$route.query
			let u = nodeUrl.resolve(
				window.props.api,
				path
					.split('/')
					.map(encodeURIComponent)
					.join('/')
			)
			if (rootId) {
				u += '?rootId=' + rootId
			}
			return u
		},
		// renderPath(path, rootId, keyword) {
		// 	this.path = path
		// 	this.pageToken = null
		// 	this.loadEnd = false
		// 	this.$route.query.rootId = rootId
		// 	this.keyword = keyword
		// 	let renderStart = (this.renderStart = Date.now()) // Withous this, when user regret navigating a big folder, it will have some conflict.
		// 	// this.loading = true
		// 	if (!rootId) {
		// 		rootId = window.props.default_root_id
		// 	}
		// 	this.list = []

		// 	if (
		// 		this.keyword &&
		// 		this.filesCache[rootId] && this.filesCache[rootId].keyword &&
		// 		this.filesCache[rootId].keyword[this.keyword]
		// 	) {
		// 		let cacheData = this.filesCache[rootId].keyword[this.keyword]
		// 		this.list = cacheData.list
		// 		this.pageToken = cacheData.pageToken
		// 		this.loadEnd = cacheData.loadEnd
		// 		this.busy = cacheData.busy
		// 	} else if (
		// 		!this.keyword &&
		// 		this.filesCache[rootId] &&
		// 		this.filesCache[rootId][this.path]
		// 	) {
		// 		let cacheData = this.filesCache[rootId][this.path]
		// 		this.list = cacheData.list
		// 		this.pageToken = cacheData.pageToken
		// 		this.loadEnd = cacheData.loadEnd
		// 		this.busy = cacheData.busy				
		// 	} else {
		// 		this.getFilesList()
		// 	}
			

		// 	if (renderStart !== this.renderStart) {
		// 		// User had initiated other folder navigation request
		// 		return
		// 	}
		// },

		loadMore() {
			if (this.busy) return
			this.getFilesList()
		},

		// get files list
		async getFilesList(refresh = false) {
			if (this.loading) return

			this.list = []
			const rootId = this.rootId
			const path = this.path
			const keyword = this.keyword
			let cacheData = this.getCacheData(rootId, path, keyword)

			if(!refresh) {
				if(cacheData) {
					this.list = cacheData.list
					this.pageToken = cacheData.pageToken
					this.loadEnd = cacheData.loadEnd
					this.busy = cacheData.busy
				}
				if(cacheData && !this.pageToken) return
			}


			this.loading = true

			let params = {
				rootId
			}
			if (this.pageToken) {
				params.pageToken = this.pageToken
			}
			if (keyword) {
				params.keyword = keyword
			}

			if(refresh) {
				params.pageToken = ''
				params.keyword = ''
			}
			

			const data = await api
				.post(this.path, {
					method: 'POST',
					qs: params
				})
				.json()

			this.loading = false
			if(!data) return

			let listTemp = this.formatList(data)
			this.list = this.list.concat(listTemp)
			this.pageToken = data.nextPageToken || ''
			this.busy = data.nextPageToken ? false : true
			this.loadEnd = data.nextPageToken ? false : true

			cacheData = {
				list: this.list,
				pageToken: this.pageToken,
				busy: this.busy,
				loadEnd: this.loadEnd
			}

			this.saveCache(cacheData, rootId, path, keyword)


		},

		formatList(data) {
			let listT = data.files.map(f => {
				f.mimeType = f.mimeType.replace('; charset=utf-8', '')
				const isFolder =
					f.mimeType === 'application/vnd.google-apps.folder'
				const isGoogleFile = f.mimeType.includes('vnd.google-apps')
				const resourcePath =
					nodeUrl.resolve(this.path, f.name) + (isFolder ? '/' : '')
				let fullPath = nodeUrl.resolve(window.props.api, resourcePath)

				const o = {
					id: f.id,
					fileName: f.name,
					modifiedTime: format(
						new Date(f.modifiedTime),
						'yyyy/MM/dd HH:mm:ss'
					),
					isFolder,
					isGoogleFile,
					mimeType: f.mimeType,
					fileSize: f.size ? prettyBytes(parseInt(f.size)) : '',
					resourcePath,
					icon: ICON_NAME[f.mimeType] || 'icon-unknown',
					color: ICON_COLOR[f.mimeType],
					thumbnailLink: f.thumbnailLink
				}

				let query = this.$route.query
				if (
					query.rootId &&
					query.rootId !== window.props.default_root_id
				) {
					fullPath += '?rootId=' + query.rootId
				}
				if (f.mimeType in SUPPORTED_TYPES) {
					;(o.opener = SUPPORTED_TYPES[f.mimeType]),
						(o.fullPath = fullPath)
				}

				if (f.thumbnailLink) {
					const urlObj = nodeUrl.parse(f.thumbnailLink)
					const thumbnailLink = urlObj.path
					o.thumbnailLink =
						window.props.api + '/thumbnailLink/' + thumbnailLink
				}

				if (f.iconLink) {
					const urlObj = nodeUrl.parse(f.iconLink)
					o.iconLink = window.props.api + '/iconLink/' + urlObj.path
				}

				return o
			})
			return listT
		},

		saveCache(cacheData, rootId, path, keyword) {
			// todo： 优化缓存代码
			if (this.filesCache[rootId]) {
				if(keyword && this.filesCache[rootId].keyword) {
					this.filesCache[rootId].keyword[keyword] = cacheData
				} else if(keyword) {
					this.filesCache[rootId].keyword = {}
					this.filesCache[rootId].keyword[keyword] = cacheData
				} else {
					this.filesCache[rootId][path] = cacheData
				}				
			} else {
				this.filesCache[rootId] = {}
				if(keyword) {
					this.filesCache[rootId].keyword = {}
					this.filesCache[rootId].keyword[keyword] = cacheData
				} else {
					this.filesCache[rootId][path] = cacheData
				}
				
			}
			this.$emit('saveCache', this.filesCache)
		},
		
		getCacheData(rootId, path, keyword = null) {
			let cacheData = null
			if (
				keyword &&
				this.filesCache[rootId] && this.filesCache[rootId].keyword &&
				this.filesCache[rootId].keyword[keyword]
			) {
				cacheData = this.filesCache[rootId].keyword[keyword]

			} else if (
				!keyword &&
				this.filesCache[rootId] &&
				this.filesCache[rootId][path]
			) {
				cacheData = this.filesCache[rootId][path]			
			}
			return cacheData
		},

		// handlePath(path, query) {
		// 	if (path.substr(-1) === '/') {
		// 		this.renderPath(path, query.rootId, query.keyword)
		// 		return true
		// 	} else {
		// 		let u = nodeUrl.resolve(window.props.api, path)
		// 		//if (Math.random() < 10) return
		// 		if (
		// 			query.rootId &&
		// 			query.rootId !== window.props.default_root_id
		// 		) {
		// 			u += '?rootId=' + query.rootId
		// 		}
		// 		if (query.opener) {
		// 			if (query.opener === 'image') {
		// 				const img = new Image()
		// 				img.src = u
		// 				img.style.display = 'none'
		// 				document.body.appendChild(img)
		// 				const viewer = new ImageViewer(img)
		// 				viewer.show()
		// 				img.onload = () => {
		// 					img.addEventListener('hide', () => {
		// 						viewer.destroy()
		// 						img.remove()
		// 					})
		// 				}
		// 				return
		// 			}
		// 			this.$router.push({
		// 				path: '/~viewer/' + query.opener,
		// 				query: { urlBase64: u }
		// 			})
		// 		} else {
		// 			location.href = u
		// 		}
		// 	}
		// },
		uploadComplete() {
			this.showUploadDialog = false
			this.getFilesList(true)
		}
	},
	created() {
		this.getFilesList()
		// this.handlePath(this.path, this.$route.query)
	},
	// beforeRouteUpdate(to, from, next) {
	// 	const fullyEncoded = to.params.path
	// 		.split('/')
	// 		.map(decodeURIComponent)
	// 		.map(encodeURIComponent)
	// 		.join('/') // because vue-router's encoding is a little bit weird...
	// 	if (this.handlePath('/' + fullyEncoded, to.query)) {
	// 		next()
	// 	}
	// },

}
</script>
<style lang="scss" scoped>
.fake-tr {
	display: table-row;
	vertical-align: inherit;
	border-color: inherit;
	color: inherit;
	text-decoration: none;
}
.theme--light.v-data-table
	tbody
	.fake-tr:hover:not(.v-data-table__expanded__content) {
	background: #eeeeee;
}
.theme--light.v-data-table
	tbody
	.fake-tr:not(:last-child)
	td:not(.v-data-table__mobile-row) {
	border-bottom: 1px solid rgba(0, 0, 0, 0.12);
}
.line-height {
	height: 48px;
	line-height: 48px;
}
.wrapper {
	display: flex;
	align-items: center;
}
.icon-wrapper {
	box-sizing: border-box;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
.list-header {
	color: #888888;
}
.list-item {
	border-bottom: 1px solid #eeeeee;
	font-size: 14px;
	.v-list-item__title {
		font-size: 14px;
	}
	.file-name {
		flex: 1;
		width: 0;
	}
}
.list-item-end {
	text-align: center;
	padding: 20px;
}
</style>

<style lang="scss">
.list-item {
	.v-avatar {
		border-radius: 0;
		padding: 5px;
	}
}
.v-card {
	.v-breadcrumbs__item {
		display: inline-block;
		max-width: 150px;
		white-space: nowrap;
		text-overflow: ellipsis;
		overflow: hidden;
	}
}
</style>
