const gulp = require('gulp');
const fs = require('fs');
const path = require('path');
const TJS = require('typescript-json-schema');

const { promisify } = require('util');
const writeFileAsync = promisify(fs.writeFile);


async function createValidators(validators) {
	const settings = {
		required: true
	};

	const compilerOptions = {
		strictNullChecks: true
	}

	let program, schema;
	validators.forEach(async (fileData) => {
		program = TJS.getProgramFromFiles([path.resolve(fileData.path)], compilerOptions);
		fileData.types.forEach(async (typeName) => {
			schema = TJS.generateSchema(program, typeName, settings);
			await writeFileAsync(path.join('validators', typeName + '.json'), JSON.stringify(schema, null, '\t'));
		});
	});
}


gulp.task('build', async function () {
	const validators = [
		{
			path: 'src/Interfaces',
			types: [
				'JovoModelAlexa'
			]
		}
	];

	await createValidators(validators);
});


gulp.task('default', ['build']);
