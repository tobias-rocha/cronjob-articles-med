require('dotenv').config();
const { fetchPubMedArticles } = require('./sources/pubmed');
const { generateSummary } = require('./services/gpt');
const { saveArticle, getArticle, sendNotification, db } = require('./services/firebase');

async function main() {

	// Função de normalização
	function normalizeKeyword(str) {
		return str
			.toLowerCase()
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.replace(/\s+/g, '_')
			.replace(/\b(e|de|do|da|dos|das|em|com|para|no|na|nos|nas)\b/g, '')
			.replace(/__+/g, '_')
			.replace(/^_|_$/g, '');
	}

	// 1. Buscar todos os usuários
	const usersSnapshot = await db.collection('usuarios').get();
	const usuarios = usersSnapshot.docs.map(doc => ({
		id: doc.id,
		palavras_chave: doc.data().palavras_chave || []
	}));

	const fontes = [fetchPubMedArticles];

	for (const fetchFunc of fontes) {
		const artigos = await fetchFunc();

		if (!artigos) continue;

		for (const artigo of artigos) {
			const wordCount = artigo.abstractFull.trim().split(/\s+/).length;

			if (wordCount < 150) {
				console.log(`Resumo ignorado (poucas palavras): ${artigo.title} (${wordCount} palavras), Link: ${artigo.link}`);
				continue;
			}

			const ja_existe = await getArticle(artigo);
			if (ja_existe) {
				console.log(`Já existe: ${artigo.title}`);
				continue;
			}

			const resumo = await generateSummary(artigo.abstractFull);
			try {
				artigo.resumo_gpt = typeof resumo === 'string' ? JSON.parse(resumo) : resumo;
			} catch (e) {
				console.log(`Erro ao parsear resumo de ${artigo.title}`, e);
				continue;
			}

			await saveArticle(artigo);
			console.log(`Salvo: ${artigo.title}`);

			const artigoKeywords = (artigo.resumo_gpt.palavras_chave || []).map(normalizeKeyword);

			for (const usuario of usuarios) {
				const userKeywords = (usuario.palavras_chave || []).map(normalizeKeyword);

				const match = userKeywords.some(kw => artigoKeywords.includes(kw));
				if (match) {
					const topic = `usuario_${usuario.uid}`;
					await sendNotification(
						topic,
						'NOVO ARTIGO',
						artigo.resumo_gpt.titulo_original_traduzido,
						artigo.pmid
					);
				}
			}
		}
	}

	console.log('Concluído');
}

main().catch(console.error);