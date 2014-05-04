// ==UserScript==
// @name        YouTube Randomizer Debugger
// @description Debug the YouTube Randomizer
// @namespace   dnsev
// @version     1.0
// @run-at      document-start
// @include     http://dnsev.github.io/ytr/*
// @include     https://dnsev.github.io/ytr/*
// ==/UserScript==



(function () {
	"use strict";



	// Replace script
	window.addEventListener("beforescriptexecute", function (event) {
		if (event.target && event.target.getAttribute("src") == "script.js") {
			// New
			var n = document.createElement("script");
			n.innerHTML = "(" + new_source.toString() + ")();";
			document.head.appendChild(n);
			document.head.removeChild(n);

			// Stop
			event.preventDefault();
			event.stopPropagation();
			return false;
		}
	});

	// Replacement
	var new_source = function () {
		// Put whatever here
	};

})();


