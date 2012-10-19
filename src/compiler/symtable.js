Matematica.compiler.symtable = {

  scope : {},

  register : function(name, node){
    var me = this;
    me.scope[name] = node;  
  },

  resolve: function(name){
    var me = this,
        cur_scope = me.scope, sym;

    while(cur_scope){
      sym = cur_scope[name];
      if(sym) return sym;
      cur_scope = cur_scope.____parent____;
    }
    return undefined;
  },

  enter_scope:  function(){
    var me = this;
    me.scope.____next____ = { 
      ____parent____: me.scope
    };
    me.scope = me.scope.____next____;
  },

  exit_scope:  function(){
    var me = this;
    me.scope = me.scope.____parent____;    
  }
};
