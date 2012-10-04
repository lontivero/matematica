var should = require('should'),
	parser = require('./../parser');

debugger;

suite('Parse Expressions', function() {
  test('2 + 4 (AdditiveExpression)', function() {
  	var node = parser.parse('2 + 4');

    node.should.eql([{
    	type: 'AdditiveExpression',
    	operator: '+',
    	left: { 
    		type: 'ConstantExpression',
    		value: 2
    	},
    	right: { 
    		type: 'ConstantExpression',
    		value: 4
    	}    	
    }]);
  });

  test('2 * 4 (MultiplicativeExpression)', function() {
  	var node = parser.parse('2 * 4');

    node.should.eql([{
    	type: 'MultiplicativeExpression',
    	operator: '*',
    	left: { 
    		type: 'ConstantExpression',
    		value: 2
    	},
    	right: { 
    		type: 'ConstantExpression',
    		value: 4
    	}    	
    }]);
  });

  test('2 * (4 - 7) (MultiplicativeExpression/Multiplicative)', function() {
  	var node = parser.parse('2 * (4 - 7)');

    node.should.eql([{
    	type: 'MultiplicativeExpression',
    	operator: '*',
    	left: { 
    		type: 'ConstantExpression',
    		value: 2
    	},
    	right: { 
	    	type: 'AdditiveExpression',
    		operator: '-',
    		left: { 
    			type: 'ConstantExpression',
    			value: 4
    		},
    		right: {
    			type: 'ConstantExpression',
    			value: 7
    		}
    	}    	
    }]);
  });    
});
