/*global require:true*/
	var config = {
		baseUrl: '',
		pluginPath: 'curl/plugin',
		paths: {},
		packages: [{"name":"cola","location":"lib/cola","main":"./cola-main"},{"name":"wire","location":"lib/wire","main":"./wire"},{"name":"when","location":"lib/when","main":"when"},{"name":"meld","location":"lib/meld","main":"meld"},{"name":"poly","location":"lib/poly","main":"./poly"},
			{"name":"curl","location":"lib/curl/src/curl","main":"../curl"},{"name":"rest","location":"lib/rest","main":"./rest"},{"name":"0.6","location":"lib/0.6","main":"./src/curl"}],
		preloads: ['curl/debug']
	};

	require(config, ['app/main']);
