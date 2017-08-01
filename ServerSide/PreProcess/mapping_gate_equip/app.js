/*
Create by LeeSangwook on 2017-07-26.
Updated -
Made compatible with LivePEMS ServerSide
*/


var wdt = require('./wdt'); // wdt.js require
var pool = require('./_DBPool'); //mysql db pool 모듈 호출
var async = require('async'); // 동기처리를 위한 모듈

var equipList = []; //전체 설비 목록
var equipCount = 0; //전체 설비 목록 갯수


//전체 설비별 매핑 정보 조회 * 첫번째로 실행되는 함수 *
function equipLookup() {

  // 전체 설비 목록을 조회하여 설비 아이디를 기준으로 순차적으로 프로세스를 실행시키기 위해 waterfall 사용
  async.waterfall([

    // 전체 설비 목록 조회
    function(callback) {

      console.log('waterfall first function start');

      pool.getConnection(function(err, connection) {

        // 시스템 내 전체 설비 목록을 조회하는 쿼리
        connection.query('SELECT equip_id FROM equip_mastr', function(err, rows) {

          if(err){
            console.log('equip_mastr table query error : ', err);
          }

          for (var i in rows) {
            equipList[equipCount] = rows[i].equip_id; // 쿼리 결과를 equipList 배열에 삽입
            ++equipCount; // 설비 목록 갯수
          }

          console.log('equipCount : ', equipCount);

          // 컨넥션 반환
          connection.release();

          console.log('waterfall first function end');

          callback(null, equipList, equipCount); // 다음 함수로 설비리스트와 갯수 파라미터 전달

          equipCount = 0; // 설비 목록 갯수 초기화

        });
      });
    }
  ], function(err, equipList, equipCount) {

    console.log('waterfall final result function start');

    if (err) {
      console.log('first waterfall result error : ', err);
    }

    for (var i = 0; i < equipCount; i++) {
      console.log('equipList[' + i + ']', equipList[i]);
    }

    // 조회된 설비 아아디를 기준으로 매핑 장비와 온도카메라 센서 타켓 목록을 얻기 위한 함수 호출
    // for (var i = 0; i < equipCount; i++) {
    //   equipMapping(equipList[i]);
    // }

    var testArr = ['ECB0000009', 'ECB0000001'];

    console.log('testArr : ', testArr);
    console.log('testArr.length : ', testArr.length);

    // for (var j=0; j< testArr.length; j++){
    //   equipMapping(testArr[j]);
    // }

    equipMapping('ECB0000002'); // ************해당 부분 for문으로 처리해야 함**********

    console.log('waterfall final result function end');

  });
}


