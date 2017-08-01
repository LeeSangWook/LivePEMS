var mysql = require('mysql');

var poolConfig = {
  host : '172.16.0.110',
  user : 'pems_admin',
  password : 'pems_admin',
  database : 'livepems',
  connetionLimit : '10',
  multipleStatements : true
};

var dbPool  = mysql.createPool(poolConfig);

module.exports = dbPool;

//export는 속성이나 메소드를 여러 개 정의할 수 있지만 module.exports는 하나만 정의 가능
//파일 자체를 속서이나 메소드로 사용하는 방식
