angular.module('app')
  .controller('ContractorController', ['$scope', '$http', '$window', 'Record', 'People', 'PubSub', 'Place', 'Parking', 'VehicleType', 'Destination',
  	function($scope, $http, $window, Record, People, PubSub, Place, Parking, VehicleType, Destination) {

  	$scope.is_saved = false;

  	$scope.employee = {};
  	$scope.employee.is_input = true;
    $scope.employee.unselectParking = true;
  	$scope.employee.authorized_by = localStorage.getItem("email");
  	$scope.employee.profile = "C";
    $scope.employee.checkboxCar = false;
    $scope.peoples = {};
    $scope.record = {};
    //for date in calendar
    $scope.employee.valuationDate = new Date();
    $scope.employee.formatDate='dd/MM/yy HH:mm:ss';
    $scope.employee.valuationDatePickerIsOpen = false;

  	$scope.employee.searchContractor = function() {
      People.find( { filter: { where: { run: $scope.employee.people_run, profile: "C" } } } )
      .$promise
      .then(function mySucces(results) {
          $scope.peoples = results;
          record = results;
          if(record!=""){
            if(record[0].run == $scope.employee.people_run){
              $scope.employee.place = record[0].place;
              $scope.employee.people_run = record[0].run;
              $scope.employee.card = record[0].card;
              $scope.employee.company_code = record[0].company_code;
              $scope.employee.is_permitted = record[0].is_permitted;
              $scope.employee.company = record[0].company;
              $scope.employee.is_input = true;
              $scope.employee.fullname = record[0].fullname;
            }
            else{
              $scope.employee.fullname = "";
              alert("El RUT ingresado no existe en los registros de Contratistas");
            }
          }else{
            $scope.employee.fullname = "";
            alert("El RUT ingresado no existe en los registros de Contratistas");
         }}, function myError(response) {
      $scope.employee.fullname = "";
      alert("El RUT ingresado no existe en los registros de Contratistas");
     });
    };

    $scope.employee.addEmployee = function() {
    	if(typeof $scope.employee.fullname == "undefined" || $scope.employee.fullname == ""){
    		alert("Debe ingresar el RUT del Contratista");
    		return;
    	}else if(typeof $scope.employee.is_input == "undefined"){
    		alert("");
    		return;
        // INPUT FILTERS
    	}else if($scope.employee.is_input && ((($scope.employee.input_patent == undefined || $scope.employee.input_patent == "") && $scope.employee.checkboxCar))) {
        alert("Debe ingresar la patente de entrada");
        return;
      }else if(!$scope.employee.is_input && ((($scope.employee.output_patent == undefined || $scope.employee.output_patent == "") && $scope.employee.checkboxCar))) {
        alert("Debe ingresar la patente de salida");
        return;
      }
      if(typeof $scope.employee.is_input && ($scope.employee.selectedOptionPlaces.name == "undefined" || $scope.employee.selectedOptionPlaces.name == "")){
        alert("Debe seleccionar el el destino");
        return;
      }
      else{


      //Building the record for save.
      $scope.record.run =  $scope.employee.people_run;
      $scope.record.fullname = $scope.employee.fullname;
      $scope.record.is_input = $scope.employee.is_input;
      //Place (is_input)
      if($scope.employee.is_input){
        $scope.record.place =  $scope.employee.place;
      }
      //car or not
      if($scope.employee.checkboxCar){
        //INPUT OR OUTPUT
        if($scope.record.is_input){
          $scope.record.input_patent = $scope.employee.input_patent;
          $scope.record.input_patent_type = $scope.employee.selectedOptionVehicleTypes.name;
          $scope.record.parking =  $scope.employee.selectedOptionParkings.name;
        }
        else{
          $scope.record.output_patent = $scope.employee.output_patent;
          $scope.record.output_patent_type = $scope.employee.selectedOptionVehicleTypes.name;
        }
      }

      $scope.record.type = "MR";
      $scope.record.profile = "C";
      $scope.record.reviewed = false;
      if($scope.record.is_input){
        $scope.record.comment = $scope.employee.comment;
      }

       //validation for datetime (input_datetime and output datetime)
        if ($scope.record.is_input){
            $scope.record.input_datetime = $scope.employee.valuationDate;
        } else {
            $scope.record.output_datetime = $scope.employee.valuationDate;
        }

      $scope.record.is_permitted = $scope.employee.is_permitted;
      $scope.record.card = $scope.employee.card;
      $scope.record.company_code = $scope.employee.company_code;
      $scope.record.is_permitted = $scope.employee.is_permitted;
      $scope.record.destination = $scope.employee.destination.name;
      $scope.record.company = $scope.employee.company;
      $scope.record.company_code = $scope.employee.company_code;
      $scope.record.bus = false;

      Record.create($scope.record, function(err,model){
        alert("Contratista Registrado con exito");
        $window.location.reload();
      });
      }
    };

    $scope.employee.valuationDatePickerOpen = function () {
      $scope.employee.valuationDatePickerIsOpen = true;
      $scope.employee.valuationDate = new Date();
    };

    function getVehicleType() {
      VehicleType.find()
      .$promise
      .then(function(results) {
        $scope.vehicleTypes = results;
        $scope.employee.selectedOptionVehicleTypes= $scope.vehicleTypes[0];
      });
    }

    function getPlaces() {
      Place.find()
      .$promise
      .then(function(results) {
        $scope.places = results;
        $scope.employee.selectedOptionPlaces = $scope.places[0];
      });
    }

    function getParkings() {
      Parking.find()
      .$promise
      .then(function(results) {
        $scope.parkings = results;
        $scope.employee.selectedOptionParkings = $scope.parkings[0];
      });
    }

    $scope.getPeople = function(run){
      People.find( { filter: { where: { run: run.people_run } } } )
      .$promise
      .then(function(results) {
        $scope.peoples = results;
      })
    }

    function getDestination() {
      Destination.find()
      .$promise
      .then(function(results) {
        $scope.destinations = results;
      });
    }

    getVehicleType();
    getPlaces();
    getDestination();
    getParkings();

      //CHECK OUTPUT PARKING
    $scope.outputParkingCheck = function(){
      if($scope.employee.output_patent != undefined &&  $scope.employee.output_patent != ""){
        $scope.employee.unselectParking = false;
      }
      else if($scope.employee.output_patent == undefined){
        $scope.employee.unselectParking = true;
      }
      else if($scope.employee.output_patent == ""){
        $scope.employee.unselectParking = true;
      }
    }

      //CHECK INPUT PARKING
    $scope.inputParkingCheck = function(){
      if($scope.employee.input_patent != undefined  && $scope.employee.input_patent != ""){
        $scope.employee.unselectParking = false;
      }
      else if($scope.employee.input_patent == undefined){
        $scope.employee.unselectParking = true;
      }
      else if($scope.employee.input_patent == ""){
        $scope.employee.unselectParking = true;
      }
    }
}]);
