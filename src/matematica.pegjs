{
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
Zs = [\u0020\u00A0\u1680\u180E\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F\u3000]

/* Whitespace */
_
  = (WhiteSpace / MultiLineCommentNoLineTerminator / SingleLineComment)*

__
  = (WhiteSpace / LineTerminatorSequence / Comment)*

OS_BRACKET     = __ '[' __
CS_BRACKET     = __ ']' __
O_PAR          = __ '(' __
C_PAR          = __ ')' __

COLON          = __ ';' __ { return null; }

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


LOGICAL_OPS    = AND_OP / OR_OP
COMPARISON_OPS = LT_OP / GT_OP / EQ_OP / GTE_OP / LTE_OP / NEQ_OP
ADDITIVE_OPS   = ADD_OP / MIN_OP 
MULTIPLICATIVE_OPS = MUL_OP / DIV_OP

StatementList
   = Statement*

Statement
   = LeftHandSideExpression 
   / Expression


AssignmentExpression
  = left:LeftHandSideExpression '=' right:Expression {
      return {
        type:     'AssignmentExpression,
        left:     left,
        right:    right
      };
    }

LeftHandSideExpression
        =	ID
		(( ('.'  ID ) / (O_PAR Expression C_PAR)) 
		/ O_PAR Expression? C_PAR
		/ OS_BRACKET Expression CS_BRACKET
		)*
	
ID	= start:['a'-'z'/'A'-'Z'] rest:['a'-'z'/'A'-'Z'/'0'-'9'/'_']*{ return { type: 'ID', Name: start + rest.join('') }; }

Matrix
        = OS_BRACKET head:Vector tail:(COLON Vector)* CS_BRACKET {
            var nodes = [head].concat(secondNode(tail));
            return {
                type:   'Matrix',
                m:      result.length,
                n:      result[0].size,
                matrix: nodes
            };
	} 

Vector
	= head:Expression 
          tail:(__ Expression)* {
            var nodes = [head].concat(secondNode(tail));
            return { 
                type:   'Vector',
                size:   nodes.length,
                nodes:  nodes
            };
	} 

Expression
        = LogicalExp

LogicalExp
	= head:CompararisonExp 
          tail:(LOGICAL_OPS CompararisonExp)* { 
            var result = head;
            for (var i = 0; i < tail.length; i++) {
                result = {
                    type:       'LogicalExpression',
                    operator:   tail[i][0],
                    left:       result,
                    right:      tail[i][1]
                };
            }
            return result; 
        }

CompararisonExp
        = head:AdditiveExp 
          tail:(COMPARISON_OPS AdditiveExp)? { 
            var result = head;
            for (var i = 0; i < tail.length; i++) {
                result = {
                    type:       'CompararisonExpression',
                    operator:   tail[i][0],
                    left:       result,
                    right:      tail[i][1]
                };
            }
            return result; 
        }

AdditiveExp
        = head:MultiplicativeExp tail:(ADDITIVE_OPS MultiplicativeExp)* {
            var result = head;
            for (var i = 0; i < tail.length; i++) {
                result = {
                    type:       'AdditiveExpression',
                    operator:   tail[i][0],
                    left:       result,
                    right:      tail[i][1]
                };
            }
            return result; 
        }

MultiplicativeExp
        = head:SimpleFactorExp 
          tail:(MULTIPLICATIVE_OPS SimpleFactorExp)* {
            var result = head;
            for (var i = 0; i < tail.length; i++) {
                result = {
                    type:       'MultiplicativeExpression',
                    operator:   tail[i][0],
                    left:       result,
                    right:      tail[i][1]
                };
            }
            return result; 
        }

SimpleFactorExp 
        = sign:('+'/'-')? factor:FactorExp { 
           return sign !== '-' ? factor : { sign:sign, factor:factor };
        }

FactorExp
        = Number 
        / Matrix
        / O_PAR exp:Expression C_PAR { return exp; }

Number
	= digits:[0-9]+ {  
            return {
                type :  'ConstantExpression',
                value:  parseInt(digits.join(""), 10)
            }; 
        }	

