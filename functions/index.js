const express = require('express');

const Fastboot = require('fastboot');

const { https } = require('firebase-functions');

const { existsSync, readFileSync }  = require('fs');

const app = express();

const errorResponse = (res, error, tag) => {
	let errorString = error && error.toString && error.toString();
	errorString = tag ? `[${tag}] ${errorString}` : errorString;

	console.error(error);

	return !res.headersSent
		&& res.status(500).send(errorString);
}

const success = (result, res) => {
	result.html().then((html) => {
		let { headers } = result;

		Array.from(headers.entries())
			.forEach(([key, value]) => res.set(key, value));

		if (result.error) {
			return failure(result.error, res);
		}

		res.set('Cache-Control', 'public, max-age=300, s-maxage=600');
		res.status(result.statusCode).send(html);
	});
};

const failure = (error, res) => {
	console.error('[FastBoot Failure]', error);
	errorResponse(res, error, 'FastBoot Failure');
};

const initializeApplication = (fastBoot) => {
	app.get('*', (request, response) => {
		let { url, path } = request;

		console.info('SSR Request Path:', path);

		return fastBoot.visit(path, {
			request,
			response
		}).then(
			(result) => success(result, response),
			(error) => failure(error, response)
		);
	});

	return app;
};

const initializeFastBoot = (distPath = `${process.cwd()}/dist`) => {
	const fastBoot = new Fastboot({
		distPath,
		resilient: false,
		disableShoebox: false,
		destroyAppInstanceInMs: '60000'
	});

	return { fastBoot };
};


const ssr = (distPath) =>  {
		let { fastBoot } = initializeFastBoot(distPath);

		let app = initializeApplication(fastBoot);

		return https.onRequest(app);

	
};

module.exports.ssr = ssr();