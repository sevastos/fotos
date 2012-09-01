<?php
define('DATA_FOLDER', '_data/');

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET');

if(isset($_GET['id'])) {
    $id = strtolower(preg_replace("/[^A-Za-z0-9 ]/", '', $_GET['id']));
} else {
    $extra = 0;
    do{
        $id = substr(md5(rand() . uniqid() . $extra), 0, 4);
        $extra++;
    } while ( file_exists(DATA_FOLDER . $id) );
}

switch($_SERVER['REQUEST_METHOD']) {
    case 'POST':
        if(!isset($_POST['data'])){
            echo json_encode(array(
                'response' => 'fail',
                'message' => 'Have Data, to set, you must'
            ));
            exit();
        }
        if( @file_put_contents(DATA_FOLDER . $id, $_POST['data']) > 0 ){
            echo json_encode(array('response' => 'success', 'id' => $id));
        } else {
            echo json_encode(array('response' => 'fail'));
        }
        break;
    case 'GET':
        if(!isset($_GET['id'])){
            echo json_encode(array(
                'response' => 'fail',
                'message' => 'Have ID, to get, you must'
            ));
            exit();
        }
        $res = @file_get_contents(DATA_FOLDER . $id);
        if ( $res === FALSE ) {
            echo json_encode(array('response' => 'fail'));
        } else {
            echo json_encode(array(
                'response' => 'success',
                'data' => $res,
                'lastChanged' => filemtime(DATA_FOLDER . $id)
            ));
        }
        break;
    default:
        echo json_encode(array(
            'response' => 'fail',
            'message' => 'Invalid arguments'
        ));
}

exit();

?>