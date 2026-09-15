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
						var error = new Error(data && (data.error || data.erro || data.message) || "Erro ao comunicar com a API");
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
		if (session && (session.user || session.data)) {
			window.localStorage.setItem(USER_KEY, JSON.stringify(session.user || session.data));
			window.localStorage.removeItem("sic_current_event");
			window.localStorage.removeItem("sic_current_project");
		}
		return session;
	}

	function pathId(id) {
		return encodeURIComponent(String(id));
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
			register: function (user) { return request("/auth/cadastrar", { method: "POST", body: user }); },
			remove: function (id) { return request("/auth/usuario/" + pathId(id), { method: "DELETE" }); },
			logout: function () {
				window.localStorage.removeItem(TOKEN_KEY);
				window.localStorage.removeItem(USER_KEY);
				window.localStorage.removeItem("sic_current_event");
				window.localStorage.removeItem("sic_current_project");
			},
			getUser: function () {
				var stored = window.localStorage.getItem(USER_KEY);
				return stored ? JSON.parse(stored) : null;
			},
			getToken: getToken
		},
		events: {
			listByUser: function (id) { return request("/event/" + pathId(id)); },
			create: function (event) { return request("/event", { method: "POST", body: event }); },
			dashboard: function (id) { return request("/event/" + pathId(id) + "/dashboard"); }
		},
		ranking: {
			list: function (eventId) { return request("/ranking/" + pathId(eventId)); }
		},
		projects: {
			list: function (eventId) { return request("/project/" + pathId(eventId)); },
			get: function (id) { return request("/project/id/" + pathId(id)); },
			listEvaluated: function (eventId, userId) { return request("/project/" + pathId(eventId) + "/" + pathId(userId) + "/evaluated"); },
			listNotEvaluated: function (eventId, userId) { return request("/project/" + pathId(eventId) + "/" + pathId(userId) + "/not_evaluated"); },
			create: function (project) { return request("/project", { method: "POST", body: project }); }
		},
		evaluations: {
			submit: function (evaluation) { return request("/review", { method: "POST", body: evaluation }); }
		},
		professors: {
			list: function (eventId) { return request("/teacher/evento/" + pathId(eventId)); },
			panel: function (eventId, userId) { return request("/teacher/" + pathId(eventId) + "/" + pathId(userId)); }
		},
		criteria: {
			list: function (userId) { return request("/criterios/" + pathId(userId)); }
		}
	};
}(window));
