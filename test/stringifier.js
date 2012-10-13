var stringify = require('./../lib/matematica.js').compiler.passes.stringifier,
    nodebuilder = require('./commons.js'),
    constant = nodebuilder.constant, 
    identifier = nodebuilder.identifier,
    functionInvocation = nodebuilder.functionInvocation,
    assignment = nodebuilder.assignment,
    additive = nodebuilder.additive,
    multiplicative = nodebuilder.multiplicative,
    negative = nodebuilder.negative,
    program = nodebuilder.program;
 
require('should');

suite('Stringify Expressions', function() {
    test('5  = "5"', function() {
        stringify(constant(5)).should.equal(5);
    });

    test('-(5) = "(-5)"', function() {
        stringify(negative(constant(5))).should.equal( '-5' );
    });

    test('2 + 4 = "2 + 4"', function() {
        stringify(additive(constant(2), constant(4))).should.equal( '2 + 4' );
    });

    test('2 - 4 = "2 - 4"', function() {
        stringify(additive(constant(2), constant(4), '-')).should.equal( '2 - 4' );
    });

    test('2 * (4 + 7) = "2 * (4 + 7)"', function() {
        stringify(multiplicative( constant(2), additive( constant(4), constant(7) )))
        .should.equal( "2 * (4 + 7)" );
    });

    test('x = "x"', function() {
        stringify(functionInvocation('x')).should.equal( 'x' );
    });

    test('-(x) = "(-x)"', function() {
        stringify(negative(functionInvocation('x'))).should.equal( '-x' );
    });

    test('-(x(5)) = -x(5)', function() {
        stringify(negative(functionInvocation('x', [constant(5)]))).should.equal("-x(5)");
    });

    test('x + 2 + 3 = "x + 2 + 3"', function() {
        stringify(additive(functionInvocation('x'), additive(constant(2), constant(3))))
        .should.equal("x + 2 + 3");
    });
});
