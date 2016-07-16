var createVisitor = function (functions) {
	return function (node) {
		try {
			return functions[node.type].apply(null, arguments);
		} catch (err) {
			console.log(node, err);
		}
	};
};

var pass = function(node){
	return node;
};

var doNothing = function (){}

module.exports = {
	create:  createVisitor,
	nothing: doNothing,
	pass: pass
};