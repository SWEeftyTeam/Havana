/*

* File : app.js
* Versione : 1.0.0
* Tipo : Javascript
* Data : 2018-03-15
* Autore : SWEefty Team
* E-mail : sweeftyteam@gmail.com
*
* Licenza : GPLv3
*
* Descrizione: entry point dell'applicazione, qui sono presenti le componenti
*              principali dell'app, il controller che gestisce il rendeing delle
*              funzionalitá, i service, le direttive e le chiamate ai metodi che
*              renderizzano grafo / stack
*
* Registro modifiche :
* Lisa Parma         || 2018-03-26 || Realizzazione modulo Stack Trace
* Giuseppe Merlino   || 2018-03-19 || Realizzazione servizio per chiamate API con iniezione nel controller
* Giuseppe Merlino   || 2018-03-18 || Stesura funzione "dragended","dragged"
* Alberto Gallinaro  || 2018-03-17 || Stesura funzione "ticked","dragstarted"
* Alberto Gallinaro  || 2018-03-16 || Inserimento componente per visualizzare il grafo e impostazioni
* Francesco Parolini || 2018-03-15 || Inserimento import e link ad elasticsearch
* Francesco Parolini || 2018-03-15 || Creazione file
*
*/


import moment from 'moment';
import chrome from 'ui/chrome';
import {
  uiModules
} from 'ui/modules';
import uiRoutes from 'ui/routes';

// Imports for strategies and classes
let DataCleaner = require('./components/dataCleaner');
let DataReader = require('./components/dataReader');
let StackBuilder = require('./components/stackBuilder');
let StackCleaner = require('./components/strategies/stackcleaner');
let StackBuilderDirector = require('./components/StackBuilderDirector');

import sortUp from './res/img/sort-up.png';
import sortDown from './res/img/sort-down.png';

import 'ui/autoload/styles';
import './less/main.less';
import template from './templates/index.html';

uiRoutes.enable();

uiRoutes
  .when('/', {
    template,
    resolve: {}
  });

uiModules
  .get('app/stabHavana', [])
  .controller('stackController', function($scope, $route, $interval, servomuto) {

    $scope.sortUp = sortUp;
    $scope.sortDown = sortDown;

    const stackBuilder = new StackBuilder();
    const data = new DataReader(servomuto);
    const StackDirector = new StackBuilderDirector(data, stackBuilder);

    // It might do the trick
    StackDirector.constructStack().then(res => {
      $scope.nodes = res;
      $scope.$apply();
    }).catch(e => {
      console.log(e);
      $scope.error = e.message;
      $scope.$apply();
    })

    // Variabili per la gestione del riordinametno
    $scope.sortBy = "";
    $scope.sortReverse = false;

    $scope.sortQueryBy = "";
    $scope.sortQueryReverse = false;

  })

  // Service che esegue le chiamate alle api, viene iniettato sul controller
  .service('servomuto', ['$http', '$q', function($http, $q) {

    // ritorna un array composto da tutti e soli gli indici che contengono nel nome spans
    this.tracesIndices = function() {
      return $http.get('../api/havanastack/allIndices').then(function(resp) {
        var tracesIndices = new Array();
        for (var k in resp['data']) {
          if (resp['data'][k]['index'].includes('span')) {
            tracesIndices.push(resp['data'][k]['index']);
          }
        }
        return tracesIndices;
      }, function(err) {
        throw new Error("Errore nella comunicazione con il server Elasticsearch");
      })
    };

    // ritorna i documenti di un indice
    this.getIndex = function(index) {
      return $http.get('../api/havanastack/index?index=' + index).then(function(resp) {
        return resp;
      }, function(err) {
        throw new Error("Errore nella comunicazione con il server Elasticsearch")
      });
    };

    this.getData = function(multipleIndices) {
      return this.tracesIndices().then(res => {
        let arr = [];

        res.forEach(el => {
          let pro = this.getIndex(el);
          arr.push(pro);
        })

        return $q.all(arr);
      }).catch(err => e);
    } // end of method
  }])


// Angular per stack trace
uiModules.get('app/stabHavana', [])
  .directive('tree', function() {
    return {
      restrict: 'E',
      replace: true,
      scope: {
        t: '=src'
      },
      template: '<ul><branch ng-repeat="c in t.call_tree" src="c"></branch></ul>'
    };
  })

.directive('branch', function($compile) {
  return {
    restrict: 'E',
    replace: true,
    scope: {
      b: '=src'
    },
    template: '<li>\
                  <span class="toggle">{{ b.name | limitTo:50}}\
                    <div class="spacetree">{{b.totaltime | number}} ms</div>\
                    <div class="spacetree">{{b.selftime | number}} ms</div>\
                  </span>\
                </li>',
    link: function(scope, element, attrs) {
      if (angular.isArray(scope.b.call_tree)) {
        element.append('<tree src="b"></tree>');
        $compile(element.contents())(scope);
      }
    }
  };
});
