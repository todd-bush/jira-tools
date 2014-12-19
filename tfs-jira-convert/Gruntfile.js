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
		simplemocha:{
			options:{
				globals:['expect'],
				timeout:3000,
				ignoreLeaks:false,
				ui:'bdd',
				grep: '*-test',
				reporter:'tap'
			},
			all: {src:['tests/**/*.js']}
		},
		
		execute: {
			target:{
				src:['src/tfs-jira-converter.js']
			}
		}
	});

	for(var key in grunt.file.readJSON('package.json').devDependencies)
	{
		if(key !== 'grunt' && key.indexOf('grunt') === 0) {
			grunt.loadNpmTasks(key);
		}
	}

	grunt.registerTask('default', ['jshint', 'simplemocha']);
	grunt.registerTask('run', ['execute']);
 };
