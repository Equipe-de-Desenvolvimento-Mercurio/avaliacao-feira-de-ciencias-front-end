(function (window) {
	"use strict";

	window.SICUtils = {
		normalizeText: function (value) {
			return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
		},
		readJson: function (key, fallback) {
			try {
				var value = window.localStorage.getItem(key);
				return value ? JSON.parse(value) : fallback;
			} catch (error) {
				return fallback;
			}
		},
		writeJson: function (key, value) {
			window.localStorage.setItem(key, JSON.stringify(value));
		}
	};
}(window));
