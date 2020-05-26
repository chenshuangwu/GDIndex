module.exports = {
	input: 'index.js',
	output: {
		dir: 'dist',
		fileName: 'worker.js',
		format: 'iife'
	},
	minify: false,
	target: 'browser',
	banner: `
self.props = {
	title: 'GDIndex',
	default_root_id: 'root',
	client_id: '706078413115-3to9pvn4rca3hf52tftbhe6jkfhamtmk.apps.googleusercontent.com',
	client_secret: 'VacP0dmkNGlctxdOSdnCmmjq',
	refresh_token: '',
	auth: false,
	user: '',
	pass: '',
	upload: true,
	lite: false,
	files_list_page_size: 500,
	drive_page_size: 100,
	search_result_list_page_size: 50
};`.slice(1)
}
