require('dotenv').config();
const { fetchPubMedArticles } = require('./sources/pubmed');
const { generateSummary } = require('./services/gpt');
const { saveArticle, getRemoteConfig } = require('./services/firebase');

async function main() {
	const config = await getRemoteConfig();
	const queries = config.queries;

	const fontes = [
		fetchPubMedArticles,
	];

	for (const fetchFunc of fontes) {
		for (const q of queries) {
			const artigos = await fetchFunc(q.term, q.limit);
			for (const artigo of artigos) {
				// artigo.resumo_gpt = await generateSummary(artigo.abstractSections);
				const saved = await saveArticle(artigo);
				console.log(saved ? `Salvo: ${artigo.titulo}` : `Já existe: ${artigo.titulo}`);
			}
		}
	}

	console.log('Concluído');
}

main().catch(console.error);
