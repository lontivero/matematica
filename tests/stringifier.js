var stringify = require('./../src/compiler/passes/stringifier');
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
	exponential = ast.exponential,
    program = ast.program;

require('should');

describe('Stringify Expressions', function() {
    it('5  = "5"', function() {
        stringify(constant(5)).should.equal(5);
    });

    it('-(5) = "(-5)"', function() {
        stringify(negative(constant(5))).should.equal( '-5' );
    });

    it('2 + 4 = "2 + 4"', function() {
        stringify(additive(constant(2), constant(4))).should.equal( '2 + 4' );
    });

    it('2 - 4 = "2 - 4"', function() {
        stringify(additive(constant(2), constant(4), '-')).should.equal( '2 - 4' );
    });

    it('2 * (4 + 7) = "2 * (4 + 7)"', function() {
        stringify(multiplicative( constant(2), additive( constant(4), constant(7) )))
        .should.equal( "(2) * (4 + 7)" );
    });

    it('x = "x"', function() {
        stringify(functionInvocation('x')).should.equal( 'x' );
    });

    it('-(x) = "(-x)"', function() {
        stringify(negative(functionInvocation('x'))).should.equal( '-x' );
    });

    it('-(x(5)) = -x(5)', function() {
        stringify(negative(functionInvocation('x', [constant(5)]))).should.equal("-x(5)");
    });

    it('x + 2 + 3 = "x + 2 + 3"', function() {
        stringify(additive(functionInvocation('x'), additive(constant(2), constant(3))))
        .should.equal("x + 2 + 3");
    });

    it('x^(4+y) = "x^(4+y)"', function() {
        stringify(exponential(functionInvocation('x'), additive(constant(4), functionInvocation('y'))))
        .should.equal("x^(4 + y)");
    });
	
    it('[1; 2; 3] = "[1; 2; 3]"', function() {
        stringify(matrix(1, 3, [constant(1), constant(2), constant(3)]))
        .should.equal("[1; 2; 3]");
    });

	
    it('[1 2 3; 4 5 6; 7 8 9] = "[1 2 3; 4 5 6; 7 8 9]"', function() {
        stringify(matrix(3, 3, [
			constant(1), constant(2), constant(3), 
			constant(4), constant(5), constant(6), 
			constant(7), constant(8), constant(9) 
		]))
        .should.equal("[1 2 3; 4 5 6; 7 8 9]");
    });
	
});
