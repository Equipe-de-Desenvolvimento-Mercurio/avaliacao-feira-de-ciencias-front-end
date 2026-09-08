(function (window) {
	"use strict";

	var TOKEN_KEY = "sic_access_token";
	var USER_KEY = "sic_current_user";
	var apiMeta = document.querySelector('meta[name="api-base-url"]');
	var defaultBaseUrl = apiMeta ? apiMeta.content : "";

	function normalizeBaseUrl(url) {
		return (url || "").replace(/\/$/, "");
	}

	var config = {
		baseUrl: normalizeBaseUrl(window.SIC_CONFIG && window.SIC_CONFIG.apiBaseUrl || defaultBaseUrl),
		timeout: 10000
	};

	function getToken() {
		return window.localStorage.getItem(TOKEN_KEY);
	}

	function request(path, options) {
		options = options || {};

		if (!config.baseUrl) {
			return Promise.reject(new Error("API_BASE_URL não configurada"));
		}

		var controller = window.AbortController ? new AbortController() : null;
		var timeout = controller ? window.setTimeout(function () { controller.abort(); }, config.timeout) : null;
		var headers = Object.assign({ Accept: "application/json" }, options.headers || {});
		var token = getToken();

		if (options.body && typeof options.body !== "string") {
			headers["Content-Type"] = "application/json";
			options.body = JSON.stringify(options.body);
		}

		if (token) headers.Authorization = "Bearer " + token;
		if (controller) options.signal = controller.signal;

		return window.fetch(config.baseUrl + path, Object.assign({}, options, { headers: headers }))
			.then(function (response) {
				if (timeout) window.clearTimeout(timeout);
				return response.text().then(function (text) {
					var data = text ? JSON.parse(text) : null;
					if (!response.ok) {
						var error = new Error(data && data.message || "Erro ao comunicar com a API");
						error.status = response.status;
						error.data = data;
						throw error;
					}
					return data;
				});
			});
	}

	function saveSession(session) {
		if (session && session.token) window.localStorage.setItem(TOKEN_KEY, session.token);
		if (session && session.user) window.localStorage.setItem(USER_KEY, JSON.stringify(session.user));
		return session;
	}

	window.SICApi = {
		config: config,
		setBaseUrl: function (url) {
			config.baseUrl = normalizeBaseUrl(url);
		},
		isConfigured: function () {
			return Boolean(config.baseUrl);
		},
		request: request,
		auth: {
			login: function (credentials) {
				return request("/auth/login", { method: "POST", body: credentials }).then(saveSession);
			},
			me: function () {
				return request("/auth/me");
			},
			logout: function () {
				window.localStorage.removeItem(TOKEN_KEY);
				window.localStorage.removeItem(USER_KEY);
			},
			getUser: function () {
				var stored = window.localStorage.getItem(USER_KEY);
				return stored ? JSON.parse(stored) : null;
			},
			getToken: getToken
		},
		projects: {
			list: function (filters) {
				var query = new URLSearchParams(filters || {}).toString();
				return request("/projects" + (query ? "?" + query : ""));
			},
			get: function (id) { return request("/projects/" + encodeURIComponent(id)); },
			create: function (project) { return request("/projects", { method: "POST", body: project }); }
		},
		evaluations: {
			submit: function (evaluation) { return request("/evaluations", { method: "POST", body: evaluation }); },
			list: function (filters) {
				var query = new URLSearchParams(filters || {}).toString();
				return request("/evaluations" + (query ? "?" + query : ""));
			}
		},
		professors: {
			list: function () { return request("/professors"); },
			create: function (professor) { return request("/professors", { method: "POST", body: professor }); },
			update: function (id, professor) { return request("/professors/" + encodeURIComponent(id), { method: "PUT", body: professor }); }
		},
		evaluators: {
			list: function () { return request("/evaluators"); }
		},
		ranking: {
			list: function (filters) {
				var query = new URLSearchParams(filters || {}).toString();
				return request("/ranking" + (query ? "?" + query : ""));
			}
		}
	};
}(window));
