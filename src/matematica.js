var Matematica = (function() {

	var Matematica = {
		VERSION: "@VERSION",

		buildParser: function(code, options) {
			var ast = Matematica.parser.parse(code),
				xxx = Matematica.compiler.compile(ast, options);
		}
	};

	// @include "commons.js"
	// @include "parser.js"
	// @include "compiler.js"

	return Matematica;

})();

if (typeof module !== "undefined") {
  module.exports = Matematica;
}	
