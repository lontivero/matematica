require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
module.exports = (function(){
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
		exponential: function(base, exp){
			return {
				type: 'ExponentialExpression',
				base: base,
				exp: exp
			};
		},
		external: function(name){
			return {
				type: 'External',
				name: name
			};
		},
		matrix: function(n, m, nodes){
			return {
				type: 'Matrix',
				m: m,
				n: n,
				elements: nodes
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

},{"./compiler/passes/function_collector":3,"./compiler/passes/interpreter":4,"./compiler/passes/simplifier":5,"./compiler/passes/stringifier":6}],3:[function(require,module,exports){
var symtable = require('./../symtable'),
visitor = require('./../visitor');

module.exports = function (ast) {

	function clone(src, toClone) {
		for (var attr in toClone) {
			if (toClone.hasOwnProperty(attr))
				delete (toClone[attr]);
		}

		for (var i in src) {
			if (src.hasOwnProperty(i)) {
				if (src[i] && typeof src[i] == "object") {
					toClone[i] = clone(src[i]);
				} else {
					toClone[i] = src[i];
				}
			}
		}
	}

	function collectExp(node) {
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
		symtable.register(node.left.name, node.right);
		collect(node.right);
	}

	function collectFunctionInv(node) {
		var fnc = symtable.resolve(node.name);
		if (fnc) {
			node.parameters.map(collect);
			//        clone(fnc, node);
		}
	}

	function collectProgram(node) {
		node.statements.forEach(collect);
	}

	var collect = visitor.create({
			Program : collectProgram,
			Identifier : visitor.nothing,
			FunctionInvocation : collectFunctionInv,
			Assignment : collectAssignment,
			Matrix : collectMatrix,
			Vector : collectVector,
			LogicalExpression : collectExp,
			CompararisonExpression : collectExp,
			AdditiveExpression : collectExp,
			MultiplicativeExpression : collectExp,
			NegativeExpression : collectNegExp,
			ConstantExpression : visitor.nothing
		});

	collect(ast);
	return ast;
};

},{"./../symtable":7,"./../visitor":8}],4:[function(require,module,exports){
var symtable = require('./../symtable'),
	visitor = require('./../visitor'),
	astNodes = require('./../../ast');

function isConstantExpression(node) {
	return node.type === 'ConstantExpression';
}

module.exports = function (ast) {
	function evaluateAdditiveExp(node) {
		node.left = evaluate(node.left);
		node.right= evaluate(node.right);
		if(isConstantExpression(node.left) && isConstantExpression(node.right)){
			var sign = node.operator === '+' ? 1 : -1;
			node = astNodes.constant(node.left.value + (sign * node.right.value));
		}
		return node;
	}

	function evaluateMultiplicativeExp(node) {
		node.left = evaluate(node.left);
		node.right= evaluate(node.right);
		if(isConstantExpression(node.left) && isConstantExpression(node.right)){
			var value = node.operator === '*' ?
				node.left.value * node.right.value :
				node.left.value / node.right.value;
			node = astNodes.constant(value);
		}
		return node;
	}

	function evaluateLogicalExp(node) {
		node.left = evaluate(node.left);
		node.right= evaluate(node.right);
		if(isConstantExpression(node.left) && isConstantExpression(node.right)){
			var value = node.operator === '&&' ?
				node.left.value && node.right.value :
				node.left.value || node.right.value;
			node = astNodes.constant(value);
		}
		return node;
	}

	function evaluateCompararisonExp(node) {
		var result = null;
		switch (node.operator) {
		case '==':
			result = evaluate(node.left) == evaluate(node.right);
			break;
		case '!=':
			result = evaluate(node.left) != evaluate(node.right);
			break;
		case '>':
			result = evaluate(node.left) > evaluate(node.right);
			break;
		case '>=':
			result = evaluate(node.left) >= evaluate(node.right);
			break;
		case '<':
			result = evaluate(node.left) < evaluate(node.right);
			break;
		case '<=':
			result = evaluate(node.left) <= evaluate(node.right);
			break;
		}
		return result;
	}

	function evaluateNegExp(node) {
		return -1 * evaluate(node.node);
	}

	function evaluateMatrix(node) {
		return astNodes.matrix(node.m, node.n, node.elements.map(evaluate));
	}

	function evaluateVector(node) {
		return node.elements.map(evaluate);
	}

	function evaluateAssignment(node) {
		symtable.register(node.left.name, node.right);
		return node;
	}

	function evaluateFunctionInv(node) {
		var symbol = symtable.resolve(node.name);
		if (symbol) {
			return evaluate(symbol);
		}
		var mathFnc = Math[node.name];
		if (mathFnc) {
			var argsNodes = node.parameters.map(evaluate);
			var args = argsNodes.map(function(n){ return n.value; });
			return astNodes.constant(mathFnc.apply(this, args));
		}
		return node;
		//throw node.name + ' was not defined';
	}

	function evaluateProgram(node) {
		return node.statements.map(evaluate);
	}

	var evaluate = visitor.create({
			Program : evaluateProgram,
			Identifier : function (node) {
				return node.name;
			},
			FunctionInvocation : evaluateFunctionInv,
			Assignment : evaluateAssignment,
			Matrix : evaluateMatrix,
			Vector : evaluateVector,
			LogicalExpression : evaluateLogicalExp,
			CompararisonExpression : evaluateCompararisonExp,
			AdditiveExpression : evaluateAdditiveExp,
			MultiplicativeExpression : evaluateMultiplicativeExp,
			NegativeExpression : evaluateNegExp,
			ConstantExpression : visitor.pass
		});

	return evaluate(ast);
};

},{"./../../ast":1,"./../symtable":7,"./../visitor":8}],5:[function(require,module,exports){
var visitor =  require('./../visitor'),
	astNodes = require('./../../ast');

module.exports = function (ast) {

	function isConstantExpression(node) {
		return node.type === 'ConstantExpression';
	}

	function isAdditiveExpression(node) {
		return node.type === 'AdditiveExpression';
	}

	function simplifyAdditiveExp(node) {
		var p,
		t;
		node.left = simplify(node.left);
		node.right = simplify(node.right);

		if (isConstantExpression(node.left) || isConstantExpression(node.right)) {
			if (isConstantExpression(node.left) && isConstantExpression(node.right)) {
				var sign = node.operator === '+' ? 1 : -1;
				node = astNodes.constant(node.left.value + (sign * node.right.value));
			} else if (isConstantExpression(node.right) && isAdditiveExpression(node.left)) {
				p = node.left;
				if (isConstantExpression(p.left)) {
					t = p.left;
					p.left = p.right;
					p.right = t;
				}
				node.left = p.right;
				p.right = node;
				node = p;
				node.left = simplify(node.left);
				node.right = simplify(node.right);

			} else if (isConstantExpression(node.left) && isAdditiveExpression(node.right)) {
				p = node.right;
				if (isConstantExpression(p.right)) {
					t = p.left;
					p.left = p.right;
					p.right = t;
				}
				node.right = node.right.right;
				node.left = astNodes.additive(p.left, node.left, p.operator);
				node.left = simplify(node.left);
			}
		}
		return node;
	}

	function simplifyMultiplicativeExp(node) {
		node.left = simplify(node.left);
		node.right = simplify(node.right);

		if (isConstantExpression(node.left) && isConstantExpression(node.right)) {
			var value = node.operator === '*' ?
				node.left.value * node.right.value :
				node.left.value / node.right.value;
			node = astNodes.constant(value);
		}
		return node;
	}

	function simplifyExponentialExp(node) {
		node.base = simplify(node.base);
		node.exp = simplify(node.exp);
		if (isConstantExpression(node.base) && isConstantExpression(node.exp)) {
			return astNodes.constant(Math.pow(node.base.value, node.exp.value));
		}
		return node;
	}
		
	function simplifyLogicalExp(node) {
		node.left = simplify(node.left);
		node.right = simplify(node.right);

		if (isConstantExpression(node.left) && isConstantExpression(node.right)) {
			var value = node.operator === '&&' ?
				node.left.value && node.right.value :
				node.left.value || node.right.value;
			node = astNodes.constant(value);
		}
		return node;
	}

	function simplifyCompararisonExp(node) {
		var result = null;
		node.left = simplify(node.left);
		node.right = simplify(node.right);

		if (isConstantExpression(node.left) && isConstantExpression(node.right)) {
			var value;
			switch (node.operator) {
			case '==':
				value = node.left.value == node.right.value;
				break;
			case '!=':
				value = node.left.value != node.right.value;
				break;
			case '>':
				value = node.left.value > node.right.value;
				break;
			case '>=':
				value = node.left.value >= node.right.value;
				break;
			case '<':
				value = node.left.value < node.right.value;
				break;
			case '<=':
				value = node.left.value <= node.right.value;
				break;
			}
			node = astNodes.constant(value);
		}
		return node;
	}

	function simplifyNegExp(node) {
		var n = simplify(node.node);
		if (isConstantExpression(n)) {
			node.type = 'ConstantExpression';
			node.value = -1 * n.value;
			delete (node.node);
		}
		return node;
	}

	function simplifyAssignment(node) {
		node.right = simplify(node.right);
		return node;
	}

	function simplifyMatrix(node) {
		node.elements.forEach(simplify);
		return node;
	}

	function simplifyVector(node) {
		node.elements.forEach(simplify);
		return node;
	}

	function simplifyConstantExp(node) {
		node.value = Number(node.value);
		return node;
	}

	function simplifyFunctionInvocation(node) {
		node.parameters.forEach(simplify);
		return node;
	}

	function simplifyProgram(node) {
		node.statements = node.statements.map(simplify);
		return node;
	}
	
	var simplify = visitor.create({
			Program : simplifyProgram,
			Identifier : visitor.pass,
			FunctionInvocation : simplifyFunctionInvocation,
			Assignment : simplifyAssignment,
			Matrix : simplifyMatrix,
			Vector : simplifyVector,
			LogicalExpression : simplifyLogicalExp,
			CompararisonExpression : simplifyCompararisonExp,
			AdditiveExpression : simplifyAdditiveExp,
			MultiplicativeExpression : simplifyMultiplicativeExp,
			NegativeExpression : simplifyNegExp,
			ConstantExpression : simplifyConstantExp,
			ExponentialExpression : simplifyExponentialExp
		});

	return simplify(ast);
};

},{"./../../ast":1,"./../visitor":8}],6:[function(require,module,exports){
String.prototype.supplant = function (o) {
	return this.replace(/{([^{}}]*)}/g,
		function (a, b) {
		var r = o[b];
		return typeof r === 'string' || typeof r === 'number' ? r : a;
	});
};

var visitor = require('../visitor');

module.exports = function (ast) {
	function isAssociative(node) {
		var leftType = node.left.type,
			rightType = node.right.type,
			type = node.type,
			areSameType = leftType === rightType,
			isScalar = function (t) {
				return t === 'ConstantExpression' || t === 'FunctionInvocation';
			},
			isAdditive = function (t) {
				return t === 'AdditiveExpression';
			};

		return isAdditive(type) && (areSameType || (isScalar(leftType) && isScalar(rightType)) || (isScalar(leftType) && isAdditive(rightType)) || (isScalar(rightType) && isAdditive(leftType)));
	}

	function stringifyExp(node) {
		var template = isAssociative(node)
			? '{left} {op} {right}'
			: '({left}) {op} ({right})';

		return template.supplant({
			op : node.operator,
			left : stringify(node.left),
			right : stringify(node.right)
		});
	}

	function stringifyExponentialExp(node) {
		return '{base}^({exp})'.supplant({
			base: stringify(node.base),
			exp : stringify(node.exp)
		});
	}
	
	function stringifyNumber(node) {
		return node.value;
	}

	function stringifyNegExp(node) {
		return '-{expr}'.supplant({
			expr : stringify(node.node)
		});
	}

	function stringifyMatrix(node) {
		var elements = node.elements.map(stringify);
		var rows = [];
		for (var r = 0; r < node.m; r++) {
			var cells = []
			for (var i = 0; i < node.n; i++) {
				cells.push(elements[i + ((r) * node.n)]);
			}
			rows.push(cells.join(' '));
		}

		return '[{e}]'.supplant({
			e : rows.join('; ')
		});
	}

	function stringifyVector(node) {
		return node.elements.map(stringify).join(' ');
	}

	function stringifyAssignment(node) {
		return '{lhs} = {rhs}'.supplant({
			lhs : stringify(node.left),
			rhs : stringify(node.right)
		});
	}

	function stringifyFunctionInv(node) {
		var template = '{name}' + (node.parameters.length ? '({parameters})' : '');
		return template.supplant({
			name : node.name,
			parameters : node.parameters.map(stringify).join(', ')
		});
	}

	function stringifyProgram(node) {
		return node.statements.map(stringify).join(';\n');
	}

	var stringify = visitor.create({
			Program : stringifyProgram,
			Identifier : function (node) {
				return node.name;
			},
			FunctionInvocation : stringifyFunctionInv,
			Assignment : stringifyAssignment,
			Matrix : stringifyMatrix,
			Vector : stringifyVector,
			LogicalExpression : stringifyExp,
			CompararisonExpression : stringifyExp,
			AdditiveExpression : stringifyExp,
			MultiplicativeExpression : stringifyExp,
			NegativeExpression : stringifyNegExp,
			ConstantExpression : stringifyNumber,
			ExponentialExpression: stringifyExponentialExp
		});

	return stringify(ast);
};

},{"../visitor":8}],7:[function(require,module,exports){
module.exports = {

	scope : {},

	register : function (name, node) {
		var me = this;
		me.scope[name] = node;
	},

	resolve : function (name) {
		var me = this,
		cur_scope = me.scope,
		sym;
		while (cur_scope) {
			sym = cur_scope[name];
			if (sym)
				return sym;
			cur_scope = cur_scope.____parent____;
		}
		return undefined;
	},

	enter_scope : function () {
		var me = this;
		me.scope.____next____ = {
			____parent____ : me.scope
		};
		me.scope = me.scope.____next____;
	},

	exit_scope : function () {
		var me = this;
		me.scope = me.scope.____parent____;
	}
};

},{}],8:[function(require,module,exports){
var createVisitor = function (functions) {
	return function (node) {
		try {
			return functions[node.type].apply(null, arguments);
		} catch (err) {
			console.log(node, err);
		}
	};
};

var pass = function(node){
	return node;
};

var doNothing = function (){}

module.exports = {
	create:  createVisitor,
	nothing: doNothing,
	pass: pass
};
},{}],9:[function(require,module,exports){
module.exports = (function(){
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
        "EXP_OP": parse_EXP_OP,
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
        "ExponentialExp": parse_ExponentialExp,
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
      
      function parse_EXP_OP() {
        var result0, result1, result2;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse___();
        if (result0 !== null) {
          if (input.charCodeAt(pos) === 94) {
            result1 = "^";
            pos++;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\"^\"");
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
          result0 = (function(offset) { return '^'; })(pos0);
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
                return ast.matrix(head.size, tail.length+1, nodes);
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
        result0 = parse_ExponentialExp();
        if (result0 !== null) {
          result1 = [];
          pos2 = pos;
          result2 = parse_MULTIPLICATIVE_OPS();
          if (result2 !== null) {
            result3 = parse_ExponentialExp();
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
              result3 = parse_ExponentialExp();
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
      
      function parse_ExponentialExp() {
        var result0, result1, result2, result3;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_SimpleFactorExp();
        if (result0 !== null) {
          result1 = [];
          pos2 = pos;
          result2 = parse_EXP_OP();
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
            result2 = parse_EXP_OP();
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
                    result = ast.exponential(result, tail[i][1], tail[i][0]);
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
      
      
      var ast = require('./ast');
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

},{"./ast":1}],"matematica":[function(require,module,exports){
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

},{"./compiler":2,"./parser":9}]},{},[]);
