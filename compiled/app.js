// Generated by CoffeeScript 1.10.0
(function() {
  var app, client, dbg, opts, trackers;

  trackers = [['udp://tracker.openbittorrent.com:80'], ['udp://tracker.internetwarriors.net:1337'], ['udp://tracker.leechers-paradise.org:6969'], ['udp://tracker.coppersurfer.tk:6969'], ['udp://exodus.desync.com:6969'], ['wss://tracker.webtorrent.io'], ['wss://tracker.btorrent.xyz']];

  opts = {
    announce: trackers
  };

  client = new WebTorrent;

  dbg = function(string, torrent) {
    var ref;
    if ((ref = window.localStorage) != null ? ref : window.localStorage.getItem('debug') === {
      '*': false
    }) {
      if (torrent) {
        console.debug('%c' + torrent.name + ' (' + torrent.infoHash + '): %c' + string, 'color: #33C3F0', 'color: #333');
        return;
      } else {
        console.debug('%cClient: %c' + string, 'color: #33C3F0', 'color: #333');
        return;
      }
    }
  };

  app = angular.module('bTorrent', ['ui.grid', 'ui.grid.resizeColumns', 'ui.grid.selection', 'ngFileUpload'], [
    '$compileProvider', '$locationProvider', function($compileProvider, $locationProvider) {
      $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|magnet|blob|javascript):/);
      return $locationProvider.html5Mode({
        enabled: true,
        requireBase: false
      }).hashPrefix('#');
    }
  ]);

  app.controller('bTorrentCtrl', [
    '$scope', '$http', '$log', '$location', 'uiGridConstants', function($scope, $http, $log, $location, uiGridConstants) {
      var updateAll;
      $scope.client = client;
      $scope.seedIt = true;
      $scope.client.validTorrents = [];
      $scope.columns = [
        {
          field: 'name',
          cellTooltip: true,
          minWidth: '200'
        }, {
          field: 'length',
          name: 'Size',
          cellFilter: 'pbytes',
          width: '80'
        }, {
          field: 'received',
          displayName: 'Downloaded',
          cellFilter: 'pbytes',
          width: '135'
        }, {
          field: 'downloadSpeed()',
          displayName: '↓ Speed',
          cellFilter: 'pbytes:1',
          width: '100'
        }, {
          field: 'progress',
          displayName: 'Progress',
          cellFilter: 'progress',
          width: '100'
        }, {
          field: 'timeRemaining',
          displayName: 'ETA',
          cellFilter: 'humanTime',
          width: '150'
        }, {
          field: 'uploaded',
          displayName: 'Uploaded',
          cellFilter: 'pbytes',
          width: '125'
        }, {
          field: 'uploadSpeed()',
          displayName: '↑ Speed',
          cellFilter: 'pbytes:1',
          width: '100'
        }, {
          field: 'numPeers',
          displayName: 'Peers',
          width: '80'
        }, {
          field: 'ratio',
          cellFilter: 'number:2',
          width: '80'
        }
      ];
      $scope.gridOptions = {
        columnDefs: $scope.columns,
        data: $scope.client.validTorrents,
        enableColumnResizing: true,
        enableColumnMenus: false,
        enableRowSelection: true,
        enableRowHeaderSelection: false,
        multiSelect: false
      };
      updateAll = function() {
        if ($scope.client.processing) {
          return;
        }
        $scope.$apply();
      };
      setInterval(updateAll, 500);
      $scope.gridOptions.onRegisterApi = function(gridApi) {
        $scope.gridApi = gridApi;
        return gridApi.selection.on.rowSelectionChanged($scope, function(row) {
          if (!row.isSelected && ($scope.selectedTorrent != null) && ($scope.selectedTorrent.infoHash = row.entity.infoHash)) {
            return $scope.selectedTorrent = null;
          } else {
            return $scope.selectedTorrent = row.entity;
          }
        });
      };
      $scope.seedFile = function(file) {
        if (file != null) {
          dbg('Seeding ' + file.name);
          $scope.client.processing = true;
          $scope.client.seed(file, opts, $scope.onSeed);
        }
      };
      $scope.openTorrentFile = function(file) {
        var url;
        if (file != null) {
          dbg('Adding ' + file.name);
          $scope.client.processing = true;
          url = URL.createObjectURL(file);
          $http.get(url).then(function(response) {
            return dbg('Success' + response.data);
          }, function(response) {
            return dbg('ERROR');
          });
          return $scope.client.add(url, opts, $scope.onTorrent);
        }
      };
      $scope.addMagnet = function() {
        if ($scope.torrentInput !== '') {
          dbg('Adding ' + $scope.torrentInput);
          $scope.client.processing = true;
          $scope.client.add($scope.torrentInput, opts, $scope.onTorrent);
          $scope.torrentInput = '';
        }
      };
      $scope.destroyedTorrent = function(err) {
        $scope.client.processing = false;
        if (err) {
          throw err;
        }
        dbg('Destroyed torrent');
      };
      $scope.onTorrent = function(torrent, isSeed) {
        $scope.client.validTorrents.push(torrent);
        torrent.safeTorrentFileURL = torrent.torrentFileURL;
        torrent.fileName = torrent.name + '.torrent';
        if (!isSeed) {
          $scope.client.processing = false;
        }
        if (!($scope.selectedTorrent != null) || isSeed) {
          $scope.selectedTorrent = torrent;
        }
        torrent.files.forEach(function(file) {
          file.getBlobURL(function(err, url) {
            if (err) {
              throw err;
            }
            if (isSeed) {
              dbg('Started seeding', torrent);
              $scope.client.processing = false;
            }
            file.url = url;
            if (!isSeed) {
              dbg('Finished downloading file ' + file.name, torrent);
            }
          });
          if (!isSeed) {
            dbg('Received file ' + file.name + ' metadata', torrent);
          }
        });
        torrent.on('download', function(chunkSize) {
          if (!isSeed) {
            dbg('Downloaded chunk', torrent);
          }
        });
        torrent.on('upload', function(chunkSize) {
          dbg('Uploaded chunk', torrent);
        });
        torrent.on('done', function() {
          if (!isSeed) {
            dbg('Done', torrent);
            return;
          }
          torrent.update();
        });
        torrent.on('wire', function(wire, addr) {
          dbg('Wire ' + addr, torrent);
        });
      };
      $scope.onSeed = function(torrent) {
        $scope.onTorrent(torrent, true);
      };
      if ($location.hash() !== '') {
        $scope.client.processing = true;
        setTimeout(function() {
          dbg('Adding ' + $location.hash());
          return $scope.client.add($location.hash(), $scope.onTorrent);
        }, 500);
      }
    }
  ]);

  app.filter('html', [
    '$sce', function($sce) {
      return function(input) {
        $sce.trustAsHtml(input);
      };
    }
  ]);

  app.filter('pbytes', function() {
    return function(num, speed) {
      var exponent, unit, units;
      if (isNaN(num)) {
        return '';
      }
      exponent = void 0;
      unit = void 0;
      units = ['B', 'kB', 'MB', 'GB', 'TB'];
      if (num < 1) {
        return (speed ? '' : '0 B');
      }
      exponent = Math.min(Math.floor(Math.log(num) / Math.log(1000)), 8);
      num = (num / Math.pow(1000, exponent)).toFixed(1) * 1;
      unit = units[exponent];
      return num + ' ' + unit + (speed ? '/s' : '');
    };
  });

  app.filter('humanTime', function() {
    return function(millis) {
      var remaining;
      if (millis < 1000) {
        return '';
      }
      remaining = moment.duration(millis / 1000, 'seconds').humanize();
      return remaining[0].toUpperCase() + remaining.substr(1);
    };
  });

  app.filter('progress', function() {
    return function(num) {
      return (100 * num).toFixed(1) + '%';
    };
  });

}).call(this);