var toStr = require('./compiler/passes/stringifier');

var	passes = [
	require('./compiler/passes/simplifier'),
	require('./compiler/passes/function_collector'),
	require('./compiler/passes/interpreter')		
];
	
module.exports = {
	
	compile : function (ast, options) {
		var me = this;

		passes.forEach(function (pass) {
			pass(ast, options);
		});

		return toStr(ast);
	},
};
