module.exports.constant = function (value){
    return { 
        type: 'ConstantExpression',  
        value: value 
    };
};
module.exports.identifier = function (name){
    return { 
        type: 'Identifier',  
        name: name 
    };
};
module.exports.functionInvocation = function (name, params){
    return {
        type: 'FunctionInvocation',
        name:  name,
        parameters: params || []
    };
};
module.exports.assignment = function (left, right){
    return {
        type: 'Assignment',
        left:  left,
        right: right
    };
};
module.exports.additive = function (left, right, operator){
    return {
        type: 'AdditiveExpression',
        operator: operator || '+',
        left:  left,
        right: right
    };
};
module.exports.multiplicative = function (left, right){
    return {
        type: 'MultiplicativeExpression',
        operator: '*',
        left:  left,
        right: right
    };
};
module.exports.negative = function (node){
    return {
        type: 'NegativeExpression',
        node: node
    };
};
module.exports.program = function (node){
    return {
        type: 'Program',
        statements: [node]
    };
};

