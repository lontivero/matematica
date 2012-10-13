
Matematica.compiler.passes.interpreter = function(ast) {

  var symbols = {};

  function evaluateAdditiveExp(node){
    return node.operator === '+' ? 
      evaluate(node.left) + evaluate(node.right) :
      evaluate(node.left) - evaluate(node.right) ;      
  } 
  function evaluateMultiplicativeExp(node){
    return node.operator === '*' ? 
      evaluate(node.left) * evaluate(node.right) :
      evaluate(node.left) / evaluate(node.right) ;      
  } 
  function evaluateLogicalExp(node){
    return node.operator === '&&' ? 
      evaluate(node.left) && evaluate(node.right) :
      evaluate(node.left) || evaluate(node.right) ;      
  } 
  function evaluateCompararisonExp(node){
    var result = null;
    switch(node.operator){
      case '==': result = evaluate(node.left) == evaluate(node.right); break;
      case '!=': result = evaluate(node.left) != evaluate(node.right); break;
      case '>': result = evaluate(node.left) > evaluate(node.right); break;
      case '>=': result = evaluate(node.left) >= evaluate(node.right); break;
      case '<': result = evaluate(node.left) < evaluate(node.right); break;
      case '<=': result = evaluate(node.left) <= evaluate(node.right); break;
    }
    return result;      
  } 
  function evaluateNegExp(node) { 
    return  -1 * evaluate(node.node);
  }
  function evaluateNumber(node) { 
    return node.value; 
  }
  function evaluateMatrix(node) {
    return node.elements.map( evaluate );
  }
  function evaluateVector(node) {
    return node.elements.map( evaluate );
  }
  function evaluateAssignment(node) {
    symbols[node.left.name] = node.right;
  }
  function evaluateFunctionInv(node){
    if(symbols.hasOwnProperty(node.name)){
      return evaluate(symbols[node.name]);
    }
    throw node.name + ' was not defined';    
  }
  function evaluateProgram(node) {
    return node.statements.map( evaluate );
  }


  var evaluate = Matematica.compiler.buildNodeVisitor({
    Program:                evaluateProgram, 
    Identifier:             function(node){ return node.name; },
    FunctionInvocation:     evaluateFunctionInv,
    Assignment:             evaluateAssignment,
    Matrix:                 evaluateMatrix,
    Vector:                 evaluateVector, 
    LogicalExpression:      evaluateLogicalExp,
    CompararisonExpression: evaluateCompararisonExp,
    AdditiveExpression:     evaluateAdditiveExp,
    MultiplicativeExpression:  evaluateMultiplicativeExp,
    NegativeExpression:     evaluateNegExp,
    ConstantExpression:     evaluateNumber
  });

  return evaluate(ast);
};