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
