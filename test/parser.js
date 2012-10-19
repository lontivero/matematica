var Matematica = require('./../lib/matematica.js'),
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

suite('Parse Expressions', function() {
    test('5 (ConstantExpression)', function() {
        parse('5').should.eql(program( constant(5) ));
    });

    test('-5 (NegativeExpression/ConstantExpression)', function() {
        parse('-5').should.eql(program( negative(constant(5)) ));
    });

    test('2 + 4 (AdditiveExpression)', function() {
        parse('2 + 4').should.eql(program( additive(constant(2), constant(4)) ));
    });

    test('2 * (4 + 7) (MultiplicativeExpression/Multiplicative)', function() {
        parse('2 * (4 + 7)').should.eql(program( 
            multiplicative( 
                constant(2), 
                additive( constant(4), constant(7) ))));
    });

    test('2 * 4 + 7 (MultiplicativeExpression/Multiplicative)', function() {
        parse('2 * 4 + 7').should.eql(program(
            additive( 
                multiplicative(constant(2), constant(4)), 
                constant(7))));
    });

    test('x (FunctionInvocation)', function() {
        parse('x').should.eql(program( functionInvocation('x') ));
    });

    test('-x (NegativeExpression/FunctionInvocation)', function() {
        parse('-x').should.eql(program( negative(functionInvocation('x')) ));
    });

    test('-x(5) (NegativeExpression/FunctionInvocation)', function() {
        parse('-x(5)').should.eql(program(negative(functionInvocation('x', [constant(5)]))));
    });

    test('a = -7*x + 4 (Assignment)', function() {
        parse('a = -7*x + 4').should.eql(program(
            assignment(
                identifier('a'), 
                additive(
                    multiplicative(negative(constant(7)), functionInvocation('x')), 
                    constant(4)))));
    });

    test('x=2; a = -7*x + 4; a   (Assignment)', function() {
        parse('x=2; a = -7*x + 4; a');
    });

    test('[cos(x) (-sin(x))); sin(x) cos(x)] (Rotation Matrix)', function() {
        var node =  {
            type: 'Matrix',
            n: 2, 
            m: 2,
            elements: [{
                type: 'Vector',
                size: 2,
                elements: [
                    functionInvocation('cos', [functionInvocation('x')]),
                    negative(functionInvocation('sin', [functionInvocation('x')]))
                ]
            },  {
                type: 'Vector',
                size: 2,
                elements: [
                    functionInvocation('sin', [functionInvocation('x')]),
                    functionInvocation('cos', [functionInvocation('x')])
                ]
            }]
        } ;

        var ast = parse('[cos(x) (-sin(x)); sin(x) cos(x)]');
        ast.should.eql(program(node));
    });        
});
