/**
 * Copyright © 2015 Magento. All rights reserved.
 * See COPYING.txt for license details.
 */

'use strict';
angular.module('complete-backup', ['ngStorage'])
    .constant('BACKUPCOUNTER', 1)
    .controller('completeBackupController', ['$rootScope', '$scope', '$http', '$timeout', 'BACKUPCOUNTER', '$localStorage', '$q', function ($rootScope, $scope, $http, $timeout, BACKUPCOUNTER, $localStorage, $q) {
        $scope.backupInfoPassed = {
            options: {
                code: false,
                media: false,
                db: false
            }
        };

        if ($localStorage.backupInfo) {
            $scope.backupInfoPassed = $localStorage.backupInfo;
        }


        $scope.progressCounter = BACKUPCOUNTER;
        $scope.startProgress = function() {
            ++$scope.progressCounter;
        };
        $scope.stopProgress = function() {
            --$scope.progressCounter;
            if ($scope.progressCounter == BACKUPCOUNTER) {
                $scope.resetProgress();
            }
        };
        $scope.resetProgress = function() {
            $scope.progressCounter = 0;
        };
        $rootScope.checkingInProgress = function() {
            return $scope.progressCounter > 0;
        };

        $scope.requestFailedHandler = function(obj) {
            obj.processed = true;
            obj.isRequestError = true;
            $scope.hasErrors = true;
            $rootScope.hasErrors = true;
            $scope.stopProgress();
        }

        $scope.completed = false;
        $scope.hasErrors = false;

        $scope.maintenance = {
            visible: false,
            processed: false,
            isRequestError: false
        };
        $scope.check = {
            visible: false,
            processed: false,
            isRequestError: false
        };
        $scope.create = {
            visible: false,
            processed: false,
            isRequestError: false
        };
        $scope.items = {
            'backup-check': {
                url:'index.php/backup-checks/check',
                show: function() {
                    $scope.startProgress();
                    $scope.check.visible = true;
                },
                process: function(data) {
                    $scope.check.processed = true;
                    angular.extend($scope.check, data);
                    $scope.updateOnProcessed($scope.check.responseType);
                    $scope.stopProgress();
                },
                fail: function() {
                    $scope.requestFailedHandler($scope.check);
                }
            },
            'store-maintenance': {
                url:'index.php/complete-backup/maintenance',
                show: function() {
                    $scope.startProgress();
                    $scope.maintenance.visible = true;
                },
                process: function(data) {
                    $scope.maintenance.processed = true;
                    angular.extend($scope.maintenance, data);
                    $scope.updateOnProcessed($scope.maintenance.responseType);
                    $scope.stopProgress();
                },
                fail: function() {
                    $scope.requestFailedHandler($scope.maintenance);
                }
            },
            'backup-create': {
                url:'index.php/backup-checks/create',
                show: function() {
                    $scope.startProgress();
                    $scope.create.visible = true;
                },
                process: function(data) {
                    $scope.create.processed = true;
                    angular.extend($scope.create, data);
                    var files = '';
                    for (var i = 0; i < $scope.create.files.length; i++) {
                        if (i == 0) {
                            files = files + $scope.create.files[i];
                        } else {
                            files = files + ", " + $scope.create.files[i];
                        }
                    }
                    $scope.files = files;
                    $scope.updateOnProcessed($scope.create.responseType);
                    $scope.stopProgress();
                },
                fail: function() {
                    $scope.requestFailedHandler($scope.create);
                }
            }
        };

        $scope.isCompleted = function() {
            return $scope.maintenance.processed
                && $scope.check.processed
                && $scope.create.processed;
        };

        $scope.updateOnProcessed = function(value) {
            if (!$rootScope.hasErrors) {
                $rootScope.hasErrors = (value != 'success');
                $scope.hasErrors = $rootScope.hasErrors;
            }
        };

        $scope.hasItem = function(haystack, needle) {
            return haystack.indexOf(needle) > -1;
        };

        function endsWith(str, suffix) {
            return str.indexOf(suffix, str.length - suffix.length) !== -1;
        }

        $scope.query = function(item) {
            if (!$rootScope.hasErrors) {
                return $http.post(item.url, $scope.backupInfoPassed, {timeout: 3000000})
                    .success(function(data) { item.process(data) })
                    .error(function(data, status) {
                        item.fail();
                    });
            } else {
                $scope.stopProgress();
                $scope.completed = true;
                $scope.maintenance.processed = true;
                $scope.check.processed = true;
                $scope.create.processed = true;
                return void (0);
            }
        };

        $scope.progress = function() {
            $rootScope.hasErrors = false;
            $scope.hasErrors = false;
            var promise = $q.all(null);
            angular.forEach($scope.items, function(item) {
                item.show();
                promise = promise.then(function() {
                    return $scope.query(item);
                }, function() {
                    return void (0);
                });
            });
        };

        $scope.$on('$stateChangeSuccess', function (event, nextState) {
            if (nextState.id == 'root.create-backup.progress') {
                $scope.progress();
            }
        });
    }]);
