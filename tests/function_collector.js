var ast = require('./../src/ast'),
	parser=require('./../src/parser');
var collect = require('./../src/compiler/passes/function_collector');
var constant = ast.constant,
    identifier = ast.identifier,
    functionInvocation = ast.functionInvocation,
    assignment = ast.assignment,
    additive = ast.additive,
    multiplicative = ast.multiplicative,
    negative = ast.negative,
    program = ast.program;
var parse = parser.parse;

	
require('should');

describe('Collector', function() {
    it('5  = 5 (Do nothing)', function() {
        collect(constant(5)).should.eql(constant(5));
    });

    it('x = 4 ', function() {
        collect(functionInvocation('x')).should.eql( functionInvocation('x') );
    });
});
