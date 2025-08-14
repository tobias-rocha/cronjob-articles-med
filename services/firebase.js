const admin = require('firebase-admin');

if (!admin.apps.length) {
	admin.initializeApp({
		credential: admin.credential.cert({
			type: process.env.FIREBASE_TYPE,
			project_id: process.env.FIREBASE_PROJECT_ID,
			private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
			client_email: process.env.FIREBASE_CLIENT_EMAIL,
			client_id: process.env.FIREBASE_CLIENT_ID,
			auth_uri: process.env.FIREBASE_AUTH_URI,
			token_uri: process.env.FIREBASE_TOKEN_URI,
			auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
			client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
		})
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