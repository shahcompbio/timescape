/* function to run timescape
* @param {String} view_id -- id for this view
* @param {Number} width -- width of the view
* @param {Number} height -- height of the view
* @param {Object} userConfig -- user configurations
*/
function _run_timescape(view_id, width, height, userConfig) {

	// defaults
	var defaults = {
	    paddingGeneral: 15,
	    legendWidth: 110,
	    treeHeight: 100,
	    treeWidth: 100,
	    max_r: 7, // maximum radius for legend tree nodes
	    min_r: 1.5, // minimum radius for legend tree nodes
	    xAxisHeight: 30,
	    yAxisWidth: 20,
	    smallMargin: 5,
	    transitionSpeed: 200,
	    isPopOverVisible: false,
	    button: false,
	    gridsterBaseDimension: 120,
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
	    topBarHighlight: "#C6C6C6",
	    viewTitle: "TIMESCAPE",
	    titleFontSize: 15
	};

	vizObj.ts = {}; // vizObj for timescape
	var curVizObj = vizObj.ts;
	curVizObj.view_id = view_id;
	curVizObj.data = {};
	curVizObj.view = {};

	// set configurations
	curVizObj.generalConfig = $.extend(true, {}, defaults);
	var dim = curVizObj.generalConfig;

	// get params from R
	curVizObj.userConfig = userConfig;

	// configuration based on available data
	dim.canvasSVGWidth = width;
	dim.canvasSVGHeight = height - dim.topBarHeight;
	dim.tsSVGHeight = (!curVizObj.userConfig.mutations_provided) ? 
	                    dim.canvasSVGHeight - dim.xAxisHeight - dim.smallMargin - dim.paddingGeneral*2:
	                    250;
	dim.tsSVGWidth = dim.canvasSVGWidth - dim.legendWidth - dim.yAxisWidth - dim.smallMargin - dim.paddingGeneral;
	dim.xAxisWidth = dim.tsSVGWidth;
	dim.yAxisHeight = dim.tsSVGHeight;
	dim.mutationTableHeight = dim.canvasSVGHeight - dim.tsSVGHeight - dim.smallMargin - 25 - dim.xAxisHeight;
	dim.mutationTableWidth = dim.tsSVGWidth;

	// adjust canvas SVG height if mutation table is present
	dim.canvasSVGHeight -= (!curVizObj.userConfig.mutations_provided) ? 
	                        0 : 
	                        dim.mutationTableHeight;

	console.log("timescape curVizObj");
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

 	// top panel title
    topBarSVG.append("text")
        .attr("x", 10)
        .attr("y", dim.topBarHeight/2)
        .attr("text-anchor", "start")
        .attr("dy", "+0.35em")
        .attr("font-family", "Arial")
        .attr("fill", "white")
        .attr("pointer-events","none")
        .text(dim.viewTitle);

	var downloadButtonWidth = 80; // width of the top panel download button
	var resetButtonWidth = 42; // width of the top panel reset button

	var resetButton_base64 = "data:image/svg+xml;base64," + "PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4NCjwhLS0gR2VuZXJhdG9yOiBBZG9iZSBJbGx1c3RyYXRvciAxNC4wLjAsIFNWRyBFeHBvcnQgUGx1Zy1JbiAuIFNWRyBWZXJzaW9uOiA2LjAwIEJ1aWxkIDQzMzYzKSAgLS0+DQo8IURPQ1RZUEUgc3ZnIFBVQkxJQyAiLS8vVzNDLy9EVEQgU1ZHIDEuMS8vRU4iICJodHRwOi8vd3d3LnczLm9yZy9HcmFwaGljcy9TVkcvMS4xL0RURC9zdmcxMS5kdGQiPg0KPHN2ZyB2ZXJzaW9uPSIxLjEiIGlkPSJDYXBhXzEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHg9IjBweCIgeT0iMHB4Ig0KCSB3aWR0aD0iNTEycHgiIGhlaWdodD0iNTEycHgiIHZpZXdCb3g9IjAgMCA1MTIgNTEyIiBlbmFibGUtYmFja2dyb3VuZD0ibmV3IDAgMCA1MTIgNTEyIiB4bWw6c3BhY2U9InByZXNlcnZlIj4NCjxnPg0KCTxwYXRoIGZpbGw9IiNGRkZGRkYiIGQ9Ik00MzIuOTc1LDgwLjAzNGMtMjcuOTk4LTI3Ljk2My02MC45MjYtNDcuODYtOTYuMDM3LTU5Ljc2NHY3NS4xODkNCgkJYzE2LjkwNCw4LjQxNywzMi45MjgsMTkuMzY5LDQ2Ljk4LDMzLjQ1NmM3MC4xODgsNzAuMjI0LDcwLjE4OCwxODQuMzk3LDAsMjU0LjU4NGMtNzAuMTg5LDcwLjA4NC0xODQuMjkzLDcwLjA4NC0yNTQuNTg3LDANCgkJYy03MC4xMTctNzAuMjU4LTcwLjExNy0xODQuMzYxLDAtMjU0LjU4NGMwLjE3Ny0wLjIxMSwwLjc0LTAuNTYzLDAuOTg3LTAuODhoMC4wN2w3NC4yMTcsODEuNzMxTDIxNC41LDguNUw4LjkwNSwzLjM1Ng0KCQlsNzIuNDYxLDc1LjU4NmMtMC4yNDcsMC40MjItMC42MzQsMC44NDUtMC45NTEsMS4wOTJjLTk3LjMwNSw5Ny4yNy05Ny4zMDUsMjU1LjA3OSwwLDM1Mi4zNDkNCgkJYzk3LjQ0Niw5Ny4zNzUsMjU1LjE1LDk3LjM3NSwzNTIuNTYsMEM1MzAuMjA5LDMzNS4xMTMsNTMwLjMxNCwxNzcuMzA0LDQzMi45NzUsODAuMDM0eiIvPg0KPC9nPg0KPC9zdmc+DQo="
	var downloadButton_base64 = "data:image/svg+xml;base64," + "PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4NCjwhLS0gR2VuZXJhdG9yOiBBZG9iZSBJbGx1c3RyYXRvciAxNC4wLjAsIFNWRyBFeHBvcnQgUGx1Zy1JbiAuIFNWRyBWZXJzaW9uOiA2LjAwIEJ1aWxkIDQzMzYzKSAgLS0+DQo8IURPQ1RZUEUgc3ZnIFBVQkxJQyAiLS8vVzNDLy9EVEQgU1ZHIDEuMS8vRU4iICJodHRwOi8vd3d3LnczLm9yZy9HcmFwaGljcy9TVkcvMS4xL0RURC9zdmcxMS5kdGQiPg0KPHN2ZyB2ZXJzaW9uPSIxLjEiIGlkPSJMYXllcl8xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB4PSIwcHgiIHk9IjBweCINCgkgd2lkdGg9IjUxMnB4IiBoZWlnaHQ9IjUxMnB4IiB2aWV3Qm94PSIwIDAgNTEyIDUxMiIgZW5hYmxlLWJhY2tncm91bmQ9Im5ldyAwIDAgNTEyIDUxMiIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI+DQo8cG9seWdvbiBmaWxsPSIjRkZGRkZGIiBwb2ludHM9IjM1NC41LDMzMy41IDMzMy41LDMxMy41IDI3MS44MzUsMzY1LjU2NCAyNzEuODM1LDcuOTE3IDI0MC4xNjUsNy45MTcgMjQwLjE2NSwzNjUuNTY0IDE4MC41LDMxNC41IA0KCTE1Ny41LDMzNi41IDI1Niw0MjYuMTg4ICIvPg0KPHBvbHlnb24gZmlsbD0iI0ZGRkZGRiIgcG9pbnRzPSIyOC41LDQ3Mi40MTIgNDg5LjUsNDcyLjQxMiA0OTAuNSw1MDQuMDgyIDI3LjUsNTA0LjA4MiAiLz4NCjxwb2x5Z29uIGZpbGw9IiNGRkZGRkYiIHBvaW50cz0iMjYuNTgsMzY2LjQxMiA2My40NjcsMzY2LjQxMiA2My41NDcsNTAyLjUgMjYuNSw1MDIuNSAiLz4NCjxwb2x5Z29uIGZpbGw9IiNGRkZGRkYiIHBvaW50cz0iNDUyLjUzMywzNjUuNDEyIDQ4OS40MTksMzY1LjQxMiA0ODkuNSw1MDEuNSA0NTIuNDUzLDUwMS41ICIvPg0KPC9zdmc+DQo="
	var timescapeButton_base64 = "data:image/svg+xml;base64," + "PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4NCjwhLS0gR2VuZXJhdG9yOiBBZG9iZSBJbGx1c3RyYXRvciAxNC4wLjAsIFNWRyBFeHBvcnQgUGx1Zy1JbiAuIFNWRyBWZXJzaW9uOiA2LjAwIEJ1aWxkIDQzMzYzKSAgLS0+DQo8IURPQ1RZUEUgc3ZnIFBVQkxJQyAiLS8vVzNDLy9EVEQgU1ZHIDEuMS8vRU4iICJodHRwOi8vd3d3LnczLm9yZy9HcmFwaGljcy9TVkcvMS4xL0RURC9zdmcxMS5kdGQiPg0KPHN2ZyB2ZXJzaW9uPSIxLjEiIGlkPSJMYXllcl8xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB4PSIwcHgiIHk9IjBweCINCgkgd2lkdGg9Ijg3MHB4IiBoZWlnaHQ9IjI4MHB4IiB2aWV3Qm94PSIwIDAgODcwIDI4MCIgZW5hYmxlLWJhY2tncm91bmQ9Im5ldyAwIDAgODcwIDI4MCIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI+DQo8ZGVmcyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGh0bWwiPg0KCTxzdHlsZSAgdHlwZT0idGV4dC9jc3MiPg0KCQk8IVtDREFUQVtdXT4NCgk8L3N0eWxlPg0KPC9kZWZzPg0KPGRlZnMgIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hodG1sIj4NCgk8c3R5bGUgIHR5cGU9InRleHQvY3NzIj48L3N0eWxlPg0KPC9kZWZzPg0KPHBhdGggZmlsbD0iI0ZGRkZGRiIgc3Ryb2tlPSIjRkZGRkZGIiBkPSJNNjcuNSwxMzUuNDg3YzQ1LDAsNDUtMTI0Ljk4Nyw5MC0xMjQuOTg3bDAsMGM5MCwwLDkwLDAsMTgwLDBsMCwwYzE4MCwwLTg1LDAsOTUsMGwwLDANCgl2MjQ5Ljk3NWwwLDBjLTE4MCwwLDAsMC05NSwwbDAsMGMtOTAsMC05MCwwLTE4MCwwbDAsMEMxMTIuNSwyNjAuNDc1LDExMi41LDEzNS40ODcsNjcuNSwxMzUuNDg3Ii8+DQo8ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSg3NjAsMCkiPg0KPC9nPg0KPGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNzYwLDIwOCkiPg0KPC9nPg0KPC9zdmc+DQo="
	var clonalTrajButton_base64 = "data:image/svg+xml;base64," + "PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4NCjwhLS0gR2VuZXJhdG9yOiBBZG9iZSBJbGx1c3RyYXRvciAxNC4wLjAsIFNWRyBFeHBvcnQgUGx1Zy1JbiAuIFNWRyBWZXJzaW9uOiA2LjAwIEJ1aWxkIDQzMzYzKSAgLS0+DQo8IURPQ1RZUEUgc3ZnIFBVQkxJQyAiLS8vVzNDLy9EVEQgU1ZHIDEuMS8vRU4iICJodHRwOi8vd3d3LnczLm9yZy9HcmFwaGljcy9TVkcvMS4xL0RURC9zdmcxMS5kdGQiPg0KPHN2ZyB2ZXJzaW9uPSIxLjEiIGlkPSJMYXllcl8xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB4PSIwcHgiIHk9IjBweCINCgkgd2lkdGg9Ijk3MHB4IiBoZWlnaHQ9IjI4MHB4IiB2aWV3Qm94PSIwIDAgOTcwIDI4MCIgZW5hYmxlLWJhY2tncm91bmQ9Im5ldyAwIDAgOTcwIDI4MCIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI+DQo8ZGVmcyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGh0bWwiPg0KCTxzdHlsZSAgdHlwZT0idGV4dC9jc3MiPg0KCQk8IVtDREFUQVtdXT4NCgk8L3N0eWxlPg0KPC9kZWZzPg0KPGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMjUsMCkiPg0KCTxwYXRoIGZpbGw9IiNGRkZGRkYiIHN0cm9rZT0iI0ZGRkZGRiIgZD0iTS0yMSw1MC41MjZjNzguNDE3LDAsNzguNDE3LDAsMTU2LjgzMywwbDAsMEMyOTIuNjY3LDUwLjUyNiwyOTIuNjY3LDAsNDQ5LjUsMGwwLDANCgkJdjEwMS4wNTRsMCwwYy0xNTYuODMzLDAtMTU2LjgzMy01MC41MjctMzEzLjY2Ny01MC41MjdsMCwwQzU3LjQxNyw1MC41MjYsNTcuNDE3LDUwLjUyNi0yMSw1MC41MjYiLz4NCgk8cGF0aCBmaWxsPSIjRkZGRkZGIiBzdHJva2U9IiNGRkZGRkYiIGQ9Ik0tMjEsMjA0LjM1MWM3OC40MTcsMCw3OC40MTctNzMuMjM4LDE1Ni44MzMtNzMuMjM4bDAsMA0KCQljMTU2LjgzMywwLDE1Ni44MzMsNzMuMDA4LDMxMy42NjcsNzMuMDA4bDAsMHYwLjQ1NWwwLDBjLTE1Ni44MzMsMC0xNTYuODMzLDczLjAxMi0zMTMuNjY3LDczLjAxMmwwLDANCgkJQzU3LjQxNywyNzcuNTg4LDU3LjQxNywyMDQuMzUxLTIxLDIwNC4zNTEiLz4NCjwvZz4NCjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDg2MCwwKSI+DQo8L2c+DQo8ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSg4NjAsMjA4KSI+DQo8L2c+DQo8L3N2Zz4NCg=="

	var resetButtonIconWidth = dim.topBarHeight - 10; // icon size for reset button
	var downloadButtonIconWidth = dim.topBarHeight - 10; // icon size for download button
	var timescapeButtonIconWidth = 50; // icon size for timescape button
	var clonalTrajButtonIconWidth = 60; // icon size for timescape button

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
	        downloadSVG("timescape_" + view_id);
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
	        downloadSVG("timescape_" + view_id);
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
	        _downloadPNG("timescape_" + view_id, "timescape_" + view_id + ".png");
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
	        _downloadPNG("timescape_" + view_id, "timescape_" + view_id + ".png");
	    });

	// TimeScape button
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
	        _sweepClick(curVizObj);
	        
	    })
	    .append("title")
        .text("View Switch");
	topBarSVG.append("image")
	    .attr("class", "timescapeIcon")
	    .attr("xlink:href", timescapeButton_base64)
	    .attr("x", width - 2*downloadButtonWidth - resetButtonWidth + 5)
	    .attr("y", -10)
	    .attr("width", timescapeButtonIconWidth)
	    .attr("height", timescapeButtonIconWidth)
	    .on("mouseover", function() {
	        d3.select("#" + view_id).select(".tsButton").attr("fill", dim.topBarHighlight);
	    })
	    .on("mouseout", function() {
	        d3.select("#" + view_id).select(".tsButton").attr("fill", dim.topBarColour);
	    })
	    .attr("opacity", 0) // start with opacity zero
	    .on("click", function() {
	        // change view
	        _sweepClick(curVizObj);

	        // turn off opacity & pointer events
	        d3.select(this)
	            .attr("opacity", 0)
	            .attr("pointer-events", "none");

	        // turn on clonal trajectory icon opacity & pointer events
	        d3.select("#" + view_id).select(".clonalTrajIcon")
	            .attr("opacity", 1)
	            .attr("pointer-events", "auto");
	    })
	    .append("title")
        .text("View Switch");
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
	        _sweepClick(curVizObj);

	        // turn off opacity & pointer events
	        d3.select(this)
	            .attr("opacity", 0)
	            .attr("pointer-events", "none");

	        // turn on timescape icon opacity & pointer events
	        d3.select("#" + view_id).select(".timescapeIcon")
	            .attr("opacity", 1)
	            .attr("pointer-events", "auto");

	    })
	    .append("title")
        .text("View Switch");

	// reset button (only if mutations are provided)
	if (curVizObj.userConfig.mutations_provided) {
		topBarSVG.append("rect")
		    .attr("class", "resetButton")
		    .attr("x", width - 2*downloadButtonWidth - 2*resetButtonWidth)
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
		        _backgroundClick(curVizObj);
		    });
		topBarSVG.append("image")
		    .attr("xlink:href", resetButton_base64)
		    .attr("x", width - 2*downloadButtonWidth - 2*resetButtonWidth + (resetButtonWidth - resetButtonIconWidth)/2)
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
		        _backgroundClick(curVizObj);
		    });
	}

	// OTHER SVGS

	var canvasSVG = canvasDIV
	    .append("svg:svg")  
	    .attr("class", "timescape_" + view_id)     
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
	    .attr("class", "tsTreeSVG")// move the tree SVG in the x-direction past timescape
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
	_getTreeInfo(curVizObj);

	// get mutation data in better format
	if (curVizObj.userConfig.mutations_provided) {
	    _reformatMutations(curVizObj);

		// get column names (depending on the available data, which columns will be shown)
        dim.mutationColumns = [ { "data": "empty", "title": "Clone", "bSortable": false, "defaultContent": "" } ];
        var columnNames = [];
        Object.keys(curVizObj.userConfig.mutations[0]).forEach(function(key) {
            var title = toTitleCase(key.replace(/_/g, ' ')).replace(/ Id$/g, ' ID'); // capitalize the whole word "ID"
            var newColumn = { "data": key, "title": title, "defaultContent": "" };
            if (key == "clone_id") { // make sure clone_id is inserted next to "empty", which will become the clone svg circle
            	dim.mutationColumns.splice(1, 0, newColumn);
            }
            else {
            	dim.mutationColumns.push(newColumn);
            }
        });
	}

	// get timepoints, prepend a "T0" timepoint to represent the timepoint before any data originated
	var timepoints = _.uniq(_.pluck(curVizObj.userConfig.clonal_prev, "timepoint"));
	timepoints.unshift("T0");
	curVizObj.data.timepoints = timepoints;

	// get cellular prevalence info
	_getCPData(curVizObj);

	// get emergence values & timepoints for each genotype
	curVizObj.data.emergence_values = _getEmergenceValues(curVizObj);
	curVizObj.data.emergence_tps = _getEmergenceTimepoints(curVizObj);

	// convert time-centric cellular prevalence data into genotype-centric cellular prevalence data
	_getGenotypeCPData(curVizObj);

	// get the layout of the traditional timescape
	_getLayout(curVizObj);

	// get paths for plotting
	_getPaths(curVizObj);

	// get cellular prevalence labels
	curVizObj.data.ts_trad_labels = _getTraditionalCPLabels(curVizObj);
	curVizObj.data.ts_sep_labels = _getSeparateCPLabels(curVizObj);

	// SET CONTENT

	// tips (for VAF and node genotypes)
	curVizObj.vafTips = [];
	var nodeTip = d3.tip()
	    .attr('class', 'd3-tip')
	    .offset([-10,0])
	    .html(function(d) {
	        return "<span>" + d + "</span>";
	    });  
	d3.select("#" + view_id).select(".timescape_" + view_id).call(nodeTip);

	// get colour scheme
	_getPhyloColours(curVizObj);
	var colour_assignment = curVizObj.view.colour_assignment,
	    alpha_colour_assignment = curVizObj.view.alpha_colour_assignment;

	// colour paths
	_colourPaths(curVizObj);

	// plot light grey timescape background
	curVizObj.view.tsSVG
	    .append("rect")
	    .attr("x", 0)
	    .attr("y", 0)
	    .attr("height", dim.tsSVGHeight)
	    .attr("width", dim.tsSVGWidth)
	    .attr("fill", "#F7F7F7");

	// plot timescape data
	curVizObj.view.tsSVG
		.append("g")
		.attr("class", "tsPlotG traditional") // start with traditional plot
	    .selectAll('.tsPlot')
	    .data(curVizObj.data.bezier_paths, function(d) {
	        return d.gtype;
	    })
	    .enter().append('path')
	    .attr('class', function(d) { return 'tsPlot gtype_' + d.gtype; }) 
	    .attr('d', function(d) { return d.path; })
	    .attr('fill', function(d) { 
	        return d.fill;
	    }) 
	    .attr('stroke', function(d) { 
	        return d.stroke;
	    })
	    .on('mouseover', function(d) {
	        if (!dim.selectOn && !dim.mutSelectOn && _checkForCellScapeSelections(view_id)) {
	        	_tsMouseoverGenotype(d.gtype, curVizObj.view_id);
	        	_showLabels(d.gtype, curVizObj.view_id);
	        }
	    })
	    .on('mouseout', function(d) {
	        if (!dim.selectOn && !dim.mutSelectOn && _checkForCellScapeSelections(view_id)) {
	        	_tsMouseoutGenotype(curVizObj.view_id);
	        	_hideLabels(curVizObj.view_id);
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
	        if (!dim.selectOn && _checkForCellScapeSelections(view_id)) {
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
	        if (!dim.selectOn && _checkForCellScapeSelections(view_id)) {
	            d3.select("#" + curVizObj.view_id)
	                .selectAll(".pertGuide.pert_" + d.pert_name).remove();
	        }
	    });

	// PLOT TIMEPOINT GUIDES


	// plot time point guides
	curVizObj.view.tsSVG
		.append('g')
		.attr("class", "tpGuidesG")
		.selectAll(".tpGuide")
		.data(curVizObj.data.timepoints)
		.enter()
	    .append('line')
	    .attr('class', function(d) { return 'tpGuide tp_' + d; })
	    .attr('x1', function(d,i) { return (i / (curVizObj.data.timepoints.length - 1)) * dim.tsSVGWidth; })
	    .attr('x2', function(d,i) { return (i / (curVizObj.data.timepoints.length - 1)) * dim.tsSVGWidth; })
	    .attr('y1', 0)
	    .attr('y2', dim.tsSVGHeight)
	    .attr('stroke', 'white')
	    .attr('stroke-opacity', 0.4)
	    .attr('stroke-width', '1.5px')
	    .style('pointer-events', 'none');

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
	            _.findWhere(curVizObj.userConfig.timepoint_map, {"space_replaced_timepoint": d}).original_timepoint;
	        return tp;
	    })
	    .on('mouseover', function(d, i) {
	        if (!dim.selectOn && _checkForCellScapeSelections(view_id)) {
	        	// highlight timepoint guide
	        	_hlTpGuide(view_id, d);

	            // highlight those nodes with this timepoint in single cell vis
	            if (typeof _mouseoverTp == 'function') {
	            	_mouseoverTp(d, curVizObj.view_id);
	            }
	        }
	    })
	    .on('mouseout', function(d) {
	        if (!dim.selectOn && _checkForCellScapeSelections(view_id)) {
	            // hide timepoint guide
	        	_hideTpGuides(view_id);

	            // reset single cell vis
	            if (typeof _mouseoutTp == 'function') {
	            	_mouseoutTp(curVizObj.view_id);
	            }
	        }
	    })
	    .style("cursor", "default");

	// plot y-axis title
	curVizObj.view.yAxisSVG
	    .append('text')
	    .attr('class', 'axisTitle yAxis')
	    .attr('x', 0)
	    .attr('y', 0)
	    .attr('dy', '.35em')
	    .attr('text-anchor', 'middle')
	    .attr('font-family', 'Arial')
	    .attr('font-size', dim.titleFontSize)
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
	    .attr('font-size', dim.titleFontSize)
	    .attr('font-weight', 'bold')
	    .text(function() { 
	        return curVizObj.userConfig.xaxis_title;
	    });


	// PLOT TREE GLYPH

	// plot tree title
	var treeTitle = curVizObj.userConfig.phylogeny_title.split(" ");
	var treeTitleSpacing = 2; // spacing between title words 
	treeTitle.forEach(function(word, word_i) {
		curVizObj.view.tsTree
		    .append('text')
		    .attr('class', 'treeTitle')
		    .attr('x', 0)
		    .attr('y', word_i*(dim.titleFontSize + treeTitleSpacing))
		    .attr('dy', '.71em')
		    .attr('text-anchor', 'left')
		    .attr('font-family', 'Arial')
		    .attr('font-size', dim.titleFontSize)
		    .attr('font-weight', 'bold')
		    .text(word); 		
	})


	// d3 tree layout
	var treeR = 4,
	    treePadding = 10,
	    treeTitleHeight = treeTitle.length * (dim.titleFontSize + treeTitleSpacing),
	    treeLayout = d3.layout.tree()           
	        .size([dim.treeHeight - treePadding, dim.treeWidth - treePadding]); 

	// get node radius for legend phylogeny (7 == # pixels between nodes)
	var tree_height = curVizObj.data.tree_height;
	dim.legendNode_r = (((dim.treeWidth-treePadding) - 7*tree_height)/tree_height)/2;
	dim.legendNode_r = (dim.legendNode_r > dim.max_r) ? dim.max_r : dim.legendNode_r;
	dim.legendNode_r = (dim.legendNode_r < dim.min_r) ? dim.min_r : dim.legendNode_r;

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
	    .attr("d", _elbow)
	    .on("mouseover", function(d) {
	        // we're not selecting nodes or mutations
	        if (!dim.selectOn && !dim.mutSelectOn && _checkForCellScapeSelections(view_id)) {

	            // inactivate all genotypes 
	            _tsInactivateGenotypes(curVizObj.view_id);

	            // highlight all elements downstream of link
	            _propagatedEffects(curVizObj, d.link_id, curVizObj.link_ids, "downstream");
	        }
	    })
	    .on("mouseout", function() {
	        // we're not selecting nodes or mutations
	        if (!dim.selectOn && !dim.mutSelectOn && _checkForCellScapeSelections(view_id)) {
	            _tsMouseoutGenotype(curVizObj.view_id);
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
	    	d.fill = (d.id == dim.phantomRoot) ? "none" : alpha_colour_assignment[d.id];
	        return d.fill;
	    })
	    .attr('stroke', function(d) {
	    	d.stroke = (d.id == dim.phantomRoot) ? "none" : colour_assignment[d.id];
	        return d.stroke;
	    })
	    .attr("id", function(d) { return d.sc_id; })
	    .attr("r", dim.legendNode_r + "px")
	    .on('mouseover', function(d) {
	        // show node genotype tooltip
	        var clone_name = // get original sample name (spaces may have been replaced with underscores)
	            _.findWhere(curVizObj.userConfig.clone_id_map, {"space_replaced_clone_id": d.id}).original_clone_id;
	        nodeTip.show("Clone: " + clone_name);

	        // if we're selecting nodes
	        if (dim.nClickedNodes > 0 && d.id != dim.phantomRoot) {
	            // highlight node in the legend
	            d3.select(this)
	                .attr('fill', function(d) { return alpha_colour_assignment[d.id]; })
	                .attr('stroke', function(d) { return colour_assignment[d.id]; });
	        }
	        // we're not selecting nodes or mutations - highlight genotype
	        if (!dim.selectOn && !dim.mutSelectOn && _checkForCellScapeSelections(view_id)) {
	            _tsMouseoverGenotype(d.id, curVizObj.view_id);
	            _showLabels(d.id, curVizObj.view_id);
	        }
	    })
	    .on('mouseout', function(d) {
	        // hide node genotype
	        nodeTip.hide();

	        // we're not selecting nodes or mutations - mouseout as normal
	        if (!dim.selectOn && !dim.mutSelectOn && _checkForCellScapeSelections(view_id)) {
	        	_tsMouseoutGenotype(curVizObj.view_id);
   	 			_hideLabels(curVizObj.view_id);
	        }
	    })
	    .on("click", function(d) {
	        // if there are mutations and we're not selecting any of them
	        if (curVizObj.userConfig.mutations_provided && !dim.mutSelectOn) {

	            dim.selectOn = true;
	            dim.nClickedNodes++; // increment the number of clicked nodes

	            // reset view (get rid of any labels, etc.)
	            _hideLabels(curVizObj.view_id);

	            // get data for this clone
	            var filtered_muts = 
	                _.filter(curVizObj.data.mutations, function(mut) { return mut.clone_id == d.id; });

	            // if there's no data for this clone, add a row of "None"
	            if (filtered_muts.length === 0) { 
	                filtered_muts = [{}];
	                dim.mutationColumns.forEach(function(col) {
	                    filtered_muts[0][col.data] = (col.data == "empty") ? "" : "None";
	                })
	            }
	            filtered_muts[0].clone_id = d.id;

	            // if it's the first clicked node
	            if (dim.nClickedNodes == 1) {
	                // delete existing data table
	                d3.select("#" + curVizObj.view_id + "_mutationTable" + "_wrapper").remove();   

	                // plot filtered data table
	                _makeMutationTable(curVizObj, curVizObj.view.mutationTableDIV, filtered_muts,
	                    dim.mutationTableHeight); 

	                // inactivate all genotypes
	                _tsInactivateGenotypes(curVizObj.view_id);
	            }
	            // otherwise
	            else {
	                // add to existing data table
	                var table = $("#" + curVizObj.view_id + "_mutationTable").DataTable();
	                table.rows.add(filtered_muts).draw(false);

	                // add this clone id to the list of clone ids in the mutation table
	                dim.curCloneIDs = dim.curCloneIDs.concat(_.pluck(filtered_muts, "clone_id"));

	                // plot clone svg circles in mutation table
	                _addCloneSVGsToTable(curVizObj, dim.curCloneIDs);
	            }

	            // highlight this clone
	            _tsHighlightGenotype(d.id, curVizObj.view_id);

	            d3.event.stopPropagation();
	        }
	    });

	// CREATE CLONAL PREVALENCE LABELS
    _createLabels(curVizObj, curVizObj.data.ts_trad_labels);
    _createLabels(curVizObj, curVizObj.data.ts_sep_labels);


	// MUTATION TABLE

	// if mutations are specified by the user
	if (curVizObj.userConfig.mutations != "NA") {

	    // make the table
	    _makeMutationTable(curVizObj, curVizObj.view.mutationTableDIV, curVizObj.data.mutations,
	        dim.mutationTableHeight);
	}

	// ******** HELPER FUNCTIONS ******** //

	// D3 EFFECTS FUNCTIONS

	/* function to check for single cell viewer selections
	*/
	function _checkForCellScapeSelections(view_id) {
		return (typeof _checkForSelections !== "function" || // if no cellScape, return true
        		(typeof _checkForSelections === "function" && _checkForSelections(curVizObj.view_id))); // if cellScape, check for its selections
	}

	/* function for genotype mouseover
	* @param {String} gtype -- genotype to highlight
	* @param {String} view_id -- id of current view
	*/
	function _tsMouseoverGenotype(gtype, view_id) {

	    _tsInactivateGenotypes(view_id);
	    _tsHighlightGenotype(gtype, view_id);
	}

	/* function for genotype mouseover
	* @param {String} view_id -- id of current view
	*/
	function _tsMouseoutGenotype(view_id) {
	    d3.select("#" + view_id).selectAll(".graph.node").classed("inactive", false);
	    d3.select("#" + view_id).selectAll(".tree.node").classed("inactive", false);
	    d3.select("#" + view_id).selectAll(".graph.node").classed("active", false);
	    d3.select("#" + view_id).selectAll(".tree.node").classed("active", false);
	    d3.select("#" + view_id).selectAll(".legendGroupRect").classed("active", false);
	    d3.select("#" + view_id).selectAll(".tsPlot").classed("inactive", false);
	    d3.select("#" + view_id).selectAll(".legendTreeNode").classed("inactive", false);
	    d3.select("#" + view_id).selectAll(".indic").attr("fill-opacity", 0);
	}

	/* function to highlight a particular genotype
	* @param {String} gtype -- genotype to highlight
	* @param {String} view_id -- id of current view
	*/
	function _tsHighlightGenotype(gtype, view_id) {
	    d3.select("#" + view_id).selectAll(".indic.gtype_" + gtype).attr("fill-opacity", 1);
	    d3.select("#" + view_id).selectAll(".graph.node.gtype_" + gtype).classed("inactive", false);
	    d3.select("#" + view_id).selectAll(".tree.node.gtype_" + gtype).classed("inactive", false);
	    d3.select("#" + view_id).selectAll(".legendGroupRect.gtype_" + gtype).classed("active", true);
	    d3.select("#" + view_id).selectAll(".tsPlot.gtype_" + gtype).classed("inactive", false);
	    d3.select("#" + view_id).selectAll(".legendTreeNode.gtype_" + gtype).classed("inactive", false);
	}

	/* function to inactivate all genotypes
	* @param {String} view_id -- id of current view
	*/
	function _tsInactivateGenotypes(view_id) {
	    d3.select("#" + view_id).selectAll(".graph.node").classed("inactive", true);
	    d3.select("#" + view_id).selectAll(".tree.node").classed("inactive", true);
	    d3.select("#" + view_id).selectAll(".legendGroupRect").classed("active", false);
	    d3.select("#" + view_id).selectAll(".tsPlot").classed("inactive", true);
	    d3.select("#" + view_id).selectAll(".legendTreeNode").classed("inactive", true);
	}


	/* recursive function to perform downstream or upstream effects on legend tree link
	* @param {Object} curVizObj -- vizObj for the current view
	* @param {String} link_id -- id for the link that's currently highlighted
	* @param {Array} link_ids -- ids for all links in tree
	* @param {String} stream_direction -- "downstream" or "upstream"
	*/
	function _propagatedEffects(curVizObj, link_id, link_ids, stream_direction) {
	    var view_id = curVizObj.view_id,
	        dim = curVizObj.generalConfig,
	        colour_assignment = curVizObj.view.colour_assignment,
	        alpha_colour_assignment = curVizObj.view.alpha_colour_assignment;

	    // clear propagation info in vizObj
	    curVizObj.view.propagation = {};

	    // get propagation info
	    _getPropatagedItems(curVizObj, link_id, link_ids, stream_direction);

	    // highlight links in legend
	    curVizObj.view.propagation.link_ids.forEach(function(cur_link_id) {
	        d3.select("#" + curVizObj.view_id)
	            .select(".legendTreeLink." + cur_link_id)
	            .attr("stroke-opacity", 1);
	    });

    	// highlight the downstream genotypes in the single cell view
    	curVizObj.view.propagation.node_ids.forEach(function(node) {
	    	_tsHighlightGenotype(node, curVizObj.view_id);
	    });
	};


	/* function to get the links, nodes, samples and sample locations participating in the current propagation
	* @param {Object} curVizObj -- vizObj for the current view
	* @param {String} link_id -- id for the link that's currently highlighted
	* @param {Array} link_ids -- ids for all links in tree
	* @param {String} stream_direction -- "downstream" or "upstream"
	*/
	function _getPropatagedItems(curVizObj, link_id, link_ids, stream_direction) {
	    var view_id = curVizObj.view_id,
	        generalTargetRX = new RegExp("treeLink_source_.+_target_(.+)"), // regex to get target
	        generalSourceRX = new RegExp("treeLink_source_(.+)_target_.+"); // regex to get source

	    // get target & source id of this link
	    var target_id = generalTargetRX.exec(link_id)[1];
	    var source_id = generalSourceRX.exec(link_id)[1];

	    // get the targets of this target, or sources of source
	    var nextNodeRX = (stream_direction == "downstream") ? 
	        new RegExp("treeLink_source_" + target_id + "_target_(.+)") :
	        new RegExp("treeLink_source_(.+)_target_" + source_id);
	    var targetLinks_of_targetNode = [];
	    link_ids.map(function(id) {
	        if (id.match(nextNodeRX)) {
	            targetLinks_of_targetNode.push(id);
	        }
	    });

	    // add information to curVizObj
	    curVizObj.view.propagation = curVizObj.view.propagation || {};
	    curVizObj.view.propagation.node_ids = curVizObj.view.propagation.node_ids || [];
	    curVizObj.view.propagation.node_ids.push(target_id);
	    curVizObj.view.propagation.link_ids = curVizObj.view.propagation.link_ids || [];
	    curVizObj.view.propagation.link_ids.push(link_id);

	    // for each of the target's targets, highlight their downstream links
	    targetLinks_of_targetNode.map(function(target_link_id) {
	        _getPropatagedItems(curVizObj, target_link_id, link_ids, stream_direction);
	    });
	};


	function _sweepClick(curVizObj) {
	    var dim = curVizObj.generalConfig,
	        colour_assignment = curVizObj.view.colour_assignment,
	        alpha_colour_assignment = curVizObj.view.alpha_colour_assignment,
	        x = curVizObj.userConfig;

	    // hide any cellular prevalence labels
	    d3.select("#" + curVizObj.view_id).selectAll(".label, .sepLabel")
	        .attr('fill-opacity', 0);
	    d3.select("#" + curVizObj.view_id).selectAll(".labelCirc, .sepLabelCirc")
	        .attr('fill-opacity', 0);

	    // transition to tracks timescape view
	    if (d3.select("#" + curVizObj.view_id).select(".tsPlotG").classed("traditional")) {
	        var sweeps = curVizObj.view.tsSVG
	            .selectAll('.tsPlot')
	            .data(curVizObj.data.tracks_bezier_paths, function(d) {
	                return d.gtype;
	            })

	        sweeps
	            .transition()
	            .duration(1000)
	            .attrTween("d", _pathTween(curVizObj, "move"));

	        // remove genotypes that do not have cellular prevalence values
	        sweeps
	            .exit()
	            .transition()
	            .duration(1000)
	            .attrTween("d", _pathTween(curVizObj, "exit"))
	            .remove();

	        // switch class to "tracks"
	        d3.select("#" + curVizObj.view_id).select(".tsPlotG").classed("traditional", false).classed("tracks", true);
	    }
	    // transition to traditional timescape view
	    else {
	        var sweeps = curVizObj.view.tsSVG
	        	.select(".tsPlotG")
	            .selectAll('.tsPlot')
	            .data(curVizObj.data.bezier_paths, function(d) {
	                return d.gtype;
	            });

	        sweeps
	            .transition()
	            .duration(1000)
	            .attrTween("d", _pathTween(curVizObj, "move"));

	        // add those genotypes that do not have cellular prevalence values, but are in the hierarchy
	        sweeps
	            .enter()
	            .insert('path')
	            .attr('class', function(d) { 
	            	// if we're selecting nodes, but we haven't clicked this one yet
	                if ((dim.nClickedNodes > 0) && (_.uniq(dim.curCloneIDs).indexOf(d.id) == -1)) {
	                	return 'tsPlot inactive gtype_' + d.gtype; 
	                }
	            	return 'tsPlot gtype_' + d.gtype; 
	            })
	            .attr("d", _centreLine(curVizObj))
	            .attr('fill', function(d) { return d.fill; }) 
	            .attr('stroke', function(d) { return d.stroke; })
	            .on('mouseover', function(d) {
	                if (!dim.selectOn && !dim.mutSelectOn && _checkForCellScapeSelections(view_id)) {
	                	_tsMouseoverGenotype(d.gtype, curVizObj.view_id);
	                	_showLabels(d.gtype, curVizObj.view_id);
	                }
	            })
	            .on('mouseout', function(d) {
	                if (!dim.selectOn && !dim.mutSelectOn && _checkForCellScapeSelections(view_id)) {
	                    _tsMouseoutGenotype(curVizObj.view_id);
   	 					_hideLabels(curVizObj.view_id);
	                }
	            })
	            .transition()
	            .duration(1000)
	            .attrTween("d", _pathTween(curVizObj, "move"));

	        // switch class to "traditional"
	        d3.select("#" + curVizObj.view_id).select(".tsPlotG").classed("tracks", false).classed("traditional", true);
	    }
	}

	/* Create clonal prevalence labels with fill opacity 0
	* @param {Object} curVizObj -- vizObj for the current view
	* @param {Array} label_data -- array of objects containing label data, one label per object
	*/
	function _createLabels(curVizObj, label_data) {
	    var dim = curVizObj.generalConfig;

	    // for each cellular prevalence label for this genotype
        curVizObj.view.tsSVG
        	.append("g")
        	.attr("class", "labelCirclesG")
        	.selectAll("circle")
        	.data(label_data)
        	.enter()
            .append('circle')
            .attr('class', function(d) { 
                if (d.type == "traditional") {
                    return 'labelCirc tp_' + d.tp + ' gtype_' + d.gtype; 
                }
                return 'sepLabelCirc tp_' + d.tp + ' gtype_' + d.gtype; 
            }) 
            .attr('cx', function(d) { 

                // index of this time point relative to others
                var index = curVizObj.data.timepoints.indexOf(d.tp); 

                var x_val = (index / (curVizObj.data.timepoints.length-1)) * (dim.tsSVGWidth);

                // if the time point is the last
                if (index == curVizObj.data.timepoints.length - 1) {
                    // shift it to the left
                    x_val -= dim.circleR;
                }

                return x_val; 
            })
            .attr('cy', function(d) { 
                var y;
                // if the label, when centered vertically...
                // ... is cut off at the top, shift down
                if ((dim.tsSVGHeight-(d.middle*dim.tsSVGHeight)) < dim.circleR) {
                    y = 1 + dim.circleR;
                }

                // ... is cut off at the bottom, shift up
                else if ((d.middle*dim.tsSVGHeight) < dim.circleR) {
                    y = dim.tsSVGHeight - 1 - dim.circleR;
                }

                // ... is not cut off, center vertically
                else {
                    y = (1 - d.middle)*dim.tsSVGHeight; 
                }

                return dim.tsSVGHeight - y;
            })
            .attr('r', dim.circleR)
            .attr('fill', 'white')
            .attr("fill-opacity", 0)
            .style('pointer-events', 'none');

        curVizObj.view.tsSVG
        	.append("g")
        	.attr("class", "labelTextG")
        	.selectAll("text")
        	.data(label_data)
        	.enter()
            .append('text')
            .attr('font-family', 'Arial')
            .attr('font-size', dim.fontSize)
            .attr('class', function(d) { 
                if (d.type == "traditional") {
                    return 'label tp_' + d.tp + ' gtype_' + d.gtype; 
                }
                return 'sepLabel tp_' + d.tp + ' gtype_' + d.gtype; 
            }) 
            .text(function(d) {
                var cp = (Math.round(d.cp * 100) / 1);
                if (cp === 0) {
                	d.label_text = "< 0.01";
                    return ""; // text removed for purposes of svg download
                }
                cp_frac = (cp/100).toFixed(2);
                d.label_text = cp_frac.toString();
                return ""; // text removed for purposes of svg download
            })
            .attr('x', function(d) { 

                // index of this time point relative to others
                var index = curVizObj.data.timepoints.indexOf(d.tp); 

                var x_val = (index / (curVizObj.data.timepoints.length-1)) * (dim.tsSVGWidth);

                // if the time point is the last
                if (index == curVizObj.data.timepoints.length - 1) {
                    // shift it to the left
                    x_val -= dim.circleR;
                }

                return x_val; 
            })
            .attr('y', function(d) { return dim.tsSVGHeight - (1 - d.middle)*dim.tsSVGHeight; })
            .attr('dy', function(d) {

                // if the label, when centered vertically...
                // ... is cut off at the top, shift down
                if ((dim.tsSVGHeight-(d.middle*dim.tsSVGHeight)) < dim.circleR) {
                    d3.select(this).attr('y', dim.tsSVGHeight - 1 - dim.circleR);
                }

                // ... is cut off at the bottom, shift up
                else if ((d.middle*dim.tsSVGHeight) < dim.circleR) {
                    d3.select(this).attr('y', 1 + dim.circleR);
                }

                // ... is not cut off, center vertically
                return '.35em';
            })
            .attr('fill', 'black')
            .attr("fill-opacity", 0)
            .attr('text-anchor', 'middle')
            .style('pointer-events', 'none');
	}

	/* background click function (turns off selections, resets view)
	* @param {Object} curVizObj -- vizObj for the current view
	*/
	function _backgroundClick(curVizObj) {
	    var dim = curVizObj.generalConfig;

	    // if there was just a link selection, refresh the mutations table
	    if (dim.selectOn) {
	        // delete existing data table
	        d3.select("#" + curVizObj.view_id + "_mutationTable" + "_wrapper").remove();

	        // make new full table
	        _makeMutationTable(curVizObj, curVizObj.view.mutationTableDIV, curVizObj.data.mutations,
	            dim.mutationTableHeight);
	    }

	    dim.selectOn = false;
	    dim.mutSelectOn = false;
	    dim.nClickedNodes = 0;
	    dim.curCloneIDs = [];

	    // mark all mutations as unselected
	    d3.select("#" + curVizObj.view_id + "_mutationTable").selectAll("tr").classed('selected', false);

	    // unhighlight phylogeny links (highlighting occurs when mutation selected)
	    d3.select("#" + curVizObj.view_id).selectAll(".legendTreeLink").attr("stroke", dim.treeLinkColour);

	    // hide VAF tooltips
	    curVizObj.vafTips.forEach(function(curTip) {
	        curTip.hide();
	    })

	    _tsMouseoutGenotype(curVizObj.view_id);
   	 	_hideLabels(curVizObj.view_id);
	}

	// TREE FUNCTIONS

	/* extract all info from tree about nodes, edges, ancestors, descendants
	* @param {Object} curVizObj 
	*/
	function _getTreeInfo(curVizObj) {
	    var userConfig = curVizObj.userConfig,
	        cur_edges = userConfig.gtype_tree_edges,
	        phantomRoot = curVizObj.generalConfig.phantomRoot; // root so we have a lead-in link to the real root

	    // get tree nodes
	    curVizObj.data.treeNodes = _.uniq(_.pluck(cur_edges, "source").concat(_.pluck(cur_edges, "target")));
	    curVizObj.data.treeNodes.push(phantomRoot);

	    // get tree edges
	    curVizObj.data.treeEdges = [];
	    for (var i = 0; i < cur_edges.length; i++) {
	        curVizObj.data.treeEdges.push({
	            "source": cur_edges[i].source,
	            "target": cur_edges[i].target
	        })
	    }

	    // find tree root
	    var cur_source = curVizObj.data.treeEdges[0].source;
	    var source_as_target = // edge where the current source is the target
	        _.findWhere(curVizObj.data.treeEdges, {"target": cur_source}); 
	    while (source_as_target) { // iterate as long as there are edges with the current source as the target
	        cur_source = source_as_target.source;
	        source_as_target = _.findWhere(curVizObj.data.treeEdges, {"target": cur_source});
	    }
	    var rootName = cur_source;

	    // add the phantomRoot to the tree edges array
	    curVizObj.data.treeEdges.push({
	        "source": phantomRoot,
	        "target": rootName
	    })

	    // get tree structure
	    var nodesByName = [];
	    for (var i = 0; i < curVizObj.data.treeEdges.length; i++) {
	        var parent = _findNodeByName(nodesByName, curVizObj.data.treeEdges[i].source);
	        var child = _findNodeByName(nodesByName, curVizObj.data.treeEdges[i].target);
	        parent.children.push(child);
	    }
	    var root_tree = _findNodeByName(nodesByName, phantomRoot); 
	    curVizObj.data.treeStructure = root_tree; 

	    // get linear chains
	    curVizObj.data.treeChainRoots = []; // keep track of linear chain segment roots
	    curVizObj.data.treeChains = 
	        _getLinearTreeSegments(curVizObj, curVizObj.data.treeStructure, {}, "");

	    // get descendants for each node
	    curVizObj.data.treeDescendantsArr = {};
	    curVizObj.data.treeNodes.forEach(function(node, idx) {
	        var curRoot = _findNodeByName(nodesByName, node);
	        var curDescendants = _getDescendantIds(curRoot, []);
	        curVizObj.data.treeDescendantsArr[node] = curDescendants;
	    })
	    curVizObj.data.direct_descendants = _getDirectDescendants(curVizObj.data.treeStructure, {});

	    // get ancestors for each node
	    curVizObj.data.treeAncestorsArr = _getAncestorIds(curVizObj);
	    curVizObj.data.direct_ancestors = _getDirectAncestors(curVizObj.data.treeStructure, {});

	    // get siblings for each node
	    curVizObj.data.siblings = _getSiblings(curVizObj.data.treeStructure, {}); 

	    // get the height of the tree
	    curVizObj.data.tree_height = 0;
	    Object.keys(curVizObj.data.treeAncestorsArr).forEach(function(key) {
	        var ancestor_arr = curVizObj.data.treeAncestorsArr[key];
	        if (ancestor_arr.length > curVizObj.data.tree_height) {
	            curVizObj.data.tree_height = ancestor_arr.length;
	        }
	    })
	}

	/* function to find a key by its name - if the key doesn't exist, it will be created and added to the list of nodes
	* @param {Array} list - list of nodes
	* @param {String} name - name of key to find
	*/
	function _findNodeByName(list, name) {
	    var foundNode = _.findWhere(list, {id: name}),
	        curNode;

	    if (!foundNode) {
	        curNode = {'id': name, 'children': []};
	        list.push(curNode);
	        return curNode;
	    }

	    return foundNode;
	}

	/* function to get descendants id's for the specified key
	* @param {Object} root - key for which we want descendants
	* @param {Array} descendants - initially empty array for descendants to be placed into
	*/
	function _getDescendantIds(root, descendants) {
	    var child;

	    if (root.children.length > 0) {
	        for (var i = 0; i < root.children.length; i++) {
	            child = root.children[i];
	            descendants.push(child.id);
	            _getDescendantIds(child, descendants);
	        }
	    }
	    return descendants;
	}

	/* function to get the ancestor ids for all nodes
	* @param {Object} curVizObj
	*/
	function _getAncestorIds(curVizObj) {
	    var ancestors = {},
	        curDescendants,
	        descendants_arr = curVizObj.data.treeDescendantsArr,
	        treeNodes = curVizObj.data.treeNodes;

	    // set up each node as originally containing an empty list of ancestors
	    treeNodes.forEach(function(node, idx) {
	        ancestors[node] = [];
	    })

	    // get ancestors data from the descendants data
	    treeNodes.forEach(function(node, idx) {
	        // for each descendant of this node
	        curDescendants = descendants_arr[node];
	        for (var i = 0; i < curDescendants.length; i++) { 
	            // add the node to descentant's ancestor list
	            ancestors[curDescendants[i]].push(node);
	        }
	    })

	    return ancestors;
	}

	/* function to get the DIRECT descendant id for all nodes
	* @param {Object} curNode -- current node in the tree (originally the root)
	* @param {Object} dir_descendants -- originally empty array of direct descendants for each node
	*/
	function _getDirectDescendants(curNode, dir_descendants) {
	    dir_descendants[curNode.id] = [];

	    if (curNode.children.length > 0) {
	        for (var i = 0; i < curNode.children.length; i++) {
	            dir_descendants[curNode.id].push(curNode.children[i].id);
	            _getDirectDescendants(curNode.children[i], dir_descendants)
	        }
	    }

	    return dir_descendants;
	}

	/* function to get the DIRECT ancestor id for all nodes
	* @param {Object} curNode -- current node in the tree (originally the root)
	* @param {Object} dir_ancestors -- originally empty array of direct descendants for each node
	*/
	function _getDirectAncestors(curNode, dir_ancestors) {

	    if (curNode.children.length > 0) {
	        for (var i = 0; i < curNode.children.length; i++) {
	            dir_ancestors[curNode.children[i].id] = curNode.id;
	            _getDirectAncestors(curNode.children[i], dir_ancestors)
	        }
	    }

	    return dir_ancestors;
	}

	/* function to get the sibling ID's for each node
	* @param {Object} curNode -- current node in the tree (originally the root)
	* @param {Object} sibs -- originally empty array of siblings for each node
	*/
	function _getSiblings(curNode, sibs) {
	    var cur_sibs = [];

	    // get current siblings
	    if (curNode.children.length > 0) {
	        for (var i = 0; i < curNode.children.length; i++) {
	            cur_sibs.push(curNode.children[i].id);
	            _getSiblings(curNode.children[i], sibs)
	        }
	    }
	    
	    // note siblings for each sibling
	    for (var i = 0; i < cur_sibs.length; i++) {
	        for (var j = 0; j < cur_sibs.length; j++) {
	            if (cur_sibs[j] != cur_sibs[i]) {
	                sibs[cur_sibs[i]] = sibs[cur_sibs[i]] || [];
	                sibs[cur_sibs[i]].push(cur_sibs[j]);
	            }
	        }
	    }

	    return sibs;
	}

	/* function to find the ancestors of the specified genotype that emerge at a particular time point
	* @param {Object} layout -- for each time point, the interval boundaries for each genotype at that time point
	* @param {Object} treeAncestorsArr -- for each genotype (properties), an array of their ancestors (values)
	* @param {String} gtype -- the genotype of interest
	* @param {String} tp -- the time point of interest
	*/
	function _findEmergentAncestors(layout, treeAncestorsArr, gtype, tp) {
	    var ancestors = [],
	        pot_ancestor; // potential ancestor

	    // for each ancestral genotype, 
	    for (var i = 0; i < treeAncestorsArr[gtype].length; i++) {
	        pot_ancestor = treeAncestorsArr[gtype][i];

	        // if this ancestor emerged here as well, increase the # ancestors for this genotype
	        if (layout[tp][pot_ancestor] && layout[tp][pot_ancestor].state == "emerges") {
	            ancestors.push(pot_ancestor);
	        }
	    }

	    return ancestors;
	}

	/* elbow function to draw phylogeny links 
	*/
	function _elbow(d) {
	    return "M" + d.source.x + "," + d.source.y + 
	    	"H" + (d.source.x + (d.target.x-d.source.x)/2) + 
	    	"V" + d.target.y + "H" + d.target.x;
	}

	/*
	* function to, using the tree hierarchy, get the linear segments' starting key and length (including starting key)
	* @param {Object} curNode -- current key in the tree
	* @param {Object} chains -- originally empty object of the segments 
	*                           (key is segment start key, value is array of descendants in this chain)
	* @param {Object} base -- the base key of this chain (originally "")
	*/
	function _getLinearTreeSegments(curVizObj, curNode, chains, base) {

	    // if it's a new base, create the base, with no descendants in its array yet
	    if (base === "") {
	        base = curNode.id;
	        chains[base] = [];
	        curVizObj.data.treeChainRoots.push(curNode.id);
	    }
	    // if it's a linear descendant, append the current key to the chain
	    else {
	        chains[base].push(curNode.id);
	    }

	    // if the current key has 1 child to search through
	    if (curNode.children.length == 1) { 
	        _getLinearTreeSegments(curVizObj, curNode.children[0], chains, base);
	    }

	    // otherwise for each child, create a blank base (will become that child)
	    else {
	        for (var i = 0; i < curNode.children.length; i++) {
	            _getLinearTreeSegments(curVizObj, curNode.children[i], chains, "");
	        }
	    }

	    return chains;
	}

	// CELLULAR PREVALENCE FUNCTIONS

	/* function to get the cellular prevalence data in a better format 
	* (properties at level 1 is time, at level 2 is gtype)
	*/
	function _getCPData(curVizObj) {
	    var x = curVizObj.userConfig;

	    // for each time point, for each genotype, get cellular prevalence
	    var cp_data_original = {};
	    $.each(x.clonal_prev, function(idx, hit) { // for each hit (genotype/timepoint combination)
	        cp_data_original[hit.timepoint] = cp_data_original[hit.timepoint] || {};
	        // only note cellular prevalences not marked as zero
	        if (parseFloat(hit.clonal_prev) !== 0) {
	            cp_data_original[hit.timepoint][hit.clone_id] = parseFloat(hit.clonal_prev); 
	        }
	    });

	    // create timepoint zero with 100% cellular prevalence for the root of the tree
	    cp_data_original.T0 = {};
	    curVizObj.data.cp_data_original = cp_data_original;

	    // get normalized cp data (in cases where cp doesn't add to 1)
	    var cp_data_norm = {};
	    Object.keys(cp_data_original).forEach(function(tp_key) {
	        // get total cp for this timepoint
	        var tp_total = 0;
	        Object.keys(cp_data_original[tp_key]).forEach(function(gtype_key) {
	            tp_total += cp_data_original[tp_key][gtype_key];
	        });

	        // get proportionate cp for each genotype
	        cp_data_norm[tp_key] = {};
	        Object.keys(cp_data_original[tp_key]).forEach(function(gtype_key) {
	            cp_data_norm[tp_key][gtype_key] = cp_data_original[tp_key][gtype_key]/tp_total;
	        });
	    })

	    curVizObj.data.cp_data = cp_data_norm;
	}

	/* function to get the cellular prevalence value for each genotype at its emergence
	* @param {Object} curVizObj
	*/
	function _getEmergenceValues(curVizObj) {
	    var cp_data = curVizObj.data.cp_data,
	        emergence_values = {},
	        gtypes;

	    // for each time point
	    curVizObj.data.timepoints.forEach(function(tp) { 

	        // get genotypes
	        gtypes = Object.keys(cp_data[tp]); 

	        // add genotypes if not present already
	        $.each(gtypes, function(idx, g) {
	            if (Object.keys(emergence_values).indexOf(g) == -1) { 
	                emergence_values[g] = cp_data[tp][g];
	            }
	        })
	    });

	    return emergence_values;
	};

	/* function to get the timepoint that each genotype emerges
	* @param {Object} curVizObj
	*/
	function _getEmergenceTimepoints(curVizObj) {
	    var cp_data = curVizObj.data.cp_data,
	        emergence_tps = {},
	        gtypes;

	    // for each time point
	    curVizObj.data.timepoints.forEach(function(tp) { 

	        // get genotypes
	        gtypes = Object.keys(cp_data[tp]); 

	        // add genotypes if not present already
	        $.each(gtypes, function(idx, g) {
	            if (Object.keys(emergence_tps).indexOf(g) == -1) { 
	                emergence_tps[g] = tp;
	            }
	        })
	    });

	    return emergence_tps;
	};

	/* function to get the genotype-centric cellular prevalence data from the time-centric cellular prevalence data
	* @param {Object} curVizObj
	*/
	function _getGenotypeCPData(curVizObj) {
	    var cp_data = curVizObj.data.cp_data,
	        genotype_cp = {};

	    Object.keys(cp_data).forEach(function(tp, tp_idx) {
	        Object.keys(cp_data[tp]).forEach(function(gtype, gtype_idx) {
	            genotype_cp[gtype] = genotype_cp[gtype] || {};
	            genotype_cp[gtype][tp] = cp_data[tp][gtype];
	        });
	    }); 

	    curVizObj.data.genotype_cp = genotype_cp;
	}

	// LAYOUT FUNCTIONS

	/* function to get the layout of the timescape, different depending on whether user wants centred,
	* stacked or spaced view
	* @param {Object} curVizObj
	*/
	function _getLayout(curVizObj) {
	    var gtypePos = curVizObj.userConfig.genotype_position;


	    // traverse the tree to sort the genotypes into a final vertical stacking order (incorporating hierarchy)
	    curVizObj.data.layoutOrder = _getLayoutOrder(curVizObj.generalConfig, 
	                                                        curVizObj.data.treeStructure, 
	                                                        curVizObj.data.emergence_values,
	                                                        curVizObj.data.emergence_tps, 
	                                                        curVizObj.data.timepoints,
	                                                        [],
	                                                        curVizObj.userConfig.sort_gtypes);

	    // ------> CENTRED 
	    if (gtypePos == "centre") {

	        // get layout of each genotype at each timepoint
	        curVizObj.data.layout = {};
	        $.each(curVizObj.data.timepoints, function(tp_idx, tp) { 
	            _getCentredLayout(curVizObj, curVizObj.data.treeStructure, tp, curVizObj.data.layout, 0);
	        })
	    }

	    // ------> STACKED and SPACED
	    else {

	        // get layout of each genotype at each timepoint
	        if (gtypePos == "stack") {
	            curVizObj.data.layout = _getStackedLayout(curVizObj);
	        }
	        else if (gtypePos == "space") {
	            curVizObj.data.layout = _getSpacedLayout(curVizObj); 
	        }
	    }   

	    // SHIFT EMERGENCE X-COORDINATES

	    // in the layout, shift x-values if >1 genotype emerges at the 
	    // same time point from the same clade in the tree
	    _shiftEmergence(curVizObj)
	}

	/*
	* function to, using the order of genotype emergence (value & tp) and the tree hierarchy, get the vertical
	* stacking order of the genotypes
	* -- ensures that the *later* children emerge, the *closer* they are to the top of the parent sweep
	* @param {Object} dim -- general configurations of the visualization
	* @param {Object} timescape_data -- timescape data
	* @param {Array} emergence_values -- values of genotype emergence
	* @param {Array} emergence_tps -- timepoints of genotype emergence
	* @param {Array} timepoints -- timepoints in dataset
	* @param {Array} layoutOrder -- originally empty array of the final vertical stacking order
	* @param {Boolean} sort_by_emerg -- whether or not to vertically sort children by emergence values
	*/
	function _getLayoutOrder(dim, curNode, emergence_values, emergence_tps, timepoints, layoutOrder, sort_by_emerg) {
	    var child_emerg_vals = [], // emergence values of children
	        sorted_children, // children sorted by their emergence values
	        child_obj; // current child node

	    // add the current key id to the final vertical stacking order
	    if (curNode.id != dim.phantomRoot) {
	        layoutOrder.push(curNode.id);
	    }

	    // if the current key has children to search through
	    if (curNode.children && curNode.children.length > 0) {

	        // get emergence value & timepoint of children
	        for (i=0; i<curNode.children.length; i++) {
	            var emerg_val = emergence_values[curNode.children[i].id],
	                emerge_tp = timepoints.indexOf(emergence_tps[curNode.children[i].id]);

	            child_emerg_vals.push(
	                {
	                    "id": curNode.children[i].id,
	                    "emerg_val": emerg_val,
	                    "tp": timepoints.length - emerge_tp 
	                });
	            // vertically sort children by their emergence values
	            if (sort_by_emerg) {
	                sorted_children = _sortByKey(child_emerg_vals, "tp", "emerg_val");
	            }
	            // do not vertically sort by emergence values
	            else {
	                sorted_children = _sortByKey(child_emerg_vals, "tp");
	            }
	        }

	        // in the *reverse* order of emergence values, search children
	        sorted_children.map(function(child) {
	            child_obj = _.findWhere(curNode.children, {id: child.id});
	            _getLayoutOrder(dim, child_obj, emergence_values, emergence_tps, timepoints, layoutOrder, sort_by_emerg);
	        })
	    }

	    return layoutOrder;
	}

	/*
	* function to get the layout of the timescape
	* -- ensures that the *later* children emerge, the *closer* they are to the top of the parent sweep
	* @param {Object} curVizObj
	* @param {Object} curNode -- current key in the tree
	* @param {Number} yBottom -- where is the bottom of this genotype, in the y-dimension
	*/
	function _getCentredLayout(curVizObj, curNode, tp, layout, yBottom) {
	    var gtype = curNode.id,
	        cp_data = curVizObj.data.cp_data,
	        timepoints = curVizObj.data.timepoints,
	        next_tp = timepoints[timepoints.indexOf(tp)+1],
	        prev_tp = timepoints[timepoints.indexOf(tp)-1],
	        gTypes_curTP = Object.keys(cp_data[tp]), // genotypes with cp data at the CURRENT time point
	        // genotypes with cp data at the PREVIOUS time point
	        gTypes_prevTP = (cp_data[prev_tp]) ? Object.keys(cp_data[prev_tp]) : undefined, 
	        curDescendants = curVizObj.data.treeDescendantsArr[gtype],
	        gTypeAndDescendants = ($.extend([], curDescendants)),
	        nChildren = curNode.children.length,
	        childCP = 0, // cumulative amount of cellular prevalence in the children;
	        childYBottom, // bottom y-value for the next child
	        layoutOrder = curVizObj.data.layoutOrder,
	        sorted_children, // children sorted by the layout order
	        cur_cp = cp_data[tp][gtype],
	        prev_cp = (cp_data[prev_tp]) ? cp_data[prev_tp][gtype] : undefined, // CP for this genotype, prev tp
	        threshold = curVizObj.generalConfig.threshold, // cellular prevalence threshold for visibility of a genotype
	        // the width of this genotype, including descendants
	        width = _calculateWidth(curVizObj, tp, gtype, threshold).width, 
	        emerged, // whether or not the genotype emerged at this time point
	        disappears = (prev_cp && !cur_cp); // whether this genotype disappears at the current time point
	    
	    gTypeAndDescendants.push(gtype);
	    
	    emerged = _getIntersection(gTypeAndDescendants, gTypes_curTP).length > 0 && 
	        gTypes_prevTP && 
	        _getIntersection(gTypeAndDescendants, gTypes_prevTP).length === 0; 

	    // layout for this timepoint
	    layout[tp] = layout[tp] || {};

	    // if the genotype or any descendants exist at this timepoint, or if the genotype disappears at this time point
	    if (cur_cp || (_getIntersection(curDescendants, gTypes_curTP).length > 0) || disappears) {

	        // if this genotype emerged at the previous time point
	        if (emerged && gtype != curVizObj.generalConfig.phantomRoot) {

	            layout[prev_tp][gtype] = {
	                "width": 0,
	                "middle": yBottom + (width/2),
	                "bottom": yBottom + (width/2),
	                "top": yBottom + (width/2),
	                "cp": 0,
	                "state": "emerges"
	            };
	        }

	        // set this genotype in the layout 
	        layout[tp][gtype] = {
	            "width": width,
	            "middle": yBottom + (width/2),
	            "bottom": yBottom,
	            "top": yBottom + width,
	            "cp": cur_cp,
	            "state": "present",
	            "presentChildren": _getIntersection(curVizObj.data.direct_descendants[gtype], gTypes_curTP).length
	        }

	        // mark disappearance state
	        if (disappears) {
	            layout[tp][gtype].state = "disappears_stretched";
	        }
	    }

	    // if there are children
	    if (nChildren > 0) {

	        // sort the children by the layout order
	        sorted_children = $.extend([], curNode.children);
	        sorted_children.sort(_sortByLayoutOrder(layoutOrder));

	        // for each child
	        for (var i = 0; i < nChildren; i++) {

	            // get the y-coordinate for the bottom of the child's interval
	            childYBottom = (cur_cp) ? // if the child's direct ancestor has cellular prevalence at this time
	                (((i+1)/(nChildren+1)) * cur_cp) + childCP + yBottom : 
	                childCP + yBottom;

	            // get the child's layout
	            _getCentredLayout(curVizObj, sorted_children[i], tp, layout, childYBottom);

	            // increase the cellular prevalence of the current genotype's children (+descendants) accounted for
	            childCP += _calculateWidth(curVizObj, tp, sorted_children[i].id, threshold).width;
	        }
	    }
	};

	/* function to get cellular prevalences for each genotype in a stack, one stack for each time point
	* @param {Object} curVizObj
	*/
	function _getStackedLayout(curVizObj) {
	    var layout = {},
	        cp_data = curVizObj.data.cp_data,
	        timepoints = curVizObj.data.timepoints,
	        layoutOrder = curVizObj.data.layoutOrder,
	        curDescendants,
	        gTypeAndDescendants, // genotype and descendants
	        gTypes_curTP, // genotypes with cp data at the CURRENT time point
	        effective_cp, // effective cp for this genotype at this timepoint
	        width, // width to add for this genotype at this timepoint (includes descendants widths)
	        midpoint, // midpoint for emergence
	        threshold = curVizObj.generalConfig.threshold; // cellular prevalence threshold for visibility of a genotype

	    // for each timepoint (in order)...
	    $.each(timepoints, function(tp_idx, tp) { 

	        // stack for this time point (may already be created if disappearance occurs at this time point)
	        layout[tp] = layout[tp] || {}; 

	        var cp = cp_data[tp], // cellular prevalence data for this time point
	            sHeight = 0, // current height of the stack
	            prev_tp = timepoints[tp_idx-1],
	            next_tp = timepoints[tp_idx+1];

	        // ... for each genotype ...
	        $.each(layoutOrder, function(gtype_idx, gtype) { 
	            gTypes_curTP = Object.keys(cp_data[tp]); 
	            gTypes_prevTP = (cp_data[prev_tp]) ? Object.keys(cp_data[prev_tp]) : undefined; 
	            curDescendants = curVizObj.data.treeDescendantsArr[gtype];
	            gTypeAndDescendants = ($.extend([], curDescendants)); 
	            gTypeAndDescendants.push(gtype); 
	            
	            // calculate effective cellular prevalence 
	            // "effective" because: 
	            //                  - it is increased if it's below the threshold
	            //                  - it is reduced if siblings are below threshold and therefore increased
	            effective_cp = _calculateWidth(curVizObj, tp, gtype, threshold).effective_cp;
	            width = _calculateWidth(curVizObj, tp, gtype, threshold).width;


	            // DISAPPEARING LINEAGE
	            // if this genotype existed at the prev time point, 
	            // but neither it nor its descendants are currently present
	            if (cp_data[prev_tp] && cp_data[prev_tp][gtype] && !cp_data[tp][gtype] && 
	                _getIntersection(gTypeAndDescendants, gTypes_curTP).length === 0) {
	                _createStackElement(curVizObj, layout, tp, gtype, sHeight, sHeight, effective_cp, "disappears_stretched");
	            }

	            // NON-DISAPPEARING LINEAGE
	            else {

	            	// if this genotype has already been REPLACED by any descendant at a PREVIOUS time point
	                if (cp_data[prev_tp] && !cp_data[tp][gtype] && !cp_data[prev_tp][gtype] && (_getIntersection(curDescendants, gTypes_curTP).length > 0)) {

	                    _createStackElement(curVizObj, layout, tp, gtype, sHeight, sHeight + width, effective_cp, "already_replaced");
	                    midpoint = (layout[tp][gtype].bottom + layout[tp][gtype].top)/2;

	                }

	                // if this genotype is REPLACED by any descendant at this time point
	                else if (!cp_data[tp][gtype] && (_getIntersection(curDescendants, gTypes_curTP).length > 0)) {

	                    _createStackElement(curVizObj, layout, tp, gtype, sHeight, sHeight + width, effective_cp, "replaced");
	                    midpoint = (layout[tp][gtype].bottom + layout[tp][gtype].top)/2;

	                }

	                // if this genotype or any descendants EXIST at this time point
	                else if (_getIntersection(gTypeAndDescendants, gTypes_curTP).length > 0) {
	                    var n_desc_present = _getIntersection(curDescendants, gTypes_curTP).length;

	                    // create it as present
	                    _createStackElement(curVizObj, layout, tp, gtype, sHeight, sHeight + width, effective_cp, "present");
	                    midpoint = (layout[tp][gtype].bottom + layout[tp][gtype].top)/2;

	                    // update stack height
	                    sHeight += effective_cp;
	                }


	                // if it EMERGED at the previous time point
	                if (cp_data[prev_tp] &&
	                    (_getIntersection(gTypeAndDescendants, gTypes_prevTP).length === 0) &&
	                    (gTypes_curTP && _getIntersection(gTypeAndDescendants, gTypes_curTP).length > 0)) {

	                    // update its emergence y-value
	                    _createStackElement(curVizObj, layout, prev_tp, gtype, midpoint, midpoint, effective_cp, "emerges");
	                }
	            }
	        })
	    })

	    return layout;
	}

	/* function to get cellular prevalences for each genotype in a *spaced* stack, one stack for each time point
	* @param {Object} curVizObj
	*/
	function _getSpacedLayout(curVizObj) {
	    var layout = {},
	        cp_data = curVizObj.data.cp_data,
	        timepoints = curVizObj.data.timepoints,
	        layoutOrder = curVizObj.data.layoutOrder,
	        curDescendants,
	        gTypeAndDescendants, // genotype and descendants
	        curAncestors, // all ancestors of current genotype
	        gTypes_curTP, // genotypes with cp data at the CURRENT time point
	        gTypes_nextTP, // genotypes with cp data at the NEXT time point
	        width, // the cp as the width to add for this genotype at this timepoint
	        midpoint, // midpoint for emergence
	        ancestor_midpoint, // ancestor's midpoint for emergence
	        direct_ancestors = curVizObj.data.direct_ancestors, // direct ancestor for each genotype
	        direct_descendants = curVizObj.data.direct_descendants, // direct descendant for each genotype
	        space = 8/curVizObj.generalConfig.tsSVGHeight; // space between genotypes (in pixels) 

	    // GET STACKED LAYOUT

	    layout = _getStackedLayout(curVizObj);

	    // SPACE THE STACKED LAYOUT

	    // for each timepoint (in order)...
	    $.each(timepoints, function(tp_idx, tp) { 

	        var seenGTypes = [];
	        prev_tp = timepoints[tp_idx-1];

	        // ... for each genotype ...
	        $.each(layoutOrder, function(gtype_idx, gtype) {

	            // if the genotype hasn't already been spaced, and nor is it the root
	            if (seenGTypes.indexOf(gtype) == -1) {

	                gTypes_curTP = Object.keys(cp_data[tp]);
	                var cur_ancestor = direct_ancestors[gtype],
	                    cur_ancestor_cp = cp_data[tp][cur_ancestor] || 0,
	                    cur_siblings = direct_descendants[cur_ancestor],
	                    present_siblings = _getIntersection(direct_descendants[cur_ancestor], gTypes_curTP),
	                    cur_space = ((present_siblings.length+1) * space < cur_ancestor_cp) ? 
	                        space : 
	                        cur_ancestor_cp/(present_siblings.length+1);

	                // sort children by reverse layout order (top to bottom (in terms of y-value))
	                var sorted_present_sibs = present_siblings.sort(_sortByLayoutOrder(layoutOrder)).reverse();
	                var sorted_cur_sibs = cur_siblings.sort(_sortByLayoutOrder(layoutOrder)).reverse();

	                if (sorted_present_sibs.length > 0) {

	                    // set the stack height (from the top)
	                    // if there's an ancestor 
	                    if (layout[tp][cur_ancestor]) {
	                        sHeight = (layout[tp][cur_ancestor].top == layout[tp][cur_ancestor].bottom) ?
	                            // if the ancestor has been replaced, set stack top as the first sibling's top value
	                            layout[tp][sorted_siblings[0]].top : 
	                            // otherwise, set the top as the ancestor's top value
	                            layout[tp][cur_ancestor].top; 
	                    }
	                    // no ancestor
	                    else {
	                        sHeight = 1;
	                    }

	                    // for each sibling
	                    for (var i = 0; i < sorted_cur_sibs.length; i++) {

	                        // current sibling
	                        var sib = sorted_cur_sibs[i]; 

	                        // width of sibling
	                        var cur_width = (layout[tp][sib]) ? 
	                            // if the sibling (or its descendants) exist at this time point
	                            layout[tp][sib].top - layout[tp][sib].bottom :
	                            // sibling doesn't exist at this tp, nor does any of its descendants
	                            0; 

	                        // if sibling exists, alter its layout at this timepoint
	                        if (layout[tp][sib]) {
	                            layout[tp][sib].top = sHeight - cur_space;
	                            layout[tp][sib].bottom = sHeight - cur_width - cur_space;
	                        }

	                        // if this sibling emerges at the previous time point, update its emergence y-coordinate
	                        if (cp_data[prev_tp] && layout[prev_tp][sib] && layout[prev_tp][sib].state == "emerges") {
	                            midpoint = (layout[tp][sib].top + layout[tp][sib].bottom)/2;
	                            layout[prev_tp][sib].top = midpoint;
	                            layout[prev_tp][sib].bottom = midpoint;
	                        }

	                        // add the current sibling's width to the stack height
	                        sHeight -= (cur_width + cur_space);
	                        seenGTypes.push(sib);

	                        // note the amount of space subtracted from ancestor's cellular prevalence
	                        if (i == (sorted_present_sibs.length-1) && layout[tp][cur_ancestor]) {
	                            layout[tp][cur_ancestor].space = (i+1)*cur_space;
	                        }
	                    }
	                }
	            }
	        })
	    })

	    return layout;
	}

	/* function to create a stack element (a genotype interval at a particular time point)
	* @param {Object} curVizObj
	* @param {Object} layout -- layout of each genotype at each time point
	* @param {String} tp -- time point of interest
	* @param {String} gtype -- genotype of interest
	* @param {Number} bottom_val -- value for the bottom of the interval
	* @param {Number} top_val -- value for the top of the interval
	* @param {Number} effective_cp -- the cellular prevalence value for visual plotting 
	*                                 (increased if small, decreased if others are small)
	* @param {String} state -- state of the genotype at this time point (e.g. "emerges", "present", "disappears")
	*/
	function _createStackElement(curVizObj, layout, tp, gtype, bottom_val, top_val, effective_cp, state) {
	    // create the time point in the stack if it doesn't already exist
	    layout[tp] = layout[tp] || {}; 

	    // create the genotype in the stack
	    layout[tp][gtype] = {
	        "bottom": bottom_val,
	        "top": top_val,
	        "state": state,
	        "cp": curVizObj.data.cp_data[tp][gtype],
	        "effective_cp": effective_cp
	    };
	}

	/* function to calculate effective cellular prevalence and width of each genotype in the timescape
	*
	* note: - effective cellular prevalence -- will correspond to the interval width in the stacked layout
	*       - "effective" because: 
	*                         - it is increased if it's below the threshold
	*                         - it is reduced if siblings are below threshold and therefore increased
	*       - width -- the effective cellular prevalence PLUS the effective cellular prevalence for its descendants
	*
	* @param {Object} curVizObj
	* @param {String} tp -- time point of interest
	* @param {String} gtype -- genotype of interest
	* @param {Number} threshold -- threshold cellular prevalence for visual detection
	*/
	function _calculateWidth(curVizObj, tp, gtype, threshold) {
	    var width, // width of this genotype (including all descendants)
	        effective_cp, // effective cellular prevalence for this genotype
	        cp = curVizObj.data.cp_data[tp], // cellular prevalence for this time point
	        gTypes_curTP = Object.keys(cp), // genotypes existing at the current time point
	        cur_direct_descendants = curVizObj.data.direct_descendants[gtype], // current direct descendants of genotype
	        sum_increment = 0, // sum of increment to low prevalence genotypes for this time point
	        n_gtypes_high_cp = 0; // number of genotypes above threshold cp

	    // find out how many genotypes are below threshold at this time point
	    for (var i = 0; i < gTypes_curTP.length; i++) {
	        if (cp[gTypes_curTP[i]] < threshold) {
	            sum_increment += (threshold - cp[gTypes_curTP[i]]);
	        }
	        else {
	            n_gtypes_high_cp++;
	        }                
	    }

	    // --> GENOTYPE DOESN'T EXIST at this time point
	    if (!cp[gtype]) {
	        // effective cellular prevalence is 0
	        effective_cp = 0;
	    }


	    // --> LOW PREVALENCE -- if this genotype exists at low prevalence
	    else if (cp[gtype] < threshold) {
	        // effective cellular prevalence is the threshold value
	        effective_cp = threshold;
	    }

	    // --> NORMAL PREVALENCE
	    else {
	        // for each present sibling with CP below threshold, subtract the sibling's width (including descendants) 
	        // from the current genotype, because the sibling's sweep interval will be increased
	        effective_cp = cp[gtype];
	        // subtract the total increment for low prev CPs, divided by the number of high CP genotypes
	        effective_cp -= (sum_increment) / (n_gtypes_high_cp); 
	    }
	    
	    // for each direct descendant, add its cellular prevalence 
	    width = effective_cp;
	    $.each(cur_direct_descendants, function(desc_idx, desc) {
	        width += _calculateWidth(curVizObj, tp, desc, threshold).width;
	    })
	    return {"width": width, "effective_cp": effective_cp};

	}

	/* function to sort genotypes by layout order (bottom to top)
	* @param {Array} layoutOrder -- vertical order of genotypes for layout purposes
	*/
	function _sortByLayoutOrder(layoutOrder) {
	    return function _sortingFunc(a, b) {
	        var sortingArr = layoutOrder;
	        if (typeof a === 'object') {
	            if (sortingArr.indexOf(a.id) > sortingArr.indexOf(b.id)) {
	                return 1;
	            }
	            return -1;
	        }
	        else {
	            if (sortingArr.indexOf(a) > sortingArr.indexOf(b)) {
	                return 1;
	            }
	            return -1;
	        }
	    }
	}


	/* function to shift the emergence in the x-direction if multiple genotypes from the same lineage emerge 
	* at the same timepoint
	* @param {Object} curVizObj
	*/
	function _shiftEmergence(curVizObj) {
	    var dim = curVizObj.generalConfig,
	        layout = curVizObj.data.layout,
	        layoutOrder = curVizObj.data.layoutOrder,
	        timepoints = curVizObj.data.timepoints,
	        treeAncestorsArr = curVizObj.data.treeAncestorsArr,
	        treeDescendantsArr = curVizObj.data.treeDescendantsArr,
	        nPartitions,
	        layoutOrder_rev,
	        ancestors,
	        ancestors_of_ancestor,
	        curNPartitions,
	        genotypes_xshifted;

	    $.each(timepoints, function(tp_idx, tp) { 

	        // --> get the number of partitions for this time point <-- //

	        // for each genotype (backwards in stacking order -- descendant before ancestral)
	        nPartitions = -1;
	        layoutOrder_rev = ($.extend([], layoutOrder)).reverse();
	        $.each(layoutOrder_rev, function(gtype_idx, gtype) {

	            // if the genotype is emerging at this time point
	            if (layout[tp][gtype] && (layout[tp][gtype].state == "emerges")) {
	                
	                // get the ancestors that also emerge at this time point
	                ancestors = _findEmergentAncestors(layout, treeAncestorsArr, gtype, tp);
	                curNPartitions = ancestors.length+2;

	                // if this is the largest number of ancestors so far, update the number of partitions
	                if (curNPartitions > nPartitions) {
	                    nPartitions = curNPartitions;
	                }

	            }

	        })

	        // --> x-shift genotypes <-- //

	        // keep track of which genotypes have been x-shifted
	        genotypes_xshifted = [];

	        // for each genotype (backwards in stacking order -- descendant before ancestral)
	        $.each(layoutOrder_rev, function(gtype_idx, gtype) {

	            // set the number of partitions
	            if (layout[tp][gtype]) {
	                layout[tp][gtype].nPartitions = nPartitions;
	            }
	            
	            // if this genotype has not already been x-shifted and is REPLACED at this time point
	            if ((genotypes_xshifted.indexOf(gtype) == -1) && layout[tp][gtype] && 
	                (["replaced", "disappears_stretched"].indexOf(layout[tp][gtype].state) != -1)) {
	            	layout[tp][gtype].xShift = -0.5;
	            }

	            // if this genotype has not already been x-shifted and emerges at this time point
	            if ((genotypes_xshifted.indexOf(gtype) == -1) && layout[tp][gtype] && 
	                (layout[tp][gtype].state == "emerges")) {

	                // get the ancestors that also emerge at this time point
	                ancestors = _findEmergentAncestors(layout, treeAncestorsArr, gtype, tp);

	                // x-shift and x-partition for the current genotype (depends on how many of its ancestors emerge)
	                layout[tp][gtype].xShift = (ancestors.length+1) / nPartitions;
	                
	                genotypes_xshifted.push(gtype);

	                // for each ancestor that also emerged at this time point
	                for (var i = 0; i < ancestors.length; i++) {

	                    // find the ancestor's ancestors that also emerge at this time point
	                    ancestors_of_ancestor = _findEmergentAncestors(layout, treeAncestorsArr, ancestors[i], tp);
	                    
	                    // x-shift and x-partition for the current ancestor (depends on how many of its ancestors emerge)
	                    layout[tp][ancestors[i]].xShift = (ancestors_of_ancestor.length+1) / nPartitions;

	                    genotypes_xshifted.push(ancestors[i]);
	                }
	            }
	        })
	    })
	}

	// LABELS FUNCTIONS

	/* function to get cellular prevalence labels for each genotype at each time point, for traditional timescape view
	* @param {Object} curVizObj
	*/
	function _getTraditionalCPLabels(curVizObj) {
	    var dim = curVizObj.generalConfig,
	        layout = curVizObj.data.layout,
	        labels = [], // array of labels
	        data, // data for a genotype at a time point
	        label, // current label to add
	        curDescendants,
	        cp_data_original = curVizObj.data.cp_data_original,
	        gTypes_curTP; 

	    // for each time point
	    Object.keys(layout).forEach(function(tp, tp_idx) {
	        if (tp != "T0") {

	            // for each genotype
	            Object.keys(layout[tp]).forEach(function(gtype, gtype_idx) {
	                curDescendants = curVizObj.data.treeDescendantsArr[gtype];
	                gTypes_curTP = Object.keys(curVizObj.data.cp_data[tp]); 

	                // data for this genotype at this time point
	                data = layout[tp][gtype];

	                // if the genotype exists at this time point (isn't emerging or disappearing / replaced)
	                if ((data.state == "present")) {

	                    var nDesc = _getIntersection(curDescendants, gTypes_curTP).length;

	                    // add its information 
	                    label = {};

	                    // CENTRED view
	                    if (curVizObj.userConfig.genotype_position == "centre") { 
	                        label.tp = tp;
	                        label.gtype = gtype;
	                        label.cp = cp_data_original[tp][gtype];
	                        label.middle = data.top - (data.cp/(2*(data.presentChildren+1)));
	                        label.type = "traditional";
	                    }
	                    // STACKED view
	                    else if (curVizObj.userConfig.genotype_position == "stack") { 
	                        label.tp = tp;
	                        label.gtype = gtype;
	                        label.cp = cp_data_original[tp][gtype];
	                        label.middle = (2*data.bottom + data.effective_cp)/2; 
	                        label.type = "traditional";
	                    }
	                    // SPACED view
	                    else if (curVizObj.userConfig.genotype_position == "space") { 
	                        label.tp = tp;
	                        label.gtype = gtype;
	                        label.cp = cp_data_original[tp][gtype];
	                        // if this genotype was split for spacing, how much CP has been taken up by the upper splits
	                        label.middle = (data.space) ? 
	                            (2*data.bottom + data.effective_cp - data.space)/2 : 
	                            (2*data.bottom + data.effective_cp)/2;
	                        label.type = "traditional";
	                    }
	                    
	                    labels.push(label);

	                }   
	                
	            })
	        }
	    });

	    return labels;
	}

	/* function to get cellular prevalence lables for each genotype at each time point, for tracks timescape view
	* @param {Object} curVizObj
	*/
	function _getSeparateCPLabels(curVizObj) {
	    var tracks_paths = curVizObj.data.tracks_paths,
	        cp_data_original = curVizObj.data.cp_data_original,
	        labels = [],
	        label,
	        gtype,
	        midpoint,
	        path,
	        tp; // time point

	    // for each genotype
	    for (var i = 0; i < tracks_paths.length; i++) {
	        gtype = tracks_paths[i].gtype;
	        midpoint = tracks_paths[i].midpoint;
	        path = tracks_paths[i].path;

	        // for each point in the path
	        for (var j = 0; j < path.length; j++) {
	            tp = path[j].tp;

	            if (tp != "T0") {

	                // if the genotype exists at this time point (isn't emerging or disappearing / replaced)
	                if (cp_data_original[tp][gtype]) {
	                    label = {};
	                    label.tp = tp;
	                    label.cp = cp_data_original[tp][gtype];
	                    label.middle = midpoint;
	                    label.gtype = gtype;
	                    label.type = "tracks";
	                    labels.push(label);
	                }
	            }
	        }
	    }

	    return labels;
	}

	// PATH FUNCTIONS

	/* function to get paths to plot. 
	* First gets paths (scale 0 to 1) with straight edges.
	* Then gets paths (scale of the plot pixel count) with bezier edges
	*/
	function _getPaths(curVizObj) {
	    var dim = curVizObj.generalConfig;

	    // GET PROPORTIONATE, STRAIGHT EDGED PATHS

	    // convert layout at each time point into a list of moves for each genotype's d3 path object
	    curVizObj.data.tracks_paths = _getSeparatePaths(curVizObj);
	    curVizObj.data.traditional_paths = _getTraditionalPaths(curVizObj);

	    // GET BEZIER PATHS READY FOR PLOTTING

	    // convert proportionate paths into paths ready for plotting, with bezier curves
	    curVizObj.data.bezier_paths = _getBezierPaths(curVizObj.data.traditional_paths, dim.tsSVGWidth, dim.tsSVGHeight);
	    curVizObj.data.tracks_bezier_paths = _getBezierPaths(curVizObj.data.tracks_paths, dim.tsSVGWidth, dim.tsSVGHeight);

	}

	/* function to colour paths
	*/
	function _colourPaths(curVizObj) {
		var phantomRoot = curVizObj.generalConfig.phantomRoot,
			colour_assignment = curVizObj.view.colour_assignment,
			alpha_colour_assignment = curVizObj.view.alpha_colour_assignment;

		curVizObj.data.bezier_paths.forEach(function(cur_path) {
		    cur_path.fill = (cur_path.gtype == phantomRoot) ? "none" : alpha_colour_assignment[cur_path.gtype];
	        cur_path.stroke = (cur_path.gtype == phantomRoot) ? "none" : colour_assignment[cur_path.gtype];
		})
		curVizObj.data.tracks_bezier_paths.forEach(function(cur_path) {
		    cur_path.fill = (cur_path.gtype == phantomRoot) ? "none" : alpha_colour_assignment[cur_path.gtype];
	        cur_path.stroke = (cur_path.gtype == phantomRoot) ? "none" : colour_assignment[cur_path.gtype];
		})
	}

	/* function to convert genotype stacks at each time point into a list of moves for each genotype's d3 path object 
	* (traditional timescape view)
	* Note: the appearance timepoint is the time at which the genotype appears in the dataset
	*       the emergence timepoint is the time at which the genotype must have emerged (appearance timepoint - 1)
	* @param {Object} curVizObj
	*/
	function _getTraditionalPaths(curVizObj) {
	    var dim = curVizObj.generalConfig,
	        layout = curVizObj.data.layout,
	        timepoints = curVizObj.data.timepoints,
	        timepoints_rev = ($.extend([], timepoints)).reverse(),
	        mid_tp = (1/((timepoints.length-1)*2)), // half of x-distance between time points
	        layoutOrder = curVizObj.data.layoutOrder,
	        paths = [],
	        cur_path,
	        emerges, // whether or not a genotype emerges at a time point
	        xShift_in_layout, // the amount of shift in the x-direction for a genotype (when it's emerging), 
	                          // as is present in the layout data
	        xShift, // the amount of shift in the x-direction for a genotype (when it's emerging), 
	                // taking into account events that occur
	        nPartitions, // number of partitions between two time points 
	        next_tp, 
	        xBottom, // x-value at the bottom of the genotype sweep at a time point
	        xTop, // x-value at the top of the genotype sweep at a time point
	        y_mid, // y proportion as halfway between this and the next time point
	        appear_xBottom,
	        appear_xTop,
	        event_occurs, // whether or not an event occurs after a time point
	        event_index, // index of the current event 
	        perturbations = curVizObj.userConfig.perturbations, // user specified perturbations in the time-series data
	        frac; // fraction of total tumour content remaining at the perturbation event;

	    $.each(layoutOrder, function(gtype_idx, gtype) {
	        
	        // path for the current genotype
	        cur_path = {"gtype": gtype, "path":[]};
	        
	        // for each time point (in sequence)...
	        $.each(timepoints, function(idx, tp) {
	            
	            // whether or not an event occurs after this timepoint
	            event_occurs = (_getIntersection(_.pluck(perturbations, "prev_tp"), tp).length > 0);
	            event_index = _.pluck(perturbations, "prev_tp").indexOf(tp);

	            // if the genotype exists or emerges/disappears at this time point
	            if (layout[tp][gtype]) {
	                emerges = (layout[tp][gtype].state == "emerges");
	                nPartitions = (event_occurs) ?
	                    layout[tp][gtype].nPartitions*2 :
	                    layout[tp][gtype].nPartitions;
	                next_tp = timepoints[idx+1];
	                xShift_in_layout = (layout[tp][gtype].xShift) ? layout[tp][gtype].xShift : 0;
	                xShift = 
	                    (event_occurs) ? 
	                    0.5 + (xShift_in_layout/2) : 
	                    xShift_in_layout;

	                // get the x-coordinate for the bottom of this genotype's interval 
	                xBottom = (emerges) ? 
	                    (idx + xShift)/(timepoints.length-1) : 
	                    (idx)/(timepoints.length-1);

	                // if the current genotype is ...
	                // ... EMERGING at this time point... 
	                if (emerges) {

	                    // add a path point for the bottom of the genotype's interval at the current time point
	                    cur_path.path.push({ "x": xBottom, 
	                                            "y": layout[tp][gtype].bottom,
	                                            "tp": tp });

	                    // ... add a path point to expand the sweep such that its descendants can be contained within it
	                    appear_xBottom = (idx + xShift + (1/nPartitions))/(timepoints.length-1);
	                    cur_path.path.push({ "x": appear_xBottom, 
	                                        "y": layout[next_tp][gtype].bottom,
	                                        "tp": tp }); // y-coordinate at next time point
	                }   

	                // ... NOT EMERGING at this time point
	                else {
	                    // add a path point for the bottom of the genotype's interval at the current time point
	                    cur_path.path.push({ "x": xBottom, 
	                                            "y": layout[tp][gtype].bottom,
	                                            "tp": tp });

	                    // if event occurs after this timepoint
	                    if (event_occurs) {

	                        frac = perturbations[event_index].frac;

	                        // get y proportion as halfway between this and the next time point
	                        y_mid = (layout[next_tp][gtype].bottom + layout[tp][gtype].bottom)/2;

	                        // add a point in the middle
	                        cur_path.path.push({ "x": xBottom + mid_tp, // halfway between this and next tp
	                                                "y": (y_mid*frac) + ((1-frac)/2),
	                                                "tp": "event" });
	                    }

	                    // if there are partitions after this timepoint, add a pathpoint at the first partition
	                    if (next_tp && layout[next_tp][gtype] && layout[tp][gtype].nPartitions > 1) {
	                        var next_xBottom = (idx + xShift + (1/nPartitions))/(timepoints.length-1);
	                        cur_path.path.push({ "x": next_xBottom, 
	                                            "y": layout[next_tp][gtype].bottom,
	                                            "tp": tp });
	                    }
	                }                            
	            }
	        })

	        // for each time point (in *reverse* sequence)...
	        $.each(timepoints_rev, function(idx, tp) {

	            // whether or not an event occurs after this timepoint
	            event_occurs = (_getIntersection(_.pluck(perturbations, "prev_tp"), tp).length > 0);
	            event_index = _.pluck(perturbations, "prev_tp").indexOf(tp);

	            // if the genotype exists or emerges/disappears at this time point
	            if (layout[tp][gtype]) {
	                emerges = (layout[tp][gtype].state == "emerges");
	                nPartitions = (event_occurs) ?
	                    layout[tp][gtype].nPartitions*2 :
	                    layout[tp][gtype].nPartitions;
	                next_tp = timepoints_rev[idx-1];
	                xShift_in_layout = (layout[tp][gtype].xShift) ? layout[tp][gtype].xShift : 0;
	                xShift = 
	                    (event_occurs) ? 
	                    0.5 + (xShift_in_layout/2) : 
	                    xShift_in_layout;

	                // get the x-coordinate for the top of this genotype's interval 
	                xTop = (emerges) ? 
	                    ((timepoints.length-1) - idx + xShift)/(timepoints.length-1) : 
	                    ((timepoints.length-1) - idx)/(timepoints.length-1);

	                // if the current genotype ...
	                // ... EMERGES at the current time point...
	                if (emerges) {
	                    // add a path point to bring forward the sweep such that its descendants can be contained w/in it
	                    appear_xTop = ((timepoints.length-1) - idx + xShift + (1/nPartitions))/(timepoints.length-1);
	                    cur_path.path.push({ "x": appear_xTop, 
	                                        "y": layout[next_tp][gtype].top,
	                                        "tp": tp }); // y-coordinate at next time point

	                    // add a path point for the top of the genotype's interval at the current time point
	                    cur_path.path.push({ "x": xTop, 
	                                            "y": layout[tp][gtype].top,
	                                            "tp": tp });
	                }

	                // ... DOESN'T EMERGE at the current time point
	                else {


	                    // if there are partitions after this timepoint, add a pathpoint at the first partition
	                    if (next_tp && layout[next_tp][gtype] && layout[tp][gtype].nPartitions > 1) {
	                        var next_xTop = ((timepoints.length-1) - idx + xShift + (1/nPartitions))/(timepoints.length-1);
	                        cur_path.path.push({ "x": next_xTop, 
	                                            "y": layout[next_tp][gtype].top,
	                                            "tp": tp });
	                    }

	                    // if event occurs after this timepoint
	                    if (event_occurs) {

	                        frac = perturbations[event_index].frac;

	                        // get y proportion as halfway between this and the next time point
	                        y_mid = (layout[next_tp][gtype].top + layout[tp][gtype].top)/2;

	                        // add a point in the middle
	                        cur_path.path.push({ "x": xTop + mid_tp, // halfway between this and next tp
	                                                "y": (y_mid*frac) + ((1-frac)/2), 
	                                                "tp": "event" });
	                    }

	                    // add a path point for the top of the genotype's interval at the current time point
	                    cur_path.path.push({ "x": xTop, 
	                                            "y": layout[tp][gtype].top,
	                                            "tp": tp });
	                }   
	            }
	        })
	        
	        // add the path for this genotype to the list of all paths to plot
	        paths.push(cur_path);
	    })

	    return paths;
	}

	/* function to convert genotype stacks at each time point into a list of moves for each genotype's d3 path object 
	* (tracks timescape view)
	* Note: the appearance timepoint is the time at which the genotype appears in the dataset
	*       the emergence timepoint is the time at which the genotype must have emerged (appearance timepoint - 1)
	* @param {Object} curVizObj
	*/
	function _getSeparatePaths(curVizObj) {
	    var dim = curVizObj.generalConfig,
	        timepoints = curVizObj.data.timepoints,
	        timepoints_rev = ($.extend([], timepoints)).reverse(),
	        layoutOrder = curVizObj.data.layoutOrder,
	        genotype_cp = curVizObj.data.genotype_cp,
	        layout = curVizObj.data.layout,
	        padding = 0.03,
	        ts_sep_labels = curVizObj.data.ts_sep_labels,
	        paths = [],
	        sHeight = 0,
	        seenGTypes = [],
	        largest_cps = {},
	        scaled_midpoint,
	        entry_exit_options,
	        entry_exit,
	        xShift,
	        x,
	        y,
	        cur_path,
	        full_padding,
	        denominator;

	    // find the denominator (total height of the view), in terms of the sweeps (sum of largest cp for each genotype)
	    Object.keys(genotype_cp).forEach(function(gtype, gtype_idx) {
	        var cps = Object.keys(genotype_cp[gtype]).map(function (key) { return genotype_cp[gtype][key]; });
	        largest_cps[gtype] = Math.max(...cps);
	    })
	    denominator = Object.keys(largest_cps).map(function (key) { return largest_cps[key]; }).reduce(function(a, b) {
	        return a + b;
	    }); 
	    full_padding = padding * (Object.keys(largest_cps).length+1); // padding between each genotype (+ above & below)
	    denominator += full_padding;

	    // for each genotype, get its path through the time points
	    $.each(layoutOrder, function(gtype_idx, gtype) {

	        if (Object.keys(largest_cps).indexOf(gtype) != -1) {

	            // scaled midpoint for this genotype's timescape band
	            scaled_midpoint = (largest_cps[gtype] / denominator)/2 + sHeight;
	            scaled_midpoint += ((seenGTypes.length)/(Object.keys(largest_cps).length+1)) * full_padding/denominator;

	            // path for the current genotype
	            cur_path = {"gtype": gtype, "midpoint": scaled_midpoint, "path":[]};
	            
	            // BOTTOM COORDINATE for each time point 
	            $.each(timepoints, function(tp_idx, tp) {

	                // xShift info
	                entry_exit_options = ["disappears_stretched", "emerges", "replaced"];
	                entry_exit = (layout[tp][gtype]) ? 
	                    (entry_exit_options.indexOf(layout[tp][gtype].state) != -1) : 
	                    false;
	                xShift = (layout[tp][gtype] && layout[tp][gtype].xShift) ? layout[tp][gtype].xShift : 0;

	                if (entry_exit || genotype_cp[gtype][tp]) {
	                    // add this genotype to the seen genotypes
	                    if (seenGTypes.indexOf(gtype) == -1) {
	                        seenGTypes.push(gtype);
	                    }

	                    // add the path point
	                    x = (tp_idx + xShift)/(timepoints.length-1);
	                    y = genotype_cp[gtype][tp] ? 
	                        scaled_midpoint - (genotype_cp[gtype][tp] / denominator)/2 : 
	                        scaled_midpoint;
	                    cur_path.path.push({ "x": x, "y": y, "tp": tp, "cp": genotype_cp[gtype][tp]});
	                }
	            });

	            // TOP COORDINATE for each time point (in *reverse* sequence)...
	            $.each(timepoints_rev, function(tp_idx, tp) {

	                // xShift info
	                entry_exit_options = ["disappears_stretched", "emerges", "replaced"];
	                entry_exit = (layout[tp][gtype]) ? 
	                    (entry_exit_options.indexOf(layout[tp][gtype].state) != -1) : 
	                    false;
	                xShift = (layout[tp][gtype] && layout[tp][gtype].xShift) ? layout[tp][gtype].xShift : 0;

	                // add the path point
	                if (entry_exit || genotype_cp[gtype][tp]) {
	                    x = ((timepoints.length-1) - tp_idx + xShift)/(timepoints.length-1);
	                    y = genotype_cp[gtype][tp] ? 
	                        scaled_midpoint + (genotype_cp[gtype][tp] / denominator)/2 : 
	                        scaled_midpoint;
	                    cur_path.path.push({ "x": x, "y": y, "tp": tp, "cp": genotype_cp[gtype][tp]});
	                }
	            });
	            
	            // add the path for this genotype to the list of all paths to plot
	            paths.push(cur_path);

	            // update the stack height
	            sHeight += largest_cps[gtype]/denominator;
	        }
	    })

	    return paths;
	}


	/* function to calculate and return a path representing a horizontal line through the centre of the timescape svg 
	* @param {Object} curVizObj
	*/
	function _centreLine(curVizObj) {
	    var tsSVGWidth = curVizObj.generalConfig.tsSVGWidth, // timescape svg width
	        tsSVGHeight = curVizObj.generalConfig.tsSVGHeight; // timescape svg height

	    return "M 0 " + tsSVGHeight/2 + " L " + tsSVGWidth + " " + tsSVGHeight/2 + " L 0 " + tsSVGHeight/2;
	}

	/* tween function to transition to the next path ("path" in the data)
	* @param {Object} curVizObj
	* @param {String} type - the type of transition ("move" or otherwise - if otherwise, will move to centre line)
	* Note: situations other than "move" - could be an exit situation, where the next path is blank
	*/
	function _pathTween(curVizObj, type) { 
	    
	    var precision = 4;

	    return function() {
	        var dest_path,
	            path0,
	            path1,
	            n0, 
	            n1,
	            distances,
	            points,
	            p0,
	            p1;

	        // for an exit situation, the path to move to is a line in the centre of the timescape svg
	        dest_path = (type == "move") ? this.__data__.path : _centreLine(curVizObj); 
	        path0 = this;
	        path1 = path0.cloneNode();
	        n0 = path0.getTotalLength();
	        n1 = (path1.setAttribute("d", dest_path), path1).getTotalLength();

	        // Uniform sampling of distance based on specified precision.
	        distances = [0], i = 0, dt = precision / Math.max(n0, n1);
	        while ((i += dt) < 1) distances.push(i);
	        distances.push(1);
	        // Compute point-interpolators at each distance.
	        points = distances.map(function(t) {
	            p0 = path0.getPointAtLength(t * n0);
	            p1 = path1.getPointAtLength(t * n1);
	            return d3.interpolate([p0.x, p0.y], [p1.x, p1.y]);
	        });
	        return function(t) {
	            return t < 1 ? "M" + points.map(function(p) { return p(t); }).join("L") : dest_path;
	        };
	    };
	}

	/* function to convert straight paths for each genotype to bezier curve paths
	* @param {Object} paths -- straight path for each genotype
	* @param {Number} tsSVGWidth -- width of the timescape svg
	* @param {Number} tsSVGHeight -- height of the timescape svg
	*/
	function _getBezierPaths(paths, tsSVGWidth, tsSVGHeight) {

	    var bezier_paths = [],
	        path,
	        bezier_path,
	        xsource,
	        xtarget,
	        ysource,
	        ytarget,
	        diagonal;

	    // for each genotype's path
	    $.each(paths, function(path_idx, cur_path) { 

	        path = cur_path.path;
	        bezier_path = "";

	        // for each point in the path, get its diagonal to the next point
	        for (var i = 0; i < path.length-1; i++) {
	            xsource = path[i].x * tsSVGWidth;
	            xtarget = path[i+1].x * tsSVGWidth;
	            ysource = path[i].y * tsSVGHeight;
	            ytarget = path[i+1].y * tsSVGHeight;

	            // diagonal line generator for bezier curve between two points
	            diagonal = d3.svg.diagonal()
	                .source(function() { return {"y": xsource, "x": ysource }; })
	                .target(function() { return {"y": xtarget, "x": ytarget};})
	                .projection(function(d) { return [d.y, d.x] });

	            // for this genotype, append the bezier curve connecting this point and the next 
	            bezier_path = (i === 0) ? bezier_path + diagonal() : bezier_path + "L" + diagonal().substring(1);
	        }

	        bezier_paths.push({"gtype": cur_path.gtype, "path": bezier_path});
	    })

	    return bezier_paths;
	}

	// COLOUR FUNCTIONS

	/* function to calculate colours based on phylogeny 
	* @param {Object} curVizObj -- vizObj for the current view
	*/
	function _getPhyloColours(curVizObj) {

	    var colour_assignment = {}, // standard colour assignment
	        alpha_colour_assignment = {}, // alpha colour assignment
	        cur_colours = curVizObj.userConfig.clone_cols;

	    // clone colours specified
	    if (cur_colours != "NA") {
	        // get colour assignment - use specified colours
	        // handling different inputs -- TODO should probably be done in R
	        cur_colours.forEach(function(col, col_idx) {
	            var col_value = col.colour;
	            if (col_value[0] != "#") { // append a hashtag if necessary
	                col_value = "#".concat(col_value);
	            }
	            if (col_value.length > 7) { // remove any alpha that may be present in the hex value
	                col_value = col_value.substring(0,7);
	            }
	            colour_assignment[col.clone_id] = col_value;
	        });
	    }

	    // clone colours not specified
	    else {
	        var s = 0.88, // saturation
	            l = 0.77; // lightness

	        // number of nodes
	        var n_nodes = curVizObj.data.treeChainRoots.length;

	        // colour each tree chain root a sequential colour from the spectrum
	        for (var i = 0; i < n_nodes; i++) {
	            var cur_node = curVizObj.data.treeChainRoots[i];
	            var h = (i/n_nodes + 0.96) % 1;
	            var rgb = _hslToRgb(h, s, l); // hsl to rgb
	            var col = _rgb2hex("rgb(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + ")"); // rgb to hex

	            colour_assignment[cur_node] = col;

	            // for each of the chain's descendants
	            var prev_colour = col;
	            curVizObj.data.treeChains[cur_node].forEach(function(desc, desc_i) {
	                // if we're on the phantom root's branch and it's the first descendant
	                if (cur_node == curVizObj.generalConfig.phantomRoot && desc_i === 0) {

	                    // do not decrease the brightness
	                    colour_assignment[desc] = prev_colour;
	                }
	                // we're not on the phantom root branch's first descendant
	                else {
	                    // colour the descendant a lighter version of the previous colour in the chain
	                    colour_assignment[desc] = 
	                        _decrease_brightness(prev_colour, 20);

	                    // set the previous colour to the lightened colour
	                    prev_colour = colour_assignment[desc]; 
	                }
	            })
	        }
	    }
	    curVizObj.view.colour_assignment = colour_assignment;  

	    // get the alpha colour assignment
	    Object.keys(colour_assignment).forEach(function(key, key_idx) {
	        alpha_colour_assignment[key] = 
	            _increase_brightness(colour_assignment[key], curVizObj.userConfig.alpha);
	    });
	    curVizObj.view.alpha_colour_assignment = alpha_colour_assignment;
	}

	// Check color brightness
	// returns brightness value from 0 to 255
	// http://www.webmasterworld.com/forum88/9769.htm
	function _get_brightness(hexCode) {
	    if (hexCode == undefined) {
	        return undefined;
	    }

	    // strip off any leading #
	    hexCode = hexCode.replace('#', '');

	    var c_r = parseInt(hexCode.substr(0, 2),16);
	    var c_g = parseInt(hexCode.substr(2, 2),16);
	    var c_b = parseInt(hexCode.substr(4, 2),16);

	    return ((c_r * 299) + (c_g * 587) + (c_b * 114)) / 1000;
	}

	/**
	 * Converts an HSL color value to RGB. Conversion formula
	 * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
	 * Assumes h, s, and l are contained in the set [0, 1] and
	 * returns r, g, and b in the set [0, 255].
	 *
	 * @param   Number  h       The hue
	 * @param   Number  s       The saturation
	 * @param   Number  l       The lightness
	 * @return  Array           The RGB representation
	 */
	function _hslToRgb(h, s, l){
	    var r, g, b;

	    if(s === 0){
	        r = g = b = l; // achromatic
	    }else{
	        var hue2rgb = function hue2rgb(p, q, t){
	            if(t < 0) t += 1;
	            if(t > 1) t -= 1;
	            if(t < 1/6) return p + (q - p) * 6 * t;
	            if(t < 1/2) return q;
	            if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
	            return p;
	        }

	        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
	        var p = 2 * l - q;
	        r = hue2rgb(p, q, h + 1/3);
	        g = hue2rgb(p, q, h);
	        b = hue2rgb(p, q, h - 1/3);
	    }

	    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
	}

	// convert RGB to hex
	// http://stackoverflow.com/questions/1740700/get-hex-value-rather-than-rgb-value-using-jquery
	function _rgb2hex(rgb) {
	     if (  rgb.search("rgb") == -1 ) {
	          return rgb;
	     } else {
	          rgb = rgb.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+))?\)$/);
	          function hex(x) {
	               return ("0" + parseInt(x).toString(16)).slice(-2);
	          }
	          return "#" + hex(rgb[1]) + hex(rgb[2]) + hex(rgb[3]); 
	     }
	}

	// function to increase brightness of hex colour
	// from: http://stackoverflow.com/questions/6443990/javascript-calculate-brighter-colour
	function _increase_brightness(hex, percent){
	    // strip the leading # if it's there
	    hex = hex.replace(/^\s*#|\s*$/g, '');

	    // convert 3 char codes --> 6, e.g. `E0F` --> `EE00FF`
	    if(hex.length == 3){
	        hex = hex.replace(/(.)/g, '$1$1');
	    }

	    var r = parseInt(hex.substr(0, 2), 16),
	        g = parseInt(hex.substr(2, 2), 16),
	        b = parseInt(hex.substr(4, 2), 16);

	    return '#' +
	       ((0|(1<<8) + r + (256 - r) * percent / 100).toString(16)).substr(1) +
	       ((0|(1<<8) + g + (256 - g) * percent / 100).toString(16)).substr(1) +
	       ((0|(1<<8) + b + (256 - b) * percent / 100).toString(16)).substr(1);
	}

	// function to decrease brightness of hex colour
	// from: http://stackoverflow.com/questions/12660919/javascript-brightness-function-decrease
	function _decrease_brightness(hex, percent){
	    var r = parseInt(hex.substr(1, 2), 16),
	        g = parseInt(hex.substr(3, 2), 16),
	        b = parseInt(hex.substr(5, 2), 16);

	   return '#' +
	       ((0|(1<<8) + r * (100 - percent) / 100).toString(16)).substr(1) +
	       ((0|(1<<8) + g * (100 - percent) / 100).toString(16)).substr(1) +
	       ((0|(1<<8) + b * (100 - percent) / 100).toString(16)).substr(1);
	}

	// MUTATION FUNCTIONS

	/* function to get the mutations into a better format
	* @param {Object} curVizObj -- vizObj for the current view
	*/
	function _reformatMutations(curVizObj) {
	    var original_muts = curVizObj.userConfig.mutations, // muts from user data
	        muts_arr = [];

	    // convert object into array
	    original_muts.forEach(function(mut) {

	        // link id where mutation occurred
	        var link_id = "treeLink_source_" + curVizObj.data.direct_ancestors[mut.clone_id] + "_target_" +  mut.clone_id;

	        // add this mutation to the array
	        var cur_mut = {
	            "empty": "", // add an empty string for an empty column (clone column) that will contain an SVG
	            "link_id": link_id,
	        }
            Object.keys(mut).forEach(function(key) {
                cur_mut[key] = mut[key];
            })
            muts_arr.push(cur_mut);
	    });

	    curVizObj.data.mutations = muts_arr;
	}

	// GENERAL FUNCTIONS

	/* function to capitalize each word in a string
	* From: http://stackoverflow.com/questions/4878756/javascript-how-to-capitalize-first-letter-of-each-word-like-a-2-word-city
	*/
	function toTitleCase(str)
	{
	    return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
	}

	/* function to get the intersection of two arrays
	* @param {Array} array1 -- first array
	* @param {Array} array2 -- second array
	*/
	function _getIntersection(array1, array2) {

	    if (array1 == undefined || array2 == undefined) {
	        return [];
	    }

	    return array1.filter(function(n) {
	        return array2.indexOf(n) != -1
	    });
	}

	/* function to sort a 2D array by the second value in each contained array, 
	* @returns the sorted first elements of each contained array 
	*/
	function _sort2DArrByValue(obj)
	{
	    var x,
	        y;

	    // sort items by value
	    obj.sort(function(a, b)
	    {
	        x=a[1];
	        y=b[1];
	        return x<y ? -1 : x>y ? 1 : 0;
	    });

	    // get first element of each contained array
	    first_elements = [];
	    for(var i=0; i<obj.length; i++) {
	        first_elements.push(obj[i][0]);
	    }

	    return first_elements; 
	}

	/* function to download PNG
	* @param className -- name of the class of the svg to download (e.g. "mySVG")
	* @param fileOutputName -- filename for output
	*/
	function _downloadPNG(className, fileOutputName) {
	    // get current margin of svg element
	    var cur_margin = d3.select("." + className).style("margin");

	    // temporarily remove the margin so the view isn't cut off
	    d3.select("." + className)
	        .style("margin", "0px");

	    var html = d3.select("." + className)
	        .attr("version", 1.1)
	        .attr("xmlns", "http://www.w3.org/2000/svg")
	        .node().parentNode.innerHTML;

	    var imgsrc = 'data:image/svg+xml;base64,'+ btoa(html);

	    var canvas = document.querySelector("canvas"),
	        context = canvas.getContext("2d");

	    var image = new Image;
	    image.src = imgsrc;
	    image.onload = function() {
	        context.drawImage(image, 0, 0);

	        var canvasdata = canvas.toDataURL("image/png");

	        var pngimg = '<img src="'+canvasdata+'">'; 

	        var a = document.createElement("a");
	        a.download = fileOutputName;
	        a.href = canvasdata;
	        a.click();
	    };

	    // reset the margin of the svg element
	    d3.select("." + className)
	        .style("margin", cur_margin);
	}

	/* function to sort array of objects by key 
	* modified from: http://stackoverflow.com/questions/8837454/sort-array-of-objects-by-single-key-with-date-value
	*/
	function _sortByKey(array, firstKey, secondKey) {
	    secondKey = secondKey || "NA";
	    return array.sort(function(a, b) {
	        var x = a[firstKey]; var y = b[firstKey];
	        var res = ((x < y) ? -1 : ((x > y) ? 1 : 0));
	        if (secondKey == "NA") {
	            return res;            
	        }
	        else {
	            if (typeof(a[secondKey] == "string")) {
	                return (res === 0) ? (a[secondKey] > b[secondKey]) : res;
	            }
	            else if (typeof(a[secondKey] == "number")) {
	                return (res === 0) ? (a[secondKey] - b[secondKey]) : res;
	            }
	            else {
	                return res;
	            }
	        }
	    });
	}

	// MUTATION TABLE FUNCTIONS

	/* function to make mutation table
	* @param {Object} curVizObj -- vizObj for the current view
	* @param {Object} mutationTableDIV -- DIV for mutation table
	* @param {Array} data -- data to plot within table
	* @param {Number} table_height -- height of the table (in px)
	*/
	function _makeMutationTable(curVizObj, mutationTableDIV, data, table_height) {
		var dim = curVizObj.generalConfig,
			view_id = curVizObj.view_id,
			table;

		// make deferred object for mutation table setup
		curVizObj.mutTableDef = new $.Deferred();

	    // create table skeleton
	  	mutationTableDIV.append("table")
	  		.attr("class", "display compact")
	    	.attr("id", function() { return view_id + "_mutationTable"; });

	    // create data table
		$(document).ready(function() {
		    table = $("#" + view_id + "_mutationTable").DataTable({
		      	"data": data,
		      	"columns": dim.mutationColumns,
			    "scrollY":        table_height - 50, // - 50 for search bar, etc.
		        "scrollCollapse": true,
		        "paging":         false,
		        "info": 		  true,
		        "language": {
		        	"info":           "Showing _TOTAL_ entries",
		        	"infoEmpty":      "Showing 0 entries"
		        },
	       		"aaSorting": [] // disable initial sort
		    });

		    curVizObj.mutTableDef.resolve("Finished creating table setup.");
		});	


		// when mutation table is set up
		curVizObj.mutTableDef.done(function() {

			// d3 effects
			$("#" + view_id + "_mutationTable")
		        .on('click', 'tr', function () { 
		        	
		        	// hide VAF tooltips
		        	curVizObj.vafTips.forEach(function(curTip) {
		        		curTip.hide();
		        	})

		        	// if mutation is already selected, 
		        	if ($(this).hasClass("selected")) {
		        		// switch mutation selection to false
		        		dim.mutSelectOn = false;
		        	}
		        	// otherwise, 
		        	else {
		        		// switch on mutation selection
		        		dim.mutSelectOn = true;
		        	}

		        	// MUTATION SELECTED

		        	if (dim.mutSelectOn) {

			        	// data for the row on mouseover
			        	var cur_data = table.rows(this).data()[0];

		        		// if a different row was previously selected
		        		if (d3.select("#" + curVizObj.view_id).selectAll(".selected")[0].length == 1) {

		        			// deselect that row
			        		d3.select("#" + curVizObj.view_id).select(".selected").classed("selected", false);

			        		// remove all mutation prevalences information from view
    						d3.select("#" + curVizObj.view_id).selectAll(".mutationPrev").remove();

    						// unhighlight (red) the previous link
    						d3.select("#" + view_id).selectAll(".legendTreeLink").attr("stroke", dim.treeLinkColour);
			        	}

		        		// inactivate genotypes
	                    _tsInactivateGenotypes(curVizObj.view_id);

                    	// highlight this link 
	                    d3.select("#" + view_id)
	                        .select(".legendTreeLink." + cur_data.link_id)
	                        .attr("stroke", "red");

	                    // highlight all elements downstream of link 
	                    _propagatedEffects(curVizObj, cur_data.link_id, curVizObj.link_ids, "downstream");

		        		// mark as selected
	        			$(this).addClass('selected');

                        // if mutation prevalences exist, show them for this mutation
                        if (curVizObj.userConfig.mutation_prevalences) {
                        	// genomic location of mutation
                            var location = cur_data.chrom + ":" + cur_data.coord; 

                            // prevalences of this mutation at each sample
                            var cur_prevs = curVizObj.userConfig.mutation_prevalences[location]; 

                            // threshold for mutation prevalence
                            var threshold = 0.01;

                            // filter mutations (get rid of those < threshold)
                            var cur_prevs_filtered = _.filter(cur_prevs, function(VAF) { 
                            	return VAF.VAF >= threshold; 
                            });

		        			// for each prevalence
		        			cur_prevs_filtered.forEach(function(prev) {

							    // tooltip for mutation VAFs
							    var curTip = d3.tip()
							        .attr('class', 'd3-tip')
							        .offset([-10,0])
							        .html(function(d) {
							    		return "<span>VAF: " + d + "</span>";
							  		})	

							  	// add to list of tips
							  	curVizObj.vafTips.push(curTip);

							  	// invoke the tip in the context of this visualization
							  	d3.select("#" + view_id).select(".timescape_" + view_id).call(curTip);

							  	// show tooltip
							  	var rounded_VAF = (Math.round(prev.VAF*100)/100).toFixed(2);
							  	curTip.show(rounded_VAF, 
							  		d3.select("#" + view_id).select(".xAxisLabels.tp_" + prev.timepoint)[0][0]);
		        			})
                        }
		        	}

		        	// MUTATION DE-SELECTED (click anywhere in table)

		        	else {
		        		_backgroundClick(curVizObj);
		        	}

		        });


			// add clone SVGs
			dim.curCloneIDs = _.pluck(data, "clone_id");
			_addCloneSVGsToTable(curVizObj, dim.curCloneIDs);
	    })
	}

	/* function to add clone SVGs to the mutation table
	* @param {Object} curVizObj -- vizObj for the current view
	* @param {Array} clone_ids -- clone ids to plot within table
	*/
	function _addCloneSVGsToTable(curVizObj, clone_ids) {
		// remove any previous clone SVGs
		d3.select("#" + curVizObj.view_id).selectAll(".svgCloneCircle").remove();

		// get clone column number
		var mut_columns = _.pluck(curVizObj.generalConfig.mutationColumns, "data");
		var clone_column_no = mut_columns.indexOf("empty") + 1;

		// add clone SVGs
		var rows = d3.select("#" + curVizObj.view_id + "_mutationTable").selectAll("tr");
		var svgColumn = rows.selectAll("td:nth-child(" + clone_column_no + ")")
			.append("div")
			.attr("id", "svgCloneCircleDIV")
			.style("height","100%")
	        .style("width","100%"); 
	    var index = 0; // index of clone id in clone_ids array
	    var svgCircle = svgColumn
	        .append("svg")
	        .attr("width", 10)
	        .attr("height", 10)
	        .attr("class","svgCloneCircle")
	        .append("circle")
	        .attr("cx", 5)
	        .attr("cy", 5)
	        .attr("r", 4)
	        .attr("fill", function() {
	        	return curVizObj.view.alpha_colour_assignment[clone_ids[index++]];
	        })
	        .attr("stroke", function() {
	        	// fill happens first for all rows, so we have to reset the index to zero
	        	// before setting the stroke for all rows
	        	if (index == clone_ids.length) {
	        		index = 0;
	        	}
	        	return curVizObj.view.colour_assignment[clone_ids[index++]];
	        });
	}

}

