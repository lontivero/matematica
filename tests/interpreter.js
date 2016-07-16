var evaluate = require('./../src/compiler/passes/interpreter'),
	collect = require('./../src/compiler/passes/function_collector'),
	ast = require('./../src/ast'),
	parser=require('./../src/parser'),
	constant = ast.constant,
    identifier = ast.identifier,
    functionInvocation = ast.functionInvocation,
    assignment = ast.assignment,
    additive = ast.additive,
    multiplicative = ast.multiplicative,
    negative = ast.negative,
	matrix = ast.matrix,
	external=ast.external,
    program = ast.program,
	parse = parser.parse;

require('should');

describe('Simplify Expressions', function() {
    it('x = [Math.sin(s)]', function() {
		// x = [sin(s)]
		// y = x(s=2)
		// y()   #result [1]
		var prog = 
			program([
				assignment(
					identifier('x'),
					matrix(1, 1, [functionInvocation('sin', [functionInvocation('s')])])
					),
				assignment(
					identifier('y'),
					functionInvocation('x', [assignment(identifier('s'), constant(Math.PI/2))])
					),
				functionInvocation('y')
				]);
		
		collect(prog);
        evaluate(prog).slice(-1)[0].should.eql(matrix(1, 1, [constant(1)]));
    });

    it('x = 5; x + 3', function() {
		// x = 5
		// x + 3 #result 8
		var prog = 
            program([
                assignment(identifier('x'), constant(5)),
                additive(functionInvocation('x'), constant(3))
            ]);
			
		collect(prog);
        evaluate(prog).slice(-1)[0].should.eql(constant(8));
    });	
	
    it('x = sin(a) + cos(a)', function() {
		// x = 5
		// x + 3 #result 8
		var prog = 
            program([
                assignment(identifier('x'), constant(5)),
                additive(functionInvocation('x'), constant(3))
            ]);
			
		collect(prog);
        evaluate(prog).slice(-1)[0].should.eql(constant(8));
    });	
	
});
