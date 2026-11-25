// SPDX-License-Identifier: MPL-2.0
// Copyright (c) Imperium42®, LLC.
export default interface DiscordUser {
	id: string;
	username: string;
	discriminator: string;
	avatar?: string;
	email?: string;
	flags: number;
	locale: string;
	mfa_enabled: boolean;
	public_flags: number;
}
