// What is an s-expression?
//   S-expressions were popularised by Lisp and
//   represent a recursive data structure.

//   In the usual parenthesized syntax of Lisp, 
//   an s-expression is classically defined as:
//     1. an atom, or
//     2. an expression of the form (x y) where x and y are s-expressions.

export enum Expression {
  SExpression,
  Atom
}

function isSexp(text: string): boolean {
  const regex = new RegExp('^[\[\{\(\"\']');
  return regex.test(text);
}

function isAtom(text: string): boolean {
  return !this.isSexp(text);
}

export function sExpressionOrAtom(text: string): Expression {
  return isSexp(text) ? Expression.SExpression : Expression.Atom;
}

export function parseSexpr(text: string): any {
  var t = this.match(/\s*("[^"]*"|\(|\)|"|[^\s()"]+)/g)
  for (var o, c=0, i=t.length-1; i>=0; i--) {
    var n, ti = t[i].trim()
    if (ti == '"') return
    else if (ti == '(') t[i]='[', c+=1
    else if (ti == ')') t[i]=']', c-=1
    else if ((n=+ti) == ti) t[i]=n
    else t[i] = '\'' + ti.replace('\'', '\\\'') + '\''
    if (i>0 && ti!=']' && t[i-1].trim()!='(' ) t.splice(i,0, ',')
    if (!c) if (!o) o=true; else return
  }
  return c ? undefined : eval(t.join(''))
}

  // public parse(s: string): any {
  //   var t = s.match(/\s*("[^"]*"|\(|\)|"|[^\s()"]+)/g)
  //   for (var o, c=0, i=t.length-1; i>=0; i--) {
  //     var n, ti = t[i].trim();
  //     if (ti == '"') return;
  //     else if (ti == '(') t[i]='[', c+=1
  //     else if (ti == ')') t[i]=']', c-=1
  //     else if ((n=+ti) == ti) t[i]=n
  //     else t[i] = '\'' + ti.replace('\'', '\\\'') + '\''
  //     if (i>0 && ti!=']' && t[i-1].trim()!='(' ) t.splice(i,0, ',')
  //     if (!c) if (!o) o=true; else return
  //   }
  //   return c ? undefined : eval(t.join(''))
  // } 
