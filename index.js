require('dotenv').config();
const { fetchPubMedArticles } = require('./sources/pubmed');
const { generateSummary } = require('./services/gpt');
const { saveArticle } = require('./services/firebase');
const {extractArticleText} = require("./services/extractArticle");
const {gptClassifier} = require("./services/gptClassifier");

async function main() {
	const fontes = [
		fetchPubMedArticles,
	];

	for (const fetchFunc of fontes) {
		const artigos = await fetchFunc();

		if (artigos) {
			for (const artigo of artigos) {
				if (artigo.abstractFull) {
					let fullText = '';

					let classifier = await gptClassifier(artigo.abstractFull);

					if (classifier) {
						artigo.applicableAreas = classifier.areas_aplicaveis;

						if (artigo.doi) {
							fullText = await extractArticleText(artigo.doi);
						}

						artigo.resumo_gpt = await generateSummary(artigo.abstractFull, fullText);
						const saved = await saveArticle(artigo);
						console.log(saved ? `Salvo: ${artigo.title}` : `Já existe: ${artigo.title}`);
					}
				}
			}
		}
	}

	console.log('Concluído');
}

main().catch(console.error);
