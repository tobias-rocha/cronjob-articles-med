require('dotenv').config();
const { fetchPubMedArticles } = require('./sources/pubmed');
const { generateSummary } = require('./services/gpt');
const { saveArticle, getArticle, sendNotification, callSendEmail, db, saveUserNotification} = require('./services/firebase');

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

	function relevanceMatches(userLevel, articleValue) {
		if (!userLevel) return true;

		if (userLevel === "baixa") return articleValue >= 1 && articleValue <= 3;
		if (userLevel === "media") return articleValue >= 4 && articleValue <= 6;
		if (userLevel === "alta") return articleValue >= 7 && articleValue <= 10;

		return false;
	}

	function generateArticleHTML(article) {
		return `
			<div style="font-family: Arial, sans-serif; line-height: 1.5; color: #333;">
			  <h2 style="color: #1E40AF;">${article.resumo_gpt.titulo_original_traduzido}</h2>
			  ${article.resumo_gpt.objetivo_do_estudo ? `<p><strong>Objetivo do Estudo:</strong> ${article.resumo_gpt.objetivo_do_estudo}</p>` : ''}
			  ${article.authors && article.authors.length ? `<p><strong>Autores:</strong> ${article.authors.map(a => `${a.foreName} ${a.lastName}`).join(', ')}</p>` : ''}
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
		nome: doc.data().nome,
		email: doc.data().email,
		ios: doc.data().ios,
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

			const resumo = await generateSummary(artigo.abstractFull);
			try {
				artigo.resumo_gpt = typeof resumo === 'string' ? JSON.parse(resumo) : resumo;
			} catch (e) {
				console.log(resumo);
				console.log(`Erro ao parsear resumo de ${artigo.title}`, e);
				continue;
			}

			if (artigo.resumo_gpt.relevancia && artigo.resumo_gpt.relevancia.toLowerCase() === "não") {
				console.log(`⚠️ Ignorado (não relevante): ${artigo.title}`);
				continue;
			}

			await saveArticle(artigo);
			console.log(`Salvo: ${artigo.title}`);

			const artigoKeywords = (artigo.resumo_gpt.palavras_chave || []).map(normalizeKeyword);

			for (const usuario of usuarios) {
				const userKeywords = (usuario.notificacoes.palavras_chave || []).map(normalizeKeyword);

				const match = userKeywords.some(kw => artigoKeywords.includes(kw));
				const relevanciaOk = relevanceMatches(
					usuario.notificacoes.relevancia,
					parseInt(artigo.resumo_gpt?.nivel_de_evidencia_e_limitacoes?.nota_nivel_de_evidencia ?? 0)
				);

				if (match && relevanciaOk && usuario.notificacoes.habilitado) {
					if (!usuario.ios) {
						await sendNotification({
							topic: 'usuario_'+usuario.id,
							title: 'NOVO ARTIGO',
							body: artigo.resumo_gpt.titulo_original_traduzido,
							pmid: artigo.pmid,
							nome: usuario.nome
						});

						await saveUserNotification({
							userId: usuario.id,
							pmid: artigo.pmid,
							title: 'NOVO ARTIGO',
							body: artigo.resumo_gpt.titulo_original_traduzido,
							tipo: 'push'
						});
					} else {
						const htmlContent = generateArticleHTML(artigo);

						await callSendEmail({
							to: usuario.email,
							subject: `Novo artigo: ${artigo.resumo_gpt.titulo_original_traduzido}`,
							text: `${artigo.resumo_gpt.titulo_original_traduzido}\nLeia mais: https://atualizascience.web.app/articles/${encodeURIComponent(artigo.pmid)}`,
							html: htmlContent,
							nome: usuario.nome
						});

						await saveUserNotification({
							userId: usuario.id,
							pmid: artigo.pmid,
							title: 'NOVO ARTIGO',
							body: artigo.resumo_gpt.titulo_original_traduzido,
							tipo: 'email'
						});
					}
				}
			}
		}
	}

	console.log('Concluído');
}

main().catch(console.error);