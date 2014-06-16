var oracle = function *(){
    var question = yield "Hello";
    console.log('The first question: %s', question);
    while(question != "Bye!"){
      var answer = Math.random();
      console.log(question, "oracle says: ", Math.random());
      question = yield answer;
    }
    console.log("Thank you!")
};

var oracleGenerator = oracle();
console.log(oracleGenerator.next("What is your name?")); // {value: "Hello", done: false}
oracleGenerator.next("How old are you?"); // {value: 0.760754773626104, done: false}
oracleGenerator.next("Why?"); // {value: 0.36784305213950574, done: false}
oracleGenerator.next("Bye!"); // {value: undefined, done: true}


var simpler = function *(){
  var value = yield "Hello";
  console.log('Done with ', value);
}


var simplerCase = simpler();
console.log('calling next', simplerCase.next('Ignored'));
console.log('calling next', simplerCase.next('apple'));
console.log('calling next', simplerCase.next());
