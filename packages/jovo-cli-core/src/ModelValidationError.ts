
/**
 * Special error class to display users additional information to easier
 * fix issue in model
 *
 * @export
 * @class ModelValidationError
 * @extends {Error}
 */
export class ModelValidationError extends Error {
	locale: string;
	path: string | undefined;

	constructor(message: string, locale: string, path: string | undefined) {
		super(message);
		this.path = path;
		this.locale = locale;
	}

	show() {
		console.error(`\n\nModel file for locale "${this.locale}" is not valid!`);
		console.error(`***********************************************`);
		console.error(`Error: "${this.message}"`);
		console.error(`at location: "${this.path}"`);
		console.error('');
	}
}
