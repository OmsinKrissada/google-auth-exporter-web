import { Buffer } from 'buffer';
import protobuf from 'protobufjs';
import { base32 } from './edbase32';
import QRCode from 'qrcode';
import { promisify } from 'es6-promisify';


/**
 * Google Authenticator uses protobuff to encode the 2fa data.
 */
export async function decodeProtobuf(payload: Uint8Array) {
	const loadAsync = promisify<protobuf.Root, string | string[]>(protobuf.load);
	console.log('gonna load async');
	const root = await loadAsync("./google_auth.proto");
	console.log(root);
	const MigrationPayload = root.lookupType("googleauth.MigrationPayload");

	const message = MigrationPayload.decode(payload);

	return MigrationPayload.toObject(message, {
		longs: String,
		enums: String,
		bytes: String,
	});
}


/**
 * Convert a base64 to base32.
 * Most Time based One Time Password (TOTP)
 * password managers use this as the "secret key" when generating a code.
 *
 * An example is: https://totp.danhersam.com/.
 *
 * @returns RFC3548 compliant base32 string
 */
export function toBase32(base64String: string): string {
	const raw = Buffer.from(base64String, "base64");
	return base32.encode(raw);
}

export type Account = {
	secret: string,
	name: string,
	issuer: string,
	algorithm: string,
	digits: number,
	type: string,
	totpSecret: string;
	counter: number;
};

/**
 * The data in the URI from Google Authenticator
 *  is a protobuff payload which is Base64 encoded and then URI encoded.
 * This export function decodes those, and then decodes the protobuf data contained inside.
 *
 * @param data the `data` query parameter from the totp migration string that google authenticator outputs.
 */
export async function decode(data: string): Promise<Account[]> {
	const buffer = Buffer.from(decodeURIComponent(data), "base64");

	console.log('decoding protobuf');
	const payload = await decodeProtobuf(buffer);
	console.log('decoded protobuf');

	const accounts = payload.otpParameters.map((account: any) => {
		account.totpSecret = toBase32(account.secret);
		return account;
	});

	return accounts;
}

/**
 * Write the json with account information to a file
 * so it can be uploaded to other password managers etc easily.
 *
 * @param data A `JSON.stringify`ed list of accounts.
 */
// export function saveToFile(filename:string, data: string) {
// 	const fs = require("fs");
// 	if (fs.existsSync(filename)) {
// 		return console.error(`File "${filename}" exists!`);
// 	}

// 	fs.writeFileSync(filename, data);
// }

/**
 * Generate qrcodes from the accounts that can be scanned with an authenticator app
 * @param accounts A list of the auth accounts
 */
export function saveToQRCodes(accounts: any) {

	accounts.forEach((account: any) => {
		const name = account.name || "";
		const issuer = account.issuer || "";
		const secret = account.totpSecret;

		const url = `otpauth://totp/${encodeURI(name)}?secret=${encodeURI(secret)}&issuer=${encodeURI(issuer)}`;

		QRCode.toDataURL(url, (error) => {
			if (error != null) {
				console.log(`Something went wrong while creating image`, error);
			}
		});

	});
}

/**
 * Saves to json if the user said yes.
 * @param promptResult The results from the promt given to the user.
 * @param accounts A list of the auth accounts.
 */
// export function toJson(filename, saveToFileInput, accounts) {
// 	console.log(filename);
// 	console.log(saveToFileInput);

// 	if (saveToFileInput && filename) {
// 		console.log(`Saving to "${filename}"...`);
// 		saveToFile(filename, JSON.stringify(accounts, undefined, 4));
// 	} else {
// 		console.log("Not saving. Here is the data:");
// 		console.log(accounts);
// 		console.log("What you want to use as secret key in other password managers is ".yellow + "'totpSecret'".blue + ", not 'secret'!".yellow);
// 	}
// }