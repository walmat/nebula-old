class Stack {
    constructor(...items){
      this._items = []
  
      if(items.length>0)
        items.forEach(item => this._items.push(item) )
  
    }
  
    push(...items){
      //push item to the stack
       items.forEach(item => this._items.push(item) )
       return this._items;
  
    }
  
    pop(count=0){
      //pull out the topmost item (last item) from stack
      if(count===0)
        return this._items.pop()
       else
         return this._items.splice( -count, count )
    }
  
    peek(){
      // see what's the last item in stack
      return this._items[this._items.length-1]
    }
  
    size(){
      //no. of items in stack
      return this._items.length
    }
  
    isEmpty(){
      // return whether the stack is empty or not
      return this._items.length==0
    }
  
    toArray(){
      return this._items;
    }
}

module.exports.Stack = Stack;