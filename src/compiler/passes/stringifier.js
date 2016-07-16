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
