(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
module.exports.Matematica.ast = (function(){
    var me = this;
    function expression(type, operator, left, right){
        return {
            type: type,
            operator: operator,
            left: left,
            right: right
        };
    }

    return {
        constant: function (value){
            return { 
                type: 'ConstantExpression',  
                value: value 
            };
        },
        identifier: function (name){
            return { 
                type: 'Identifier',  
                name: name 
            };
        },
        functionInvocation: function (name, params){
            return {
                type: 'FunctionInvocation',
                name:  name,
                parameters: params || []
            };
        },
        assignment: function (left, right){
            return expression('Assignment', '=', left, right);
        },
        additive: function (left, right, operator){
            return expression('AdditiveExpression', operator || '+', left, right);
        },
        multiplicative: function (left, right, operator){
            return expression('MultiplicativeExpression', operator || '*', left, right);
        },
        logical: function (left, right, operator){
            return expression('LogicalExpression', operator || '&&', left, right);
        },
        comparison: function (left, right, operator){
            return expression('CompararisonExpression', operator || '==', left, right);
        },
        negative: function (node){
            return {
                type: 'NegativeExpression',
                node: node
            };
        },
        program: function (node){
            return {
                type: 'Program',
                statements: (node instanceof Array) ? node : [node]
            };
        }
    };
})();
},{}],2:[function(require,module,exports){
var symtable = require('./compiler/symtable'),
	passes = require('./compiler/passes');

	
module.exports.Matematica.compiler = {

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

},{"./compiler/passes":3,"./compiler/symtable":8}],3:[function(require,module,exports){
var function_collector= require('./passes/function_collector'),
	simplifier = require('./passes/simplifier'),
	stringifier= require('./passes/stringifier'),
	interpreter= require('./passes/interpreter')

module.exports.passess = {};

},{"./passes/function_collector":4,"./passes/interpreter":5,"./passes/simplifier":6,"./passes/stringifier":7}],4:[function(require,module,exports){
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
},{}],5:[function(require,module,exports){

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
},{}],6:[function(require,module,exports){

Matematica.compiler.passes.simplifier = function(ast) {

  function isConstantExpression(node){
    return node.type === 'ConstantExpression'; 
  }

  function isAdditiveExpression(node){
    return node.type === 'AdditiveExpression'; 
  }


  function simplifyAdditiveExp(node){
    var p, t;
    node.left = simplify(node.left);
    node.right= simplify(node.right);

    if(isConstantExpression(node.left) || isConstantExpression(node.right)){
      if(isConstantExpression(node.left) && isConstantExpression(node.right)){
        node.type = 'ConstantExpression';
        node.value= node.operator === '+' ?
            node.left.value + node.right.value:
            node.left.value - node.right.value;
        delete(node.left);
        delete(node.right);
        delete(node.operator);
      }else if(isConstantExpression(node.right) && isAdditiveExpression(node.left)) {
        p = node.left;
        if(isConstantExpression(p.left)){
          t = p.left;
          p.left = p.right;
          p.right= t;
        }
        node.left = node.left.left;
        node.right = {
          type: 'AdditiveExpression',
          operator: p.operator,
          left: node.right,
          right: p.right
        };
        node.right = simplify(node.right);

      }else if(isConstantExpression(node.left) && isAdditiveExpression(node.right)) {
        p = node.right;
        if(isConstantExpression(p.right)){
          t = p.left;
          p.left = p.right;
          p.right= t;
        }
        node.right = node.right.right;
        node.left = {
          type: 'AdditiveExpression',
          operator: p.operator,
          left: p.left,
          right: node.left
        };
        node.left = simplify(node.left);
      }
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
},{}],7:[function(require,module,exports){
String.prototype.supplant = function (o) {
    return this.replace(/{([^{}}]*)}/g,
        function (a, b) {
            var r = o[b];
            return typeof r === 'string' || typeof r === 'number' ? r : a;
        }
    );
};

Matematica.compiler.passes.stringifier = function(ast) {
  function isAssociative(node){
    var leftType = node.left.type,
        rightType= node.right.type,
        type  = node.type,
        areSameType = leftType === rightType,
        isScalar = function(t) { return t === 'ConstantExpression' || t === 'FunctionInvocation'; },
        isAdditive = function(t) { return t === 'AdditiveExpression'; };

    return isAdditive(type) && (areSameType || (isScalar(leftType) && isAdditive(rightType)) || (isScalar(rightType) && isAdditive(leftType))); 
  }

  function stringifyExp(node){
    var template = isAssociative(node) ? 
      '{left} {op} {right}' : 
      '({left}) {op} ({right})';

    return template.supplant({
      op: node.operator,
      left: stringify(node.left),
      right: stringify(node.right)
    });
  } 

  function stringifyNumber(node) { 
    return node.value; 
  }

  function stringifyNegExp(node) { 
    return '-{expr}'.supplant({
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

  function stringifyAssignment(node) {
    return '{lhs} = {rhs}'.supplant({
      lhs: stringify(node.left),
      rhs: stringify(node.right)
    });
  }

  function stringifyFunctionInv(node){
    var template = '{name}' + (node.parameters.length ? '({parameters})' : '');
    return template.supplant({
      name: node.name,
      parameters: node.parameters.map(stringify).join(', ')  
    });
  }

  function stringifyProgram(node) {
    return node.statements.map( stringify ).join(';\n');
  }


  var stringify = Matematica.compiler.buildNodeVisitor({
    Program:                stringifyProgram, 
    Identifier:             function(node){ return node.name; },
    FunctionInvocation:     stringifyFunctionInv,
    Assignment:             stringifyAssignment,
    Matrix:                 stringifyMatrix,
    Vector:                 stringifyVector, 
    LogicalExpression:      stringifyExp,
    CompararisonExpression: stringifyExp,
    AdditiveExpression:     stringifyExp,
    MultiplicativeExpression:  stringifyExp,
    NegativeExpression:     stringifyNegExp,
    ConstantExpression:     stringifyNumber
  });

  return stringify(ast);
};
},{}],8:[function(require,module,exports){
module.exports.symtable = {

  scope : {},

  register : function(name, node){
    var me = this;
    me.scope[name] = node;  
  },

  resolve: function(name){
    var me = this,
        cur_scope = me.scope, sym;

    while(cur_scope){
      sym = cur_scope[name];
      if(sym) return sym;
      cur_scope = cur_scope.____parent____;
    }
    return undefined;
  },

  enter_scope:  function(){
    var me = this;
    me.scope.____next____ = { 
      ____parent____: me.scope
    };
    me.scope = me.scope.____next____;
  },

  exit_scope:  function(){
    var me = this;
    me.scope = me.scope.____parent____;    
  }
};

},{}],9:[function(require,module,exports){
Matematica.parser = (function(){
  /*
   * Generated by PEG.js 0.7.0.
   *
   * http://pegjs.majda.cz/
   */
  
  function quote(s) {
    /*
     * ECMA-262, 5th ed., 7.8.4: All characters may appear literally in a
     * string literal except for the closing quote character, backslash,
     * carriage return, line separator, paragraph separator, and line feed.
     * Any character may appear in the form of an escape sequence.
     *
     * For portability, we also escape escape all control and non-ASCII
     * characters. Note that "\0" and "\v" escape sequences are not used
     * because JSHint does not like the first and IE the second.
     */
     return '"' + s
      .replace(/\\/g, '\\\\')  // backslash
      .replace(/"/g, '\\"')    // closing quote character
      .replace(/\x08/g, '\\b') // backspace
      .replace(/\t/g, '\\t')   // horizontal tab
      .replace(/\n/g, '\\n')   // line feed
      .replace(/\f/g, '\\f')   // form feed
      .replace(/\r/g, '\\r')   // carriage return
      .replace(/[\x00-\x07\x0B\x0E-\x1F\x80-\uFFFF]/g, escape)
      + '"';
  }
  
  var result = {
    /*
     * Parses the input with a generated parser. If the parsing is successfull,
     * returns a value explicitly or implicitly specified by the grammar from
     * which the parser was generated (see |PEG.buildParser|). If the parsing is
     * unsuccessful, throws |PEG.parser.SyntaxError| describing the error.
     */
    parse: function(input, startRule) {
      var parseFunctions = {
        "SourceCharacter": parse_SourceCharacter,
        "WhiteSpace": parse_WhiteSpace,
        "LineTerminator": parse_LineTerminator,
        "LineTerminatorSequence": parse_LineTerminatorSequence,
        "Comment": parse_Comment,
        "MultiLineComment": parse_MultiLineComment,
        "MultiLineCommentNoLineTerminator": parse_MultiLineCommentNoLineTerminator,
        "SingleLineComment": parse_SingleLineComment,
        "Zs": parse_Zs,
        "_": parse__,
        "__": parse___,
        "letter": parse_letter,
        "digit": parse_digit,
        "OS_BRACKET": parse_OS_BRACKET,
        "CS_BRACKET": parse_CS_BRACKET,
        "O_PAR": parse_O_PAR,
        "C_PAR": parse_C_PAR,
        "COLON": parse_COLON,
        "COMMA": parse_COMMA,
        "AND_OP": parse_AND_OP,
        "OR_OP": parse_OR_OP,
        "MUL_OP": parse_MUL_OP,
        "DIV_OP": parse_DIV_OP,
        "EQ_OP": parse_EQ_OP,
        "NEQ_OP": parse_NEQ_OP,
        "LT_OP": parse_LT_OP,
        "GT_OP": parse_GT_OP,
        "LTE_OP": parse_LTE_OP,
        "GTE_OP": parse_GTE_OP,
        "ADD_OP": parse_ADD_OP,
        "MIN_OP": parse_MIN_OP,
        "ASSIGN_OP": parse_ASSIGN_OP,
        "LOGICAL_OPS": parse_LOGICAL_OPS,
        "COMPARISON_OPS": parse_COMPARISON_OPS,
        "ADDITIVE_OPS": parse_ADDITIVE_OPS,
        "MULTIPLICATIVE_OPS": parse_MULTIPLICATIVE_OPS,
        "StatementList": parse_StatementList,
        "Statement": parse_Statement,
        "Assignment": parse_Assignment,
        "Identifier": parse_Identifier,
        "Matrix": parse_Matrix,
        "Vector": parse_Vector,
        "LogicalExp": parse_LogicalExp,
        "CompararisonExp": parse_CompararisonExp,
        "AdditiveExp": parse_AdditiveExp,
        "MultiplicativeExp": parse_MultiplicativeExp,
        "SimpleFactorExp": parse_SimpleFactorExp,
        "FactorExp": parse_FactorExp,
        "Number": parse_Number,
        "FunctionInvocation": parse_FunctionInvocation,
        "ParameterList": parse_ParameterList
      };
      
      if (startRule !== undefined) {
        if (parseFunctions[startRule] === undefined) {
          throw new Error("Invalid rule name: " + quote(startRule) + ".");
        }
      } else {
        startRule = "StatementList";
      }
      
      var pos = 0;
      var reportFailures = 0;
      var rightmostFailuresPos = 0;
      var rightmostFailuresExpected = [];
      
      function padLeft(input, padding, length) {
        var result = input;
        
        var padLength = length - input.length;
        for (var i = 0; i < padLength; i++) {
          result = padding + result;
        }
        
        return result;
      }
      
      function escape(ch) {
        var charCode = ch.charCodeAt(0);
        var escapeChar;
        var length;
        
        if (charCode <= 0xFF) {
          escapeChar = 'x';
          length = 2;
        } else {
          escapeChar = 'u';
          length = 4;
        }
        
        return '\\' + escapeChar + padLeft(charCode.toString(16).toUpperCase(), '0', length);
      }
      
      function matchFailed(failure) {
        if (pos < rightmostFailuresPos) {
          return;
        }
        
        if (pos > rightmostFailuresPos) {
          rightmostFailuresPos = pos;
          rightmostFailuresExpected = [];
        }
        
        rightmostFailuresExpected.push(failure);
      }
      
      function parse_SourceCharacter() {
        var result0;
        
        if (input.length > pos) {
          result0 = input.charAt(pos);
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("any character");
          }
        }
        return result0;
      }
      
      function parse_WhiteSpace() {
        var result0;
        
        reportFailures++;
        if (/^[\t\x0B\f \xA0\uFEFF]/.test(input.charAt(pos))) {
          result0 = input.charAt(pos);
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("[\\t\\x0B\\f \\xA0\\uFEFF]");
          }
        }
        if (result0 === null) {
          result0 = parse_Zs();
        }
        reportFailures--;
        if (reportFailures === 0 && result0 === null) {
          matchFailed("whitespace");
        }
        return result0;
      }
      
      function parse_LineTerminator() {
        var result0;
        
        if (/^[\n\r\u2028\u2029]/.test(input.charAt(pos))) {
          result0 = input.charAt(pos);
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("[\\n\\r\\u2028\\u2029]");
          }
        }
        return result0;
      }
      
      function parse_LineTerminatorSequence() {
        var result0;
        
        reportFailures++;
        if (input.charCodeAt(pos) === 10) {
          result0 = "\n";
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"\\n\"");
          }
        }
        if (result0 === null) {
          if (input.substr(pos, 2) === "\r\n") {
            result0 = "\r\n";
            pos += 2;
          } else {
            result0 = null;
            if (reportFailures === 0) {
              matchFailed("\"\\r\\n\"");
            }
          }
          if (result0 === null) {
            if (input.charCodeAt(pos) === 13) {
              result0 = "\r";
              pos++;
            } else {
              result0 = null;
              if (reportFailures === 0) {
                matchFailed("\"\\r\"");
              }
            }
            if (result0 === null) {
              if (input.charCodeAt(pos) === 8232) {
                result0 = "\u2028";
                pos++;
              } else {
                result0 = null;
                if (reportFailures === 0) {
                  matchFailed("\"\\u2028\"");
                }
              }
              if (result0 === null) {
                if (input.charCodeAt(pos) === 8233) {
                  result0 = "\u2029";
                  pos++;
                } else {
                  result0 = null;
                  if (reportFailures === 0) {
                    matchFailed("\"\\u2029\"");
                  }
                }
              }
            }
          }
        }
        reportFailures--;
        if (reportFailures === 0 && result0 === null) {
          matchFailed("end of line");
        }
        return result0;
      }
      
      function parse_Comment() {
        var result0;
        
        reportFailures++;
        result0 = parse_MultiLineComment();
        if (result0 === null) {
          result0 = parse_SingleLineComment();
        }
        reportFailures--;
        if (reportFailures === 0 && result0 === null) {
          matchFailed("comment");
        }
        return result0;
      }
      
      function parse_MultiLineComment() {
        var result0, result1, result2, result3;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        if (input.substr(pos, 2) === "/*") {
          result0 = "/*";
          pos += 2;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"/*\"");
          }
        }
        if (result0 !== null) {
          result1 = [];
          pos1 = pos;
          pos2 = pos;
          reportFailures++;
          if (input.substr(pos, 2) === "*/") {
            result2 = "*/";
            pos += 2;
          } else {
            result2 = null;
            if (reportFailures === 0) {
              matchFailed("\"*/\"");
            }
          }
          reportFailures--;
          if (result2 === null) {
            result2 = "";
          } else {
            result2 = null;
            pos = pos2;
          }
          if (result2 !== null) {
            result3 = parse_SourceCharacter();
            if (result3 !== null) {
              result2 = [result2, result3];
            } else {
              result2 = null;
              pos = pos1;
            }
          } else {
            result2 = null;
            pos = pos1;
          }
          while (result2 !== null) {
            result1.push(result2);
            pos1 = pos;
            pos2 = pos;
            reportFailures++;
            if (input.substr(pos, 2) === "*/") {
              result2 = "*/";
              pos += 2;
            } else {
              result2 = null;
              if (reportFailures === 0) {
                matchFailed("\"*/\"");
              }
            }
            reportFailures--;
            if (result2 === null) {
              result2 = "";
            } else {
              result2 = null;
              pos = pos2;
            }
            if (result2 !== null) {
              result3 = parse_SourceCharacter();
              if (result3 !== null) {
                result2 = [result2, result3];
              } else {
                result2 = null;
                pos = pos1;
              }
            } else {
              result2 = null;
              pos = pos1;
            }
          }
          if (result1 !== null) {
            if (input.substr(pos, 2) === "*/") {
              result2 = "*/";
              pos += 2;
            } else {
              result2 = null;
              if (reportFailures === 0) {
                matchFailed("\"*/\"");
              }
            }
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos0;
            }
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      
      function parse_MultiLineCommentNoLineTerminator() {
        var result0, result1, result2, result3;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        if (input.substr(pos, 2) === "/*") {
          result0 = "/*";
          pos += 2;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"/*\"");
          }
        }
        if (result0 !== null) {
          result1 = [];
          pos1 = pos;
          pos2 = pos;
          reportFailures++;
          if (input.substr(pos, 2) === "*/") {
            result2 = "*/";
            pos += 2;
          } else {
            result2 = null;
            if (reportFailures === 0) {
              matchFailed("\"*/\"");
            }
          }
          if (result2 === null) {
            result2 = parse_LineTerminator();
          }
          reportFailures--;
          if (result2 === null) {
            result2 = "";
          } else {
            result2 = null;
            pos = pos2;
          }
          if (result2 !== null) {
            result3 = parse_SourceCharacter();
            if (result3 !== null) {
              result2 = [result2, result3];
            } else {
              result2 = null;
              pos = pos1;
            }
          } else {
            result2 = null;
            pos = pos1;
          }
          while (result2 !== null) {
            result1.push(result2);
            pos1 = pos;
            pos2 = pos;
            reportFailures++;
            if (input.substr(pos, 2) === "*/") {
              result2 = "*/";
              pos += 2;
            } else {
              result2 = null;
              if (reportFailures === 0) {
                matchFailed("\"*/\"");
              }
            }
            if (result2 === null) {
              result2 = parse_LineTerminator();
            }
            reportFailures--;
            if (result2 === null) {
              result2 = "";
            } else {
              result2 = null;
              pos = pos2;
            }
            if (result2 !== null) {
              result3 = parse_SourceCharacter();
              if (result3 !== null) {
                result2 = [result2, result3];
              } else {
                result2 = null;
                pos = pos1;
              }
            } else {
              result2 = null;
              pos = pos1;
            }
          }
          if (result1 !== null) {
            if (input.substr(pos, 2) === "*/") {
              result2 = "*/";
              pos += 2;
            } else {
              result2 = null;
              if (reportFailures === 0) {
                matchFailed("\"*/\"");
              }
            }
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos0;
            }
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      
      function parse_SingleLineComment() {
        var result0, result1, result2, result3;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        if (input.substr(pos, 2) === "//") {
          result0 = "//";
          pos += 2;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"//\"");
          }
        }
        if (result0 !== null) {
          result1 = [];
          pos1 = pos;
          pos2 = pos;
          reportFailures++;
          result2 = parse_LineTerminator();
          reportFailures--;
          if (result2 === null) {
            result2 = "";
          } else {
            result2 = null;
            pos = pos2;
          }
          if (result2 !== null) {
            result3 = parse_SourceCharacter();
            if (result3 !== null) {
              result2 = [result2, result3];
            } else {
              result2 = null;
              pos = pos1;
            }
          } else {
            result2 = null;
            pos = pos1;
          }
          while (result2 !== null) {
            result1.push(result2);
            pos1 = pos;
            pos2 = pos;
            reportFailures++;
            result2 = parse_LineTerminator();
            reportFailures--;
            if (result2 === null) {
              result2 = "";
            } else {
              result2 = null;
              pos = pos2;
            }
            if (result2 !== null) {
              result3 = parse_SourceCharacter();
              if (result3 !== null) {
                result2 = [result2, result3];
              } else {
                result2 = null;
                pos = pos1;
              }
            } else {
              result2 = null;
              pos = pos1;
            }
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      
      function parse_Zs() {
        var result0;
        
        if (/^[ \xA0\u1680\u180E\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F\u3000]/.test(input.charAt(pos))) {
          result0 = input.charAt(pos);
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("[ \\xA0\\u1680\\u180E\\u2000\\u2001\\u2002\\u2003\\u2004\\u2005\\u2006\\u2007\\u2008\\u2009\\u200A\\u202F\\u205F\\u3000]");
          }
        }
        return result0;
      }
      
      function parse__() {
        var result0, result1;
        
        result0 = [];
        result1 = parse_WhiteSpace();
        if (result1 === null) {
          result1 = parse_MultiLineCommentNoLineTerminator();
          if (result1 === null) {
            result1 = parse_SingleLineComment();
          }
        }
        while (result1 !== null) {
          result0.push(result1);
          result1 = parse_WhiteSpace();
          if (result1 === null) {
            result1 = parse_MultiLineCommentNoLineTerminator();
            if (result1 === null) {
              result1 = parse_SingleLineComment();
            }
          }
        }
        return result0;
      }
      
      function parse___() {
        var result0, result1;
        
        result0 = [];
        result1 = parse_WhiteSpace();
        if (result1 === null) {
          result1 = parse_LineTerminatorSequence();
          if (result1 === null) {
            result1 = parse_Comment();
          }
        }
        while (result1 !== null) {
          result0.push(result1);
          result1 = parse_WhiteSpace();
          if (result1 === null) {
            result1 = parse_LineTerminatorSequence();
            if (result1 === null) {
              result1 = parse_Comment();
            }
          }
        }
        return result0;
      }
      
      function parse_letter() {
        var result0;
        
        if (/^[a-z]/.test(input.charAt(pos))) {
          result0 = input.charAt(pos);
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("[a-z]");
          }
        }
        if (result0 === null) {
          if (/^[A-Z]/.test(input.charAt(pos))) {
            result0 = input.charAt(pos);
            pos++;
          } else {
            result0 = null;
            if (reportFailures === 0) {
              matchFailed("[A-Z]");
            }
          }
        }
        return result0;
      }
      
      function parse_digit() {
        var result0;
        
        if (/^[0-9]/.test(input.charAt(pos))) {
          result0 = input.charAt(pos);
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("[0-9]");
          }
        }
        return result0;
      }
      
      function parse_OS_BRACKET() {
        var result0, result1, result2;
        var pos0;
        
        pos0 = pos;
        result0 = parse___();
        if (result0 !== null) {
          if (input.charCodeAt(pos) === 91) {
            result1 = "[";
            pos++;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\"[\"");
            }
          }
          if (result1 !== null) {
            result2 = parse___();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos0;
            }
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      
      function parse_CS_BRACKET() {
        var result0, result1, result2;
        var pos0;
        
        pos0 = pos;
        result0 = parse___();
        if (result0 !== null) {
          if (input.charCodeAt(pos) === 93) {
            result1 = "]";
            pos++;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\"]\"");
            }
          }
          if (result1 !== null) {
            result2 = parse___();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos0;
            }
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      
      function parse_O_PAR() {
        var result0, result1, result2;
        var pos0;
        
        pos0 = pos;
        result0 = parse___();
        if (result0 !== null) {
          if (input.charCodeAt(pos) === 40) {
            result1 = "(";
            pos++;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\"(\"");
            }
          }
          if (result1 !== null) {
            result2 = parse___();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos0;
            }
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      
      function parse_C_PAR() {
        var result0, result1, result2;
        var pos0;
        
        pos0 = pos;
        result0 = parse___();
        if (result0 !== null) {
          if (input.charCodeAt(pos) === 41) {
            result1 = ")";
            pos++;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\")\"");
            }
          }
          if (result1 !== null) {
            result2 = parse___();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos0;
            }
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      
      function parse_COLON() {
        var result0, result1, result2;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse___();
        if (result0 !== null) {
          if (input.charCodeAt(pos) === 59) {
            result1 = ";";
            pos++;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\";\"");
            }
          }
          if (result1 !== null) {
            result2 = parse___();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset) { return ';'; })(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_COMMA() {
        var result0, result1, result2;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse___();
        if (result0 !== null) {
          if (input.charCodeAt(pos) === 44) {
            result1 = ",";
            pos++;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\",\"");
            }
          }
          if (result1 !== null) {
            result2 = parse___();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset) { return ';'; })(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_AND_OP() {
        var result0, result1, result2;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse___();
        if (result0 !== null) {
          if (input.substr(pos, 2) === "&&") {
            result1 = "&&";
            pos += 2;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\"&&\"");
            }
          }
          if (result1 !== null) {
            result2 = parse___();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset) { return '&&'; })(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_OR_OP() {
        var result0, result1, result2;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse___();
        if (result0 !== null) {
          if (input.substr(pos, 2) === "||") {
            result1 = "||";
            pos += 2;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\"||\"");
            }
          }
          if (result1 !== null) {
            result2 = parse___();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset) { return '||'; })(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_MUL_OP() {
        var result0, result1, result2;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse___();
        if (result0 !== null) {
          if (input.charCodeAt(pos) === 42) {
            result1 = "*";
            pos++;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\"*\"");
            }
          }
          if (result1 !== null) {
            result2 = parse___();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset) { return '*'; })(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_DIV_OP() {
        var result0, result1, result2;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse___();
        if (result0 !== null) {
          if (input.charCodeAt(pos) === 47) {
            result1 = "/";
            pos++;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\"/\"");
            }
          }
          if (result1 !== null) {
            result2 = parse___();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset) { return '/'; })(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_EQ_OP() {
        var result0, result1, result2;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse___();
        if (result0 !== null) {
          if (input.substr(pos, 2) === "==") {
            result1 = "==";
            pos += 2;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\"==\"");
            }
          }
          if (result1 !== null) {
            result2 = parse___();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset) { return '=='; })(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_NEQ_OP() {
        var result0, result1, result2;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse___();
        if (result0 !== null) {
          if (input.substr(pos, 2) === "!=") {
            result1 = "!=";
            pos += 2;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\"!=\"");
            }
          }
          if (result1 !== null) {
            result2 = parse___();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset) { return '!='; })(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_LT_OP() {
        var result0, result1, result2;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse___();
        if (result0 !== null) {
          if (input.charCodeAt(pos) === 60) {
            result1 = "<";
            pos++;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\"<\"");
            }
          }
          if (result1 !== null) {
            result2 = parse___();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset) { return '<'; })(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_GT_OP() {
        var result0, result1, result2;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse___();
        if (result0 !== null) {
          if (input.charCodeAt(pos) === 62) {
            result1 = ">";
            pos++;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\">\"");
            }
          }
          if (result1 !== null) {
            result2 = parse___();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset) { return '>'; })(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_LTE_OP() {
        var result0, result1, result2;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse___();
        if (result0 !== null) {
          if (input.substr(pos, 2) === "<=") {
            result1 = "<=";
            pos += 2;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\"<=\"");
            }
          }
          if (result1 !== null) {
            result2 = parse___();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset) { return '<='; })(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_GTE_OP() {
        var result0, result1, result2;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse___();
        if (result0 !== null) {
          if (input.substr(pos, 2) === ">=") {
            result1 = ">=";
            pos += 2;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\">=\"");
            }
          }
          if (result1 !== null) {
            result2 = parse___();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset) { return '>='; })(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_ADD_OP() {
        var result0, result1, result2;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse___();
        if (result0 !== null) {
          if (input.charCodeAt(pos) === 43) {
            result1 = "+";
            pos++;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\"+\"");
            }
          }
          if (result1 !== null) {
            result2 = parse___();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset) { return '+'; })(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_MIN_OP() {
        var result0, result1, result2;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse___();
        if (result0 !== null) {
          if (input.charCodeAt(pos) === 45) {
            result1 = "-";
            pos++;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\"-\"");
            }
          }
          if (result1 !== null) {
            result2 = parse___();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset) { return '-'; })(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_ASSIGN_OP() {
        var result0, result1, result2;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse___();
        if (result0 !== null) {
          if (input.charCodeAt(pos) === 61) {
            result1 = "=";
            pos++;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\"=\"");
            }
          }
          if (result1 !== null) {
            result2 = parse___();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset) { return '='; })(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_LOGICAL_OPS() {
        var result0;
        
        result0 = parse_AND_OP();
        if (result0 === null) {
          result0 = parse_OR_OP();
        }
        return result0;
      }
      
      function parse_COMPARISON_OPS() {
        var result0;
        
        result0 = parse_LT_OP();
        if (result0 === null) {
          result0 = parse_GT_OP();
          if (result0 === null) {
            result0 = parse_EQ_OP();
            if (result0 === null) {
              result0 = parse_GTE_OP();
              if (result0 === null) {
                result0 = parse_LTE_OP();
                if (result0 === null) {
                  result0 = parse_NEQ_OP();
                }
              }
            }
          }
        }
        return result0;
      }
      
      function parse_ADDITIVE_OPS() {
        var result0;
        
        result0 = parse_ADD_OP();
        if (result0 === null) {
          result0 = parse_MIN_OP();
        }
        return result0;
      }
      
      function parse_MULTIPLICATIVE_OPS() {
        var result0;
        
        result0 = parse_MUL_OP();
        if (result0 === null) {
          result0 = parse_DIV_OP();
        }
        return result0;
      }
      
      function parse_StatementList() {
        var result0, result1, result2, result3;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_Statement();
        if (result0 !== null) {
          result1 = [];
          pos2 = pos;
          result2 = parse_COLON();
          if (result2 !== null) {
            result3 = parse_Statement();
            if (result3 !== null) {
              result2 = [result2, result3];
            } else {
              result2 = null;
              pos = pos2;
            }
          } else {
            result2 = null;
            pos = pos2;
          }
          while (result2 !== null) {
            result1.push(result2);
            pos2 = pos;
            result2 = parse_COLON();
            if (result2 !== null) {
              result3 = parse_Statement();
              if (result3 !== null) {
                result2 = [result2, result3];
              } else {
                result2 = null;
                pos = pos2;
              }
            } else {
              result2 = null;
              pos = pos2;
            }
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, head, tail) {
                return ast.program([head].concat(secondNode(tail)));
           })(pos0, result0[0], result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_Statement() {
        var result0, result1;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_LogicalExp();
        if (result0 !== null) {
          pos2 = pos;
          reportFailures++;
          result1 = parse_ASSIGN_OP();
          reportFailures--;
          if (result1 === null) {
            result1 = "";
          } else {
            result1 = null;
            pos = pos2;
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, expr) { return expr; })(pos0, result0[0]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        if (result0 === null) {
          result0 = parse_Assignment();
        }
        return result0;
      }
      
      function parse_Assignment() {
        var result0, result1, result2;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_Identifier();
        if (result0 !== null) {
          result1 = parse_ASSIGN_OP();
          if (result1 !== null) {
            result2 = parse_LogicalExp();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, lhs, op, rhs) {
                return ast.assignment(lhs, rhs);
            })(pos0, result0[0], result0[1], result0[2]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_Identifier() {
        var result0, result1, result2;
        var pos0, pos1;
        
        reportFailures++;
        pos0 = pos;
        pos1 = pos;
        result0 = parse_letter();
        if (result0 === null) {
          if (input.charCodeAt(pos) === 95) {
            result0 = "_";
            pos++;
          } else {
            result0 = null;
            if (reportFailures === 0) {
              matchFailed("\"_\"");
            }
          }
          if (result0 === null) {
            if (input.charCodeAt(pos) === 36) {
              result0 = "$";
              pos++;
            } else {
              result0 = null;
              if (reportFailures === 0) {
                matchFailed("\"$\"");
              }
            }
          }
        }
        if (result0 !== null) {
          result1 = [];
          result2 = parse_letter();
          if (result2 === null) {
            result2 = parse_digit();
            if (result2 === null) {
              if (input.charCodeAt(pos) === 95) {
                result2 = "_";
                pos++;
              } else {
                result2 = null;
                if (reportFailures === 0) {
                  matchFailed("\"_\"");
                }
              }
              if (result2 === null) {
                if (input.charCodeAt(pos) === 36) {
                  result2 = "$";
                  pos++;
                } else {
                  result2 = null;
                  if (reportFailures === 0) {
                    matchFailed("\"$\"");
                  }
                }
              }
            }
          }
          while (result2 !== null) {
            result1.push(result2);
            result2 = parse_letter();
            if (result2 === null) {
              result2 = parse_digit();
              if (result2 === null) {
                if (input.charCodeAt(pos) === 95) {
                  result2 = "_";
                  pos++;
                } else {
                  result2 = null;
                  if (reportFailures === 0) {
                    matchFailed("\"_\"");
                  }
                }
                if (result2 === null) {
                  if (input.charCodeAt(pos) === 36) {
                    result2 = "$";
                    pos++;
                  } else {
                    result2 = null;
                    if (reportFailures === 0) {
                      matchFailed("\"$\"");
                    }
                  }
                }
              }
            }
          }
          if (result1 !== null) {
            result2 = parse___();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, head, tail) {
                return ast.identifier(head + tail.join('')); 
            })(pos0, result0[0], result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        reportFailures--;
        if (reportFailures === 0 && result0 === null) {
          matchFailed("identifier");
        }
        return result0;
      }
      
      function parse_Matrix() {
        var result0, result1, result2, result3, result4;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_OS_BRACKET();
        if (result0 !== null) {
          result1 = parse_Vector();
          if (result1 !== null) {
            result2 = [];
            pos2 = pos;
            result3 = parse_COLON();
            if (result3 !== null) {
              result4 = parse_Vector();
              if (result4 !== null) {
                result3 = [result3, result4];
              } else {
                result3 = null;
                pos = pos2;
              }
            } else {
              result3 = null;
              pos = pos2;
            }
            while (result3 !== null) {
              result2.push(result3);
              pos2 = pos;
              result3 = parse_COLON();
              if (result3 !== null) {
                result4 = parse_Vector();
                if (result4 !== null) {
                  result3 = [result3, result4];
                } else {
                  result3 = null;
                  pos = pos2;
                }
              } else {
                result3 = null;
                pos = pos2;
              }
            }
            if (result2 !== null) {
              result3 = parse_CS_BRACKET();
              if (result3 !== null) {
                result0 = [result0, result1, result2, result3];
              } else {
                result0 = null;
                pos = pos1;
              }
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, head, tail) {
                var nodes = [head].concat(secondNode(tail));
                return {
                    type:   'Matrix',
                    m:      nodes.length,
                    n:      nodes[0].size,
                    elements: nodes
                };
            })(pos0, result0[1], result0[2]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_Vector() {
        var result0, result1, result2, result3;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_LogicalExp();
        if (result0 !== null) {
          result1 = [];
          pos2 = pos;
          result2 = parse___();
          if (result2 !== null) {
            result3 = parse_LogicalExp();
            if (result3 !== null) {
              result2 = [result2, result3];
            } else {
              result2 = null;
              pos = pos2;
            }
          } else {
            result2 = null;
            pos = pos2;
          }
          while (result2 !== null) {
            result1.push(result2);
            pos2 = pos;
            result2 = parse___();
            if (result2 !== null) {
              result3 = parse_LogicalExp();
              if (result3 !== null) {
                result2 = [result2, result3];
              } else {
                result2 = null;
                pos = pos2;
              }
            } else {
              result2 = null;
              pos = pos2;
            }
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, head, tail) {
                var nodes = [head].concat(secondNode(tail));
                return { 
                    type:   'Vector',
                    size:   nodes.length,
                    elements:nodes
                };
            })(pos0, result0[0], result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_LogicalExp() {
        var result0, result1, result2, result3;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_CompararisonExp();
        if (result0 !== null) {
          result1 = [];
          pos2 = pos;
          result2 = parse_LOGICAL_OPS();
          if (result2 !== null) {
            result3 = parse_CompararisonExp();
            if (result3 !== null) {
              result2 = [result2, result3];
            } else {
              result2 = null;
              pos = pos2;
            }
          } else {
            result2 = null;
            pos = pos2;
          }
          while (result2 !== null) {
            result1.push(result2);
            pos2 = pos;
            result2 = parse_LOGICAL_OPS();
            if (result2 !== null) {
              result3 = parse_CompararisonExp();
              if (result3 !== null) {
                result2 = [result2, result3];
              } else {
                result2 = null;
                pos = pos2;
              }
            } else {
              result2 = null;
              pos = pos2;
            }
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, head, tail) { 
                var result = head;
                for (var i = 0; i < tail.length; i++) {
                    result = ast.logical(result, tail[i][1], tail[i][0]);
                }
                return result; 
            })(pos0, result0[0], result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_CompararisonExp() {
        var result0, result1, result2;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_AdditiveExp();
        if (result0 !== null) {
          pos2 = pos;
          result1 = parse_COMPARISON_OPS();
          if (result1 !== null) {
            result2 = parse_AdditiveExp();
            if (result2 !== null) {
              result1 = [result1, result2];
            } else {
              result1 = null;
              pos = pos2;
            }
          } else {
            result1 = null;
            pos = pos2;
          }
          result1 = result1 !== null ? result1 : "";
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, head, tail) {
                var result = head;
                for (var i = 0; i < tail.length; i++) {
                    result = ast.comparison(result, tail[i][1], tail[i][0]);
                }
                return result; 
            })(pos0, result0[0], result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_AdditiveExp() {
        var result0, result1, result2, result3;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_MultiplicativeExp();
        if (result0 !== null) {
          result1 = [];
          pos2 = pos;
          result2 = parse_ADDITIVE_OPS();
          if (result2 !== null) {
            result3 = parse_MultiplicativeExp();
            if (result3 !== null) {
              result2 = [result2, result3];
            } else {
              result2 = null;
              pos = pos2;
            }
          } else {
            result2 = null;
            pos = pos2;
          }
          while (result2 !== null) {
            result1.push(result2);
            pos2 = pos;
            result2 = parse_ADDITIVE_OPS();
            if (result2 !== null) {
              result3 = parse_MultiplicativeExp();
              if (result3 !== null) {
                result2 = [result2, result3];
              } else {
                result2 = null;
                pos = pos2;
              }
            } else {
              result2 = null;
              pos = pos2;
            }
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, head, tail) {
                var result = head;
                for (var i = 0; i < tail.length; i++) {
                    result = ast.additive(/*left*/result, /*right*/tail[i][1], /*operator*/tail[i][0]);
                }
                return result; 
            })(pos0, result0[0], result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_MultiplicativeExp() {
        var result0, result1, result2, result3;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_SimpleFactorExp();
        if (result0 !== null) {
          result1 = [];
          pos2 = pos;
          result2 = parse_MULTIPLICATIVE_OPS();
          if (result2 !== null) {
            result3 = parse_SimpleFactorExp();
            if (result3 !== null) {
              result2 = [result2, result3];
            } else {
              result2 = null;
              pos = pos2;
            }
          } else {
            result2 = null;
            pos = pos2;
          }
          while (result2 !== null) {
            result1.push(result2);
            pos2 = pos;
            result2 = parse_MULTIPLICATIVE_OPS();
            if (result2 !== null) {
              result3 = parse_SimpleFactorExp();
              if (result3 !== null) {
                result2 = [result2, result3];
              } else {
                result2 = null;
                pos = pos2;
              }
            } else {
              result2 = null;
              pos = pos2;
            }
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, head, tail) {
                var result = head;
                for (var i = 0; i < tail.length; i++) {
                    result = ast.multiplicative(/*left*/result, /*right*/tail[i][1], /*operator*/tail[i][0]);
                }
                return result; 
            })(pos0, result0[0], result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_SimpleFactorExp() {
        var result0, result1;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        if (input.charCodeAt(pos) === 43) {
          result0 = "+";
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"+\"");
          }
        }
        if (result0 === null) {
          if (input.charCodeAt(pos) === 45) {
            result0 = "-";
            pos++;
          } else {
            result0 = null;
            if (reportFailures === 0) {
              matchFailed("\"-\"");
            }
          }
        }
        result0 = result0 !== null ? result0 : "";
        if (result0 !== null) {
          result1 = parse_FactorExp();
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, sign, expr) {
                return  sign !== '-' ? expr : ast.negative(expr);
            })(pos0, result0[0], result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_FactorExp() {
        var result0, result1, result2;
        var pos0, pos1;
        
        result0 = parse_Number();
        if (result0 === null) {
          result0 = parse_FunctionInvocation();
          if (result0 === null) {
            result0 = parse_Matrix();
            if (result0 === null) {
              pos0 = pos;
              pos1 = pos;
              result0 = parse_O_PAR();
              if (result0 !== null) {
                result1 = parse_LogicalExp();
                if (result1 !== null) {
                  result2 = parse_C_PAR();
                  if (result2 !== null) {
                    result0 = [result0, result1, result2];
                  } else {
                    result0 = null;
                    pos = pos1;
                  }
                } else {
                  result0 = null;
                  pos = pos1;
                }
              } else {
                result0 = null;
                pos = pos1;
              }
              if (result0 !== null) {
                result0 = (function(offset, exp) { return exp; })(pos0, result0[1]);
              }
              if (result0 === null) {
                pos = pos0;
              }
            }
          }
        }
        return result0;
      }
      
      function parse_Number() {
        var result0, result1;
        var pos0;
        
        pos0 = pos;
        if (/^[0-9]/.test(input.charAt(pos))) {
          result1 = input.charAt(pos);
          pos++;
        } else {
          result1 = null;
          if (reportFailures === 0) {
            matchFailed("[0-9]");
          }
        }
        if (result1 !== null) {
          result0 = [];
          while (result1 !== null) {
            result0.push(result1);
            if (/^[0-9]/.test(input.charAt(pos))) {
              result1 = input.charAt(pos);
              pos++;
            } else {
              result1 = null;
              if (reportFailures === 0) {
                matchFailed("[0-9]");
              }
            }
          }
        } else {
          result0 = null;
        }
        if (result0 !== null) {
          result0 = (function(offset, digits) {
                return ast.constant( parseInt(digits.join(""), 10)); 
            })(pos0, result0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_FunctionInvocation() {
        var result0, result1, result2, result3;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_Identifier();
        if (result0 !== null) {
          pos2 = pos;
          result1 = parse_O_PAR();
          if (result1 !== null) {
            result2 = parse_ParameterList();
            if (result2 !== null) {
              result3 = parse_C_PAR();
              if (result3 !== null) {
                result1 = [result1, result2, result3];
              } else {
                result1 = null;
                pos = pos2;
              }
            } else {
              result1 = null;
              pos = pos2;
            }
          } else {
            result1 = null;
            pos = pos2;
          }
          result1 = result1 !== null ? result1 : "";
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, id, parameters) {
                return ast.functionInvocation(id.name, parameters !== '' ? parameters[1] : []);
            })(pos0, result0[0], result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_ParameterList() {
        var result0, result1, result2, result3;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_LogicalExp();
        if (result0 !== null) {
          result1 = [];
          pos2 = pos;
          result2 = parse_COMMA();
          if (result2 !== null) {
            result3 = parse_LogicalExp();
            if (result3 !== null) {
              result2 = [result2, result3];
            } else {
              result2 = null;
              pos = pos2;
            }
          } else {
            result2 = null;
            pos = pos2;
          }
          while (result2 !== null) {
            result1.push(result2);
            pos2 = pos;
            result2 = parse_COMMA();
            if (result2 !== null) {
              result3 = parse_LogicalExp();
              if (result3 !== null) {
                result2 = [result2, result3];
              } else {
                result2 = null;
                pos = pos2;
              }
            } else {
              result2 = null;
              pos = pos2;
            }
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, head, tail) {
                return [head].concat(secondNode(tail));
            })(pos0, result0[0], result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      
      function cleanupExpected(expected) {
        expected.sort();
        
        var lastExpected = null;
        var cleanExpected = [];
        for (var i = 0; i < expected.length; i++) {
          if (expected[i] !== lastExpected) {
            cleanExpected.push(expected[i]);
            lastExpected = expected[i];
          }
        }
        return cleanExpected;
      }
      
      function computeErrorPosition() {
        /*
         * The first idea was to use |String.split| to break the input up to the
         * error position along newlines and derive the line and column from
         * there. However IE's |split| implementation is so broken that it was
         * enough to prevent it.
         */
        
        var line = 1;
        var column = 1;
        var seenCR = false;
        
        for (var i = 0; i < Math.max(pos, rightmostFailuresPos); i++) {
          var ch = input.charAt(i);
          if (ch === "\n") {
            if (!seenCR) { line++; }
            column = 1;
            seenCR = false;
          } else if (ch === "\r" || ch === "\u2028" || ch === "\u2029") {
            line++;
            column = 1;
            seenCR = true;
          } else {
            column++;
            seenCR = false;
          }
        }
        
        return { line: line, column: column };
      }
      
      
      var ast = Matematica.ast;
      function secondNode(tail){ 
          var result = [];
          for(var i=0; i<tail.length; i++){
              result.push(tail[i][1]);
          }
          return result;
      }
      
      
      var result = parseFunctions[startRule]();
      
      /*
       * The parser is now in one of the following three states:
       *
       * 1. The parser successfully parsed the whole input.
       *
       *    - |result !== null|
       *    - |pos === input.length|
       *    - |rightmostFailuresExpected| may or may not contain something
       *
       * 2. The parser successfully parsed only a part of the input.
       *
       *    - |result !== null|
       *    - |pos < input.length|
       *    - |rightmostFailuresExpected| may or may not contain something
       *
       * 3. The parser did not successfully parse any part of the input.
       *
       *   - |result === null|
       *   - |pos === 0|
       *   - |rightmostFailuresExpected| contains at least one failure
       *
       * All code following this comment (including called functions) must
       * handle these states.
       */
      if (result === null || pos !== input.length) {
        var offset = Math.max(pos, rightmostFailuresPos);
        var found = offset < input.length ? input.charAt(offset) : null;
        var errorPosition = computeErrorPosition();
        
        throw new this.SyntaxError(
          cleanupExpected(rightmostFailuresExpected),
          found,
          offset,
          errorPosition.line,
          errorPosition.column
        );
      }
      
      return result;
    },
    
    /* Returns the parser source code. */
    toSource: function() { return this._source; }
  };
  
  /* Thrown when a parser encounters a syntax error. */
  
  result.SyntaxError = function(expected, found, offset, line, column) {
    function buildMessage(expected, found) {
      var expectedHumanized, foundHumanized;
      
      switch (expected.length) {
        case 0:
          expectedHumanized = "end of input";
          break;
        case 1:
          expectedHumanized = expected[0];
          break;
        default:
          expectedHumanized = expected.slice(0, expected.length - 1).join(", ")
            + " or "
            + expected[expected.length - 1];
      }
      
      foundHumanized = found ? quote(found) : "end of input";
      
      return "Expected " + expectedHumanized + " but " + foundHumanized + " found.";
    }
    
    this.name = "SyntaxError";
    this.expected = expected;
    this.found = found;
    this.message = buildMessage(expected, found);
    this.offset = offset;
    this.line = line;
    this.column = column;
  };
  
  result.SyntaxError.prototype = Error.prototype;
  
  return result;
})();

},{}],10:[function(require,module,exports){
var	commons = require('./commons'),
	parser = require('./parser'),
	compiler = require('./compiler');
	
module.exports.Matematica = (function() {

	var Matematica = {
		VERSION: "@VERSION",

		buildParser: function(code, options) {
			var ast = Matematica.parser.parse(code),
				xxx = Matematica.compiler.compile(ast, options);
		}
	};

	return Matematica;
})();

},{"./commons":1,"./compiler":2,"./parser":9}]},{},[10])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL0FwcERhdGEvUm9hbWluZy9ucG0vbm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvY29tbW9ucy5qcyIsInNyYy9jb21waWxlci5qcyIsInNyYy9jb21waWxlci9wYXNzZXMuanMiLCJzcmMvY29tcGlsZXIvcGFzc2VzL2Z1bmN0aW9uX2NvbGxlY3Rvci5qcyIsInNyYy9jb21waWxlci9wYXNzZXMvaW50ZXJwcmV0ZXIuanMiLCJzcmMvY29tcGlsZXIvcGFzc2VzL3NpbXBsaWZpZXIuanMiLCJzcmMvY29tcGlsZXIvcGFzc2VzL3N0cmluZ2lmaWVyLmpzIiwic3JjL2NvbXBpbGVyL3N5bXRhYmxlLmpzIiwic3JjL3BhcnNlci5qcyIsInNyYy9tYXRlbWF0aWNhLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3S0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3IrRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIm1vZHVsZS5leHBvcnRzLk1hdGVtYXRpY2EuYXN0ID0gKGZ1bmN0aW9uKCl7XHJcbiAgICB2YXIgbWUgPSB0aGlzO1xyXG4gICAgZnVuY3Rpb24gZXhwcmVzc2lvbih0eXBlLCBvcGVyYXRvciwgbGVmdCwgcmlnaHQpe1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIHR5cGU6IHR5cGUsXHJcbiAgICAgICAgICAgIG9wZXJhdG9yOiBvcGVyYXRvcixcclxuICAgICAgICAgICAgbGVmdDogbGVmdCxcclxuICAgICAgICAgICAgcmlnaHQ6IHJpZ2h0XHJcbiAgICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAgIGNvbnN0YW50OiBmdW5jdGlvbiAodmFsdWUpe1xyXG4gICAgICAgICAgICByZXR1cm4geyBcclxuICAgICAgICAgICAgICAgIHR5cGU6ICdDb25zdGFudEV4cHJlc3Npb24nLCAgXHJcbiAgICAgICAgICAgICAgICB2YWx1ZTogdmFsdWUgXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfSxcclxuICAgICAgICBpZGVudGlmaWVyOiBmdW5jdGlvbiAobmFtZSl7XHJcbiAgICAgICAgICAgIHJldHVybiB7IFxyXG4gICAgICAgICAgICAgICAgdHlwZTogJ0lkZW50aWZpZXInLCAgXHJcbiAgICAgICAgICAgICAgICBuYW1lOiBuYW1lIFxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZnVuY3Rpb25JbnZvY2F0aW9uOiBmdW5jdGlvbiAobmFtZSwgcGFyYW1zKXtcclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgIHR5cGU6ICdGdW5jdGlvbkludm9jYXRpb24nLFxyXG4gICAgICAgICAgICAgICAgbmFtZTogIG5hbWUsXHJcbiAgICAgICAgICAgICAgICBwYXJhbWV0ZXJzOiBwYXJhbXMgfHwgW11cclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGFzc2lnbm1lbnQ6IGZ1bmN0aW9uIChsZWZ0LCByaWdodCl7XHJcbiAgICAgICAgICAgIHJldHVybiBleHByZXNzaW9uKCdBc3NpZ25tZW50JywgJz0nLCBsZWZ0LCByaWdodCk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBhZGRpdGl2ZTogZnVuY3Rpb24gKGxlZnQsIHJpZ2h0LCBvcGVyYXRvcil7XHJcbiAgICAgICAgICAgIHJldHVybiBleHByZXNzaW9uKCdBZGRpdGl2ZUV4cHJlc3Npb24nLCBvcGVyYXRvciB8fCAnKycsIGxlZnQsIHJpZ2h0KTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIG11bHRpcGxpY2F0aXZlOiBmdW5jdGlvbiAobGVmdCwgcmlnaHQsIG9wZXJhdG9yKXtcclxuICAgICAgICAgICAgcmV0dXJuIGV4cHJlc3Npb24oJ011bHRpcGxpY2F0aXZlRXhwcmVzc2lvbicsIG9wZXJhdG9yIHx8ICcqJywgbGVmdCwgcmlnaHQpO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgbG9naWNhbDogZnVuY3Rpb24gKGxlZnQsIHJpZ2h0LCBvcGVyYXRvcil7XHJcbiAgICAgICAgICAgIHJldHVybiBleHByZXNzaW9uKCdMb2dpY2FsRXhwcmVzc2lvbicsIG9wZXJhdG9yIHx8ICcmJicsIGxlZnQsIHJpZ2h0KTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGNvbXBhcmlzb246IGZ1bmN0aW9uIChsZWZ0LCByaWdodCwgb3BlcmF0b3Ipe1xyXG4gICAgICAgICAgICByZXR1cm4gZXhwcmVzc2lvbignQ29tcGFyYXJpc29uRXhwcmVzc2lvbicsIG9wZXJhdG9yIHx8ICc9PScsIGxlZnQsIHJpZ2h0KTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIG5lZ2F0aXZlOiBmdW5jdGlvbiAobm9kZSl7XHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiAnTmVnYXRpdmVFeHByZXNzaW9uJyxcclxuICAgICAgICAgICAgICAgIG5vZGU6IG5vZGVcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIHByb2dyYW06IGZ1bmN0aW9uIChub2RlKXtcclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgIHR5cGU6ICdQcm9ncmFtJyxcclxuICAgICAgICAgICAgICAgIHN0YXRlbWVudHM6IChub2RlIGluc3RhbmNlb2YgQXJyYXkpID8gbm9kZSA6IFtub2RlXVxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcbn0pKCk7IiwidmFyIHN5bXRhYmxlID0gcmVxdWlyZSgnLi9jb21waWxlci9zeW10YWJsZScpLFxyXG5cdHBhc3NlcyA9IHJlcXVpcmUoJy4vY29tcGlsZXIvcGFzc2VzJyk7XHJcblxyXG5cdFxyXG5tb2R1bGUuZXhwb3J0cy5NYXRlbWF0aWNhLmNvbXBpbGVyID0ge1xyXG5cclxuICBwYXNzTmFtZXM6IFtcclxuICAgICdmdW5jdGlvbl9jb2xsZWN0b3IuanMnLFxyXG4gICAgJ3NpbXBsaWZpZXInLyosXHJcbiAgICAnaW50ZXJwcmV0ZXInKi9cclxuICBdLFxyXG5cclxuICBjb21waWxlOiBmdW5jdGlvbihhc3QsIG9wdGlvbnMpIHtcclxuICAgIHZhciBtZSA9IHRoaXM7XHJcblxyXG4gICAgbWUucGFzc05hbWVzLmZvckVhY2goZnVuY3Rpb24ocGFzc05hbWUpIHtcclxuICAgICAgbWUucGFzc2VzW3Bhc3NOYW1lXShhc3QsIG9wdGlvbnMpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgcmV0dXJuIGFzdDtcclxuICB9LFxyXG5cclxuICBidWlsZE5vZGVWaXNpdG9yOiBmdW5jdGlvbihmdW5jdGlvbnMpIHtcclxuICAgIHJldHVybiBmdW5jdGlvbihub2RlKSB7XHJcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uc1tub2RlLnR5cGVdLmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XHJcbiAgICB9O1xyXG4gIH1cclxufTtcclxuIiwidmFyIGZ1bmN0aW9uX2NvbGxlY3Rvcj0gcmVxdWlyZSgnLi9wYXNzZXMvZnVuY3Rpb25fY29sbGVjdG9yJyksXHJcblx0c2ltcGxpZmllciA9IHJlcXVpcmUoJy4vcGFzc2VzL3NpbXBsaWZpZXInKSxcclxuXHRzdHJpbmdpZmllcj0gcmVxdWlyZSgnLi9wYXNzZXMvc3RyaW5naWZpZXInKSxcclxuXHRpbnRlcnByZXRlcj0gcmVxdWlyZSgnLi9wYXNzZXMvaW50ZXJwcmV0ZXInKVxyXG5cclxubW9kdWxlLmV4cG9ydHMucGFzc2VzcyA9IHt9O1xyXG4iLCJNYXRlbWF0aWNhLmNvbXBpbGVyLnBhc3Nlcy5mdW5jdGlvbl9jb2xsZWN0b3IgPSBmdW5jdGlvbihhc3QpIHtcclxuXHJcbiAgZnVuY3Rpb24gY2xvbmUoc3JjLCB0b0Nsb25lKSB7XHJcbiAgICBmb3IgKHZhciBhdHRyIGluIHRvQ2xvbmUpIHtcclxuICAgICAgICBpZiAodG9DbG9uZS5oYXNPd25Qcm9wZXJ0eShhdHRyKSkgZGVsZXRlKHRvQ2xvbmVbYXR0cl0pO1xyXG4gICAgfVxyXG5cclxuICAgIGZvciAodmFyIGkgaW4gc3JjKSB7XHJcbiAgICAgIGlmKHNyYy5oYXNPd25Qcm9wZXJ0eShpKSl7XHJcbiAgICAgICAgaWYgKHNyY1tpXSAmJiB0eXBlb2Ygc3JjW2ldID09IFwib2JqZWN0XCIpIHtcclxuICAgICAgICAgIHRvQ2xvbmVbaV0gPSBjbG9uZShzcmNbaV0pO1xyXG4gICAgICAgIH0gXHJcbiAgICAgICAgZWxzZXsgXHJcbiAgICAgICAgICB0b0Nsb25lW2ldID0gc3JjW2ldO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfSBcclxuICB9IFxyXG5cclxuICBmdW5jdGlvbiBjb2xsZWN0RXhwKG5vZGUpe1xyXG4gICAgY29sbGVjdChub2RlLmxlZnQpO1xyXG4gICAgY29sbGVjdChub2RlLnJpZ2h0KTtcclxuICB9IFxyXG5cclxuICBmdW5jdGlvbiBjb2xsZWN0TmVnRXhwKG5vZGUpIHsgXHJcbiAgICBjb2xsZWN0KG5vZGUubm9kZSk7XHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBjb2xsZWN0TWF0cml4KG5vZGUpIHtcclxuICAgIG5vZGUuZWxlbWVudHMuZm9yRWFjaChjb2xsZWN0KTtcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIGNvbGxlY3RWZWN0b3Iobm9kZSkge1xyXG4gICAgbm9kZS5lbGVtZW50cy5mb3JFYWNoKGNvbGxlY3QpO1xyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gY29sbGVjdEFzc2lnbm1lbnQobm9kZSkge1xyXG4gICAgTWF0ZW1hdGljYS5jb21waWxlci5zeW10YWJsZS5yZWdpc3Rlcihub2RlLmxlZnQubmFtZSwgbm9kZS5yaWdodCk7ICBcclxuICAgIGNvbGxlY3Qobm9kZS5yaWdodCk7XHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBjb2xsZWN0RnVuY3Rpb25JbnYobm9kZSl7XHJcbiAgICB2YXIgZm5jID0gTWF0ZW1hdGljYS5jb21waWxlci5zeW10YWJsZS5yZXNvbHZlKG5vZGUubmFtZSk7XHJcbiAgICBpZihmbmMpe1xyXG4vLyAgICAgIG5vZGUucGFyYW1ldGVycy5tYXAoY29sbGVjdCk7XHJcbiAgICAgICAgY2xvbmUoZm5jLCBub2RlKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIGNvbGxlY3RQcm9ncmFtKG5vZGUpIHtcclxuICAgIG5vZGUuc3RhdGVtZW50cy5mb3JFYWNoKGNvbGxlY3QpO1xyXG4gIH1cclxuXHJcbiAgdmFyIGNvbGxlY3QgPSBNYXRlbWF0aWNhLmNvbXBpbGVyLmJ1aWxkTm9kZVZpc2l0b3Ioe1xyXG4gICAgUHJvZ3JhbTogICAgICAgICAgICAgICAgY29sbGVjdFByb2dyYW0sIFxyXG4gICAgSWRlbnRpZmllcjogICAgICAgICAgICAgZnVuY3Rpb24oKXt9LFxyXG4gICAgRnVuY3Rpb25JbnZvY2F0aW9uOiAgICAgY29sbGVjdEZ1bmN0aW9uSW52LFxyXG4gICAgQXNzaWdubWVudDogICAgICAgICAgICAgY29sbGVjdEFzc2lnbm1lbnQsXHJcbiAgICBNYXRyaXg6ICAgICAgICAgICAgICAgICBjb2xsZWN0TWF0cml4LFxyXG4gICAgVmVjdG9yOiAgICAgICAgICAgICAgICAgY29sbGVjdFZlY3RvciwgXHJcbiAgICBMb2dpY2FsRXhwcmVzc2lvbjogICAgICBjb2xsZWN0RXhwLFxyXG4gICAgQ29tcGFyYXJpc29uRXhwcmVzc2lvbjogY29sbGVjdEV4cCxcclxuICAgIEFkZGl0aXZlRXhwcmVzc2lvbjogICAgIGNvbGxlY3RFeHAsXHJcbiAgICBNdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb246ICBjb2xsZWN0RXhwLFxyXG4gICAgTmVnYXRpdmVFeHByZXNzaW9uOiAgICAgY29sbGVjdE5lZ0V4cCxcclxuICAgIENvbnN0YW50RXhwcmVzc2lvbjogICAgIGZ1bmN0aW9uKCl7fVxyXG4gIH0pO1xyXG5cclxuICBjb2xsZWN0KGFzdCk7XHJcbiAgcmV0dXJuIGFzdDtcclxufTsiLCJcclxuTWF0ZW1hdGljYS5jb21waWxlci5wYXNzZXMuaW50ZXJwcmV0ZXIgPSBmdW5jdGlvbihhc3QpIHtcclxuXHJcbiAgdmFyIHN5bWJvbHMgPSB7fTtcclxuXHJcbiAgZnVuY3Rpb24gZXZhbHVhdGVBZGRpdGl2ZUV4cChub2RlKXtcclxuICAgIHJldHVybiBub2RlLm9wZXJhdG9yID09PSAnKycgPyBcclxuICAgICAgZXZhbHVhdGUobm9kZS5sZWZ0KSArIGV2YWx1YXRlKG5vZGUucmlnaHQpIDpcclxuICAgICAgZXZhbHVhdGUobm9kZS5sZWZ0KSAtIGV2YWx1YXRlKG5vZGUucmlnaHQpIDsgICAgICBcclxuICB9IFxyXG4gIGZ1bmN0aW9uIGV2YWx1YXRlTXVsdGlwbGljYXRpdmVFeHAobm9kZSl7XHJcbiAgICByZXR1cm4gbm9kZS5vcGVyYXRvciA9PT0gJyonID8gXHJcbiAgICAgIGV2YWx1YXRlKG5vZGUubGVmdCkgKiBldmFsdWF0ZShub2RlLnJpZ2h0KSA6XHJcbiAgICAgIGV2YWx1YXRlKG5vZGUubGVmdCkgLyBldmFsdWF0ZShub2RlLnJpZ2h0KSA7ICAgICAgXHJcbiAgfSBcclxuICBmdW5jdGlvbiBldmFsdWF0ZUxvZ2ljYWxFeHAobm9kZSl7XHJcbiAgICByZXR1cm4gbm9kZS5vcGVyYXRvciA9PT0gJyYmJyA/IFxyXG4gICAgICBldmFsdWF0ZShub2RlLmxlZnQpICYmIGV2YWx1YXRlKG5vZGUucmlnaHQpIDpcclxuICAgICAgZXZhbHVhdGUobm9kZS5sZWZ0KSB8fCBldmFsdWF0ZShub2RlLnJpZ2h0KSA7ICAgICAgXHJcbiAgfSBcclxuICBmdW5jdGlvbiBldmFsdWF0ZUNvbXBhcmFyaXNvbkV4cChub2RlKXtcclxuICAgIHZhciByZXN1bHQgPSBudWxsO1xyXG4gICAgc3dpdGNoKG5vZGUub3BlcmF0b3Ipe1xyXG4gICAgICBjYXNlICc9PSc6IHJlc3VsdCA9IGV2YWx1YXRlKG5vZGUubGVmdCkgPT0gZXZhbHVhdGUobm9kZS5yaWdodCk7IGJyZWFrO1xyXG4gICAgICBjYXNlICchPSc6IHJlc3VsdCA9IGV2YWx1YXRlKG5vZGUubGVmdCkgIT0gZXZhbHVhdGUobm9kZS5yaWdodCk7IGJyZWFrO1xyXG4gICAgICBjYXNlICc+JzogcmVzdWx0ID0gZXZhbHVhdGUobm9kZS5sZWZ0KSA+IGV2YWx1YXRlKG5vZGUucmlnaHQpOyBicmVhaztcclxuICAgICAgY2FzZSAnPj0nOiByZXN1bHQgPSBldmFsdWF0ZShub2RlLmxlZnQpID49IGV2YWx1YXRlKG5vZGUucmlnaHQpOyBicmVhaztcclxuICAgICAgY2FzZSAnPCc6IHJlc3VsdCA9IGV2YWx1YXRlKG5vZGUubGVmdCkgPCBldmFsdWF0ZShub2RlLnJpZ2h0KTsgYnJlYWs7XHJcbiAgICAgIGNhc2UgJzw9JzogcmVzdWx0ID0gZXZhbHVhdGUobm9kZS5sZWZ0KSA8PSBldmFsdWF0ZShub2RlLnJpZ2h0KTsgYnJlYWs7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gcmVzdWx0OyAgICAgIFxyXG4gIH0gXHJcbiAgZnVuY3Rpb24gZXZhbHVhdGVOZWdFeHAobm9kZSkgeyBcclxuICAgIHJldHVybiAgLTEgKiBldmFsdWF0ZShub2RlLm5vZGUpO1xyXG4gIH1cclxuICBmdW5jdGlvbiBldmFsdWF0ZU51bWJlcihub2RlKSB7IFxyXG4gICAgcmV0dXJuIG5vZGUudmFsdWU7IFxyXG4gIH1cclxuICBmdW5jdGlvbiBldmFsdWF0ZU1hdHJpeChub2RlKSB7XHJcbiAgICByZXR1cm4gbm9kZS5lbGVtZW50cy5tYXAoIGV2YWx1YXRlICk7XHJcbiAgfVxyXG4gIGZ1bmN0aW9uIGV2YWx1YXRlVmVjdG9yKG5vZGUpIHtcclxuICAgIHJldHVybiBub2RlLmVsZW1lbnRzLm1hcCggZXZhbHVhdGUgKTtcclxuICB9XHJcbiAgZnVuY3Rpb24gZXZhbHVhdGVBc3NpZ25tZW50KG5vZGUpIHtcclxuICAgIHN5bWJvbHNbbm9kZS5sZWZ0Lm5hbWVdID0gbm9kZS5yaWdodDtcclxuICB9XHJcbiAgZnVuY3Rpb24gZXZhbHVhdGVGdW5jdGlvbkludihub2RlKXtcclxuICAgIGlmKHN5bWJvbHMuaGFzT3duUHJvcGVydHkobm9kZS5uYW1lKSl7XHJcbiAgICAgIHJldHVybiBldmFsdWF0ZShzeW1ib2xzW25vZGUubmFtZV0pO1xyXG4gICAgfVxyXG4gICAgdGhyb3cgbm9kZS5uYW1lICsgJyB3YXMgbm90IGRlZmluZWQnOyAgICBcclxuICB9XHJcbiAgZnVuY3Rpb24gZXZhbHVhdGVQcm9ncmFtKG5vZGUpIHtcclxuICAgIHJldHVybiBub2RlLnN0YXRlbWVudHMubWFwKCBldmFsdWF0ZSApO1xyXG4gIH1cclxuXHJcblxyXG4gIHZhciBldmFsdWF0ZSA9IE1hdGVtYXRpY2EuY29tcGlsZXIuYnVpbGROb2RlVmlzaXRvcih7XHJcbiAgICBQcm9ncmFtOiAgICAgICAgICAgICAgICBldmFsdWF0ZVByb2dyYW0sIFxyXG4gICAgSWRlbnRpZmllcjogICAgICAgICAgICAgZnVuY3Rpb24obm9kZSl7IHJldHVybiBub2RlLm5hbWU7IH0sXHJcbiAgICBGdW5jdGlvbkludm9jYXRpb246ICAgICBldmFsdWF0ZUZ1bmN0aW9uSW52LFxyXG4gICAgQXNzaWdubWVudDogICAgICAgICAgICAgZXZhbHVhdGVBc3NpZ25tZW50LFxyXG4gICAgTWF0cml4OiAgICAgICAgICAgICAgICAgZXZhbHVhdGVNYXRyaXgsXHJcbiAgICBWZWN0b3I6ICAgICAgICAgICAgICAgICBldmFsdWF0ZVZlY3RvciwgXHJcbiAgICBMb2dpY2FsRXhwcmVzc2lvbjogICAgICBldmFsdWF0ZUxvZ2ljYWxFeHAsXHJcbiAgICBDb21wYXJhcmlzb25FeHByZXNzaW9uOiBldmFsdWF0ZUNvbXBhcmFyaXNvbkV4cCxcclxuICAgIEFkZGl0aXZlRXhwcmVzc2lvbjogICAgIGV2YWx1YXRlQWRkaXRpdmVFeHAsXHJcbiAgICBNdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb246ICBldmFsdWF0ZU11bHRpcGxpY2F0aXZlRXhwLFxyXG4gICAgTmVnYXRpdmVFeHByZXNzaW9uOiAgICAgZXZhbHVhdGVOZWdFeHAsXHJcbiAgICBDb25zdGFudEV4cHJlc3Npb246ICAgICBldmFsdWF0ZU51bWJlclxyXG4gIH0pO1xyXG5cclxuICByZXR1cm4gZXZhbHVhdGUoYXN0KTtcclxufTsiLCJcclxuTWF0ZW1hdGljYS5jb21waWxlci5wYXNzZXMuc2ltcGxpZmllciA9IGZ1bmN0aW9uKGFzdCkge1xyXG5cclxuICBmdW5jdGlvbiBpc0NvbnN0YW50RXhwcmVzc2lvbihub2RlKXtcclxuICAgIHJldHVybiBub2RlLnR5cGUgPT09ICdDb25zdGFudEV4cHJlc3Npb24nOyBcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIGlzQWRkaXRpdmVFeHByZXNzaW9uKG5vZGUpe1xyXG4gICAgcmV0dXJuIG5vZGUudHlwZSA9PT0gJ0FkZGl0aXZlRXhwcmVzc2lvbic7IFxyXG4gIH1cclxuXHJcblxyXG4gIGZ1bmN0aW9uIHNpbXBsaWZ5QWRkaXRpdmVFeHAobm9kZSl7XHJcbiAgICB2YXIgcCwgdDtcclxuICAgIG5vZGUubGVmdCA9IHNpbXBsaWZ5KG5vZGUubGVmdCk7XHJcbiAgICBub2RlLnJpZ2h0PSBzaW1wbGlmeShub2RlLnJpZ2h0KTtcclxuXHJcbiAgICBpZihpc0NvbnN0YW50RXhwcmVzc2lvbihub2RlLmxlZnQpIHx8IGlzQ29uc3RhbnRFeHByZXNzaW9uKG5vZGUucmlnaHQpKXtcclxuICAgICAgaWYoaXNDb25zdGFudEV4cHJlc3Npb24obm9kZS5sZWZ0KSAmJiBpc0NvbnN0YW50RXhwcmVzc2lvbihub2RlLnJpZ2h0KSl7XHJcbiAgICAgICAgbm9kZS50eXBlID0gJ0NvbnN0YW50RXhwcmVzc2lvbic7XHJcbiAgICAgICAgbm9kZS52YWx1ZT0gbm9kZS5vcGVyYXRvciA9PT0gJysnID9cclxuICAgICAgICAgICAgbm9kZS5sZWZ0LnZhbHVlICsgbm9kZS5yaWdodC52YWx1ZTpcclxuICAgICAgICAgICAgbm9kZS5sZWZ0LnZhbHVlIC0gbm9kZS5yaWdodC52YWx1ZTtcclxuICAgICAgICBkZWxldGUobm9kZS5sZWZ0KTtcclxuICAgICAgICBkZWxldGUobm9kZS5yaWdodCk7XHJcbiAgICAgICAgZGVsZXRlKG5vZGUub3BlcmF0b3IpO1xyXG4gICAgICB9ZWxzZSBpZihpc0NvbnN0YW50RXhwcmVzc2lvbihub2RlLnJpZ2h0KSAmJiBpc0FkZGl0aXZlRXhwcmVzc2lvbihub2RlLmxlZnQpKSB7XHJcbiAgICAgICAgcCA9IG5vZGUubGVmdDtcclxuICAgICAgICBpZihpc0NvbnN0YW50RXhwcmVzc2lvbihwLmxlZnQpKXtcclxuICAgICAgICAgIHQgPSBwLmxlZnQ7XHJcbiAgICAgICAgICBwLmxlZnQgPSBwLnJpZ2h0O1xyXG4gICAgICAgICAgcC5yaWdodD0gdDtcclxuICAgICAgICB9XHJcbiAgICAgICAgbm9kZS5sZWZ0ID0gbm9kZS5sZWZ0LmxlZnQ7XHJcbiAgICAgICAgbm9kZS5yaWdodCA9IHtcclxuICAgICAgICAgIHR5cGU6ICdBZGRpdGl2ZUV4cHJlc3Npb24nLFxyXG4gICAgICAgICAgb3BlcmF0b3I6IHAub3BlcmF0b3IsXHJcbiAgICAgICAgICBsZWZ0OiBub2RlLnJpZ2h0LFxyXG4gICAgICAgICAgcmlnaHQ6IHAucmlnaHRcclxuICAgICAgICB9O1xyXG4gICAgICAgIG5vZGUucmlnaHQgPSBzaW1wbGlmeShub2RlLnJpZ2h0KTtcclxuXHJcbiAgICAgIH1lbHNlIGlmKGlzQ29uc3RhbnRFeHByZXNzaW9uKG5vZGUubGVmdCkgJiYgaXNBZGRpdGl2ZUV4cHJlc3Npb24obm9kZS5yaWdodCkpIHtcclxuICAgICAgICBwID0gbm9kZS5yaWdodDtcclxuICAgICAgICBpZihpc0NvbnN0YW50RXhwcmVzc2lvbihwLnJpZ2h0KSl7XHJcbiAgICAgICAgICB0ID0gcC5sZWZ0O1xyXG4gICAgICAgICAgcC5sZWZ0ID0gcC5yaWdodDtcclxuICAgICAgICAgIHAucmlnaHQ9IHQ7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIG5vZGUucmlnaHQgPSBub2RlLnJpZ2h0LnJpZ2h0O1xyXG4gICAgICAgIG5vZGUubGVmdCA9IHtcclxuICAgICAgICAgIHR5cGU6ICdBZGRpdGl2ZUV4cHJlc3Npb24nLFxyXG4gICAgICAgICAgb3BlcmF0b3I6IHAub3BlcmF0b3IsXHJcbiAgICAgICAgICBsZWZ0OiBwLmxlZnQsXHJcbiAgICAgICAgICByaWdodDogbm9kZS5sZWZ0XHJcbiAgICAgICAgfTtcclxuICAgICAgICBub2RlLmxlZnQgPSBzaW1wbGlmeShub2RlLmxlZnQpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gbm9kZTtcclxuICB9IFxyXG5cclxuICBmdW5jdGlvbiBzaW1wbGlmeU11bHRpcGxpY2F0aXZlRXhwKG5vZGUpe1xyXG4gICAgbm9kZS5sZWZ0ID0gc2ltcGxpZnkobm9kZS5sZWZ0KTtcclxuICAgIG5vZGUucmlnaHQ9IHNpbXBsaWZ5KG5vZGUucmlnaHQpO1xyXG5cclxuICAgIGlmKGlzQ29uc3RhbnRFeHByZXNzaW9uKG5vZGUubGVmdCkgJiYgaXNDb25zdGFudEV4cHJlc3Npb24obm9kZS5yaWdodCkpe1xyXG4gICAgICBub2RlLnR5cGUgPSAnQ29uc3RhbnRFeHByZXNzaW9uJztcclxuICAgICAgbm9kZS52YWx1ZT0gbm9kZS5vcGVyYXRvciA9PT0gJyonID9cclxuICAgICAgICAgIG5vZGUubGVmdC52YWx1ZSAqIG5vZGUucmlnaHQudmFsdWU6XHJcbiAgICAgICAgICBub2RlLmxlZnQudmFsdWUgLyBub2RlLnJpZ2h0LnZhbHVlO1xyXG4gICAgICBkZWxldGUobm9kZS5sZWZ0KTtcclxuICAgICAgZGVsZXRlKG5vZGUucmlnaHQpO1xyXG4gICAgICBkZWxldGUobm9kZS5vcGVyYXRvcik7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gbm9kZTtcclxuICB9IFxyXG4gIGZ1bmN0aW9uIHNpbXBsaWZ5TG9naWNhbEV4cChub2RlKXtcclxuICAgIG5vZGUubGVmdCA9IHNpbXBsaWZ5KG5vZGUubGVmdCk7XHJcbiAgICBub2RlLnJpZ2h0PSBzaW1wbGlmeShub2RlLnJpZ2h0KTtcclxuXHJcbiAgICBpZihpc0NvbnN0YW50RXhwcmVzc2lvbihub2RlLmxlZnQpICYmIGlzQ29uc3RhbnRFeHByZXNzaW9uKG5vZGUucmlnaHQpKXtcclxuICAgICAgbm9kZS50eXBlID0gJ0NvbnN0YW50RXhwcmVzc2lvbic7XHJcbiAgICAgIG5vZGUudmFsdWU9IG5vZGUub3BlcmF0b3IgPT09ICcmJicgP1xyXG4gICAgICAgICAgbm9kZS5sZWZ0LnZhbHVlICYmIG5vZGUucmlnaHQudmFsdWU6XHJcbiAgICAgICAgICBub2RlLmxlZnQudmFsdWUgfHwgbm9kZS5yaWdodC52YWx1ZTtcclxuICAgICAgZGVsZXRlKG5vZGUubGVmdCk7XHJcbiAgICAgIGRlbGV0ZShub2RlLnJpZ2h0KTtcclxuICAgICAgZGVsZXRlKG5vZGUub3BlcmF0b3IpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIG5vZGU7XHJcbiAgfSBcclxuICBmdW5jdGlvbiBzaW1wbGlmeUNvbXBhcmFyaXNvbkV4cChub2RlKXtcclxuICAgIHZhciByZXN1bHQgPSBudWxsO1xyXG4gICAgbm9kZS5sZWZ0ID0gc2ltcGxpZnkobm9kZS5sZWZ0KTtcclxuICAgIG5vZGUucmlnaHQ9IHNpbXBsaWZ5KG5vZGUucmlnaHQpO1xyXG5cclxuICAgIGlmKGlzQ29uc3RhbnRFeHByZXNzaW9uKG5vZGUubGVmdCkgJiYgaXNDb25zdGFudEV4cHJlc3Npb24obm9kZS5yaWdodCkpe1xyXG4gICAgICBub2RlLnR5cGUgPSAnQ29uc3RhbnRFeHByZXNzaW9uJztcclxuICAgICAgc3dpdGNoKG5vZGUub3BlcmF0b3Ipe1xyXG4gICAgICAgIGNhc2UgJz09Jzogbm9kZS52YWx1ZSA9IG5vZGUubGVmdC52YWx1ZSA9PSBub2RlLnJpZ2h0LnZhbHVlOyBicmVhaztcclxuICAgICAgICBjYXNlICchPSc6IG5vZGUudmFsdWUgPSBub2RlLmxlZnQudmFsdWUgIT0gbm9kZS5yaWdodC52YWx1ZTsgYnJlYWs7XHJcbiAgICAgICAgY2FzZSAnPic6IG5vZGUudmFsdWUgPSBub2RlLmxlZnQudmFsdWUgPiBub2RlLnJpZ2h0LnZhbHVlOyBicmVhaztcclxuICAgICAgICBjYXNlICc+PSc6IG5vZGUudmFsdWUgPSBub2RlLmxlZnQudmFsdWUgPj0gbm9kZS5yaWdodC52YWx1ZTsgYnJlYWs7XHJcbiAgICAgICAgY2FzZSAnPCc6IG5vZGUudmFsdWUgPSBub2RlLmxlZnQudmFsdWUgPCBub2RlLnJpZ2h0LnZhbHVlOyBicmVhaztcclxuICAgICAgICBjYXNlICc8PSc6IG5vZGUudmFsdWUgPSBub2RlLmxlZnQudmFsdWUgPD0gbm9kZS5yaWdodC52YWx1ZTsgYnJlYWs7XHJcbiAgICAgIH1cclxuICAgICAgZGVsZXRlKG5vZGUubGVmdCk7XHJcbiAgICAgIGRlbGV0ZShub2RlLnJpZ2h0KTtcclxuICAgICAgZGVsZXRlKG5vZGUub3BlcmF0b3IpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIG5vZGU7XHJcbiAgfSBcclxuICBmdW5jdGlvbiBzaW1wbGlmeU5lZ0V4cChub2RlKSB7XHJcbiAgICB2YXIgbiA9IHNpbXBsaWZ5KG5vZGUubm9kZSk7XHJcbiAgICBpZihpc0NvbnN0YW50RXhwcmVzc2lvbihuKSl7XHJcbiAgICAgIG5vZGUudHlwZSA9ICdDb25zdGFudEV4cHJlc3Npb24nO1xyXG4gICAgICBub2RlLnZhbHVlPSAtMSAqIG4udmFsdWU7XHJcbiAgICAgIGRlbGV0ZShub2RlLm5vZGUpO1xyXG4gICAgfSBcclxuICAgIHJldHVybiAgbm9kZTtcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIHNpbXBsaWZ5QXNzaWdubWVudChub2RlKXtcclxuICAgIG5vZGUucmlnaHQgPSBzaW1wbGlmeShub2RlLnJpZ2h0KTtcclxuICAgIHJldHVybiBub2RlO1xyXG4gIH0gXHJcblxyXG4gIGZ1bmN0aW9uIHNpbXBsaWZ5TWF0cml4KG5vZGUpIHtcclxuICAgIG5vZGUuZWxlbWVudHMuZm9yRWFjaCggc2ltcGxpZnkgKTtcclxuICAgIHJldHVybiBub2RlO1xyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gc2ltcGxpZnlWZWN0b3Iobm9kZSkge1xyXG4gICAgIG5vZGUuZWxlbWVudHMuZm9yRWFjaCggc2ltcGxpZnkgKTtcclxuICAgICByZXR1cm4gbm9kZTtcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIG5vcChub2RlKXtcclxuICAgIHJldHVybiBub2RlO1xyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gc2ltcGxpZnlDb25zdGFudEV4cChub2RlKXtcclxuICAgIG5vZGUudmFsdWUgPSBOdW1iZXIobm9kZS52YWx1ZSk7XHJcbiAgICByZXR1cm4gbm9kZTtcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIHNpbXBsaWZ5RnVuY3Rpb25JbnZvY2F0aW9uKG5vZGUpe1xyXG4gICAgbm9kZS5wYXJhbWV0ZXJzLmZvckVhY2goIHNpbXBsaWZ5ICk7XHJcbiAgICByZXR1cm4gbm9kZTtcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIHNpbXBsaWZ5UHJvZ3JhbShub2RlKXtcclxuICAgIG5vZGUuc3RhdGVtZW50cy5mb3JFYWNoKCBzaW1wbGlmeSApO1xyXG4gICAgcmV0dXJuIG5vZGU7XHJcbiAgfVxyXG5cclxuICB2YXIgc2ltcGxpZnkgPSBNYXRlbWF0aWNhLmNvbXBpbGVyLmJ1aWxkTm9kZVZpc2l0b3Ioe1xyXG4gICAgUHJvZ3JhbTogICAgICAgICAgICAgICAgc2ltcGxpZnlQcm9ncmFtLCBcclxuICAgIElkZW50aWZpZXI6ICAgICAgICAgICAgIG5vcCxcclxuICAgIEZ1bmN0aW9uSW52b2NhdGlvbjogICAgIHNpbXBsaWZ5RnVuY3Rpb25JbnZvY2F0aW9uLFxyXG4gICAgQXNzaWdubWVudDogICAgICAgICAgICAgc2ltcGxpZnlBc3NpZ25tZW50LFxyXG4gICAgTWF0cml4OiAgICAgICAgICAgICAgICAgc2ltcGxpZnlNYXRyaXgsXHJcbiAgICBWZWN0b3I6ICAgICAgICAgICAgICAgICBzaW1wbGlmeVZlY3RvcixcclxuICAgIExvZ2ljYWxFeHByZXNzaW9uOiAgICAgIHNpbXBsaWZ5TG9naWNhbEV4cCxcclxuICAgIENvbXBhcmFyaXNvbkV4cHJlc3Npb246IHNpbXBsaWZ5Q29tcGFyYXJpc29uRXhwLFxyXG4gICAgQWRkaXRpdmVFeHByZXNzaW9uOiAgICAgc2ltcGxpZnlBZGRpdGl2ZUV4cCxcclxuICAgIE11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbjogICBzaW1wbGlmeU11bHRpcGxpY2F0aXZlRXhwLFxyXG4gICAgTmVnYXRpdmVFeHByZXNzaW9uOiAgICAgc2ltcGxpZnlOZWdFeHAsXHJcbiAgICBDb25zdGFudEV4cHJlc3Npb246ICAgICBzaW1wbGlmeUNvbnN0YW50RXhwXHJcbiAgfSk7XHJcblxyXG4gIHJldHVybiBzaW1wbGlmeShhc3QpO1xyXG59OyIsIlN0cmluZy5wcm90b3R5cGUuc3VwcGxhbnQgPSBmdW5jdGlvbiAobykge1xyXG4gICAgcmV0dXJuIHRoaXMucmVwbGFjZSgveyhbXnt9fV0qKX0vZyxcclxuICAgICAgICBmdW5jdGlvbiAoYSwgYikge1xyXG4gICAgICAgICAgICB2YXIgciA9IG9bYl07XHJcbiAgICAgICAgICAgIHJldHVybiB0eXBlb2YgciA9PT0gJ3N0cmluZycgfHwgdHlwZW9mIHIgPT09ICdudW1iZXInID8gciA6IGE7XHJcbiAgICAgICAgfVxyXG4gICAgKTtcclxufTtcclxuXHJcbk1hdGVtYXRpY2EuY29tcGlsZXIucGFzc2VzLnN0cmluZ2lmaWVyID0gZnVuY3Rpb24oYXN0KSB7XHJcbiAgZnVuY3Rpb24gaXNBc3NvY2lhdGl2ZShub2RlKXtcclxuICAgIHZhciBsZWZ0VHlwZSA9IG5vZGUubGVmdC50eXBlLFxyXG4gICAgICAgIHJpZ2h0VHlwZT0gbm9kZS5yaWdodC50eXBlLFxyXG4gICAgICAgIHR5cGUgID0gbm9kZS50eXBlLFxyXG4gICAgICAgIGFyZVNhbWVUeXBlID0gbGVmdFR5cGUgPT09IHJpZ2h0VHlwZSxcclxuICAgICAgICBpc1NjYWxhciA9IGZ1bmN0aW9uKHQpIHsgcmV0dXJuIHQgPT09ICdDb25zdGFudEV4cHJlc3Npb24nIHx8IHQgPT09ICdGdW5jdGlvbkludm9jYXRpb24nOyB9LFxyXG4gICAgICAgIGlzQWRkaXRpdmUgPSBmdW5jdGlvbih0KSB7IHJldHVybiB0ID09PSAnQWRkaXRpdmVFeHByZXNzaW9uJzsgfTtcclxuXHJcbiAgICByZXR1cm4gaXNBZGRpdGl2ZSh0eXBlKSAmJiAoYXJlU2FtZVR5cGUgfHwgKGlzU2NhbGFyKGxlZnRUeXBlKSAmJiBpc0FkZGl0aXZlKHJpZ2h0VHlwZSkpIHx8IChpc1NjYWxhcihyaWdodFR5cGUpICYmIGlzQWRkaXRpdmUobGVmdFR5cGUpKSk7IFxyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gc3RyaW5naWZ5RXhwKG5vZGUpe1xyXG4gICAgdmFyIHRlbXBsYXRlID0gaXNBc3NvY2lhdGl2ZShub2RlKSA/IFxyXG4gICAgICAne2xlZnR9IHtvcH0ge3JpZ2h0fScgOiBcclxuICAgICAgJyh7bGVmdH0pIHtvcH0gKHtyaWdodH0pJztcclxuXHJcbiAgICByZXR1cm4gdGVtcGxhdGUuc3VwcGxhbnQoe1xyXG4gICAgICBvcDogbm9kZS5vcGVyYXRvcixcclxuICAgICAgbGVmdDogc3RyaW5naWZ5KG5vZGUubGVmdCksXHJcbiAgICAgIHJpZ2h0OiBzdHJpbmdpZnkobm9kZS5yaWdodClcclxuICAgIH0pO1xyXG4gIH0gXHJcblxyXG4gIGZ1bmN0aW9uIHN0cmluZ2lmeU51bWJlcihub2RlKSB7IFxyXG4gICAgcmV0dXJuIG5vZGUudmFsdWU7IFxyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gc3RyaW5naWZ5TmVnRXhwKG5vZGUpIHsgXHJcbiAgICByZXR1cm4gJy17ZXhwcn0nLnN1cHBsYW50KHtcclxuICAgICAgZXhwcjogc3RyaW5naWZ5KG5vZGUubm9kZSlcclxuICAgIH0pOyBcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIHN0cmluZ2lmeU1hdHJpeChub2RlKSB7XHJcbiAgICByZXR1cm4gJ1t7ZX1dJy5zdXBwbGFudCh7XHJcbiAgICAgIGU6bm9kZS5lbGVtZW50cy5tYXAoIHN0cmluZ2lmeSApLmpvaW4oJzsgJylcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gc3RyaW5naWZ5VmVjdG9yKG5vZGUpIHtcclxuICAgIHJldHVybiBub2RlLmVsZW1lbnRzLm1hcCggc3RyaW5naWZ5ICkuam9pbignICcpO1xyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gc3RyaW5naWZ5QXNzaWdubWVudChub2RlKSB7XHJcbiAgICByZXR1cm4gJ3tsaHN9ID0ge3Joc30nLnN1cHBsYW50KHtcclxuICAgICAgbGhzOiBzdHJpbmdpZnkobm9kZS5sZWZ0KSxcclxuICAgICAgcmhzOiBzdHJpbmdpZnkobm9kZS5yaWdodClcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gc3RyaW5naWZ5RnVuY3Rpb25JbnYobm9kZSl7XHJcbiAgICB2YXIgdGVtcGxhdGUgPSAne25hbWV9JyArIChub2RlLnBhcmFtZXRlcnMubGVuZ3RoID8gJyh7cGFyYW1ldGVyc30pJyA6ICcnKTtcclxuICAgIHJldHVybiB0ZW1wbGF0ZS5zdXBwbGFudCh7XHJcbiAgICAgIG5hbWU6IG5vZGUubmFtZSxcclxuICAgICAgcGFyYW1ldGVyczogbm9kZS5wYXJhbWV0ZXJzLm1hcChzdHJpbmdpZnkpLmpvaW4oJywgJykgIFxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBzdHJpbmdpZnlQcm9ncmFtKG5vZGUpIHtcclxuICAgIHJldHVybiBub2RlLnN0YXRlbWVudHMubWFwKCBzdHJpbmdpZnkgKS5qb2luKCc7XFxuJyk7XHJcbiAgfVxyXG5cclxuXHJcbiAgdmFyIHN0cmluZ2lmeSA9IE1hdGVtYXRpY2EuY29tcGlsZXIuYnVpbGROb2RlVmlzaXRvcih7XHJcbiAgICBQcm9ncmFtOiAgICAgICAgICAgICAgICBzdHJpbmdpZnlQcm9ncmFtLCBcclxuICAgIElkZW50aWZpZXI6ICAgICAgICAgICAgIGZ1bmN0aW9uKG5vZGUpeyByZXR1cm4gbm9kZS5uYW1lOyB9LFxyXG4gICAgRnVuY3Rpb25JbnZvY2F0aW9uOiAgICAgc3RyaW5naWZ5RnVuY3Rpb25JbnYsXHJcbiAgICBBc3NpZ25tZW50OiAgICAgICAgICAgICBzdHJpbmdpZnlBc3NpZ25tZW50LFxyXG4gICAgTWF0cml4OiAgICAgICAgICAgICAgICAgc3RyaW5naWZ5TWF0cml4LFxyXG4gICAgVmVjdG9yOiAgICAgICAgICAgICAgICAgc3RyaW5naWZ5VmVjdG9yLCBcclxuICAgIExvZ2ljYWxFeHByZXNzaW9uOiAgICAgIHN0cmluZ2lmeUV4cCxcclxuICAgIENvbXBhcmFyaXNvbkV4cHJlc3Npb246IHN0cmluZ2lmeUV4cCxcclxuICAgIEFkZGl0aXZlRXhwcmVzc2lvbjogICAgIHN0cmluZ2lmeUV4cCxcclxuICAgIE11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbjogIHN0cmluZ2lmeUV4cCxcclxuICAgIE5lZ2F0aXZlRXhwcmVzc2lvbjogICAgIHN0cmluZ2lmeU5lZ0V4cCxcclxuICAgIENvbnN0YW50RXhwcmVzc2lvbjogICAgIHN0cmluZ2lmeU51bWJlclxyXG4gIH0pO1xyXG5cclxuICByZXR1cm4gc3RyaW5naWZ5KGFzdCk7XHJcbn07IiwibW9kdWxlLmV4cG9ydHMuc3ltdGFibGUgPSB7XHJcblxyXG4gIHNjb3BlIDoge30sXHJcblxyXG4gIHJlZ2lzdGVyIDogZnVuY3Rpb24obmFtZSwgbm9kZSl7XHJcbiAgICB2YXIgbWUgPSB0aGlzO1xyXG4gICAgbWUuc2NvcGVbbmFtZV0gPSBub2RlOyAgXHJcbiAgfSxcclxuXHJcbiAgcmVzb2x2ZTogZnVuY3Rpb24obmFtZSl7XHJcbiAgICB2YXIgbWUgPSB0aGlzLFxyXG4gICAgICAgIGN1cl9zY29wZSA9IG1lLnNjb3BlLCBzeW07XHJcblxyXG4gICAgd2hpbGUoY3VyX3Njb3BlKXtcclxuICAgICAgc3ltID0gY3VyX3Njb3BlW25hbWVdO1xyXG4gICAgICBpZihzeW0pIHJldHVybiBzeW07XHJcbiAgICAgIGN1cl9zY29wZSA9IGN1cl9zY29wZS5fX19fcGFyZW50X19fXztcclxuICAgIH1cclxuICAgIHJldHVybiB1bmRlZmluZWQ7XHJcbiAgfSxcclxuXHJcbiAgZW50ZXJfc2NvcGU6ICBmdW5jdGlvbigpe1xyXG4gICAgdmFyIG1lID0gdGhpcztcclxuICAgIG1lLnNjb3BlLl9fX19uZXh0X19fXyA9IHsgXHJcbiAgICAgIF9fX19wYXJlbnRfX19fOiBtZS5zY29wZVxyXG4gICAgfTtcclxuICAgIG1lLnNjb3BlID0gbWUuc2NvcGUuX19fX25leHRfX19fO1xyXG4gIH0sXHJcblxyXG4gIGV4aXRfc2NvcGU6ICBmdW5jdGlvbigpe1xyXG4gICAgdmFyIG1lID0gdGhpcztcclxuICAgIG1lLnNjb3BlID0gbWUuc2NvcGUuX19fX3BhcmVudF9fX187ICAgIFxyXG4gIH1cclxufTtcclxuIiwiTWF0ZW1hdGljYS5wYXJzZXIgPSAoZnVuY3Rpb24oKXtcbiAgLypcbiAgICogR2VuZXJhdGVkIGJ5IFBFRy5qcyAwLjcuMC5cbiAgICpcbiAgICogaHR0cDovL3BlZ2pzLm1hamRhLmN6L1xuICAgKi9cbiAgXG4gIGZ1bmN0aW9uIHF1b3RlKHMpIHtcbiAgICAvKlxuICAgICAqIEVDTUEtMjYyLCA1dGggZWQuLCA3LjguNDogQWxsIGNoYXJhY3RlcnMgbWF5IGFwcGVhciBsaXRlcmFsbHkgaW4gYVxuICAgICAqIHN0cmluZyBsaXRlcmFsIGV4Y2VwdCBmb3IgdGhlIGNsb3NpbmcgcXVvdGUgY2hhcmFjdGVyLCBiYWNrc2xhc2gsXG4gICAgICogY2FycmlhZ2UgcmV0dXJuLCBsaW5lIHNlcGFyYXRvciwgcGFyYWdyYXBoIHNlcGFyYXRvciwgYW5kIGxpbmUgZmVlZC5cbiAgICAgKiBBbnkgY2hhcmFjdGVyIG1heSBhcHBlYXIgaW4gdGhlIGZvcm0gb2YgYW4gZXNjYXBlIHNlcXVlbmNlLlxuICAgICAqXG4gICAgICogRm9yIHBvcnRhYmlsaXR5LCB3ZSBhbHNvIGVzY2FwZSBlc2NhcGUgYWxsIGNvbnRyb2wgYW5kIG5vbi1BU0NJSVxuICAgICAqIGNoYXJhY3RlcnMuIE5vdGUgdGhhdCBcIlxcMFwiIGFuZCBcIlxcdlwiIGVzY2FwZSBzZXF1ZW5jZXMgYXJlIG5vdCB1c2VkXG4gICAgICogYmVjYXVzZSBKU0hpbnQgZG9lcyBub3QgbGlrZSB0aGUgZmlyc3QgYW5kIElFIHRoZSBzZWNvbmQuXG4gICAgICovXG4gICAgIHJldHVybiAnXCInICsgc1xuICAgICAgLnJlcGxhY2UoL1xcXFwvZywgJ1xcXFxcXFxcJykgIC8vIGJhY2tzbGFzaFxuICAgICAgLnJlcGxhY2UoL1wiL2csICdcXFxcXCInKSAgICAvLyBjbG9zaW5nIHF1b3RlIGNoYXJhY3RlclxuICAgICAgLnJlcGxhY2UoL1xceDA4L2csICdcXFxcYicpIC8vIGJhY2tzcGFjZVxuICAgICAgLnJlcGxhY2UoL1xcdC9nLCAnXFxcXHQnKSAgIC8vIGhvcml6b250YWwgdGFiXG4gICAgICAucmVwbGFjZSgvXFxuL2csICdcXFxcbicpICAgLy8gbGluZSBmZWVkXG4gICAgICAucmVwbGFjZSgvXFxmL2csICdcXFxcZicpICAgLy8gZm9ybSBmZWVkXG4gICAgICAucmVwbGFjZSgvXFxyL2csICdcXFxccicpICAgLy8gY2FycmlhZ2UgcmV0dXJuXG4gICAgICAucmVwbGFjZSgvW1xceDAwLVxceDA3XFx4MEJcXHgwRS1cXHgxRlxceDgwLVxcdUZGRkZdL2csIGVzY2FwZSlcbiAgICAgICsgJ1wiJztcbiAgfVxuICBcbiAgdmFyIHJlc3VsdCA9IHtcbiAgICAvKlxuICAgICAqIFBhcnNlcyB0aGUgaW5wdXQgd2l0aCBhIGdlbmVyYXRlZCBwYXJzZXIuIElmIHRoZSBwYXJzaW5nIGlzIHN1Y2Nlc3NmdWxsLFxuICAgICAqIHJldHVybnMgYSB2YWx1ZSBleHBsaWNpdGx5IG9yIGltcGxpY2l0bHkgc3BlY2lmaWVkIGJ5IHRoZSBncmFtbWFyIGZyb21cbiAgICAgKiB3aGljaCB0aGUgcGFyc2VyIHdhcyBnZW5lcmF0ZWQgKHNlZSB8UEVHLmJ1aWxkUGFyc2VyfCkuIElmIHRoZSBwYXJzaW5nIGlzXG4gICAgICogdW5zdWNjZXNzZnVsLCB0aHJvd3MgfFBFRy5wYXJzZXIuU3ludGF4RXJyb3J8IGRlc2NyaWJpbmcgdGhlIGVycm9yLlxuICAgICAqL1xuICAgIHBhcnNlOiBmdW5jdGlvbihpbnB1dCwgc3RhcnRSdWxlKSB7XG4gICAgICB2YXIgcGFyc2VGdW5jdGlvbnMgPSB7XG4gICAgICAgIFwiU291cmNlQ2hhcmFjdGVyXCI6IHBhcnNlX1NvdXJjZUNoYXJhY3RlcixcbiAgICAgICAgXCJXaGl0ZVNwYWNlXCI6IHBhcnNlX1doaXRlU3BhY2UsXG4gICAgICAgIFwiTGluZVRlcm1pbmF0b3JcIjogcGFyc2VfTGluZVRlcm1pbmF0b3IsXG4gICAgICAgIFwiTGluZVRlcm1pbmF0b3JTZXF1ZW5jZVwiOiBwYXJzZV9MaW5lVGVybWluYXRvclNlcXVlbmNlLFxuICAgICAgICBcIkNvbW1lbnRcIjogcGFyc2VfQ29tbWVudCxcbiAgICAgICAgXCJNdWx0aUxpbmVDb21tZW50XCI6IHBhcnNlX011bHRpTGluZUNvbW1lbnQsXG4gICAgICAgIFwiTXVsdGlMaW5lQ29tbWVudE5vTGluZVRlcm1pbmF0b3JcIjogcGFyc2VfTXVsdGlMaW5lQ29tbWVudE5vTGluZVRlcm1pbmF0b3IsXG4gICAgICAgIFwiU2luZ2xlTGluZUNvbW1lbnRcIjogcGFyc2VfU2luZ2xlTGluZUNvbW1lbnQsXG4gICAgICAgIFwiWnNcIjogcGFyc2VfWnMsXG4gICAgICAgIFwiX1wiOiBwYXJzZV9fLFxuICAgICAgICBcIl9fXCI6IHBhcnNlX19fLFxuICAgICAgICBcImxldHRlclwiOiBwYXJzZV9sZXR0ZXIsXG4gICAgICAgIFwiZGlnaXRcIjogcGFyc2VfZGlnaXQsXG4gICAgICAgIFwiT1NfQlJBQ0tFVFwiOiBwYXJzZV9PU19CUkFDS0VULFxuICAgICAgICBcIkNTX0JSQUNLRVRcIjogcGFyc2VfQ1NfQlJBQ0tFVCxcbiAgICAgICAgXCJPX1BBUlwiOiBwYXJzZV9PX1BBUixcbiAgICAgICAgXCJDX1BBUlwiOiBwYXJzZV9DX1BBUixcbiAgICAgICAgXCJDT0xPTlwiOiBwYXJzZV9DT0xPTixcbiAgICAgICAgXCJDT01NQVwiOiBwYXJzZV9DT01NQSxcbiAgICAgICAgXCJBTkRfT1BcIjogcGFyc2VfQU5EX09QLFxuICAgICAgICBcIk9SX09QXCI6IHBhcnNlX09SX09QLFxuICAgICAgICBcIk1VTF9PUFwiOiBwYXJzZV9NVUxfT1AsXG4gICAgICAgIFwiRElWX09QXCI6IHBhcnNlX0RJVl9PUCxcbiAgICAgICAgXCJFUV9PUFwiOiBwYXJzZV9FUV9PUCxcbiAgICAgICAgXCJORVFfT1BcIjogcGFyc2VfTkVRX09QLFxuICAgICAgICBcIkxUX09QXCI6IHBhcnNlX0xUX09QLFxuICAgICAgICBcIkdUX09QXCI6IHBhcnNlX0dUX09QLFxuICAgICAgICBcIkxURV9PUFwiOiBwYXJzZV9MVEVfT1AsXG4gICAgICAgIFwiR1RFX09QXCI6IHBhcnNlX0dURV9PUCxcbiAgICAgICAgXCJBRERfT1BcIjogcGFyc2VfQUREX09QLFxuICAgICAgICBcIk1JTl9PUFwiOiBwYXJzZV9NSU5fT1AsXG4gICAgICAgIFwiQVNTSUdOX09QXCI6IHBhcnNlX0FTU0lHTl9PUCxcbiAgICAgICAgXCJMT0dJQ0FMX09QU1wiOiBwYXJzZV9MT0dJQ0FMX09QUyxcbiAgICAgICAgXCJDT01QQVJJU09OX09QU1wiOiBwYXJzZV9DT01QQVJJU09OX09QUyxcbiAgICAgICAgXCJBRERJVElWRV9PUFNcIjogcGFyc2VfQURESVRJVkVfT1BTLFxuICAgICAgICBcIk1VTFRJUExJQ0FUSVZFX09QU1wiOiBwYXJzZV9NVUxUSVBMSUNBVElWRV9PUFMsXG4gICAgICAgIFwiU3RhdGVtZW50TGlzdFwiOiBwYXJzZV9TdGF0ZW1lbnRMaXN0LFxuICAgICAgICBcIlN0YXRlbWVudFwiOiBwYXJzZV9TdGF0ZW1lbnQsXG4gICAgICAgIFwiQXNzaWdubWVudFwiOiBwYXJzZV9Bc3NpZ25tZW50LFxuICAgICAgICBcIklkZW50aWZpZXJcIjogcGFyc2VfSWRlbnRpZmllcixcbiAgICAgICAgXCJNYXRyaXhcIjogcGFyc2VfTWF0cml4LFxuICAgICAgICBcIlZlY3RvclwiOiBwYXJzZV9WZWN0b3IsXG4gICAgICAgIFwiTG9naWNhbEV4cFwiOiBwYXJzZV9Mb2dpY2FsRXhwLFxuICAgICAgICBcIkNvbXBhcmFyaXNvbkV4cFwiOiBwYXJzZV9Db21wYXJhcmlzb25FeHAsXG4gICAgICAgIFwiQWRkaXRpdmVFeHBcIjogcGFyc2VfQWRkaXRpdmVFeHAsXG4gICAgICAgIFwiTXVsdGlwbGljYXRpdmVFeHBcIjogcGFyc2VfTXVsdGlwbGljYXRpdmVFeHAsXG4gICAgICAgIFwiU2ltcGxlRmFjdG9yRXhwXCI6IHBhcnNlX1NpbXBsZUZhY3RvckV4cCxcbiAgICAgICAgXCJGYWN0b3JFeHBcIjogcGFyc2VfRmFjdG9yRXhwLFxuICAgICAgICBcIk51bWJlclwiOiBwYXJzZV9OdW1iZXIsXG4gICAgICAgIFwiRnVuY3Rpb25JbnZvY2F0aW9uXCI6IHBhcnNlX0Z1bmN0aW9uSW52b2NhdGlvbixcbiAgICAgICAgXCJQYXJhbWV0ZXJMaXN0XCI6IHBhcnNlX1BhcmFtZXRlckxpc3RcbiAgICAgIH07XG4gICAgICBcbiAgICAgIGlmIChzdGFydFJ1bGUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpZiAocGFyc2VGdW5jdGlvbnNbc3RhcnRSdWxlXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiSW52YWxpZCBydWxlIG5hbWU6IFwiICsgcXVvdGUoc3RhcnRSdWxlKSArIFwiLlwiKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3RhcnRSdWxlID0gXCJTdGF0ZW1lbnRMaXN0XCI7XG4gICAgICB9XG4gICAgICBcbiAgICAgIHZhciBwb3MgPSAwO1xuICAgICAgdmFyIHJlcG9ydEZhaWx1cmVzID0gMDtcbiAgICAgIHZhciByaWdodG1vc3RGYWlsdXJlc1BvcyA9IDA7XG4gICAgICB2YXIgcmlnaHRtb3N0RmFpbHVyZXNFeHBlY3RlZCA9IFtdO1xuICAgICAgXG4gICAgICBmdW5jdGlvbiBwYWRMZWZ0KGlucHV0LCBwYWRkaW5nLCBsZW5ndGgpIHtcbiAgICAgICAgdmFyIHJlc3VsdCA9IGlucHV0O1xuICAgICAgICBcbiAgICAgICAgdmFyIHBhZExlbmd0aCA9IGxlbmd0aCAtIGlucHV0Lmxlbmd0aDtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwYWRMZW5ndGg7IGkrKykge1xuICAgICAgICAgIHJlc3VsdCA9IHBhZGRpbmcgKyByZXN1bHQ7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICB9XG4gICAgICBcbiAgICAgIGZ1bmN0aW9uIGVzY2FwZShjaCkge1xuICAgICAgICB2YXIgY2hhckNvZGUgPSBjaC5jaGFyQ29kZUF0KDApO1xuICAgICAgICB2YXIgZXNjYXBlQ2hhcjtcbiAgICAgICAgdmFyIGxlbmd0aDtcbiAgICAgICAgXG4gICAgICAgIGlmIChjaGFyQ29kZSA8PSAweEZGKSB7XG4gICAgICAgICAgZXNjYXBlQ2hhciA9ICd4JztcbiAgICAgICAgICBsZW5ndGggPSAyO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGVzY2FwZUNoYXIgPSAndSc7XG4gICAgICAgICAgbGVuZ3RoID0gNDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuICdcXFxcJyArIGVzY2FwZUNoYXIgKyBwYWRMZWZ0KGNoYXJDb2RlLnRvU3RyaW5nKDE2KS50b1VwcGVyQ2FzZSgpLCAnMCcsIGxlbmd0aCk7XG4gICAgICB9XG4gICAgICBcbiAgICAgIGZ1bmN0aW9uIG1hdGNoRmFpbGVkKGZhaWx1cmUpIHtcbiAgICAgICAgaWYgKHBvcyA8IHJpZ2h0bW9zdEZhaWx1cmVzUG9zKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAocG9zID4gcmlnaHRtb3N0RmFpbHVyZXNQb3MpIHtcbiAgICAgICAgICByaWdodG1vc3RGYWlsdXJlc1BvcyA9IHBvcztcbiAgICAgICAgICByaWdodG1vc3RGYWlsdXJlc0V4cGVjdGVkID0gW107XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJpZ2h0bW9zdEZhaWx1cmVzRXhwZWN0ZWQucHVzaChmYWlsdXJlKTtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgZnVuY3Rpb24gcGFyc2VfU291cmNlQ2hhcmFjdGVyKCkge1xuICAgICAgICB2YXIgcmVzdWx0MDtcbiAgICAgICAgXG4gICAgICAgIGlmIChpbnB1dC5sZW5ndGggPiBwb3MpIHtcbiAgICAgICAgICByZXN1bHQwID0gaW5wdXQuY2hhckF0KHBvcyk7XG4gICAgICAgICAgcG9zKys7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmVzdWx0MCA9IG51bGw7XG4gICAgICAgICAgaWYgKHJlcG9ydEZhaWx1cmVzID09PSAwKSB7XG4gICAgICAgICAgICBtYXRjaEZhaWxlZChcImFueSBjaGFyYWN0ZXJcIik7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQwO1xuICAgICAgfVxuICAgICAgXG4gICAgICBmdW5jdGlvbiBwYXJzZV9XaGl0ZVNwYWNlKCkge1xuICAgICAgICB2YXIgcmVzdWx0MDtcbiAgICAgICAgXG4gICAgICAgIHJlcG9ydEZhaWx1cmVzKys7XG4gICAgICAgIGlmICgvXltcXHRcXHgwQlxcZiBcXHhBMFxcdUZFRkZdLy50ZXN0KGlucHV0LmNoYXJBdChwb3MpKSkge1xuICAgICAgICAgIHJlc3VsdDAgPSBpbnB1dC5jaGFyQXQocG9zKTtcbiAgICAgICAgICBwb3MrKztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXN1bHQwID0gbnVsbDtcbiAgICAgICAgICBpZiAocmVwb3J0RmFpbHVyZXMgPT09IDApIHtcbiAgICAgICAgICAgIG1hdGNoRmFpbGVkKFwiW1xcXFx0XFxcXHgwQlxcXFxmIFxcXFx4QTBcXFxcdUZFRkZdXCIpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAocmVzdWx0MCA9PT0gbnVsbCkge1xuICAgICAgICAgIHJlc3VsdDAgPSBwYXJzZV9acygpO1xuICAgICAgICB9XG4gICAgICAgIHJlcG9ydEZhaWx1cmVzLS07XG4gICAgICAgIGlmIChyZXBvcnRGYWlsdXJlcyA9PT0gMCAmJiByZXN1bHQwID09PSBudWxsKSB7XG4gICAgICAgICAgbWF0Y2hGYWlsZWQoXCJ3aGl0ZXNwYWNlXCIpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQwO1xuICAgICAgfVxuICAgICAgXG4gICAgICBmdW5jdGlvbiBwYXJzZV9MaW5lVGVybWluYXRvcigpIHtcbiAgICAgICAgdmFyIHJlc3VsdDA7XG4gICAgICAgIFxuICAgICAgICBpZiAoL15bXFxuXFxyXFx1MjAyOFxcdTIwMjldLy50ZXN0KGlucHV0LmNoYXJBdChwb3MpKSkge1xuICAgICAgICAgIHJlc3VsdDAgPSBpbnB1dC5jaGFyQXQocG9zKTtcbiAgICAgICAgICBwb3MrKztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXN1bHQwID0gbnVsbDtcbiAgICAgICAgICBpZiAocmVwb3J0RmFpbHVyZXMgPT09IDApIHtcbiAgICAgICAgICAgIG1hdGNoRmFpbGVkKFwiW1xcXFxuXFxcXHJcXFxcdTIwMjhcXFxcdTIwMjldXCIpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0MDtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgZnVuY3Rpb24gcGFyc2VfTGluZVRlcm1pbmF0b3JTZXF1ZW5jZSgpIHtcbiAgICAgICAgdmFyIHJlc3VsdDA7XG4gICAgICAgIFxuICAgICAgICByZXBvcnRGYWlsdXJlcysrO1xuICAgICAgICBpZiAoaW5wdXQuY2hhckNvZGVBdChwb3MpID09PSAxMCkge1xuICAgICAgICAgIHJlc3VsdDAgPSBcIlxcblwiO1xuICAgICAgICAgIHBvcysrO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJlc3VsdDAgPSBudWxsO1xuICAgICAgICAgIGlmIChyZXBvcnRGYWlsdXJlcyA9PT0gMCkge1xuICAgICAgICAgICAgbWF0Y2hGYWlsZWQoXCJcXFwiXFxcXG5cXFwiXCIpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAocmVzdWx0MCA9PT0gbnVsbCkge1xuICAgICAgICAgIGlmIChpbnB1dC5zdWJzdHIocG9zLCAyKSA9PT0gXCJcXHJcXG5cIikge1xuICAgICAgICAgICAgcmVzdWx0MCA9IFwiXFxyXFxuXCI7XG4gICAgICAgICAgICBwb3MgKz0gMjtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVzdWx0MCA9IG51bGw7XG4gICAgICAgICAgICBpZiAocmVwb3J0RmFpbHVyZXMgPT09IDApIHtcbiAgICAgICAgICAgICAgbWF0Y2hGYWlsZWQoXCJcXFwiXFxcXHJcXFxcblxcXCJcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChyZXN1bHQwID09PSBudWxsKSB7XG4gICAgICAgICAgICBpZiAoaW5wdXQuY2hhckNvZGVBdChwb3MpID09PSAxMykge1xuICAgICAgICAgICAgICByZXN1bHQwID0gXCJcXHJcIjtcbiAgICAgICAgICAgICAgcG9zKys7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICByZXN1bHQwID0gbnVsbDtcbiAgICAgICAgICAgICAgaWYgKHJlcG9ydEZhaWx1cmVzID09PSAwKSB7XG4gICAgICAgICAgICAgICAgbWF0Y2hGYWlsZWQoXCJcXFwiXFxcXHJcXFwiXCIpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAocmVzdWx0MCA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICBpZiAoaW5wdXQuY2hhckNvZGVBdChwb3MpID09PSA4MjMyKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0MCA9IFwiXFx1MjAyOFwiO1xuICAgICAgICAgICAgICAgIHBvcysrO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlc3VsdDAgPSBudWxsO1xuICAgICAgICAgICAgICAgIGlmIChyZXBvcnRGYWlsdXJlcyA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgbWF0Y2hGYWlsZWQoXCJcXFwiXFxcXHUyMDI4XFxcIlwiKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgaWYgKHJlc3VsdDAgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICBpZiAoaW5wdXQuY2hhckNvZGVBdChwb3MpID09PSA4MjMzKSB7XG4gICAgICAgICAgICAgICAgICByZXN1bHQwID0gXCJcXHUyMDI5XCI7XG4gICAgICAgICAgICAgICAgICBwb3MrKztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgcmVzdWx0MCA9IG51bGw7XG4gICAgICAgICAgICAgICAgICBpZiAocmVwb3J0RmFpbHVyZXMgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgbWF0Y2hGYWlsZWQoXCJcXFwiXFxcXHUyMDI5XFxcIlwiKTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmVwb3J0RmFpbHVyZXMtLTtcbiAgICAgICAgaWYgKHJlcG9ydEZhaWx1cmVzID09PSAwICYmIHJlc3VsdDAgPT09IG51bGwpIHtcbiAgICAgICAgICBtYXRjaEZhaWxlZChcImVuZCBvZiBsaW5lXCIpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQwO1xuICAgICAgfVxuICAgICAgXG4gICAgICBmdW5jdGlvbiBwYXJzZV9Db21tZW50KCkge1xuICAgICAgICB2YXIgcmVzdWx0MDtcbiAgICAgICAgXG4gICAgICAgIHJlcG9ydEZhaWx1cmVzKys7XG4gICAgICAgIHJlc3VsdDAgPSBwYXJzZV9NdWx0aUxpbmVDb21tZW50KCk7XG4gICAgICAgIGlmIChyZXN1bHQwID09PSBudWxsKSB7XG4gICAgICAgICAgcmVzdWx0MCA9IHBhcnNlX1NpbmdsZUxpbmVDb21tZW50KCk7XG4gICAgICAgIH1cbiAgICAgICAgcmVwb3J0RmFpbHVyZXMtLTtcbiAgICAgICAgaWYgKHJlcG9ydEZhaWx1cmVzID09PSAwICYmIHJlc3VsdDAgPT09IG51bGwpIHtcbiAgICAgICAgICBtYXRjaEZhaWxlZChcImNvbW1lbnRcIik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDA7XG4gICAgICB9XG4gICAgICBcbiAgICAgIGZ1bmN0aW9uIHBhcnNlX011bHRpTGluZUNvbW1lbnQoKSB7XG4gICAgICAgIHZhciByZXN1bHQwLCByZXN1bHQxLCByZXN1bHQyLCByZXN1bHQzO1xuICAgICAgICB2YXIgcG9zMCwgcG9zMSwgcG9zMjtcbiAgICAgICAgXG4gICAgICAgIHBvczAgPSBwb3M7XG4gICAgICAgIGlmIChpbnB1dC5zdWJzdHIocG9zLCAyKSA9PT0gXCIvKlwiKSB7XG4gICAgICAgICAgcmVzdWx0MCA9IFwiLypcIjtcbiAgICAgICAgICBwb3MgKz0gMjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXN1bHQwID0gbnVsbDtcbiAgICAgICAgICBpZiAocmVwb3J0RmFpbHVyZXMgPT09IDApIHtcbiAgICAgICAgICAgIG1hdGNoRmFpbGVkKFwiXFxcIi8qXFxcIlwiKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJlc3VsdDAgIT09IG51bGwpIHtcbiAgICAgICAgICByZXN1bHQxID0gW107XG4gICAgICAgICAgcG9zMSA9IHBvcztcbiAgICAgICAgICBwb3MyID0gcG9zO1xuICAgICAgICAgIHJlcG9ydEZhaWx1cmVzKys7XG4gICAgICAgICAgaWYgKGlucHV0LnN1YnN0cihwb3MsIDIpID09PSBcIiovXCIpIHtcbiAgICAgICAgICAgIHJlc3VsdDIgPSBcIiovXCI7XG4gICAgICAgICAgICBwb3MgKz0gMjtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVzdWx0MiA9IG51bGw7XG4gICAgICAgICAgICBpZiAocmVwb3J0RmFpbHVyZXMgPT09IDApIHtcbiAgICAgICAgICAgICAgbWF0Y2hGYWlsZWQoXCJcXFwiKi9cXFwiXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICByZXBvcnRGYWlsdXJlcy0tO1xuICAgICAgICAgIGlmIChyZXN1bHQyID09PSBudWxsKSB7XG4gICAgICAgICAgICByZXN1bHQyID0gXCJcIjtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVzdWx0MiA9IG51bGw7XG4gICAgICAgICAgICBwb3MgPSBwb3MyO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAocmVzdWx0MiAhPT0gbnVsbCkge1xuICAgICAgICAgICAgcmVzdWx0MyA9IHBhcnNlX1NvdXJjZUNoYXJhY3RlcigpO1xuICAgICAgICAgICAgaWYgKHJlc3VsdDMgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgcmVzdWx0MiA9IFtyZXN1bHQyLCByZXN1bHQzXTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHJlc3VsdDIgPSBudWxsO1xuICAgICAgICAgICAgICBwb3MgPSBwb3MxO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXN1bHQyID0gbnVsbDtcbiAgICAgICAgICAgIHBvcyA9IHBvczE7XG4gICAgICAgICAgfVxuICAgICAgICAgIHdoaWxlIChyZXN1bHQyICE9PSBudWxsKSB7XG4gICAgICAgICAgICByZXN1bHQxLnB1c2gocmVzdWx0Mik7XG4gICAgICAgICAgICBwb3MxID0gcG9zO1xuICAgICAgICAgICAgcG9zMiA9IHBvcztcbiAgICAgICAgICAgIHJlcG9ydEZhaWx1cmVzKys7XG4gICAgICAgICAgICBpZiAoaW5wdXQuc3Vic3RyKHBvcywgMikgPT09IFwiKi9cIikge1xuICAgICAgICAgICAgICByZXN1bHQyID0gXCIqL1wiO1xuICAgICAgICAgICAgICBwb3MgKz0gMjtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHJlc3VsdDIgPSBudWxsO1xuICAgICAgICAgICAgICBpZiAocmVwb3J0RmFpbHVyZXMgPT09IDApIHtcbiAgICAgICAgICAgICAgICBtYXRjaEZhaWxlZChcIlxcXCIqL1xcXCJcIik7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJlcG9ydEZhaWx1cmVzLS07XG4gICAgICAgICAgICBpZiAocmVzdWx0MiA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICByZXN1bHQyID0gXCJcIjtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHJlc3VsdDIgPSBudWxsO1xuICAgICAgICAgICAgICBwb3MgPSBwb3MyO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHJlc3VsdDIgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgcmVzdWx0MyA9IHBhcnNlX1NvdXJjZUNoYXJhY3RlcigpO1xuICAgICAgICAgICAgICBpZiAocmVzdWx0MyAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIHJlc3VsdDIgPSBbcmVzdWx0MiwgcmVzdWx0M107XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0MiA9IG51bGw7XG4gICAgICAgICAgICAgICAgcG9zID0gcG9zMTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgcmVzdWx0MiA9IG51bGw7XG4gICAgICAgICAgICAgIHBvcyA9IHBvczE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChyZXN1bHQxICE9PSBudWxsKSB7XG4gICAgICAgICAgICBpZiAoaW5wdXQuc3Vic3RyKHBvcywgMikgPT09IFwiKi9cIikge1xuICAgICAgICAgICAgICByZXN1bHQyID0gXCIqL1wiO1xuICAgICAgICAgICAgICBwb3MgKz0gMjtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHJlc3VsdDIgPSBudWxsO1xuICAgICAgICAgICAgICBpZiAocmVwb3J0RmFpbHVyZXMgPT09IDApIHtcbiAgICAgICAgICAgICAgICBtYXRjaEZhaWxlZChcIlxcXCIqL1xcXCJcIik7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChyZXN1bHQyICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgIHJlc3VsdDAgPSBbcmVzdWx0MCwgcmVzdWx0MSwgcmVzdWx0Ml07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICByZXN1bHQwID0gbnVsbDtcbiAgICAgICAgICAgICAgcG9zID0gcG9zMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVzdWx0MCA9IG51bGw7XG4gICAgICAgICAgICBwb3MgPSBwb3MwO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXN1bHQwID0gbnVsbDtcbiAgICAgICAgICBwb3MgPSBwb3MwO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQwO1xuICAgICAgfVxuICAgICAgXG4gICAgICBmdW5jdGlvbiBwYXJzZV9NdWx0aUxpbmVDb21tZW50Tm9MaW5lVGVybWluYXRvcigpIHtcbiAgICAgICAgdmFyIHJlc3VsdDAsIHJlc3VsdDEsIHJlc3VsdDIsIHJlc3VsdDM7XG4gICAgICAgIHZhciBwb3MwLCBwb3MxLCBwb3MyO1xuICAgICAgICBcbiAgICAgICAgcG9zMCA9IHBvcztcbiAgICAgICAgaWYgKGlucHV0LnN1YnN0cihwb3MsIDIpID09PSBcIi8qXCIpIHtcbiAgICAgICAgICByZXN1bHQwID0gXCIvKlwiO1xuICAgICAgICAgIHBvcyArPSAyO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJlc3VsdDAgPSBudWxsO1xuICAgICAgICAgIGlmIChyZXBvcnRGYWlsdXJlcyA9PT0gMCkge1xuICAgICAgICAgICAgbWF0Y2hGYWlsZWQoXCJcXFwiLypcXFwiXCIpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAocmVzdWx0MCAhPT0gbnVsbCkge1xuICAgICAgICAgIHJlc3VsdDEgPSBbXTtcbiAgICAgICAgICBwb3MxID0gcG9zO1xuICAgICAgICAgIHBvczIgPSBwb3M7XG4gICAgICAgICAgcmVwb3J0RmFpbHVyZXMrKztcbiAgICAgICAgICBpZiAoaW5wdXQuc3Vic3RyKHBvcywgMikgPT09IFwiKi9cIikge1xuICAgICAgICAgICAgcmVzdWx0MiA9IFwiKi9cIjtcbiAgICAgICAgICAgIHBvcyArPSAyO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXN1bHQyID0gbnVsbDtcbiAgICAgICAgICAgIGlmIChyZXBvcnRGYWlsdXJlcyA9PT0gMCkge1xuICAgICAgICAgICAgICBtYXRjaEZhaWxlZChcIlxcXCIqL1xcXCJcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChyZXN1bHQyID09PSBudWxsKSB7XG4gICAgICAgICAgICByZXN1bHQyID0gcGFyc2VfTGluZVRlcm1pbmF0b3IoKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmVwb3J0RmFpbHVyZXMtLTtcbiAgICAgICAgICBpZiAocmVzdWx0MiA9PT0gbnVsbCkge1xuICAgICAgICAgICAgcmVzdWx0MiA9IFwiXCI7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJlc3VsdDIgPSBudWxsO1xuICAgICAgICAgICAgcG9zID0gcG9zMjtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHJlc3VsdDIgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHJlc3VsdDMgPSBwYXJzZV9Tb3VyY2VDaGFyYWN0ZXIoKTtcbiAgICAgICAgICAgIGlmIChyZXN1bHQzICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgIHJlc3VsdDIgPSBbcmVzdWx0MiwgcmVzdWx0M107XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICByZXN1bHQyID0gbnVsbDtcbiAgICAgICAgICAgICAgcG9zID0gcG9zMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVzdWx0MiA9IG51bGw7XG4gICAgICAgICAgICBwb3MgPSBwb3MxO1xuICAgICAgICAgIH1cbiAgICAgICAgICB3aGlsZSAocmVzdWx0MiAhPT0gbnVsbCkge1xuICAgICAgICAgICAgcmVzdWx0MS5wdXNoKHJlc3VsdDIpO1xuICAgICAgICAgICAgcG9zMSA9IHBvcztcbiAgICAgICAgICAgIHBvczIgPSBwb3M7XG4gICAgICAgICAgICByZXBvcnRGYWlsdXJlcysrO1xuICAgICAgICAgICAgaWYgKGlucHV0LnN1YnN0cihwb3MsIDIpID09PSBcIiovXCIpIHtcbiAgICAgICAgICAgICAgcmVzdWx0MiA9IFwiKi9cIjtcbiAgICAgICAgICAgICAgcG9zICs9IDI7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICByZXN1bHQyID0gbnVsbDtcbiAgICAgICAgICAgICAgaWYgKHJlcG9ydEZhaWx1cmVzID09PSAwKSB7XG4gICAgICAgICAgICAgICAgbWF0Y2hGYWlsZWQoXCJcXFwiKi9cXFwiXCIpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAocmVzdWx0MiA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICByZXN1bHQyID0gcGFyc2VfTGluZVRlcm1pbmF0b3IoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJlcG9ydEZhaWx1cmVzLS07XG4gICAgICAgICAgICBpZiAocmVzdWx0MiA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICByZXN1bHQyID0gXCJcIjtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHJlc3VsdDIgPSBudWxsO1xuICAgICAgICAgICAgICBwb3MgPSBwb3MyO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHJlc3VsdDIgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgcmVzdWx0MyA9IHBhcnNlX1NvdXJjZUNoYXJhY3RlcigpO1xuICAgICAgICAgICAgICBpZiAocmVzdWx0MyAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIHJlc3VsdDIgPSBbcmVzdWx0MiwgcmVzdWx0M107XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0MiA9IG51bGw7XG4gICAgICAgICAgICAgICAgcG9zID0gcG9zMTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgcmVzdWx0MiA9IG51bGw7XG4gICAgICAgICAgICAgIHBvcyA9IHBvczE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChyZXN1bHQxICE9PSBudWxsKSB7XG4gICAgICAgICAgICBpZiAoaW5wdXQuc3Vic3RyKHBvcywgMikgPT09IFwiKi9cIikge1xuICAgICAgICAgICAgICByZXN1bHQyID0gXCIqL1wiO1xuICAgICAgICAgICAgICBwb3MgKz0gMjtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHJlc3VsdDIgPSBudWxsO1xuICAgICAgICAgICAgICBpZiAocmVwb3J0RmFpbHVyZXMgPT09IDApIHtcbiAgICAgICAgICAgICAgICBtYXRjaEZhaWxlZChcIlxcXCIqL1xcXCJcIik7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChyZXN1bHQyICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgIHJlc3VsdDAgPSBbcmVzdWx0MCwgcmVzdWx0MSwgcmVzdWx0Ml07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICByZXN1bHQwID0gbnVsbDtcbiAgICAgICAgICAgICAgcG9zID0gcG9zMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVzdWx0MCA9IG51bGw7XG4gICAgICAgICAgICBwb3MgPSBwb3MwO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXN1bHQwID0gbnVsbDtcbiAgICAgICAgICBwb3MgPSBwb3MwO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQwO1xuICAgICAgfVxuICAgICAgXG4gICAgICBmdW5jdGlvbiBwYXJzZV9TaW5nbGVMaW5lQ29tbWVudCgpIHtcbiAgICAgICAgdmFyIHJlc3VsdDAsIHJlc3VsdDEsIHJlc3VsdDIsIHJlc3VsdDM7XG4gICAgICAgIHZhciBwb3MwLCBwb3MxLCBwb3MyO1xuICAgICAgICBcbiAgICAgICAgcG9zMCA9IHBvcztcbiAgICAgICAgaWYgKGlucHV0LnN1YnN0cihwb3MsIDIpID09PSBcIi8vXCIpIHtcbiAgICAgICAgICByZXN1bHQwID0gXCIvL1wiO1xuICAgICAgICAgIHBvcyArPSAyO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJlc3VsdDAgPSBudWxsO1xuICAgICAgICAgIGlmIChyZXBvcnRGYWlsdXJlcyA9PT0gMCkge1xuICAgICAgICAgICAgbWF0Y2hGYWlsZWQoXCJcXFwiLy9cXFwiXCIpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAocmVzdWx0MCAhPT0gbnVsbCkge1xuICAgICAgICAgIHJlc3VsdDEgPSBbXTtcbiAgICAgICAgICBwb3MxID0gcG9zO1xuICAgICAgICAgIHBvczIgPSBwb3M7XG4gICAgICAgICAgcmVwb3J0RmFpbHVyZXMrKztcbiAgICAgICAgICByZXN1bHQyID0gcGFyc2VfTGluZVRlcm1pbmF0b3IoKTtcbiAgICAgICAgICByZXBvcnRGYWlsdXJlcy0tO1xuICAgICAgICAgIGlmIChyZXN1bHQyID09PSBudWxsKSB7XG4gICAgICAgICAgICByZXN1bHQyID0gXCJcIjtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVzdWx0MiA9IG51bGw7XG4gICAgICAgICAgICBwb3MgPSBwb3MyO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAocmVzdWx0MiAhPT0gbnVsbCkge1xuICAgICAgICAgICAgcmVzdWx0MyA9IHBhcnNlX1NvdXJjZUNoYXJhY3RlcigpO1xuICAgICAgICAgICAgaWYgKHJlc3VsdDMgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgcmVzdWx0MiA9IFtyZXN1bHQyLCByZXN1bHQzXTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHJlc3VsdDIgPSBudWxsO1xuICAgICAgICAgICAgICBwb3MgPSBwb3MxO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXN1bHQyID0gbnVsbDtcbiAgICAgICAgICAgIHBvcyA9IHBvczE7XG4gICAgICAgICAgfVxuICAgICAgICAgIHdoaWxlIChyZXN1bHQyICE9PSBudWxsKSB7XG4gICAgICAgICAgICByZXN1bHQxLnB1c2gocmVzdWx0Mik7XG4gICAgICAgICAgICBwb3MxID0gcG9zO1xuICAgICAgICAgICAgcG9zMiA9IHBvcztcbiAgICAgICAgICAgIHJlcG9ydEZhaWx1cmVzKys7XG4gICAgICAgICAgICByZXN1bHQyID0gcGFyc2VfTGluZVRlcm1pbmF0b3IoKTtcbiAgICAgICAgICAgIHJlcG9ydEZhaWx1cmVzLS07XG4gICAgICAgICAgICBpZiAocmVzdWx0MiA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICByZXN1bHQyID0gXCJcIjtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHJlc3VsdDIgPSBudWxsO1xuICAgICAgICAgICAgICBwb3MgPSBwb3MyO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHJlc3VsdDIgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgcmVzdWx0MyA9IHBhcnNlX1NvdXJjZUNoYXJhY3RlcigpO1xuICAgICAgICAgICAgICBpZiAocmVzdWx0MyAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIHJlc3VsdDIgPSBbcmVzdWx0MiwgcmVzdWx0M107XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0MiA9IG51bGw7XG4gICAgICAgICAgICAgICAgcG9zID0gcG9zMTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgcmVzdWx0MiA9IG51bGw7XG4gICAgICAgICAgICAgIHBvcyA9IHBvczE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChyZXN1bHQxICE9PSBudWxsKSB7XG4gICAgICAgICAgICByZXN1bHQwID0gW3Jlc3VsdDAsIHJlc3VsdDFdO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXN1bHQwID0gbnVsbDtcbiAgICAgICAgICAgIHBvcyA9IHBvczA7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJlc3VsdDAgPSBudWxsO1xuICAgICAgICAgIHBvcyA9IHBvczA7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDA7XG4gICAgICB9XG4gICAgICBcbiAgICAgIGZ1bmN0aW9uIHBhcnNlX1pzKCkge1xuICAgICAgICB2YXIgcmVzdWx0MDtcbiAgICAgICAgXG4gICAgICAgIGlmICgvXlsgXFx4QTBcXHUxNjgwXFx1MTgwRVxcdTIwMDBcXHUyMDAxXFx1MjAwMlxcdTIwMDNcXHUyMDA0XFx1MjAwNVxcdTIwMDZcXHUyMDA3XFx1MjAwOFxcdTIwMDlcXHUyMDBBXFx1MjAyRlxcdTIwNUZcXHUzMDAwXS8udGVzdChpbnB1dC5jaGFyQXQocG9zKSkpIHtcbiAgICAgICAgICByZXN1bHQwID0gaW5wdXQuY2hhckF0KHBvcyk7XG4gICAgICAgICAgcG9zKys7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmVzdWx0MCA9IG51bGw7XG4gICAgICAgICAgaWYgKHJlcG9ydEZhaWx1cmVzID09PSAwKSB7XG4gICAgICAgICAgICBtYXRjaEZhaWxlZChcIlsgXFxcXHhBMFxcXFx1MTY4MFxcXFx1MTgwRVxcXFx1MjAwMFxcXFx1MjAwMVxcXFx1MjAwMlxcXFx1MjAwM1xcXFx1MjAwNFxcXFx1MjAwNVxcXFx1MjAwNlxcXFx1MjAwN1xcXFx1MjAwOFxcXFx1MjAwOVxcXFx1MjAwQVxcXFx1MjAyRlxcXFx1MjA1RlxcXFx1MzAwMF1cIik7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQwO1xuICAgICAgfVxuICAgICAgXG4gICAgICBmdW5jdGlvbiBwYXJzZV9fKCkge1xuICAgICAgICB2YXIgcmVzdWx0MCwgcmVzdWx0MTtcbiAgICAgICAgXG4gICAgICAgIHJlc3VsdDAgPSBbXTtcbiAgICAgICAgcmVzdWx0MSA9IHBhcnNlX1doaXRlU3BhY2UoKTtcbiAgICAgICAgaWYgKHJlc3VsdDEgPT09IG51bGwpIHtcbiAgICAgICAgICByZXN1bHQxID0gcGFyc2VfTXVsdGlMaW5lQ29tbWVudE5vTGluZVRlcm1pbmF0b3IoKTtcbiAgICAgICAgICBpZiAocmVzdWx0MSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgcmVzdWx0MSA9IHBhcnNlX1NpbmdsZUxpbmVDb21tZW50KCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHdoaWxlIChyZXN1bHQxICE9PSBudWxsKSB7XG4gICAgICAgICAgcmVzdWx0MC5wdXNoKHJlc3VsdDEpO1xuICAgICAgICAgIHJlc3VsdDEgPSBwYXJzZV9XaGl0ZVNwYWNlKCk7XG4gICAgICAgICAgaWYgKHJlc3VsdDEgPT09IG51bGwpIHtcbiAgICAgICAgICAgIHJlc3VsdDEgPSBwYXJzZV9NdWx0aUxpbmVDb21tZW50Tm9MaW5lVGVybWluYXRvcigpO1xuICAgICAgICAgICAgaWYgKHJlc3VsdDEgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgcmVzdWx0MSA9IHBhcnNlX1NpbmdsZUxpbmVDb21tZW50KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQwO1xuICAgICAgfVxuICAgICAgXG4gICAgICBmdW5jdGlvbiBwYXJzZV9fXygpIHtcbiAgICAgICAgdmFyIHJlc3VsdDAsIHJlc3VsdDE7XG4gICAgICAgIFxuICAgICAgICByZXN1bHQwID0gW107XG4gICAgICAgIHJlc3VsdDEgPSBwYXJzZV9XaGl0ZVNwYWNlKCk7XG4gICAgICAgIGlmIChyZXN1bHQxID09PSBudWxsKSB7XG4gICAgICAgICAgcmVzdWx0MSA9IHBhcnNlX0xpbmVUZXJtaW5hdG9yU2VxdWVuY2UoKTtcbiAgICAgICAgICBpZiAocmVzdWx0MSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgcmVzdWx0MSA9IHBhcnNlX0NvbW1lbnQoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgd2hpbGUgKHJlc3VsdDEgIT09IG51bGwpIHtcbiAgICAgICAgICByZXN1bHQwLnB1c2gocmVzdWx0MSk7XG4gICAgICAgICAgcmVzdWx0MSA9IHBhcnNlX1doaXRlU3BhY2UoKTtcbiAgICAgICAgICBpZiAocmVzdWx0MSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgcmVzdWx0MSA9IHBhcnNlX0xpbmVUZXJtaW5hdG9yU2VxdWVuY2UoKTtcbiAgICAgICAgICAgIGlmIChyZXN1bHQxID09PSBudWxsKSB7XG4gICAgICAgICAgICAgIHJlc3VsdDEgPSBwYXJzZV9Db21tZW50KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQwO1xuICAgICAgfVxuICAgICAgXG4gICAgICBmdW5jdGlvbiBwYXJzZV9sZXR0ZXIoKSB7XG4gICAgICAgIHZhciByZXN1bHQwO1xuICAgICAgICBcbiAgICAgICAgaWYgKC9eW2Etel0vLnRlc3QoaW5wdXQuY2hhckF0KHBvcykpKSB7XG4gICAgICAgICAgcmVzdWx0MCA9IGlucHV0LmNoYXJBdChwb3MpO1xuICAgICAgICAgIHBvcysrO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJlc3VsdDAgPSBudWxsO1xuICAgICAgICAgIGlmIChyZXBvcnRGYWlsdXJlcyA9PT0gMCkge1xuICAgICAgICAgICAgbWF0Y2hGYWlsZWQoXCJbYS16XVwiKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJlc3VsdDAgPT09IG51bGwpIHtcbiAgICAgICAgICBpZiAoL15bQS1aXS8udGVzdChpbnB1dC5jaGFyQXQocG9zKSkpIHtcbiAgICAgICAgICAgIHJlc3VsdDAgPSBpbnB1dC5jaGFyQXQocG9zKTtcbiAgICAgICAgICAgIHBvcysrO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXN1bHQwID0gbnVsbDtcbiAgICAgICAgICAgIGlmIChyZXBvcnRGYWlsdXJlcyA9PT0gMCkge1xuICAgICAgICAgICAgICBtYXRjaEZhaWxlZChcIltBLVpdXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0MDtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgZnVuY3Rpb24gcGFyc2VfZGlnaXQoKSB7XG4gICAgICAgIHZhciByZXN1bHQwO1xuICAgICAgICBcbiAgICAgICAgaWYgKC9eWzAtOV0vLnRlc3QoaW5wdXQuY2hhckF0KHBvcykpKSB7XG4gICAgICAgICAgcmVzdWx0MCA9IGlucHV0LmNoYXJBdChwb3MpO1xuICAgICAgICAgIHBvcysrO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJlc3VsdDAgPSBudWxsO1xuICAgICAgICAgIGlmIChyZXBvcnRGYWlsdXJlcyA9PT0gMCkge1xuICAgICAgICAgICAgbWF0Y2hGYWlsZWQoXCJbMC05XVwiKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDA7XG4gICAgICB9XG4gICAgICBcbiAgICAgIGZ1bmN0aW9uIHBhcnNlX09TX0JSQUNLRVQoKSB7XG4gICAgICAgIHZhciByZXN1bHQwLCByZXN1bHQxLCByZXN1bHQyO1xuICAgICAgICB2YXIgcG9zMDtcbiAgICAgICAgXG4gICAgICAgIHBvczAgPSBwb3M7XG4gICAgICAgIHJlc3VsdDAgPSBwYXJzZV9fXygpO1xuICAgICAgICBpZiAocmVzdWx0MCAhPT0gbnVsbCkge1xuICAgICAgICAgIGlmIChpbnB1dC5jaGFyQ29kZUF0KHBvcykgPT09IDkxKSB7XG4gICAgICAgICAgICByZXN1bHQxID0gXCJbXCI7XG4gICAgICAgICAgICBwb3MrKztcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVzdWx0MSA9IG51bGw7XG4gICAgICAgICAgICBpZiAocmVwb3J0RmFpbHVyZXMgPT09IDApIHtcbiAgICAgICAgICAgICAgbWF0Y2hGYWlsZWQoXCJcXFwiW1xcXCJcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChyZXN1bHQxICE9PSBudWxsKSB7XG4gICAgICAgICAgICByZXN1bHQyID0gcGFyc2VfX18oKTtcbiAgICAgICAgICAgIGlmIChyZXN1bHQyICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgIHJlc3VsdDAgPSBbcmVzdWx0MCwgcmVzdWx0MSwgcmVzdWx0Ml07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICByZXN1bHQwID0gbnVsbDtcbiAgICAgICAgICAgICAgcG9zID0gcG9zMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVzdWx0MCA9IG51bGw7XG4gICAgICAgICAgICBwb3MgPSBwb3MwO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXN1bHQwID0gbnVsbDtcbiAgICAgICAgICBwb3MgPSBwb3MwO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQwO1xuICAgICAgfVxuICAgICAgXG4gICAgICBmdW5jdGlvbiBwYXJzZV9DU19CUkFDS0VUKCkge1xuICAgICAgICB2YXIgcmVzdWx0MCwgcmVzdWx0MSwgcmVzdWx0MjtcbiAgICAgICAgdmFyIHBvczA7XG4gICAgICAgIFxuICAgICAgICBwb3MwID0gcG9zO1xuICAgICAgICByZXN1bHQwID0gcGFyc2VfX18oKTtcbiAgICAgICAgaWYgKHJlc3VsdDAgIT09IG51bGwpIHtcbiAgICAgICAgICBpZiAoaW5wdXQuY2hhckNvZGVBdChwb3MpID09PSA5Mykge1xuICAgICAgICAgICAgcmVzdWx0MSA9IFwiXVwiO1xuICAgICAgICAgICAgcG9zKys7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJlc3VsdDEgPSBudWxsO1xuICAgICAgICAgICAgaWYgKHJlcG9ydEZhaWx1cmVzID09PSAwKSB7XG4gICAgICAgICAgICAgIG1hdGNoRmFpbGVkKFwiXFxcIl1cXFwiXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAocmVzdWx0MSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgcmVzdWx0MiA9IHBhcnNlX19fKCk7XG4gICAgICAgICAgICBpZiAocmVzdWx0MiAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICByZXN1bHQwID0gW3Jlc3VsdDAsIHJlc3VsdDEsIHJlc3VsdDJdO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgcmVzdWx0MCA9IG51bGw7XG4gICAgICAgICAgICAgIHBvcyA9IHBvczA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJlc3VsdDAgPSBudWxsO1xuICAgICAgICAgICAgcG9zID0gcG9zMDtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmVzdWx0MCA9IG51bGw7XG4gICAgICAgICAgcG9zID0gcG9zMDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0MDtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgZnVuY3Rpb24gcGFyc2VfT19QQVIoKSB7XG4gICAgICAgIHZhciByZXN1bHQwLCByZXN1bHQxLCByZXN1bHQyO1xuICAgICAgICB2YXIgcG9zMDtcbiAgICAgICAgXG4gICAgICAgIHBvczAgPSBwb3M7XG4gICAgICAgIHJlc3VsdDAgPSBwYXJzZV9fXygpO1xuICAgICAgICBpZiAocmVzdWx0MCAhPT0gbnVsbCkge1xuICAgICAgICAgIGlmIChpbnB1dC5jaGFyQ29kZUF0KHBvcykgPT09IDQwKSB7XG4gICAgICAgICAgICByZXN1bHQxID0gXCIoXCI7XG4gICAgICAgICAgICBwb3MrKztcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVzdWx0MSA9IG51bGw7XG4gICAgICAgICAgICBpZiAocmVwb3J0RmFpbHVyZXMgPT09IDApIHtcbiAgICAgICAgICAgICAgbWF0Y2hGYWlsZWQoXCJcXFwiKFxcXCJcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChyZXN1bHQxICE9PSBudWxsKSB7XG4gICAgICAgICAgICByZXN1bHQyID0gcGFyc2VfX18oKTtcbiAgICAgICAgICAgIGlmIChyZXN1bHQyICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgIHJlc3VsdDAgPSBbcmVzdWx0MCwgcmVzdWx0MSwgcmVzdWx0Ml07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICByZXN1bHQwID0gbnVsbDtcbiAgICAgICAgICAgICAgcG9zID0gcG9zMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVzdWx0MCA9IG51bGw7XG4gICAgICAgICAgICBwb3MgPSBwb3MwO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXN1bHQwID0gbnVsbDtcbiAgICAgICAgICBwb3MgPSBwb3MwO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQwO1xuICAgICAgfVxuICAgICAgXG4gICAgICBmdW5jdGlvbiBwYXJzZV9DX1BBUigpIHtcbiAgICAgICAgdmFyIHJlc3VsdDAsIHJlc3VsdDEsIHJlc3VsdDI7XG4gICAgICAgIHZhciBwb3MwO1xuICAgICAgICBcbiAgICAgICAgcG9zMCA9IHBvcztcbiAgICAgICAgcmVzdWx0MCA9IHBhcnNlX19fKCk7XG4gICAgICAgIGlmIChyZXN1bHQwICE9PSBudWxsKSB7XG4gICAgICAgICAgaWYgKGlucHV0LmNoYXJDb2RlQXQocG9zKSA9PT0gNDEpIHtcbiAgICAgICAgICAgIHJlc3VsdDEgPSBcIilcIjtcbiAgICAgICAgICAgIHBvcysrO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXN1bHQxID0gbnVsbDtcbiAgICAgICAgICAgIGlmIChyZXBvcnRGYWlsdXJlcyA9PT0gMCkge1xuICAgICAgICAgICAgICBtYXRjaEZhaWxlZChcIlxcXCIpXFxcIlwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHJlc3VsdDEgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHJlc3VsdDIgPSBwYXJzZV9fXygpO1xuICAgICAgICAgICAgaWYgKHJlc3VsdDIgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgcmVzdWx0MCA9IFtyZXN1bHQwLCByZXN1bHQxLCByZXN1bHQyXTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHJlc3VsdDAgPSBudWxsO1xuICAgICAgICAgICAgICBwb3MgPSBwb3MwO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXN1bHQwID0gbnVsbDtcbiAgICAgICAgICAgIHBvcyA9IHBvczA7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJlc3VsdDAgPSBudWxsO1xuICAgICAgICAgIHBvcyA9IHBvczA7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDA7XG4gICAgICB9XG4gICAgICBcbiAgICAgIGZ1bmN0aW9uIHBhcnNlX0NPTE9OKCkge1xuICAgICAgICB2YXIgcmVzdWx0MCwgcmVzdWx0MSwgcmVzdWx0MjtcbiAgICAgICAgdmFyIHBvczAsIHBvczE7XG4gICAgICAgIFxuICAgICAgICBwb3MwID0gcG9zO1xuICAgICAgICBwb3MxID0gcG9zO1xuICAgICAgICByZXN1bHQwID0gcGFyc2VfX18oKTtcbiAgICAgICAgaWYgKHJlc3VsdDAgIT09IG51bGwpIHtcbiAgICAgICAgICBpZiAoaW5wdXQuY2hhckNvZGVBdChwb3MpID09PSA1OSkge1xuICAgICAgICAgICAgcmVzdWx0MSA9IFwiO1wiO1xuICAgICAgICAgICAgcG9zKys7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJlc3VsdDEgPSBudWxsO1xuICAgICAgICAgICAgaWYgKHJlcG9ydEZhaWx1cmVzID09PSAwKSB7XG4gICAgICAgICAgICAgIG1hdGNoRmFpbGVkKFwiXFxcIjtcXFwiXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAocmVzdWx0MSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgcmVzdWx0MiA9IHBhcnNlX19fKCk7XG4gICAgICAgICAgICBpZiAocmVzdWx0MiAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICByZXN1bHQwID0gW3Jlc3VsdDAsIHJlc3VsdDEsIHJlc3VsdDJdO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgcmVzdWx0MCA9IG51bGw7XG4gICAgICAgICAgICAgIHBvcyA9IHBvczE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJlc3VsdDAgPSBudWxsO1xuICAgICAgICAgICAgcG9zID0gcG9zMTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmVzdWx0MCA9IG51bGw7XG4gICAgICAgICAgcG9zID0gcG9zMTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocmVzdWx0MCAhPT0gbnVsbCkge1xuICAgICAgICAgIHJlc3VsdDAgPSAoZnVuY3Rpb24ob2Zmc2V0KSB7IHJldHVybiAnOyc7IH0pKHBvczApO1xuICAgICAgICB9XG4gICAgICAgIGlmIChyZXN1bHQwID09PSBudWxsKSB7XG4gICAgICAgICAgcG9zID0gcG9zMDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0MDtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgZnVuY3Rpb24gcGFyc2VfQ09NTUEoKSB7XG4gICAgICAgIHZhciByZXN1bHQwLCByZXN1bHQxLCByZXN1bHQyO1xuICAgICAgICB2YXIgcG9zMCwgcG9zMTtcbiAgICAgICAgXG4gICAgICAgIHBvczAgPSBwb3M7XG4gICAgICAgIHBvczEgPSBwb3M7XG4gICAgICAgIHJlc3VsdDAgPSBwYXJzZV9fXygpO1xuICAgICAgICBpZiAocmVzdWx0MCAhPT0gbnVsbCkge1xuICAgICAgICAgIGlmIChpbnB1dC5jaGFyQ29kZUF0KHBvcykgPT09IDQ0KSB7XG4gICAgICAgICAgICByZXN1bHQxID0gXCIsXCI7XG4gICAgICAgICAgICBwb3MrKztcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVzdWx0MSA9IG51bGw7XG4gICAgICAgICAgICBpZiAocmVwb3J0RmFpbHVyZXMgPT09IDApIHtcbiAgICAgICAgICAgICAgbWF0Y2hGYWlsZWQoXCJcXFwiLFxcXCJcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChyZXN1bHQxICE9PSBudWxsKSB7XG4gICAgICAgICAgICByZXN1bHQyID0gcGFyc2VfX18oKTtcbiAgICAgICAgICAgIGlmIChyZXN1bHQyICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgIHJlc3VsdDAgPSBbcmVzdWx0MCwgcmVzdWx0MSwgcmVzdWx0Ml07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICByZXN1bHQwID0gbnVsbDtcbiAgICAgICAgICAgICAgcG9zID0gcG9zMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVzdWx0MCA9IG51bGw7XG4gICAgICAgICAgICBwb3MgPSBwb3MxO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXN1bHQwID0gbnVsbDtcbiAgICAgICAgICBwb3MgPSBwb3MxO1xuICAgICAgICB9XG4gICAgICAgIGlmIChyZXN1bHQwICE9PSBudWxsKSB7XG4gICAgICAgICAgcmVzdWx0MCA9IChmdW5jdGlvbihvZmZzZXQpIHsgcmV0dXJuICc7JzsgfSkocG9zMCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJlc3VsdDAgPT09IG51bGwpIHtcbiAgICAgICAgICBwb3MgPSBwb3MwO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQwO1xuICAgICAgfVxuICAgICAgXG4gICAgICBmdW5jdGlvbiBwYXJzZV9BTkRfT1AoKSB7XG4gICAgICAgIHZhciByZXN1bHQwLCByZXN1bHQxLCByZXN1bHQyO1xuICAgICAgICB2YXIgcG9zMCwgcG9zMTtcbiAgICAgICAgXG4gICAgICAgIHBvczAgPSBwb3M7XG4gICAgICAgIHBvczEgPSBwb3M7XG4gICAgICAgIHJlc3VsdDAgPSBwYXJzZV9fXygpO1xuICAgICAgICBpZiAocmVzdWx0MCAhPT0gbnVsbCkge1xuICAgICAgICAgIGlmIChpbnB1dC5zdWJzdHIocG9zLCAyKSA9PT0gXCImJlwiKSB7XG4gICAgICAgICAgICByZXN1bHQxID0gXCImJlwiO1xuICAgICAgICAgICAgcG9zICs9IDI7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJlc3VsdDEgPSBudWxsO1xuICAgICAgICAgICAgaWYgKHJlcG9ydEZhaWx1cmVzID09PSAwKSB7XG4gICAgICAgICAgICAgIG1hdGNoRmFpbGVkKFwiXFxcIiYmXFxcIlwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHJlc3VsdDEgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHJlc3VsdDIgPSBwYXJzZV9fXygpO1xuICAgICAgICAgICAgaWYgKHJlc3VsdDIgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgcmVzdWx0MCA9IFtyZXN1bHQwLCByZXN1bHQxLCByZXN1bHQyXTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHJlc3VsdDAgPSBudWxsO1xuICAgICAgICAgICAgICBwb3MgPSBwb3MxO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXN1bHQwID0gbnVsbDtcbiAgICAgICAgICAgIHBvcyA9IHBvczE7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJlc3VsdDAgPSBudWxsO1xuICAgICAgICAgIHBvcyA9IHBvczE7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJlc3VsdDAgIT09IG51bGwpIHtcbiAgICAgICAgICByZXN1bHQwID0gKGZ1bmN0aW9uKG9mZnNldCkgeyByZXR1cm4gJyYmJzsgfSkocG9zMCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJlc3VsdDAgPT09IG51bGwpIHtcbiAgICAgICAgICBwb3MgPSBwb3MwO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQwO1xuICAgICAgfVxuICAgICAgXG4gICAgICBmdW5jdGlvbiBwYXJzZV9PUl9PUCgpIHtcbiAgICAgICAgdmFyIHJlc3VsdDAsIHJlc3VsdDEsIHJlc3VsdDI7XG4gICAgICAgIHZhciBwb3MwLCBwb3MxO1xuICAgICAgICBcbiAgICAgICAgcG9zMCA9IHBvcztcbiAgICAgICAgcG9zMSA9IHBvcztcbiAgICAgICAgcmVzdWx0MCA9IHBhcnNlX19fKCk7XG4gICAgICAgIGlmIChyZXN1bHQwICE9PSBudWxsKSB7XG4gICAgICAgICAgaWYgKGlucHV0LnN1YnN0cihwb3MsIDIpID09PSBcInx8XCIpIHtcbiAgICAgICAgICAgIHJlc3VsdDEgPSBcInx8XCI7XG4gICAgICAgICAgICBwb3MgKz0gMjtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVzdWx0MSA9IG51bGw7XG4gICAgICAgICAgICBpZiAocmVwb3J0RmFpbHVyZXMgPT09IDApIHtcbiAgICAgICAgICAgICAgbWF0Y2hGYWlsZWQoXCJcXFwifHxcXFwiXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAocmVzdWx0MSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgcmVzdWx0MiA9IHBhcnNlX19fKCk7XG4gICAgICAgICAgICBpZiAocmVzdWx0MiAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICByZXN1bHQwID0gW3Jlc3VsdDAsIHJlc3VsdDEsIHJlc3VsdDJdO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgcmVzdWx0MCA9IG51bGw7XG4gICAgICAgICAgICAgIHBvcyA9IHBvczE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJlc3VsdDAgPSBudWxsO1xuICAgICAgICAgICAgcG9zID0gcG9zMTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmVzdWx0MCA9IG51bGw7XG4gICAgICAgICAgcG9zID0gcG9zMTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocmVzdWx0MCAhPT0gbnVsbCkge1xuICAgICAgICAgIHJlc3VsdDAgPSAoZnVuY3Rpb24ob2Zmc2V0KSB7IHJldHVybiAnfHwnOyB9KShwb3MwKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocmVzdWx0MCA9PT0gbnVsbCkge1xuICAgICAgICAgIHBvcyA9IHBvczA7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDA7XG4gICAgICB9XG4gICAgICBcbiAgICAgIGZ1bmN0aW9uIHBhcnNlX01VTF9PUCgpIHtcbiAgICAgICAgdmFyIHJlc3VsdDAsIHJlc3VsdDEsIHJlc3VsdDI7XG4gICAgICAgIHZhciBwb3MwLCBwb3MxO1xuICAgICAgICBcbiAgICAgICAgcG9zMCA9IHBvcztcbiAgICAgICAgcG9zMSA9IHBvcztcbiAgICAgICAgcmVzdWx0MCA9IHBhcnNlX19fKCk7XG4gICAgICAgIGlmIChyZXN1bHQwICE9PSBudWxsKSB7XG4gICAgICAgICAgaWYgKGlucHV0LmNoYXJDb2RlQXQocG9zKSA9PT0gNDIpIHtcbiAgICAgICAgICAgIHJlc3VsdDEgPSBcIipcIjtcbiAgICAgICAgICAgIHBvcysrO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXN1bHQxID0gbnVsbDtcbiAgICAgICAgICAgIGlmIChyZXBvcnRGYWlsdXJlcyA9PT0gMCkge1xuICAgICAgICAgICAgICBtYXRjaEZhaWxlZChcIlxcXCIqXFxcIlwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHJlc3VsdDEgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHJlc3VsdDIgPSBwYXJzZV9fXygpO1xuICAgICAgICAgICAgaWYgKHJlc3VsdDIgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgcmVzdWx0MCA9IFtyZXN1bHQwLCByZXN1bHQxLCByZXN1bHQyXTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHJlc3VsdDAgPSBudWxsO1xuICAgICAgICAgICAgICBwb3MgPSBwb3MxO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXN1bHQwID0gbnVsbDtcbiAgICAgICAgICAgIHBvcyA9IHBvczE7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJlc3VsdDAgPSBudWxsO1xuICAgICAgICAgIHBvcyA9IHBvczE7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJlc3VsdDAgIT09IG51bGwpIHtcbiAgICAgICAgICByZXN1bHQwID0gKGZ1bmN0aW9uKG9mZnNldCkgeyByZXR1cm4gJyonOyB9KShwb3MwKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocmVzdWx0MCA9PT0gbnVsbCkge1xuICAgICAgICAgIHBvcyA9IHBvczA7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDA7XG4gICAgICB9XG4gICAgICBcbiAgICAgIGZ1bmN0aW9uIHBhcnNlX0RJVl9PUCgpIHtcbiAgICAgICAgdmFyIHJlc3VsdDAsIHJlc3VsdDEsIHJlc3VsdDI7XG4gICAgICAgIHZhciBwb3MwLCBwb3MxO1xuICAgICAgICBcbiAgICAgICAgcG9zMCA9IHBvcztcbiAgICAgICAgcG9zMSA9IHBvcztcbiAgICAgICAgcmVzdWx0MCA9IHBhcnNlX19fKCk7XG4gICAgICAgIGlmIChyZXN1bHQwICE9PSBudWxsKSB7XG4gICAgICAgICAgaWYgKGlucHV0LmNoYXJDb2RlQXQocG9zKSA9PT0gNDcpIHtcbiAgICAgICAgICAgIHJlc3VsdDEgPSBcIi9cIjtcbiAgICAgICAgICAgIHBvcysrO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXN1bHQxID0gbnVsbDtcbiAgICAgICAgICAgIGlmIChyZXBvcnRGYWlsdXJlcyA9PT0gMCkge1xuICAgICAgICAgICAgICBtYXRjaEZhaWxlZChcIlxcXCIvXFxcIlwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHJlc3VsdDEgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHJlc3VsdDIgPSBwYXJzZV9fXygpO1xuICAgICAgICAgICAgaWYgKHJlc3VsdDIgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgcmVzdWx0MCA9IFtyZXN1bHQwLCByZXN1bHQxLCByZXN1bHQyXTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHJlc3VsdDAgPSBudWxsO1xuICAgICAgICAgICAgICBwb3MgPSBwb3MxO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXN1bHQwID0gbnVsbDtcbiAgICAgICAgICAgIHBvcyA9IHBvczE7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJlc3VsdDAgPSBudWxsO1xuICAgICAgICAgIHBvcyA9IHBvczE7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJlc3VsdDAgIT09IG51bGwpIHtcbiAgICAgICAgICByZXN1bHQwID0gKGZ1bmN0aW9uKG9mZnNldCkgeyByZXR1cm4gJy8nOyB9KShwb3MwKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocmVzdWx0MCA9PT0gbnVsbCkge1xuICAgICAgICAgIHBvcyA9IHBvczA7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDA7XG4gICAgICB9XG4gICAgICBcbiAgICAgIGZ1bmN0aW9uIHBhcnNlX0VRX09QKCkge1xuICAgICAgICB2YXIgcmVzdWx0MCwgcmVzdWx0MSwgcmVzdWx0MjtcbiAgICAgICAgdmFyIHBvczAsIHBvczE7XG4gICAgICAgIFxuICAgICAgICBwb3MwID0gcG9zO1xuICAgICAgICBwb3MxID0gcG9zO1xuICAgICAgICByZXN1bHQwID0gcGFyc2VfX18oKTtcbiAgICAgICAgaWYgKHJlc3VsdDAgIT09IG51bGwpIHtcbiAgICAgICAgICBpZiAoaW5wdXQuc3Vic3RyKHBvcywgMikgPT09IFwiPT1cIikge1xuICAgICAgICAgICAgcmVzdWx0MSA9IFwiPT1cIjtcbiAgICAgICAgICAgIHBvcyArPSAyO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXN1bHQxID0gbnVsbDtcbiAgICAgICAgICAgIGlmIChyZXBvcnRGYWlsdXJlcyA9PT0gMCkge1xuICAgICAgICAgICAgICBtYXRjaEZhaWxlZChcIlxcXCI9PVxcXCJcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChyZXN1bHQxICE9PSBudWxsKSB7XG4gICAgICAgICAgICByZXN1bHQyID0gcGFyc2VfX18oKTtcbiAgICAgICAgICAgIGlmIChyZXN1bHQyICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgIHJlc3VsdDAgPSBbcmVzdWx0MCwgcmVzdWx0MSwgcmVzdWx0Ml07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICByZXN1bHQwID0gbnVsbDtcbiAgICAgICAgICAgICAgcG9zID0gcG9zMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVzdWx0MCA9IG51bGw7XG4gICAgICAgICAgICBwb3MgPSBwb3MxO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXN1bHQwID0gbnVsbDtcbiAgICAgICAgICBwb3MgPSBwb3MxO1xuICAgICAgICB9XG4gICAgICAgIGlmIChyZXN1bHQwICE9PSBudWxsKSB7XG4gICAgICAgICAgcmVzdWx0MCA9IChmdW5jdGlvbihvZmZzZXQpIHsgcmV0dXJuICc9PSc7IH0pKHBvczApO1xuICAgICAgICB9XG4gICAgICAgIGlmIChyZXN1bHQwID09PSBudWxsKSB7XG4gICAgICAgICAgcG9zID0gcG9zMDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0MDtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgZnVuY3Rpb24gcGFyc2VfTkVRX09QKCkge1xuICAgICAgICB2YXIgcmVzdWx0MCwgcmVzdWx0MSwgcmVzdWx0MjtcbiAgICAgICAgdmFyIHBvczAsIHBvczE7XG4gICAgICAgIFxuICAgICAgICBwb3MwID0gcG9zO1xuICAgICAgICBwb3MxID0gcG9zO1xuICAgICAgICByZXN1bHQwID0gcGFyc2VfX18oKTtcbiAgICAgICAgaWYgKHJlc3VsdDAgIT09IG51bGwpIHtcbiAgICAgICAgICBpZiAoaW5wdXQuc3Vic3RyKHBvcywgMikgPT09IFwiIT1cIikge1xuICAgICAgICAgICAgcmVzdWx0MSA9IFwiIT1cIjtcbiAgICAgICAgICAgIHBvcyArPSAyO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXN1bHQxID0gbnVsbDtcbiAgICAgICAgICAgIGlmIChyZXBvcnRGYWlsdXJlcyA9PT0gMCkge1xuICAgICAgICAgICAgICBtYXRjaEZhaWxlZChcIlxcXCIhPVxcXCJcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChyZXN1bHQxICE9PSBudWxsKSB7XG4gICAgICAgICAgICByZXN1bHQyID0gcGFyc2VfX18oKTtcbiAgICAgICAgICAgIGlmIChyZXN1bHQyICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgIHJlc3VsdDAgPSBbcmVzdWx0MCwgcmVzdWx0MSwgcmVzdWx0Ml07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICByZXN1bHQwID0gbnVsbDtcbiAgICAgICAgICAgICAgcG9zID0gcG9zMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVzdWx0MCA9IG51bGw7XG4gICAgICAgICAgICBwb3MgPSBwb3MxO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXN1bHQwID0gbnVsbDtcbiAgICAgICAgICBwb3MgPSBwb3MxO1xuICAgICAgICB9XG4gICAgICAgIGlmIChyZXN1bHQwICE9PSBudWxsKSB7XG4gICAgICAgICAgcmVzdWx0MCA9IChmdW5jdGlvbihvZmZzZXQpIHsgcmV0dXJuICchPSc7IH0pKHBvczApO1xuICAgICAgICB9XG4gICAgICAgIGlmIChyZXN1bHQwID09PSBudWxsKSB7XG4gICAgICAgICAgcG9zID0gcG9zMDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0MDtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgZnVuY3Rpb24gcGFyc2VfTFRfT1AoKSB7XG4gICAgICAgIHZhciByZXN1bHQwLCByZXN1bHQxLCByZXN1bHQyO1xuICAgICAgICB2YXIgcG9zMCwgcG9zMTtcbiAgICAgICAgXG4gICAgICAgIHBvczAgPSBwb3M7XG4gICAgICAgIHBvczEgPSBwb3M7XG4gICAgICAgIHJlc3VsdDAgPSBwYXJzZV9fXygpO1xuICAgICAgICBpZiAocmVzdWx0MCAhPT0gbnVsbCkge1xuICAgICAgICAgIGlmIChpbnB1dC5jaGFyQ29kZUF0KHBvcykgPT09IDYwKSB7XG4gICAgICAgICAgICByZXN1bHQxID0gXCI8XCI7XG4gICAgICAgICAgICBwb3MrKztcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVzdWx0MSA9IG51bGw7XG4gICAgICAgICAgICBpZiAocmVwb3J0RmFpbHVyZXMgPT09IDApIHtcbiAgICAgICAgICAgICAgbWF0Y2hGYWlsZWQoXCJcXFwiPFxcXCJcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChyZXN1bHQxICE9PSBudWxsKSB7XG4gICAgICAgICAgICByZXN1bHQyID0gcGFyc2VfX18oKTtcbiAgICAgICAgICAgIGlmIChyZXN1bHQyICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgIHJlc3VsdDAgPSBbcmVzdWx0MCwgcmVzdWx0MSwgcmVzdWx0Ml07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICByZXN1bHQwID0gbnVsbDtcbiAgICAgICAgICAgICAgcG9zID0gcG9zMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVzdWx0MCA9IG51bGw7XG4gICAgICAgICAgICBwb3MgPSBwb3MxO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXN1bHQwID0gbnVsbDtcbiAgICAgICAgICBwb3MgPSBwb3MxO1xuICAgICAgICB9XG4gICAgICAgIGlmIChyZXN1bHQwICE9PSBudWxsKSB7XG4gICAgICAgICAgcmVzdWx0MCA9IChmdW5jdGlvbihvZmZzZXQpIHsgcmV0dXJuICc8JzsgfSkocG9zMCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJlc3VsdDAgPT09IG51bGwpIHtcbiAgICAgICAgICBwb3MgPSBwb3MwO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQwO1xuICAgICAgfVxuICAgICAgXG4gICAgICBmdW5jdGlvbiBwYXJzZV9HVF9PUCgpIHtcbiAgICAgICAgdmFyIHJlc3VsdDAsIHJlc3VsdDEsIHJlc3VsdDI7XG4gICAgICAgIHZhciBwb3MwLCBwb3MxO1xuICAgICAgICBcbiAgICAgICAgcG9zMCA9IHBvcztcbiAgICAgICAgcG9zMSA9IHBvcztcbiAgICAgICAgcmVzdWx0MCA9IHBhcnNlX19fKCk7XG4gICAgICAgIGlmIChyZXN1bHQwICE9PSBudWxsKSB7XG4gICAgICAgICAgaWYgKGlucHV0LmNoYXJDb2RlQXQocG9zKSA9PT0gNjIpIHtcbiAgICAgICAgICAgIHJlc3VsdDEgPSBcIj5cIjtcbiAgICAgICAgICAgIHBvcysrO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXN1bHQxID0gbnVsbDtcbiAgICAgICAgICAgIGlmIChyZXBvcnRGYWlsdXJlcyA9PT0gMCkge1xuICAgICAgICAgICAgICBtYXRjaEZhaWxlZChcIlxcXCI+XFxcIlwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHJlc3VsdDEgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHJlc3VsdDIgPSBwYXJzZV9fXygpO1xuICAgICAgICAgICAgaWYgKHJlc3VsdDIgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgcmVzdWx0MCA9IFtyZXN1bHQwLCByZXN1bHQxLCByZXN1bHQyXTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHJlc3VsdDAgPSBudWxsO1xuICAgICAgICAgICAgICBwb3MgPSBwb3MxO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXN1bHQwID0gbnVsbDtcbiAgICAgICAgICAgIHBvcyA9IHBvczE7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJlc3VsdDAgPSBudWxsO1xuICAgICAgICAgIHBvcyA9IHBvczE7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJlc3VsdDAgIT09IG51bGwpIHtcbiAgICAgICAgICByZXN1bHQwID0gKGZ1bmN0aW9uKG9mZnNldCkgeyByZXR1cm4gJz4nOyB9KShwb3MwKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocmVzdWx0MCA9PT0gbnVsbCkge1xuICAgICAgICAgIHBvcyA9IHBvczA7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDA7XG4gICAgICB9XG4gICAgICBcbiAgICAgIGZ1bmN0aW9uIHBhcnNlX0xURV9PUCgpIHtcbiAgICAgICAgdmFyIHJlc3VsdDAsIHJlc3VsdDEsIHJlc3VsdDI7XG4gICAgICAgIHZhciBwb3MwLCBwb3MxO1xuICAgICAgICBcbiAgICAgICAgcG9zMCA9IHBvcztcbiAgICAgICAgcG9zMSA9IHBvcztcbiAgICAgICAgcmVzdWx0MCA9IHBhcnNlX19fKCk7XG4gICAgICAgIGlmIChyZXN1bHQwICE9PSBudWxsKSB7XG4gICAgICAgICAgaWYgKGlucHV0LnN1YnN0cihwb3MsIDIpID09PSBcIjw9XCIpIHtcbiAgICAgICAgICAgIHJlc3VsdDEgPSBcIjw9XCI7XG4gICAgICAgICAgICBwb3MgKz0gMjtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVzdWx0MSA9IG51bGw7XG4gICAgICAgICAgICBpZiAocmVwb3J0RmFpbHVyZXMgPT09IDApIHtcbiAgICAgICAgICAgICAgbWF0Y2hGYWlsZWQoXCJcXFwiPD1cXFwiXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAocmVzdWx0MSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgcmVzdWx0MiA9IHBhcnNlX19fKCk7XG4gICAgICAgICAgICBpZiAocmVzdWx0MiAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICByZXN1bHQwID0gW3Jlc3VsdDAsIHJlc3VsdDEsIHJlc3VsdDJdO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgcmVzdWx0MCA9IG51bGw7XG4gICAgICAgICAgICAgIHBvcyA9IHBvczE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJlc3VsdDAgPSBudWxsO1xuICAgICAgICAgICAgcG9zID0gcG9zMTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmVzdWx0MCA9IG51bGw7XG4gICAgICAgICAgcG9zID0gcG9zMTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocmVzdWx0MCAhPT0gbnVsbCkge1xuICAgICAgICAgIHJlc3VsdDAgPSAoZnVuY3Rpb24ob2Zmc2V0KSB7IHJldHVybiAnPD0nOyB9KShwb3MwKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocmVzdWx0MCA9PT0gbnVsbCkge1xuICAgICAgICAgIHBvcyA9IHBvczA7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDA7XG4gICAgICB9XG4gICAgICBcbiAgICAgIGZ1bmN0aW9uIHBhcnNlX0dURV9PUCgpIHtcbiAgICAgICAgdmFyIHJlc3VsdDAsIHJlc3VsdDEsIHJlc3VsdDI7XG4gICAgICAgIHZhciBwb3MwLCBwb3MxO1xuICAgICAgICBcbiAgICAgICAgcG9zMCA9IHBvcztcbiAgICAgICAgcG9zMSA9IHBvcztcbiAgICAgICAgcmVzdWx0MCA9IHBhcnNlX19fKCk7XG4gICAgICAgIGlmIChyZXN1bHQwICE9PSBudWxsKSB7XG4gICAgICAgICAgaWYgKGlucHV0LnN1YnN0cihwb3MsIDIpID09PSBcIj49XCIpIHtcbiAgICAgICAgICAgIHJlc3VsdDEgPSBcIj49XCI7XG4gICAgICAgICAgICBwb3MgKz0gMjtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVzdWx0MSA9IG51bGw7XG4gICAgICAgICAgICBpZiAocmVwb3J0RmFpbHVyZXMgPT09IDApIHtcbiAgICAgICAgICAgICAgbWF0Y2hGYWlsZWQoXCJcXFwiPj1cXFwiXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAocmVzdWx0MSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgcmVzdWx0MiA9IHBhcnNlX19fKCk7XG4gICAgICAgICAgICBpZiAocmVzdWx0MiAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICByZXN1bHQwID0gW3Jlc3VsdDAsIHJlc3VsdDEsIHJlc3VsdDJdO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgcmVzdWx0MCA9IG51bGw7XG4gICAgICAgICAgICAgIHBvcyA9IHBvczE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJlc3VsdDAgPSBudWxsO1xuICAgICAgICAgICAgcG9zID0gcG9zMTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmVzdWx0MCA9IG51bGw7XG4gICAgICAgICAgcG9zID0gcG9zMTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocmVzdWx0MCAhPT0gbnVsbCkge1xuICAgICAgICAgIHJlc3VsdDAgPSAoZnVuY3Rpb24ob2Zmc2V0KSB7IHJldHVybiAnPj0nOyB9KShwb3MwKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocmVzdWx0MCA9PT0gbnVsbCkge1xuICAgICAgICAgIHBvcyA9IHBvczA7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDA7XG4gICAgICB9XG4gICAgICBcbiAgICAgIGZ1bmN0aW9uIHBhcnNlX0FERF9PUCgpIHtcbiAgICAgICAgdmFyIHJlc3VsdDAsIHJlc3VsdDEsIHJlc3VsdDI7XG4gICAgICAgIHZhciBwb3MwLCBwb3MxO1xuICAgICAgICBcbiAgICAgICAgcG9zMCA9IHBvcztcbiAgICAgICAgcG9zMSA9IHBvcztcbiAgICAgICAgcmVzdWx0MCA9IHBhcnNlX19fKCk7XG4gICAgICAgIGlmIChyZXN1bHQwICE9PSBudWxsKSB7XG4gICAgICAgICAgaWYgKGlucHV0LmNoYXJDb2RlQXQocG9zKSA9PT0gNDMpIHtcbiAgICAgICAgICAgIHJlc3VsdDEgPSBcIitcIjtcbiAgICAgICAgICAgIHBvcysrO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXN1bHQxID0gbnVsbDtcbiAgICAgICAgICAgIGlmIChyZXBvcnRGYWlsdXJlcyA9PT0gMCkge1xuICAgICAgICAgICAgICBtYXRjaEZhaWxlZChcIlxcXCIrXFxcIlwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHJlc3VsdDEgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHJlc3VsdDIgPSBwYXJzZV9fXygpO1xuICAgICAgICAgICAgaWYgKHJlc3VsdDIgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgcmVzdWx0MCA9IFtyZXN1bHQwLCByZXN1bHQxLCByZXN1bHQyXTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHJlc3VsdDAgPSBudWxsO1xuICAgICAgICAgICAgICBwb3MgPSBwb3MxO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXN1bHQwID0gbnVsbDtcbiAgICAgICAgICAgIHBvcyA9IHBvczE7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJlc3VsdDAgPSBudWxsO1xuICAgICAgICAgIHBvcyA9IHBvczE7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJlc3VsdDAgIT09IG51bGwpIHtcbiAgICAgICAgICByZXN1bHQwID0gKGZ1bmN0aW9uKG9mZnNldCkgeyByZXR1cm4gJysnOyB9KShwb3MwKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocmVzdWx0MCA9PT0gbnVsbCkge1xuICAgICAgICAgIHBvcyA9IHBvczA7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDA7XG4gICAgICB9XG4gICAgICBcbiAgICAgIGZ1bmN0aW9uIHBhcnNlX01JTl9PUCgpIHtcbiAgICAgICAgdmFyIHJlc3VsdDAsIHJlc3VsdDEsIHJlc3VsdDI7XG4gICAgICAgIHZhciBwb3MwLCBwb3MxO1xuICAgICAgICBcbiAgICAgICAgcG9zMCA9IHBvcztcbiAgICAgICAgcG9zMSA9IHBvcztcbiAgICAgICAgcmVzdWx0MCA9IHBhcnNlX19fKCk7XG4gICAgICAgIGlmIChyZXN1bHQwICE9PSBudWxsKSB7XG4gICAgICAgICAgaWYgKGlucHV0LmNoYXJDb2RlQXQocG9zKSA9PT0gNDUpIHtcbiAgICAgICAgICAgIHJlc3VsdDEgPSBcIi1cIjtcbiAgICAgICAgICAgIHBvcysrO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXN1bHQxID0gbnVsbDtcbiAgICAgICAgICAgIGlmIChyZXBvcnRGYWlsdXJlcyA9PT0gMCkge1xuICAgICAgICAgICAgICBtYXRjaEZhaWxlZChcIlxcXCItXFxcIlwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHJlc3VsdDEgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHJlc3VsdDIgPSBwYXJzZV9fXygpO1xuICAgICAgICAgICAgaWYgKHJlc3VsdDIgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgcmVzdWx0MCA9IFtyZXN1bHQwLCByZXN1bHQxLCByZXN1bHQyXTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHJlc3VsdDAgPSBudWxsO1xuICAgICAgICAgICAgICBwb3MgPSBwb3MxO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXN1bHQwID0gbnVsbDtcbiAgICAgICAgICAgIHBvcyA9IHBvczE7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJlc3VsdDAgPSBudWxsO1xuICAgICAgICAgIHBvcyA9IHBvczE7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJlc3VsdDAgIT09IG51bGwpIHtcbiAgICAgICAgICByZXN1bHQwID0gKGZ1bmN0aW9uKG9mZnNldCkgeyByZXR1cm4gJy0nOyB9KShwb3MwKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocmVzdWx0MCA9PT0gbnVsbCkge1xuICAgICAgICAgIHBvcyA9IHBvczA7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDA7XG4gICAgICB9XG4gICAgICBcbiAgICAgIGZ1bmN0aW9uIHBhcnNlX0FTU0lHTl9PUCgpIHtcbiAgICAgICAgdmFyIHJlc3VsdDAsIHJlc3VsdDEsIHJlc3VsdDI7XG4gICAgICAgIHZhciBwb3MwLCBwb3MxO1xuICAgICAgICBcbiAgICAgICAgcG9zMCA9IHBvcztcbiAgICAgICAgcG9zMSA9IHBvcztcbiAgICAgICAgcmVzdWx0MCA9IHBhcnNlX19fKCk7XG4gICAgICAgIGlmIChyZXN1bHQwICE9PSBudWxsKSB7XG4gICAgICAgICAgaWYgKGlucHV0LmNoYXJDb2RlQXQocG9zKSA9PT0gNjEpIHtcbiAgICAgICAgICAgIHJlc3VsdDEgPSBcIj1cIjtcbiAgICAgICAgICAgIHBvcysrO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXN1bHQxID0gbnVsbDtcbiAgICAgICAgICAgIGlmIChyZXBvcnRGYWlsdXJlcyA9PT0gMCkge1xuICAgICAgICAgICAgICBtYXRjaEZhaWxlZChcIlxcXCI9XFxcIlwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHJlc3VsdDEgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHJlc3VsdDIgPSBwYXJzZV9fXygpO1xuICAgICAgICAgICAgaWYgKHJlc3VsdDIgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgcmVzdWx0MCA9IFtyZXN1bHQwLCByZXN1bHQxLCByZXN1bHQyXTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHJlc3VsdDAgPSBudWxsO1xuICAgICAgICAgICAgICBwb3MgPSBwb3MxO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXN1bHQwID0gbnVsbDtcbiAgICAgICAgICAgIHBvcyA9IHBvczE7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJlc3VsdDAgPSBudWxsO1xuICAgICAgICAgIHBvcyA9IHBvczE7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJlc3VsdDAgIT09IG51bGwpIHtcbiAgICAgICAgICByZXN1bHQwID0gKGZ1bmN0aW9uKG9mZnNldCkgeyByZXR1cm4gJz0nOyB9KShwb3MwKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocmVzdWx0MCA9PT0gbnVsbCkge1xuICAgICAgICAgIHBvcyA9IHBvczA7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDA7XG4gICAgICB9XG4gICAgICBcbiAgICAgIGZ1bmN0aW9uIHBhcnNlX0xPR0lDQUxfT1BTKCkge1xuICAgICAgICB2YXIgcmVzdWx0MDtcbiAgICAgICAgXG4gICAgICAgIHJlc3VsdDAgPSBwYXJzZV9BTkRfT1AoKTtcbiAgICAgICAgaWYgKHJlc3VsdDAgPT09IG51bGwpIHtcbiAgICAgICAgICByZXN1bHQwID0gcGFyc2VfT1JfT1AoKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0MDtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgZnVuY3Rpb24gcGFyc2VfQ09NUEFSSVNPTl9PUFMoKSB7XG4gICAgICAgIHZhciByZXN1bHQwO1xuICAgICAgICBcbiAgICAgICAgcmVzdWx0MCA9IHBhcnNlX0xUX09QKCk7XG4gICAgICAgIGlmIChyZXN1bHQwID09PSBudWxsKSB7XG4gICAgICAgICAgcmVzdWx0MCA9IHBhcnNlX0dUX09QKCk7XG4gICAgICAgICAgaWYgKHJlc3VsdDAgPT09IG51bGwpIHtcbiAgICAgICAgICAgIHJlc3VsdDAgPSBwYXJzZV9FUV9PUCgpO1xuICAgICAgICAgICAgaWYgKHJlc3VsdDAgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgcmVzdWx0MCA9IHBhcnNlX0dURV9PUCgpO1xuICAgICAgICAgICAgICBpZiAocmVzdWx0MCA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIHJlc3VsdDAgPSBwYXJzZV9MVEVfT1AoKTtcbiAgICAgICAgICAgICAgICBpZiAocmVzdWx0MCA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgcmVzdWx0MCA9IHBhcnNlX05FUV9PUCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0MDtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgZnVuY3Rpb24gcGFyc2VfQURESVRJVkVfT1BTKCkge1xuICAgICAgICB2YXIgcmVzdWx0MDtcbiAgICAgICAgXG4gICAgICAgIHJlc3VsdDAgPSBwYXJzZV9BRERfT1AoKTtcbiAgICAgICAgaWYgKHJlc3VsdDAgPT09IG51bGwpIHtcbiAgICAgICAgICByZXN1bHQwID0gcGFyc2VfTUlOX09QKCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDA7XG4gICAgICB9XG4gICAgICBcbiAgICAgIGZ1bmN0aW9uIHBhcnNlX01VTFRJUExJQ0FUSVZFX09QUygpIHtcbiAgICAgICAgdmFyIHJlc3VsdDA7XG4gICAgICAgIFxuICAgICAgICByZXN1bHQwID0gcGFyc2VfTVVMX09QKCk7XG4gICAgICAgIGlmIChyZXN1bHQwID09PSBudWxsKSB7XG4gICAgICAgICAgcmVzdWx0MCA9IHBhcnNlX0RJVl9PUCgpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQwO1xuICAgICAgfVxuICAgICAgXG4gICAgICBmdW5jdGlvbiBwYXJzZV9TdGF0ZW1lbnRMaXN0KCkge1xuICAgICAgICB2YXIgcmVzdWx0MCwgcmVzdWx0MSwgcmVzdWx0MiwgcmVzdWx0MztcbiAgICAgICAgdmFyIHBvczAsIHBvczEsIHBvczI7XG4gICAgICAgIFxuICAgICAgICBwb3MwID0gcG9zO1xuICAgICAgICBwb3MxID0gcG9zO1xuICAgICAgICByZXN1bHQwID0gcGFyc2VfU3RhdGVtZW50KCk7XG4gICAgICAgIGlmIChyZXN1bHQwICE9PSBudWxsKSB7XG4gICAgICAgICAgcmVzdWx0MSA9IFtdO1xuICAgICAgICAgIHBvczIgPSBwb3M7XG4gICAgICAgICAgcmVzdWx0MiA9IHBhcnNlX0NPTE9OKCk7XG4gICAgICAgICAgaWYgKHJlc3VsdDIgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHJlc3VsdDMgPSBwYXJzZV9TdGF0ZW1lbnQoKTtcbiAgICAgICAgICAgIGlmIChyZXN1bHQzICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgIHJlc3VsdDIgPSBbcmVzdWx0MiwgcmVzdWx0M107XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICByZXN1bHQyID0gbnVsbDtcbiAgICAgICAgICAgICAgcG9zID0gcG9zMjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVzdWx0MiA9IG51bGw7XG4gICAgICAgICAgICBwb3MgPSBwb3MyO1xuICAgICAgICAgIH1cbiAgICAgICAgICB3aGlsZSAocmVzdWx0MiAhPT0gbnVsbCkge1xuICAgICAgICAgICAgcmVzdWx0MS5wdXNoKHJlc3VsdDIpO1xuICAgICAgICAgICAgcG9zMiA9IHBvcztcbiAgICAgICAgICAgIHJlc3VsdDIgPSBwYXJzZV9DT0xPTigpO1xuICAgICAgICAgICAgaWYgKHJlc3VsdDIgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgcmVzdWx0MyA9IHBhcnNlX1N0YXRlbWVudCgpO1xuICAgICAgICAgICAgICBpZiAocmVzdWx0MyAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIHJlc3VsdDIgPSBbcmVzdWx0MiwgcmVzdWx0M107XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0MiA9IG51bGw7XG4gICAgICAgICAgICAgICAgcG9zID0gcG9zMjtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgcmVzdWx0MiA9IG51bGw7XG4gICAgICAgICAgICAgIHBvcyA9IHBvczI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChyZXN1bHQxICE9PSBudWxsKSB7XG4gICAgICAgICAgICByZXN1bHQwID0gW3Jlc3VsdDAsIHJlc3VsdDFdO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXN1bHQwID0gbnVsbDtcbiAgICAgICAgICAgIHBvcyA9IHBvczE7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJlc3VsdDAgPSBudWxsO1xuICAgICAgICAgIHBvcyA9IHBvczE7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJlc3VsdDAgIT09IG51bGwpIHtcbiAgICAgICAgICByZXN1bHQwID0gKGZ1bmN0aW9uKG9mZnNldCwgaGVhZCwgdGFpbCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGFzdC5wcm9ncmFtKFtoZWFkXS5jb25jYXQoc2Vjb25kTm9kZSh0YWlsKSkpO1xyXG4gICAgICAgICAgIH0pKHBvczAsIHJlc3VsdDBbMF0sIHJlc3VsdDBbMV0pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChyZXN1bHQwID09PSBudWxsKSB7XG4gICAgICAgICAgcG9zID0gcG9zMDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0MDtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgZnVuY3Rpb24gcGFyc2VfU3RhdGVtZW50KCkge1xuICAgICAgICB2YXIgcmVzdWx0MCwgcmVzdWx0MTtcbiAgICAgICAgdmFyIHBvczAsIHBvczEsIHBvczI7XG4gICAgICAgIFxuICAgICAgICBwb3MwID0gcG9zO1xuICAgICAgICBwb3MxID0gcG9zO1xuICAgICAgICByZXN1bHQwID0gcGFyc2VfTG9naWNhbEV4cCgpO1xuICAgICAgICBpZiAocmVzdWx0MCAhPT0gbnVsbCkge1xuICAgICAgICAgIHBvczIgPSBwb3M7XG4gICAgICAgICAgcmVwb3J0RmFpbHVyZXMrKztcbiAgICAgICAgICByZXN1bHQxID0gcGFyc2VfQVNTSUdOX09QKCk7XG4gICAgICAgICAgcmVwb3J0RmFpbHVyZXMtLTtcbiAgICAgICAgICBpZiAocmVzdWx0MSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgcmVzdWx0MSA9IFwiXCI7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJlc3VsdDEgPSBudWxsO1xuICAgICAgICAgICAgcG9zID0gcG9zMjtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHJlc3VsdDEgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHJlc3VsdDAgPSBbcmVzdWx0MCwgcmVzdWx0MV07XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJlc3VsdDAgPSBudWxsO1xuICAgICAgICAgICAgcG9zID0gcG9zMTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmVzdWx0MCA9IG51bGw7XG4gICAgICAgICAgcG9zID0gcG9zMTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocmVzdWx0MCAhPT0gbnVsbCkge1xuICAgICAgICAgIHJlc3VsdDAgPSAoZnVuY3Rpb24ob2Zmc2V0LCBleHByKSB7IHJldHVybiBleHByOyB9KShwb3MwLCByZXN1bHQwWzBdKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocmVzdWx0MCA9PT0gbnVsbCkge1xuICAgICAgICAgIHBvcyA9IHBvczA7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJlc3VsdDAgPT09IG51bGwpIHtcbiAgICAgICAgICByZXN1bHQwID0gcGFyc2VfQXNzaWdubWVudCgpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQwO1xuICAgICAgfVxuICAgICAgXG4gICAgICBmdW5jdGlvbiBwYXJzZV9Bc3NpZ25tZW50KCkge1xuICAgICAgICB2YXIgcmVzdWx0MCwgcmVzdWx0MSwgcmVzdWx0MjtcbiAgICAgICAgdmFyIHBvczAsIHBvczE7XG4gICAgICAgIFxuICAgICAgICBwb3MwID0gcG9zO1xuICAgICAgICBwb3MxID0gcG9zO1xuICAgICAgICByZXN1bHQwID0gcGFyc2VfSWRlbnRpZmllcigpO1xuICAgICAgICBpZiAocmVzdWx0MCAhPT0gbnVsbCkge1xuICAgICAgICAgIHJlc3VsdDEgPSBwYXJzZV9BU1NJR05fT1AoKTtcbiAgICAgICAgICBpZiAocmVzdWx0MSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgcmVzdWx0MiA9IHBhcnNlX0xvZ2ljYWxFeHAoKTtcbiAgICAgICAgICAgIGlmIChyZXN1bHQyICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgIHJlc3VsdDAgPSBbcmVzdWx0MCwgcmVzdWx0MSwgcmVzdWx0Ml07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICByZXN1bHQwID0gbnVsbDtcbiAgICAgICAgICAgICAgcG9zID0gcG9zMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVzdWx0MCA9IG51bGw7XG4gICAgICAgICAgICBwb3MgPSBwb3MxO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXN1bHQwID0gbnVsbDtcbiAgICAgICAgICBwb3MgPSBwb3MxO1xuICAgICAgICB9XG4gICAgICAgIGlmIChyZXN1bHQwICE9PSBudWxsKSB7XG4gICAgICAgICAgcmVzdWx0MCA9IChmdW5jdGlvbihvZmZzZXQsIGxocywgb3AsIHJocykge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGFzdC5hc3NpZ25tZW50KGxocywgcmhzKTtcclxuICAgICAgICAgICAgfSkocG9zMCwgcmVzdWx0MFswXSwgcmVzdWx0MFsxXSwgcmVzdWx0MFsyXSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJlc3VsdDAgPT09IG51bGwpIHtcbiAgICAgICAgICBwb3MgPSBwb3MwO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQwO1xuICAgICAgfVxuICAgICAgXG4gICAgICBmdW5jdGlvbiBwYXJzZV9JZGVudGlmaWVyKCkge1xuICAgICAgICB2YXIgcmVzdWx0MCwgcmVzdWx0MSwgcmVzdWx0MjtcbiAgICAgICAgdmFyIHBvczAsIHBvczE7XG4gICAgICAgIFxuICAgICAgICByZXBvcnRGYWlsdXJlcysrO1xuICAgICAgICBwb3MwID0gcG9zO1xuICAgICAgICBwb3MxID0gcG9zO1xuICAgICAgICByZXN1bHQwID0gcGFyc2VfbGV0dGVyKCk7XG4gICAgICAgIGlmIChyZXN1bHQwID09PSBudWxsKSB7XG4gICAgICAgICAgaWYgKGlucHV0LmNoYXJDb2RlQXQocG9zKSA9PT0gOTUpIHtcbiAgICAgICAgICAgIHJlc3VsdDAgPSBcIl9cIjtcbiAgICAgICAgICAgIHBvcysrO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXN1bHQwID0gbnVsbDtcbiAgICAgICAgICAgIGlmIChyZXBvcnRGYWlsdXJlcyA9PT0gMCkge1xuICAgICAgICAgICAgICBtYXRjaEZhaWxlZChcIlxcXCJfXFxcIlwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHJlc3VsdDAgPT09IG51bGwpIHtcbiAgICAgICAgICAgIGlmIChpbnB1dC5jaGFyQ29kZUF0KHBvcykgPT09IDM2KSB7XG4gICAgICAgICAgICAgIHJlc3VsdDAgPSBcIiRcIjtcbiAgICAgICAgICAgICAgcG9zKys7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICByZXN1bHQwID0gbnVsbDtcbiAgICAgICAgICAgICAgaWYgKHJlcG9ydEZhaWx1cmVzID09PSAwKSB7XG4gICAgICAgICAgICAgICAgbWF0Y2hGYWlsZWQoXCJcXFwiJFxcXCJcIik7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJlc3VsdDAgIT09IG51bGwpIHtcbiAgICAgICAgICByZXN1bHQxID0gW107XG4gICAgICAgICAgcmVzdWx0MiA9IHBhcnNlX2xldHRlcigpO1xuICAgICAgICAgIGlmIChyZXN1bHQyID09PSBudWxsKSB7XG4gICAgICAgICAgICByZXN1bHQyID0gcGFyc2VfZGlnaXQoKTtcbiAgICAgICAgICAgIGlmIChyZXN1bHQyID09PSBudWxsKSB7XG4gICAgICAgICAgICAgIGlmIChpbnB1dC5jaGFyQ29kZUF0KHBvcykgPT09IDk1KSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0MiA9IFwiX1wiO1xuICAgICAgICAgICAgICAgIHBvcysrO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlc3VsdDIgPSBudWxsO1xuICAgICAgICAgICAgICAgIGlmIChyZXBvcnRGYWlsdXJlcyA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgbWF0Y2hGYWlsZWQoXCJcXFwiX1xcXCJcIik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGlmIChyZXN1bHQyID09PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgaWYgKGlucHV0LmNoYXJDb2RlQXQocG9zKSA9PT0gMzYpIHtcbiAgICAgICAgICAgICAgICAgIHJlc3VsdDIgPSBcIiRcIjtcbiAgICAgICAgICAgICAgICAgIHBvcysrO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICByZXN1bHQyID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgIGlmIChyZXBvcnRGYWlsdXJlcyA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICBtYXRjaEZhaWxlZChcIlxcXCIkXFxcIlwiKTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgd2hpbGUgKHJlc3VsdDIgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHJlc3VsdDEucHVzaChyZXN1bHQyKTtcbiAgICAgICAgICAgIHJlc3VsdDIgPSBwYXJzZV9sZXR0ZXIoKTtcbiAgICAgICAgICAgIGlmIChyZXN1bHQyID09PSBudWxsKSB7XG4gICAgICAgICAgICAgIHJlc3VsdDIgPSBwYXJzZV9kaWdpdCgpO1xuICAgICAgICAgICAgICBpZiAocmVzdWx0MiA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIGlmIChpbnB1dC5jaGFyQ29kZUF0KHBvcykgPT09IDk1KSB7XG4gICAgICAgICAgICAgICAgICByZXN1bHQyID0gXCJfXCI7XG4gICAgICAgICAgICAgICAgICBwb3MrKztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgcmVzdWx0MiA9IG51bGw7XG4gICAgICAgICAgICAgICAgICBpZiAocmVwb3J0RmFpbHVyZXMgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgbWF0Y2hGYWlsZWQoXCJcXFwiX1xcXCJcIik7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChyZXN1bHQyID09PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICBpZiAoaW5wdXQuY2hhckNvZGVBdChwb3MpID09PSAzNikge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQyID0gXCIkXCI7XG4gICAgICAgICAgICAgICAgICAgIHBvcysrO1xuICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0MiA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXBvcnRGYWlsdXJlcyA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgIG1hdGNoRmFpbGVkKFwiXFxcIiRcXFwiXCIpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChyZXN1bHQxICE9PSBudWxsKSB7XG4gICAgICAgICAgICByZXN1bHQyID0gcGFyc2VfX18oKTtcbiAgICAgICAgICAgIGlmIChyZXN1bHQyICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgIHJlc3VsdDAgPSBbcmVzdWx0MCwgcmVzdWx0MSwgcmVzdWx0Ml07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICByZXN1bHQwID0gbnVsbDtcbiAgICAgICAgICAgICAgcG9zID0gcG9zMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVzdWx0MCA9IG51bGw7XG4gICAgICAgICAgICBwb3MgPSBwb3MxO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXN1bHQwID0gbnVsbDtcbiAgICAgICAgICBwb3MgPSBwb3MxO1xuICAgICAgICB9XG4gICAgICAgIGlmIChyZXN1bHQwICE9PSBudWxsKSB7XG4gICAgICAgICAgcmVzdWx0MCA9IChmdW5jdGlvbihvZmZzZXQsIGhlYWQsIHRhaWwpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBhc3QuaWRlbnRpZmllcihoZWFkICsgdGFpbC5qb2luKCcnKSk7IFxyXG4gICAgICAgICAgICB9KShwb3MwLCByZXN1bHQwWzBdLCByZXN1bHQwWzFdKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocmVzdWx0MCA9PT0gbnVsbCkge1xuICAgICAgICAgIHBvcyA9IHBvczA7XG4gICAgICAgIH1cbiAgICAgICAgcmVwb3J0RmFpbHVyZXMtLTtcbiAgICAgICAgaWYgKHJlcG9ydEZhaWx1cmVzID09PSAwICYmIHJlc3VsdDAgPT09IG51bGwpIHtcbiAgICAgICAgICBtYXRjaEZhaWxlZChcImlkZW50aWZpZXJcIik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDA7XG4gICAgICB9XG4gICAgICBcbiAgICAgIGZ1bmN0aW9uIHBhcnNlX01hdHJpeCgpIHtcbiAgICAgICAgdmFyIHJlc3VsdDAsIHJlc3VsdDEsIHJlc3VsdDIsIHJlc3VsdDMsIHJlc3VsdDQ7XG4gICAgICAgIHZhciBwb3MwLCBwb3MxLCBwb3MyO1xuICAgICAgICBcbiAgICAgICAgcG9zMCA9IHBvcztcbiAgICAgICAgcG9zMSA9IHBvcztcbiAgICAgICAgcmVzdWx0MCA9IHBhcnNlX09TX0JSQUNLRVQoKTtcbiAgICAgICAgaWYgKHJlc3VsdDAgIT09IG51bGwpIHtcbiAgICAgICAgICByZXN1bHQxID0gcGFyc2VfVmVjdG9yKCk7XG4gICAgICAgICAgaWYgKHJlc3VsdDEgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHJlc3VsdDIgPSBbXTtcbiAgICAgICAgICAgIHBvczIgPSBwb3M7XG4gICAgICAgICAgICByZXN1bHQzID0gcGFyc2VfQ09MT04oKTtcbiAgICAgICAgICAgIGlmIChyZXN1bHQzICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgIHJlc3VsdDQgPSBwYXJzZV9WZWN0b3IoKTtcbiAgICAgICAgICAgICAgaWYgKHJlc3VsdDQgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICByZXN1bHQzID0gW3Jlc3VsdDMsIHJlc3VsdDRdO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlc3VsdDMgPSBudWxsO1xuICAgICAgICAgICAgICAgIHBvcyA9IHBvczI7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHJlc3VsdDMgPSBudWxsO1xuICAgICAgICAgICAgICBwb3MgPSBwb3MyO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgd2hpbGUgKHJlc3VsdDMgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgcmVzdWx0Mi5wdXNoKHJlc3VsdDMpO1xuICAgICAgICAgICAgICBwb3MyID0gcG9zO1xuICAgICAgICAgICAgICByZXN1bHQzID0gcGFyc2VfQ09MT04oKTtcbiAgICAgICAgICAgICAgaWYgKHJlc3VsdDMgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICByZXN1bHQ0ID0gcGFyc2VfVmVjdG9yKCk7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3VsdDQgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgIHJlc3VsdDMgPSBbcmVzdWx0MywgcmVzdWx0NF07XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIHJlc3VsdDMgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgcG9zID0gcG9zMjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0MyA9IG51bGw7XG4gICAgICAgICAgICAgICAgcG9zID0gcG9zMjtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHJlc3VsdDIgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgcmVzdWx0MyA9IHBhcnNlX0NTX0JSQUNLRVQoKTtcbiAgICAgICAgICAgICAgaWYgKHJlc3VsdDMgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICByZXN1bHQwID0gW3Jlc3VsdDAsIHJlc3VsdDEsIHJlc3VsdDIsIHJlc3VsdDNdO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlc3VsdDAgPSBudWxsO1xuICAgICAgICAgICAgICAgIHBvcyA9IHBvczE7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHJlc3VsdDAgPSBudWxsO1xuICAgICAgICAgICAgICBwb3MgPSBwb3MxO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXN1bHQwID0gbnVsbDtcbiAgICAgICAgICAgIHBvcyA9IHBvczE7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJlc3VsdDAgPSBudWxsO1xuICAgICAgICAgIHBvcyA9IHBvczE7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJlc3VsdDAgIT09IG51bGwpIHtcbiAgICAgICAgICByZXN1bHQwID0gKGZ1bmN0aW9uKG9mZnNldCwgaGVhZCwgdGFpbCkge1xyXG4gICAgICAgICAgICAgICAgdmFyIG5vZGVzID0gW2hlYWRdLmNvbmNhdChzZWNvbmROb2RlKHRhaWwpKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogICAnTWF0cml4JyxcclxuICAgICAgICAgICAgICAgICAgICBtOiAgICAgIG5vZGVzLmxlbmd0aCxcclxuICAgICAgICAgICAgICAgICAgICBuOiAgICAgIG5vZGVzWzBdLnNpemUsXHJcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudHM6IG5vZGVzXHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICB9KShwb3MwLCByZXN1bHQwWzFdLCByZXN1bHQwWzJdKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocmVzdWx0MCA9PT0gbnVsbCkge1xuICAgICAgICAgIHBvcyA9IHBvczA7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDA7XG4gICAgICB9XG4gICAgICBcbiAgICAgIGZ1bmN0aW9uIHBhcnNlX1ZlY3RvcigpIHtcbiAgICAgICAgdmFyIHJlc3VsdDAsIHJlc3VsdDEsIHJlc3VsdDIsIHJlc3VsdDM7XG4gICAgICAgIHZhciBwb3MwLCBwb3MxLCBwb3MyO1xuICAgICAgICBcbiAgICAgICAgcG9zMCA9IHBvcztcbiAgICAgICAgcG9zMSA9IHBvcztcbiAgICAgICAgcmVzdWx0MCA9IHBhcnNlX0xvZ2ljYWxFeHAoKTtcbiAgICAgICAgaWYgKHJlc3VsdDAgIT09IG51bGwpIHtcbiAgICAgICAgICByZXN1bHQxID0gW107XG4gICAgICAgICAgcG9zMiA9IHBvcztcbiAgICAgICAgICByZXN1bHQyID0gcGFyc2VfX18oKTtcbiAgICAgICAgICBpZiAocmVzdWx0MiAhPT0gbnVsbCkge1xuICAgICAgICAgICAgcmVzdWx0MyA9IHBhcnNlX0xvZ2ljYWxFeHAoKTtcbiAgICAgICAgICAgIGlmIChyZXN1bHQzICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgIHJlc3VsdDIgPSBbcmVzdWx0MiwgcmVzdWx0M107XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICByZXN1bHQyID0gbnVsbDtcbiAgICAgICAgICAgICAgcG9zID0gcG9zMjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVzdWx0MiA9IG51bGw7XG4gICAgICAgICAgICBwb3MgPSBwb3MyO1xuICAgICAgICAgIH1cbiAgICAgICAgICB3aGlsZSAocmVzdWx0MiAhPT0gbnVsbCkge1xuICAgICAgICAgICAgcmVzdWx0MS5wdXNoKHJlc3VsdDIpO1xuICAgICAgICAgICAgcG9zMiA9IHBvcztcbiAgICAgICAgICAgIHJlc3VsdDIgPSBwYXJzZV9fXygpO1xuICAgICAgICAgICAgaWYgKHJlc3VsdDIgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgcmVzdWx0MyA9IHBhcnNlX0xvZ2ljYWxFeHAoKTtcbiAgICAgICAgICAgICAgaWYgKHJlc3VsdDMgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICByZXN1bHQyID0gW3Jlc3VsdDIsIHJlc3VsdDNdO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlc3VsdDIgPSBudWxsO1xuICAgICAgICAgICAgICAgIHBvcyA9IHBvczI7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHJlc3VsdDIgPSBudWxsO1xuICAgICAgICAgICAgICBwb3MgPSBwb3MyO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAocmVzdWx0MSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgcmVzdWx0MCA9IFtyZXN1bHQwLCByZXN1bHQxXTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVzdWx0MCA9IG51bGw7XG4gICAgICAgICAgICBwb3MgPSBwb3MxO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXN1bHQwID0gbnVsbDtcbiAgICAgICAgICBwb3MgPSBwb3MxO1xuICAgICAgICB9XG4gICAgICAgIGlmIChyZXN1bHQwICE9PSBudWxsKSB7XG4gICAgICAgICAgcmVzdWx0MCA9IChmdW5jdGlvbihvZmZzZXQsIGhlYWQsIHRhaWwpIHtcclxuICAgICAgICAgICAgICAgIHZhciBub2RlcyA9IFtoZWFkXS5jb25jYXQoc2Vjb25kTm9kZSh0YWlsKSk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAgICdWZWN0b3InLFxyXG4gICAgICAgICAgICAgICAgICAgIHNpemU6ICAgbm9kZXMubGVuZ3RoLFxyXG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnRzOm5vZGVzXHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICB9KShwb3MwLCByZXN1bHQwWzBdLCByZXN1bHQwWzFdKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocmVzdWx0MCA9PT0gbnVsbCkge1xuICAgICAgICAgIHBvcyA9IHBvczA7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDA7XG4gICAgICB9XG4gICAgICBcbiAgICAgIGZ1bmN0aW9uIHBhcnNlX0xvZ2ljYWxFeHAoKSB7XG4gICAgICAgIHZhciByZXN1bHQwLCByZXN1bHQxLCByZXN1bHQyLCByZXN1bHQzO1xuICAgICAgICB2YXIgcG9zMCwgcG9zMSwgcG9zMjtcbiAgICAgICAgXG4gICAgICAgIHBvczAgPSBwb3M7XG4gICAgICAgIHBvczEgPSBwb3M7XG4gICAgICAgIHJlc3VsdDAgPSBwYXJzZV9Db21wYXJhcmlzb25FeHAoKTtcbiAgICAgICAgaWYgKHJlc3VsdDAgIT09IG51bGwpIHtcbiAgICAgICAgICByZXN1bHQxID0gW107XG4gICAgICAgICAgcG9zMiA9IHBvcztcbiAgICAgICAgICByZXN1bHQyID0gcGFyc2VfTE9HSUNBTF9PUFMoKTtcbiAgICAgICAgICBpZiAocmVzdWx0MiAhPT0gbnVsbCkge1xuICAgICAgICAgICAgcmVzdWx0MyA9IHBhcnNlX0NvbXBhcmFyaXNvbkV4cCgpO1xuICAgICAgICAgICAgaWYgKHJlc3VsdDMgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgcmVzdWx0MiA9IFtyZXN1bHQyLCByZXN1bHQzXTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHJlc3VsdDIgPSBudWxsO1xuICAgICAgICAgICAgICBwb3MgPSBwb3MyO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXN1bHQyID0gbnVsbDtcbiAgICAgICAgICAgIHBvcyA9IHBvczI7XG4gICAgICAgICAgfVxuICAgICAgICAgIHdoaWxlIChyZXN1bHQyICE9PSBudWxsKSB7XG4gICAgICAgICAgICByZXN1bHQxLnB1c2gocmVzdWx0Mik7XG4gICAgICAgICAgICBwb3MyID0gcG9zO1xuICAgICAgICAgICAgcmVzdWx0MiA9IHBhcnNlX0xPR0lDQUxfT1BTKCk7XG4gICAgICAgICAgICBpZiAocmVzdWx0MiAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICByZXN1bHQzID0gcGFyc2VfQ29tcGFyYXJpc29uRXhwKCk7XG4gICAgICAgICAgICAgIGlmIChyZXN1bHQzICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0MiA9IFtyZXN1bHQyLCByZXN1bHQzXTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXN1bHQyID0gbnVsbDtcbiAgICAgICAgICAgICAgICBwb3MgPSBwb3MyO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICByZXN1bHQyID0gbnVsbDtcbiAgICAgICAgICAgICAgcG9zID0gcG9zMjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHJlc3VsdDEgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHJlc3VsdDAgPSBbcmVzdWx0MCwgcmVzdWx0MV07XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJlc3VsdDAgPSBudWxsO1xuICAgICAgICAgICAgcG9zID0gcG9zMTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmVzdWx0MCA9IG51bGw7XG4gICAgICAgICAgcG9zID0gcG9zMTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocmVzdWx0MCAhPT0gbnVsbCkge1xuICAgICAgICAgIHJlc3VsdDAgPSAoZnVuY3Rpb24ob2Zmc2V0LCBoZWFkLCB0YWlsKSB7IFxyXG4gICAgICAgICAgICAgICAgdmFyIHJlc3VsdCA9IGhlYWQ7XHJcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRhaWwubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSBhc3QubG9naWNhbChyZXN1bHQsIHRhaWxbaV1bMV0sIHRhaWxbaV1bMF0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDsgXHJcbiAgICAgICAgICAgIH0pKHBvczAsIHJlc3VsdDBbMF0sIHJlc3VsdDBbMV0pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChyZXN1bHQwID09PSBudWxsKSB7XG4gICAgICAgICAgcG9zID0gcG9zMDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0MDtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgZnVuY3Rpb24gcGFyc2VfQ29tcGFyYXJpc29uRXhwKCkge1xuICAgICAgICB2YXIgcmVzdWx0MCwgcmVzdWx0MSwgcmVzdWx0MjtcbiAgICAgICAgdmFyIHBvczAsIHBvczEsIHBvczI7XG4gICAgICAgIFxuICAgICAgICBwb3MwID0gcG9zO1xuICAgICAgICBwb3MxID0gcG9zO1xuICAgICAgICByZXN1bHQwID0gcGFyc2VfQWRkaXRpdmVFeHAoKTtcbiAgICAgICAgaWYgKHJlc3VsdDAgIT09IG51bGwpIHtcbiAgICAgICAgICBwb3MyID0gcG9zO1xuICAgICAgICAgIHJlc3VsdDEgPSBwYXJzZV9DT01QQVJJU09OX09QUygpO1xuICAgICAgICAgIGlmIChyZXN1bHQxICE9PSBudWxsKSB7XG4gICAgICAgICAgICByZXN1bHQyID0gcGFyc2VfQWRkaXRpdmVFeHAoKTtcbiAgICAgICAgICAgIGlmIChyZXN1bHQyICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgIHJlc3VsdDEgPSBbcmVzdWx0MSwgcmVzdWx0Ml07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICByZXN1bHQxID0gbnVsbDtcbiAgICAgICAgICAgICAgcG9zID0gcG9zMjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVzdWx0MSA9IG51bGw7XG4gICAgICAgICAgICBwb3MgPSBwb3MyO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXN1bHQxID0gcmVzdWx0MSAhPT0gbnVsbCA/IHJlc3VsdDEgOiBcIlwiO1xuICAgICAgICAgIGlmIChyZXN1bHQxICE9PSBudWxsKSB7XG4gICAgICAgICAgICByZXN1bHQwID0gW3Jlc3VsdDAsIHJlc3VsdDFdO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXN1bHQwID0gbnVsbDtcbiAgICAgICAgICAgIHBvcyA9IHBvczE7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJlc3VsdDAgPSBudWxsO1xuICAgICAgICAgIHBvcyA9IHBvczE7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJlc3VsdDAgIT09IG51bGwpIHtcbiAgICAgICAgICByZXN1bHQwID0gKGZ1bmN0aW9uKG9mZnNldCwgaGVhZCwgdGFpbCkge1xyXG4gICAgICAgICAgICAgICAgdmFyIHJlc3VsdCA9IGhlYWQ7XHJcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRhaWwubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSBhc3QuY29tcGFyaXNvbihyZXN1bHQsIHRhaWxbaV1bMV0sIHRhaWxbaV1bMF0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDsgXHJcbiAgICAgICAgICAgIH0pKHBvczAsIHJlc3VsdDBbMF0sIHJlc3VsdDBbMV0pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChyZXN1bHQwID09PSBudWxsKSB7XG4gICAgICAgICAgcG9zID0gcG9zMDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0MDtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgZnVuY3Rpb24gcGFyc2VfQWRkaXRpdmVFeHAoKSB7XG4gICAgICAgIHZhciByZXN1bHQwLCByZXN1bHQxLCByZXN1bHQyLCByZXN1bHQzO1xuICAgICAgICB2YXIgcG9zMCwgcG9zMSwgcG9zMjtcbiAgICAgICAgXG4gICAgICAgIHBvczAgPSBwb3M7XG4gICAgICAgIHBvczEgPSBwb3M7XG4gICAgICAgIHJlc3VsdDAgPSBwYXJzZV9NdWx0aXBsaWNhdGl2ZUV4cCgpO1xuICAgICAgICBpZiAocmVzdWx0MCAhPT0gbnVsbCkge1xuICAgICAgICAgIHJlc3VsdDEgPSBbXTtcbiAgICAgICAgICBwb3MyID0gcG9zO1xuICAgICAgICAgIHJlc3VsdDIgPSBwYXJzZV9BRERJVElWRV9PUFMoKTtcbiAgICAgICAgICBpZiAocmVzdWx0MiAhPT0gbnVsbCkge1xuICAgICAgICAgICAgcmVzdWx0MyA9IHBhcnNlX011bHRpcGxpY2F0aXZlRXhwKCk7XG4gICAgICAgICAgICBpZiAocmVzdWx0MyAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICByZXN1bHQyID0gW3Jlc3VsdDIsIHJlc3VsdDNdO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgcmVzdWx0MiA9IG51bGw7XG4gICAgICAgICAgICAgIHBvcyA9IHBvczI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJlc3VsdDIgPSBudWxsO1xuICAgICAgICAgICAgcG9zID0gcG9zMjtcbiAgICAgICAgICB9XG4gICAgICAgICAgd2hpbGUgKHJlc3VsdDIgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHJlc3VsdDEucHVzaChyZXN1bHQyKTtcbiAgICAgICAgICAgIHBvczIgPSBwb3M7XG4gICAgICAgICAgICByZXN1bHQyID0gcGFyc2VfQURESVRJVkVfT1BTKCk7XG4gICAgICAgICAgICBpZiAocmVzdWx0MiAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICByZXN1bHQzID0gcGFyc2VfTXVsdGlwbGljYXRpdmVFeHAoKTtcbiAgICAgICAgICAgICAgaWYgKHJlc3VsdDMgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICByZXN1bHQyID0gW3Jlc3VsdDIsIHJlc3VsdDNdO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlc3VsdDIgPSBudWxsO1xuICAgICAgICAgICAgICAgIHBvcyA9IHBvczI7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHJlc3VsdDIgPSBudWxsO1xuICAgICAgICAgICAgICBwb3MgPSBwb3MyO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAocmVzdWx0MSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgcmVzdWx0MCA9IFtyZXN1bHQwLCByZXN1bHQxXTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVzdWx0MCA9IG51bGw7XG4gICAgICAgICAgICBwb3MgPSBwb3MxO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXN1bHQwID0gbnVsbDtcbiAgICAgICAgICBwb3MgPSBwb3MxO1xuICAgICAgICB9XG4gICAgICAgIGlmIChyZXN1bHQwICE9PSBudWxsKSB7XG4gICAgICAgICAgcmVzdWx0MCA9IChmdW5jdGlvbihvZmZzZXQsIGhlYWQsIHRhaWwpIHtcclxuICAgICAgICAgICAgICAgIHZhciByZXN1bHQgPSBoZWFkO1xyXG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0YWlsLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gYXN0LmFkZGl0aXZlKC8qbGVmdCovcmVzdWx0LCAvKnJpZ2h0Ki90YWlsW2ldWzFdLCAvKm9wZXJhdG9yKi90YWlsW2ldWzBdKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQ7IFxyXG4gICAgICAgICAgICB9KShwb3MwLCByZXN1bHQwWzBdLCByZXN1bHQwWzFdKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocmVzdWx0MCA9PT0gbnVsbCkge1xuICAgICAgICAgIHBvcyA9IHBvczA7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDA7XG4gICAgICB9XG4gICAgICBcbiAgICAgIGZ1bmN0aW9uIHBhcnNlX011bHRpcGxpY2F0aXZlRXhwKCkge1xuICAgICAgICB2YXIgcmVzdWx0MCwgcmVzdWx0MSwgcmVzdWx0MiwgcmVzdWx0MztcbiAgICAgICAgdmFyIHBvczAsIHBvczEsIHBvczI7XG4gICAgICAgIFxuICAgICAgICBwb3MwID0gcG9zO1xuICAgICAgICBwb3MxID0gcG9zO1xuICAgICAgICByZXN1bHQwID0gcGFyc2VfU2ltcGxlRmFjdG9yRXhwKCk7XG4gICAgICAgIGlmIChyZXN1bHQwICE9PSBudWxsKSB7XG4gICAgICAgICAgcmVzdWx0MSA9IFtdO1xuICAgICAgICAgIHBvczIgPSBwb3M7XG4gICAgICAgICAgcmVzdWx0MiA9IHBhcnNlX01VTFRJUExJQ0FUSVZFX09QUygpO1xuICAgICAgICAgIGlmIChyZXN1bHQyICE9PSBudWxsKSB7XG4gICAgICAgICAgICByZXN1bHQzID0gcGFyc2VfU2ltcGxlRmFjdG9yRXhwKCk7XG4gICAgICAgICAgICBpZiAocmVzdWx0MyAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICByZXN1bHQyID0gW3Jlc3VsdDIsIHJlc3VsdDNdO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgcmVzdWx0MiA9IG51bGw7XG4gICAgICAgICAgICAgIHBvcyA9IHBvczI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJlc3VsdDIgPSBudWxsO1xuICAgICAgICAgICAgcG9zID0gcG9zMjtcbiAgICAgICAgICB9XG4gICAgICAgICAgd2hpbGUgKHJlc3VsdDIgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHJlc3VsdDEucHVzaChyZXN1bHQyKTtcbiAgICAgICAgICAgIHBvczIgPSBwb3M7XG4gICAgICAgICAgICByZXN1bHQyID0gcGFyc2VfTVVMVElQTElDQVRJVkVfT1BTKCk7XG4gICAgICAgICAgICBpZiAocmVzdWx0MiAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICByZXN1bHQzID0gcGFyc2VfU2ltcGxlRmFjdG9yRXhwKCk7XG4gICAgICAgICAgICAgIGlmIChyZXN1bHQzICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0MiA9IFtyZXN1bHQyLCByZXN1bHQzXTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXN1bHQyID0gbnVsbDtcbiAgICAgICAgICAgICAgICBwb3MgPSBwb3MyO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICByZXN1bHQyID0gbnVsbDtcbiAgICAgICAgICAgICAgcG9zID0gcG9zMjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHJlc3VsdDEgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHJlc3VsdDAgPSBbcmVzdWx0MCwgcmVzdWx0MV07XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJlc3VsdDAgPSBudWxsO1xuICAgICAgICAgICAgcG9zID0gcG9zMTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmVzdWx0MCA9IG51bGw7XG4gICAgICAgICAgcG9zID0gcG9zMTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocmVzdWx0MCAhPT0gbnVsbCkge1xuICAgICAgICAgIHJlc3VsdDAgPSAoZnVuY3Rpb24ob2Zmc2V0LCBoZWFkLCB0YWlsKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgcmVzdWx0ID0gaGVhZDtcclxuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGFpbC5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IGFzdC5tdWx0aXBsaWNhdGl2ZSgvKmxlZnQqL3Jlc3VsdCwgLypyaWdodCovdGFpbFtpXVsxXSwgLypvcGVyYXRvciovdGFpbFtpXVswXSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0OyBcclxuICAgICAgICAgICAgfSkocG9zMCwgcmVzdWx0MFswXSwgcmVzdWx0MFsxXSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJlc3VsdDAgPT09IG51bGwpIHtcbiAgICAgICAgICBwb3MgPSBwb3MwO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQwO1xuICAgICAgfVxuICAgICAgXG4gICAgICBmdW5jdGlvbiBwYXJzZV9TaW1wbGVGYWN0b3JFeHAoKSB7XG4gICAgICAgIHZhciByZXN1bHQwLCByZXN1bHQxO1xuICAgICAgICB2YXIgcG9zMCwgcG9zMTtcbiAgICAgICAgXG4gICAgICAgIHBvczAgPSBwb3M7XG4gICAgICAgIHBvczEgPSBwb3M7XG4gICAgICAgIGlmIChpbnB1dC5jaGFyQ29kZUF0KHBvcykgPT09IDQzKSB7XG4gICAgICAgICAgcmVzdWx0MCA9IFwiK1wiO1xuICAgICAgICAgIHBvcysrO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJlc3VsdDAgPSBudWxsO1xuICAgICAgICAgIGlmIChyZXBvcnRGYWlsdXJlcyA9PT0gMCkge1xuICAgICAgICAgICAgbWF0Y2hGYWlsZWQoXCJcXFwiK1xcXCJcIik7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChyZXN1bHQwID09PSBudWxsKSB7XG4gICAgICAgICAgaWYgKGlucHV0LmNoYXJDb2RlQXQocG9zKSA9PT0gNDUpIHtcbiAgICAgICAgICAgIHJlc3VsdDAgPSBcIi1cIjtcbiAgICAgICAgICAgIHBvcysrO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXN1bHQwID0gbnVsbDtcbiAgICAgICAgICAgIGlmIChyZXBvcnRGYWlsdXJlcyA9PT0gMCkge1xuICAgICAgICAgICAgICBtYXRjaEZhaWxlZChcIlxcXCItXFxcIlwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmVzdWx0MCA9IHJlc3VsdDAgIT09IG51bGwgPyByZXN1bHQwIDogXCJcIjtcbiAgICAgICAgaWYgKHJlc3VsdDAgIT09IG51bGwpIHtcbiAgICAgICAgICByZXN1bHQxID0gcGFyc2VfRmFjdG9yRXhwKCk7XG4gICAgICAgICAgaWYgKHJlc3VsdDEgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHJlc3VsdDAgPSBbcmVzdWx0MCwgcmVzdWx0MV07XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJlc3VsdDAgPSBudWxsO1xuICAgICAgICAgICAgcG9zID0gcG9zMTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmVzdWx0MCA9IG51bGw7XG4gICAgICAgICAgcG9zID0gcG9zMTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocmVzdWx0MCAhPT0gbnVsbCkge1xuICAgICAgICAgIHJlc3VsdDAgPSAoZnVuY3Rpb24ob2Zmc2V0LCBzaWduLCBleHByKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gIHNpZ24gIT09ICctJyA/IGV4cHIgOiBhc3QubmVnYXRpdmUoZXhwcik7XHJcbiAgICAgICAgICAgIH0pKHBvczAsIHJlc3VsdDBbMF0sIHJlc3VsdDBbMV0pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChyZXN1bHQwID09PSBudWxsKSB7XG4gICAgICAgICAgcG9zID0gcG9zMDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0MDtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgZnVuY3Rpb24gcGFyc2VfRmFjdG9yRXhwKCkge1xuICAgICAgICB2YXIgcmVzdWx0MCwgcmVzdWx0MSwgcmVzdWx0MjtcbiAgICAgICAgdmFyIHBvczAsIHBvczE7XG4gICAgICAgIFxuICAgICAgICByZXN1bHQwID0gcGFyc2VfTnVtYmVyKCk7XG4gICAgICAgIGlmIChyZXN1bHQwID09PSBudWxsKSB7XG4gICAgICAgICAgcmVzdWx0MCA9IHBhcnNlX0Z1bmN0aW9uSW52b2NhdGlvbigpO1xuICAgICAgICAgIGlmIChyZXN1bHQwID09PSBudWxsKSB7XG4gICAgICAgICAgICByZXN1bHQwID0gcGFyc2VfTWF0cml4KCk7XG4gICAgICAgICAgICBpZiAocmVzdWx0MCA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICBwb3MwID0gcG9zO1xuICAgICAgICAgICAgICBwb3MxID0gcG9zO1xuICAgICAgICAgICAgICByZXN1bHQwID0gcGFyc2VfT19QQVIoKTtcbiAgICAgICAgICAgICAgaWYgKHJlc3VsdDAgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICByZXN1bHQxID0gcGFyc2VfTG9naWNhbEV4cCgpO1xuICAgICAgICAgICAgICAgIGlmIChyZXN1bHQxICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICByZXN1bHQyID0gcGFyc2VfQ19QQVIoKTtcbiAgICAgICAgICAgICAgICAgIGlmIChyZXN1bHQyICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdDAgPSBbcmVzdWx0MCwgcmVzdWx0MSwgcmVzdWx0Ml07XG4gICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQwID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgcG9zID0gcG9zMTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgcmVzdWx0MCA9IG51bGw7XG4gICAgICAgICAgICAgICAgICBwb3MgPSBwb3MxO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXN1bHQwID0gbnVsbDtcbiAgICAgICAgICAgICAgICBwb3MgPSBwb3MxO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGlmIChyZXN1bHQwICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0MCA9IChmdW5jdGlvbihvZmZzZXQsIGV4cCkgeyByZXR1cm4gZXhwOyB9KShwb3MwLCByZXN1bHQwWzFdKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBpZiAocmVzdWx0MCA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIHBvcyA9IHBvczA7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDA7XG4gICAgICB9XG4gICAgICBcbiAgICAgIGZ1bmN0aW9uIHBhcnNlX051bWJlcigpIHtcbiAgICAgICAgdmFyIHJlc3VsdDAsIHJlc3VsdDE7XG4gICAgICAgIHZhciBwb3MwO1xuICAgICAgICBcbiAgICAgICAgcG9zMCA9IHBvcztcbiAgICAgICAgaWYgKC9eWzAtOV0vLnRlc3QoaW5wdXQuY2hhckF0KHBvcykpKSB7XG4gICAgICAgICAgcmVzdWx0MSA9IGlucHV0LmNoYXJBdChwb3MpO1xuICAgICAgICAgIHBvcysrO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJlc3VsdDEgPSBudWxsO1xuICAgICAgICAgIGlmIChyZXBvcnRGYWlsdXJlcyA9PT0gMCkge1xuICAgICAgICAgICAgbWF0Y2hGYWlsZWQoXCJbMC05XVwiKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJlc3VsdDEgIT09IG51bGwpIHtcbiAgICAgICAgICByZXN1bHQwID0gW107XG4gICAgICAgICAgd2hpbGUgKHJlc3VsdDEgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHJlc3VsdDAucHVzaChyZXN1bHQxKTtcbiAgICAgICAgICAgIGlmICgvXlswLTldLy50ZXN0KGlucHV0LmNoYXJBdChwb3MpKSkge1xuICAgICAgICAgICAgICByZXN1bHQxID0gaW5wdXQuY2hhckF0KHBvcyk7XG4gICAgICAgICAgICAgIHBvcysrO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgcmVzdWx0MSA9IG51bGw7XG4gICAgICAgICAgICAgIGlmIChyZXBvcnRGYWlsdXJlcyA9PT0gMCkge1xuICAgICAgICAgICAgICAgIG1hdGNoRmFpbGVkKFwiWzAtOV1cIik7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmVzdWx0MCA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJlc3VsdDAgIT09IG51bGwpIHtcbiAgICAgICAgICByZXN1bHQwID0gKGZ1bmN0aW9uKG9mZnNldCwgZGlnaXRzKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gYXN0LmNvbnN0YW50KCBwYXJzZUludChkaWdpdHMuam9pbihcIlwiKSwgMTApKTsgXHJcbiAgICAgICAgICAgIH0pKHBvczAsIHJlc3VsdDApO1xuICAgICAgICB9XG4gICAgICAgIGlmIChyZXN1bHQwID09PSBudWxsKSB7XG4gICAgICAgICAgcG9zID0gcG9zMDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0MDtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgZnVuY3Rpb24gcGFyc2VfRnVuY3Rpb25JbnZvY2F0aW9uKCkge1xuICAgICAgICB2YXIgcmVzdWx0MCwgcmVzdWx0MSwgcmVzdWx0MiwgcmVzdWx0MztcbiAgICAgICAgdmFyIHBvczAsIHBvczEsIHBvczI7XG4gICAgICAgIFxuICAgICAgICBwb3MwID0gcG9zO1xuICAgICAgICBwb3MxID0gcG9zO1xuICAgICAgICByZXN1bHQwID0gcGFyc2VfSWRlbnRpZmllcigpO1xuICAgICAgICBpZiAocmVzdWx0MCAhPT0gbnVsbCkge1xuICAgICAgICAgIHBvczIgPSBwb3M7XG4gICAgICAgICAgcmVzdWx0MSA9IHBhcnNlX09fUEFSKCk7XG4gICAgICAgICAgaWYgKHJlc3VsdDEgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHJlc3VsdDIgPSBwYXJzZV9QYXJhbWV0ZXJMaXN0KCk7XG4gICAgICAgICAgICBpZiAocmVzdWx0MiAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICByZXN1bHQzID0gcGFyc2VfQ19QQVIoKTtcbiAgICAgICAgICAgICAgaWYgKHJlc3VsdDMgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICByZXN1bHQxID0gW3Jlc3VsdDEsIHJlc3VsdDIsIHJlc3VsdDNdO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlc3VsdDEgPSBudWxsO1xuICAgICAgICAgICAgICAgIHBvcyA9IHBvczI7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHJlc3VsdDEgPSBudWxsO1xuICAgICAgICAgICAgICBwb3MgPSBwb3MyO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXN1bHQxID0gbnVsbDtcbiAgICAgICAgICAgIHBvcyA9IHBvczI7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJlc3VsdDEgPSByZXN1bHQxICE9PSBudWxsID8gcmVzdWx0MSA6IFwiXCI7XG4gICAgICAgICAgaWYgKHJlc3VsdDEgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHJlc3VsdDAgPSBbcmVzdWx0MCwgcmVzdWx0MV07XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJlc3VsdDAgPSBudWxsO1xuICAgICAgICAgICAgcG9zID0gcG9zMTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmVzdWx0MCA9IG51bGw7XG4gICAgICAgICAgcG9zID0gcG9zMTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocmVzdWx0MCAhPT0gbnVsbCkge1xuICAgICAgICAgIHJlc3VsdDAgPSAoZnVuY3Rpb24ob2Zmc2V0LCBpZCwgcGFyYW1ldGVycykge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGFzdC5mdW5jdGlvbkludm9jYXRpb24oaWQubmFtZSwgcGFyYW1ldGVycyAhPT0gJycgPyBwYXJhbWV0ZXJzWzFdIDogW10pO1xyXG4gICAgICAgICAgICB9KShwb3MwLCByZXN1bHQwWzBdLCByZXN1bHQwWzFdKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocmVzdWx0MCA9PT0gbnVsbCkge1xuICAgICAgICAgIHBvcyA9IHBvczA7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDA7XG4gICAgICB9XG4gICAgICBcbiAgICAgIGZ1bmN0aW9uIHBhcnNlX1BhcmFtZXRlckxpc3QoKSB7XG4gICAgICAgIHZhciByZXN1bHQwLCByZXN1bHQxLCByZXN1bHQyLCByZXN1bHQzO1xuICAgICAgICB2YXIgcG9zMCwgcG9zMSwgcG9zMjtcbiAgICAgICAgXG4gICAgICAgIHBvczAgPSBwb3M7XG4gICAgICAgIHBvczEgPSBwb3M7XG4gICAgICAgIHJlc3VsdDAgPSBwYXJzZV9Mb2dpY2FsRXhwKCk7XG4gICAgICAgIGlmIChyZXN1bHQwICE9PSBudWxsKSB7XG4gICAgICAgICAgcmVzdWx0MSA9IFtdO1xuICAgICAgICAgIHBvczIgPSBwb3M7XG4gICAgICAgICAgcmVzdWx0MiA9IHBhcnNlX0NPTU1BKCk7XG4gICAgICAgICAgaWYgKHJlc3VsdDIgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHJlc3VsdDMgPSBwYXJzZV9Mb2dpY2FsRXhwKCk7XG4gICAgICAgICAgICBpZiAocmVzdWx0MyAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICByZXN1bHQyID0gW3Jlc3VsdDIsIHJlc3VsdDNdO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgcmVzdWx0MiA9IG51bGw7XG4gICAgICAgICAgICAgIHBvcyA9IHBvczI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJlc3VsdDIgPSBudWxsO1xuICAgICAgICAgICAgcG9zID0gcG9zMjtcbiAgICAgICAgICB9XG4gICAgICAgICAgd2hpbGUgKHJlc3VsdDIgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHJlc3VsdDEucHVzaChyZXN1bHQyKTtcbiAgICAgICAgICAgIHBvczIgPSBwb3M7XG4gICAgICAgICAgICByZXN1bHQyID0gcGFyc2VfQ09NTUEoKTtcbiAgICAgICAgICAgIGlmIChyZXN1bHQyICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgIHJlc3VsdDMgPSBwYXJzZV9Mb2dpY2FsRXhwKCk7XG4gICAgICAgICAgICAgIGlmIChyZXN1bHQzICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0MiA9IFtyZXN1bHQyLCByZXN1bHQzXTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXN1bHQyID0gbnVsbDtcbiAgICAgICAgICAgICAgICBwb3MgPSBwb3MyO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICByZXN1bHQyID0gbnVsbDtcbiAgICAgICAgICAgICAgcG9zID0gcG9zMjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHJlc3VsdDEgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHJlc3VsdDAgPSBbcmVzdWx0MCwgcmVzdWx0MV07XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJlc3VsdDAgPSBudWxsO1xuICAgICAgICAgICAgcG9zID0gcG9zMTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmVzdWx0MCA9IG51bGw7XG4gICAgICAgICAgcG9zID0gcG9zMTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocmVzdWx0MCAhPT0gbnVsbCkge1xuICAgICAgICAgIHJlc3VsdDAgPSAoZnVuY3Rpb24ob2Zmc2V0LCBoZWFkLCB0YWlsKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gW2hlYWRdLmNvbmNhdChzZWNvbmROb2RlKHRhaWwpKTtcclxuICAgICAgICAgICAgfSkocG9zMCwgcmVzdWx0MFswXSwgcmVzdWx0MFsxXSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJlc3VsdDAgPT09IG51bGwpIHtcbiAgICAgICAgICBwb3MgPSBwb3MwO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQwO1xuICAgICAgfVxuICAgICAgXG4gICAgICBcbiAgICAgIGZ1bmN0aW9uIGNsZWFudXBFeHBlY3RlZChleHBlY3RlZCkge1xuICAgICAgICBleHBlY3RlZC5zb3J0KCk7XG4gICAgICAgIFxuICAgICAgICB2YXIgbGFzdEV4cGVjdGVkID0gbnVsbDtcbiAgICAgICAgdmFyIGNsZWFuRXhwZWN0ZWQgPSBbXTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBleHBlY3RlZC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIGlmIChleHBlY3RlZFtpXSAhPT0gbGFzdEV4cGVjdGVkKSB7XG4gICAgICAgICAgICBjbGVhbkV4cGVjdGVkLnB1c2goZXhwZWN0ZWRbaV0pO1xuICAgICAgICAgICAgbGFzdEV4cGVjdGVkID0gZXhwZWN0ZWRbaV07XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjbGVhbkV4cGVjdGVkO1xuICAgICAgfVxuICAgICAgXG4gICAgICBmdW5jdGlvbiBjb21wdXRlRXJyb3JQb3NpdGlvbigpIHtcbiAgICAgICAgLypcbiAgICAgICAgICogVGhlIGZpcnN0IGlkZWEgd2FzIHRvIHVzZSB8U3RyaW5nLnNwbGl0fCB0byBicmVhayB0aGUgaW5wdXQgdXAgdG8gdGhlXG4gICAgICAgICAqIGVycm9yIHBvc2l0aW9uIGFsb25nIG5ld2xpbmVzIGFuZCBkZXJpdmUgdGhlIGxpbmUgYW5kIGNvbHVtbiBmcm9tXG4gICAgICAgICAqIHRoZXJlLiBIb3dldmVyIElFJ3MgfHNwbGl0fCBpbXBsZW1lbnRhdGlvbiBpcyBzbyBicm9rZW4gdGhhdCBpdCB3YXNcbiAgICAgICAgICogZW5vdWdoIHRvIHByZXZlbnQgaXQuXG4gICAgICAgICAqL1xuICAgICAgICBcbiAgICAgICAgdmFyIGxpbmUgPSAxO1xuICAgICAgICB2YXIgY29sdW1uID0gMTtcbiAgICAgICAgdmFyIHNlZW5DUiA9IGZhbHNlO1xuICAgICAgICBcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBNYXRoLm1heChwb3MsIHJpZ2h0bW9zdEZhaWx1cmVzUG9zKTsgaSsrKSB7XG4gICAgICAgICAgdmFyIGNoID0gaW5wdXQuY2hhckF0KGkpO1xuICAgICAgICAgIGlmIChjaCA9PT0gXCJcXG5cIikge1xuICAgICAgICAgICAgaWYgKCFzZWVuQ1IpIHsgbGluZSsrOyB9XG4gICAgICAgICAgICBjb2x1bW4gPSAxO1xuICAgICAgICAgICAgc2VlbkNSID0gZmFsc2U7XG4gICAgICAgICAgfSBlbHNlIGlmIChjaCA9PT0gXCJcXHJcIiB8fCBjaCA9PT0gXCJcXHUyMDI4XCIgfHwgY2ggPT09IFwiXFx1MjAyOVwiKSB7XG4gICAgICAgICAgICBsaW5lKys7XG4gICAgICAgICAgICBjb2x1bW4gPSAxO1xuICAgICAgICAgICAgc2VlbkNSID0gdHJ1ZTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29sdW1uKys7XG4gICAgICAgICAgICBzZWVuQ1IgPSBmYWxzZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiB7IGxpbmU6IGxpbmUsIGNvbHVtbjogY29sdW1uIH07XG4gICAgICB9XG4gICAgICBcbiAgICAgIFxyXG4gICAgICB2YXIgYXN0ID0gTWF0ZW1hdGljYS5hc3Q7XHJcbiAgICAgIGZ1bmN0aW9uIHNlY29uZE5vZGUodGFpbCl7IFxyXG4gICAgICAgICAgdmFyIHJlc3VsdCA9IFtdO1xyXG4gICAgICAgICAgZm9yKHZhciBpPTA7IGk8dGFpbC5sZW5ndGg7IGkrKyl7XHJcbiAgICAgICAgICAgICAgcmVzdWx0LnB1c2godGFpbFtpXVsxXSk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICByZXR1cm4gcmVzdWx0O1xyXG4gICAgICB9XHJcbiAgICAgIFxuICAgICAgXG4gICAgICB2YXIgcmVzdWx0ID0gcGFyc2VGdW5jdGlvbnNbc3RhcnRSdWxlXSgpO1xuICAgICAgXG4gICAgICAvKlxuICAgICAgICogVGhlIHBhcnNlciBpcyBub3cgaW4gb25lIG9mIHRoZSBmb2xsb3dpbmcgdGhyZWUgc3RhdGVzOlxuICAgICAgICpcbiAgICAgICAqIDEuIFRoZSBwYXJzZXIgc3VjY2Vzc2Z1bGx5IHBhcnNlZCB0aGUgd2hvbGUgaW5wdXQuXG4gICAgICAgKlxuICAgICAgICogICAgLSB8cmVzdWx0ICE9PSBudWxsfFxuICAgICAgICogICAgLSB8cG9zID09PSBpbnB1dC5sZW5ndGh8XG4gICAgICAgKiAgICAtIHxyaWdodG1vc3RGYWlsdXJlc0V4cGVjdGVkfCBtYXkgb3IgbWF5IG5vdCBjb250YWluIHNvbWV0aGluZ1xuICAgICAgICpcbiAgICAgICAqIDIuIFRoZSBwYXJzZXIgc3VjY2Vzc2Z1bGx5IHBhcnNlZCBvbmx5IGEgcGFydCBvZiB0aGUgaW5wdXQuXG4gICAgICAgKlxuICAgICAgICogICAgLSB8cmVzdWx0ICE9PSBudWxsfFxuICAgICAgICogICAgLSB8cG9zIDwgaW5wdXQubGVuZ3RofFxuICAgICAgICogICAgLSB8cmlnaHRtb3N0RmFpbHVyZXNFeHBlY3RlZHwgbWF5IG9yIG1heSBub3QgY29udGFpbiBzb21ldGhpbmdcbiAgICAgICAqXG4gICAgICAgKiAzLiBUaGUgcGFyc2VyIGRpZCBub3Qgc3VjY2Vzc2Z1bGx5IHBhcnNlIGFueSBwYXJ0IG9mIHRoZSBpbnB1dC5cbiAgICAgICAqXG4gICAgICAgKiAgIC0gfHJlc3VsdCA9PT0gbnVsbHxcbiAgICAgICAqICAgLSB8cG9zID09PSAwfFxuICAgICAgICogICAtIHxyaWdodG1vc3RGYWlsdXJlc0V4cGVjdGVkfCBjb250YWlucyBhdCBsZWFzdCBvbmUgZmFpbHVyZVxuICAgICAgICpcbiAgICAgICAqIEFsbCBjb2RlIGZvbGxvd2luZyB0aGlzIGNvbW1lbnQgKGluY2x1ZGluZyBjYWxsZWQgZnVuY3Rpb25zKSBtdXN0XG4gICAgICAgKiBoYW5kbGUgdGhlc2Ugc3RhdGVzLlxuICAgICAgICovXG4gICAgICBpZiAocmVzdWx0ID09PSBudWxsIHx8IHBvcyAhPT0gaW5wdXQubGVuZ3RoKSB7XG4gICAgICAgIHZhciBvZmZzZXQgPSBNYXRoLm1heChwb3MsIHJpZ2h0bW9zdEZhaWx1cmVzUG9zKTtcbiAgICAgICAgdmFyIGZvdW5kID0gb2Zmc2V0IDwgaW5wdXQubGVuZ3RoID8gaW5wdXQuY2hhckF0KG9mZnNldCkgOiBudWxsO1xuICAgICAgICB2YXIgZXJyb3JQb3NpdGlvbiA9IGNvbXB1dGVFcnJvclBvc2l0aW9uKCk7XG4gICAgICAgIFxuICAgICAgICB0aHJvdyBuZXcgdGhpcy5TeW50YXhFcnJvcihcbiAgICAgICAgICBjbGVhbnVwRXhwZWN0ZWQocmlnaHRtb3N0RmFpbHVyZXNFeHBlY3RlZCksXG4gICAgICAgICAgZm91bmQsXG4gICAgICAgICAgb2Zmc2V0LFxuICAgICAgICAgIGVycm9yUG9zaXRpb24ubGluZSxcbiAgICAgICAgICBlcnJvclBvc2l0aW9uLmNvbHVtblxuICAgICAgICApO1xuICAgICAgfVxuICAgICAgXG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG4gICAgXG4gICAgLyogUmV0dXJucyB0aGUgcGFyc2VyIHNvdXJjZSBjb2RlLiAqL1xuICAgIHRvU291cmNlOiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuX3NvdXJjZTsgfVxuICB9O1xuICBcbiAgLyogVGhyb3duIHdoZW4gYSBwYXJzZXIgZW5jb3VudGVycyBhIHN5bnRheCBlcnJvci4gKi9cbiAgXG4gIHJlc3VsdC5TeW50YXhFcnJvciA9IGZ1bmN0aW9uKGV4cGVjdGVkLCBmb3VuZCwgb2Zmc2V0LCBsaW5lLCBjb2x1bW4pIHtcbiAgICBmdW5jdGlvbiBidWlsZE1lc3NhZ2UoZXhwZWN0ZWQsIGZvdW5kKSB7XG4gICAgICB2YXIgZXhwZWN0ZWRIdW1hbml6ZWQsIGZvdW5kSHVtYW5pemVkO1xuICAgICAgXG4gICAgICBzd2l0Y2ggKGV4cGVjdGVkLmxlbmd0aCkge1xuICAgICAgICBjYXNlIDA6XG4gICAgICAgICAgZXhwZWN0ZWRIdW1hbml6ZWQgPSBcImVuZCBvZiBpbnB1dFwiO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDE6XG4gICAgICAgICAgZXhwZWN0ZWRIdW1hbml6ZWQgPSBleHBlY3RlZFswXTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICBleHBlY3RlZEh1bWFuaXplZCA9IGV4cGVjdGVkLnNsaWNlKDAsIGV4cGVjdGVkLmxlbmd0aCAtIDEpLmpvaW4oXCIsIFwiKVxuICAgICAgICAgICAgKyBcIiBvciBcIlxuICAgICAgICAgICAgKyBleHBlY3RlZFtleHBlY3RlZC5sZW5ndGggLSAxXTtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgZm91bmRIdW1hbml6ZWQgPSBmb3VuZCA/IHF1b3RlKGZvdW5kKSA6IFwiZW5kIG9mIGlucHV0XCI7XG4gICAgICBcbiAgICAgIHJldHVybiBcIkV4cGVjdGVkIFwiICsgZXhwZWN0ZWRIdW1hbml6ZWQgKyBcIiBidXQgXCIgKyBmb3VuZEh1bWFuaXplZCArIFwiIGZvdW5kLlwiO1xuICAgIH1cbiAgICBcbiAgICB0aGlzLm5hbWUgPSBcIlN5bnRheEVycm9yXCI7XG4gICAgdGhpcy5leHBlY3RlZCA9IGV4cGVjdGVkO1xuICAgIHRoaXMuZm91bmQgPSBmb3VuZDtcbiAgICB0aGlzLm1lc3NhZ2UgPSBidWlsZE1lc3NhZ2UoZXhwZWN0ZWQsIGZvdW5kKTtcbiAgICB0aGlzLm9mZnNldCA9IG9mZnNldDtcbiAgICB0aGlzLmxpbmUgPSBsaW5lO1xuICAgIHRoaXMuY29sdW1uID0gY29sdW1uO1xuICB9O1xuICBcbiAgcmVzdWx0LlN5bnRheEVycm9yLnByb3RvdHlwZSA9IEVycm9yLnByb3RvdHlwZTtcbiAgXG4gIHJldHVybiByZXN1bHQ7XG59KSgpO1xuIiwidmFyXHRjb21tb25zID0gcmVxdWlyZSgnLi9jb21tb25zJyksXHJcblx0cGFyc2VyID0gcmVxdWlyZSgnLi9wYXJzZXInKSxcclxuXHRjb21waWxlciA9IHJlcXVpcmUoJy4vY29tcGlsZXInKTtcclxuXHRcclxubW9kdWxlLmV4cG9ydHMuTWF0ZW1hdGljYSA9IChmdW5jdGlvbigpIHtcclxuXHJcblx0dmFyIE1hdGVtYXRpY2EgPSB7XHJcblx0XHRWRVJTSU9OOiBcIkBWRVJTSU9OXCIsXHJcblxyXG5cdFx0YnVpbGRQYXJzZXI6IGZ1bmN0aW9uKGNvZGUsIG9wdGlvbnMpIHtcclxuXHRcdFx0dmFyIGFzdCA9IE1hdGVtYXRpY2EucGFyc2VyLnBhcnNlKGNvZGUpLFxyXG5cdFx0XHRcdHh4eCA9IE1hdGVtYXRpY2EuY29tcGlsZXIuY29tcGlsZShhc3QsIG9wdGlvbnMpO1xyXG5cdFx0fVxyXG5cdH07XHJcblxyXG5cdHJldHVybiBNYXRlbWF0aWNhO1xyXG59KSgpO1xyXG4iXX0=
