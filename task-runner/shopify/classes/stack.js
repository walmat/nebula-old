class Stack {
  /**
   * Construct a new stack
   * @param  {...any} items - (optional) items to add to stack initially
   */
  constructor(...items){
      this._items = [];

      if(items.length > 0) {
        items.forEach(item => this._items.push(item));
      }
    }

    /**
     * Push all items onto to the stack incrementally
     * @param  {...any} items
     * @returns {Array}
     */
    push(...items){
       items.forEach(item => this._items.push(item));
       return this._items;
    }

    /**
     * Pops the top-most (last) item from the stack
     * @param {Number} count
     * @returns {any}
     */
    pop(count=0){
      if(count === 0) {
        return this._items.pop();
      } else {
         return this._items.splice(-count, count);
       }
    }

    /**
     * See what the last item on the stack is
     * @returns {any} stack item
     */
    peek(){
      return this._items[this._items.length - 1];
    }

    /**
     * See the number of items on the stack
     * @returns {Number} size
     */
    size(){
      return this._items.length
    }

    /**
     * See if the stack is empty of not
     * @returns {Boolean} empty
     */
    isEmpty(){
      return this._items.length === 0;
    }

    /**
     * Unnecessary, but for readability purposes.
     * @returns {Array} stack
     */
    toArray(){
      return this._items;
    }
}
module.exports.Stack = Stack;