// 설비 아이디 기준으로 매핑 장비와 온도카메라센서 타켓 목록 조회 * 두번째로 실행되는 함수 *
function equipMapping(equip_id) {

  console.log('equipMapping equip_id : ', equip_id);

  // 설비 아이디 기준으로 매핑 장비와 온도카메라센서 타켓 목록을 동시에 얻기 위해 parallel 함수 사용
  async.parallel([

    //설비 별 매핑 장비 목록 조회하여 온도카메라센서 데이터 값이 들어갈 공간 할당
    function(callback){
      console.log('equipMapping parallel first function start');
      pool.getConnection(function(err, connection) {
        connection.query("SELECT * FROM mapng_equip_instm WHERE EQUIP_ID='" + equip_id + "'", function(err, rows) {

          if(err){
            console.log('mapng_equip_instm table query error : ', err);
          }

          // 설비마스터 테이블에 등록된 설비이나 mapng_equip_instm 테이블 상에 장비간 매핑정보가 등록되지 않았을 경우 해당 parallel을 빠져나가며 결과로 에러코드 전달
          if(rows.length <= 0){

            callback('ERROR : equipMapping function // mapng_equip_instm table query null ', null);

          }else{

            console.log('equipMapping function // equipMapping table query not null ');

            var mapng_equip_instmt_Array = new Array();

            for(var i in rows){

              var mapng_equip_instmt_Object = new Object();

              //장비별 온도데이터가 들어갈 공간 할당
              mapng_equip_instmt_Object.equip_id = rows[i].EQUIP_ID;
              mapng_equip_instmt_Object.instm_code = rows[i].INSTM_CODE;

              mapng_equip_instmt_Object.body = null; // 장비 몸체 온도데이터

              //1차 RST 온도데이터
              mapng_equip_instmt_Object.first_rphase = null;
              mapng_equip_instmt_Object.first_sphase = null;
              mapng_equip_instmt_Object.first_tphase = null;

              //2차 RST 온도데이터
              mapng_equip_instmt_Object.sec_rphase = null;
              mapng_equip_instmt_Object.sec_sphase = null;
              mapng_equip_instmt_Object.sec_tphase = null;

              mapng_equip_instmt_Array.push(mapng_equip_instmt_Object);
            }

            console.log('mapng_equip_instmt_Array : ', mapng_equip_instmt_Array);

            console.log('equipMapping parallel first function end');

            callback(null, mapng_equip_instmt_Array);
          }

          // 컨넥션 반환
          connection.release();

        });
      });
    },

    //설비 별 온도카메라센서 타켓 목록
    function(callback){

      console.log('equipMapping parallel second function start');

      pool.getConnection(function(err, connection) {
        // Use the connection
        connection.query("SELECT * FROM mapng_tssr_trgt WHERE EQUIP_ID='" + equip_id + "'", function(err, rows) {
          // And done with the connection.

          if(err){
            console.log('query error : ', err);
          }

          // 설비마스터 테이블에 등록된 설비이나 mapng_equip_instm 테이블 상에 장비간 매핑정보가 등록되지 않았을 경우 해당 parallel을 빠져나가며 결과로 에러코드 전달
          if(rows.length <= 0){

            callback('Error : equipMapping function // mapng_tssr_trgt table query null', null);

          }else{

            console.log('equipMapping function // mapng_tssr_trgt table query not null ');

            var mapng_tssr_trgt_Array = new Array();

            for(var i in rows){
              var mapng_tssr_trgt_Object = new Object();

              mapng_tssr_trgt_Object.instm_code = rows[i].INSTM_CODE; // 장비 코드

              mapng_tssr_trgt_Object.gate_id = rows[i].GATE_ID; // 중계기 아이디
              mapng_tssr_trgt_Object.tssr_no = rows[i].TSSR_NO; // 센서 번호

              mapng_tssr_trgt_Object.body = rows[i].BODY; // 장비 몸체 매핑 정보

              //1차 RST 매핑 정보
              mapng_tssr_trgt_Object.first_rphase = rows[i].FIRST_RPHASE;
              mapng_tssr_trgt_Object.first_sphase = rows[i].FIRST_SPHASE;
              mapng_tssr_trgt_Object.first_tphase = rows[i].FIRST_TPHASE;

              //2차 RST 매핑 정보
              mapng_tssr_trgt_Object.sec_rphase = rows[i].SEC_RPHASE;
              mapng_tssr_trgt_Object.sec_sphase = rows[i].SEC_SPHASE;
              mapng_tssr_trgt_Object.sec_tphase = rows[i].SEC_TPHASE;

              mapng_tssr_trgt_Array.push(mapng_tssr_trgt_Object);

            }

            console.log('equipMapping parallel second function end');

            callback(null, mapng_tssr_trgt_Array);
          }

          // 컨넥션 반환
          connection.release();

        });
      });
    }
  ],
    function(err, result) {

      console.log('parallel final result function start');

      if (err) {
        console.log('mapng_equip_instm parallel error : ', err);

        return ;

      }else{

        /*
        result[0]는 parallel의 첫번째 인자로 갖는 함수의 결과 값 => 설비 별 장비의 몸체 및 1,2차 3상의 온도데이터가 저장될 공간이 할당된 배열(mapng_equip_instmt_Array)
        result[1]는 parallel의 두번째 인자로 갖는 함수의 결과 값 => 설비별 온도카메라센서 타켓 목록(mapng_tssr_trgt_Array)
        */

        insert_tp_Data(result[0], result[1], equip_id);

        console.log('parallel final result function end');
      }

    });
}

