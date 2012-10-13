String.prototype.supplant = function (o) {
    return this.replace(/{([^}]*)}/g,
        function (a, b) {
            var r = o[b];
            return typeof r === 'string' || typeof r === 'number' ? r : a;
        }
    );
};

Matematica.compiler.passes.stringifier = function(ast) {

  function stringifyExp(node){
    return '({left}) {op} ({right})'.supplant({
      op: node.operator,
      left: stringify(node.left),
      right: stringify(node.right)
    });
  } 

  function stringifyNumber(node) { 
    return node.value; 
  }

  function stringifyNegExp(node) { 
    return '(-{expr})'.supplant({
      expr: stringify(node.node)
    }); 
  }

  function stringifyMatrix(node) {
    return '[{e}]'.supplant({
      e:node.elements.map( stringify ).join('; ')
    });
  }

  function stringifyVector(node) {
    return node.elements.map( stringify ).join(' ');
  }

  function resolveAssignment(node) {
    functions[node.name] = node.right;  
    resolve(node.right);
  }

  function stringifyFunctionInv(node){
    return '{name}( {parameters} )'.supplant({
      name: node.name,
      parameters: node.parameters.map(stringify).join(', ')  
    });
  }

  var resolver = Matematica.compiler.buildNodeVisitor({
    Identifier:             function(node){ return node.name; },
    FunctionInvocation:     nop,
    Assignment:             resolveAssignment,
    Matrix:                 nop,
    Vector:                 nop, 
    LogicalExpression:      nop,
    CompararisonExpression: nop,
    AdditiveExpression:     nop,
    MultiplicativeExpression:  nop,
    NegativeExpression:     nop,
    ConstantExpression:     nop
  });

  return stringify(ast);
};