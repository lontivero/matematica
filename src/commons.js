Matematica.ast = (function(){
    var me = this;
    function expression(type, operator, left, right){
        return {
            type: type,
            operator: operator,
            left: left,
            right: right
        };
    }

    return {
        constant: function (value){
            return { 
                type: 'ConstantExpression',  
                value: value 
            };
        },
        identifier: function (name){
            return { 
                type: 'Identifier',  
                name: name 
            };
        },
        functionInvocation: function (name, params){
            return {
                type: 'FunctionInvocation',
                name:  name,
                parameters: params || []
            };
        },
        assignment: function (left, right){
            return expression('Assignment', '=', left, right);
        },
        additive: function (left, right, operator){
            return expression('AdditiveExpression', operator || '+', left, right);
        },
        multiplicative: function (left, right, operator){
            return expression('MultiplicativeExpression', operator || '*', left, right);
        },
        logical: function (left, right, operator){
            return expression('LogicalExpression', operator || '&&', left, right);
        },
        comparison: function (left, right, operator){
            return expression('CompararisonExpression', operator || '==', left, right);
        },
        negative: function (node){
            return {
                type: 'NegativeExpression',
                node: node
            };
        },
        program: function (node){
            return {
                type: 'Program',
                statements: (node instanceof Array) ? node : [node]
            };
        }
    };
})();