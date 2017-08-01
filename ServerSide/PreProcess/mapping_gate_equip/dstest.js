var pool = require('./_DBPool'); //mysql db pool 모듈 호출
var async = require('async'); // 동기처리를 위한 모듈

async.waterfall([

  // 설비 아이디 기준으로 온도카메라센서 데이터 값 조회
  function(callback) {

    var gate_tssr_map_Array = new Array();

    var equip_id = 'ECB0000001'

    pool.getConnection(function(err, connection) {
      connection.query("SELECT gate_id, sensor_no FROM " +
        "(SELECT * FROM mapng_gate_cmpnt where gate_id IN " +
        "(SELECT DISTINCT gate_id FROM mapng_equip_gate WHERE  EQUIP_ID='" + equip_id + "'" + ")" +
        ") " +
        "SUB WHERE knd = 'tssr'",
        function(err, rows) {

          if (err) {
            console.log('equip_mastr table query error : ', err);
          }

          // console.log('rows : ', rows);



          for (var i in rows) {

            var gate_tssr_map_Object = new Object();

            gate_tssr_map_Object.gate_id = rows[i].GATE_ID;
            gate_tssr_map_Object.tssr_no = rows[i].SENSOR_NO;

            gate_tssr_map_Array.push(gate_tssr_map_Object);

          }

          console.log('gate_tssr_map_Array : ', gate_tssr_map_Array);

          // 컨넥션 반환
          connection.release();

          callback(null, gate_tssr_map_Array);

        });
    });
  },
  function(gate_tssr_map_Array){

    console.log(gate_tssr_map_Array.length);

    var query = "";

    for(var i=0; i< gate_tssr_map_Array.length; i++){

      query += "SELECT * FROM tssr_data WHERE gate_id = '" + gate_tssr_map_Array[i].gate_id + "' AND tssr_no = " + gate_tssr_map_Array[i].tssr_no +" ORDER BY rectime desc LIMIT 1"+';';

    }

    console.log('query' , query);


    pool.getConnection(function(err, connection) {
      connection.query(query, function(err, rows) {

          if (err) {
            console.log('equip_mastr table query error : ', err);
          }

          console.log('rows : ', rows);

          // 컨넥션 반환
          connection.release();

        });
    });



  }


], function(err, result) {

  if (err) {
    console.log('error : ', err);
  }

});
