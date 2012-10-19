var Matematica = require('./../lib/matematica.js'),
    collect = Matematica.compiler.passes.function_collector,
    parser =  Matematica.parser,
    parse = parser.parse,
    constant = Matematica.ast.constant, 
    identifier = Matematica.ast.identifier,
    functionInvocation = Matematica.ast.functionInvocation,
    assignment = Matematica.ast.assignment,
    additive = Matematica.ast.additive,
    multiplicative = Matematica.ast.multiplicative,
    negative = Matematica.ast.negative,
    program = Matematica.ast.program;
 
require('should');

suite('Collector', function() {
    test('5  = 5 (Do nothing)', function() {
        collect(constant(5)).should.eql(constant(5));
    });

    test('x = 4 ', function() {
        collect(functionInvocation('x')).should.eql( functionInvocation('x') );
    });

    test('x = 5; x + 3', function() {
        collect(
            program([
                assignment(identifier('x'), constant(5)),
                additive(functionInvocation('x'), constant(3))
            ]))
        .should.eql(
            program([
                assignment(identifier('x'), constant(5)),
                additive(constant(5), constant(3))
            ]));
    });
});
