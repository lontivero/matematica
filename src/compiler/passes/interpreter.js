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
