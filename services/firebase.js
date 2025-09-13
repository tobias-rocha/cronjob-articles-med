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
db.settings({ ignoreUndefinedProperties: true });

async function saveArticle(article) {
	const ref = db.collection('artigos').doc(article.pmid);
	await ref.set({ ...article, dateColected: admin.firestore.Timestamp.now() });
	return true;
}

async function getArticle(article) {
	const ref = db.collection('artigos').doc(article.pmid);
	const doc = await ref.get();

	return doc.exists;
}

async function sendNotification({ topic, title, body, doi }) {
	try {
		const message = {
			data: {
				priority: "high",
				sound: "default",
				contentAvailable: "true",
				customSentTime: `${Date.now()}`,
				link: doi
					? `https://atualizascience.web.app/articles/${encodeURIComponent(doi)}`
					: "https://atualizascience.web.app/"
			},
			notification: {
				title: title,
				body: body
			},
			webpush: {
				notification: {
					icon: 'https://firebasestorage.googleapis.com/v0/b/atualizascience.firebasestorage.app/o/logo_azul_img.png?alt=media&token=6c43068d-0d86-4404-aadf-0ce44abaf8ca'
				},
				fcmOptions: {
					link: doi
						? `https://atualizascience.web.app/articles/${encodeURIComponent(doi)}`
						: "https://atualizascience.web.app/"
				}
			},
			topic: topic,
			apns: {
				payload: {
					aps: {
						alert: {
							title: title,
							body: body
						},
						contentAvailable: true
					}
				},
			}
		};

		const response = await admin.messaging().send(message);
		console.log("Notificação enviada:", response);
	} catch (err) {
		console.error("Erro ao enviar notificação:", err);
	}
}

module.exports = { db, saveArticle };