import xf from './xfetch'


/**
 * global consts
 * @type {{folder_mime_type: string, default_file_fields: string, gd_root_type: {share_drive: number, user_drive: number, sub_folder: number}}}
 */
const CONSTS = {
	default_file_fields: 'parents,id,name,mimeType,modifiedTime,createdTime,fileExtension,size',
	gd_root_type: {
	  user_drive: 0,
	  share_drive: 1,
	  sub_folder: 2
	},
	folder_mime_type : 'application/vnd.google-apps.folder',
  };

class GoogleDrive {
	constructor(auth) {
		this.auth = auth
		this.filesListPageSize = this.auth.files_list_page_size
		this.searchResultListPageSize = this.auth.search_result_list_page_size
		this.drivePageSize = this.auth.drive_page_size
		this.expires = 0
		this._getIdCache = new Map()
		this.idPathCache = {};
		this.paths = [];
	}
	async initializeClient() {
		// any method that do api call must call this beforehand
		if (Date.now() < this.expires) return
		const resp = await xf
			.post('https://www.googleapis.com/oauth2/v4/token', {
				urlencoded: {
					client_id: this.auth.client_id,
					client_secret: this.auth.client_secret,
					refresh_token: this.auth.refresh_token,
					grant_type: 'refresh_token'
				}
			})
			.json()
		this.client = xf.extend({
			baseURI: 'https://www.googleapis.com/drive/v3/',
			headers: {
				Authorization: `Bearer ${resp.access_token}`
			}
		})
		this.expires = Date.now() + 3500 * 1000 // normally, it should expiers after 3600 seconds
	}
	async listDrive() {
		await this.initializeClient()
		return this.client.get(`drives?pageSize=${this.drivePageSize}`).json()
	}
	async download(id, range = '') {
		await this.initializeClient()
		return this.client.get(`files/${id}`, {
			qs: {
				includeItemsFromAllDrives: true,
				supportsAllDrives: true,
				alt: 'media'
			},
			headers: {
				Range: range
			}
		})
	}
	async downloadByPath(path, rootId = 'root', range = '') {
		const id = await this.getId(path, rootId)
		if (!id) return null
		return this.download(id, range)
	}
	async getMeta(id) {
		await this.initializeClient()
		return this.client
			.get(`files/${id}`, {
				qs: {
					includeItemsFromAllDrives: true,
					supportsAllDrives: true,
					fields: '*'
				}
			})
			.json()
	}
	async getMetaByPath(path, rootId = 'root') {
		const id = await this.getId(path, rootId)
		if (!id) return null
		return this.getMeta(id)
	}
		/**
	 * 转换成针对谷歌搜索词法相对安全的搜索关键词
	 */
	formatSearchKeyword(keyword) {
		let nothing = "";
		let space = " ";
		if (!keyword) return nothing;
		return keyword.replace(/(!=)|['"=<>/\\:]/g, nothing)
		  .replace(/[,，|(){}]/g, space)
		  .trim()
	  }

	async listFolder(id, pageToken, originKeyword) {
		await this.initializeClient()
		let keyword = this.formatSearchKeyword(originKeyword)
		let words = keyword.split(/\s+/);
		let nameSearchStr = `name contains '${words.join("' and name contains '")}'`;
		let params = ''
		const getList = pageToken => {
			const qs = {
				includeItemsFromAllDrives: true,
				supportsAllDrives: true,
				q: `'${id}' in parents and trashed = false`,
				orderBy: 'folder,name,modifiedTime desc',
				fields:
					'files(id,name,mimeType,size,createdTime,modifiedTime,iconLink,thumbnailLink),nextPageToken',
				pageSize: this.filesListPageSize
			}
			if (pageToken) {
				qs.pageToken = pageToken
			}
			if (originKeyword) {
				qs.corpora = 'drive';
				qs.driveId = id;
				qs.q = `trashed = false and name !='.password' and (${nameSearchStr})`,
				qs.pageSize = this.searchResultListPageSize
			}
			params = JSON.parse(JSON.stringify(qs))
			return this.client
				.get('files', {
					qs
				})
				.json()
		}
		const files = []
		// do {
			const resp = await getList(pageToken)
			// files.push(...resp.files)
			// pageToken = resp.nextPageToken
		// } while (pageToken)
		resp.params = params
		return resp
	}
	async listFolderByPath(path, rootId = 'root', pageToken = null, originKeyword = '') {
		const id = await this.getId(path, rootId)
		if (!id) return null
		return this.listFolder(id, pageToken, originKeyword)
	}


	async getId(path, rootId = 'root') {
		const toks = path.split('/').filter(Boolean)
		let id = rootId
		for (const tok of toks) {
			id = await this._getId(id, tok)
		}
		return id
	}
	async _getId(parentId, childName) {
		if (this._getIdCache.has(parentId + childName)) {
			return this._getIdCache.get(parentId + childName)
		}
		await this.initializeClient()
		childName = childName.replace(/\'/g, `\\'`) // escape single quote
		const resp = await this.client
			.get('files', {
				qs: {
					includeItemsFromAllDrives: true,
					supportsAllDrives: true,
					q: `'${parentId}' in parents and name = '${childName}'  and trashed = false`,
					fields: 'files(id)'
				}
			})
			.json()
			.catch(e => ({ files: [] })) // if error, make it empty
		if (resp.files.length === 0) {
			return null
		}
		this._getIdCache.has(parentId + childName)
		return resp.files[0].id // when there are more than 1 items, simply return the first one
	}
	async upload(parentId, name, file) {
		await this.initializeClient()
		const createResp = await this.client.post(
			'https://www.googleapis.com/upload/drive/v3/files',
			{
				qs: {
					uploadType: 'resumable',
					supportsAllDrives: true
				},
				json: {
					name,
					parents: [parentId]
				}
			}
		)
		const putUrl = createResp.headers.get('Location')
		return this.client
			.put(putUrl, {
				body: file
			})
			.json()
	}
	async uploadByPath(path, name, file, rootId = 'root') {
		const id = await this.getId(path, rootId)
		if (!id) return null
		return this.upload(id, name, file)
	}
	async delete(fileId) {
		return this.client.delete(`files/${fileId}`)
	}
	async deleteByPath(path, rootId = 'root') {
		const id = await this.getId(path, rootId)
		if (!id) return null
		return this.delete(id)
	}
	  /**
   * 获取相对于本盘根目录的path
   * @param child_id
   * @returns {Promise<string>} 【注意】如果此id代表的项目不在目标gd盘下，那么此方法会返回空字符串""
   */
  async findPathById(child_id, rootId) {
    if (this.idPathCache[child_id]) {
      return { path : this.idPathCache[child_id] };
    }

    const p_files = await this.findParentFilesRecursion(child_id, rootId);
    if (!p_files || p_files.length < 1) return '';

    let cache = [];
    // 把查出来的每一级的path和id都缓存一下
    p_files.forEach((value, idx) => {
      const is_folder = idx === 0 ? (p_files[idx].mimeType === CONSTS.folder_mime_type) : true;
      let path = '/' + p_files.slice(idx).map(it => it.name).reverse().join('/');
      if (is_folder) path += '/';
      cache.push({id: p_files[idx].id, path: path})
    });

    cache.forEach((obj) => {
      this.idPathCache[obj.id] = obj.path;
      this.paths[obj.path] = obj.id
    });

    /*const is_folder = p_files[0].mimeType === CONSTS.folder_mime_type;
    let path = '/' + p_files.map(it => it.name).reverse().join('/');
    if (is_folder) path += '/';*/

    return { path : cache[0].path} ;
  }
    /**
   * 一层一层的向上获取这个文件或文件夹的上级文件夹的 file 对象。注意：会很慢！！！
   * 最多向上寻找到当前 gd 对象的根目录 (root id)
   * 只考虑一条单独的向上链。
   * 【注意】如果此id代表的项目不在目标gd盘下，那么此函数会返回null
   *
   * @param child_id
   * @param contain_myself
   * @returns {Promise<[]>}
   */
  async findParentFilesRecursion(child_id, rootId, contain_myself = true) {
    const gd = this;
    // const gd_root_id = gd.root.id;
    // const user_drive_real_root_id = authConfig.user_drive_real_root_id;
    // const is_user_drive = gd.root_type === CONSTS.gd_root_type.user_drive;

    // 自下向上查询的终点目标id
	// const target_top_id = is_user_drive ? user_drive_real_root_id : gd_root_id;
	const target_top_id = rootId
    const fields = CONSTS.default_file_fields;

    // [{},{},...]
    const parent_files = [];
    let meet_top = false;

    async function addItsFirstParent(file_obj) {
      if (!file_obj) return;
      if (!file_obj.parents) return;
      if (file_obj.parents.length < 1) return;

      // ['','',...]
      let p_ids = file_obj.parents;
      if (p_ids && p_ids.length > 0) {
        // its first parent
        const first_p_id = p_ids[0];
        if (first_p_id === target_top_id) {
          meet_top = true;
          return;
        }
        const p_file_obj = await gd.getMeta(first_p_id);
        if (p_file_obj && p_file_obj.id) {
          parent_files.push(p_file_obj);
          await addItsFirstParent(p_file_obj);
        }
      }
    }

    const child_obj = await gd.getMeta(child_id);
    if (contain_myself) {
      parent_files.push(child_obj);
    }
    await addItsFirstParent(child_obj);

    return meet_top ? parent_files : null
  }
}
export default GoogleDrive