/* function to show labels for a particular genotype
* @param {String} gtype -- the current genotype being moused over
* @param {String} view_id -- id for the current view
*/
function _showLabels(gtype, view_id) {
    var curView = d3.select("#" + view_id);

    // traditional view
    if (d3.select("#" + view_id).select(".tsPlotG").classed("traditional")) { 
    	curView.selectAll(".label.gtype_" + gtype).attr("fill-opacity", 1)
    		.text(function(d) { return d.label_text; });
    	curView.selectAll(".labelCirc.gtype_" + gtype).attr("fill-opacity", 1);
    }

    // tracks view
    else { 
    	curView.selectAll(".sepLabel.gtype_" + gtype).attr("fill-opacity", 1)
    		.text(function(d) { return d.label_text; });
    	curView.selectAll(".sepLabelCirc.gtype_" + gtype).attr("fill-opacity", 1);
    }
}

/* function to hide labels and label circles
* @param {String} view_id -- id for current view
*/
function _hideLabels(view_id) {
    var curView = d3.select("#" + view_id);

    // traditional view
    if (d3.select("#" + view_id).select(".tsPlotG").classed("traditional")) { 
    	curView.selectAll(".label").attr("fill-opacity", 0)
    		.text(function() { return ""; }); // text removed for purposes of svg download (otherwise will show up)
    	curView.selectAll(".labelCirc").attr("fill-opacity", 0);
    }

    // tracks view
    else { 
    	curView.selectAll(".sepLabel").attr("fill-opacity", 0)
    		.text(function() { return ""; }); // text removed for purposes of svg download (otherwise will show up)
    	curView.selectAll(".sepLabelCirc").attr("fill-opacity", 0);
    }
}

/* function to highlight timepoint guide
*/
function _hlTpGuide(view_id, tp) {
	// view timepoint guide
	d3.select("#" + view_id).selectAll(".tpGuide.tp_" + tp)
		.attr("stroke", "black")
		.attr("stroke-opacity", 1);
}

/* function to hide timepoint guides
*/
function _hideTpGuides(view_id) {
	// hide timepoint guides
	d3.select("#" + view_id).selectAll(".tpGuide")
		.attr("stroke", "white")
		.attr("stroke-opacity", 0.4);

}
