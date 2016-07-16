{
var ast = require('./ast');
function secondNode(tail){ 
    var result = [];
    for(var i=0; i<tail.length; i++){
        result.push(tail[i][1]);
    }
    return result;
}
}

start
    = StatementList

SourceCharacter
    = .

WhiteSpace "whitespace"
    = [\t\v\f \u00A0\uFEFF]
    / Zs

LineTerminator
    = [\n\r\u2028\u2029]

LineTerminatorSequence "end of line"
    = "\n"
    / "\r\n"
    / "\r"
    / "\u2028" // line separator
    / "\u2029" // paragraph separator

Comment "comment"
    = MultiLineComment
    / SingleLineComment

MultiLineComment
    = "/*" (!"*/" SourceCharacter)* "*/"

MultiLineCommentNoLineTerminator
    = "/*" (!("*/" / LineTerminator) SourceCharacter)* "*/"

SingleLineComment
    = "//" (!LineTerminator SourceCharacter)*

/* Separator, Space */
Zs
    = [\u0020\u00A0\u1680\u180E\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F\u3000]

/* Whitespace */
_
    = (WhiteSpace / MultiLineCommentNoLineTerminator / SingleLineComment)*

__
    = (WhiteSpace / LineTerminatorSequence / Comment)*


/* Letters and digits */
letter
    = [a-z] / [A-Z]

digit
    = [0-9]

OS_BRACKET     = __ '[' __
CS_BRACKET     = __ ']' __
O_PAR          = __ '(' __
C_PAR          = __ ')' __

COLON          = __ ';' __ { return ';'; }
COMMA          = __ ',' __ { return ';'; }

AND_OP         = __ '&&' __ { return '&&'; }
OR_OP          = __ '||' __ { return '||'; }
MUL_OP         = __ '*' __  { return '*'; }
DIV_OP         = __ '/' __  { return '/'; }
EQ_OP          = __ '==' __ { return '=='; }
NEQ_OP         = __ '!=' __ { return '!='; }
LT_OP          = __ '<' __  { return '<'; }
GT_OP          = __ '>' __  { return '>'; }
LTE_OP         = __ '<=' __ { return '<='; }
GTE_OP         = __ '>=' __ { return '>='; }
ADD_OP         = __ '+' __  { return '+'; }
MIN_OP         = __ '-' __  { return '-'; }
EXP_OP         = __ '^' __  { return '^'; }

ASSIGN_OP      = __ '=' __  { return '='; }

LOGICAL_OPS    = AND_OP / OR_OP
COMPARISON_OPS = LT_OP / GT_OP / EQ_OP / GTE_OP / LTE_OP / NEQ_OP
ADDITIVE_OPS   = ADD_OP / MIN_OP 
MULTIPLICATIVE_OPS = MUL_OP / DIV_OP

StatementList
    = head:Statement tail:(COLON Statement)* {
        return ast.program([head].concat(secondNode(tail)));
    }

Statement
    = expr:Expression !ASSIGN_OP { return expr; }
    / Assignment  

Assignment
    = lhs:Identifier op:ASSIGN_OP rhs:Expression {
        return ast.assignment(lhs, rhs);
    }

Identifier "identifier"
	= head:(letter / "_" / "$") tail:(letter / digit / "_" / "$")* __ {
        return ast.identifier(head + tail.join('')); 
    }

Matrix
    = OS_BRACKET head:Vector tail:(COLON Vector)* CS_BRACKET {
        var nodes = [head].concat(secondNode(tail));
        return ast.matrix(head.size, tail.length+1, nodes);
    } 

Vector
    = head:Expression 
      tail:(__ Expression)* {
        var nodes = [head].concat(secondNode(tail));
        return { 
            type:   'Vector',
            size:   nodes.length,
            elements:nodes
        };
    } 

Expression
    = LogicalExp

LogicalExp
    = head:CompararisonExp 
      tail:(LOGICAL_OPS CompararisonExp)* { 
        var result = head;
        for (var i = 0; i < tail.length; i++) {
            result = ast.logical(result, tail[i][1], tail[i][0]);
        }
        return result; 
    }

CompararisonExp
    = head:AdditiveExp 
      tail:(COMPARISON_OPS AdditiveExp)? {
        var result = head;
        for (var i = 0; i < tail.length; i++) {
            result = ast.comparison(result, tail[i][1], tail[i][0]);
        }
        return result; 
    }

AdditiveExp
    = head:MultiplicativeExp tail:(ADDITIVE_OPS MultiplicativeExp)* {
        var result = head;
        for (var i = 0; i < tail.length; i++) {
            result = ast.additive(/*left*/result, /*right*/tail[i][1], /*operator*/tail[i][0]);
        }
        return result; 
    }

MultiplicativeExp
    = head:ExponentialExp 
      tail:(MULTIPLICATIVE_OPS ExponentialExp)* {
        var result = head;
        for (var i = 0; i < tail.length; i++) {
            result = ast.multiplicative(/*left*/result, /*right*/tail[i][1], /*operator*/tail[i][0]);
        }
        return result; 
    }

ExponentialExp
	= head:SimpleFactorExp 
	  tail:(EXP_OP exp:SimpleFactorExp)* {
        var result = head;
        for (var i = 0; i < tail.length; i++) {
            result = ast.exponential(result, tail[i][1], tail[i][0]);
        }
        return result; 
	}
	
SimpleFactorExp 
    = sign:('+'/'-')? expr:FactorExp {
        return  sign !== '-' ? expr : ast.negative(expr);
    }

FactorExp
    = Number
    / FunctionInvocation
    / Matrix
    / O_PAR exp:Expression C_PAR { return exp; }

Number
    = digits:[0-9]+ {
        return ast.constant( parseInt(digits.join(""), 10)); 
    }

FunctionInvocation
    = id:Identifier parameters:(O_PAR ParameterList C_PAR)? {
        return ast.functionInvocation(id.name, parameters !== '' ? parameters[1] : []);
    }

ParameterList
    = head:Expression 
      tail:(COMMA Expression)* {
        return [head].concat(secondNode(tail));
    }

