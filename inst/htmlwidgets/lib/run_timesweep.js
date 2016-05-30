/* function to run timesweep
* @param {String} view_id -- id for this view
* @param {Number} width -- width of the view
* @param {Number} height -- height of the view
* @param {Object} userConfig -- user configurations
*/
function _run_timesweep(view_id, width, height, userConfig) {

	// defaults
	var defaults = {
	    paddingGeneral: 15,
	    legendWidth: 110,
	    treeHeight: 100,
	    treeWidth: 100,
	    max_r: 7, // maximum radius for legend tree nodes
	    xAxisHeight: 30,
	    yAxisWidth: 20,
	    smallMargin: 5,
	    transitionSpeed: 200,
	    isPopOverVisible: false,
	    button: false,
	    gridsterBaseDimension: 120,
	    switchView: true,
	    panel_width: 30,
	    fontSize: 11,
	    circleR: 20,
	    threshold: 0.005, // cellular prevalence threshold of visual detection
	    legendGtypeHeight: 13, // height for each genotype in the legend
	    clonalTrajectoryLabelHeight: 42,
	    curCloneIDs: [], // array of clone ids currently in the mutation table
	    nClickedNodes: 0, // number of clicked nodes
	    phantomRoot: "phantomRoot",
	    treeLinkColour: "#D3D3D3",
	    topBarHeight: 30, // height of top panel
	    topBarColour: "#D9D9D9",
	    topBarHighlight: "#C6C6C6"
	};

	vizObj["ts"] = {}; // vizObj for timesweep
	var curVizObj = vizObj["ts"];
	curVizObj.view_id = view_id;
	curVizObj.data = {};
	curVizObj.view = {};

	// set configurations
	curVizObj.tsGeneralConfig = $.extend(true, {}, defaults);
	var dim = curVizObj.tsGeneralConfig;

	// get params from R
	curVizObj.userConfig = userConfig;

	// configuration based on available data
	dim.canvasSVGWidth = width;
	dim.canvasSVGHeight = height - dim.topBarHeight;
	dim.tsSVGHeight = (curVizObj.userConfig.mutations[0] == "NA") ? 
	                    dim.canvasSVGHeight - dim.xAxisHeight - dim.smallMargin - dim.paddingGeneral*2:
	                    250;
	dim.tsSVGWidth = dim.canvasSVGWidth - dim.legendWidth - dim.yAxisWidth - dim.smallMargin - dim.paddingGeneral;
	dim.xAxisWidth = dim.tsSVGWidth;
	dim.yAxisHeight = dim.tsSVGHeight;
	dim.mutationTableHeight = dim.canvasSVGHeight - dim.tsSVGHeight - dim.smallMargin - 25 - dim.xAxisHeight;
	dim.mutationTableWidth = dim.tsSVGWidth;

	// adjust canvas SVG height if mutation table is present
	dim.canvasSVGHeight -= (curVizObj.userConfig.mutations[0] == "NA") ? 
	                        0 : 
	                        dim.mutationTableHeight;

	console.log("curVizObj");
	console.log(curVizObj);

	// SET UP PAGE LAYOUT

	var topBarDIV = d3.select("#" + view_id).append("div")
	    .attr("class", "topBarDIV")
	    .style("position", "relative")
	    .style("width", width + "px")
	    .style("height", dim.topBarHeight + "px")
	    .style("float", "left");

	var canvasDIV = d3.select("#" + view_id).append("div")
	    .style("height", dim.canvasSVGHeight + "px")
	    .style("width", width + "px")
	    .attr("class", "div")
	    .attr("id", view_id)
	    .style("float", "left");

	curVizObj.view.mutationTableDIV = d3.select("#" + view_id)
	    .append("div")
	    .attr("class", "mutationTableDIV")
	    .style("position", "relative")
	    .style("width", dim.mutationTableWidth + "px")
	    .style("height", dim.mutationTableHeight + "px")
	    .style("left", (dim.yAxisWidth + dim.smallMargin) + "px")
	    .style("float", "left");

	// canvas for image png output
	var canvas = d3.select("#" + view_id).append("canvas")
	    .attr("height", dim.canvasSVGHeight + "px")
	    .attr("width", width + "px")
	    .attr("style", "display:none");

	// PLOT TOP PANEL

	// svg
	var topBarSVG = topBarDIV.append("svg:svg")
	    .attr("class", "topBar_" + view_id)
	    .attr("x", 0)
	    .attr("y", 0)
	    .attr("width", width + "px")
	    .attr("height", dim.topBarHeight + "px");

	// background bar
	topBarSVG.append("rect")
	    .attr("x",0)
	    .attr("y",0)
	    .attr("width", width + "px")
	    .attr("height", dim.topBarHeight)
	    .attr("rx", 10)
	    .attr("ry", 10)
	    .attr("fill", dim.topBarColour);

	var downloadButtonWidth = 80; // width of the top panel download button
	var resetButtonWidth = 42; // width of the top panel reset button

	var resetButton_base64 = "data:image/svg+xml;base64," + "PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4NCjwhLS0gR2VuZXJhdG9yOiBBZG9iZSBJbGx1c3RyYXRvciAxNC4wLjAsIFNWRyBFeHBvcnQgUGx1Zy1JbiAuIFNWRyBWZXJzaW9uOiA2LjAwIEJ1aWxkIDQzMzYzKSAgLS0+DQo8IURPQ1RZUEUgc3ZnIFBVQkxJQyAiLS8vVzNDLy9EVEQgU1ZHIDEuMS8vRU4iICJodHRwOi8vd3d3LnczLm9yZy9HcmFwaGljcy9TVkcvMS4xL0RURC9zdmcxMS5kdGQiPg0KPHN2ZyB2ZXJzaW9uPSIxLjEiIGlkPSJDYXBhXzEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHg9IjBweCIgeT0iMHB4Ig0KCSB3aWR0aD0iNTEycHgiIGhlaWdodD0iNTEycHgiIHZpZXdCb3g9IjAgMCA1MTIgNTEyIiBlbmFibGUtYmFja2dyb3VuZD0ibmV3IDAgMCA1MTIgNTEyIiB4bWw6c3BhY2U9InByZXNlcnZlIj4NCjxnPg0KCTxwYXRoIGZpbGw9IiNGRkZGRkYiIGQ9Ik00MzIuOTc1LDgwLjAzNGMtMjcuOTk4LTI3Ljk2My02MC45MjYtNDcuODYtOTYuMDM3LTU5Ljc2NHY3NS4xODkNCgkJYzE2LjkwNCw4LjQxNywzMi45MjgsMTkuMzY5LDQ2Ljk4LDMzLjQ1NmM3MC4xODgsNzAuMjI0LDcwLjE4OCwxODQuMzk3LDAsMjU0LjU4NGMtNzAuMTg5LDcwLjA4NC0xODQuMjkzLDcwLjA4NC0yNTQuNTg3LDANCgkJYy03MC4xMTctNzAuMjU4LTcwLjExNy0xODQuMzYxLDAtMjU0LjU4NGMwLjE3Ny0wLjIxMSwwLjc0LTAuNTYzLDAuOTg3LTAuODhoMC4wN2w3NC4yMTcsODEuNzMxTDIxNC41LDguNUw4LjkwNSwzLjM1Ng0KCQlsNzIuNDYxLDc1LjU4NmMtMC4yNDcsMC40MjItMC42MzQsMC44NDUtMC45NTEsMS4wOTJjLTk3LjMwNSw5Ny4yNy05Ny4zMDUsMjU1LjA3OSwwLDM1Mi4zNDkNCgkJYzk3LjQ0Niw5Ny4zNzUsMjU1LjE1LDk3LjM3NSwzNTIuNTYsMEM1MzAuMjA5LDMzNS4xMTMsNTMwLjMxNCwxNzcuMzA0LDQzMi45NzUsODAuMDM0eiIvPg0KPC9nPg0KPC9zdmc+DQo="
	var downloadButton_base64 = "data:image/svg+xml;base64," + "PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4NCjwhLS0gR2VuZXJhdG9yOiBBZG9iZSBJbGx1c3RyYXRvciAxNC4wLjAsIFNWRyBFeHBvcnQgUGx1Zy1JbiAuIFNWRyBWZXJzaW9uOiA2LjAwIEJ1aWxkIDQzMzYzKSAgLS0+DQo8IURPQ1RZUEUgc3ZnIFBVQkxJQyAiLS8vVzNDLy9EVEQgU1ZHIDEuMS8vRU4iICJodHRwOi8vd3d3LnczLm9yZy9HcmFwaGljcy9TVkcvMS4xL0RURC9zdmcxMS5kdGQiPg0KPHN2ZyB2ZXJzaW9uPSIxLjEiIGlkPSJMYXllcl8xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB4PSIwcHgiIHk9IjBweCINCgkgd2lkdGg9IjUxMnB4IiBoZWlnaHQ9IjUxMnB4IiB2aWV3Qm94PSIwIDAgNTEyIDUxMiIgZW5hYmxlLWJhY2tncm91bmQ9Im5ldyAwIDAgNTEyIDUxMiIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI+DQo8cG9seWdvbiBmaWxsPSIjRkZGRkZGIiBwb2ludHM9IjM1NC41LDMzMy41IDMzMy41LDMxMy41IDI3MS44MzUsMzY1LjU2NCAyNzEuODM1LDcuOTE3IDI0MC4xNjUsNy45MTcgMjQwLjE2NSwzNjUuNTY0IDE4MC41LDMxNC41IA0KCTE1Ny41LDMzNi41IDI1Niw0MjYuMTg4ICIvPg0KPHBvbHlnb24gZmlsbD0iI0ZGRkZGRiIgcG9pbnRzPSIyOC41LDQ3Mi40MTIgNDg5LjUsNDcyLjQxMiA0OTAuNSw1MDQuMDgyIDI3LjUsNTA0LjA4MiAiLz4NCjxwb2x5Z29uIGZpbGw9IiNGRkZGRkYiIHBvaW50cz0iMjYuNTgsMzY2LjQxMiA2My40NjcsMzY2LjQxMiA2My41NDcsNTAyLjUgMjYuNSw1MDIuNSAiLz4NCjxwb2x5Z29uIGZpbGw9IiNGRkZGRkYiIHBvaW50cz0iNDUyLjUzMywzNjUuNDEyIDQ4OS40MTksMzY1LjQxMiA0ODkuNSw1MDEuNSA0NTIuNDUzLDUwMS41ICIvPg0KPC9zdmc+DQo="
	var timesweepButton_base64 = "data:image/svg+xml;base64," + "PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4NCjwhLS0gR2VuZXJhdG9yOiBBZG9iZSBJbGx1c3RyYXRvciAxNC4wLjAsIFNWRyBFeHBvcnQgUGx1Zy1JbiAuIFNWRyBWZXJzaW9uOiA2LjAwIEJ1aWxkIDQzMzYzKSAgLS0+DQo8IURPQ1RZUEUgc3ZnIFBVQkxJQyAiLS8vVzNDLy9EVEQgU1ZHIDEuMS8vRU4iICJodHRwOi8vd3d3LnczLm9yZy9HcmFwaGljcy9TVkcvMS4xL0RURC9zdmcxMS5kdGQiPg0KPHN2ZyB2ZXJzaW9uPSIxLjEiIGlkPSJMYXllcl8xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB4PSIwcHgiIHk9IjBweCINCgkgd2lkdGg9Ijg3MHB4IiBoZWlnaHQ9IjI4MHB4IiB2aWV3Qm94PSIwIDAgODcwIDI4MCIgZW5hYmxlLWJhY2tncm91bmQ9Im5ldyAwIDAgODcwIDI4MCIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI+DQo8ZGVmcyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGh0bWwiPg0KCTxzdHlsZSAgdHlwZT0idGV4dC9jc3MiPg0KCQk8IVtDREFUQVtdXT4NCgk8L3N0eWxlPg0KPC9kZWZzPg0KPGRlZnMgIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hodG1sIj4NCgk8c3R5bGUgIHR5cGU9InRleHQvY3NzIj48L3N0eWxlPg0KPC9kZWZzPg0KPHBhdGggZmlsbD0iI0ZGRkZGRiIgc3Ryb2tlPSIjRkZGRkZGIiBkPSJNNjcuNSwxMzUuNDg3YzQ1LDAsNDUtMTI0Ljk4Nyw5MC0xMjQuOTg3bDAsMGM5MCwwLDkwLDAsMTgwLDBsMCwwYzE4MCwwLTg1LDAsOTUsMGwwLDANCgl2MjQ5Ljk3NWwwLDBjLTE4MCwwLDAsMC05NSwwbDAsMGMtOTAsMC05MCwwLTE4MCwwbDAsMEMxMTIuNSwyNjAuNDc1LDExMi41LDEzNS40ODcsNjcuNSwxMzUuNDg3Ii8+DQo8ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSg3NjAsMCkiPg0KPC9nPg0KPGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNzYwLDIwOCkiPg0KPC9nPg0KPC9zdmc+DQo="
	var clonalTrajButton_base64 = "data:image/svg+xml;base64," + "PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4NCjwhLS0gR2VuZXJhdG9yOiBBZG9iZSBJbGx1c3RyYXRvciAxNC4wLjAsIFNWRyBFeHBvcnQgUGx1Zy1JbiAuIFNWRyBWZXJzaW9uOiA2LjAwIEJ1aWxkIDQzMzYzKSAgLS0+DQo8IURPQ1RZUEUgc3ZnIFBVQkxJQyAiLS8vVzNDLy9EVEQgU1ZHIDEuMS8vRU4iICJodHRwOi8vd3d3LnczLm9yZy9HcmFwaGljcy9TVkcvMS4xL0RURC9zdmcxMS5kdGQiPg0KPHN2ZyB2ZXJzaW9uPSIxLjEiIGlkPSJMYXllcl8xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB4PSIwcHgiIHk9IjBweCINCgkgd2lkdGg9Ijk3MHB4IiBoZWlnaHQ9IjI4MHB4IiB2aWV3Qm94PSIwIDAgOTcwIDI4MCIgZW5hYmxlLWJhY2tncm91bmQ9Im5ldyAwIDAgOTcwIDI4MCIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI+DQo8ZGVmcyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGh0bWwiPg0KCTxzdHlsZSAgdHlwZT0idGV4dC9jc3MiPg0KCQk8IVtDREFUQVtdXT4NCgk8L3N0eWxlPg0KPC9kZWZzPg0KPGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMjUsMCkiPg0KCTxwYXRoIGZpbGw9IiNGRkZGRkYiIHN0cm9rZT0iI0ZGRkZGRiIgZD0iTS0yMSw1MC41MjZjNzguNDE3LDAsNzguNDE3LDAsMTU2LjgzMywwbDAsMEMyOTIuNjY3LDUwLjUyNiwyOTIuNjY3LDAsNDQ5LjUsMGwwLDANCgkJdjEwMS4wNTRsMCwwYy0xNTYuODMzLDAtMTU2LjgzMy01MC41MjctMzEzLjY2Ny01MC41MjdsMCwwQzU3LjQxNyw1MC41MjYsNTcuNDE3LDUwLjUyNi0yMSw1MC41MjYiLz4NCgk8cGF0aCBmaWxsPSIjRkZGRkZGIiBzdHJva2U9IiNGRkZGRkYiIGQ9Ik0tMjEsMjA0LjM1MWM3OC40MTcsMCw3OC40MTctNzMuMjM4LDE1Ni44MzMtNzMuMjM4bDAsMA0KCQljMTU2LjgzMywwLDE1Ni44MzMsNzMuMDA4LDMxMy42NjcsNzMuMDA4bDAsMHYwLjQ1NWwwLDBjLTE1Ni44MzMsMC0xNTYuODMzLDczLjAxMi0zMTMuNjY3LDczLjAxMmwwLDANCgkJQzU3LjQxNywyNzcuNTg4LDU3LjQxNywyMDQuMzUxLTIxLDIwNC4zNTEiLz4NCjwvZz4NCjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDg2MCwwKSI+DQo8L2c+DQo8ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSg4NjAsMjA4KSI+DQo8L2c+DQo8L3N2Zz4NCg=="

	var resetButtonIconWidth = dim.topBarHeight - 10; // icon size for reset button
	var downloadButtonIconWidth = dim.topBarHeight - 10; // icon size for download button
	var timesweepButtonIconWidth = 50; // icon size for timesweep button
	var clonalTrajButtonIconWidth = 60; // icon size for timesweep button

	// reset button
	topBarSVG.append("rect")
	    .attr("class", "resetButton")
	    .attr("x", 0)
	    .attr("y", 0)
	    .attr("width", resetButtonWidth)
	    .attr("height", dim.topBarHeight)
	    .attr("rx", 10)
	    .attr("ry", 10)
	    .attr("fill", dim.topBarColour)
	    .on("mouseover", function() {
	        d3.select(this).attr("fill", dim.topBarHighlight);
	    })
	    .on("mouseout", function() {
	        d3.select(this).attr("fill", dim.topBarColour);
	    })
	    .on("click", function() {
	        // background click
	        _ts_backgroundClick(curVizObj);
	    });
	topBarSVG.append("image")
	    .attr("xlink:href", resetButton_base64)
	    .attr("x", (resetButtonWidth/2) - (resetButtonIconWidth/2))
	    .attr("y", 5)
	    .attr("width", resetButtonIconWidth)
	    .attr("height", resetButtonIconWidth)
	    .on("mouseover", function() {
	        d3.select("#" + view_id).select(".resetButton").attr("fill", dim.topBarHighlight);
	    })
	    .on("mouseout", function() {
	        d3.select("#" + view_id).select(".resetButton").attr("fill", dim.topBarColour);
	    })
	    .on("click", function() {
	        // background click
	        _ts_backgroundClick(curVizObj);
	    });

	// SVG button
	topBarSVG.append("rect")
	    .attr("class", "svgButton")
	    .attr("x", width - downloadButtonWidth)
	    .attr("y", 0)
	    .attr("width", downloadButtonWidth)
	    .attr("height", dim.topBarHeight)
	    .attr("rx", 10)
	    .attr("ry", 10)
	    .attr("fill", dim.topBarColour)
	    .on("mouseover", function() {
	        d3.select(this).attr("fill", dim.topBarHighlight);
	    })
	    .on("mouseout", function() {
	        d3.select(this).attr("fill", dim.topBarColour);
	    })
	    .on("click", function() {
	        // download the svg
	        downloadSVG("timesweep_" + view_id);
	    });
	topBarSVG.append("text")
	    .attr("class", "svgButtonText")
	    .attr("x", width - 10)
	    .attr("y", dim.topBarHeight/2)
	    .attr("text-anchor", "end")
	    .attr("dy", "+0.35em")
	    .attr("font-family", "Arial")
	    .attr("fill", "white")
	    .attr("pointer-events","none")
	    .text("SVG");
	topBarSVG.append("image")
	    .attr("xlink:href", downloadButton_base64)
	    .attr("x", width - downloadButtonWidth + 10)
	    .attr("y", 5)
	    .attr("width", downloadButtonIconWidth)
	    .attr("height", downloadButtonIconWidth)
	    .on("mouseover", function() {
	        d3.select("#" + view_id).select(".svgButton").attr("fill", dim.topBarHighlight);
	    })
	    .on("mouseout", function() {
	        d3.select("#" + view_id).select(".svgButton").attr("fill", dim.topBarColour);
	    })
	    .on("click", function() {
	        // download the svg
	        downloadSVG("timesweep_" + view_id);
	    });

	// PNG button
	topBarSVG.append("rect")
	    .attr("class", "pngButton")
	    .attr("x", width - downloadButtonWidth*2)
	    .attr("y", 0)
	    .attr("width", downloadButtonWidth)
	    .attr("height", dim.topBarHeight)
	    .attr("rx", 10)
	    .attr("ry", 10)
	    .attr("fill",dim.topBarColour)
	    .on("mouseover", function() {
	        d3.select(this).attr("fill", dim.topBarHighlight);
	    })
	    .on("mouseout", function() {
	        d3.select(this).attr("fill", dim.topBarColour);
	    })
	    .on("click", function(){
	        // download the png
	        _ts_downloadPNG("timesweep_" + view_id, "timesweep_" + view_id + ".png");
	    });
	topBarSVG.append("text")
	    .attr("class", "pngButtonText")
	    .attr("x", width - downloadButtonWidth - 10)
	    .attr("y", dim.topBarHeight/2)
	    .attr("text-anchor", "end")
	    .attr("dy", "+0.35em")
	    .attr("font-family", "Arial")
	    .attr("fill", "white")
	    .attr("pointer-events","none")
	    .text("PNG");
	topBarSVG.append("image")
	    .attr("xlink:href", downloadButton_base64)
	    .attr("x", width - 2*downloadButtonWidth + 10)
	    .attr("y", 5)
	    .attr("width", downloadButtonIconWidth)
	    .attr("height", downloadButtonIconWidth)
	    .on("mouseover", function() {
	        d3.select("#" + view_id).select(".pngButton").attr("fill", dim.topBarHighlight);
	    })
	    .on("mouseout", function() {
	        d3.select("#" + view_id).select(".pngButton").attr("fill", dim.topBarColour);
	    })
	    .on("click", function() {
	        // download the png
	        _ts_downloadPNG("timesweep_" + view_id, "timesweep_" + view_id + ".png");
	    });

	// TimeSweep button
	topBarSVG.append("rect")
	    .attr("class", "tsButton")
	    .attr("x", width - downloadButtonWidth*2 - resetButtonWidth)
	    .attr("y", 0)
	    .attr("width", resetButtonWidth)
	    .attr("height", dim.topBarHeight)
	    .attr("rx", 10)
	    .attr("ry", 10)
	    .attr("fill",dim.topBarColour)
	    .on("mouseover", function() {
	        d3.select(this).attr("fill", dim.topBarHighlight);
	    })
	    .on("mouseout", function() {
	        d3.select(this).attr("fill", dim.topBarColour);
	    })
	    .on("click", function(){
	        // change view
	        _ts_sweepClick(curVizObj);
	        
	    });
	topBarSVG.append("image")
	    .attr("class", "timesweepIcon")
	    .attr("xlink:href", timesweepButton_base64)
	    .attr("x", width - 2*downloadButtonWidth - resetButtonWidth + 5)
	    .attr("y", -10)
	    .attr("width", timesweepButtonIconWidth)
	    .attr("height", timesweepButtonIconWidth)
	    .on("mouseover", function() {
	        d3.select("#" + view_id).select(".tsButton").attr("fill", dim.topBarHighlight);
	    })
	    .on("mouseout", function() {
	        d3.select("#" + view_id).select(".tsButton").attr("fill", dim.topBarColour);
	    })
	    .attr("opacity", 0) // start with opacity zero
	    .on("click", function() {
	        // change view
	        _ts_sweepClick(curVizObj);

	        // turn off opacity & pointer events
	        d3.select(this)
	            .attr("opacity", 0)
	            .attr("pointer-events", "none");

	        // turn on clonal trajectory icon opacity & pointer events
	        d3.select("#" + view_id).select(".clonalTrajIcon")
	            .attr("opacity", 1)
	            .attr("pointer-events", "auto");
	    });
	topBarSVG.append("image")
	    .attr("class", "clonalTrajIcon")
	    .attr("xlink:href", clonalTrajButton_base64)
	    .attr("x", width - 2*downloadButtonWidth - resetButtonWidth + 5)
	    .attr("y", -15)
	    .attr("width", clonalTrajButtonIconWidth)
	    .attr("height", clonalTrajButtonIconWidth)
	    .on("mouseover", function() {
	        d3.select("#" + view_id).select(".tsButton").attr("fill", dim.topBarHighlight);
	    })
	    .on("mouseout", function() {
	        d3.select("#" + view_id).select(".tsButton").attr("fill", dim.topBarColour);
	    })
	    .attr("opacity", 1) // start with opacity 1
	    .on("click", function() {
	        // change view
	        _ts_sweepClick(curVizObj);

	        // turn off opacity & pointer events
	        d3.select(this)
	            .attr("opacity", 0)
	            .attr("pointer-events", "none");

	        // turn on timesweep icon opacity & pointer events
	        d3.select("#" + view_id).select(".timesweepIcon")
	            .attr("opacity", 1)
	            .attr("pointer-events", "auto");

	    });

	// OTHER SVGS

	var canvasSVG = canvasDIV
	    .append("svg:svg")  
	    .attr("class", "timesweep_" + view_id)     
	    .attr("x", 0)
	    .attr("y", 0) 
	    .attr("width", dim.canvasSVGWidth) 
	    .attr("height", dim.canvasSVGHeight)
	    .style("float", "left");

	var tsSVG = canvasSVG
	    .append("g")  
	    .attr("class", "tsSVG")     
	    .attr("transform", "translate(" + (dim.yAxisWidth + dim.smallMargin) + "," + dim.paddingGeneral + ")");

	var yAxisSVG = canvasSVG
	    .append("g") 
	    .attr("class", "yAxisSVG")      
	    .attr("transform", "translate(" + 0 + "," + dim.paddingGeneral + ")");

	var xAxisSVG = canvasSVG
	    .append("g") 
	    .attr("class", "xAxisSVG")      
	    .attr("transform", "translate(" + 0 + "," + (dim.tsSVGHeight + dim.smallMargin + dim.paddingGeneral) + ")");

	var tsLegendSVG = canvasSVG
	    .append("g") 
	    .attr("class", "tsLegendSVG")
	    .attr("transform", "translate(" + (dim.yAxisWidth + dim.smallMargin + dim.tsSVGWidth + dim.paddingGeneral) + 
	        "," + dim.paddingGeneral + ")");

	var tsTree = canvasSVG
	    .append("g") 
	    .attr("class", "tsTreeSVG")// move the tree SVG in the x-direction past timesweep
	    .attr("transform", "translate(" + (dim.yAxisWidth + dim.smallMargin + dim.tsSVGWidth + dim.paddingGeneral) + 
	        "," + dim.paddingGeneral + ")");

	curVizObj.view.canvasSVG = canvasSVG;
	curVizObj.view.xAxisSVG = xAxisSVG;
	curVizObj.view.yAxisSVG = yAxisSVG;
	curVizObj.view.tsSVG = tsSVG;
	curVizObj.view.tsLegendSVG = tsLegendSVG;
	curVizObj.view.tsTree = tsTree;


	// GET CONTENT

	// extract all info from tree about nodes, edges, ancestors, descendants
	_ts_getTreeInfo(curVizObj);

	// get mutation data in better format
	if (curVizObj.userConfig.mutations[0] != "NA") {
	    _ts_reformatMutations(curVizObj);

	    // get column names (depending on the available data, which columns will be shown)
	    dim.mutationColumns = [
	                    { "data": "chrom", "title": "Chromosome", "defaultContent": "" },
	                    { "data": "coord", "title": "Coordinate", "defaultContent": "" },
	                    { "data": "empty", "title": "Clone", "bSortable": false, "defaultContent": "" }
	                ];
	    if (curVizObj.userConfig.mutations[0].hasOwnProperty("gene_name")) {
	        dim.mutationColumns.push({ "data": "gene_name", "title": "Gene Name", "defaultContent": "" });
	    }
	    if (curVizObj.userConfig.mutations[0].hasOwnProperty("effect")) {
	        dim.mutationColumns.push({ "data": "effect", "title": "Effect", "defaultContent": "" });
	    }
	    if (curVizObj.userConfig.mutations[0].hasOwnProperty("impact")) {
	        dim.mutationColumns.push({ "data": "impact", "title": "Impact", "defaultContent": "" });
	    } 
	    if (curVizObj.userConfig.mutations[0].hasOwnProperty("nuc_change")) {
	        dim.mutationColumns.push({ "data": "nuc_change", "title": "Nucleotide Change", "defaultContent": "" });
	    } 
	    if (curVizObj.userConfig.mutations[0].hasOwnProperty("aa_change")) {
	        dim.mutationColumns.push({ "data": "aa_change", "title": "Amino Acid Change", "defaultContent": "" });
	    } 
	}



	// get timepoints, prepend a "T0" timepoint to represent the timepoint before any data originated
	var timepoints = _.uniq(_.pluck(curVizObj.userConfig.clonal_prev, "timepoint"));
	timepoints.unshift("T0");
	curVizObj.data.timepoints = timepoints;

	// get cellular prevalence info
	_ts_getCPData(curVizObj);

	// get emergence values & timepoints for each genotype
	curVizObj.data.emergence_values = _ts_getEmergenceValues(curVizObj);
	curVizObj.data.emergence_tps = _ts_getEmergenceTimepoints(curVizObj);

	// convert time-centric cellular prevalence data into genotype-centric cellular prevalence data
	_ts_getGenotypeCPData(curVizObj);

	// get the layout of the traditional timesweep
	_ts_getLayout(curVizObj);

	// get paths for plotting
	_ts_getPaths(curVizObj);

	// get cellular prevalence labels
	curVizObj.data.ts_trad_labels = _ts_getTraditionalCPLabels(curVizObj);
	curVizObj.data.ts_sep_labels = _ts_getSeparateCPLabels(curVizObj);

	// SET CONTENT

	// tips (for VAF and node genotypes)
	curVizObj.vafTips = [];
	var nodeTip = d3.tip()
	    .attr('class', 'd3-tip')
	    .offset([-10,0])
	    .html(function(d) {
	        return "<span>" + d + "</span>";
	    });  
	d3.select("#" + view_id).select(".timesweep_" + view_id).call(nodeTip);

	// get colour scheme
	_ts_getPhyloColours(curVizObj);
	var colour_assignment = curVizObj.view.colour_assignment,
	    alpha_colour_assignment = curVizObj.view.alpha_colour_assignment;

	// plot light grey timesweep background
	curVizObj.view.tsSVG
	    .append("rect")
	    .attr("x", 0)
	    .attr("y", 0)
	    .attr("height", dim.tsSVGHeight)
	    .attr("width", dim.tsSVGWidth)
	    .attr("fill", "#F7F7F7");

	// plot timesweep data
	curVizObj.view.tsSVG
	    .selectAll('.tsPlot')
	    .data(curVizObj.data.bezier_paths, function(d) {
	        return d.gtype;
	    })
	    .enter().append('path')
	    .attr('class', function(d) { return 'tsPlot gtype_' + d.gtype; })
	    .attr('d', function(d) { return d.path; })
	    .attr('fill', function(d) { 
	        return alpha_colour_assignment[d.gtype];
	    }) 
	    .attr('stroke', function(d) { 
	        return colour_assignment[d.gtype]; 
	    })
	    .on('mouseover', function(d) {
	        if (!dim.selectOn && !dim.mutSelectOn) {
	            _ts_shadeTimeSweep(curVizObj);
	            _ts_shadeLegend(curVizObj);
	            _ts_gtypeHighlight(d.gtype, curVizObj);
	            _ts_showLabels(d.gtype, curVizObj);
	        }
	    })
	    .on('mouseout', function(d) {
	        if (!dim.selectOn && !dim.mutSelectOn) {
	            _ts_resetView(curVizObj);
	        }
	    });

	// PLOT PERTURBATIONS INFO

	// plot labels
	curVizObj.view.xAxisSVG
	    .selectAll('.pertLabel')
	    .data(curVizObj.userConfig.perturbations)
	    .enter().append('text')
	    .attr('class', 'pertLabel')
	    .attr('x', function(d) { 
	        var prevTP_idx = curVizObj.data.timepoints.indexOf(d.prev_tp);
	        return ((prevTP_idx + 0.5) / (curVizObj.data.timepoints.length-1)) * (dim.tsSVGWidth) + 
	            dim.smallMargin + dim.yAxisWidth; 
	    })
	    .attr('y', 0)
	    .attr('dy', '.71em')
	    .attr('text-anchor', 'middle')
	    .attr('font-family', 'Arial')
	    .attr('font-size', '11px')
	    .text(function(d) { return d.pert_name; })
	    .on('mouseover', function(d) {
	        if (!dim.selectOn) {
	            // plot guide
	            curVizObj.view.tsSVG
	                .append('line')
	                .attr('class', function() { return 'pertGuide pert_' + d.pert_name; })
	                .attr('x1', function() { 
	                    var prevTP_idx = curVizObj.data.timepoints.indexOf(d.prev_tp);
	                    return ((prevTP_idx + 0.5) / (curVizObj.data.timepoints.length-1)) * (dim.tsSVGWidth); 
	                })
	                .attr('x2', function() { 
	                    var prevTP_idx = curVizObj.data.timepoints.indexOf(d.prev_tp);
	                    return ((prevTP_idx + 0.5) / (curVizObj.data.timepoints.length-1)) * (dim.tsSVGWidth); 
	                })
	                .attr('y1', 0)
	                .attr('y2', dim.tsSVGHeight)
	                .attr('stroke', 'grey')
	                .attr('stroke-width', '1.5px')
	                .style('pointer-events', 'none');
	        }
	    })
	    .on('mouseout', function(d) {
	        if (!dim.selectOn) {
	            d3.select("#" + curVizObj.view_id)
	                .selectAll(".pertGuide.pert_" + d.pert_name).remove();
	        }
	    });

	// PLOT AXES

	// plot x-axis labels
	curVizObj.view.xAxisSVG
	    .selectAll('.xAxisLabels')
	    .data(curVizObj.data.timepoints)
	    .enter().append('text')
	    .attr('class', function(d) { return 'xAxisLabels tp_' + d; })
	    .attr('x', function(d, i) { 
	        return (i / (curVizObj.data.timepoints.length-1)) * (dim.tsSVGWidth) + dim.smallMargin + dim.yAxisWidth; 
	    })
	    .attr('y', 0)
	    .attr('dy', '.71em')
	    .attr('text-anchor', 'middle')
	    .attr('font-family', 'Arial')
	    .attr('font-size', '11px')
	    .text(function(d) { 
	        // get original label (spaces were replaced with underscores)
	        var tp = (d == "T0") ? "T0" :
	            _.findWhere(curVizObj.userConfig.timepoint_map, {"space_replaced_timepoint": d})["original_timepoint"];
	        return tp;
	    })
	    .on('mouseover', function(d, i) {
	        if (!dim.selectOn) {

	            // plot time point guides
	            curVizObj.view.tsSVG
	                .append('line')
	                .attr('class', function() { return 'tpGuide tp_' + d; })
	                .attr('x1', function() { return (i / (curVizObj.data.timepoints.length - 1)) * dim.tsSVGWidth; })
	                .attr('x2', function() { return (i / (curVizObj.data.timepoints.length - 1)) * dim.tsSVGWidth; })
	                .attr('y1', 0)
	                .attr('y2', dim.tsSVGHeight)
	                .attr('stroke', 'grey')
	                .attr('stroke-width', '1.5px')
	                .style('pointer-events', 'none');
	        }
	    })
	    .on('mouseout', function(d) {
	        if (!dim.selectOn) {
	            d3.select("#" + curVizObj.view_id).selectAll(".tpGuide.tp_" + d).remove();
	        }
	    });

	// plot y-axis title
	curVizObj.view.yAxisSVG
	    .append('text')
	    .attr('class', 'axisTitle yAxis')
	    .attr('x', 0)
	    .attr('y', 0)
	    .attr('dy', '.35em')
	    .attr('text-anchor', 'middle')
	    .attr('font-family', 'Arial')
	    .attr('font-size', '15px')
	    .attr('font-weight', 'bold')
	    .attr('transform', "translate(" + (dim.yAxisWidth/2) + ", " + (dim.tsSVGHeight/2) + ") rotate(-90)")
	    .text(function() { 
	        return curVizObj.userConfig.yaxis_title;
	    });

	// plot x-axis title
	curVizObj.view.xAxisSVG
	    .append('text')
	    .attr('class', 'axisTitle xAxis')
	    .attr('x', dim.yAxisWidth + dim.smallMargin + dim.xAxisWidth/2)
	    .attr('y', 25)
	    .attr('text-anchor', 'middle')
	    .attr('font-family', 'Arial')
	    .attr('font-size', '15px')
	    .attr('font-weight', 'bold')
	    .text(function() { 
	        return curVizObj.userConfig.xaxis_title;
	    });


	// PLOT TREE GLYPH

	// plot tree title
	curVizObj.view.tsTree
	    .append('text')
	    .attr('class', 'treeTitle')
	    .attr('x', 0)
	    .attr('y', 0)
	    .attr('dy', '.71em')
	    .attr('text-anchor', 'left')
	    .attr('font-family', 'Arial')
	    .attr('font-size', '15px')
	    .attr('font-weight', 'bold')
	    .text('Phylogeny'); 

	// d3 tree layout
	var treeR = 4,
	    treePadding = 10,
	    treeTitleHeight = d3.select("#" + curVizObj.view_id)
	                        .select('.treeTitle').node().getBBox().height,
	    treeLayout = d3.layout.tree()           
	        .size([dim.treeHeight - treePadding - treeTitleHeight, dim.treeWidth - treePadding]); 

	// get node radius for legend phylogeny (7 == # pixels between nodes)
	var tree_height = curVizObj.data.tree_height;
	dim.legendNode_r = (((dim.treeWidth-treePadding) - 7*tree_height)/tree_height)/2;
	dim.legendNode_r = (dim.legendNode_r > dim.max_r) ? dim.max_r : dim.legendNode_r;

	// get nodes and links
	var root = $.extend({}, curVizObj.data.treeStructure), // copy tree into new variable
	    nodes = treeLayout.nodes(root), 
	    links = treeLayout.links(nodes);   

	// swap x and y direction
	nodes.forEach(function(node) {
	    node.tmp = node.y;
	    node.y = node.x + (treePadding/2) + treeTitleHeight;
	    node.x = node.tmp + (treePadding/2);
	    delete node.tmp;
	});

	// create links
	curVizObj.link_ids = [];
	var link = curVizObj.view.tsTree.append("g")
	    .classed("treeLinks", true)
	    .selectAll(".legendTreeLink")                  
	    .data(links)                   
	    .enter().append("path")                   
	    .attr("class", function(d) { 
	        d.link_id = "treeLink_source_" + d.source.id + "_target_" + d.target.id;
	        curVizObj.link_ids.push(d.link_id);
	        return "legendTreeLink " + d.link_id;
	    })
	    .attr('stroke', dim.treeLinkColour)
	    .attr('stroke-width', '3px')
	    .attr('fill', 'none')                
	    .attr("d", _ts_elbow)
	    .on("mouseover", function(d) {
	        // we're not selecting nodes or mutations
	        if (!dim.selectOn && !dim.mutSelectOn) {

	            // shade view & legend 
	            _ts_shadeTimeSweep(curVizObj);
	            _ts_shadeLegend(curVizObj);

	            // highlight all elements downstream of link
	            _ts_propagatedEffects(curVizObj, d.link_id, curVizObj.link_ids, "downstream");
	        }
	    })
	    .on("mouseout", function() {
	        // we're not selecting nodes or mutations
	        if (!dim.selectOn && !dim.mutSelectOn) {
	            // background click
	            _ts_backgroundClick(curVizObj);
	        }
	    }); 

	// create nodes
	var node = curVizObj.view.tsTree.selectAll(".legendTreeNode")                  
	    .data(nodes)                   
	    .enter()
	    .append("circle")     
	    .attr("cx", function(d) { return d.x})
	    .attr("cy", function(d) { return d.y})              
	    .attr("class", function(d) { return "legendTreeNode gtype_" + d.id; })
	    .attr("fill", function(d) {
	        return (d.id == dim.phantomRoot) ? "none" : alpha_colour_assignment[d.id];
	    })
	    .attr('stroke', function(d) {
	        return (d.id == dim.phantomRoot) ? "none" : colour_assignment[d.id];
	    })
	    .attr("id", function(d) { return d.sc_id; })
	    .attr("r", dim.legendNode_r + "px")
	    .on('mouseover', function(d) {
	        // show node genotype tooltip
	        var clone_name = // get original sample name (spaces may have been replaced with underscores)
	            _.findWhere(curVizObj.userConfig.clone_id_map, {"space_replaced_clone_id": d.id})["original_clone_id"];
	        nodeTip.show("ID: " + clone_name);

	        // if we're selecting nodes
	        if (dim.nClickedNodes > 0 && d.id != dim.phantomRoot) {
	            console.log("selecting nodes");
	            // highlight node in the legend
	            d3.select(this)
	                .attr('fill', function(d) { 
	                    return alpha_colour_assignment[d.id];
	                })
	                .attr('stroke', function(d) { 
	                    return colour_assignment[d.id];
	                });
	        }
	        // we're not selecting nodes or mutations - highlight genotype
	        if (!dim.selectOn && !dim.mutSelectOn) {
	            console.log("not selecting nodes or mutations");
	            _ts_shadeTimeSweep(curVizObj);
	            _ts_shadeLegend(curVizObj);
	            _ts_gtypeHighlight(d.id, curVizObj);
	            _ts_showLabels(d.id, curVizObj);
	        }
	    })
	    .on('mouseout', function(d) {
	        // hide node genotype
	        nodeTip.hide();

	        // if we're selecting nodes, but we haven't clicked this one yet
	        if ((dim.nClickedNodes > 0) && (_.uniq(dim.curCloneIDs).indexOf(d.id) == -1)) {
	            // unhighlight this node in the legend
	            d3.select(this)
	                .attr('fill', function(d) { 
	                    col = alpha_colour_assignment[d.id];
	                    brightness = Math.round(_ts_get_brightness(col));
	                    return (d.id == dim.phantomRoot) ? 
	                        "none" : _ts_rgb2hex("rgb(" + brightness + "," + brightness + "," + brightness + ")");
	                })
	                .attr('stroke', function(d) { 
	                    brightness = Math.round(_ts_get_brightness(colour_assignment[d.id]));
	                    return (d.id == dim.phantomRoot) ? 
	                        "none" : _ts_rgb2hex("rgb(" + brightness + "," + brightness + "," + brightness + ")");
	                });
	        }
	        // we're not selecting nodes or mutations - mouseout as normal
	        if (!dim.selectOn && !dim.mutSelectOn) {
	            return _ts_resetView(curVizObj);
	        }
	    })
	    .on("click", function(d) {
	        // if there are mutations and we're not selecting any of them
	        if (curVizObj.userConfig.mutations[0] != "NA" && !dim.mutSelectOn) {

	            dim.selectOn = true;
	            dim.nClickedNodes++; // increment the number of clicked nodes

	            // reset view (get rid of any labels, etc.)
	            _ts_removeLabels(curVizObj);

	            // get data for this clone
	            var filtered_muts = 
	                _.filter(curVizObj.data.mutations, function(mut) { return mut.clone_id == d.id; });

	            // if there's no data for this clone, add a row of "None"
	            if (filtered_muts.length == 0) { 
	                filtered_muts = [{}];
	                dim.mutationColumns.forEach(function(col) {
	                    filtered_muts[0][col.data] = (col.data == "empty") ? "" : "None";
	                })
	            }
	            filtered_muts[0]["clone_id"] = d.id;

	            // if it's the first clicked node
	            if (dim.nClickedNodes == 1) {
	                // delete existing data table
	                d3.select("#" + curVizObj.view_id + "_mutationTable" + "_wrapper").remove();   

	                // plot filtered data table
	                _ts_makeMutationTable(curVizObj, curVizObj.view.mutationTableDIV, filtered_muts,
	                    dim.mutationTableHeight); 

	                // shade view & legend 
	                _ts_shadeTimeSweep(curVizObj);
	                _ts_shadeLegend(curVizObj);
	            }
	            // otherwise
	            else {
	                // add to existing data table
	                var table = $("#" + curVizObj.view_id + "_mutationTable").DataTable();
	                table.rows.add(filtered_muts).draw(false);

	                // add this clone id to the list of clone ids in the mutation table
	                dim.curCloneIDs = dim.curCloneIDs.concat(_.pluck(filtered_muts, "clone_id"));

	                // plot clone svg circles in mutation table
	                _ts_addCloneSVGsToTable(curVizObj, dim.curCloneIDs);
	            }

	            // highlight this clone
	            _ts_gtypeHighlight(d.id, curVizObj);

	            d3.event.stopPropagation();
	        }
	    });

	// MUTATION TABLE

	// if mutations are specified by the user
	if (curVizObj.userConfig.mutations != "NA") {

	    // make the table
	    _ts_makeMutationTable(curVizObj, curVizObj.view.mutationTableDIV, curVizObj.data.mutations,
	        dim.mutationTableHeight);
	}
}
