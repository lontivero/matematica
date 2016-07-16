var simplify = require('./../src/compiler/passes/simplifier');
var parser=require('./../src/parser');
var ast = require('./../src/ast');
var constant = ast.constant,
    identifier = ast.identifier,
    functionInvocation = ast.functionInvocation,
    assignment = ast.assignment,
    additive = ast.additive,
    multiplicative = ast.multiplicative,
    negative = ast.negative,
	matrix = ast.matrix,
	exponential=ast.exponential,
    program = ast.program;

var parse = parser.parse;

require('should');

describe('Simplify Expressions', function() {
    it('5  = 5 (Do nothing)', function() {
        simplify(constant(5)).should.eql(constant(5));
    });

    it('-(5) = -5 (NegativeExpression/ConstantExpression)', function() {
        simplify(negative(constant(5))).should.eql( constant(-5) );
    });

    it('2 + 4 = 6 (AdditiveExpression/ConstantExpressions)', function() {
        simplify(additive(constant(2), constant(4))).should.eql( constant(6) );
    });

    it('2 - 4 = -2 (AdditiveExpression/ConstantExpressions)', function() {
        simplify(additive(constant(2), constant(4), '-')).should.eql( constant(-2) );
    });

    it('2 * (4 + 7) = 22 (MultiplicativeExpression/Multiplicative/ConstantExpressions)', function() {
        simplify(multiplicative( constant(2), additive( constant(4), constant(7) )))
        .should.eql( constant(22) );
    });

    it('x = x (FunctionInvocation)', function() {
        simplify(functionInvocation('x')).should.eql( functionInvocation('x') );
    });

    it('-(x) = -x (NegativeExpression/FunctionInvocation)', function() {
        simplify(negative(functionInvocation('x'))).should.eql( negative(functionInvocation('x')) );
    });

    it('-(x(5)) = -x(5) (NegativeExpression/FunctionInvocation)', function() {
        simplify(negative(functionInvocation('x', [constant(5)])))
        .should.eql(negative(functionInvocation('x', [constant(5)])));
    });

    it('(x + 2) + 3 = x + 5 (NegativeExpression/FunctionInvocation)', function() {
        simplify(additive(additive(functionInvocation('x'), constant(2)), constant(3)))
        .should.eql(additive(functionInvocation('x'), constant(5)));
    });

    it('13 + x - 7 + x = 2 * x + 5 (NegativeExpression/FunctionInvocation)', function() {
        console.log(simplify(
			additive(
				additive(constant(13), functionInvocation('x')),
				negative(constant(7))),
			functionInvocation('x')));
//        .should.eql(additive(multiplicative(constant(2), functionInvocation('x')), constant(6)));
    });
	

	
    it('x + (2 - 3) = x -1 (NegativeExpression/FunctionInvocation)', function() {
        simplify(additive(functionInvocation('x'), additive(constant(2), negative(constant(3)))))
        .should.eql(additive(functionInvocation('x'), constant(-1)));
    });
	
    it('x^(4 * 3) = x^12 (ExponentialExpression)', function() {
        simplify(exponential(functionInvocation('x'), multiplicative(constant(4), constant(3))))
        .should.eql(exponential(functionInvocation('x'), constant(12)));
    });

    it('4^(4 - 2) = 16 (ExponentialExpression)', function() {
        simplify(exponential(constant(4), additive(constant(4), negative(constant(2)))))
        .should.eql(constant(16));
    });

    it('cos(w) + sin(s) = cos(w) + sin(s) (FunctionInvocation)', function() {
        simplify(
			additive(
				functionInvocation('cos', [functionInvocation('w')]), 
				functionInvocation('sin', [functionInvocation('s')])
				))
        .should.eql(			additive(
				functionInvocation('cos', [functionInvocation('w')]), 
				functionInvocation('sin', [functionInvocation('s')])
				));
    });
});
