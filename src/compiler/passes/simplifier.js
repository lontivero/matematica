
Matematica.compiler.passes.simplifier = function(ast) {

  function isConstantExpression(node){
    return node.type === 'ConstantExpression'; 
  }

  function simplifyAdditiveExp(node){
    node.left = simplify(node.left);
    node.right= simplify(node.right);

    if(isConstantExpression(node.left) && isConstantExpression(node.right)){
      node.type = 'ConstantExpression';
      node.value= node.operator === '+' ?
          node.left.value + node.right.value:
          node.left.value - node.right.value;
      delete(node.left);
      delete(node.right);
      delete(node.operator);
    }
    return node;
  } 
  function simplifyMultiplicativeExp(node){
    node.left = simplify(node.left);
    node.right= simplify(node.right);

    if(isConstantExpression(node.left) && isConstantExpression(node.right)){
      node.type = 'ConstantExpression';
      node.value= node.operator === '*' ?
          node.left.value * node.right.value:
          node.left.value / node.right.value;
      delete(node.left);
      delete(node.right);
      delete(node.operator);
    }
    return node;
  } 
  function simplifyLogicalExp(node){
    node.left = simplify(node.left);
    node.right= simplify(node.right);

    if(isConstantExpression(node.left) && isConstantExpression(node.right)){
      node.type = 'ConstantExpression';
      node.value= node.operator === '&&' ?
          node.left.value && node.right.value:
          node.left.value || node.right.value;
      delete(node.left);
      delete(node.right);
      delete(node.operator);
    }
    return node;
  } 
  function simplifyCompararisonExp(node){
    var result = null;
    node.left = simplify(node.left);
    node.right= simplify(node.right);

    if(isConstantExpression(node.left) && isConstantExpression(node.right)){
      node.type = 'ConstantExpression';
      switch(node.operator){
        case '==': node.value = node.left.value == node.right.value; break;
        case '!=': node.value = node.left.value != node.right.value; break;
        case '>': node.value = node.left.value > node.right.value; break;
        case '>=': node.value = node.left.value >= node.right.value; break;
        case '<': node.value = node.left.value < node.right.value; break;
        case '<=': node.value = node.left.value <= node.right.value; break;
      }
      delete(node.left);
      delete(node.right);
      delete(node.operator);
    }
    return node;
  } 
  function simplifyNegExp(node) {
    var n = simplify(node.node);
    if(isConstantExpression(n)){
      node.type = 'ConstantExpression';
      node.value= -1 * n.value;
      delete(node.node);
    } 
    return  node;
  }

  function simplifyAssignment(node){
    node.right = simplify(node.right);
    return node;
  } 

  function simplifyMatrix(node) {
    node.elements.forEach( simplify );
    return node;
  }

  function simplifyVector(node) {
     node.elements.forEach( simplify );
     return node;
  }

  function nop(node){
    return node;
  }

  function simplifyConstantExp(node){
    node.value = Number(node.value);
    return node;
  }

  function simplifyFunctionInvocation(node){
    node.parameters.forEach( simplify );
    return node;
  }

  function simplifyProgram(node){
    node.statements.forEach( simplify );
    return node;
  }

  var simplify = Matematica.compiler.buildNodeVisitor({
    Program:                simplifyProgram, 
    Identifier:             nop,
    FunctionInvocation:     simplifyFunctionInvocation,
    Assignment:             simplifyAssignment,
    Matrix:                 simplifyMatrix,
    Vector:                 simplifyVector,
    LogicalExpression:      simplifyLogicalExp,
    CompararisonExpression: simplifyCompararisonExp,
    AdditiveExpression:     simplifyAdditiveExp,
    MultiplicativeExpression:   simplifyMultiplicativeExp,
    NegativeExpression:     simplifyNegExp,
    ConstantExpression:     simplifyConstantExp
  });

  return simplify(ast);
};