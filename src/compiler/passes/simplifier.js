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
