Matematica.compiler = {

  passNames: [
    'function_collector.js',
    'simplifier'/*,
    'interpreter'*/
  ],

  compile: function(ast, options) {
    var me = this;

    me.passNames.forEach(function(passName) {
      me.passes[passName](ast, options);
    });

    return ast;
  },

  buildNodeVisitor: function(functions) {
    return function(node) {
        return functions[node.type].apply(null, arguments);
    };
  }
};
// @include "compiler/symtable.js"
// @include "compiler/passes.js"