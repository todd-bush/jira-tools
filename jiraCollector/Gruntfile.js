module.exports = function(grunt)
{
	grunt.initConfig({
		
		pkg: grunt.file.readJSON('package.json'),
		
		jshint:{
			files: ['gruntfile.js', 'src/*.js'],
			options: {
				maxlen:80,
				quotmark: 'single'
			}
		},

		clean:['tests/coverage/', 'docs/', 'npm-debug.log'],
		
		// unit testing
		mochaTest:{
			unit:{
				options:{
					reporter:'spec'
				},
				src:['tests/api/*.js']
			}
		},


		// start code coverage 
		env: {
			coverage:{
				APP_DIR_FOR_CODE_COVERAGE:'../tests/coverage/instrument/src/'
			}
		},
		instrument:{
			files: 'src/*.js',
			options:{
				lazy:true,
				basePath:'tests/coverage/instrument/'
			}
		},
		storeCoverage:{
			options:{
				dir:'tests/coverage/reports'
			}
		},
		makeReport:{
			src:'tests/coverage/reports/**/*.json',
			options:{
				type:['lcov','html'],
				dir:'tests/coverage/reports',
				print:'detail'
			}
		},
		execute: {
			target:{
				src:['src/collector.js']
			}
		},
		docco:{
			debug:{
				src:['src/**/*.js'],
				options:{output:'docs/'}
			}
		},
		'node-inspector':{
			dev:{}
		}
	});

	// load all grunt plugins
	for(var key in grunt.config.data.pkg.devDependencies)
	{
		if(key !== 'grunt' && key.indexOf('grunt') === 0) {
			grunt.loadNpmTasks(key);
		}
	}

	grunt.registerTask('default', ['clean','jshint', 'mochaTest:unit']);
	grunt.registerTask('test', ['clean','mochaTest:unit']);
	grunt.registerTask('coverage', ['clean', 'jshint',
		'env:coverage', 'instrument',
		'mochaTest:unit', 'storeCoverage', 'makeReport']);
	grunt.registerTask('run', ['execute']);
	grunt.registerTask('docs', ['docco']);
	grunt.registerTask('debug', ['node-inspector']);


 };
