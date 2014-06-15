var nested = function *(){
  yield "nested 1";
  yield "nested 2";
};

var outer = function *(){
  yield *nested();
};

for(var a of outer()){
  console.log(a);
}
