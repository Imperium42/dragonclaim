// SPDX-License-Identifier: MPL-2.0
// Copyright (c) Imperium42®, LLC.
interface AxiosErr {
	error: string;
	errDescr?: unknown; // string, or the axios response object (from a caught error)
	errHttpDescr?: string;
	errCode?: string | number; // HTTP status or axios error code
}

export default AxiosErr;
