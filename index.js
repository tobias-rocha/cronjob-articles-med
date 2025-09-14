require('dotenv').config();
const { fetchPubMedArticles } = require('./sources/pubmed');
const { generateSummary } = require('./services/gpt');
const { saveArticle, getArticle, sendNotification, callSendEmail, db } = require('./services/firebase');

async function main() {

	function normalizeKeyword(str) {
		return str
			.toLowerCase()
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.replace(/\s+/g, '_')
			.replace(/__+/g, '_')
			.replace(/^_|_$/g, '');
	}

	function generateArticleHTML(article) {
		return `
			<div style="font-family: Arial, sans-serif; line-height: 1.5; color: #333;">
			  <h2 style="color: #1E40AF;">${article.title}</h2>
			  ${article.resumo_gpt.objetivo_do_estudo ? `<p><strong>Objetivo do Estudo:</strong> ${article.resumo_gpt.objetivo_do_estudo}</p>` : ''}
			  ${article.authors ? `<p><strong>Autores:</strong> ${article.authors.join(', ')}</p>` : ''}
			  <p>
				<a href="https://atualizascience.web.app/articles/${encodeURIComponent(article.pmid)}"
				   style="display: inline-block; padding: 10px 15px; background-color: #1E40AF; color: #fff; text-decoration: none; border-radius: 4px;">
				   Ler artigo completo
				</a>
			  </p>
			</div>
		  `;
	}

	const usersSnapshot = await db.collection('usuarios').get();
	const usuarios = usersSnapshot.docs.map(doc => ({
		id: doc.id,
		notificacoes: doc.data().notificacoes
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
				const userKeywords = (usuario.notificacoes.palavras_chave || []).map(normalizeKeyword);

				const match = userKeywords.some(kw => artigoKeywords.includes(kw));
				if (match && artigo.resumo_gpt.relevancia >= usuario.notificacoes.relevancia && usuario.notificacoes.habilitado) {
					const tokensSnap = await db.collection("usuarios")
						.doc(usuario.id)
						.collection("tokens")
						.get();

					const tokens = tokensSnap.docs
						.map(d => d.data().token)
						.filter(Boolean);

					if (tokens.length > 0) {
						for (const token of tokens) {
							await sendNotification(
								token,
								'NOVO ARTIGO',
								artigo.resumo_gpt.titulo_original_traduzido,
								artigo.pmid
							);
						}
					} else {
						const htmlContent = generateArticleHTML(artigo);

						await callSendEmail({
							to: usuario.email,
							subject: `Novo artigo: ${artigo.resumo_gpt.titulo_original_traduzido}`,
							text: `${artigo.resumo_gpt.titulo_original_traduzido}\nLeia mais: https://atualizascience.web.app/articles/${encodeURIComponent(artigo.pmid)}`,
							html: htmlContent
						});
					}
				}
			}
		}
	}

	console.log('Concluído');
}

main().catch(console.error);