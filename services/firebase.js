const admin = require('firebase-admin');
const nodemailer = require("nodemailer");

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

const transporter = nodemailer.createTransport({
	service: "gmail",
	auth: {
		user: "atualizascience@gmail.com",
		pass: "aleynwmqumyxdtgy",
	},
});

async function saveArticle(article) {
	const stopwords = ['de', 'da', 'do', 'das', 'dos', 'em', 'para', 'com', 'no', 'na', 'nos', 'nas', 'e'];

	function normalizeKeyword(str) {
		return str
			.toLowerCase()
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.replace(/\s+/g, '_')
			.replace(/__+/g, '_')
			.replace(/^_|_$/g, '');
	}

	if (article.resumo_gpt && Array.isArray(article.resumo_gpt.palavras_chave)) {
		const novasPalavras = [];

		for (const palavra of article.resumo_gpt.palavras_chave) {
			if (!novasPalavras.includes(palavra)) novasPalavras.push(palavra);

			const partes = palavra.split(/\s+/).filter(p => !stopwords.includes(p.toLowerCase()));

			for (const p of partes) {
				if (!novasPalavras.includes(p)) novasPalavras.push(p);
			}
		}

		article.resumo_gpt.palavras_chave = novasPalavras.map(normalizeKeyword).filter(Boolean);
	}

	const ref = db.collection('artigos').doc(article.pmid);
	await ref.set({ ...article, dateColected: admin.firestore.Timestamp.now() });

	return true;
}

async function getArticle(article) {
	const ref = db.collection('artigos').doc(article.pmid);
	const doc = await ref.get();

	return doc.exists;
}

async function saveUserNotification({userId, pmid, title, body, tipo}) {
	try {
		const userRef = db.collection("usuarios").doc(userId);
		const notificacoesRef = userRef.collection("notificacoes");

		const newNotification = {
			title: title,
			pmid: pmid,
			body: body,
			type: tipo,
			read: false,
			createdAt: admin.firestore.Timestamp.now(),
		};

		await notificacoesRef.add(newNotification);
		console.log("Notificação salva com sucesso!");
	} catch (err) {
		console.error("Erro ao salvar notificação:", err);
	}
}

async function sendNotification({ topic, title, body, pmid }) {
	try {
		const message = {
			data: {
				title: title,
				body: body,
				pmid: pmid || "",
				link: pmid
					? `https://atualizascience.web.app/articles/${encodeURIComponent(pmid)}`
					: "https://atualizascience.web.app/"
			},
			webpush: {
				fcmOptions: {
					link: pmid
						? `https://atualizascience.web.app/articles/${encodeURIComponent(pmid)}`
						: "https://atualizascience.web.app/"
				}
			},
			topic: topic
		};

		const response = await admin.messaging().send(message);
		console.log("Notificação enviada:", response);
	} catch (err) {
		console.log("Erro ao enviar notificação:", err);
	}
}

async function callSendEmail({ to, subject, text, html }) {
	const mailOptions = {
		from: '"Atualiza Science" <atualizascience@gmail.com>',
		to,
		subject,
		text,
		html
	};

	try {
		const info = await transporter.sendMail(mailOptions);
		console.log("Notificação enviada:", info);
	} catch (err) {
		console.log("Erro ao enviar notificação:", err);
	}
}

module.exports = { admin, db, saveArticle, getArticle, saveUserNotification, sendNotification, callSendEmail };