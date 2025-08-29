const axios = require("axios");
const { JSDOM, VirtualConsole } = require("jsdom");
const { Readability } = require("@mozilla/readability");

async function extractArticleText(doi) {
	try {
		const response = await axios.get(doi, {
			maxRedirects: 5,
			headers: { "User-Agent": "Mozilla/5.0", Accept: "text/html" }
		});

		const virtualConsole = new VirtualConsole();
		virtualConsole.on("jsdomError", () => {});

		const dom = new JSDOM(response.data, {
			url: response.request.res.responseUrl,
			pretendToBeVisual: false,
			virtualConsole
		});

		const document = dom.window.document;

		const paywallIndicators = [
			"Buy this article",
			"Buy article",
			"Log in via an institution",
			"Purchase",
			"Rent this article",
			"Preview of subscription content",
			"Access options",
			"Subscribe to journal"
		];
		const bodyText = document.body.textContent || "";
		if (paywallIndicators.some(ind => bodyText.includes(ind))) {
			return null;
		}

		const reader = new Readability(document);
		const article = reader.parse();

		if (!article || !article.textContent) return null;

		let text = article.textContent.replace(/\n+/g, "\n").trim();

		text = text.replace(/\/\/<!\[CDATA\[[\s\S]*?\/\/\]\]>/g, "");

		const startMarkers = [
			"Introduction", "1. Introduction", "Abstract:", "Abstract"
		];
		let startIndex = 0;
		for (const marker of startMarkers) {
			const idx = text.indexOf(marker);
			if (idx !== -1) {
				startIndex = idx;
				break;
			}
		}

		const endMarkers = [
			"Bibliography", "Acknowledgments",
			"Conflict of Interest", "Data availability",
		];
		let endIndex = text.length;
		for (const marker of endMarkers) {
			const idx = text.indexOf(marker, startIndex);
			if (idx !== -1) {
				endIndex = idx;
				break;
			}
		}

		text = text.substring(startIndex, endIndex).trim();
		text = text.replace(/\n{2,}/g, "\n\n");

		if (text.length < 500) return null;

		return text;

	} catch (err) {
		return null;
	}
}

module.exports = { extractArticleText };