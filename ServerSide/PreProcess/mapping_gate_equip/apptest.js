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

          if (err) {
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

    // var testArr = ['ECB0000009', 'ECB0000001', 'ECB0000002', 'ECB0000005'];
    //
    // console.log('testArr : ', testArr);
    // console.log('testArr.length : ', testArr.length);
    //
    // for (var j=0; j< testArr.length; j++){
    //   equipMapping(testArr[j]);
    // }

    equipMapping('ECB0000001'); // ************해당 부분 for문으로 처리해야 함**********

    console.log('waterfall final result function end');

  });
}


// 설비 아이디 기준으로 매핑 장비와 온도카메라센서 타켓 목록 조회 * 두번째로 실행되는 함수 *
function equipMapping(equip_id) {

  console.log('equipMapping equip_id : ', equip_id);

  // 설비 아이디 기준으로 매핑 장비와 온도카메라센서 타켓 목록을 동시에 얻기 위해 parallel 함수 사용
  async.parallel([

      //설비 별 매핑 장비 목록 조회하여 온도카메라센서 데이터 값이 들어갈 공간 할당
      function(callback) {
        console.log('equipMapping parallel first function start');
        pool.getConnection(function(err, connection) {
          connection.query("SELECT * FROM mapng_equip_instm WHERE EQUIP_ID='" + equip_id + "'", function(err, rows) {

            if (err) {
              console.log('mapng_equip_instm table query error : // equip_id : ' + equip_id, err);
            }

            // 설비마스터 테이블에 등록된 설비이나 mapng_equip_instm 테이블 상에 장비간 매핑정보가 등록되지 않았을 경우 해당 parallel을 빠져나가며 결과로 에러코드 전달
            if (rows.length <= 0) {

              callback('ERROR : equipMapping function // mapng_equip_instm table query null // equip_id : ' + equip_id, null);

            } else {

              console.log('equipMapping function // equipMapping table query not null ');

              // 장비별 온도데이터가 들어가는 공간을 저장할 배열
              var mapng_equip_instmt_Array = new Array();

              for (var i in rows) {

                //장비별 온도데이터가 들어갈 공간 할당
                var mapng_equip_instmt_Object = new Object();

                mapng_equip_instmt_Object.equip_id = rows[i].EQUIP_ID;
                mapng_equip_instmt_Object.instm_code = rows[i].INSTM_CODE;

                mapng_equip_instmt_Object.body = 0; // 장비 몸체 온도데이터

                //1차 RST 온도데이터
                mapng_equip_instmt_Object.first_rphase = 0;
                mapng_equip_instmt_Object.first_sphase = 0;
                mapng_equip_instmt_Object.first_tphase = null;

                //2차 RST 온도데이터
                mapng_equip_instmt_Object.sec_rphase = 0;
                mapng_equip_instmt_Object.sec_sphase = 0;
                mapng_equip_instmt_Object.sec_tphase = 0;

                mapng_equip_instmt_Array.push(mapng_equip_instmt_Object);
              }


              console.log('equipMapping parallel first function end');

              callback(null, mapng_equip_instmt_Array);
            }

            // 컨넥션 반환
            connection.release();

          });
        });
      },

      //설비 별 온도카메라센서 타켓 목록
      function(callback) {

        console.log('equipMapping parallel second function start');

        pool.getConnection(function(err, connection) {
          // Use the connection
          connection.query("SELECT * FROM mapng_tssr_trgt WHERE EQUIP_ID='" + equip_id + "'", function(err, rows) {
            // And done with the connection.

            if (err) {
              console.log('query error : // equip_id : ' + equip_id, err);
            }

            // 설비마스터 테이블에 등록된 설비이나 mapng_equip_instm 테이블 상에 장비간 매핑정보가 등록되지 않았을 경우 해당 parallel을 빠져나가며 결과로 에러코드 전달
            if (rows.length <= 0) {

              callback('Error : equipMapping function // mapng_tssr_trgt table query null // equip_id : ' + equip_id, null);

            } else {

              console.log('equipMapping function // mapng_tssr_trgt table query not null ');

              var mapng_tssr_trgt_Array = new Array();

              for (var i in rows) {
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

        return;

      } else {

        /*
        result[0]는 parallel의 첫번째 인자로 갖는 함수의 결과 값 => 설비 별 장비의 몸체 및 1,2차 3상의 온도데이터가 저장될 공간이 할당된 배열(mapng_equip_instmt_Array)
        result[1]는 parallel의 두번째 인자로 갖는 함수의 결과 값 => 설비별 온도카메라센서 타켓 목록(mapng_tssr_trgt_Array)
        */

        insert_tp_Data(equip_id, result[0], result[1]);

        console.log('parallel final result function end');
      }

    });
}

// 설비 아이디 기준으로 온도카메라센서 데이터 값 조회하여 tssr_data 테이블에 장비별 온도데이터 insert
function insert_tp_Data(equip_id, mapng_equip_instmt_Array, mapng_tssr_trgt_Array) {

  /*
  equip_id : 설비 아이디
  mapng_equip_instmt_Array : 설비 별 장비의 몸체 및 1,2차 3상의 온도데이터가 저장될 공간이 할당된 배열
  mapng_tssr_trgt_Array : 설비별 온도카메라센서 타켓 목록
  */

  async.waterfall([

    /*
    한 설비는 여러 개의 중계기로 구성될 수 있으므로 중계기마다 설치된 온도카메라 센서의 번호는 중복될 수 있기 때문에
    각 중계기 당 설치되어 있는 온도카메라 센서를 별도로 알아두어야 한다.
    ex) ECB0000001이라는 설비에 중계기가 GCB0000011와 CCB0000012 두 개로 이루어진 경우
        해당 중계기에 설치된 온도카메라센서는 GCB0000011에 1,2,3,4 가 설치되어 있고,
        CCB0000012에는 3,4,5,6이 설치되어 있을 수 있다.
        따라서 아래와 같이 중계기 당 온도카메라센서로 매핑
        [ { gate_id: 'GCB0000011', tssr_no: 1 },
        { gate_id: 'GCB0000011', tssr_no: 2 },
        { gate_id: 'GCB0000011', tssr_no: 3 },
        { gate_id: 'GCB0000011', tssr_no: 4 },
        { gate_id: 'GCB0000012', tssr_no: 3 },
        { gate_id: 'GCB0000012', tssr_no: 4 },
        { gate_id: 'GCB0000012', tssr_no: 5 },
        { gate_id: 'GCB0000012', tssr_no: 6 }, ]
    */

    function(callback) {

      // 해당 설비에 등록된 중계기와 중계기 당 설치된 온도카메라 센서 번호 조회
      pool.getConnection(function(err, connection) {
        connection.query("SELECT gate_id, sensor_no FROM " +
          "(SELECT * FROM mapng_gate_cmpnt where gate_id IN " +
          "(SELECT DISTINCT gate_id FROM mapng_equip_gate WHERE  EQUIP_ID='" + equip_id + "'" + ")" +
          ") " +
          "SUB WHERE knd = 'tssr'",
          function(err, rows) {

            if (err) {
              console.log('insert_tp_Data function // query error : // equip_id : ' + equip_id, err);
            }

            // 설비별 중계기 매핑 테이블(mapng_equip_gate)에 정보가 누락되었거나 중계기 별 부품 테이블(mapng_gate_cmpnt)에 온도카메라 센서가 누락되었을 경우
            if (rows.length <= 0) {

              callback('Error : insert_tp_Data function // query null // equip_id : ' + equip_id, null);

            } else {

              console.log('insert_tp_Data function // query not null ');

              var gate_tssr_map_Array = new Array();

              for (var i in rows) {

                var gate_tssr_map_Object = new Object();

                gate_tssr_map_Object.gate_id = rows[i].GATE_ID;
                gate_tssr_map_Object.tssr_no = rows[i].SENSOR_NO;

                gate_tssr_map_Array.push(gate_tssr_map_Object);

              }

              callback(null, gate_tssr_map_Array);

            }

            // 컨넥션 반환
            connection.release();

          });
      });
    },

    /*
    위 함수에서 전달받은 gate_tssr_map_Array을 가지고 온도카메라센서 데이터가 적재되는 테이블(tssr_data)로부터
    해당 설비에 설치된 온도카메라센서 데이터 모두를 조회하여 저장한다.
    해당 기능을 수행하기 위해 gate_tssr_map_Array의 길이만큼(해당 길이는 설치된 온도카메라센서 갯수)
    다중 쿼리를 사용하였다.
    */
    function(gate_tssr_map_Array, callback) {

      console.log('gate_tssr_map_Array.length : ', gate_tssr_map_Array.length);

      var query = "";

      for (var i = 0; i < gate_tssr_map_Array.length; i++) {

        query += "SELECT * FROM tssr_data WHERE gate_id = '" + gate_tssr_map_Array[i].gate_id +
          "' AND tssr_no = " + gate_tssr_map_Array[i].tssr_no +
          " ORDER BY rectime desc LIMIT 1" + ';';

      }

      console.log('query', query);

      // gate_tssr_map_Array 기반으로 한 설비 내 설치된 온도카메라센서 데이터의 최신 데이터 모두 조회
      pool.getConnection(function(err, connection) {
        connection.query(query, function(err, rows) {

          if (err) {
            console.log('equip_mastr table query error : // equip_id : ' + equip_id, err);
          }

          // tssr_data 상에 데이터가 들어오지 않을 경우
          if (rows.length <= 0) {

            callback('Error : insert_tp_Data function // tssr_data multi query null // equip_id : ' + equip_id, null);

          } else {

            console.log('insert_tp_Data function // tssr_data multi query not null ');

            // 멀티 쿼리의 결과로 2차원 배열로 리턴받는데 2차월 배열의 첫번째 첨자(0)에 데이터가 1차원으로 들어 있어 첫번째 첨자만 참조
            var tssr_data_Array = new Array();

            for (var i in rows) {
              var tmp = rows[i];
              tssr_data_Array.push(tmp[0]);
            }

            callback(null, tssr_data_Array);

          }

          // 컨넥션 반환
          connection.release();

        });
      });
    },

    function(tssr_data_Array, callback) {

      /*
      mapng_equip_instmt_Array // 장비별 온도데이터가 들어가는 공간을 저장한 배열
      mapng_tssr_trgt_Array // 장비별 온도카메라센서 타켓 목록
      tssr_data_Array); // 한 설비 내 설치된 온도카메라센서 데이터의 최신 데이터 모두 조회
      */

      // console.log('mapng_equip_instmt_Array : ', mapng_equip_instmt_Array);
      // console.log('mapng_tssr_trgt_Array : ', mapng_tssr_trgt_Array);
      // console.log('tssr_data_Array : ', tssr_data_Array);


      for (var i = 0; i < mapng_equip_instmt_Array.length; i++) {

        console.log('*********************************************************');

        // console.log("mapng_equip_instmt_Array[" + i +"].instm_code : ", mapng_equip_instmt_Array[i].instm_code);
        console.log("mapng_equip_instmt_Array[" + i + "] : ", mapng_equip_instmt_Array[i]);

        for (var j = 0; j < mapng_tssr_trgt_Array.length; j++) {

          if (mapng_equip_instmt_Array[i].instm_code == mapng_tssr_trgt_Array[j].instm_code) {

            // console.log('--------------------------------------------------------');
            // console.log("mapng_tssr_trgt_Array[" + j +"].instm_code : ", mapng_tssr_trgt_Array[j].instm_code);
            // console.log("mapng_tssr_trgt_Array[" + j +"].gate_id : ", mapng_tssr_trgt_Array[j].gate_id);
            // console.log("mapng_tssr_trgt_Array[" + j +"].tssr_no : ", mapng_tssr_trgt_Array[j].tssr_no);

            for (var p = 0; p < tssr_data_Array.length; p++) {

              if (mapng_tssr_trgt_Array[j].gate_id == tssr_data_Array[p].GATE_ID &&
                mapng_tssr_trgt_Array[j].tssr_no == tssr_data_Array[p].TSSR_NO) {

                console.log('--------------------------------------------------------');
                console.log("mapng_tssr_trgt_Array[" + j +"].instm_code : ", mapng_tssr_trgt_Array[j].instm_code);
                console.log("mapng_tssr_trgt_Array[" + j +"].gate_id : ", mapng_tssr_trgt_Array[j].gate_id);
                console.log("mapng_tssr_trgt_Array[" + j +"].tssr_no : ", mapng_tssr_trgt_Array[j].tssr_no);

                // console.log("mapng_tssr_trgt_Array[" + j + "] : ", mapng_tssr_trgt_Array[j]);


                console.log('#####################################################');
                console.log("tssr_data_Array[" + p +"].gate_id : ", tssr_data_Array[p].GATE_ID);
                console.log("tssr_data_Array[" + p +"].tssr_no : ", tssr_data_Array[p].TSSR_NO);

                // console.log("tssr_data_Array[" + p + "] : ", tssr_data_Array[p]);

                // var tmp_body = null;
                // var tmp_first_rphase = null;
                // var tmp_first_sphase = null;
                // var tmp_first_tphase = null;
                // var tmp_sec_rphase = null;
                // var tmp_sec_sphase = null;
                // var tmp_sec_tphase = null;
                //
                // if (mapng_tssr_trgt_Array[j].body != null) {
                //   tmp_body = stringToArray(mapng_tssr_trgt_Array[j].body);
                // }
                //
                // if (mapng_tssr_trgt_Array[j].first_rphase != null) {
                //   tmp_first_rphase = stringToArray(mapng_tssr_trgt_Array[j].first_rphase);
                // }
                //
                // if (mapng_tssr_trgt_Array[j].first_sphase != null) {
                //   tmp_first_sphase = stringToArray(mapng_tssr_trgt_Array[j].first_sphase);
                // }
                //
                // if (mapng_tssr_trgt_Array[j].first_tphase != null) {
                //   tmp_first_tphase = stringToArray(mapng_tssr_trgt_Array[j].first_tphase);
                // }
                //
                // if (mapng_tssr_trgt_Array[j].sec_rphase != null) {
                //   tmp_sec_rphase = stringToArray(mapng_tssr_trgt_Array[j].sec_rphase);
                // }
                //
                // if (mapng_tssr_trgt_Array[j].sec_sphase != null) {
                //   tmp_sec_sphase = stringToArray(mapng_tssr_trgt_Array[j].sec_sphase);
                // }
                //
                // if (mapng_tssr_trgt_Array[j].sec_tphase != null) {
                //   tmp_sec_tphase = stringToArray(mapng_tssr_trgt_Array[j].sec_tphase);
                // }
                //
                // console.log('tmp_body : ', tmp_body);
                // console.log('tmp_first_rphase : ', tmp_first_rphase);
                // console.log('tmp_first_sphase : ', tmp_first_sphase);
                // console.log('tmp_first_tphase : ', tmp_first_tphase);
                // console.log('tmp_sec_rphase : ', tmp_sec_rphase);
                // console.log('tmp_sec_sphase : ', tmp_sec_sphase);
                // console.log('tmp_sec_tphase : ', tmp_sec_tphase);


                test1111(mapng_equip_instmt_Array[i], mapng_tssr_trgt_Array[j], tssr_data_Array[p]);

              }
            }

          }

        }
      }


      callback(null, 'result');

    }


  ], function(err, result) {

    if (err) {
      console.log('error : ', err);

      return;
    }

    console.log('result : ', result);


  });
}


function test1111(mapng_equip_instmt_Array, mapng_tssr_trgt_Array, tssr_data_Array){

  console.log("@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@");
  console.log('mapng_equip_instmt_Array : ', mapng_equip_instmt_Array);
  console.log('mapng_tssr_trgt_Array : ', mapng_tssr_trgt_Array);
  console.log('tssr_data_Array : ', tssr_data_Array);


  // var a = "01";
  // var aa = "TGTMP_"+a;
  // console.log('tssr_data_Array.TGTMP_01 : ', tssr_data_Array[aa]);



  var tmp_body = null;
  var tmp_first_rphase = null;
  var tmp_first_sphase = null;
  var tmp_first_tphase = null;
  var tmp_sec_rphase = null;
  var tmp_sec_sphase = null;
  var tmp_sec_tphase = null;

  if (mapng_tssr_trgt_Array.body != null) {
    tmp_body = stringToArray(mapng_tssr_trgt_Array.body);

    console.log('tmp_body.length : ', tmp_body.length);

    for(var i=0; i<tmp_body.length; i++){

      var tmp = "TGTMP_"+tmp_body[i];

      console.log('tmp : ', tmp);
      console.log('tssr_data_Array.TGTMP_01 : ', tssr_data_Array[tmp]);

      var tssr_value =  parseFloat(tssr_data_Array[tmp]);

      if(parseFloat(mapng_equip_instmt_Array.body) < tssr_value){
        console.log('parseFloat(mapng_equip_instmt_Array.body) : ', parseFloat(mapng_equip_instmt_Array.body));
        console.log('parseFloat(tssr_value) : ', parseFloat(tssr_value));

        mapng_equip_instmt_Array.body = tssr_value;
      }


    }


  }

  if (mapng_tssr_trgt_Array.first_rphase != null) {
    tmp_first_rphase = stringToArray(mapng_tssr_trgt_Array.first_rphase);
  }

  if (mapng_tssr_trgt_Array.first_sphase != null) {
    tmp_first_sphase = stringToArray(mapng_tssr_trgt_Array.first_sphase);
  }

  if (mapng_tssr_trgt_Array.first_tphase != null) {
    tmp_first_tphase = stringToArray(mapng_tssr_trgt_Array.first_tphase);
  }

  if (mapng_tssr_trgt_Array.sec_rphase != null) {
    tmp_sec_rphase = stringToArray(mapng_tssr_trgt_Array.sec_rphase);
  }

  if (mapng_tssr_trgt_Array.sec_sphase != null) {
    tmp_sec_sphase = stringToArray(mapng_tssr_trgt_Array.sec_sphase);
  }

  if (mapng_tssr_trgt_Array.sec_tphase != null) {
    tmp_sec_tphase = stringToArray(mapng_tssr_trgt_Array.sec_tphase);
  }

  console.log('tmp_body : ', tmp_body);
  console.log('tmp_first_rphase : ', tmp_first_rphase);
  console.log('tmp_first_sphase : ', tmp_first_sphase);
  console.log('tmp_first_tphase : ', tmp_first_tphase);
  console.log('tmp_sec_rphase : ', tmp_sec_rphase);
  console.log('tmp_sec_sphase : ', tmp_sec_sphase);
  console.log('tmp_sec_tphase : ', tmp_sec_tphase);





  // return mapng_equip_instmt_Array;


}

function stringToArray(phaseStr) {

  var phaseArr = phaseStr.split(',');

  return phaseArr;

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

request({
  method: 'GET',
  url: requestAPI,
  headers: header
}, function(error, response, body) {
  console.log('reuqest error:', error); // Print the error if one occurred
  console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
  console.log('body:', body); // Print the HTML for the Google homepage.
});



console.log('aaaddd');