// 설비 아이디 기준으로 온도카메라센서 데이터 값 조회하여 tssr_data 테이블에 장비별 온도데이터 insert
function insert_tp_Data(mapng_equip_instmt_Array, mapng_tssr_trgt_Array, equip_id){

  /*
  equip_id : 설비 아이디
  mapng_equip_instmt_Array : 설비 별 장비의 몸체 및 1,2차 3상의 온도데이터가 저장될 공간이 할당된 배열
  mapng_tssr_trgt_Array : 설비별 온도카메라센서 타켓 목록
  */
  console.log('insert_tp_data equip_id : ', equip_id);
  console.log('insert_tp_data mapng_equip_instmt_Array : ', mapng_equip_instmt_Array);
  console.log('insert_tp_data mapng_tssr_trgt_Array : ', mapng_tssr_trgt_Array);

  async.waterfall([


    function(callback) {

      var gate_tssr_map_Array = new Array();

      // 해당 설비에 등록된 중계기와 중계기 당 설치된 온도카메라 센서 번호 조회
      pool.getConnection(function(err, connection) {
        connection.query("SELECT gate_id, sensor_no FROM " +
                            "(SELECT * FROM mapng_gate_cmpnt where gate_id IN " +
                                  "(SELECT DISTINCT gate_id FROM mapng_equip_gate WHERE  EQUIP_ID='" + equip_id + "'" +")" +
                             ") "+
                         "SUB WHERE knd = 'tssr'",
        function(err, rows) {

          if(err){
            console.log('insert_tp_Data function // query error : ', err);

          }

          // 설비별 중계기 매핑 테이블(mapng_equip_gate)에 정보가 누락되었거나 중계기 별 부품 테이블(mapng_gate_cmpnt)에 온도카메라 센서가 누락되었을 경우
          if(rows.length <= 0){

            callback('Error : insert_tp_Data function // query null', null);

          }else{

            console.log('insert_tp_Data function // query not null ');

            for(var i in rows){

              var gate_tssr_map_Object = new Object();

              gate_tssr_map_Object.gate_id = rows[i].GATE_ID;
              gate_tssr_map_Object.tssr_no = rows[i].SENSOR_NO;

              gate_tssr_map_Array.push(gate_tssr_map_Object);

            }

             console.log('gate_tssr_map_Array : ', gate_tssr_map_Array);

             callback(null, gate_tssr_map_Array);

          }

          // 컨넥션 반환
          connection.release();

        });
      });

    },
    function(gate_tssr_map_Array){

      console.log(gate_tssr_map_Array.length);

      var query = "";

      for(var i=0; i< gate_tssr_map_Array.length; i++){

        query += "SELECT * FROM tssr_data WHERE gate_id = '" + gate_tssr_map_Array[i].gate_id +
                  "' AND tssr_no = " + gate_tssr_map_Array[i].tssr_no +
                  " ORDER BY rectime desc LIMIT 1"+';';

      }

      console.log('query' , query);

      pool.getConnection(function(err, connection) {
        connection.query(query, function(err, rows) {

            if (err) {
              console.log('equip_mastr table query error : ', err);
            }

            // tssr_data 상에 데이터가 들어오지 않을 경우
            if(rows.length <= 0){

              callback('Error : insert_tp_Data function // tssr_data query null', null);

            }else{

              console.log('rows : ', rows);

            }

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

  // for(var i=0; i<mapng_equip_instmt_Array.length; i++){
  //
  //   for(var j=0; j<mapng_tssr_trgt_Array.length; j++){
  //
  //     if(mapng_equip_instmt_Array[i].instm_code == mapng_tssr_trgt_Array[j].instm_code){
  //       console.log('for mapng_equip_instmt_Array[i].instm_code : ', mapng_equip_instmt_Array[i].equip_id);
  //       console.log('for mapng_tssr_trgt_Array[j].mapng_tssr_trgt_Array : ', mapng_tssr_trgt_Array[j]);
  //
  //
  //     }
  //   }
  // }
}

equipLookup();
// wdt.set_wdt(require('shortid').generate(), 2, equipLookup);


var request = require('request');

var requestAPI = 'http://172.16.0.110:7579/mobius-yt/ae-edu0/cnt-co2/latest';
var header = {
  'Accept': 'application/json',
  'X-M2M-RI': '12345',
  'X-M2M-Origin': 'SOrigin',
  'nmtype': 'long'
};

request({ method : 'GET', url : requestAPI, headers : header}, function(error, response, body) {
    console.log('reuqest error:', error); // Print the error if one occurred
    console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
    console.log('body:', body); // Print the HTML for the Google homepage.
  });



console.log('aaa');
