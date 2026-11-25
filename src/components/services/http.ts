// SPDX-License-Identifier: MPL-2.0
// Copyright (c) Imperium42®, LLC.
// http.ts
import axios, { AxiosRequestConfig, AxiosResponse } from "axios";

// ...........................................................................................
// Log without dumping the AxiosError itself: its config holds query params (e.g. Steam `key`),
// request bodies (e.g. OAuth client secrets) and headers.
const logHttpErr = (_method: string, _uri: string, _err: unknown): void => {
	const safeUri = _uri.split("?")[0];
	if (axios.isAxiosError(_err)) {
		console.error(
			`[http]**ERR @ ${_method} ${safeUri}: ${_err.message} // status==${_err.response?.status}`,
		);
	} else {
		console.error(`[http]**ERR @ ${_method} ${safeUri}: ${_err}`);
	}
};

// ...........................................................................................
const POST = async (
	_uri: string,
	_data: unknown,
	_headers?: Record<string, string>,
): Promise<AxiosResponse | unknown> => {
	try {
		// Required
		if (!_data) {
			_data = {};
		}

		// Optional
		let config: AxiosRequestConfig = {};
		if (_headers) {
			config = { headers: _headers };
		}

		// POST =>
		const postRes = await axios.post(_uri, _data, config);
		return postRes;
	} catch (err: unknown) {
		logHttpErr("POST", _uri, err);
		return err; // NOTE: existing contract: POST returns (not throws) the error
	}
};

// ...........................................................................................
// res.data contains the good stuff
const GET = async (
	_uri: string,
	_innerParams?: Record<string, unknown>,
	_headers?: Record<string, string>,
): Promise<AxiosResponse> => {
	try {
		// Optional
		const opts: AxiosRequestConfig = {};

		if (_innerParams) {
			opts.params = _innerParams;
		}

		if (_headers) {
			opts.headers = _headers;
		}

		// GET =>
		const getRes = await axios.get(_uri, opts);
		return getRes;
	} catch (err: unknown) {
		logHttpErr("GET", _uri, err);
		throw err; // rethrow the original (keeps .response/.status for callers)
	}
};

export { GET, POST };
