Matematica.compiler.passes.function_collector = function(ast) {

  function clone(src, toClone) {
    for (var attr in toClone) {
        if (toClone.hasOwnProperty(attr)) delete(toClone[attr]);
    }

    for (var i in src) {
      if(src.hasOwnProperty(i)){
        if (src[i] && typeof src[i] == "object") {
          toClone[i] = clone(src[i]);
        } 
        else{ 
          toClone[i] = src[i];
        }
      }
    } 
  } 

  function collectExp(node){
    collect(node.left);
    collect(node.right);
  } 

  function collectNegExp(node) { 
    collect(node.node);
  }

  function collectMatrix(node) {
    node.elements.forEach(collect);
  }

  function collectVector(node) {
    node.elements.forEach(collect);
  }

  function collectAssignment(node) {
    Matematica.compiler.symtable.register(node.left.name, node.right);  
    collect(node.right);
  }

  function collectFunctionInv(node){
    var fnc = Matematica.compiler.symtable.resolve(node.name);
    if(fnc){
//      node.parameters.map(collect);
        clone(fnc, node);
    }
  }

  function collectProgram(node) {
    node.statements.forEach(collect);
  }

  var collect = Matematica.compiler.buildNodeVisitor({
    Program:                collectProgram, 
    Identifier:             function(){},
    FunctionInvocation:     collectFunctionInv,
    Assignment:             collectAssignment,
    Matrix:                 collectMatrix,
    Vector:                 collectVector, 
    LogicalExpression:      collectExp,
    CompararisonExpression: collectExp,
    AdditiveExpression:     collectExp,
    MultiplicativeExpression:  collectExp,
    NegativeExpression:     collectNegExp,
    ConstantExpression:     function(){}
  });

  collect(ast);
  return ast;
};