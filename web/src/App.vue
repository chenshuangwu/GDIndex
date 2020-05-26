<template>
	<v-app id="app">
		<v-app-bar app color="white" flat light>
			<v-toolbar-title class="headline pointer mr-3 hidden-sm-and-down">
				<router-link :to="{ path: '/', query: { rootId: $route.query.rootId } }" tag="span">{{ title }}</router-link>
			</v-toolbar-title>
			<portal to="menu">
				<div class="white pa-4 header">
					<v-menu offset-y v-if="drives.length">
						<template v-slot:activator="{ on }">
							<v-btn min-width="200" text outlined v-on="on" class="text-none justify-space-between">
								<!-- <v-icon dense>mdi-google-drive</v-icon> -->
								&nbsp;{{
								currentDrive.text
								}}
								<v-icon>mdi-menu-down</v-icon>
							</v-btn>
						</template>
						<v-list>
							<v-list-item
								v-for="(item, index) in drives"
								:key="index.id"
								@click="changeDrive(item.value)"
							>
								<v-list-item-title>{{item.text}}</v-list-item-title>
							</v-list-item>
						</v-list>
					</v-menu>
					<div class="search-box col-sm-3 col-md-3 col-lg-3 col col-xs-1 pa-0 ml-1">
						<input class="search-input" type="text" v-model="keyword" @keyup.enter="searchFiles" placeholder="搜索文件">
						<v-icon :focusable="false" @click="searchFiles" :ripple="false" class="icon">mdi-magnify</v-icon>
					</div>
					
				</div>
			</portal>
			<!-- <portal-target name="navbar" slim /> -->
			<v-spacer />
			<v-toolbar-items>
				<portal-target name="upload" slim />
			</v-toolbar-items>
		</v-app-bar>

		<v-content >
			<router-view @saveCache="saveCache" :filesCache="filesCache" />
		</v-content>
		<LoginDialog :cond="showAuthInput" />
	</v-app>
</template>
<script>
import api from './api'
import LoginDialog from './components/LoginDialog.vue'

export default {
	props: {
		title: String
	},
	data() {
		return {
			drives: [],
			value: {},
			showAuthInput: false,
			keyword: this.$route.query.keyword,
			filesCache: {}
		}
	},
	computed: {
		currentDrive() {
			const id = this.$route.query.rootId || window.props.default_root_id
			return this.drives.find(d => d.value === id)
		}
	},
	async created() {
		const ok =
			new URL(window.props.api).hostname === location.hostname ||
			(await api
				.get(window.props.api)
				.then(() => true)
				.catch(err => {
					if (err.response.status === 401) {
						this.showAuthInput = true
						return false
					}
				}))
		if (!ok) return

		const { drives } = await api.get('/~_~_gdindex/drives').json()
		this.drives = [{ text: this.$t('mainDrive'), value: 'root' }].concat(
			drives.map(d => ({
				value: d.id,
				text: d.name
			}))
		)
	},
	methods: {
		changeDrive(drive) {
			const rootId =
				drive !== window.props.default_root_id ? drive : undefined
			const dest = { path: '/', query: { rootId } }
			if (
				dest.path === this.$route.path &&
				dest.query.rootId === this.$route.query.rootId
			) {
				return // vue-router forbid going to same location
			}
			this.$router.push({ path: '/', query: { rootId } })
		},
		searchFiles() {
			if(this.keyword) {
				const rootId = this.$route.query.rootId
				this.$router.push({ path: '/', query: { rootId, keyword: this.keyword } })
			}

		},
		saveCache(cache) {
			this.filesCache = cache
		}
	},
	components: { LoginDialog }
}
</script>

<style lang="scss">
#app {
	background-color: #f6f6f6;
}
ul {
	li {
		list-style-type: none;
	}
}
.header {
	display: flex;
	justify-content: space-between;
}
.search-box {
	font-size: 14px;
	position: relative;
	.search-input {
		padding: 6px 15px;
		padding-right: 30px;
		background-color: #F1F2F4;
		outline: none;
		border-radius: 16px;
		width: 100%;
		::placeholder {
			color: #9A9A9A;
		}

	}
	.icon {
		position: absolute;
		right: 9px;
		top: 7px;
	}
}
</style>