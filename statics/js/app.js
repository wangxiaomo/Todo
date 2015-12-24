var ngTodo = angular.module("ngTodo", ['ngStorage']);
ngTodo.controller("TodoControl", function($scope, $localStorage, $filter) {
  var getItemId = function () {
    return _.uniqueId("todo-" + _.now() + '-');
  };

  var setupTestData = function (count) {
    var items = {};
    for(var i=0;i<count;i++){
      var id = getItemId(),
          insertTime = _.now(),
          checked = _.sample([true, false]),
          updateTime = checked && _.now() + 3600 || '';
      items[id] = {
        id: id,
        insertTime: insertTime,
        checked: checked,
        updateTime: updateTime,
        content: _.sample(["开会", "沟通合同", "开发功能"])
      }
    }
    return items;
  };

  var sortTodoItems = function (items) {
    // 1. 未完成的按照时间添加顺序排序
    // 2. 已完成的按照时间完成顺序排序
    // 3. 综合考虑权重问题 TODO
    var uncheckedItems = _.sortBy(
          _.filter(items, function(n) {
            return !n.checked
          }), function(n) {
          return n.insertTime;
        }).reverse();
    var checkedItems = _.sortBy(
          _.filter(items, function(n) {
            return n.checked
          }), function(n) {
          return n.updateTime;
        }).reverse();
    return uncheckedItems.concat(checkedItems);
  };

  var displayPrepare = function (items) {
    return _.map(items, function(n){
      n.timestamp = n.insertTime;
      if(n.checked){
        n.dom_class = "selected-item";
        n.timestamp = n.updateTime;
      }
      return n;
    });
  };

  var getHashTagAndContent = function (content) {
    var regex = new RegExp("(.*)#(.*)"),
        match = regex.exec(content);
    if(match) {
      return {tag: match[2], content: match[1]};
    }else{
      return {tag: 'global', content: content};
    }
  };

  var syncTodoItems = function () {
    $localStorage.todo = $localStorage.todo || {};
    var data = $localStorage.todo,
        sortedItems = sortTodoItems(_.values(data));
    $scope.todoItems = displayPrepare(sortedItems);
  };

  syncTodoItems();

  $scope.checkItem = function (id) {
    var item = $localStorage.todo[id];
    if(item.checked) return false;
    item.dom_class = "selected-item";
    item.updateTime = _.now();
    item.timestamp = item.updateTime;
    item.checked = true;
    syncTodoItems();
  };

  $scope.unchecked = function (id) {
    var item = $localStorage.todo[id];
    item.checked = false;
    item.dom_class = "";
    syncTodoItems();
  }

  $scope.removeItem = function (id) {
    delete $localStorage.todo[id];
    $(".item-" + id).remove();
    syncTodoItems();
  };

  $scope.todoEdit = function (e) {
    if(e.keyCode == 13) {
      var content = $("input[type=text]").val(),
        id = getItemId();
      $localStorage.todo[id] = {
        id: id,
        insertTime: _.now(),
        checked: false,
        updateTime: '',
        content: content,
      };
      syncTodoItems();
      $("input[type=text]").val('');
    }
  };

  $scope.export = function () {
    var json = angular.toJson($localStorage.todo),
        encryptData = sjcl.encrypt("you will never know", json);
    $("#todoStorage").val(encryptData);
    $("#todoStorage").slimScroll({
      height: '200px'
    });
    $("#systemOpsDialog .modal-footer").hide();
    $("#systemOpsDialog").modal('show');
  };

  $scope.import = function () {
    $("#todoStorage").val('');
    $("#todoStorage").slimScroll({
      height: '200px'
    });
    $("#systemOpsDialog .modal-footer").show();
    $("#systemOpsDialog").modal('show');
  };

  $scope.sync = function () {
    var encryptData = $("#todoStorage").val();
    try{
      var decryptData = sjcl.decrypt("you will never know", encryptData),
        items = angular.fromJson(decryptData);
      if(_.isObject(items) !== true){
        throw new Error("Not an illegal Object");
      }
      $localStorage.todo = items;
      syncTodoItems();
      $("#systemOpsDialog").modal('hide');
    }catch(e){
      alert("JSON format error!");
    }
  };
});
