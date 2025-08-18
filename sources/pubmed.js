const axios = require('axios');
const xml2js = require('xml2js');
const {db} = require("../services/firebase");

async function fetchPubMedArticles(date = null) {
	const apiKey = process.env.PUBMED_API_KEY;

	const today = new Date();
	const yyyy = today.getFullYear();
	const mm = String(today.getMonth() + 1).padStart(2, '0');
	const dd = String(today.getDate()).padStart(2, '0');
	const todayStr = date ? date : `${yyyy}/${mm}/${dd}`;

	let allArticles = [];
	let retstart = 0;
	const retmax = 10000;

	const esearchResp = await axios.get('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi', {
		params: {
			db: 'pubmed',
			retmode: 'json',
			retstart,
			retmax,
			mindate: todayStr,
			maxdate: todayStr,
			datetype: 'pdat',
			api_key: apiKey
		}
	});

	let ids = esearchResp.data.esearchresult.idlist;

	const snapshot = await db.collection('artigos').get();
	const savedIds = snapshot.docs.map(doc => doc.data().pmid);

	ids = ids.filter(id => !savedIds.includes(id));

	const batchSize = 300;
	for (let i = 0; i < ids.length; i += batchSize) {
		const batchIds = ids.slice(i, i + batchSize).join(',');

		const efetchResp = await axios.post(
			'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi',
			new URLSearchParams({
				db: 'pubmed',
				id: batchIds,
				retmode: 'xml',
				api_key: apiKey
			}),
			{
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded'
				}
			}
		);

		const parsed = await xml2js.parseStringPromise(efetchResp.data);

		parsed.PubmedArticleSet.PubmedArticle.forEach(a => {
			const article = a.MedlineCitation[0].Article[0];

			let pubDateObj = article.Journal?.[0]?.JournalIssue?.[0]?.PubDate?.[0] || {};
			let pubDateFormatted = pubDateObj.MedlineDate
				? pubDateObj.MedlineDate[0]
				: [pubDateObj.Year?.[0], pubDateObj.Month?.[0], pubDateObj.Day?.[0]].filter(Boolean).join(' ');

			const meshTerms = a.MedlineCitation[0].MeshHeadingList
				? a.MedlineCitation[0].MeshHeadingList[0].MeshHeading.map(mh => mh.DescriptorName[0]._)
				: [];

			const abstractSections = article.Abstract
				? article.Abstract[0].AbstractText.map(sec => ({
					label: sec.$?.Label || null,
					category: sec.$?.NlmCategory || null,
					text: sec._ || ''
				}))
				: [];

			const keywords = a.MedlineCitation[0].KeywordList
				? a.MedlineCitation[0].KeywordList.flatMap(list => list.Keyword.map(k => k._))
				: [];

			let title = article.ArticleTitle?.[0]._;
			if (!title) {
				title = article.ArticleTitle?.[0] || '';
			}

			allArticles.push({
				pmid: a.MedlineCitation[0].PMID[0]._,
				title,
				authors: article.AuthorList
					? article.AuthorList[0].Author.map(u => ({
						lastName: u.LastName?.[0] || '',
						foreName: u.ForeName?.[0] || '',
						initials: u.Initials?.[0] || ''
					}))
					: [],
				journal: article.Journal?.[0]?.Title?.[0] || '',
				medlineJournalInfo: a.MedlineCitation[0].MedlineJournalInfo?.[0] || '',
				date: pubDateFormatted,
				abstractSections,
				abstractFull: abstractSections.map(sec => sec.text).join(' '),
				link: `https://pubmed.ncbi.nlm.nih.gov/${a.MedlineCitation[0].PMID[0]._}/`,
				doi: article.ELocationID?.find(id => id.$.EIdType === 'doi')?._
					? `https://doi.org/${article.ELocationID.find(id => id.$.EIdType === 'doi')._}`
					: null,
				keywords,
				meshTerms,
				language: article.Language?.[0] || null,
				publicationType: article.PublicationTypeList
					? article.PublicationTypeList[0].PublicationType.map(pt => pt._)
					: []
			});
		});
	}

	return allArticles;
}

module.exports = { fetchPubMedArticles };