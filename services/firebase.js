const admin = require('firebase-admin');

if (!admin.apps.length) {
	admin.initializeApp({
		credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_KEY))
	});
}

const db = admin.firestore();
const remoteConfig = admin.remoteConfig();

async function saveArticle(article) {
	const ref = db.collection('artigos').doc(article.pmid);
	const doc = await ref.get();
	if (doc.exists) return false;
	await ref.set({ ...article, data_coleta: admin.firestore.Timestamp.now() });
	return true;
}

async function getRemoteConfig() {
	try {
		const template = await remoteConfig.getTemplate();
		const queriesParam = template.parameters.queries.defaultValue
			? JSON.parse(template.parameters.queries.defaultValue.value)
			: [];
		return { queries: queriesParam };
	} catch (err) {
		console.error('Erro ao buscar Remote Config:', err);
		return { queries: [] };
	}
}

module.exports = { db, saveArticle, getRemoteConfig };