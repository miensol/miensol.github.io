var Linq = function (inner){
  var that = this;

  this.toArray = function(){
    var result = [];
    for(var item of inner()){
      result.push(item);
    }
    return result;
  };

  this.reverse = function (){
    return new Linq(function *(){
        var existingArray = that.toArray();
        for(var index = existingArray.length - 1; index >= 0; index -= 1){
          console.log('DEBUG: reverse will yield',existingArray[index])
          yield existingArray[index];
        }
    });
  };

  this.concat = function (otherGenerator){
    return new Linq(function *(){
        console.log('DEBUG: concat yielding first generator values');
        yield *inner();
        console.log('DEBUG: concat yielding second generator values');
        yield *otherGenerator();
    });
  };

  this.filter = this.where = function(predicate){
    return new Linq(function *(){
      for(var item of inner()){
        console.log('DEBUG: filter predicate value %s for item %s', predicate(item), item);
        if(predicate(item)){
          yield item;
        };
      }
    })
  };

  this.select = this.map = function(projection){
    return new Linq(function *(){
      for(var item of inner()){
        console.log('DEBUG: select will yield', projection(item));
        yield projection(item);
      }
    });
  };

  this.take = function (n){
    return new Linq(function *(){
      var counter = 0;
      for(var item of inner()){
        counter += 1;
        if(counter <= n){
          console.log('DEBUG: take will yield ', item,  'counter', counter);
          yield item;
        }
        if(counter >= n){
          break;
        }
      }
    });
  };

  var selfGenerator = null;
  this.next = function(){
    if(selfGenerator === null){
      selfGenerator = inner();
    }
    return selfGenerator.next();
  };

};

Linq.fromArray = function(array){
  return new Linq(function *(){
      for(var index =0; index < array.length; index += 1){
        yield array[index];
      }
  })
};

var operator = Linq.fromArray([1,2,3,4,5,6]).reverse().where(function(number){
  return number % 2 === 0;
}).take(2).select(function(item){
  return 'Even number ' + item;
}).concat(function *(){
  yield "At the end";
});

for(var item of operator){
  console.log(item);
}
