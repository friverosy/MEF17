angular
  .module('app')
  .controller('BlacklistController', ['$scope', '$state', 'Blacklist', '$http', '$window', '$resource', 'PubSub',
    function($scope,
      $state, Blacklist, $http, $window, $resource, PubSub) {


    $scope.logout = function() {
      localStorage.clear();
      $window.location.href = '/login';
    };

    function getBlacklist() {
      Blacklist.find()
      .$promise
      .then(function(results) {
          $scope.Blacklist = results;
          $scope.num_blacklist = result.lenght;
      });
    }

    //Count
    getBlacklist();

    $scope.addBlacklist = function() {
      Blacklist
        .create($scope.newRecord)
        .$promise
        .then(function() {
          $scope.newRecord = '';
          $('.focus').focus();
          getBlacklist();
        });
    };

    $scope.deleteBlacklist = function(blacklist) {
      Blacklist
        .deleteById(blacklist)
        .$promise
        .then(function() {
          getBlacklist();
        });
    };

  }]);
