HTMLWidgets.widget({

  name: 'timesweep',

  type: 'output',

  initialize: function(el, width, height) {
    

    // global variable vizObj
    vizObj = {};
    
    // note current width & height in vizObj
    vizObj.cur_height = height;
    vizObj.cur_width = width;

    return {}
    
  },

  renderValue: function(el, x, instance) {

    var curVizObj = {};
    _run_timesweep(el.id, vizObj.cur_width, vizObj.cur_height, x, curVizObj);

  },

  resize: function(el, width, height, instance) {
    return {}
    
  }

});
