require('dotenv').config();
const { fetchPubMedArticles } = require('./sources/pubmed');
const { generateSummary } = require('./services/gpt');
const { saveArticle } = require('./services/firebase');

async function main() {
	const fontes = [
		fetchPubMedArticles,
	];

	for (const fetchFunc of fontes) {
		const artigos = await fetchFunc();

		if (artigos) {
			for (const artigo of artigos) {
				const wordCount = artigo.abstractFull.trim().split(/\s+/).length;

				if (wordCount >= 150) {
					const resumo = await generateSummary(artigo.abstractFull);

					try {
						artigo.resumo_gpt = typeof resumo === 'string' ? JSON.parse(resumo) : resumo;
					} catch (e) {
						console.log(`Erro ao parsear resumo de ${artigo.title}`, e);
						artigo.resumo_gpt = { error: "Resumo inválido", raw: resumo };
					}

					const saved = await saveArticle(artigo);
					console.log(saved ? `Salvo: ${artigo.title}` : `Já existe: ${artigo.title}`);
				} else {
					console.log(`Resumo ignorado (poucas palavras): ${artigo.title} (${wordCount} palavras)`);
				}
			}
		}
	}

	console.log('Concluído');
}

main().catch(console.error);
