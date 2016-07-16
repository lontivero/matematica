var	parser = require('./parser'),
	compiler = require('./compiler');
	
module.exports = {
	VERSION: "@VERSION",

	run: function(code, options) {
		var ast = parser.parse(code),
			ast = compiler.compile(ast, options);
		return ast;
	}
};
