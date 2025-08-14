const axios = require('axios');
const xml2js = require('xml2js');

async function fetchPubMedArticles(term = 'diabetes', retmax = 5) {
	const apiKey = process.env.PUBMED_API_KEY;

	const esearchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi`;
	const searchResp = await axios.get(esearchUrl, {
		params: { db: 'pubmed', term, retmode: 'json', retmax, api_key: apiKey }
	});

	const ids = searchResp.data.esearchresult.idlist;
	if (!ids.length) return [];

	const efetchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi`;
	const fetchResp = await axios.get(efetchUrl, {
		params: { db: 'pubmed', id: ids.join(','), retmode: 'xml', api_key: apiKey }
	});

	const parsed = await xml2js.parseStringPromise(fetchResp.data);
	return parsed.PubmedArticleSet.PubmedArticle.map(a => {
		const article = a.MedlineCitation[0].Article[0];

		let pubDateObj = article.Journal?.[0]?.JournalIssue?.[0]?.PubDate?.[0] || {};
		let pubDateFormatted = null;

		if (pubDateObj.MedlineDate) {
			pubDateFormatted = pubDateObj.MedlineDate[0];
		} else {
			const year = pubDateObj.Year?.[0] || '';
			const month = pubDateObj.Month?.[0] || '';
			const day = pubDateObj.Day?.[0] || '';
			pubDateFormatted = [year, month, day].filter(Boolean).join(' ');
		}

		return {
			pmid: a.MedlineCitation[0].PMID[0]._,
			titulo: article.ArticleTitle?.[0] || '',
			autores: article.AuthorList
				? article.AuthorList[0].Author.map(u => ({
					lastName: u.LastName?.[0] || '',
					foreName: u.ForeName?.[0] || '',
					initials: u.Initials?.[0] || ''
				}))
				: [],
			journal: article.Journal?.[0]?.Title?.[0] || '',
			date: pubDateFormatted,
			abstractSections: article.Abstract
				? article.Abstract[0].AbstractText.map(sec => ({
					label: sec.$?.Label || null,
					category: sec.$?.NlmCategory || null,
					text: sec._
				}))
				: [],
			abstractFull: article.Abstract
				? article.Abstract[0].AbstractText.map(sec => sec._).join(' ')
				: '',
			link: `https://pubmed.ncbi.nlm.nih.gov/${a.MedlineCitation[0].PMID[0]._}/`,
			doi: article.ELocationID
				? article.ELocationID.find(id => id.$.EIdType === 'doi')?._ || null
				: null,
			keywords: article.KeywordList
				? article.KeywordList.flatMap(list => list.Keyword.map(k => k._))
				: [],
			language: article.Language?.[0] || null,
			publicationType: article.PublicationTypeList
				? article.PublicationTypeList[0].PublicationType.map(pt => pt._)
				: [],
		}
	});
}

module.exports = { fetchPubMedArticles };
